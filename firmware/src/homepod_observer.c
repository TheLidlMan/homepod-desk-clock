#include "homepod_observer.h"
#include "hap_native.h"
#include "bplist_minimal.h"
#include "bearssl.h"
#include "pgmspace.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "observer_templates.h"

#define DATA_CAP 8192
typedef struct { hap_io io;uint8_t write_key[32],read_key[32];uint64_t tx,rx;bool open; } channel;
struct homepod_observer {
    homepod_factory factory;observer_receipt *receipt;channel control,event,data;
    uint8_t frame[640],out[640],*data_buffer;size_t data_used,data_expected;
    uint8_t data_header[32],event_header[512];size_t header_used,event_header_used;
    uint32_t event_remaining,event_cseq;bool event_rtsp;
    uint32_t cseq,last_feedback;uint64_t seq;
    bool subscribed,art_pending,feedback_started;uint32_t queue_location,art_counter,art_started,last_poll;uint16_t art_edge;
    char art_requested_item[129];
    char art_request[25];
    bool (*art_sink)(void *,const uint8_t *,size_t,uint16_t,uint16_t);void *art_opaque;
    mrp_metadata metadata;
    char active_client[97],active_player[97],candidate_player[97],item[129];
};
static void clear(void *p,size_t n){volatile uint8_t *v=p;while(n--)*v++=0;}
static uint64_t be(const uint8_t *p,unsigned n){uint64_t v=0;while(n--)v=(v<<8)|*p++;return v;}
static void putbe(uint8_t *p,uint64_t v,unsigned n){for(unsigned i=0;i<n;++i)p[n-1-i]=(uint8_t)(v>>(i*8));}
static bool reserve(homepod_factory *f,size_t n){return !f->reserve||f->reserve(f->opaque,n);}
static bool reserve_record(homepod_factory *f,size_t n){return f->reserve_record?f->reserve_record(f->opaque,n):reserve(f,n);}
static void phase(homepod_factory *f,uint8_t n){if(f->trace)f->trace(f->opaque,n);}
static bool live(homepod_factory *f){return !f->within_deadline||f->within_deadline(f->opaque);}
static bool all(hap_io *io,uint8_t *p,size_t n,bool write){
    while(n){if(io->within_deadline&&!io->within_deadline(io->opaque))return false;int k=write?io->write(io->opaque,p,n):io->read(io->opaque,p,n);if(k<=0 || (size_t)k>n)return false;p+=k;n-=k;}return true;
}
static bool encrypted_send(homepod_observer *o,channel *c,const uint8_t *p,size_t n){
    while(n){size_t limit=sizeof(o->frame)-18;size_t k=n>limit?limit:n;uint8_t *f=o->frame;f[0]=k&255;f[1]=k>>8;memcpy(f+2,p,k);
        uint8_t iv[12]={0};for(unsigned i=0;i<8;++i)iv[4+i]=(uint8_t)(c->tx>>(8*i));
        if(c->tx==UINT64_MAX)return false;
        br_poly1305_ctmul_run(c->write_key,iv,f+2,k,f,2,f+2+k,br_chacha20_ct_run,1);
        if(!all(&c->io,f,k+18,true))return false;
        ++c->tx;p+=k;n-=k;
    }return true;
}
static int encrypted_read(homepod_observer *o,channel *c,uint8_t **plain,bool *allocated){
    *plain=NULL;*allocated=false;
    uint8_t *f=o->frame;if(!all(&c->io,f,2,false))return -2;
    size_t n=f[0]|((size_t)f[1]<<8);if(!n || n>DATA_CAP || c->rx==UINT64_MAX){
#ifdef OBSERVER_SHAPE_DEBUG
        fprintf(stderr,"Rejected HAP record length=%zu counter=%llu\n",n,(unsigned long long)c->rx);
#endif
        return -3;
    }
    uint8_t aad[2]={f[0],f[1]};
    bool dynamic=n+18>sizeof(o->frame);
    /* An authenticated continuation can fill its existing reassembly arena.
     * Keep the tag separate: the final record may end exactly at the arena end. */
    bool pending=c==&o->data && o->data_buffer && o->data_used<=o->data_expected &&
        n<=o->data_expected-o->data_used;
    bool transient=dynamic && !pending && !reserve(&o->factory,n+16);
    if(transient && !reserve_record(&o->factory,n+16)){
        o->receipt->rejected_record_bytes=n;o->receipt->pending_frame_bytes=o->data_expected;
        o->receipt->allocation_reject_reason=2;return -6;
    }
    uint8_t *data=pending?o->data_buffer+o->data_used:dynamic?malloc(n+16):f+2;
    bool owned=dynamic && !pending;
    if(!data){o->receipt->rejected_record_bytes=n;o->receipt->pending_frame_bytes=o->data_expected;o->receipt->allocation_reject_reason=3;return -6;}
    uint8_t received_tag[16];
    if(pending){
        if(!all(&c->io,data,n,false)||!all(&c->io,received_tag,16,false))return -4;
    }else{
        if(!all(&c->io,data,n+16,false)){if(owned){clear(data,n+16);free(data);}return -4;}
        memcpy(received_tag,data+n,16);
    }
    /* A lower RX margin is only a drain peak. Restore the normal budget
     * before authentication or metadata/artwork callbacks can allocate. */
    if(transient && !reserve(&o->factory,0)){
        clear(data,n+16);free(data);
        o->receipt->rejected_record_bytes=n;o->receipt->pending_frame_bytes=o->data_expected;
        o->receipt->allocation_reject_reason=4;return -6;
    }
    uint8_t iv[12]={0},tag[16];for(unsigned i=0;i<8;++i)iv[4+i]=(uint8_t)(c->rx>>(8*i));
    br_poly1305_ctmul_run(c->read_key,iv,data,n,aad,2,tag,br_chacha20_ct_run,0);
    unsigned diff=0;for(unsigned i=0;i<16;++i)diff|=tag[i]^received_tag[i];
    if(diff){if(owned){clear(data,n+16);free(data);}return -5;}
    ++c->rx;*plain=data;*allocated=owned;
    if(owned && n+16>o->receipt->peak_frame_allocation)o->receipt->peak_frame_allocation=n+16;
    return (int)n;
}
static void release_record(uint8_t *p,size_t n,bool allocated){if(allocated){clear(p,n+16);free(p);}}
static bool response(homepod_observer *o,size_t *body_off,size_t *body_len){
    size_t used=0,need=0,header=0;
    for(unsigned record=0;record<9;++record){
        uint8_t *plain;bool owned;int n=encrypted_read(o,&o->control,&plain,&owned);
        if(n<0){o->receipt->transport_error=n;return false;}
        if((size_t)n>sizeof(o->out)-used){release_record(plain,n,owned);o->receipt->transport_error=-30;return false;}
        memcpy(o->out+used,plain,n);used+=n;release_record(plain,n,owned);
        if(!header){
            for(size_t i=3;i<used;++i)if(!memcmp(o->out+i-3,"\r\n\r\n",4)){header=i+1;break;}
            if(!header)continue;
            if(header>=sizeof(o->out) || header<12){o->receipt->transport_error=-31;return false;}
            o->receipt->control_status=(o->out[9]-'0')*100+(o->out[10]-'0')*10+o->out[11]-'0';
            if(memcmp(o->out,"RTSP/1.0 200",12)){o->receipt->transport_error=-32;return false;}
            o->out[header-1]=0;const char *length=strstr((char*)o->out,"Content-Length:");
            if(!length)length=strstr((char*)o->out,"content-length:");
            need=length?strtoul(length+15,NULL,10):0;
            if(need>sizeof(o->out)-header){o->receipt->transport_error=-33;return false;}
        }
        if(used>=header+need){*body_off=header;*body_len=need;return true;}
    }o->receipt->transport_error=-34;return false;
}
static bool rtsp(homepod_observer *o,const char *method,const char *uri,const uint8_t *body,size_t len,size_t *offset,size_t *bodylen){
    o->receipt->transport_error=0;o->receipt->control_status=0;
    int n=snprintf((char*)o->out,sizeof(o->out),"%s %s RTSP/1.0\r\nCSeq: %u\r\nDACP-ID: 1234567890ABCDEF\r\nActive-Remote: 1\r\nClient-Instance: 1234567890ABCDEF\r\nUser-Agent: AirPlay/320.20\r\nContent-Type: application/x-apple-binary-plist\r\nContent-Length: %u\r\n\r\n",method,uri,++o->cseq,(unsigned)len);
    if(n<=0 || (size_t)n+len>sizeof(o->out))return false;
    if(len)memcpy_P(o->out+n,body,len);
    if(!encrypted_send(o,&o->control,o->out,n+len)){o->receipt->transport_error=-40;return false;}
    return response(o,offset,bodylen);
}
static bool root(const uint8_t *bytes,size_t n,bplist *b,bplist_object *r){return bplist_open(b,bytes,n)&&bplist_at(b,b->top,r);}
static bool get_port(homepod_observer *o,size_t off,size_t n,bool data,uint16_t *port){
    bplist b;bplist_object r,v;
    if(!root(o->out+off,n,&b,&r))return false;
    if(data){if(!bplist_dict(&b,&r,"streams",&v)||!bplist_index(&b,&v,0,&r))return false;}
    if(!bplist_dict(&b,&r,data?"dataPort":"eventPort",&v))return false;
    uint64_t value;if(!bplist_number(&v,&value)||!value||value>65535)return false;*port=value;return true;
}
static bool open_channel(homepod_observer *o,channel *c,uint16_t port,const uint8_t K[64],const char *salt,const char *write,const char *read){
    if(!hap_derive_key(K,salt,write,c->write_key)||!hap_derive_key(K,salt,read,c->read_key))return false;
    c->open=o->factory.connect(o->factory.opaque,port,&c->io);return c->open;
}
static size_t varwrite(uint8_t *out,uint64_t n){size_t i=0;do{out[i]=(n&127)|(n>127?128:0);n>>=7;++i;}while(n);return i;}
static bool varread(const uint8_t *p,size_t n,uint64_t *value,size_t *used){
    *value=0;*used=0;while(*used<n && *used<10){unsigned b=p[*used];if(*used==9&&b>1)return false;*value|=(uint64_t)(b&127)<<(7*(*used));++*used;if(!(b&128))return true;}return false;
}
static bool protobuf_send(homepod_observer *o,const uint8_t *message,size_t n){
    uint8_t prefix[10];size_t k=varwrite(prefix,n);
    if(n+k>512)return false;
    uint8_t protobuf[512];memcpy(protobuf,prefix,k);memcpy_P(protobuf+k,message,n);
    size_t payload=bplist_wrap_data(o->out+32,sizeof(o->out)-32,protobuf,n+k);if(!payload)return false;
    memset(o->out,0,32);putbe(o->out,payload+32,4);memcpy(o->out+4,"sync",4);memcpy(o->out+16,"comm",4);putbe(o->out+20,++o->seq,8);
    return encrypted_send(o,&o->data,o->out,payload+32);
}
static void merge(mrp_metadata *a,const mrp_metadata *b){
    if(b->present&MRP_TITLE)memcpy(a->title,b->title,sizeof(a->title));
    if(b->present&MRP_ARTIST)memcpy(a->artist,b->artist,sizeof(a->artist));
    if(b->present&MRP_ALBUM)memcpy(a->album,b->album,sizeof(a->album));
    if(b->present&MRP_DURATION)a->duration=b->duration;
    if(b->present&MRP_ELAPSED)a->elapsed=b->elapsed;
    if(b->present&MRP_RATE)a->playback_rate=b->playback_rate;
    if(b->present&MRP_STATE)a->playback_state=b->playback_state;
    a->present|=b->present;
}
static void handle(homepod_observer *o,const uint8_t *p,size_t n){
    o->receipt->messages++;if(n>o->receipt->max_protobuf)o->receipt->max_protobuf=n;
    /* pyatv waits for DEVICE_INFO reply before subscribing. Mark the reply here
     * and emit subscription only after the incoming data frame has been drained. */
    uint32_t type;if(mrp_protocol_type(p,n,&type)&&type==15)o->receipt->stage=7;
    mrp_art_view art;
    if(mrp_art_info(p,n,&art)){
        if(art.identifier_size>=8&&!memcmp(art.identifier,"MiniArt-",8)){
            bool match=o->art_pending&&art.identifier_size==strlen(o->art_request)&&!memcmp(art.identifier,o->art_request,art.identifier_size);
            bool expected=match&&!strcmp(o->art_requested_item,o->item);
            if(match)o->art_pending=false;
            if(expected&&art.jpeg&&art.jpeg_size>=3&&art.jpeg_size<=7168&&art.width==o->art_edge&&art.height==o->art_edge&&
               art.jpeg[0]==255&&art.jpeg[1]==216&&art.jpeg[2]==255&&o->art_sink)
                (void)o->art_sink(o->art_opaque,art.jpeg,art.jpeg_size,art.width,art.height);
            return; /* Correlated queue reply must not replace current-player state. */
        }
    }
    mrp_event e;if(!mrp_decode_event(p,n,&e))return;
#ifdef OBSERVER_SHAPE_DEBUG
    fprintf(stderr,"MRP event type=%u state_present=%u state=%u active_client_matches=%u active_player_matches=%u candidate_matches=%u\n",e.type,!!(e.metadata.present&MRP_STATE),e.metadata.playback_state,!strcmp(e.client,o->active_client),!strcmp(e.player,o->active_player),!strcmp(e.player,o->candidate_player));
#endif
    if(e.type==46){
        if(strcmp(e.client,o->active_client)){memset(&o->metadata,0,sizeof(o->metadata));o->active_player[0]=o->candidate_player[0]=o->item[0]=0;}
        memcpy(o->active_client,e.client,sizeof(o->active_client));
    } else if(e.type==47){
        if(strcmp(e.client,o->active_client))memset(&o->metadata,0,sizeof(o->metadata));
        memcpy(o->active_client,e.client,sizeof(o->active_client));memcpy(o->active_player,e.player,sizeof(o->active_player));
        if(strcmp(o->candidate_player,o->active_player))memset(&o->metadata,0,sizeof(o->metadata));
    } else if((e.type==4 || e.type==56) && !strcmp(e.client,o->active_client) &&
              (!*o->active_player || !strcmp(e.player,o->active_player))){
        if(e.type==56 && strcmp(e.item,o->item))return;
        if(e.type==4 && *e.item && strcmp(e.item,o->item)){
            uint32_t state=o->metadata.playback_state,present=o->metadata.present&MRP_STATE;
            memset(&o->metadata,0,sizeof(o->metadata));o->metadata.playback_state=state;o->metadata.present=present;
        }
        if(*e.item)memcpy(o->item,e.item,sizeof(o->item));
        if(e.type==4&&mrp_art_info(p,n,&art))o->queue_location=art.location;
        memcpy(o->candidate_player,e.player,sizeof(o->candidate_player));merge(&o->metadata,&e.metadata);o->receipt->state_updates++;
    }
    o->receipt->metadata_present=(*o->metadata.title)!=0;
}
static bool data_frame(homepod_observer *o,const uint8_t *p,size_t n){
    if(n<32)return false;
    if(n>o->receipt->max_frame)o->receipt->max_frame=n;
    if(n>32){
        bplist b;bplist_object r,params,data;
#ifdef OBSERVER_SHAPE_DEBUG
        if(root(p+32,n-32,&b,&r)){
            fprintf(stderr,"Data shape kind=%u objects=%zu fields=%zu frame=%zu type=%.4s\n",r.kind,b.count,r.count,n,p+4);
            if(r.kind==13)for(size_t i=0;i<r.count;++i){bplist_object key,v;size_t ref=(size_t)be(r.data+i*b.ref_size,b.ref_size);if(bplist_at(&b,ref,&key)&&key.kind==5){fprintf(stderr,"key=%.*s kind=%u\n",(int)key.count,key.data,key.kind);ref=(size_t)be(r.data+(r.count+i)*b.ref_size,b.ref_size);if(bplist_at(&b,ref,&v))fprintf(stderr,"value kind=%u count=%zu\n",v.kind,v.count);}}
        }else fprintf(stderr,"Data shape invalid plist frame=%zu type=%.4s\n",n,p+4);
#endif
        if(root(p+32,n-32,&b,&r) && bplist_dict(&b,&r,"params",&params)&&bplist_dict(&b,&params,"data",&data)&&data.kind==4){
            const uint8_t *pb=data.data;size_t left=data.count;
            while(left){uint64_t length;size_t k;
                if(*pb==8){handle(o,pb,left);break;}
                if(!varread(pb,left,&length,&k)||length>left-k)return false;
                handle(o,pb+k,(size_t)length);pb+=k+length;left-=k+length;
            }
        }
    }
    if(!memcmp(p+4,"sync",4)){
        uint8_t ack[32]={0};putbe(ack,32,4);memcpy(ack+4,"rply",4);memcpy(ack+20,p+20,8);
        if(!encrypted_send(o,&o->data,ack,32))return false;
    }return true;
}
static bool data_chunk(homepod_observer *o,const uint8_t *p,size_t n){
    while(n){
        /* HomePod may deliver an entire7KB plist in ONE authenticated HAP
         * record. Parse a complete data frame in place rather than copying it. */
        if(!o->data_buffer && !o->header_used && n>=32){
            size_t expected=(size_t)be(p,4);
            if(expected<32||expected>DATA_CAP){o->receipt->error=12;return false;}
            if(expected<=n){if(!data_frame(o,p,expected)){o->receipt->error=13;return false;}p+=expected;n-=expected;continue;}
        }
        if(!o->data_buffer){
            size_t k=32-o->header_used;if(k>n)k=n;
            memcpy(o->data_header+o->header_used,p,k);o->header_used+=k;p+=k;n-=k;
            if(o->header_used<32)continue;
            size_t expected=(size_t)be(o->data_header,4);
            if(expected<32||expected>DATA_CAP){o->receipt->error=12;return false;}
            if(!reserve(&o->factory,expected)){o->receipt->error=18;return false;}
            o->data_buffer=malloc(expected);if(!o->data_buffer){o->receipt->error=18;return false;}
            if(expected>o->receipt->peak_frame_allocation)o->receipt->peak_frame_allocation=expected;
            memcpy(o->data_buffer,o->data_header,32);o->data_expected=expected;o->data_used=32;o->header_used=0;
        }
        size_t k=o->data_expected-o->data_used;if(k>n)k=n;
        if(o->data_buffer+o->data_used!=p){memcpy(o->data_buffer+o->data_used,p,k);}
        o->data_used+=k;p+=k;n-=k;
        if(o->data_used==o->data_expected){
            bool ok=data_frame(o,o->data_buffer,o->data_used);
            clear(o->data_buffer,o->data_expected);free(o->data_buffer);o->data_buffer=NULL;o->data_expected=o->data_used=0;
            if(!ok){o->receipt->error=13;return false;}
        }
    }return true;
}
static bool event_chunk(homepod_observer *o,const uint8_t *p,size_t n){
    uint32_t acknowledgements[4];bool rtsp[4];size_t count=0;
    while(n){
        if(o->event_remaining){size_t k=o->event_remaining;if(k>n)k=n;o->event_remaining-=k;p+=k;n-=k;
            if(o->event_remaining)continue;
            if(count==4)return false;
            acknowledgements[count]=o->event_cseq;rtsp[count++]=o->event_rtsp;
            continue;
        }
        if(o->event_header_used>=sizeof(o->event_header)-1)return false;
        o->event_header[o->event_header_used++]=*p++;--n;
        size_t used=o->event_header_used;
        if(used<4 || memcmp(o->event_header+used-4,"\r\n\r\n",4))continue;
        o->event_header[used]=0;
        const char *h=(char*)o->event_header;
        const char *length=strstr(h,"Content-Length:");if(!length)length=strstr(h,"content-length:");
        unsigned long remain=length?strtoul(length+15,NULL,10):0;if(remain>2*1024*1024)return false;
        const char *seq=strstr(h,"CSeq:");o->event_cseq=seq?strtoul(seq+5,NULL,10):0;
        o->event_rtsp=strstr(h,"RTSP/1.0")!=NULL;o->event_remaining=(uint32_t)remain;o->event_header_used=0;
        if(!remain){if(count==4)return false;
            acknowledgements[count]=o->event_cseq;rtsp[count++]=o->event_rtsp;}
    }
    /* Delay writes until all bytes of the current decrypted frame are consumed,
     * because encrypted_send reuses the shared frame/output buffers. */
    for(size_t i=0;i<count;++i){
        int length=snprintf((char*)o->out,sizeof(o->out),"%s 200 OK\r\nContent-Length: 0\r\nAudio-Latency: 0\r\nCSeq: %u\r\n\r\n",rtsp[i]?"RTSP/1.0":"HTTP/1.1",acknowledgements[i]);
        if(length<0 || !encrypted_send(o,&o->event,o->out,length))return false;
    }
    return true;
}
homepod_observer *homepod_observer_open(homepod_factory *factory,observer_receipt *r){
    if(!factory||!r||!factory->connect||!factory->close||!factory->available)return NULL;
    memset(r,0,sizeof(*r));r->context_bytes=sizeof(homepod_observer);r->stage=1;
    /* Complete SRP BEFORE allocating the larger transport arena. */
    channel control={0};uint8_t K[64]={0};hap_pair_result pair;
    phase(factory,1);
    if(!live(factory)||!factory->connect(factory->opaque,7000,&control.io)){r->error=1;return NULL;}control.open=true;
    if(!reserve(factory,8192)){r->error=20;factory->close(factory->opaque,&control.io);return NULL;}
    if(!hap_pair_authenticate(&control.io,&pair,K,control.write_key,control.read_key)){r->error=2;factory->close(factory->opaque,&control.io);return NULL;}
    phase(factory,30);
    if(!live(factory)){r->error=21;factory->close(factory->opaque,&control.io);clear(K,64);return NULL;}
    r->paired=true;r->stage=2;
    homepod_observer *o=reserve(factory,sizeof(homepod_observer))?calloc(1,sizeof(*o)):NULL;if(!o){r->error=3;factory->close(factory->opaque,&control.io);clear(K,64);return NULL;}
    o->factory=*factory;o->receipt=r;o->control=control;o->seq=0x100000001;
    size_t off,n;uint16_t port;
    phase(factory,31);
    if(!rtsp(o,"SETUP","rtsp://127.0.0.1/424242",setup_event,sizeof(setup_event),&off,&n)||!get_port(o,off,n,false,&port)){r->error=4;goto fail;}
    phase(factory,32);
    r->stage=3;
    phase(factory,33);
    if(!live(factory)||!open_channel(o,&o->event,port,K,"Events-Salt","Events-Read-Encryption-Key","Events-Write-Encryption-Key")){r->error=5;goto fail;}
    phase(factory,34);
    if(!rtsp(o,"RECORD","rtsp://127.0.0.1/424242",NULL,0,&off,&n)){r->error=6;goto fail;}
    phase(factory,35);
    r->stage=4;
    if(!rtsp(o,"SETUP","rtsp://127.0.0.1/424242",setup_data,sizeof(setup_data),&off,&n)||!get_port(o,off,n,true,&port)){r->error=7;goto fail;}
    phase(factory,36);
    if(!live(factory)||!open_channel(o,&o->data,port,K,"DataStream-Salt1311768467284833366","DataStream-Output-Encryption-Key","DataStream-Input-Encryption-Key")){r->error=8;goto fail;}
    clear(K,64);r->stage=5;
    phase(factory,37);
    if(!protobuf_send(o,device_info,sizeof(device_info))){r->error=9;goto fail;}
    phase(factory,38);
    r->stage=6;return o;
fail:
    clear(K,64);homepod_observer_close(o);return NULL;
}
bool homepod_observer_poll(homepod_observer *o,uint32_t now){
    if(!o->feedback_started){o->last_feedback=now;o->feedback_started=true;}
    o->last_poll=now;if(o->art_pending&&now-o->art_started>=10000)o->art_pending=false;
    if(!live(&o->factory)){o->receipt->error=21;return false;}
    int available=o->factory.available(o->factory.opaque,&o->data.io);
    if(available<0){o->receipt->error=10;return false;}
    if(available || o->data_buffer || o->header_used){
        phase(&o->factory,40);
        /* Consume one complete bounded data frame before returning to a renderer.
         * On timeout/failure the owner must close the observer and show the clock.
         * Authentication happens per1024-byte record; callbacks see only verified bytes. */
        for(unsigned record=0;record<10;++record){
            uint8_t *plain;bool owned;int n=encrypted_read(o,&o->data,&plain,&owned);
            if(n<0){o->receipt->error=110-n;return false;}
            /* Small records use the shared RX/TX frame; protect their remainder
             * while ACKs are emitted. Large records already own a separate arena. */
            const uint8_t *source=plain;
            if(plain==o->frame+2){memcpy(o->out,plain,n);source=o->out;}
            bool ok=data_chunk(o,source,n);release_record(plain,n,owned);
            if(!ok)return false;
            if(!o->data_buffer && !o->header_used)break;
            if(record==9){o->receipt->error=19;return false;}
        }
    }
    if(o->receipt->stage==7 && !o->subscribed){
        phase(&o->factory,41);
        if(!protobuf_send(o,connection_state,sizeof(connection_state)) || !protobuf_send(o,updates,sizeof(updates))){o->receipt->error=9;return false;}
        o->subscribed=true;o->receipt->stage=8;
    }
    available=o->factory.available(o->factory.opaque,&o->event.io);
    if(available<0){o->receipt->error=14;return false;}
    if(available || o->event_remaining || o->event_header_used){
        phase(&o->factory,42);
        uint8_t *plain;bool owned;int n=encrypted_read(o,&o->event,&plain,&owned);
        if(n<0){o->receipt->error=15;return false;}
        const uint8_t *source=plain;
        if(plain==o->frame+2){memcpy(o->out,plain,n);source=o->out;}
        bool ok=event_chunk(o,source,n);release_record(plain,n,owned);
        if(!ok){o->receipt->error=16;return false;}
    }
    if(!o->event_remaining && !o->event_header_used && now-o->last_feedback>=2000){size_t off,n;
        phase(&o->factory,43);
        if(!rtsp(o,"POST","/feedback",NULL,0,&off,&n)){o->receipt->error=17;return false;}
        o->last_feedback=now;
    }
    return true;
}
const mrp_metadata *homepod_observer_metadata(const homepod_observer *o){return o?&o->metadata:NULL;}
const char *homepod_observer_item(const homepod_observer *o){return o?o->item:NULL;}
void homepod_observer_close(homepod_observer *o){
    if(!o)return;
    channel *channels[]={&o->control,&o->event,&o->data};
    for(unsigned i=0;i<3;++i)if(channels[i]->open)o->factory.close(o->factory.opaque,&channels[i]->io);
    if(o->data_buffer){clear(o->data_buffer,o->data_expected);free(o->data_buffer);}
    clear(o,sizeof(*o));free(o);
}

bool homepod_observer_request_artwork(homepod_observer *o,uint16_t edge,
    bool (*sink)(void *,const uint8_t *,size_t,uint16_t,uint16_t),void *opaque){
    if(!o||!sink||o->art_pending||!o->subscribed||!o->metadata.title[0]||edge<16||edge>118||!live(&o->factory))return false;
    if(++o->art_counter==0)++o->art_counter;
    int id=snprintf(o->art_request,sizeof(o->art_request),"MiniArt-%08x",(unsigned)o->art_counter);
    if(id<=0||(size_t)id>=sizeof(o->art_request))return false;
    uint8_t child[40],message[80];size_t n=0,k=0;
    child[n++]=8;n+=varwrite(child+n,o->queue_location);
    child[n++]=16;child[n++]=1;child[n++]=24;child[n++]=0;
    double dimension=edge;uint64_t bits;memcpy(&bits,&dimension,8);
    child[n++]=33;for(unsigned i=0;i<8;++i)child[n++]=(uint8_t)(bits>>(8*i));
    child[n++]=41;for(unsigned i=0;i<8;++i)child[n++]=(uint8_t)(bits>>(8*i));
    child[n++]=104;child[n++]=1;
    message[k++]=8;message[k++]=32;message[k++]=18;message[k++]=(uint8_t)id;
    memcpy(message+k,o->art_request,id);k+=id;
    message[k++]=0xaa;message[k++]=2;message[k++]=(uint8_t)n;memcpy(message+k,child,n);k+=n;
    o->art_sink=sink;o->art_opaque=opaque;o->art_edge=edge;o->art_pending=true;
    o->art_started=o->last_poll;memcpy(o->art_requested_item,o->item,sizeof(o->item));
    if(!protobuf_send(o,message,k)){o->art_pending=false;return false;}
    return true;
}
