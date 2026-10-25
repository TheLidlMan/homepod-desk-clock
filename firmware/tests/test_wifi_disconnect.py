"""Verify SDK guard ordering, null interfaces, patch idempotency and drift refusal."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('wifi_patch', root / 'firmware/scripts/patch_esp8266_wifi.py')
patch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patch)
station = '''// API Reference: wifi_station_disconnect()
static bool sta_config_equal(const station_config& lhs, const station_config& rhs);
if(wifi_station_disconnect()) {}
ret = wifi_station_disconnect();
        wifi_station_disconnect();
'''
generic = '''void ESP8266WiFiGenericClass::_eventCallback(void* arg) {
    if (event->event == EVENT_STAMODE_DISCONNECTED) {
        wifi_station_disconnect();
    }
}
'''
result = patch.patch_sources(station, generic)
assert patch.patch_sources(*result) == result
for broken in [(station.replace('if(wifi_station_disconnect())', 'changed()'), generic),
               (station, generic.replace('STAMODE_DISCONNECTED', 'CHANGED')),
               (station + '\nwifi_station_disconnect();', generic)]:
    try:
        patch.patch_sources(*broken)
    except RuntimeError:
        pass
    else:
        raise AssertionError('Changed SDK source must fail closed')
helper = patch.HELPER.replace('#include "lwip/init.h"', '')
with tempfile.TemporaryDirectory() as temporary:
    source = Path(temporary) / 'guard.cpp'
    binary = Path(temporary) / 'guard'
    source.write_text('''#include <cassert>
#define LWIP_VERSION_MAJOR 2
#define STATION_IF 0
struct netif { bool up; } station{true};
netif *current = &station;
unsigned disconnects = 0;
bool sdkResult = true;
bool wifi_station_disconnect() {
    assert(!current || !current->up);
    ++disconnects;
    return sdkResult;
}
''' + helper + '''
extern "C" netif *eagle_lwip_getif(int index) { assert(index == STATION_IF); return current; }
extern "C" void netif_set_down(netif *interface) { interface->up = false; }
int main() {
    assert(miniDisplayStationDisconnect() && disconnects == 1);
    station.up = true;
    miniDisplayStationNetifDown();
    assert(!station.up && disconnects == 1);
    sdkResult = false;
    assert(!miniDisplayStationDisconnect() && disconnects == 2);
    current = nullptr;
    assert(!miniDisplayStationDisconnect() && disconnects == 3);
}
''')
    subprocess.run([os.environ.get('CXX', 'c++'), '-std=c++17', '-Wall', '-Wextra', '-Werror',
                    '-fsanitize=address,undefined', str(source), '-o', str(binary)], check=True)
    subprocess.run([str(binary)], check=True)
print('Wi-Fi disconnect guard ordering, nullable netif, SDK return and patch drift checks passed')
