"""Quiesce lwIP before the NONOS SDK frees its station connection node.

Pending multicast timer traffic must see LINK_DOWN before SDK disconnect.
See https://github.com/esphome/esphome/pull/18333 for the same SDK race.
"""
from __future__ import annotations

from pathlib import Path
import re

HELPER = '''
// Mini Display: drop queued lwIP transmissions before SDK station teardown.
#include "lwip/init.h"
#undef netif_set_down
extern "C" struct netif *eagle_lwip_getif(int netif_index);
extern "C" void netif_set_down(struct netif *interface);
void miniDisplayStationNetifDown() {
#if LWIP_VERSION_MAJOR != 1
    struct netif *interface = eagle_lwip_getif(STATION_IF);
    if (interface) netif_set_down(interface);
#endif
}
bool miniDisplayStationDisconnect() {
    miniDisplayStationNetifDown();
    return wifi_station_disconnect();
}
'''
DECLARATIONS = '''void miniDisplayStationNetifDown();
bool miniDisplayStationDisconnect();

'''


def patch_sources(station: str, generic: str) -> tuple[str, str]:
    if HELPER not in station:
        for old, new in [
            ('if(wifi_station_disconnect())', 'if(miniDisplayStationDisconnect())'),
            ('ret = wifi_station_disconnect();', 'ret = miniDisplayStationDisconnect();'),
            ('        wifi_station_disconnect();', '        miniDisplayStationDisconnect();'),
        ]:
            if station.count(old) != 1:
                raise RuntimeError('ESP8266 station source changed; review disconnect guard')
            station = station.replace(old, new, 1)
        marker = 'static bool sta_config_equal(const station_config& lhs, const station_config& rhs);'
        if station.count(marker) != 1:
            raise RuntimeError('ESP8266 station helper insertion changed')
        station = station.replace(marker, HELPER + '\n' + marker, 1)
    marker = 'void ESP8266WiFiGenericClass::_eventCallback(void* arg)'
    event = '    if (event->event == EVENT_STAMODE_DISCONNECTED) {\n'
    guarded = event + '        miniDisplayStationNetifDown();\n'
    if DECLARATIONS not in generic:
        if generic.count(marker) != 1 or generic.count(event) != 1 or generic.count('wifi_station_disconnect();') != 1:
            raise RuntimeError('ESP8266 event source changed; review disconnect guard')
        generic = generic.replace(marker, DECLARATIONS + marker, 1)
        generic = generic.replace(event, guarded, 1)
        generic = generic.replace('wifi_station_disconnect();', 'miniDisplayStationDisconnect();', 1)
    if (station.count('miniDisplayStationDisconnect()') != 4 or generic.count(guarded) != 1
            or len(re.findall(r'\bwifi_station_disconnect\s*\(', station)) != 2
            or re.search(r'\bwifi_station_disconnect\s*\(', generic)):
        raise RuntimeError('Incomplete ESP8266 disconnect guard')
    return station, generic


if 'Import' in globals():
    Import('env')
    if env.PioPlatform().name == 'espressif8266':
        framework = Path(env.PioPlatform().get_package_dir('framework-arduinoespressif8266'))
        directory = framework / 'libraries/ESP8266WiFi/src'
        paths = [directory / 'ESP8266WiFiSTA.cpp', directory / 'ESP8266WiFiGeneric.cpp']
        before = [p.read_text() for p in paths]
        for path, old, new in zip(paths, before, patch_sources(*before)):
            if old != new:
                path.write_text(new)
                print('ESP8266 Wi-Fi: guard station teardown in ' + path.name)
