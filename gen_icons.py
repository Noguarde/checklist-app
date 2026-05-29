import struct, zlib

def png(size, r, g, b):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    raw = b''.join(b'\x00' + bytes([r, g, b] * size) for _ in range(size))
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend

r, g, b = 0x4f, 0x46, 0xe5  # indigo #4f46e5
for size in (192, 512):
    with open(f'icon-{size}.png', 'wb') as f:
        f.write(png(size, r, g, b))
    print(f'icon-{size}.png written')
