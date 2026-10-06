#ifndef BPLIST_MINIMAL_H
#define BPLIST_MINIMAL_H
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
typedef struct { const uint8_t *data; size_t size,offset_table,count,top; unsigned offset_size,ref_size; } bplist;
typedef struct { size_t index; unsigned kind; const uint8_t *data; size_t count; } bplist_object;
bool bplist_open(bplist *b,const uint8_t *data,size_t size);
bool bplist_at(const bplist *b,size_t index,bplist_object *out);
bool bplist_dict(const bplist *b,const bplist_object *dict,const char *key,bplist_object *out);
bool bplist_index(const bplist *b,const bplist_object *array,size_t index,bplist_object *out);
bool bplist_number(const bplist_object *o,uint64_t *out);
size_t bplist_wrap_data(uint8_t *out,size_t cap,const uint8_t *data,size_t size);
#endif
