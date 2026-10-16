"""fourcut-dessert 의 마지막 칸(우하단) 사진만 친구 사진으로 바꾼다.

레이스 테두리와 칸 위 스티커(컵케이크·곰·딸기·꽃·리본·하트)는 원본 그대로 두고 그 밑의 사진만 교체한다.
- 레이스: 테두리 띠 안에서 바깥 배경과 이어진 밝은 픽셀(flood fill) + 밝기 기반 반투명 경계
- 컵케이크 묶음·리본: macOS Vision 전경 마스크(assets/raw/fourcut/mask-*.png, scratch 에서 생성)
- 하트 2개: 분홍색 판별
사용: python3 scripts/swap-fourcut-cell.py assets/img/fourcut-dessert.webp assets/raw/fourcut/friend-cut.png <출력.png>
      → cwebp -q 82 <출력.png> -o assets/img/fourcut-friends.webp
친구 사진 원본: Figma "META 광고 포스터" v3 네컷① 네컷의 왼쪽 아래 칸(node 1970:2433)
"""
import sys
from collections import deque
from PIL import Image, ImageFilter, ImageChops

RAW = 'assets/raw/fourcut/'
src, friend_path, out = sys.argv[1:4]
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()

OUTER = (398, 470, 772, 925)   # 칸4 레이스 바깥 사각형
BAND = 18                      # 레이스 띠 두께(바닥 쪽 밝은 침구가 레이스로 잡히지 않게 얇게)
PHOTO = (404, 478, 766, 918)   # 새 사진이 깔리는 영역(레이스 밑까지)

def lum(p): return 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]

# 1) 레이스: 띠 안에서 바깥과 이어진 밝은 픽셀
x0, y0, x1, y1 = OUTER
def in_band(x, y):
    if not (x0 - 6 <= x < x1 + 6 and y0 - 6 <= y < y1 + 6): return False
    return x < x0 + BAND or x >= x1 - BAND or y < y0 + BAND or y >= y1 - BAND
light = lambda x, y: lum(px[x, y]) >= 205
seen = set()
q = deque()
for x in range(x0 - 6, x1 + 6):
    for y in (y0 - 6, y1 + 5):
        q.append((x, y))
for y in range(y0 - 6, y1 + 6):
    for x in (x0 - 6, x1 + 5):
        q.append((x, y))
while q:
    x, y = q.popleft()
    if (x, y) in seen or not in_band(x, y) or not light(x, y): continue
    seen.add((x, y))
    q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
lace = Image.new('L', (W, H), 0)
lp = lace.load()
for (x, y) in seen: lp[x, y] = 255
lace_near = lace.filter(ImageFilter.MaxFilter(3))   # 경계 1px 포함
keep = Image.new('L', (W, H), 0)
kp = keep.load(); np_ = lace_near.load()
for y in range(y0 - 6, y1 + 6):
    for x in range(x0 - 6, x1 + 6):
        if not in_band(x, y):
            continue
        if lp[x, y]:
            kp[x, y] = 255
        elif np_[x, y]:   # 경계 반투명: 밝기로 섞기
            kp[x, y] = max(0, min(255, int((lum(px[x, y]) - 175) / 30 * 255)))
# 띠 바깥(칸 밖)은 전부 원본
for y in range(H):
    for x in range(W):
        if not (x0 - 6 <= x < x1 + 6 and y0 - 6 <= y < y1 + 6): kp[x, y] = 255

# 2) 컵케이크 묶음 (cup 크롭: 원본 (610,785) 에서 175x147.5, 마스크는 4배)
cup = Image.open(RAW + 'mask-cupcake.png').convert('L').resize((175, 148), Image.LANCZOS)
cupl = Image.new('L', (W, H), 0); cupl.paste(cup, (610, 785))
cp = cupl.load()
for y in range(785, 785 + 148):        # 마스크에 섞여 들어온 머리카락(어두운 픽셀) 제외 — 곰 왼쪽 위
    for x in range(610, 610 + 175):
        if x < 760 and y < 815 and lum(px[x, y]) < 125: cp[x, y] = 0
# 3) 리본 (rt 크롭: 원본 (700,500) 에서 90x150, 마스크는 4배) — 왼쪽 머리카락 제외
bow = Image.open(RAW + 'mask-bow.png').convert('L').resize((90, 150), Image.LANCZOS)
bowl = Image.new('L', (W, H), 0); bowl.paste(bow, (700, 500))
bp = bowl.load()
for y in range(H):
    for x in range(W):
        if bp[x, y] and (not (728 <= x and 500 <= y <= 556) or lum(px[x, y]) < 120): bp[x, y] = 0
# 4) 하트 2개: 분홍 판별 후 구멍 메우기
heart = Image.new('L', (W, H), 0); hp = heart.load()
for (bx0, by0, bx1, by1) in ((725, 598, 768, 640), (438, 893, 474, 930)):
    for y in range(by0, by1):
        for x in range(bx0, bx1):
            r, g, b = px[x, y]
            if r > 215 and r - g > 40 and b - g > 0: hp[x, y] = 255
heart = heart.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))

keep = ImageChops.lighter(keep, cupl)
keep = ImageChops.lighter(keep, bowl)
keep = ImageChops.lighter(keep, heart)
keep = keep.filter(ImageFilter.GaussianBlur(0.6))

# 새 사진: 칸 비율로 얼굴 중심 크롭 + 원본 톤(따뜻하고 부드럽게)에 살짝 맞춤
fr = Image.open(friend_path).convert('RGB')
pw, ph = PHOTO[2] - PHOTO[0], PHOTO[3] - PHOTO[1]
cw = round(fr.height * pw / ph)
cx = 330
left = max(0, min(fr.width - cw, cx - cw // 2))
fr = fr.crop((left, 0, left + cw, fr.height)).resize((pw, ph), Image.LANCZOS)
fr = Image.blend(fr, Image.new('RGB', fr.size, (255, 226, 220)), 0.07)
layer = im.copy(); layer.paste(fr, PHOTO[:2])
res = Image.composite(im, layer, keep)
res.save(out)
keep.save(out.replace('.png', '-keep.png'))
print('ok', res.size)
