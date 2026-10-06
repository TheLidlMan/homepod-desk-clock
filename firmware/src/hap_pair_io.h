#ifndef HAP_PAIR_IO_H
#define HAP_PAIR_IO_H
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
/* Socket adapters must implement bounded-time reads/writes. Positive return is
 * bytes transferred, <=0 is failure. Their secure RNG must fill requested bytes.
 * A WiFiClient wrapper can implement these without a desktop runtime. */
typedef struct {
    void *opaque;
    int (*read)(void *,uint8_t *,size_t);
    int (*write)(void *,const uint8_t *,size_t);
    bool (*random)(void *,uint8_t *,size_t);
    void (*trace)(void *,uint8_t); /* Optional aggregate phase only. */
    bool (*within_deadline)(void *); /* Optional absolute operation budget. */
} hap_io;
typedef struct {
    bool paired, server_proof_valid, encrypted_options_valid;
    int last_http_status;
    size_t srp_workspace_bytes;
} hap_pair_result;
bool hap_pair_and_options(hap_io *io,hap_pair_result *result);
bool hap_pair_authenticate(hap_io *io,hap_pair_result *result,
    uint8_t session_key[64],uint8_t write_key[32],uint8_t read_key[32]);
#endif
