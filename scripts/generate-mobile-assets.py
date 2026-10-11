"""Generate the project's simple house mark using only Python's standard library."""
from pathlib import Path
import struct
import zlib

def png(size):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            a, b = x / size, y / size
            roof = .2 < b < .5 and abs(a - .5) < (b - .2) * 1.15
            walls = .29 < a < .71 and .47 < b < .78
            door = .46 < a < .56 and .60 < b < .78
            row.extend((37, 99, 235, 255) if (roof or walls) and not door else (255, 255, 255, 255))
        rows.append(bytes(row))
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b'')

if __name__ == '__main__':
    folder = Path(__file__).resolve().parents[1] / 'mobile' / 'assets'
    folder.mkdir(exist_ok=True)
    for name, size in [('icon.png', 1024), ('adaptive-icon.png', 1024), ('splash-icon.png', 512), ('favicon.png', 48)]:
        (folder / name).write_bytes(png(size))
