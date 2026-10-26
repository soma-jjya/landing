# 사용: python3 scripts/compose-frames.py <출력폴더>  → frame-*.png 생성 후 cwebp -q 82 -alpha_q 90 으로 assets/img/frame-*.webp
# 원본: Figma Peakpic 파일 "Frame PNGs"(node 1720:34589) 의 프레임 이미지 → assets/raw/frames/
# 프레임 PNG(투명 칸) 아래에 실사 사진을 cover-fit 으로 깔아 합성한다. 빈 프레임은 칸을 흰색으로 채운다.
import sys
from PIL import Image
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dl, out, img = os.path.join(root, 'assets/raw/frames'), sys.argv[1] if len(sys.argv) > 1 else '.', os.path.join(root, 'assets/img')
CELLS = {
  'dessert': [(52,48,510,634),(553,48,1011,634),(52,690,510,1281),(553,690,1011,1281)],
  'cute':    [(72,62,511,648),(550,62,989,648),(72,677,511,1292),(550,677,989,1292)],
  'gyaru':   [(53,36,515,603),(547,36,993,603),(53,645,515,1258),(547,645,993,1258)],
}
def cover(src, box, fx, fy, zoom):
    bw, bh = box[2]-box[0], box[3]-box[1]
    sw, sh = src.size
    s = max(bw/sw, bh/sh) * zoom
    r = src.resize((round(sw*s), round(sh*s)), Image.LANCZOS)
    cx, cy = r.size[0]*fx, r.size[1]*fy
    l = min(max(cx - bw/2, 0), r.size[0]-bw); t = min(max(cy - bh/2, 0), r.size[1]-bh)
    return r.crop((round(l), round(t), round(l)+bw, round(t)+bh))
def build(name, photos, width):
    fr = Image.open(f'{dl}/frame-{name}.png').convert('RGBA')
    base = Image.new('RGBA', fr.size, (255,255,255,255))
    for box, p in zip(CELLS.get(name, []), photos):
        if p is None: continue
        f, fx, fy, z = p
        base.paste(cover(Image.open(f'{img}/{f}').convert('RGB'), box, fx, fy, z), box[:2])
    base.alpha_composite(fr)
    # 프레임 바깥 투명 여백 유지: 원본 알파가 0 이고 칸 밖이면 투명
    w = width; h = round(fr.size[1]*w/fr.size[0])
    base.resize((w, h), Image.LANCZOS).save(f'{out}/frame-{name}.png')
    print(name, (w, h))
# 앞 프레임(cute)도 빈 칸(흰색) — 2026-10-16 인물 합성은 어색하다는 피드백으로 제거
build('cute', [None]*4, 640)
build('dessert', [None]*4, 480)
build('gyaru', [None]*4, 480)
# 2026-10-27: 앱 번들 프레임(peakpic.app/frames/img_frame_*.png → assets/raw/frames/frame-*.png)도 같은 방식. 칸은 흰색
build('chrome', [None]*4, 640)      # Y2K 크롬 하트 — /fourcut/ 01 my frame 앞 프레임
build('vintage', [None]*4, 480)     # 빈티지 필름 — 왼쪽
build('patchwork', [None]*4, 480)   # 코지 패치워크 — '친구랑 같이 찍는 법' 1단계
