"""/b2b/ 이미지 만들기 (2026-11-07)

1) 새 고흥유자축제 프레임(Figma 📷 Peakpic_Design node 92:16258 의 92:16251·92:16217) — 칸이 회색(72,72,72)으로 칠해져 있어 흰 칸으로 바꾼다
2) 앱 프레임(assets/raw/frames/*.png, 칸은 투명) 밑에 같은 모델 2×2 사진(Figma AI 생성 한 장, assets/raw/b2b/model-2026-11/)을 칸마다 잘라 깐다
사용: python3 scripts/compose-b2b.py <출력폴더>   → 출력 PNG 를 cwebp -q 82 로 assets/img/ 에
"""
import os
import sys
from PIL import Image, ImageOps

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
RAW = 'assets/raw/b2b/'

# 1) 고흥 프레임: 회색 칸 → 흰색 (경계 안티앨리어싱까지 섞이도록 거리 기반)
for name in ('goheung-cat', 'goheung-classic'):
    im = Image.open(RAW + 'goheung-2026-11/%s.png' % name).convert('RGB')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            d = max(abs(r - 72), abs(g - 72), abs(b - 72))
            if d <= 6:
                px[x, y] = (255, 255, 255)
    im.resize((480, 640), Image.LANCZOS).save(os.path.join(out, 'frame-%s.png' % name))

# 2) 프레임 + 모델 네 컷 (칸은 프레임 PNG 의 투명 영역, 측정값)
def fill(frame_name, grid_name, cells, out_name, gap=8):
    frame = Image.open('assets/raw/frames/%s.png' % frame_name).convert('RGBA')
    grid = Image.open(RAW + 'model-2026-11/%s.png' % grid_name).convert('RGB')
    gw, gh = grid.size
    halves = [(0, 0, gw // 2 - gap, gh // 2 - gap), (gw // 2 + gap, 0, gw, gh // 2 - gap),
              (0, gh // 2 + gap, gw // 2 - gap, gh), (gw // 2 + gap, gh // 2 + gap, gw, gh)]
    base = Image.new('RGBA', frame.size, (255, 255, 255, 255))
    for (x0, y0, x1, y1), src in zip(cells, halves):
        pad = 6   # 프레임 테두리 밑까지 깔아 틈이 안 보이게
        w, h = x1 - x0 + pad * 2, y1 - y0 + pad * 2
        photo = ImageOps.fit(grid.crop(src), (w, h), Image.LANCZOS, centering=(0.5, 0.35))
        base.paste(photo, (x0 - pad, y0 - pad))
    base.alpha_composite(frame)
    base.convert('RGB').resize((480, round(480 * frame.height / frame.width)), Image.LANCZOS).save(os.path.join(out, out_name))

# 디저트 + 흑발 모델(1차, 2026-11-07 오후 — 보관) / 빈티지 필름 + 흑발 모델(v3 gpt-image-2.5-sunburst, 랜딩 사용 — 이전 vintage-grid-natural 은 평범하다는 피드백으로 보관)
fill('frame-dessert', 'dessert-grid', [(52, 48, 509, 633), (553, 48, 1009, 633), (52, 690, 509, 1280), (553, 690, 1009, 1280)], 'fourcut-dessert-model.png')
fill('frame-vintage', 'vintage-grid-gpt-v3', [(89, 100, 677, 888), (752, 100, 1342, 888), (89, 963, 677, 1732), (752, 963, 1342, 1732)], 'fourcut-vintage-model.png')
print('ok')


# 3) 예시 컨베이어(2026-11-23, #examples 2행): 프레임별로 다른 모델 2×2 를 깐 완성 네컷을 더 만든다.
#    칸 자리는 손으로 재지 않고 찾는다 — 앱 프레임은 투명 칸, 고흥 프레임은 회색(72,72,72) 칸. 큰 덩어리 4개를 위→아래, 왼→오른 순으로.
def find_cells(mask):
    from collections import deque
    h, w = len(mask), len(mask[0])
    seen = [[False] * w for _ in range(h)]
    blobs = []
    for sy in range(0, h, 4):
        for sx in range(0, w, 4):
            if not mask[sy][sx] or seen[sy][sx]:
                continue
            q = deque([(sy, sx)]); seen[sy][sx] = True
            x0 = x1 = sx; y0 = y1 = sy; n = 0
            while q:
                y, x = q.popleft(); n += 1
                x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True; q.append((ny, nx))
            blobs.append((n, (x0, y0, x1 + 1, y1 + 1)))
    boxes = [b for _, b in sorted(blobs, reverse=True)[:4]]
    boxes.sort(key=lambda b: (b[1] // 100, b[0]))
    return boxes


def fill_auto(frame, grid_path, out_name, centering=(0.5, 0.35), gap=8):
    """frame: RGBA(칸이 투명). grid_path: 같은 사람 2×2 사진 한 장."""
    a = frame.getchannel('A').load()
    mask = [[a[x, y] < 20 for x in range(frame.width)] for y in range(frame.height)]
    cells = find_cells(mask)
    grid = Image.open(grid_path).convert('RGB')
    gw, gh = grid.size
    halves = [(0, 0, gw // 2 - gap, gh // 2 - gap), (gw // 2 + gap, 0, gw, gh // 2 - gap),
              (0, gh // 2 + gap, gw // 2 - gap, gh), (gw // 2 + gap, gh // 2 + gap, gw, gh)]
    base = Image.new('RGBA', frame.size, (255, 255, 255, 255))
    for (x0, y0, x1, y1), src in zip(cells, halves):
        pad = 6
        photo = ImageOps.fit(grid.crop(src), (x1 - x0 + pad * 2, y1 - y0 + pad * 2), Image.LANCZOS, centering=centering)
        base.paste(photo, (x0 - pad, y0 - pad))
    base.alpha_composite(frame)
    base.convert('RGB').resize((480, round(480 * frame.height / frame.width)), Image.LANCZOS).save(os.path.join(out, out_name))


def goheung_cutout(name):
    """고흥 프레임의 회색 칸을 투명으로(가장자리는 회색과의 거리만큼 반투명) — 칸 위 스티커는 그대로 남는다."""
    im = Image.open(RAW + 'goheung-2026-11/%s.png' % name).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, _ = px[x, y]
            d = max(abs(r - 72), abs(g - 72), abs(b - 72))
            if d <= 6:
                px[x, y] = (r, g, b, 0)
            elif d < 24:
                px[x, y] = (r, g, b, round(255 * (d - 6) / 18))
    return im


def app_frame(name):
    return Image.open('assets/raw/frames/%s.png' % name).convert('RGBA')


M = RAW + 'model-2026-11/'
fill_auto(app_frame('frame-chrome'), M + 'dessert-grid.png', 'fourcut-chrome-model.png')
fill_auto(app_frame('frame-cute'), M + 'vintage-grid-gemini-v3.png', 'fourcut-cute-model.png')
fill_auto(app_frame('frame-gyaru'), M + 'yuja-friends-grid.png', 'fourcut-gyaru-friends.png')
fill_auto(app_frame('frame-patchwork'), M + 'vintage-grid-natural.png', 'fourcut-patchwork-model.png')
fill_auto(app_frame('frame-vintage'), M + 'yuja-friends-grid.png', 'fourcut-vintage-friends.png')
fill_auto(goheung_cutout('goheung-classic'), 'assets/raw/ph/ph-hearts-grid.png', 'fourcut-goheung-classic-hearts.png', centering=(0.5, 0.3))
Image.open(RAW + 'goheung-filled-yuja.png').convert('RGB').resize((480, 640), Image.LANCZOS).save(os.path.join(out, 'fourcut-goheung-yuja.png'))
print('ok 3')
