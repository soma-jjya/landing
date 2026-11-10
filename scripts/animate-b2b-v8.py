"""B2B v8 포스터 움짤: Figma 레이어(투명 PNG) + 고흥 프레임 칸 채우기 애니메이션"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
L = os.path.join(HERE, 'L')
P = os.path.join(HERE, '..', 'b2bposter')
OUT = os.path.join(HERE, 'frames')
W, H = 1080, 1350
FPS = 15

def lay(n): return Image.open(os.path.join(L, n + '.png')).convert('RGBA')

# ---------- 고흥 프레임 칸 상태 ----------
fr = Image.open(os.path.join(P, 'goheung.png')).convert('RGBA'); FW, FH = fr.size
grid = Image.open(os.path.join(P, 'yuja-grid.png')).convert('RGB'); gw, gh = grid.size
halves = [(0, 0, 476, 635), (484, 0, gw, 635), (0, 643, 476, gh), (484, 643, gw, gh)]
cells = [(145, 184, 521, 706), (559, 184, 935, 706), (143, 743, 522, 1303), (560, 743, 942, 1303)]
rgb = fr.convert('RGB')
masks = []
for (x0, y0, x1, y1) in cells:
    tmp = rgb.copy(); ImageDraw.floodfill(tmp, ((x0 + x1) // 2, (y0 + y1) // 2), (255, 0, 255), thresh=40)
    m = Image.new('L', (FW, FH), 0); mp = m.load(); px = tmp.load()
    for y in range(y0 - 20, y1 + 20):
        for x in range(x0 - 20, x1 + 20):
            if px[x, y] == (255, 0, 255): mp[x, y] = 255
    masks.append(m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1)))
allmask = masks[0]
for m in masks[1:]: allmask = Image.composite(m, allmask, m)
fa = fr.split()[3]; fa = Image.composite(Image.new('L', (FW, FH), 0), fa, allmask)
frame_cut = fr.copy(); frame_cut.putalpha(fa)
photos = []
for (x0, y0, x1, y1), src in zip(cells, halves):
    pad = 12; w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    photos.append((ImageOps.fit(grid.crop(src), (w, h), Image.LANCZOS, centering=(0.5, 0.4)), (x0 - pad, y0 - pad)))

_cache = {}
def fourcut(fill, size):
    """fill: 칸별 (보임 0~1, 플래시 0~1)"""
    key = (tuple((round(a, 2), round(f, 2)) for a, f in fill), size)
    if key in _cache: return _cache[key]
    base = Image.new('RGBA', (FW, FH), (255, 255, 255, 255))
    for (ph, pos), (a, fl) in zip(photos, fill):
        if a <= 0: continue
        layer = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); layer.paste(ph.convert('RGBA'), pos)
        if fl > 0:
            wh = Image.new('RGBA', (FW, FH), (255, 255, 255, int(255 * fl)))
            layer = Image.alpha_composite(layer, Image.composite(wh, Image.new('RGBA', (FW, FH), (0, 0, 0, 0)), layer.split()[3]))
        if a < 1: layer.putalpha(layer.split()[3].point(lambda v: int(v * a)))
        base = Image.alpha_composite(base, layer)
    out = Image.alpha_composite(base, frame_cut).resize(size, Image.LANCZOS)
    _cache[key] = out
    return out

# ---------- 공통 ----------
def ease_out(t): t = min(max(t, 0), 1); return 1 - (1 - t) ** 3
def ease_back(t, s=1.9):
    t = min(max(t, 0), 1); t -= 1; return 1 + (s + 1) * t ** 3 + s * t ** 2
def prog(t, a, b): return min(max((t - a) / (b - a), 0), 1)

def place(canvas, layer, op=1.0, dx=0, dy=0, sc=1.0):
    if op <= 0: return
    bb = layer.split()[3].getbbox()
    if not bb: return
    piece = layer.crop(bb)
    if sc != 1:
        piece = piece.resize((max(1, round(piece.width * sc)), max(1, round(piece.height * sc))), Image.LANCZOS)
    if op < 1: piece.putalpha(piece.split()[3].point(lambda v: int(v * op)))
    cx, cy = (bb[0] + bb[2]) / 2 + dx, (bb[1] + bb[3]) / 2 + dy
    canvas.alpha_composite(piece, (round(cx - piece.width / 2), round(cy - piece.height / 2)))

def under_text(layer, base):
    """형광펜은 글자 밑: 배경이 어두운(글자) 곳에서는 가린다"""
    lum = base.convert('L').point(lambda v: max(0, min(255, int((v - 40) * 255 / 160))))
    a = Image.composite(layer.split()[3], Image.new('L', layer.size, 0), lum)
    out = layer.copy(); out.putalpha(Image.eval(Image.merge('L', [a]), lambda v: v)); return out

def wipe(canvas, layer, p):
    if p <= 0: return
    bb = layer.split()[3].getbbox()
    x = bb[0] + (bb[2] - bb[0]) * p
    piece = layer.crop((bb[0], bb[1], round(x), bb[3]))
    canvas.alpha_composite(piece, (bb[0], bb[1]))

def shadowed(img, blur=17, off=(0, 14), color=(64, 38, 0), alpha=0.22, margin=60):
    w, h = img.size
    out = Image.new('RGBA', (w + 2 * margin, h + 2 * margin), (0, 0, 0, 0))
    sh = Image.new('RGBA', out.size, color + (0,))
    a = Image.new('L', out.size, 0); a.paste(img.split()[3].point(lambda v: int(v * alpha)), (margin + off[0], margin + off[1]))
    sh.putalpha(a.filter(ImageFilter.GaussianBlur(blur)))
    out = Image.alpha_composite(out, sh); out.alpha_composite(img, (margin, margin))
    return out

def put_center(canvas, img, cx, cy, rot=0, sc=1.0, op=1.0):
    if op <= 0: return
    if sc != 1: img = img.resize((max(1, round(img.width * sc)), max(1, round(img.height * sc))), Image.LANCZOS)
    if rot: img = img.rotate(rot, resample=Image.BICUBIC, expand=True)
    if op < 1: img = img.copy(); img.putalpha(img.split()[3].point(lambda v: int(v * op)))
    canvas.alpha_composite(img, (round(cx - img.width / 2), round(cy - img.height / 2)))

def cell_states(t, t0, step):
    """칸이 하나씩 채워짐: 칸 k 는 t0+k*step 에 찰칵"""
    st = []
    for k in range(4):
        tk = t0 + k * step
        a = prog(t, tk, tk + 0.12)
        fl = (1 - prog(t, tk, tk + 0.35)) if t >= tk else 0
        st.append((a, fl))
    return st

def render(name, total, draw):
    d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
    n = round(total * FPS)
    for i in range(n):
        t = i / FPS
        draw(t).convert('RGB').save(os.path.join(d, '%03d.png' % i))
    print(name, n)

# ---------- A 공간 ----------
def make_space():
    base, hl, badge = lay('C_base'), lay('C_hl'), lay('C_badge'); hl = under_text(hl, base)
    booth, strike, arrow, peak = lay('C_booth'), lay('C_strike'), lay('C_arrow'), lay('C_peak')
    line, sub, cta = lay('C_line'), lay('C_sub'), lay('C_cta')
    tape = Image.new('RGBA', (150, 40), (255, 242, 209, 224))
    def draw(t):
        c = base.copy()
        wipe(c, hl, ease_out(prog(t, 0.15, 0.7)))
        p = ease_out(prog(t, 0.5, 0.9)); place(c, badge, p, dy=(1 - p) * 24)
        # 사진: 떨어지듯 들어옴
        p = prog(t, 0.8, 1.35)
        if p > 0:
            img = fourcut(cell_states(t, 1.7, 0.5), (372, 496))
            bordered = Image.new('RGBA', (388, 512), (255, 255, 255, 255)); bordered.alpha_composite(img, (8, 8))
            s = 1 + 0.12 * (1 - ease_back(p, 1.4))
            put_center(c, shadowed(bordered), 246.2, 936.4 - (1 - ease_out(p)) * 40, rot=-4 - 5 * (1 - ease_out(p)), sc=s, op=ease_out(p))
        p = ease_back(prog(t, 1.3, 1.6));
        if p > 0: put_center(c, tape, 266.5, 663.4, rot=5, sc=max(p, 0.01), op=min(1, p))
        p = ease_out(prog(t, 3.9, 4.3)); place(c, booth, p, dx=(1 - p) * 60)
        wipe(c, strike, ease_out(prog(t, 4.35, 4.65)))
        p = ease_out(prog(t, 4.65, 4.9)); place(c, arrow, p, dy=(1 - p) * -20)
        p = prog(t, 4.9, 5.3); place(c, peak, min(1, p * 2), sc=0.85 + 0.15 * ease_back(p))
        p = ease_out(prog(t, 5.35, 5.7)); place(c, line, p, dy=(1 - p) * 16)
        p = ease_out(prog(t, 5.55, 5.9)); place(c, sub, p, dy=(1 - p) * 16)
        q = prog(t, 6.0, 6.6); place(c, cta, 1, sc=1 + 0.045 * math.sin(q * math.pi * 2) * (1 - q * 0.3) if q > 0 else 1)
        return c
    render('space', 8.5, draw)

# ---------- B 홍보 ----------
def make_promote():
    base, hl, lede, pin = lay('D_base'), lay('D_hl'), lay('D_lede'), lay('D_pin'); hl = under_text(hl, base)
    bubble, n1, n2, info, cta = lay('D_bubble'), lay('D_num1'), lay('D_num2'), lay('D_info'), lay('D_cta')
    post = lay('D_post')
    def draw(t):
        c = base.copy()
        wipe(c, hl, ease_out(prog(t, 0.15, 0.7)))
        p = ease_out(prog(t, 0.5, 0.9)); place(c, lede, p, dy=(1 - p) * 18)
        p = prog(t, 0.9, 1.45)
        if p > 0:
            card = post.copy(); card.alpha_composite(fourcut(cell_states(t, 1.9, 0.5), (336, 448)), (24, 62))
            put_center(c, shadowed(card), 256.0, 911.6 + (1 - ease_out(p)) * 120, rot=-3, op=ease_out(p))
        p = prog(t, 1.4, 1.7); place(c, pin, min(1, p * 2), sc=0.8 + 0.2 * ease_back(p))
        p = prog(t, 4.05, 4.4); place(c, bubble, min(1, p * 2), sc=0.6 + 0.4 * ease_back(p, 2.4))
        p = ease_out(prog(t, 4.5, 4.9)); place(c, n1, p, dx=(1 - p) * 50)
        p = ease_out(prog(t, 4.75, 5.15)); place(c, n2, p, dx=(1 - p) * 50)
        p = ease_out(prog(t, 5.2, 5.55)); place(c, info, p, dy=(1 - p) * 16)
        q = prog(t, 5.8, 6.4); place(c, cta, 1, sc=1 + 0.045 * math.sin(q * math.pi * 2) * (1 - q * 0.3) if q > 0 else 1)
        return c
    render('promote', 8.5, draw)

which = sys.argv[1:] or ['space', 'promote']
if 'space' in which: make_space()
if 'promote' in which: make_promote()
