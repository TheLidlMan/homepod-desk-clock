"""MDI2 image codec tests."""

import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "image_codec",
    Path(__file__).parents[1]
    / "custom_components/mini_display/image_codec.py",
)
codec = importlib.util.module_from_spec(spec)
spec.loader.exec_module(codec)


class ImageCodecTests(unittest.TestCase):
    @staticmethod
    def animated(frames):
        payloads = [codec.encode_rgb565(1, 1, pixel)[8:] for _, pixel in frames]
        header = bytearray(b"MDA1\x01\x00\x01\x00")
        header.extend(len(frames).to_bytes(2, "little"))
        header.extend(b"\x00\x00")
        header.extend(sum(duration for duration, _ in frames).to_bytes(4, "little"))
        offset = 16 + len(frames) * 10
        for (duration, _), payload in zip(frames, payloads, strict=True):
            header.extend(duration.to_bytes(2, "little"))
            header.extend(offset.to_bytes(4, "little"))
            header.extend(len(payload).to_bytes(4, "little"))
            offset += len(payload)
        return bytes(header) + b"".join(payloads)

    def test_round_trip_mixed_packets(self):
        pixels = b"\x00\xf8" * 140 + b"\xe0\x07\x1f\x00\xff\xff"
        encoded = codec.encode_rgb565(143, 1, pixels)

        width, height, decoded = codec.decode_rgb565(encoded)

        self.assertEqual(encoded[:4], b"MDI2")
        self.assertEqual((width, height), (143, 1))
        self.assertEqual(decoded, pixels)
        self.assertLess(len(encoded), len(pixels))

    def test_literal_worst_case_stays_bounded(self):
        pixels = b"".join(value.to_bytes(2, "little") for value in range(256))
        encoded = codec.encode_rgb565(16, 16, pixels)

        self.assertLessEqual(len(encoded), 8 + len(pixels) + 16 * 3)
        self.assertEqual(codec.decode_rgb565(encoded)[2], pixels)

    def test_rejects_old_and_malformed_images(self):
        with self.assertRaises(codec.ImageCodecError):
            codec.decode_rgb565(b"MDI1\x01\x00\x01\x00\x80\x00\x00")
        with self.assertRaises(codec.ImageCodecError):
            codec.decode_rgb565(b"MDI2\x01\x00\x01\x00\x81\x00\x00")
        with self.assertRaises(codec.ImageCodecError):
            codec.decode_rgb565(b"MDI2\x01\x00\x01\x00\x00\x00")

    def test_animated_frames_and_metadata(self):
        content = self.animated([(100, b"\x00\xf8"), (250, b"\xe0\x07")])

        info = codec.validate_image(content)

        self.assertTrue(info.animated)
        self.assertEqual((info.width, info.height, info.frame_count), (1, 1, 2))
        self.assertEqual(info.duration_ms, 350)
        self.assertEqual(codec.decode_rgb565(content, 0)[2], b"\x00\xf8")
        self.assertEqual(codec.decode_rgb565(content, 1)[2], b"\xe0\x07")

        upgraded = codec.upgrade_animated_image(content)
        upgraded_info = codec.validate_image(upgraded)
        self.assertEqual(upgraded[:4], b"MDA2")
        self.assertEqual(upgraded_info.frame_record_bytes, 18)
        self.assertEqual(codec.decode_rgb565(upgraded, 1)[2], b"\xe0\x07")

    def test_rejects_broken_animated_directory(self):
        content = bytearray(self.animated([(100, b"\x00\xf8"), (100, b"\xe0\x07")]))
        content[18:22] = (999).to_bytes(4, "little")

        with self.assertRaises(codec.ImageCodecError):
            codec.validate_image(bytes(content))


if __name__ == "__main__":
    unittest.main()
