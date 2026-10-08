#define CANDIDATE 1
#ifndef HOMEPOD_OBSERVER_SOURCE
#define HOMEPOD_OBSERVER_SOURCE "../src/homepod_observer.c"
#endif
#include <stdlib.h>
static void *live_rx_arena;
static void *record_malloc(size_t n){void *p=malloc(n);if(n==6719)live_rx_arena=p;return p;}
static void record_free(void *p){if(p==live_rx_arena)live_rx_arena=NULL;free(p);}
#define malloc record_malloc
#define free record_free
#include HOMEPOD_OBSERVER_SOURCE
#undef malloc
#undef free
#include <assert.h>
typedef struct {uint8_t bytes[16384];size_t used,pos;unsigned writes;bool gated,reject_writes,expire_after_read,reject_with_rx_arena;} mock;
static bool deadline_live=true;
static mock streams[3];
static int mock_read(void *v,uint8_t *p,size_t n){mock *m=v;if(m->gated&&streams[1].writes==0)return -1;size_t k=m->used-m->pos;if(k>n)k=n;if(!k)return -1;memcpy(p,m->bytes+m->pos,k);m->pos+=k;if(m->expire_after_read&&m->pos==m->used)deadline_live=false;return (int)k;}
static int mock_write(void *v,const uint8_t *p,size_t n){(void)p;mock *m=v;++m->writes;return m->reject_writes||(m->reject_with_rx_arena&&live_rx_arena)?-1:(int)n;}
static int available(void *v,hap_io *io){(void)v;mock *m=io->opaque;return (int)(m->used-m->pos);}
static void append(mock *m,const char *p,size_t n,uint64_t rx){uint8_t *f=m->bytes+m->used;assert(m->used+n+18<sizeof(m->bytes));f[0]=(uint8_t)n;f[1]=(uint8_t)(n>>8);memcpy(f+2,p,n);uint8_t key[32]={0},iv[12]={0};for(unsigned i=0;i<8;i++)iv[4+i]=(uint8_t)(rx>>(8*i));br_poly1305_ctmul_run(key,iv,f+2,n,f,2,f+2+n,br_chacha20_ct_run,1);m->used+=n+18;}
static homepod_observer create(observer_receipt *r){homepod_observer o={0};memset(streams,0,sizeof(streams));memset(r,0,sizeof(*r));r->stage=6;o.receipt=r;o.factory.available=available;channel *c[]={&o.control,&o.event,&o.data};for(unsigned i=0;i<3;i++)c[i]->io=(hap_io){.opaque=&streams[i],.read=mock_read,.write=mock_write};return o;}
/* Model a low-memory peer splitting a large data frame at a HAP boundary. */
static bool deny_allocations(void *opaque,size_t n){(void)opaque;(void)n;return false;}
static bool deny_large_allocations(void *opaque,size_t n){(void)opaque;return n==0;}
static unsigned record_reservations;
static bool allow_record(void *opaque,size_t n){(void)opaque;++record_reservations;return n<=8192+16;}
static void pending_frame(homepod_observer *o,size_t expected,size_t used){
 o->data_buffer=calloc(1,expected);assert(o->data_buffer);o->data_expected=expected;o->data_used=used;
 putbe(o->data_buffer,expected,4);memcpy(o->data_buffer+4,"rply",4);
}
static bool deadline(void *opaque){(void)opaque;return deadline_live;}
static void ack_failure_tests(void){
 observer_receipt r;homepod_observer o=create(&r);uint8_t frame[32]={0};
 putbe(frame,32,4);memcpy(frame+4,"sync",4);putbe(frame+20,123,8);
 assert(data_frame(&o,frame,32)&&o.pending_data_ack_count==1&&streams[2].writes==0);
 o.factory.within_deadline=deadline;deadline_live=false;
 assert(!flush_data_acks(&o)&&r.transport_error==-51&&streams[2].writes==0);
 o=create(&r);assert(data_frame(&o,frame,32));streams[2].reject_writes=true;
 assert(!flush_data_acks(&o)&&r.transport_error==-52&&o.data.tx==0);
 o=create(&r);assert(data_frame(&o,frame,32)&&homepod_observer_acknowledge(&o));
 assert(r.transport_error==0&&o.pending_data_ack_count==0&&streams[2].writes==1);
 uint8_t broken[128]={0},truncated_varint=0x80;
 size_t n=bplist_wrap_data(broken+32,sizeof(broken)-32,&truncated_varint,1);
 assert(n);putbe(broken,n+32,4);memcpy(broken+4,"rply",4);o=create(&r);
 assert(!data_frame(&o,broken,n+32)&&r.transport_error==-50&&r.messages==0);
 /* Reproduce the hardware's 6.7 KiB sync frame and a consumed receive deadline.
  * Old code writes while that arena is still alive, and fails the whole poll. */
 char large[6703]={0};putbe((uint8_t*)large,sizeof(large),4);memcpy(large+4,"sync",4);
 o=create(&r);o.factory.within_deadline=deadline;deadline_live=true;
 append(&streams[2],large,sizeof(large),0);streams[2].expire_after_read=true;
 assert(homepod_observer_poll(&o,100000));
 assert(o.pending_data_ack_count==1&&!o.data_buffer&&streams[2].writes==0&&r.peak_frame_allocation==6719);
 deadline_live=true;streams[2].expire_after_read=false;
 assert(homepod_observer_poll(&o,100001));
 assert(o.pending_data_ack_count==0&&streams[2].writes==1&&r.error==0);
 /* Model TCP unable to allocate its ACK while the 6.7 KiB RX arena is alive. */
 o=create(&r);append(&streams[2],large,sizeof(large),0);streams[2].reject_with_rx_arena=true;
 assert(homepod_observer_poll(&o,100000)&&!live_rx_arena&&streams[2].writes==0);
 assert(homepod_observer_poll(&o,100001)&&streams[2].writes==1&&r.error==0);
 /* Bounded hostile bursts cannot overflow the sequence queue. */
 o=create(&r);for(unsigned i=0;i<8;++i)assert(data_frame(&o,frame,32));
 assert(!data_frame(&o,frame,32)&&r.transport_error==-54&&streams[2].writes==0);
}
static void reassembly_tests(void){
 observer_receipt r;homepod_observer o;char tail[5968]={0};
 // The live HomePod case: queued TCP buffers leave too little general headroom.
 o=create(&r);o.factory.reserve=deny_large_allocations;o.factory.reserve_record=allow_record;
 char full[6498]={0};putbe((uint8_t *)full,sizeof(full),4);memcpy(full+4,"rply",4);
 append(&streams[2],full,sizeof(full),0);
 assert(homepod_observer_poll(&o,100000)&&record_reservations==1&&r.max_frame==6498);
 assert(!o.data_buffer&&o.data.rx==1&&r.error==0);
 // The lower margin must be restored before any authentication/callback runs.
 o=create(&r);o.factory.reserve=deny_allocations;o.factory.reserve_record=allow_record;
 append(&streams[2],full,sizeof(full),0);
 assert(!homepod_observer_poll(&o,100000)&&r.error==116&&r.allocation_reject_reason==4&&o.data.rx==0&&r.messages==0);
 o=create(&r);o.factory.reserve=deny_allocations;
 append(&streams[2],full,sizeof(full),0);
 assert(!homepod_observer_poll(&o,100000)&&r.error==116&&r.rejected_record_bytes==6498);
 const size_t starts[]={32,33,623,1024,4095};
 for(unsigned cycle=0;cycle<1000;++cycle){
  size_t used=starts[cycle%5];o=create(&r);pending_frame(&o,6000,used);
  o.factory.reserve=deny_allocations;
  append(&streams[2],tail,6000-used,0);
  assert(homepod_observer_poll(&o,100000));
  assert(!o.data_buffer&&o.data.rx==1&&r.error==0&&r.max_frame==6000);
 }
 /* A valid record can finish an8 KiB frame and contain the next one.
  * Heap headroom, not the sum of logical frame lengths, decides allocation. */
 o=create(&r);pending_frame(&o,8192,8092);
 char crossing[1000]={0};putbe((uint8_t *)crossing+100,900,4);memcpy(crossing+104,"rply",4);
 append(&streams[2],crossing,sizeof(crossing),0);
 assert(homepod_observer_poll(&o,100000));
 assert(!o.data_buffer&&o.data.rx==1&&r.error==0&&r.max_frame==8192);
 /* Borrowing memory must not accept a forged tag or a truncated tag. */
 for(unsigned truncated=0;truncated<2;++truncated){
  o=create(&r);pending_frame(&o,6000,32);o.factory.reserve=deny_allocations;
  append(&streams[2],tail,sizeof(tail),0);
  if(truncated)--streams[2].used;else streams[2].bytes[streams[2].used-1]^=1;
  assert(!homepod_observer_poll(&o,100000));
  assert(r.error==(truncated?114:115)&&o.data.rx==0&&o.data_used==32&&r.messages==0);
  free(o.data_buffer);
 }
}
int main(void){observer_receipt r;homepod_observer o=create(&r);
 /* A slow first feedback is fatal before any bootstrap response is available. */
 bool first=homepod_observer_poll(&o,100000);
#ifdef CANDIDATE
 assert(first&&streams[0].writes==0&&r.stage==6);
 assert(homepod_observer_poll(&o,101999)&&streams[0].writes==0);
 assert(!homepod_observer_poll(&o,102000)&&r.error==17&&r.transport_error==-2);
#else
 assert(!first&&r.error==17&&r.transport_error==-2&&streams[0].writes==1);
#endif
 o=create(&r);o.last_poll=98000;o.last_feedback=98000;
#ifdef CANDIDATE
 o.feedback_started=true;
#endif
 const char *a="POST /event HTTP/1.1\r\nContent-Length: 4\r\nCSeq: 7\r\n\r\nab";
 append(&streams[1],a,strlen(a),0);append(&streams[1],"cd",2,1);
 const char *response="RTSP/1.0 200 OK\r\nContent-Length: 0\r\n\r\n";append(&streams[0],response,strlen(response),0);streams[0].gated=true;
 bool incomplete=homepod_observer_poll(&o,100000);
#ifdef CANDIDATE
 assert(incomplete&&o.event_remaining==2&&streams[0].writes==0&&streams[1].writes==0);
 assert(homepod_observer_poll(&o,100001));assert(o.event_remaining==0&&streams[1].writes==1&&streams[0].writes==1);
#else
 assert(!incomplete&&o.event_remaining==2&&streams[1].writes==0&&r.error==17&&r.transport_error==-2);
#endif
 #ifdef CANDIDATE
 /* A partial request without its next record fails promptly rather than living
  * forever while suppressing feedback. */
 o=create(&r);o.last_poll=100000;o.last_feedback=100000;o.feedback_started=true;
 o.event_remaining=2;
 assert(!homepod_observer_poll(&o,100001)&&r.error==15&&streams[0].writes==0);
 /* Wrap-safe interval arithmetic: no immediate heartbeat around UINT32 wrap. */
 o=create(&r);assert(homepod_observer_poll(&o,UINT32_MAX-1000));
 assert(homepod_observer_poll(&o,500)&&streams[0].writes==0);
 assert(!homepod_observer_poll(&o,1000)&&r.error==17);
#endif
 ack_failure_tests();reassembly_tests();puts("Timing and authenticated reassembly regressions passed");return 0;}
