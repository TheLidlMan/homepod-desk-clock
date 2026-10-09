#include "HomePodWiFiAdapter.h"
#include <LittleFS.h>
#include <cstdlib>
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
    size_t amount=client.peekAvailable();
    while(!amount) {
        // available()/connected() may yield in this SDK. Check heap first.
        if(ESP.getFreeHeap()<4096){channel->owner->trace(94);return -1;}
        if(!channel->owner->alive() || millis()-start>=800){channel->owner->trace(95);return -1;}
        // peekAvailable sees only the first pbuf. available/read span its
        // chain, including a zero-length head followed by queued bytes.
        amount=client.available();if(amount)break;
        if(!client.connected()){channel->owner->trace(96);return -1;}
        delay(1);
    }
    if(!channel->owner->alive()){channel->owner->trace(95);return -1;}
    if(amount>n)amount=n;
    // Observe the brief RX allocation peak before read() releases TCP pbufs.
    channel->owner->sampleHeap();
    const int result=client.read(p,amount);
    channel->owner->sampleHeap();
    return result;
}
static int send_bytes(void *opaque,const uint8_t *p,size_t n) {
    auto *channel=static_cast<HomePodWiFiAdapter::Channel *>(opaque);
    if(!channel->owner->alive()){channel->owner->trace(91);return -1;}
    const int sent=static_cast<int>(channel->client.write(p,n));
    if(sent<0 || static_cast<size_t>(sent)!=n){
        const uint8_t failure=channel->client.connected()?92:93;
        channel->client.abort();channel->owner->trace(failure);return -1;
    }
    // Full writes own copied TCP buffers; delivery/ACK may legitimately take
    // longer than this poll. Let TCP retry while the protocol awaits its reply.
    // Aborting an unacknowledged full write would discard a healthy session.
    return sent;
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
        owner->channels[i].client.setNoDelay(true);
        owner->channels[i].client.setSync(false); // TCP owns copies after write returns.
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
static bool reserve(void *opaque,size_t n){
#if defined(SAM_HOMEPOD_SPOOL_TEST)
    // Diagnostic image only: exercise ciphertext staging once with a live large frame.
    auto *owner=static_cast<HomePodWiFiAdapter *>(opaque);static bool injected=false;
    if(!injected && owner->lastPhase==40 && n>=6000){injected=true;return false;}
#else
    (void)opaque;
#endif
    return n<=SIZE_MAX-4096&&ESP.getFreeHeap()>=n+4096&&ESP.getMaxFreeBlockSize()>=n;
}
// RX records are immediately drained and freed before rendering or pairing.
// Keep 2 KiB during the copy peak; receive() never waits below 4 KiB,
// and the observer restores that margin before authentication/callbacks.
static bool reserve_record(void *,size_t n){return n<=8192+16&&ESP.getFreeHeap()>=n+2048&&ESP.getMaxFreeBlockSize()>=n;}
static constexpr const char *kRecordSpool="/native-rx.tmp";
// Ciphertext only: drain queued TCP pbufs before allocating the verified arena.
static bool drain_record(void *opaque,hap_io *io,uint8_t *scratch,size_t capacity,size_t bytes,uint8_t **record){
    auto *owner=static_cast<HomePodWiFiAdapter *>(opaque);*record=nullptr;
    if(bytes>8192+16 || capacity<512 || !io || !io->read || !owner->alive() || ESP.getFreeHeap()<5120)return false;
    const uint32_t started=millis();bool ok=true;size_t left=bytes;uint8_t *data=nullptr;
    {
        File file=LittleFS.open(kRecordSpool,"w");ok=static_cast<bool>(file);
        while(ok && left){
            if(!owner->alive() || ESP.getFreeHeap()<4096){ok=false;break;}
            const size_t amount=left<512?left:512;
            const int got=io->read(io->opaque,scratch,amount);
            ok=got>0 && static_cast<size_t>(got)<=amount;
            if(ok){ok=file.write(scratch,got)==static_cast<size_t>(got);left-=got;}
            owner->sampleHeap();if(!owner->alive())ok=false;
        }
        file.close();
    }
    // Extra FS headroom is temporary; retain the normal receive safety floor.
    ok=ok && owner->alive() && ESP.getFreeHeap()>=bytes+5120 && ESP.getMaxFreeBlockSize()>=bytes;
    if(ok){data=static_cast<uint8_t *>(malloc(bytes));ok=data!=nullptr;}
    if(ok){
        File file=LittleFS.open(kRecordSpool,"r");
        ok=file && file.size()==bytes && file.read(data,bytes)==bytes;
        file.close();owner->sampleHeap();
    }
    if(!LittleFS.remove(kRecordSpool) && LittleFS.exists(kRecordSpool))ok=false;
    const uint32_t elapsed=millis()-started;
    if(elapsed>owner->recordSpoolMaxMillis)owner->recordSpoolMaxMillis=elapsed;
    if(!owner->alive())ok=false;
    if(!ok){if(data){memset(data,0,bytes);free(data);}return false;}
    ++owner->recordSpools;*record=data;return true;
}
homepod_factory HomePodWiFiAdapter::factory(){
    LittleFS.remove(kRecordSpool); // Discard a ciphertext fragment left by a power loss.
    // A local controller ID stays stable on this chip and differs across clocks.
    const uint32_t chip=ESP.getChipId();
    snprintf(controllerId,sizeof(controllerId),"02:00:00:%02X:%02X:%02X",
        (unsigned)((chip>>16)&255),(unsigned)((chip>>8)&255),(unsigned)(chip&255));
    return {this,connect_channel,close_channel,available,reserve,trace_factory,alive_factory,reserve_record,drain_record,controllerId};
}
