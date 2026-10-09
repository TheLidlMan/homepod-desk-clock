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
typedef struct {uint8_t bytes[16384];size_t used,pos;unsigned writes;bool gated,reject_writes,expire_after_read,reject_with_rx_arena,closed;} mock;
static bool deadline_live=true;
static mock streams[3];
static int mock_read(void *v,uint8_t *p,size_t n){mock *m=v;if(m->gated&&streams[1].writes==0)return -1;size_t k=m->used-m->pos;if(k>n)k=n;if(!k)return -1;memcpy(p,m->bytes+m->pos,k);m->pos+=k;if(m->expire_after_read&&m->pos==m->used)deadline_live=false;return (int)k;}
static int mock_write(void *v,const uint8_t *p,size_t n){(void)p;mock *m=v;++m->writes;return m->reject_writes||(m->reject_with_rx_arena&&live_rx_arena)?-1:(int)n;}
static int available(void *v,hap_io *io){(void)v;mock *m=io->opaque;return m->closed?-1:(int)(m->used-m->pos);}
static void append(mock *m,const char *p,size_t n,uint64_t rx){uint8_t *f=m->bytes+m->used;assert(m->used+n+18<sizeof(m->bytes));f[0]=(uint8_t)n;f[1]=(uint8_t)(n>>8);memcpy(f+2,p,n);uint8_t key[32]={0},iv[12]={0};for(unsigned i=0;i<8;i++)iv[4+i]=(uint8_t)(rx>>(8*i));br_poly1305_ctmul_run(key,iv,f+2,n,f,2,f+2+n,br_chacha20_ct_run,1);m->used+=n+18;}
static homepod_observer create(observer_receipt *r){homepod_observer o={0};memset(streams,0,sizeof(streams));memset(r,0,sizeof(*r));r->stage=6;o.receipt=r;o.factory.available=available;channel *c[]={&o.control,&o.event,&o.data};for(unsigned i=0;i<3;i++)c[i]->io=(hap_io){.opaque=&streams[i],.read=mock_read,.write=mock_write};return o;}
/* Model a low-memory peer splitting a large data frame at a HAP boundary. */
static bool deny_allocations(void *opaque,size_t n){(void)opaque;(void)n;return false;}
static bool deny_large_allocations(void *opaque,size_t n){(void)opaque;return n==0;}
static unsigned spooled_records;
static bool mock_drain(void *opaque,hap_io *io,uint8_t *scratch,size_t capacity,size_t n,uint8_t **out){
 (void)opaque;assert(capacity>=512);*out=malloc(n);assert(*out);size_t done=0;
 while(done<n){size_t k=n-done;if(k>512)k=512;
  if(!all(io,scratch,k,false)){free(*out);*out=NULL;return false;}
  memcpy(*out+done,scratch,k);done+=k;
 }
 ++spooled_records;return true;
}
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
 // Prefer draining over a low-margin in-RAM copy when a native spool exists.
 o=create(&r);o.factory.reserve=deny_large_allocations;o.factory.reserve_record=allow_record;
 o.factory.drain_record=mock_drain;append(&streams[2],full,sizeof(full),0);
 unsigned drained_before=spooled_records;
 assert(homepod_observer_poll(&o,100000)&&spooled_records==drained_before+1&&o.data.rx==1);
 // Ciphertext fallback drains pbufs before allocating; AAD survives scratch reuse.
 for(unsigned forged=0;forged<2;++forged){
  o=create(&r);o.factory.reserve=deny_large_allocations;o.factory.reserve_record=deny_allocations;
  o.factory.drain_record=mock_drain;append(&streams[2],full,sizeof(full),0);
  if(forged)streams[2].bytes[streams[2].used-1]^=1;
  unsigned before=spooled_records;bool ok=homepod_observer_poll(&o,100000);
  assert(spooled_records==before+1&&!live_rx_arena);
  assert(forged?!ok&&r.error==115&&o.data.rx==0&&r.messages==0:ok&&o.data.rx==1&&r.max_frame==6498);
 }
 o=create(&r);o.factory.reserve=deny_large_allocations;o.factory.reserve_record=deny_allocations;
 o.factory.drain_record=mock_drain;append(&streams[2],full,sizeof(full),0);--streams[2].used;
 assert(!homepod_observer_poll(&o,100000)&&r.error==116&&r.allocation_reject_reason==5&&o.data.rx==0&&r.messages==0);
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
 /* A split logical frame must use separate poll budgets. */
 o=create(&r);o.factory.within_deadline=deadline;deadline_live=true;
 char split[400]={0};putbe((uint8_t*)split,sizeof(split),4);memcpy(split+4,"sync",4);
 append(&streams[2],split,100,0);streams[2].expire_after_read=true;
 assert(homepod_observer_poll(&o,100000)&&o.data_used==100&&r.error==0&&homepod_observer_frame_pending(&o));
 deadline_live=true;streams[2].expire_after_read=false;
 assert(homepod_observer_poll(&o,109999)&&o.data_used==100);
 append(&streams[2],split+100,300,1);
 assert(homepod_observer_poll(&o,110000)&&!o.data_buffer&&o.pending_data_ack_count==1&&o.data.rx==2);
 assert(homepod_observer_acknowledge(&o)&&r.error==0&&!homepod_observer_frame_pending(&o));
 o=create(&r);append(&streams[2],split,100,0);
 assert(homepod_observer_poll(&o,UINT32_MAX-1000)&&o.data_used==100);
 assert(homepod_observer_poll(&o,8998)&&o.data_used==100);
 assert(!homepod_observer_poll(&o,8999)&&r.error==19);free(o.data_buffer);
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
static bool fail_random;static uint8_t random_tick;
static bool test_random(void *opaque,uint8_t *p,size_t n){(void)opaque;if(fail_random)return false;while(n--)*p++=++random_tick;return true;}
static void session_identity_tests(void){
 observer_receipt r;homepod_observer o=create(&r);o.control.io.random=test_random;
 uint8_t body[sizeof(setup_event)],previous[sizeof(setup_event)];
 memcpy(body,setup_event,sizeof(body));assert(fresh_setup(&o,body,sizeof(body),false));memcpy(previous,body,sizeof(body));
 memcpy(body,setup_event,sizeof(body));assert(fresh_setup(&o,body,sizeof(body),false)&&memcmp(body,previous,sizeof(body)));
 bplist b;bplist_object dict,value;assert(bplist_open(&b,body,sizeof(body))&&bplist_at(&b,b.top,&dict));
 assert(bplist_dict(&b,&dict,"sessionUUID",&value)&&value.count==36&&value.data[14]=='4'&&(value.data[19]=='8'||value.data[19]=='9'||value.data[19]=='A'||value.data[19]=='B'));
 assert(bplist_dict(&b,&dict,"deviceID",&value)&&!memcmp(value.data,"02:00:00:00:00:01",17));
 uint8_t data[sizeof(setup_data)];memcpy(data,setup_data,sizeof(data));
 assert(fresh_setup(&o,data,sizeof(data),true)&&bplist_open(&b,data,sizeof(data))&&bplist_at(&b,b.top,&dict));
 assert(bplist_dict(&b,&dict,"streams",&value)&&bplist_index(&b,&value,0,&dict));
 assert(bplist_dict(&b,&dict,"seed",&value)&&be(value.data,8)==o.stream_seed);
 assert(bplist_dict(&b,&dict,"clientTypeUUID",&value)&&!memcmp(value.data,"1910A70F-DBC0-4242-AF95-115DB30604E1",36));
 strcpy(o.session_id,"FEDCBA9876543210");o.active_remote=UINT32_MAX;
 assert(rtsp_send(&o,"SETUP","rtsp://127.0.0.1/424242",setup_event,sizeof(setup_event)));
 assert(strstr((char*)o.out,"DACP-ID: FEDCBA9876543210")&&strstr((char*)o.out,"Active-Remote: 4294967295"));
 assert(protobuf_send(&o,device_info,sizeof(device_info))&&streams[2].writes>0);
 fail_random=true;assert(!fresh_setup(&o,body,sizeof(body),false));assert(!protobuf_send(&o,device_info,sizeof(device_info)));fail_random=false;
}
int main(void){observer_receipt r;homepod_observer o=create(&r);
 /* A slow first feedback is fatal before any bootstrap response is available. */
 bool first=homepod_observer_poll(&o,100000);
#ifdef CANDIDATE
 assert(first&&streams[0].writes==0&&r.stage==6);
 assert(homepod_observer_poll(&o,101999)&&streams[0].writes==0);
 assert(homepod_observer_poll(&o,102000)&&o.feedback_pending&&streams[0].writes==1);
 assert(homepod_observer_poll(&o,111999)&&streams[0].writes==1);
 assert(!homepod_observer_poll(&o,112000)&&r.error==17&&r.transport_error==-2);
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
 assert(homepod_observer_poll(&o,100001));assert(o.event_remaining==0&&streams[1].writes==1&&streams[0].writes==0);
 assert(homepod_observer_poll(&o,100002)&&o.feedback_pending&&streams[0].writes==1);
 assert(homepod_observer_poll(&o,100003)&&!o.feedback_pending&&r.error==0);
#else
 assert(!incomplete&&o.event_remaining==2&&streams[1].writes==0&&r.error==17&&r.transport_error==-2);
#endif
 #ifdef CANDIDATE
 /* A missing event continuation neither blocks DATA nor lives forever. */
 o=create(&r);o.last_poll=100000;o.last_feedback=100000;o.feedback_started=true;
 o.event_remaining=2;o.event_wait_started=100000;
 assert(homepod_observer_poll(&o,100001)&&streams[0].writes==0);
 assert(!homepod_observer_poll(&o,110000)&&r.error==15);
 /* A queued request is answered before a burst of sync DATA can starve it. */
 o=create(&r);uint8_t sync[32]={0};putbe(sync,32,4);memcpy(sync+4,"sync",4);
 const char *event="POST /event HTTP/1.1\r\nContent-Length: 0\r\nCSeq: 8\r\n\r\n";
 append(&streams[1],event,strlen(event),0);
 for(unsigned i=0;i<20;++i)append(&streams[2],(char*)sync,sizeof(sync),i);
 assert(homepod_observer_poll(&o,100000)&&streams[1].writes==1&&streams[2].pos==0);
 assert(r.event_records==1&&r.event_replies==1);
 for(unsigned i=0;i<20;++i){
  assert(homepod_observer_poll(&o,100001+i)&&homepod_observer_acknowledge(&o));
 }
 assert(streams[2].pos==streams[2].used&&r.error==0);
 /* Wrap-safe interval arithmetic: no immediate heartbeat around UINT32 wrap. */
 o=create(&r);assert(homepod_observer_poll(&o,UINT32_MAX-1000));
 assert(homepod_observer_poll(&o,500)&&streams[0].writes==0);
 assert(homepod_observer_poll(&o,1000)&&o.feedback_pending);
 assert(!homepod_observer_poll(&o,11000)&&r.error==17);
#endif
 o=create(&r);assert(homepod_observer_poll(&o,100000));
 assert(homepod_observer_poll(&o,102000)&&o.feedback_pending);
 assert(homepod_observer_poll(&o,103500)&&o.feedback_pending&&streams[0].writes==1);
 append(&streams[0],response,strlen(response),0);
 assert(homepod_observer_poll(&o,104000)&&!o.feedback_pending&&r.error==0);
 o=create(&r);assert(homepod_observer_poll(&o,100000));
 assert(homepod_observer_poll(&o,102000));streams[0].closed=true;
 assert(!homepod_observer_poll(&o,102001)&&r.error==17&&r.transport_error==-55);
 ack_failure_tests();reassembly_tests();session_identity_tests();puts("Timing and authenticated reassembly regressions passed");return 0;}
