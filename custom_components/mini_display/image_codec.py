"""Mini Display RLE image codec."""

from __future__ import annotations

from typing import NamedTuple

MAGIC = b"MDI2"
ANIMATED_MAGIC_V1 = b"MDA1"
ANIMATED_MAGIC = b"MDA2"
ANIMATED_MAGIC_V3 = b"MDA3"
HEADER_BYTES = 8
ANIMATED_HEADER_BYTES = 16
ANIMATED_FRAME_RECORD_BYTES_V1 = 10
ANIMATED_FRAME_RECORD_BYTES = 18
ANIMATED_DAMAGE_BAND_HEIGHT = 8
MAX_ANIMATED_FRAMES = 120
MAX_DIMENSION = 1024
MAX_PIXELS = MAX_DIMENSION * MAX_DIMENSION
MAX_ENCODED_BYTES = (
    HEADER_BYTES
    + MAX_PIXELS * 2
    + MAX_DIMENSION * (2 + (MAX_DIMENSION + 127) // 128)
)


class ImageCodecError(ValueError):
    """A Mini Display image is malformed."""


class ImageInfo(NamedTuple):
    width: int
    height: int
    frame_count: int = 1
    duration_ms: int = 0
    frame_record_bytes: int = 0

    @property
    def animated(self) -> bool:
        return self.frame_count > 1


def encode_rgb565(width: int, height: int, pixels: bytes) -> bytes:
    """Encode little-endian RGB565 pixels using packet RLE."""
    if (
        not 1 <= width <= MAX_DIMENSION
        or not 1 <= height <= MAX_DIMENSION
        or len(pixels) != width * height * 2
    ):
        raise ImageCodecError("Invalid image dimensions or pixel data")
    output = bytearray(MAGIC)
    output.extend(width.to_bytes(2, "little"))
    output.extend(height.to_bytes(2, "little"))
    def equal(left: int, right: int) -> bool:
        left *= 2
        right *= 2
        return pixels[left : left + 2] == pixels[right : right + 2]

    for row in range(height):
        row_end = (row + 1) * width
        source = row * width
        encoded_row = bytearray()
        while source < row_end:
            run = 1
            while (
                run < 128
                and source + run < row_end
                and equal(source, source + run)
            ):
                run += 1
            if run >= 2:
                encoded_row.append(0x80 | (run - 1))
                encoded_row.extend(pixels[source * 2 : source * 2 + 2])
                source += run
                continue
            literal_start = source
            source += 1
            while source - literal_start < 128 and source < row_end:
                run = 1
                while (
                    run < 2
                    and source + run < row_end
                    and equal(source, source + run)
                ):
                    run += 1
                if run >= 2:
                    break
                source += 1
            encoded_row.append(source - literal_start - 1)
            encoded_row.extend(pixels[literal_start * 2 : source * 2])
        output.extend(len(encoded_row).to_bytes(2, "little"))
        output.extend(encoded_row)
    return bytes(output)


def _decode_frame(content: bytes, width: int, height: int) -> bytes:
    """Decode one headerless row-RLE frame."""
    if len(content) < 3:
        raise ImageCodecError("Unsupported image format")
    expected = width * height * 2
    pixels = bytearray()
    offset = 0
    for _ in range(height):
        if offset + 2 > len(content):
            raise ImageCodecError("Missing image row")
        row_bytes = int.from_bytes(content[offset : offset + 2], "little")
        offset += 2
        row_end = offset + row_bytes
        if row_bytes == 0 or row_end > len(content):
            raise ImageCodecError("Invalid image row size")
        row_pixels = 0
        while offset < row_end and row_pixels < width:
            control = content[offset]
            offset += 1
            count = (control & 0x7F) + 1
            byte_count = count * 2
            if control & 0x80:
                if offset + 2 > row_end:
                    raise ImageCodecError("Truncated image run")
                pixels.extend(content[offset : offset + 2] * count)
                offset += 2
            else:
                if offset + byte_count > row_end:
                    raise ImageCodecError("Truncated image literals")
                pixels.extend(content[offset : offset + byte_count])
                offset += byte_count
            row_pixels += count
            if row_pixels > width:
                raise ImageCodecError("Image row contains too many pixels")
        if offset != row_end or row_pixels != width:
            raise ImageCodecError("Image row width does not match its dimensions")
    if offset != len(content) or len(pixels) != expected:
        raise ImageCodecError("Image pixel count does not match its dimensions")
    return bytes(pixels)


def inspect_image(content: bytes) -> ImageInfo:
    """Validate image container metadata without decoding every frame."""
    if len(content) < HEADER_BYTES + 3 or content[:4] not in {
        MAGIC,
        ANIMATED_MAGIC_V1,
        ANIMATED_MAGIC_V3,
        ANIMATED_MAGIC,
    }:
        raise ImageCodecError("Unsupported image format")
    width = int.from_bytes(content[4:6], "little")
    height = int.from_bytes(content[6:8], "little")
    if not 1 <= width <= MAX_DIMENSION or not 1 <= height <= MAX_DIMENSION:
        raise ImageCodecError("Invalid image dimensions")
    if content[:4] == MAGIC:
        return ImageInfo(width, height)
    if content[:4] == ANIMATED_MAGIC_V3:
        record_bytes = ANIMATED_FRAME_RECORD_BYTES + 2 * (
            (height + ANIMATED_DAMAGE_BAND_HEIGHT - 1)
            // ANIMATED_DAMAGE_BAND_HEIGHT
        )
    elif content[:4] == ANIMATED_MAGIC:
        record_bytes = ANIMATED_FRAME_RECORD_BYTES
    else:
        record_bytes = ANIMATED_FRAME_RECORD_BYTES_V1
    if len(content) < ANIMATED_HEADER_BYTES + 2 * record_bytes + 3:
        raise ImageCodecError("Animated image header is truncated")
    frame_count = int.from_bytes(content[8:10], "little")
    duration_ms = int.from_bytes(content[12:16], "little")
    if not 2 <= frame_count <= MAX_ANIMATED_FRAMES or duration_ms <= 0:
        raise ImageCodecError("Invalid animated image metadata")
    if ANIMATED_HEADER_BYTES + frame_count * record_bytes >= len(content):
        raise ImageCodecError("Animated image directory is truncated")
    return ImageInfo(width, height, frame_count, duration_ms, record_bytes)


def _animated_frame(content: bytes, info: ImageInfo, index: int) -> bytes:
    if not 0 <= index < info.frame_count:
        raise ImageCodecError("Invalid animated image frame")
    record = ANIMATED_HEADER_BYTES + index * info.frame_record_bytes
    duration_ms = int.from_bytes(content[record : record + 2], "little")
    offset = int.from_bytes(content[record + 2 : record + 6], "little")
    length = int.from_bytes(content[record + 6 : record + 10], "little")
    if not 50 <= duration_ms <= 60000 or length < 3 or offset > len(content) or length > len(content) - offset:
        raise ImageCodecError("Invalid animated image frame")
    if info.frame_record_bytes >= ANIMATED_FRAME_RECORD_BYTES:
        x = int.from_bytes(content[record + 10 : record + 12], "little")
        y = int.from_bytes(content[record + 12 : record + 14], "little")
        width = int.from_bytes(content[record + 14 : record + 16], "little")
        height = int.from_bytes(content[record + 16 : record + 18], "little")
        if (
            width <= 0
            or height <= 0
            or x + width > info.width
            or y + height > info.height
        ):
            raise ImageCodecError("Invalid animated image damage bounds")
    if info.frame_record_bytes > ANIMATED_FRAME_RECORD_BYTES:
        band_count = (
            info.height + ANIMATED_DAMAGE_BAND_HEIGHT - 1
        ) // ANIMATED_DAMAGE_BAND_HEIGHT
        for band in range(band_count):
            left = content[record + ANIMATED_FRAME_RECORD_BYTES + band * 2]
            right = content[record + ANIMATED_FRAME_RECORD_BYTES + band * 2 + 1]
            if (left, right) == (0xFF, 0):
                continue
            if left >= right or right > info.width:
                raise ImageCodecError("Invalid animated image damage band")
    return content[offset : offset + length]


def decode_rgb565(content: bytes, frame_index: int = 0) -> tuple[int, int, bytes]:
    """Validate and decode one static or animated image frame."""
    info = inspect_image(content)
    if info.animated:
        frame = _animated_frame(content, info, frame_index)
    elif frame_index == 0:
        frame = content[HEADER_BYTES:]
    else:
        raise ImageCodecError("Invalid image frame")
    pixels = _decode_frame(frame, info.width, info.height)
    return info.width, info.height, pixels


def validate_image(content: bytes) -> ImageInfo:
    """Validate every frame and contiguous payload boundary."""
    info = inspect_image(content)
    if not info.animated:
        decode_rgb565(content)
        return info
    expected_offset = ANIMATED_HEADER_BYTES + info.frame_count * info.frame_record_bytes
    duration_ms = 0
    for index in range(info.frame_count):
        record = ANIMATED_HEADER_BYTES + index * info.frame_record_bytes
        frame_duration = int.from_bytes(content[record : record + 2], "little")
        frame_offset = int.from_bytes(content[record + 2 : record + 6], "little")
        frame = _animated_frame(content, info, index)
        if frame_offset != expected_offset:
            raise ImageCodecError("Animated image frames must be contiguous")
        _decode_frame(frame, info.width, info.height)
        expected_offset += len(frame)
        duration_ms += frame_duration
    if expected_offset != len(content) or duration_ms != info.duration_ms:
        raise ImageCodecError("Animated image payload does not match metadata")
    return info


def upgrade_animated_image(content: bytes) -> bytes:
    """Add row-band damage bounds to older animated images."""
    info = validate_image(content)
    if not info.animated or content[:4] == ANIMATED_MAGIC:
        return content
    source_frames: list[tuple[int, bytes, bytes]] = []
    for index in range(info.frame_count):
        record = ANIMATED_HEADER_BYTES + index * info.frame_record_bytes
        duration = int.from_bytes(content[record : record + 2], "little")
        payload = _animated_frame(content, info, index)
        pixels = _decode_frame(payload, info.width, info.height)
        source_frames.append((duration, payload, pixels))
    frames: list[tuple[int, bytes, tuple[int, int, int, int]]] = []
    for index, (duration, payload, pixels) in enumerate(source_frames):
        previous = source_frames[index - 1][2]
        left, top = info.width, info.height
        right = bottom = 0
        for pixel in range(info.width * info.height):
            byte = pixel * 2
            if pixels[byte : byte + 2] == previous[byte : byte + 2]:
                continue
            x = pixel % info.width
            y = pixel // info.width
            left = min(left, x)
            top = min(top, y)
            right = max(right, x + 1)
            bottom = max(bottom, y + 1)
        bounds = (
            left if right else 0,
            top if bottom else 0,
            max(1, right - left),
            max(1, bottom - top),
        )
        frames.append((duration, payload, bounds))
    output = bytearray(ANIMATED_MAGIC)
    output.extend(info.width.to_bytes(2, "little"))
    output.extend(info.height.to_bytes(2, "little"))
    output.extend(info.frame_count.to_bytes(2, "little"))
    output.extend(b"\x00\x00")
    output.extend(info.duration_ms.to_bytes(4, "little"))
    offset = ANIMATED_HEADER_BYTES + info.frame_count * ANIMATED_FRAME_RECORD_BYTES
    for duration, payload, bounds in frames:
        output.extend(duration.to_bytes(2, "little"))
        output.extend(offset.to_bytes(4, "little"))
        output.extend(len(payload).to_bytes(4, "little"))
        for value in bounds:
            output.extend(value.to_bytes(2, "little"))
        offset += len(payload)
    for _, payload, _ in frames:
        output.extend(payload)
    return bytes(output)
