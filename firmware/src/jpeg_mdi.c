#include "jpeg_mdi.h"
#include "codec/tjpgd.h"
#include <string.h>
#define MAX_EDGE 118
#define STRIPE_ROWS 16
typedef struct {
 JDEC decoder;jpeg_mdi_io io;jpeg_mdi_receipt *receipt;
 uint16_t stripe[MAX_EDGE*STRIPE_ROWS];uint16_t next_x,band_top,band_height;
 union {uint32_t align;uint8_t bytes[TJPGD_WORKSPACE_SIZE];} pool;
} workspace;
size_t jpeg_mdi_workspace_size(void){return sizeof(workspace);}
static bool alive(workspace *w){return !w->io.alive||w->io.alive(w->io.opaque);}
static size_t input(JDEC *j,uint8_t *bytes,size_t n){
 workspace *w=j->device;if(!alive(w))return 0;
 if(bytes){size_t got=w->io.read(w->io.opaque,bytes,n);return got<=n?got:0;}
 uint8_t skip[64];size_t total=0;
 while(total<n){size_t k=n-total;if(k>sizeof(skip))k=sizeof(skip);size_t got=w->io.read(w->io.opaque,skip,k);if(!got||got>k)break;total+=got;}
 return total;
}
static bool emit(workspace *w,const uint8_t *p,size_t n){
 if(!alive(w)||!w->io.write(w->io.opaque,p,n))return false;
 w->receipt->bytes_written+=n;return true;
}
static int output(JDEC *j,void *bitmap,JRECT *r){
 workspace *w=j->device;uint16_t width=j->width;
 if(!alive(w)||r->right>=width||r->bottom>=j->height||r->right<r->left||r->bottom<r->top)return 0;
 uint16_t tile_width=r->right-r->left+1,tile_height=r->bottom-r->top+1;
 if(tile_height>STRIPE_ROWS||r->left!=w->next_x)return 0;
 if(!w->next_x){if(r->top!=w->receipt->rows_written)return 0;w->band_top=r->top;w->band_height=tile_height;}
 if(r->top!=w->band_top||tile_height!=w->band_height)return 0;
 for(unsigned y=0;y<tile_height;++y)memcpy(w->stripe+y*width+r->left,(uint16_t *)bitmap+y*tile_width,tile_width*2);
 w->next_x=r->right+1;if(w->next_x!=width)return 1;
 uint8_t row[3+2*MAX_EDGE];uint16_t bytes=1+width*2;row[0]=bytes;row[1]=bytes>>8;row[2]=width-1;
 for(unsigned y=0;y<tile_height;++y){
  for(unsigned x=0;x<width;++x){uint16_t color=w->stripe[y*width+x];row[3+x*2]=color;row[4+x*2]=color>>8;}
  if(!emit(w,row,3+2*width))return 0;
  ++w->receipt->rows_written;
 }
 w->next_x=0;return 1;
}
bool jpeg_mdi_convert(void *memory,const jpeg_mdi_io *io,uint16_t edge,jpeg_mdi_receipt *r){
 if(r)memset(r,0,sizeof(*r));
 if(!memory||!io||!io->read||!io->write||!r||edge<16||edge>MAX_EDGE){if(r)r->error=JDR_PAR;return false;}
 workspace *w=memory;memset(w,0,sizeof(*w));memset(r,0,sizeof(*r));w->io=*io;w->receipt=r;
 JRESULT result=jd_prepare(&w->decoder,input,w->pool.bytes,sizeof(w->pool.bytes),w);
 r->error=result;if(result!=JDR_OK)return false;
 r->width=w->decoder.width;r->height=w->decoder.height;r->pool_used=sizeof(w->pool.bytes)-w->decoder.sz_pool;
 if(r->width!=edge||r->height!=edge){r->error=100;return false;}
 uint8_t header[8]={'M','D','I','2',(uint8_t)edge,(uint8_t)(edge>>8),(uint8_t)edge,(uint8_t)(edge>>8)};
 if(!emit(w,header,sizeof(header))){r->error=101;return false;}
 result=jd_decomp(&w->decoder,output,0);r->error=result;
 return result==JDR_OK&&r->rows_written==edge&&!w->next_x;
}
