"""기존 갈색 B2B 움짤(공간 1안-V1·홍보 2-A) 다시 만들기 — 무료 문구 뺀 Figma 레이어(L2/)로"""
import math, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
L = os.path.join(HERE, 'L2')   # Figma 레이어 PNG(S_base·S_head·S_booth·S_peak·S_line·P_base·P_head·P_card·P_money, 1080×1350 투명)
OUT = os.path.join(HERE, 'frames')
FPS = 30
def lay(n): return Image.open(os.path.join(L, n + '.png')).convert('RGBA')
def ease_out(t): t = min(max(t, 0), 1); return 1 - (1 - t) ** 3
def prog(t, a, b): return min(max((t - a) / (b - a), 0), 1)
def place(c, layer, op=1.0, dx=0, dy=0, sc=1.0, rot=0):
    if op <= 0: return
    bb = layer.split()[3].getbbox()
    piece = layer.crop(bb)
    if sc != 1: piece = piece.resize((max(1, round(piece.width * sc)), max(1, round(piece.height * sc))), Image.LANCZOS)
    if rot: piece = piece.rotate(rot, resample=Image.BICUBIC, expand=True)
    if op < 1: piece.putalpha(piece.split()[3].point(lambda v: int(v * op)))
    cx, cy = (bb[0] + bb[2]) / 2 + dx, (bb[1] + bb[3]) / 2 + dy
    c.alpha_composite(piece, (round(cx - piece.width / 2), round(cy - piece.height / 2)))
def render(name, total, draw):
    d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
    for i in range(round(total * FPS)): draw(i / FPS).convert('RGB').save(os.path.join(d, '%03d.png' % i))
def space():
    base, head, booth, peak, line = lay('S_base'), lay('S_head'), lay('S_booth'), lay('S_peak'), lay('S_line')
    def draw(t):
        c = base.copy()
        p = ease_out(prog(t, 0.1, 0.7)); place(c, head, p, dy=(1 - p) * 20)
        p = ease_out(prog(t, 0.8, 1.25)); place(c, booth, p, dx=-(1 - p) * 70)
        p = ease_out(prog(t, 1.15, 1.6)); place(c, peak, p, dx=(1 - p) * 70)
        p = ease_out(prog(t, 1.7, 2.05)); place(c, line, p, dy=(1 - p) * 14)
        return c
    render('brown_space', 4.0, draw)
def promote():
    base, head, card, money = lay('P_base'), lay('P_head'), lay('P_card'), lay('P_money')
    def draw(t):
        c = base.copy()
        p = ease_out(prog(t, 0.1, 0.7)); place(c, head, p, dy=(1 - p) * 20)
        p = ease_out(prog(t, 0.8, 1.45)); place(c, card, p, sc=0.88 + 0.12 * p, rot=-4 * (1 - p), dy=(1 - p) * 40)
        p = ease_out(prog(t, 1.6, 1.95)); place(c, money, p, dy=(1 - p) * 14)
        return c
    render('brown_promote', 4.0, draw)
which = sys.argv[1:] or ['space', 'promote']
if 'space' in which: space()
if 'promote' in which: promote()
