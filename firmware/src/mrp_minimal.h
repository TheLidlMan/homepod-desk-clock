#ifndef MRP_MINIMAL_H
#define MRP_MINIMAL_H
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
/* Exploratory receive-only decoder. No sockets, control commands, or allocation. */
typedef struct {
    char title[129], artist[129], album[129];
    double duration, elapsed;
    float playback_rate;
    uint32_t playback_state;
    uint32_t present;
} mrp_metadata;
enum { MRP_TITLE=1, MRP_ARTIST=2, MRP_ALBUM=4, MRP_DURATION=8,
       MRP_ELAPSED=16, MRP_RATE=32, MRP_STATE=64 };
/* Decodes one protobuf ProtocolMessage/SET_STATE_MESSAGE. Unsupported message
 * types return false. Output is unchanged on malformed or unsupported input.
 * This is a decoder seam, not a complete player-selection/state implementation. */
bool mrp_decode_state(const uint8_t *data, size_t size, mrp_metadata *out);
typedef struct {
    uint32_t type;
    char client[97],player[97],item[129];
    mrp_metadata metadata;
} mrp_event;
/* Active client/player, SetState and current-item update subset. */
bool mrp_decode_event(const uint8_t *data,size_t size,mrp_event *out);
bool mrp_protocol_type(const uint8_t *data,size_t size,uint32_t *out);
typedef struct {
    const uint8_t *jpeg,*identifier;size_t jpeg_size,identifier_size;
    uint32_t location;uint16_t width,height;
} mrp_art_view;
/* Borrowed spans, valid only during the original frame lifetime. */
bool mrp_art_info(const uint8_t *,size_t,mrp_art_view *);
#endif
