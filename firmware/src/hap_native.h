#ifndef HAP_NATIVE_H
#define HAP_NATIVE_H
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
/* Scratch memory is explicitly caller-owned; no malloc and no persistent secrets.
 * Caller MUST obtain private_a from a cryptographically secure RNG. */
size_t hap_srp_workspace_size(void);
bool hap_srp_compute(void *workspace, const uint8_t *salt, size_t salt_size,
    const uint8_t *server_public, size_t public_size, const uint8_t private_a[32],
    uint8_t client_public[384], uint8_t client_proof[64],
    uint8_t expected_server_proof[64], uint8_t session_key[64]);
bool hap_srp_compute_ex(void *workspace, const uint8_t *salt, size_t salt_size,
    const uint8_t *server_public, size_t public_size, const uint8_t private_a[32],
    uint8_t client_public[384], uint8_t client_proof[64],
    uint8_t expected_server_proof[64], uint8_t session_key[64],
    void *opaque, bool (*within_deadline)(void *), void (*trace)(void *,uint8_t));
bool hap_derive_key(const uint8_t session_key[64], const char *salt,
                    const char *info, uint8_t key[32]);
bool hap_proof_equal(const uint8_t expected[64],const uint8_t *actual,size_t n);
#endif
