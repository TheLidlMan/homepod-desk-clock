#include "bplist_minimal.h"
#include <string.h>
static uint64_t be(const uint8_t *p,unsigned n) { uint64_t v=0;while(n--)v=(v<<8)|*p++;return v; }
bool bplist_open(bplist *b,const uint8_t *p,size_t n) {
    if(!b || !p || n<40 || memcmp(p,"bplist00",8))return false;
    const uint8_t *t=p+n-32;
    uint64_t count=be(t+8,8),top=be(t+16,8),off=be(t+24,8);
    if(t[6]<1 || t[6]>4 || t[7]<1 || t[7]>2 || !count || count>1024 || top>=count || off<8 || off>n-32 || count>(n-32-off)/t[6])return false;
    *b=(bplist){p,n,(size_t)off,(size_t)count,(size_t)top,t[6],t[7]};return true;
}
bool bplist_at(const bplist *b,size_t index,bplist_object *out) {
    if(index>=b->count)return false;
    size_t off=(size_t)be(b->data+b->offset_table+index*b->offset_size,b->offset_size);
    if(off<8 || off>=b->offset_table)return false;
    const uint8_t *p=b->data+off;unsigned kind=*p>>4;size_t count=*p++&15;
    if(count==15 && kind!=0 && kind!=1 && kind!=2) {
        if((size_t)(p-b->data)>=b->offset_table || (*p>>4)!=1 || (*p&15)>3)return false;
        unsigned bytes=1u<<(*p++&15);
        if(bytes>b->offset_table-(size_t)(p-b->data))return false;
        uint64_t decoded=be(p,bytes);
        if(decoded>SIZE_MAX)return false;
        count=(size_t)decoded;p+=bytes;
    }
    size_t bytes=count;
    if(kind==0)bytes=0;
    else if(kind==1 || kind==2) { if(count>3)return false;bytes=1u<<count; }
    else if(kind==6) { if(count>SIZE_MAX/2)return false;bytes=count*2; }
    else if(kind==10 || kind==13) {
        unsigned factor=b->ref_size*(kind==13?2:1);
        if(count>SIZE_MAX/factor)return false;
        bytes=count*factor;
    } else if(kind!=4 && kind!=5)return false;
    if(bytes>b->offset_table-(size_t)(p-b->data))return false;
    *out=(bplist_object){index,kind,p,count};return true;
}
bool bplist_dict(const bplist *b,const bplist_object *dict,const char *key,bplist_object *out) {
    if(dict->kind!=13)return false;
    size_t n=strlen(key);
    for(size_t i=0;i<dict->count;++i) {
        bplist_object k;size_t ref=(size_t)be(dict->data+i*b->ref_size,b->ref_size);
        if(!bplist_at(b,ref,&k))return false;
        if(k.kind==5 && k.count==n && !memcmp(k.data,key,n)) {
            ref=(size_t)be(dict->data+(dict->count+i)*b->ref_size,b->ref_size);
            return bplist_at(b,ref,out);
        }
    }
    return false;
}
bool bplist_index(const bplist *b,const bplist_object *a,size_t index,bplist_object *out) {
    return a->kind==10 && index<a->count && bplist_at(b,(size_t)be(a->data+index*b->ref_size,b->ref_size),out);
}
bool bplist_number(const bplist_object *o,uint64_t *out) {
    if(o->kind!=1 || o->count>3)return false;
    *out=be(o->data,1u<<o->count);return true;
}
size_t bplist_wrap_data(uint8_t *out,size_t cap,const uint8_t *data,size_t n) {
    if(n>65500 || cap<n+80)return 0;
    size_t offsets[5],p=8;memcpy(out,"bplist00",8);
    /* Match plistlib/CFPropertyList's root-first object order and minimal lengths. */
    offsets[0]=p;out[p++]=0xd1;out[p++]=1;out[p++]=2;
    offsets[1]=p;out[p++]=0x56;memcpy(out+p,"params",6);p+=6;
    offsets[2]=p;out[p++]=0xd1;out[p++]=3;out[p++]=4;
    offsets[3]=p;out[p++]=0x54;memcpy(out+p,"data",4);p+=4;
    offsets[4]=p;
    if(n<15)out[p++]=0x40|(uint8_t)n;
    else {out[p++]=0x4f;out[p++]=n<=255?0x10:0x11;if(n>255)out[p++]=(uint8_t)(n>>8);out[p++]=(uint8_t)n;}
    memcpy(out+p,data,n);p+=n;
    size_t table=p;
    unsigned offset_size=table<256?1:2;
    for(unsigned i=0;i<5;++i) {if(offset_size==2)out[p++]=offsets[i]>>8;out[p++]=offsets[i]&255;}
    memset(out+p,0,32);out[p+6]=offset_size;out[p+7]=1;out[p+15]=5;
    for(unsigned i=0;i<8;++i)out[p+31-i]=(uint8_t)((uint64_t)table>>(i*8));
    return p+32;
}
