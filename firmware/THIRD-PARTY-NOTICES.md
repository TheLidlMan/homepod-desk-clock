# Attribution

`hap_native.c` adapts BearSSL's fixed-work square/multiply scheduling to call
ESP8266 cooperative yields. Copyright (c) 2016 Thomas Pornin; the complete MIT
notice is included in that source and BEARSSL-LICENSE.txt. The separately
compiled SDK BearSSL files retain their original notices. Pin the existing
ESP8266 Arduino framework because this port uses its internal i15 API.

The observer sequence and generated plist/protobuf templates were derived from
[pyatv 0.18.0](https://github.com/postlund/pyatv), an MIT-licensed protocol
implementation. No Python code or pyatv runtime is linked into the observer.
Schema/template review should retain this attribution.

[music-assistant/airplay-cli](https://github.com/music-assistant/airplay-cli)
(commit 8e79242996b7ef52352ee49d390e6db434bf88a6, Apache-2.0) and
[Arduino-HomeKit-ESP8266](https://github.com/Mixiaoxiao/Arduino-HomeKit-ESP8266)
were inspected as references only. Neither runtime is copied or linked into
this prototype. Their checkouts are research scratch and are not required for
building or redistributing the observer.

TJpgDec R0.03 (ChaN, 2021) is vendored from
[bodmer/TJpg_Decoder](https://github.com/Bodmer/TJpg_Decoder), commit
`71bfc2607b6963ee3334ff6f601345c5d2b7a8da`. Its copyright and redistribution
terms are retained in `src/codec/tjpgd.c`; configuration uses RGB565, the
3,100-byte decoder pool, and no large lookup tables. The JPEG-to-MDI2 adapter
uses a heap-owned 16-row stripe and sequential output, never a whole image.
