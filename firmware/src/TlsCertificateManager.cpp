#include "TlsCertificateManager.h"

#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS

#include <ArduinoJson.h>
#include <bearssl/bearssl.h>
#include <memory>
#include <vector>

namespace {

constexpr char kSettingsPath[] = "/tls.json";
constexpr char kSettingsTempPath[] = "/tls.tmp";
constexpr char kCertificatePath[] = "/tls.crt";
constexpr char kPrivateKeyPath[] = "/tls.key";
constexpr char kCertificateUploadPath[] = "/tls.crt.upload";
constexpr char kPrivateKeyUploadPath[] = "/tls.key.upload";
constexpr size_t kMaximumCredentialBytes = 8192;

using Bytes = std::vector<uint8_t>;

void append(Bytes &target, const Bytes &value) {
  target.insert(target.end(), value.begin(), value.end());
}

void appendLength(Bytes &target, size_t length) {
  if (length < 128) {
    target.push_back(static_cast<uint8_t>(length));
    return;
  }
  uint8_t encoded[4];
  size_t count = 0;
  while (length) {
    encoded[count++] = static_cast<uint8_t>(length & 0xff);
    length >>= 8;
  }
  target.push_back(0x80 | count);
  while (count) target.push_back(encoded[--count]);
}

Bytes tlv(uint8_t tag, const Bytes &value) {
  Bytes result;
  result.reserve(value.size() + 5);
  result.push_back(tag);
  appendLength(result, value.size());
  append(result, value);
  return result;
}

Bytes concat(std::initializer_list<Bytes> values) {
  Bytes result;
  size_t total = 0;
  for (const Bytes &value : values) total += value.size();
  result.reserve(total);
  for (const Bytes &value : values) append(result, value);
  return result;
}

Bytes oid(std::initializer_list<uint8_t> value) {
  return tlv(0x06, Bytes(value));
}

Bytes integer(Bytes value) {
  while (value.size() > 1 && value[0] == 0 && !(value[1] & 0x80)) {
    value.erase(value.begin());
  }
  if (!value.empty() && (value[0] & 0x80)) value.insert(value.begin(), 0);
  return tlv(0x02, value);
}

Bytes utf8(const String &value) {
  return tlv(0x0c, Bytes(value.begin(), value.end()));
}

Bytes name(const String &commonName) {
  return tlv(0x30, tlv(0x31, tlv(0x30, concat({
      oid({0x55, 0x04, 0x03}), utf8(commonName)}))));
}

Bytes algorithmIdentifier() {
  return tlv(0x30, oid({0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x02}));
}

Bytes subjectPublicKeyInfo(const uint8_t *publicKey, size_t length) {
  const Bytes algorithm = tlv(0x30, concat({
      oid({0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01}),
      oid({0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07})}));
  Bytes bits{0};
  bits.insert(bits.end(), publicKey, publicKey + length);
  return tlv(0x30, concat({algorithm, tlv(0x03, bits)}));
}

Bytes extension(const Bytes &id, const Bytes &value, bool critical = false) {
  Bytes body = id;
  if (critical) append(body, tlv(0x01, Bytes{0xff}));
  append(body, tlv(0x04, value));
  return tlv(0x30, body);
}

Bytes extensions(const String &hostname, const IPAddress &address) {
  Bytes names;
  const String localName = hostname + ".local";
  append(names, tlv(0x82, Bytes(hostname.begin(), hostname.end())));
  append(names, tlv(0x82, Bytes(localName.begin(), localName.end())));
  Bytes ip{address[0], address[1], address[2], address[3]};
  append(names, tlv(0x87, ip));

  const Bytes basic = extension(oid({0x55, 0x1d, 0x13}), tlv(0x30, {}), true);
  const Bytes keyUsage =
      extension(oid({0x55, 0x1d, 0x0f}), tlv(0x03, Bytes{0x07, 0x80}), true);
  const Bytes serverAuth = extension(
      oid({0x55, 0x1d, 0x25}),
      tlv(0x30, oid({0x2b, 0x06, 0x01, 0x05, 0x05, 0x07, 0x03, 0x01})));
  const Bytes san = extension(oid({0x55, 0x1d, 0x11}), tlv(0x30, names));
  return tlv(0xa3, tlv(0x30, concat({basic, keyUsage, serverAuth, san})));
}

bool writeFile(const char *path, const uint8_t *data, size_t length) {
  File file = LittleFS.open(path, "w");
  if (!file) return false;
  const bool success = file.write(data, length) == length;
  file.close();
  if (!success) LittleFS.remove(path);
  return success;
}

bool filesMatch(const BearSSL::X509List &certificate,
                const BearSSL::PrivateKey &privateKey) {
  if (!privateKey.isEC() || certificate.getCount() == 0) return false;
  const br_ec_private_key *secret = privateKey.getEC();
  const br_x509_trust_anchor *anchors = certificate.getTrustAnchors();
  if (!secret || !anchors || anchors[0].pkey.key_type != BR_KEYTYPE_EC) {
    return false;
  }
  const br_ec_impl *implementation = br_ec_get_default();
  uint8_t publicBuffer[BR_EC_KBUF_PUB_MAX_SIZE];
  br_ec_public_key derived{};
  const size_t length =
      br_ec_compute_pub(implementation, &derived, publicBuffer, secret);
  const br_ec_public_key &actual = anchors[0].pkey.key.ec;
  return length && derived.curve == actual.curve && length == actual.qlen &&
         memcmp(derived.q, actual.q, length) == 0;
}

bool generateCertificate(const String &hostname, const IPAddress &address,
                         Bytes &certificateDer, Bytes &privateKeyDer) {
  uint8_t entropy[48];
  if (!ESP.random(entropy, sizeof(entropy))) return false;
  br_hmac_drbg_context random{};
  br_hmac_drbg_init(&random, &br_sha256_vtable, entropy, sizeof(entropy));

  const br_ec_impl *implementation = br_ec_get_default();
  uint8_t privateBuffer[BR_EC_KBUF_PRIV_MAX_SIZE];
  uint8_t publicBuffer[BR_EC_KBUF_PUB_MAX_SIZE];
  br_ec_private_key privateKey{};
  br_ec_public_key publicKey{};
  if (!br_ec_keygen(&random.vtable, implementation, &privateKey, privateBuffer,
                    BR_EC_secp256r1)) {
    return false;
  }
  const size_t publicLength =
      br_ec_compute_pub(implementation, &publicKey, publicBuffer, &privateKey);
  if (!publicLength) return false;

  uint8_t serialBytes[16];
  br_hmac_drbg_generate(&random, serialBytes, sizeof(serialBytes));
  serialBytes[0] &= 0x7f;
  if (serialBytes[0] == 0) serialBytes[0] = 1;
  const Bytes serial(serialBytes, serialBytes + sizeof(serialBytes));
  const Bytes version = tlv(0xa0, integer(Bytes{2}));
  const Bytes validity = tlv(0x30, concat({
      tlv(0x17, Bytes{'2','4','0','1','0','1','0','0','0','0','0','0','Z'}),
      tlv(0x17, Bytes{'4','9','1','2','3','1','2','3','5','9','5','9','Z'})}));
  const String commonName = hostname + ".local";
  const Bytes signatureAlgorithm = algorithmIdentifier();
  const Bytes tbs = tlv(0x30, concat({
      version, integer(serial), signatureAlgorithm, name(commonName), validity,
      name(commonName), subjectPublicKeyInfo(publicKey.q, publicKey.qlen),
      extensions(hostname, address)}));

  uint8_t hash[32];
  br_sha256_context sha{};
  br_sha256_init(&sha);
  br_sha256_update(&sha, tbs.data(), tbs.size());
  br_sha256_out(&sha, hash);
  uint8_t signature[72];
  const size_t signatureLength = br_ecdsa_sign_asn1_get_default()(
      implementation, &br_sha256_vtable, hash, &privateKey, signature);
  if (!signatureLength) return false;
  Bytes signatureBits{0};
  signatureBits.insert(signatureBits.end(), signature,
                       signature + signatureLength);
  certificateDer =
      tlv(0x30, concat({tbs, signatureAlgorithm, tlv(0x03, signatureBits)}));

  const size_t privateLength =
      br_encode_ec_raw_der(nullptr, &privateKey, &publicKey);
  if (!privateLength) return false;
  privateKeyDer.resize(privateLength);
  return br_encode_ec_raw_der(privateKeyDer.data(), &privateKey, &publicKey) ==
         privateLength;
}

}  // namespace

bool TlsCertificateManager::begin(bool filesystemReady) {
  filesystemReady_ = filesystemReady;
  if (!filesystemReady_) return false;
  if (LittleFS.exists(kSettingsPath)) {
    File file = LittleFS.open(kSettingsPath, "r");
    StaticJsonDocument<128> document;
    if (file && !deserializeJson(document, file)) {
      enabled_ = document["enabled"] | false;
      generated_ = document["generated"] | false;
    }
    file.close();
  }
  const bool loaded = loadCredentials();
  if (!loaded) enabled_ = false;
  return loaded || !LittleFS.exists(kCertificatePath);
}

bool TlsCertificateManager::loadPair(
    const char *certificatePath, const char *keyPath,
    BearSSL::X509List *&certificate, BearSSL::PrivateKey *&privateKey) {
  File certificateFile = LittleFS.open(certificatePath, "r");
  File keyFile = LittleFS.open(keyPath, "r");
  if (!certificateFile || !keyFile) {
    certificateFile.close();
    keyFile.close();
    return false;
  }
  certificate = new BearSSL::X509List(certificateFile, certificateFile.size());
  privateKey = new BearSSL::PrivateKey(keyFile, keyFile.size());
  certificateFile.close();
  keyFile.close();
  if (!certificate || !privateKey || !filesMatch(*certificate, *privateKey)) {
    delete certificate;
    delete privateKey;
    certificate = nullptr;
    privateKey = nullptr;
    return false;
  }
  return true;
}

bool TlsCertificateManager::loadCredentials() {
  BearSSL::X509List *certificate = nullptr;
  BearSSL::PrivateKey *privateKey = nullptr;
  if (!loadPair(kCertificatePath, kPrivateKeyPath, certificate, privateKey)) {
    return false;
  }
  replaceCredentials(certificate, privateKey, generated_);
  return true;
}

void TlsCertificateManager::replaceCredentials(
    BearSSL::X509List *certificate, BearSSL::PrivateKey *privateKey,
    bool generated) {
  delete certificate_;
  delete privateKey_;
  certificate_ = certificate;
  privateKey_ = privateKey;
  generated_ = generated;
  updateFingerprint();
}

void TlsCertificateManager::updateFingerprint() {
  fingerprint_[0] = '\0';
  if (!certificate_ || certificate_->getCount() == 0) return;
  const br_x509_certificate &certificate = certificate_->getX509Certs()[0];
  uint8_t digest[32];
  br_sha256_context sha{};
  br_sha256_init(&sha);
  br_sha256_update(&sha, certificate.data, certificate.data_len);
  br_sha256_out(&sha, digest);
  char *position = fingerprint_;
  for (size_t index = 0; index < sizeof(digest); ++index) {
    if (index) *position++ = ':';
    snprintf(position, 3, "%02X", digest[index]);
    position += 2;
  }
  *position = '\0';
}

bool TlsCertificateManager::persistSettings() {
  StaticJsonDocument<128> document;
  document["enabled"] = enabled_;
  document["generated"] = generated_;
  File file = LittleFS.open(kSettingsTempPath, "w");
  if (!file || serializeJson(document, file) == 0) {
    file.close();
    LittleFS.remove(kSettingsTempPath);
    return false;
  }
  file.close();
  LittleFS.remove(kSettingsPath);
  return LittleFS.rename(kSettingsTempPath, kSettingsPath);
}

bool TlsCertificateManager::setEnabled(bool enabled) {
  if (enabled && !ready()) return false;
  const bool previous = enabled_;
  enabled_ = enabled;
  if (persistSettings()) return true;
  enabled_ = previous;
  return false;
}

bool TlsCertificateManager::generate(const String &hostname,
                                     const IPAddress &address) {
  if (!filesystemReady_) return false;
  Bytes certificateDer;
  Bytes privateKeyDer;
  if (!generateCertificate(hostname, address, certificateDer, privateKeyDer)) {
    return false;
  }
  if (!writeFile(kCertificateUploadPath, certificateDer.data(),
                 certificateDer.size()) ||
      !writeFile(kPrivateKeyUploadPath, privateKeyDer.data(),
                 privateKeyDer.size())) {
    LittleFS.remove(kCertificateUploadPath);
    LittleFS.remove(kPrivateKeyUploadPath);
    return false;
  }
  BearSSL::X509List *certificate = nullptr;
  BearSSL::PrivateKey *privateKey = nullptr;
  if (!loadPair(kCertificateUploadPath, kPrivateKeyUploadPath, certificate,
                privateKey)) {
    LittleFS.remove(kCertificateUploadPath);
    LittleFS.remove(kPrivateKeyUploadPath);
    return false;
  }
  LittleFS.remove(kCertificatePath);
  LittleFS.remove(kPrivateKeyPath);
  if (!LittleFS.rename(kCertificateUploadPath, kCertificatePath) ||
      !LittleFS.rename(kPrivateKeyUploadPath, kPrivateKeyPath)) {
    delete certificate;
    delete privateKey;
    return false;
  }
  delete certificate;
  delete privateKey;
  generated_ = true;
  return persistSettings();
}

bool TlsCertificateManager::beginUpload(bool certificate) {
  if (!filesystemReady_) return false;
  File &file = certificate ? certificateUpload_ : keyUpload_;
  file.close();
  const char *path = certificate ? kCertificateUploadPath : kPrivateKeyUploadPath;
  LittleFS.remove(path);
  file = LittleFS.open(path, "w");
  return static_cast<bool>(file);
}

bool TlsCertificateManager::writeUpload(bool certificate, const uint8_t *data,
                                        size_t length) {
  File &file = certificate ? certificateUpload_ : keyUpload_;
  if (!file || file.size() + length > kMaximumCredentialBytes) return false;
  return file.write(data, length) == length;
}

void TlsCertificateManager::abortUpload(bool certificate) {
  File &file = certificate ? certificateUpload_ : keyUpload_;
  file.close();
  LittleFS.remove(certificate ? kCertificateUploadPath : kPrivateKeyUploadPath);
}

bool TlsCertificateManager::finishUpload(bool certificate) {
  File &file = certificate ? certificateUpload_ : keyUpload_;
  if (!file) return false;
  const bool validSize = file.size() > 0 && file.size() <= kMaximumCredentialBytes;
  file.close();
  return validSize;
}

bool TlsCertificateManager::installUploads() {
  BearSSL::X509List *certificate = nullptr;
  BearSSL::PrivateKey *privateKey = nullptr;
  if (!loadPair(kCertificateUploadPath, kPrivateKeyUploadPath, certificate,
                privateKey)) {
    return false;
  }
  LittleFS.remove(kCertificatePath);
  LittleFS.remove(kPrivateKeyPath);
  if (!LittleFS.rename(kCertificateUploadPath, kCertificatePath) ||
      !LittleFS.rename(kPrivateKeyUploadPath, kPrivateKeyPath)) {
    delete certificate;
    delete privateKey;
    return false;
  }
  delete certificate;
  delete privateKey;
  generated_ = false;
  return persistSettings();
}

#endif
