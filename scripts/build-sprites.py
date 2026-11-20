"""PokeAPI のスプライト 1..1025.png を 1 枚のスプライトシート sprites.png にまとめる。

artifact などの外部画像を読めない環境でも表示できるように、画像はこの 1 ファイルだけにする。
usage: python3 scripts/build-sprites.py <sprite-dir>
  <sprite-dir> には https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png を置いておく
"""
import sys
from pathlib import Path
from PIL import Image

N, CELL, COLS = 1025, 96, 32
src = Path(sys.argv[1])
rows = (N + COLS - 1) // COLS
sheet = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))
for i in range(N):
    im = Image.open(src / f"{i + 1}.png").convert("RGBA")
    if im.size != (CELL, CELL):
        im = im.resize((CELL, CELL), Image.NEAREST)
    sheet.paste(im, ((i % COLS) * CELL, (i // COLS) * CELL))
out = Path(__file__).resolve().parent.parent / "sprites.png"
sheet.save(out, optimize=True)
print(f"wrote {out} ({sheet.size[0]}x{sheet.size[1]}, {out.stat().st_size // 1024} KiB)")
