#include "mrp_minimal.h"
#include <string.h>

typedef struct { const uint8_t *p; size_t n; } span;
typedef struct { uint32_t tag, wire; uint64_t scalar; span bytes; } field;

static bool varint(span *s, uint64_t *v) {
    *v=0;
    for (unsigned i=0; i<10; ++i) {
        if (!s->n) return false;
        unsigned b=*s->p++; --s->n;
        if (i==9 && b>1) return false;
        *v |= (uint64_t)(b & 127) << (7*i);
        if (!(b & 128)) return true;
    }
    return false;
}
static bool next(span *s, field *f) {
    uint64_t key, len=0;
    memset(f,0,sizeof(*f));
    if (!varint(s,&key) || (key>>3)==0 || (key>>3)>0x1fffffff) return false;
    f->tag=(uint32_t)(key>>3); f->wire=key & 7;
    switch (f->wire) {
    case 0: return varint(s,&f->scalar);
    case 1: len=8; break;
    case 2: if (!varint(s,&len)) return false; break;
    case 5: len=4; break;
    default: return false;
    }
    if (len>s->n) return false;
    f->bytes=(span){s->p,(size_t)len};
    s->p+=len; s->n-=len;
    return true;
}
static bool string_copy(char *out, size_t cap, span value) {
    /* Reject rather than silently cut multibyte text in the proof of concept. */
    if (value.n>=cap || memchr(value.p,0,value.n)) return false;
    memcpy(out,value.p,value.n); out[value.n]=0; return true;
}
static uint64_t little(span b) {
    uint64_t v=0;
    for (size_t i=0;i<b.n;++i) v |= (uint64_t)b.p[i] << (8*i);
    return v;
}
static bool metadata(span s,mrp_metadata *m) {
    field f;
    while (s.n) {
        if (!next(&s,&f)) return false;
        if (f.wire==2 && (f.tag==1 || f.tag==6 || f.tag==7)) {
            char *dest=f.tag==1 ? m->title : f.tag==6 ? m->album : m->artist;
            if (!string_copy(dest,129,f.bytes)) return false;
            m->present |= f.tag==1 ? MRP_TITLE : f.tag==6 ? MRP_ALBUM : MRP_ARTIST;
        } else if (f.wire==1 && (f.tag==14 || f.tag==35)) {
            uint64_t bits=little(f.bytes); double value;
            memcpy(&value,&bits,sizeof(value));
            if (f.tag==14) { m->duration=value; m->present |= MRP_DURATION; }
            else { m->elapsed=value; m->present |= MRP_ELAPSED; }
        } else if (f.wire==5 && f.tag==39) {
            uint32_t bits=(uint32_t)little(f.bytes);
            memcpy(&m->playback_rate,&bits,sizeof(bits)); m->present |= MRP_RATE;
        }
    }
    return true;
}
static bool item(span s,mrp_metadata *m) {
    field f;
    while (s.n) {
        if (!next(&s,&f)) return false;
        if (f.tag==2 && f.wire==2 && !metadata(f.bytes,m)) return false;
    }
    return true;
}
static bool queue(span s,mrp_metadata *m) {
    span original=s; field f; uint64_t location=0,index=0;
    while (s.n) {
        if (!next(&s,&f)) return false;
        if (f.tag==1 && f.wire==0) location=f.scalar;
    }
    s=original;
    while (s.n) {
        if (!next(&s,&f)) return false;
        if (f.tag==2 && f.wire==2 && index++==location && !item(f.bytes,m)) return false;
    }
    return true;
}
static bool state(span s,mrp_metadata *m) {
    field f;
    while (s.n) {
        if (!next(&s,&f)) return false;
        if (f.tag==3 && f.wire==2 && !queue(f.bytes,m)) return false;
        if (f.tag==6 && f.wire==0) { m->playback_state=(uint32_t)f.scalar; m->present|=MRP_STATE; }
    }
    return true;
}
bool mrp_decode_state(const uint8_t *data,size_t size,mrp_metadata *out) {
    if ((!data && size) || !out) return false;
    span s={data,size}, inner={0,0}; field f; uint64_t type=0;
    mrp_metadata candidate={0};
    while (s.n) {
        if (!next(&s,&f)) return false;
        if (f.tag==1 && f.wire==0) type=f.scalar;
        if (f.tag==9 && f.wire==2) inner=f.bytes;
    }
    if (type!=4 || !inner.p || !state(inner,&candidate)) return false;
    *out=candidate; return true;
}
static bool named(span s,unsigned tag,char *out,size_t cap) {
    field f;
    while(s.n) {
        if(!next(&s,&f))return false;
        if(f.tag==tag && f.wire==2 && !string_copy(out,cap,f.bytes))return false;
    }
    return true;
}
static bool path(span s,mrp_event *e) {
    field f;
    while(s.n) {
        if(!next(&s,&f))return false;
        if(f.tag==2 && f.wire==2 && !named(f.bytes,2,e->client,sizeof(e->client)))return false;
        if(f.tag==3 && f.wire==2 && !named(f.bytes,1,e->player,sizeof(e->player)))return false;
    }
    return true;
}
static bool event_item(span s,mrp_event *e) {
    return item(s,&e->metadata) && named(s,1,e->item,sizeof(e->item));
}
static bool event_queue(span s,mrp_event *e) {
    span original=s;field f;uint64_t location=0,index=0;
    while(s.n) {if(!next(&s,&f))return false;if(f.tag==1 && f.wire==0)location=f.scalar;}
    s=original;
    while(s.n) {
        if(!next(&s,&f))return false;
        if(f.tag==2 && f.wire==2 && index++==location && !event_item(f.bytes,e))return false;
    }
    return true;
}
bool mrp_decode_event(const uint8_t *data,size_t size,mrp_event *out) {
    if((!data && size) || !out)return false;
    span s={data,size},state_span={0},client_span={0},player_span={0},update_span={0};field f;mrp_event e={0};
    while(s.n) {
        if(!next(&s,&f))return false;
        if(f.tag==1 && f.wire==0)e.type=(uint32_t)f.scalar;
        if(f.wire==2) {
            if(f.tag==9)state_span=f.bytes;
            if(f.tag==50)client_span=f.bytes;
            if(f.tag==51)player_span=f.bytes;
            if(f.tag==60)update_span=f.bytes;
        }
    }
    if(e.type==46) {
        s=client_span;
        while(s.n) {if(!next(&s,&f))return false;if(f.tag==1 && f.wire==2 && !named(f.bytes,2,e.client,sizeof(e.client)))return false;}
    } else if(e.type==47) {
        s=player_span;
        while(s.n) {if(!next(&s,&f))return false;if(f.tag==1 && f.wire==2 && !path(f.bytes,&e))return false;}
    } else if(e.type==4) {
        s=state_span;
        while(s.n) {
            if(!next(&s,&f))return false;
            if(f.tag==9 && f.wire==2 && !path(f.bytes,&e))return false;
            if(f.tag==3 && f.wire==2 && !event_queue(f.bytes,&e))return false;
            if(f.tag==6 && f.wire==0){e.metadata.playback_state=(uint32_t)f.scalar;e.metadata.present|=MRP_STATE;}
        }
    } else if(e.type==56) {
        s=update_span;
        while(s.n) {
            if(!next(&s,&f))return false;
            if(f.tag==2 && f.wire==2 && !path(f.bytes,&e))return false;
            if(f.tag==1 && f.wire==2 && !event_item(f.bytes,&e))return false;
        }
    } else return false;
    *out=e;return true;
}
bool mrp_protocol_type(const uint8_t *data,size_t size,uint32_t *out){
    if((!data&&size)||!out)return false;
    span s={data,size};field f;bool found=false;uint32_t type=0;
    while(s.n){if(!next(&s,&f))return false;if(f.tag==1&&f.wire==0){type=(uint32_t)f.scalar;found=true;}}
    if(found)*out=type;
    return found;
}

bool mrp_art_info(const uint8_t *p,size_t n,mrp_art_view *out){
    if((!p&&n)||!out)return false;
    span s={p,n},state={0},q={0};field f;uint64_t type=0;mrp_art_view v={0};
    while(s.n){if(!next(&s,&f))return false;if(f.tag==1&&f.wire==0)type=f.scalar;
        if(f.tag==2&&f.wire==2){v.identifier=f.bytes.p;v.identifier_size=f.bytes.n;}
        if(f.tag==9&&f.wire==2)state=f.bytes;}
    if(type!=4||!state.p)return false;
    s=state;
    while(s.n){if(!next(&s,&f))return false;if(f.tag==3&&f.wire==2)q=f.bytes;}
    if(!q.p)return false;
    s=q;size_t count=0;
    while(s.n){if(!next(&s,&f))return false;if(f.tag==1&&f.wire==0){if(f.scalar>UINT32_MAX)return false;v.location=f.scalar;}
        if(f.tag==2&&f.wire==2)++count;}
    size_t selected=(count==1)?0:v.location,index=0;s=q;
    while(s.n){if(!next(&s,&f))return false;if(f.tag!=2||f.wire!=2||index++!=selected)continue;
        span item=f.bytes;field x;
        while(item.n){if(!next(&item,&x))return false;
            if(x.tag==3&&x.wire==2){v.jpeg=x.bytes.p;v.jpeg_size=x.bytes.n;}
            if((x.tag==13||x.tag==14)&&x.wire==0){if(x.scalar>UINT16_MAX)return false;if(x.tag==13)v.width=x.scalar;else v.height=x.scalar;}
        }
    }
    *out=v;return true;
}
