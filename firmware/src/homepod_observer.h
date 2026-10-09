#ifndef HOMEPOD_OBSERVER_H
#define HOMEPOD_OBSERVER_H
#include "hap_pair_io.h"
#include "mrp_minimal.h"
typedef struct {
    void *opaque;
    bool (*connect)(void *,uint16_t,hap_io *);
    void (*close)(void *,hap_io *);
    int (*available)(void *,hap_io *);
    bool (*reserve)(void *,size_t); /* Optional heap/contiguous-block floor guard. */
    void (*trace)(void *,uint8_t);
    bool (*within_deadline)(void *);
    bool (*reserve_record)(void *,size_t); /* Optional guard for immediately drained RX records. */
    /* Optional bounded ciphertext staging; return owned malloc storage on success. */
    bool (*drain_record)(void *,hap_io *,uint8_t *,size_t,size_t,uint8_t **);
    const char *controller_id; /* Optional stable, device-specific 17-byte MAC-shaped ID. */
} homepod_factory;
typedef struct homepod_observer homepod_observer;
typedef struct {
    uint32_t messages,state_updates,event_records,event_replies;
    size_t max_frame,max_protobuf,context_bytes,peak_frame_allocation;
    int stage,error,transport_error,control_status;
    size_t last_record_bytes,last_record_received; /* Ciphertext/tag progress, no payload. */
    size_t rejected_record_bytes,pending_frame_bytes;int allocation_reject_reason;
    bool metadata_present,paired;
} observer_receipt;
homepod_observer *homepod_observer_open(homepod_factory *,observer_receipt *);
/* Call often; now_ms is monotonic. No playback/volume/routing writes. */
bool homepod_observer_poll(homepod_observer *,uint32_t now_ms);
/* Native owners call this immediately after poll with a fresh send budget. */
bool homepod_observer_acknowledge(homepod_observer *);
/* Partial HAP records and logical frames retain bounded memory across polls. */
bool homepod_observer_frame_pending(const homepod_observer *);
const mrp_metadata *homepod_observer_metadata(const homepod_observer *);
const char *homepod_observer_item(const homepod_observer *);
/* Sink must persist borrowed JPEG bytes synchronously; decode AFTER poll returns. */
bool homepod_observer_request_artwork(homepod_observer *,uint16_t edge,
    bool (*sink)(void *,const uint8_t *,size_t,uint16_t,uint16_t),void *opaque);
void homepod_observer_close(homepod_observer *);
#endif
