#include "hap_pair_io.h"
#include "hap_native.h"
#include "bearssl.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <ctype.h>

typedef struct {
    uint8_t input[1200], body[512], output[1200];
    uint8_t pub[384], proof[64], expected[64], key[64], a[32];
    uint8_t server_pub[384], salt[64], server_proof[64];
    uint8_t write_key[32],read_key[32];
} buffers;
static void clear(void *p,size_t n) { volatile uint8_t *v=p; while(n--) *v++=0; }
static void trace(hap_io *io,uint8_t phase){if(io->trace)io->trace(io->opaque,phase);}
static bool alive(hap_io *io){return !io->within_deadline||io->within_deadline(io->opaque);}
static bool write_all(hap_io *io,const uint8_t *p,size_t n) {
    while(n) { if(!alive(io))return false; int k=io->write(io->opaque,p,n); if(k<=0 || (size_t)k>n)return false; p+=k;n-=k; }
    return true;
}
static bool read_all(hap_io *io,uint8_t *p,size_t n) {
    while(n) { if(!alive(io))return false; int k=io->read(io->opaque,p,n); if(k<=0 || (size_t)k>n)return false; p+=k;n-=k; }
    return true;
}
/* Pair setup HTTP messages fit one fixed buffer. Read exact header byte count,
 * then exact body count so the next encrypted record is never consumed early. */
static bool receive_http(hap_io *io,uint8_t *buf,size_t cap,size_t *body_offset,size_t *body_size,int *status) {
    size_t n=0;
    while(n<cap-1) {
        if(!read_all(io,buf+n,1))return false;
        ++n;
        if(n>=4 && !memcmp(buf+n-4,"\r\n\r\n",4))break;
    }
    if(n>=cap-1)return false;
    buf[n]=0;
    const char *space=strchr((char*)buf,' ');if(!space)return false;
    *status=atoi(space+1);size_t length=0;
    const char *line=(char*)buf;
    while(line && *line) {
        if(!strncmp(line,"Content-Length:",15) || !strncmp(line,"content-length:",15)) {
            char *end=NULL;unsigned long parsed=strtoul(line+15,&end,10);
            if(end==line+15 || parsed>cap-n)return false;
            length=parsed;
        }
        if(!strncmp(line,"Transfer-Encoding:",18) || !strncmp(line,"transfer-encoding:",18))return false;
        const char *next=strstr(line,"\r\n");line=next?next+2:NULL;
    }
    trace(io,61);
    *body_offset=n;*body_size=length;
    return read_all(io,buf+n,length);
}
static bool post(hap_io *io,buffers *b,const char *path,const uint8_t *data,size_t n,size_t *off,size_t *len,int *status) {
    int k=snprintf((char*)b->output,sizeof(b->output),
        "POST %s HTTP/1.1\r\nUser-Agent: AirPlay/320.20\r\nConnection: keep-alive\r\nX-Apple-HKP: 4\r\nContent-Type: application/octet-stream\r\nContent-Length: %u\r\n\r\n",path,(unsigned)n);
    if(k<=0 || (size_t)k+n>sizeof(b->output))return false;
    memcpy(b->output+k,data,n);
    if(!write_all(io,b->output,k+n))return false;
    trace(io,60);
    return receive_http(io,b->input,sizeof(b->input),off,len,status) && *status==200;
}
static size_t tlv(uint8_t *out,uint8_t type,const uint8_t *data,size_t n) {
    size_t total=0;
    do { size_t chunk=n>255?255:n;out[total++]=type;out[total++]=chunk;
        memcpy(out+total,data,chunk);total+=chunk;data+=chunk;n-=chunk;
    }while(n);return total;
}
static bool get_tlv(const uint8_t *data,size_t n,unsigned tag,uint8_t *out,size_t cap,size_t *size) {
    *size=0;
    while(n) {
        if(n<2)return false;
        unsigned type=data[0],length=data[1];data+=2;n-=2;
        if(length>n || type==7)return false;
        if(type==tag) { if(*size+length>cap)return false;memcpy(out+*size,data,length);*size+=length; }
        data+=length;n-=length;
    }
    return *size>0;
}
static void cipher(const uint8_t key[32],uint8_t *data,size_t n,const uint8_t aad[2],uint8_t tag[16],bool encrypt) {
    uint8_t nonce[12]={0};
    br_poly1305_ctmul_run(key,nonce,data,n,aad,2,tag,br_chacha20_ct_run,encrypt);
}
static bool pair_core(hap_io *io,hap_pair_result *r,uint8_t *K,uint8_t *write_key,uint8_t *read_key,bool options) {
    if(!io || !r || !io->read || !io->write || !io->random)return false;
    memset(r,0,sizeof(*r));r->srp_workspace_bytes=hap_srp_workspace_size();
    buffers *b=calloc(1,sizeof(*b));void *scratch=NULL;bool ok=false;
    if(!b)return false;
    size_t off=0,n=0,used=0,sn=0,pn=0,proofn=0;
    trace(io,10);
    if(!post(io,b,"/pair-pin-start",b->body,0,&off,&n,&r->last_http_status))goto done;
    trace(io,11);
    const uint8_t method=0,state=1,flags=16;
    used+=tlv(b->body+used,0,&method,1);used+=tlv(b->body+used,6,&state,1);used+=tlv(b->body+used,19,&flags,1);
    trace(io,12);
    if(!post(io,b,"/pair-setup",b->body,used,&off,&n,&r->last_http_status))goto done;
    trace(io,13);
    if(!get_tlv(b->input+off,n,2,b->salt,sizeof(b->salt),&sn) || !get_tlv(b->input+off,n,3,b->server_pub,sizeof(b->server_pub),&pn))goto done;
    trace(io,14);
    if(!alive(io))goto done;
    if(!io->random(io->opaque,b->a,sizeof(b->a)))goto done;
    trace(io,15);
    scratch=malloc(r->srp_workspace_bytes);if(!scratch)goto done;
    trace(io,16);
    if(!hap_srp_compute_ex(scratch,b->salt,sn,b->server_pub,pn,b->a,b->pub,b->proof,b->expected,b->key,io->opaque,io->within_deadline,io->trace))goto done;
    trace(io,23);
    free(scratch);scratch=NULL;
    used=0;const uint8_t state3=3;
    used+=tlv(b->body+used,6,&state3,1);used+=tlv(b->body+used,3,b->pub,sizeof(b->pub));used+=tlv(b->body+used,4,b->proof,sizeof(b->proof));
    trace(io,24);
    if(!post(io,b,"/pair-setup",b->body,used,&off,&n,&r->last_http_status))goto done;
    trace(io,25);
    if(!get_tlv(b->input+off,n,4,b->server_proof,sizeof(b->server_proof),&proofn))goto done;
    trace(io,26);
    r->server_proof_valid=hap_proof_equal(b->expected,b->server_proof,proofn);if(!r->server_proof_valid)goto done;
    r->paired=true;
    trace(io,27);
    if(!hap_derive_key(b->key,"Control-Salt","Control-Write-Encryption-Key",b->write_key) ||
       !hap_derive_key(b->key,"Control-Salt","Control-Read-Encryption-Key",b->read_key))goto done;
    if(!options) {
        memcpy(K,b->key,64);memcpy(write_key,b->write_key,32);memcpy(read_key,b->read_key,32);
        ok=true;goto done;
    }
    const char *request="OPTIONS * RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: AirPlay/320.20\r\nContent-Length: 0\r\n\r\n";
    n=strlen(request);b->output[0]=n&255;b->output[1]=n>>8;memcpy(b->output+2,request,n);
    cipher(b->write_key,b->output+2,n,b->output,b->output+2+n,true);
    if(!write_all(io,b->output,n+18))goto done;
    if(!read_all(io,b->input,2))goto done;
    n=b->input[0]|((size_t)b->input[1]<<8);
    if(n>1024 || n+18>sizeof(b->input))goto done;
    if(!read_all(io,b->input+2,n+16))goto done;
    uint8_t tag[16];cipher(b->read_key,b->input+2,n,b->input,tag,false);
    unsigned diff=0;for(unsigned i=0;i<16;++i)diff|=tag[i]^b->input[2+n+i];if(diff)goto done;
    b->input[n+2]=0;
    r->encrypted_options_valid=!strncmp((char*)b->input+2,"RTSP/1.0 200",12);
    ok=r->encrypted_options_valid;
done:
    trace(io,ok?28:29);
    if(scratch){clear(scratch,r->srp_workspace_bytes);free(scratch);}clear(b,sizeof(*b));free(b);return ok;
}
bool hap_pair_and_options(hap_io *io,hap_pair_result *r) {
    return pair_core(io,r,NULL,NULL,NULL,true);
}
bool hap_pair_authenticate(hap_io *io,hap_pair_result *r,uint8_t K[64],uint8_t wk[32],uint8_t rk[32]) {
    if(!K || !wk || !rk)return false;
    return pair_core(io,r,K,wk,rk,false);
}
