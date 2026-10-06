#ifndef JPEG_MDI_H
#define JPEG_MDI_H
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
typedef struct {void *opaque;size_t (*read)(void *,uint8_t *,size_t);bool (*write)(void *,const uint8_t *,size_t);bool (*alive)(void *);} jpeg_mdi_io;
typedef struct {uint16_t width,height;size_t rows_written,bytes_written,pool_used;int error;} jpeg_mdi_receipt;
/* Caller-owned heap workspace; never place this on the4KB ESP8266 stack. */
size_t jpeg_mdi_workspace_size(void);
bool jpeg_mdi_convert(void *,const jpeg_mdi_io *,uint16_t expected_edge,jpeg_mdi_receipt *);
#endif
