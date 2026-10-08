#include "HomePodWiFiAdapter.h"
#include "CrashDiagnostics.h"
#include <WiFiUdp.h>
extern "C" {
#include <osapi.h>
}
void HomePodWiFiAdapter::trace(uint8_t phase) {
    lastPhase=phase;
    checkpointRuntime(phase);

}
// The pinned lwIP resolver supports .local mDNS names without retaining a service list.
bool HomePodWiFiAdapter::resolveAddress(const char *hostname) {
    if (!hostname || !hostname[0]) return true;
    IPAddress found;
    if (WiFi.hostByName(hostname, found, 1500) != 1 || !static_cast<uint32_t>(found)) return false;
    address = found;
    return true;
}
static bool alive_io(void *opaque){return static_cast<HomePodWiFiAdapter::Channel *>(opaque)->owner->alive();}
static void trace_io(void *opaque,uint8_t phase){static_cast<HomePodWiFiAdapter::Channel *>(opaque)->owner->trace(phase);}
static bool alive_factory(void *opaque){return static_cast<HomePodWiFiAdapter *>(opaque)->alive();}
static void trace_factory(void *opaque,uint8_t phase){static_cast<HomePodWiFiAdapter *>(opaque)->trace(phase);}
static int receive(void *opaque,uint8_t *p,size_t n) {
    auto *channel=static_cast<HomePodWiFiAdapter::Channel *>(opaque);auto &client=channel->client;
    uint32_t start=millis();
    while(!client.peekAvailable()) {
        // available()/connected() may yield in this SDK. Check heap first.
        if(ESP.getFreeHeap()<4096)return -1;
        if(!channel->owner->alive() || !client.connected() || millis()-start>=800)return -1;
        delay(1);
    }
    if(!channel->owner->alive())return -1;
    size_t amount=client.peekAvailable();if(amount>n)amount=n;
    // Observe the brief RX allocation peak before read() releases TCP pbufs.
    channel->owner->sampleHeap();
    const int result=client.read(p,amount);
    channel->owner->sampleHeap();
    return result;
}
static int send_bytes(void *opaque,const uint8_t *p,size_t n) {
    auto *channel=static_cast<HomePodWiFiAdapter::Channel *>(opaque);
    if(!channel->owner->alive())return -1;
    return static_cast<int>(channel->client.write(p,n));
}
static bool secure_random(void *,uint8_t *p,size_t n){return os_get_random(p,n)==0;}
static bool connect_channel(void *opaque,uint16_t port,hap_io *io) {
    auto *owner=static_cast<HomePodWiFiAdapter *>(opaque);if(!owner->alive())return false;
    for(unsigned i=0;i<3;++i)if(!owner->used[i]) {
        owner->channels[i].client.setTimeout(800);
        if(!owner->channels[i].client.connect(owner->address,port)) {
            owner->channels[i].client.stop(20);
            owner->channels[i].client=WiFiClient();
            return false;
        }
        owner->used[i]=true;
        *io={&owner->channels[i],receive,send_bytes,secure_random,trace_io,alive_io};return true;
    }
    return false;
}
static void close_channel(void *opaque,hap_io *io) {
    auto *owner=static_cast<HomePodWiFiAdapter *>(opaque);
    for(unsigned i=0;i<3;++i)if(io->opaque==&owner->channels[i]) {
        owner->channels[i].client.stop(20);
        // The pinned SDK's stop() retains ClientContext and unread RX pbufs.
        // Drop the final reference before the reconnect heap guard runs.
        owner->channels[i].client=WiFiClient();
        owner->used[i]=false;break;
    }
    io->opaque=nullptr;
}
static int available(void *,hap_io *io) {
    auto *channel=static_cast<HomePodWiFiAdapter::Channel *>(io->opaque);if(!channel->owner->alive())return -1;
#if defined(SAM_HOMEPOD_RECONNECT_TEST)
    // Diagnostic build only: fail once with unread TCP data, then prove recovery.
    static bool injected=false;
    if(!injected && millis()>=60000 && channel->client.available()>=1024) {
        injected=true;channel->owner->trace(90);return -1;
    }
#endif
    int n=channel->client.available();return n?n:channel->client.connected()?0:-1;
}
static bool reserve(void *,size_t n){return n<=SIZE_MAX-4096&&ESP.getFreeHeap()>=n+4096&&ESP.getMaxFreeBlockSize()>=n;}
// RX records are immediately drained and freed before rendering or pairing.
// Keep 2 KiB during the copy peak; receive() never waits below 4 KiB,
// and the observer restores that margin before authentication/callbacks.
static bool reserve_record(void *,size_t n){return n<=8192+16&&ESP.getFreeHeap()>=n+2048&&ESP.getMaxFreeBlockSize()>=n;}
homepod_factory HomePodWiFiAdapter::factory(){return {this,connect_channel,close_channel,available,reserve,trace_factory,alive_factory,reserve_record};}
