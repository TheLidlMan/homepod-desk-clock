/*
 * Copyright (c) 2016 Thomas Pornin <pornin@bolet.org>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/* Exploratory SRP-6a client for transient HAP M1-M4, using the BearSSL already
 * bundled with the ESP8266 framework. No Ed25519/X25519 or permanent pairing.
 * Uses framework-pinned internal br_i15 API: not a stable public BearSSL API. */
#include "hap_native.h"
#include "inner.h"
#include <string.h>
#if defined(ESP8266) || defined(HAP_SRP_TEST_CLOCK)
extern uint32_t system_get_time(void);
#ifndef HAP_SRP_MAX_US
#define HAP_SRP_MAX_US 20000000UL
#endif
#endif

static const char modulus_hex[] PROGMEM =
"FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74"
"020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437"
"4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED"
"EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF05"
"98DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB"
"9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
"E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF695581718"
"3995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33"
"A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7"
"ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864"
"D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E2"
"08E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";
typedef struct {
    uint16_t n[206], v[206], k[206], b[206], t1[206], t2[206];
    uint8_t nbytes[384], buffer[384], x[64], u[64], hash[64], exponent[129];
    br_sha512_context sha;
} workspace;
static void clear(void *p,size_t n) { volatile uint8_t *v=p; while(n--) *v++=0; }
static unsigned nybble(unsigned c) { return c<='9' ? c-'0' : c-'A'+10; }

size_t hap_srp_workspace_size(void) { return sizeof(workspace); }
static void digest(const void *data,size_t n,uint8_t out[64]) {
    br_sha512_context c; br_sha512_init(&c); br_sha512_update(&c,data,n);
    br_sha512_out(&c,out); clear(&c,sizeof(c));
}
static void update_minimal(br_sha512_context *c,const uint8_t *data,size_t n) {
    while(n>1 && !*data) { ++data; --n; }
    br_sha512_update(c,data,n);
}
/* Equivalent square/multiply schedule to BearSSL br_i15_modpow, with ESP8266
 * cooperative yields at exponent-bit boundaries to service Wi-Fi/watchdog.
 * All exponent bits perform both multiplications; CCOPY selects in constant
 * time. No exponent-bit-dependent branches or variable exponent length. */
static bool modpow(workspace *w,uint16_t *x,const uint8_t *e,size_t n,uint16_t ni,uint32_t started,void *opaque,bool (*alive)(void *),void (*trace)(void *,uint8_t)) {
    size_t mlen=((w->n[0]+31)>>4)*sizeof(uint16_t);
    if(alive&&!alive(opaque))return false;
    if(trace)trace(opaque,50);
    memcpy(w->t1,x,mlen); br_i15_to_monty(w->t1,w->n);
    if(trace)trace(opaque,51);
    br_i15_zero(x,w->n[0]); x[1]=1;
    for(size_t bit=0;bit<n*8;++bit) {
        if(alive&&!alive(opaque))return false;
        if(trace && (bit&127)==0)trace(opaque,52);
#if defined(ESP8266) || defined(HAP_SRP_TEST_CLOCK)
        if((uint32_t)(system_get_time()-started)>=HAP_SRP_MAX_US)return false;
#else
        (void)started;
#endif
        uint32_t choice=(e[n-1-(bit>>3)]>>(bit&7))&1;
        br_i15_montymul(w->t2,x,w->t1,w->n,ni);
        CCOPY(choice,x,w->t2,mlen);
        br_i15_montymul(w->t2,w->t1,w->t1,w->n,ni);
        memcpy(w->t1,w->t2,mlen);
        optimistic_yield(1000);
    }
    return true;
}
bool hap_proof_equal(const uint8_t expected[64],const uint8_t *actual,size_t n) {
    if (!expected || !actual || n!=64) return false;
    unsigned diff=0; for(unsigned i=0;i<64;++i) diff |= expected[i]^actual[i];
    return diff==0;
}
bool hap_derive_key(const uint8_t session_key[64],const char *salt,const char *info,uint8_t key[32]) {
    if(!session_key || !salt || !info || !key) return false;
    br_hkdf_context c; br_hkdf_init(&c,&br_sha512_vtable,salt,strlen(salt));
    br_hkdf_inject(&c,session_key,64); br_hkdf_flip(&c);
    bool ok=br_hkdf_produce(&c,info,strlen(info),key,32)==32;
    clear(&c,sizeof(c)); return ok;
}
bool hap_srp_compute_ex(void *scratch,const uint8_t *salt,size_t sn,const uint8_t *pub,size_t pn,
    const uint8_t a[32],uint8_t A[384],uint8_t proof[64],uint8_t expected[64],uint8_t K[64],void *opaque,bool (*alive)(void *),void (*trace)(void *,uint8_t)) {
    if (!scratch || !salt || sn<1 || sn>64 || !pub || pn<1 || pn>384 || !a || !A || !proof || !expected || !K)
        return false;
    uint32_t started=0;
#if defined(ESP8266) || defined(HAP_SRP_TEST_CLOCK)
    started=system_get_time();
#endif
    workspace *w=scratch; memset(w,0,sizeof(*w)); bool ok=false;
    for(unsigned i=0;i<384;++i)
        w->nbytes[i]=(nybble(pgm_read_byte(modulus_hex+2*i))<<4)|nybble(pgm_read_byte(modulus_hex+2*i+1));
    br_i15_decode(w->n,w->nbytes,384); uint16_t ni=br_i15_ninv15(w->n[1]);
    br_i15_decode_reduce(w->b,pub,pn,w->n);
    if(br_i15_iszero(w->b)) goto done;
    if(alive&&!alive(opaque))goto done;
    if(trace)trace(opaque,17);
    /* A = 5^a mod N */
    br_i15_zero(w->v,w->n[0]); w->v[1]=5;
    if(!modpow(w,w->v,a,32,ni,started,opaque,alive,trace))goto done;
    if(trace)trace(opaque,18);
    br_i15_encode(A,384,w->v);
    /* u = H(PAD(A),PAD(B)), k = H(PAD(N),PAD(g)) */
    br_sha512_init(&w->sha); br_sha512_update(&w->sha,A,384);
    memset(w->buffer,0,384); memcpy(w->buffer+384-pn,pub,pn);
    br_sha512_update(&w->sha,w->buffer,384); br_sha512_out(&w->sha,w->u);
    unsigned uz=0; for(unsigned i=0;i<64;++i) uz |= w->u[i]; if(!uz) goto done;
    br_sha512_init(&w->sha); br_sha512_update(&w->sha,w->nbytes,384);
    memset(w->buffer,0,384); w->buffer[383]=5;
    br_sha512_update(&w->sha,w->buffer,384); br_sha512_out(&w->sha,w->hash);
    br_i15_decode_reduce(w->k,w->hash,64,w->n);
    /* x = H(salt,H(Pair-Setup:3939)) */
    digest("Pair-Setup:3939",15,w->hash);
    br_sha512_init(&w->sha); br_sha512_update(&w->sha,salt,sn);
    br_sha512_update(&w->sha,w->hash,64); br_sha512_out(&w->sha,w->x);
    if(alive&&!alive(opaque))goto done;
    if(trace)trace(opaque,19);
    /* v = k*5^x mod N, then b = B-v mod N. */
    br_i15_zero(w->v,w->n[0]); w->v[1]=5;
    if(!modpow(w,w->v,w->x,64,ni,started,opaque,alive,trace))goto done;
    if(trace)trace(opaque,20);
    if(alive&&!alive(opaque))goto done;
    br_i15_to_monty(w->k,w->n);
    br_i15_montymul(w->t1,w->v,w->k,w->n,ni);
    uint32_t borrow=br_i15_sub(w->b,w->t1,1); br_i15_add(w->b,w->n,borrow);
    /* 1024-bit exponent u*x+a: fixed-size base-256 multiplication. */
    uint8_t *e=w->exponent;
    for(unsigned i=0;i<64;++i) {
        unsigned carry=0;
        for(unsigned j=0;j<64;++j) {
            unsigned v=e[i+j]+w->u[63-i]*w->x[63-j]+carry;
            e[i+j]=v&255; carry=v>>8;
        }
        e[i+64]=(uint8_t)carry;
    }
    unsigned carry=0;
    for(unsigned i=0;i<129;++i) {
        unsigned v=e[i]+(i<32 ? a[31-i] : 0)+carry;
        e[i]=v&255; carry=v>>8;
    }
    for(unsigned i=0;i<64;++i) { uint8_t v=e[i]; e[i]=e[128-i]; e[128-i]=v; }
    if(alive&&!alive(opaque))goto done;
    if(trace)trace(opaque,21);
    if(!modpow(w,w->b,e,129,ni,started,opaque,alive,trace))goto done;
    if(trace)trace(opaque,22);
    br_i15_encode(w->buffer,384,w->b);
    br_sha512_init(&w->sha); update_minimal(&w->sha,w->buffer,384); br_sha512_out(&w->sha,K);
    /* M1 = H(H(N)^H(g),H(user),salt,A,B,K), with minimal integer encodings. */
    digest(w->nbytes,384,w->hash); const uint8_t g=5; digest(&g,1,w->x);
    for(unsigned i=0;i<64;++i) w->hash[i]^=w->x[i];
    digest("Pair-Setup",10,w->x);
    br_sha512_init(&w->sha); br_sha512_update(&w->sha,w->hash,64);
    br_sha512_update(&w->sha,w->x,64); br_sha512_update(&w->sha,salt,sn);
    update_minimal(&w->sha,A,384); update_minimal(&w->sha,pub,pn);
    br_sha512_update(&w->sha,K,64); br_sha512_out(&w->sha,proof);
    br_sha512_init(&w->sha); update_minimal(&w->sha,A,384);
    br_sha512_update(&w->sha,proof,64); br_sha512_update(&w->sha,K,64);
    br_sha512_out(&w->sha,expected); ok=true;
done:
    clear(w,sizeof(*w));
    if(!ok) { clear(A,384); clear(proof,64); clear(expected,64); clear(K,64); }
    return ok;
}

bool hap_srp_compute(void *w,const uint8_t *salt,size_t sn,const uint8_t *pub,size_t pn,const uint8_t a[32],uint8_t A[384],uint8_t proof[64],uint8_t expected[64],uint8_t K[64]) {
    return hap_srp_compute_ex(w,salt,sn,pub,pn,a,A,proof,expected,K,NULL,NULL,NULL);
}
