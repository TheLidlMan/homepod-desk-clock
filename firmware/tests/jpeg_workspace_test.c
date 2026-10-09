#include "jpeg_mdi.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { FILE *input; size_t written; uint16_t edge; } fixture;
static size_t read_bytes(void *opaque,uint8_t *bytes,size_t n){
    return fread(bytes,1,n,((fixture *)opaque)->input);
}
static bool write_bytes(void *opaque,const uint8_t *bytes,size_t n){
    fixture *f=opaque;
    if(!f->written){assert(n==8&&!memcmp(bytes,"MDI2",4));assert(bytes[4]==f->edge&&bytes[6]==f->edge);}
    f->written+=n;return true;
}
int main(int argc,char **argv){
    assert(argc==3);uint16_t edge=(uint16_t)atoi(argv[2]);
    assert(jpeg_mdi_workspace_size(15)==0&&jpeg_mdi_workspace_size(119)==0);
    assert(jpeg_mdi_workspace_size(118)-jpeg_mdi_workspace_size(80)==1216);
    size_t size=jpeg_mdi_workspace_size(edge);assert(size);
    void *memory=malloc(size);assert(memory);
    fixture f={fopen(argv[1],"rb"),0,edge};assert(f.input);
    jpeg_mdi_io io={&f,read_bytes,write_bytes,NULL};jpeg_mdi_receipt result;
    assert(jpeg_mdi_convert(memory,&io,edge,&result));
    assert(result.error==0&&result.width==edge&&result.height==edge&&result.rows_written==edge);
    assert(f.written==8+(size_t)edge*(3+2*edge));
    rewind(f.input);f.written=0;
    uint16_t wrong=edge==17?16:edge-1;
    assert(!jpeg_mdi_convert(memory,&io,wrong,&result)&&result.error==100&&f.written==0);
    fclose(f.input);free(memory);return 0;
}
