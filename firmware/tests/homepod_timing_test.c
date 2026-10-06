#define CANDIDATE 1
#include "../src/homepod_observer.c"
#include <assert.h>
typedef struct {uint8_t bytes[4096];size_t used,pos;unsigned writes;bool gated;} mock;
static mock streams[3];
static int mock_read(void *v,uint8_t *p,size_t n){mock *m=v;if(m->gated&&streams[1].writes==0)return -1;size_t k=m->used-m->pos;if(k>n)k=n;if(!k)return -1;memcpy(p,m->bytes+m->pos,k);m->pos+=k;return (int)k;}
static int mock_write(void *v,const uint8_t *p,size_t n){(void)p;mock *m=v;++m->writes;return (int)n;}
static int available(void *v,hap_io *io){(void)v;mock *m=io->opaque;return (int)(m->used-m->pos);}
static void append(mock *m,const char *p,size_t n,uint64_t rx){uint8_t *f=m->bytes+m->used;assert(m->used+n+18<sizeof(m->bytes));f[0]=(uint8_t)n;f[1]=(uint8_t)(n>>8);memcpy(f+2,p,n);uint8_t key[32]={0},iv[12]={0};for(unsigned i=0;i<8;i++)iv[4+i]=(uint8_t)(rx>>(8*i));br_poly1305_ctmul_run(key,iv,f+2,n,f,2,f+2+n,br_chacha20_ct_run,1);m->used+=n+18;}
static homepod_observer create(observer_receipt *r){homepod_observer o={0};memset(streams,0,sizeof(streams));memset(r,0,sizeof(*r));r->stage=6;o.receipt=r;o.factory.available=available;channel *c[]={&o.control,&o.event,&o.data};for(unsigned i=0;i<3;i++)c[i]->io=(hap_io){.opaque=&streams[i],.read=mock_read,.write=mock_write};return o;}
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
 puts("Timing regression passed");return 0;}
