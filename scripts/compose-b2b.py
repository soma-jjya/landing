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
