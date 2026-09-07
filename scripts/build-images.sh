#!/bin/zsh
# assets/raw/*.svg (Figma 내보내기, 사진 base64 내장 3~11MB) → assets/img/*.webp (웹용)
#
# 왜 이렇게 하나: SVG 안 텍스트가 전부 path라 폰트 의존은 없지만, 임베디드 비트맵 때문에
# 원본을 페이지에 직접 넣으면 성능 예산(초기 1MB)을 크게 넘는다. 헤드리스 Chrome으로
# 2배 해상도 렌더 → 필요한 영역만 크롭 → WebP(q82)로 저장한다.
#
# 필요: macOS Google Chrome, cwebp (brew install webp)
# 사용: scripts/build-images.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/assets/raw"
OUT="$ROOT/assets/img"
TMP="$(mktemp -d)"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
command -v cwebp >/dev/null || { echo "cwebp 없음: brew install webp"; exit 1; }
[ -x "$CH" ] || { echo "Google Chrome 없음"; exit 1; }
mkdir -p "$OUT"

# 한글 파일명은 file:// URL에서 번거로우니 ASCII 이름으로 복사
cp "$RAW/온보딩.svg"   "$TMP/onboarding-0.svg"   # 미러링
cp "$RAW/온보딩-1.svg" "$TMP/onboarding-1.svg"   # 1인 촬영
cp "$RAW/온보딩-2.svg" "$TMP/onboarding-2.svg"   # 포즈 추천 (온보딩-3과 동일 화면)
cp "$RAW/온보딩-3.svg" "$TMP/onboarding-3.svg"
cp "$RAW/온보딩-4.svg" "$TMP/onboarding-4.svg"   # "오직 피크픽" 브랜드 화면
cp "$RAW/home.svg"     "$TMP/home.svg"

# Chrome 헤드리스는 --screenshot 후 종료되지 않는 경우가 있어, 파일이 생기면 직접 종료한다.
render() {
  local n; n=$1
  local w; w=$2
  local h; h=$3
  local out; out="$TMP/$n.png"
  "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
    --user-data-dir="$TMP/prof-$n" --force-device-scale-factor=2 --window-size=$w,$h \
    --screenshot="$out" "file://$TMP/$n.svg" >/dev/null 2>&1 &
  local pid; pid=$!
  local i; i=0
  while [ $i -lt 120 ]; do
    if [ -s "$out" ]; then
      local s1; s1=$(stat -f %z "$out"); sleep 2; local s2; s2=$(stat -f %z "$out")
      [ "$s1" = "$s2" ] && break
    fi
    sleep 1; i=$((i+1))
  done
  kill $pid 2>/dev/null || true; sleep 1; pkill -f "prof-$n" 2>/dev/null || true
  [ -s "$out" ] || { echo "렌더 실패: $n"; exit 1; }
  echo "렌더 완료: $n"
}

for n in onboarding-0 onboarding-1 onboarding-2 onboarding-3 onboarding-4; do render $n 375 812; done
render home 375 1448

# 크롭 좌표는 SVG 기준(1x) × 2.
#  - 온보딩 사진 카드: rect x=24 y=54 w=327 h=410 rx=20  → 48 108 654 820
#  - home 히어로 포스터: 상단 한 화면(375×812)             → 0 0 750 1624
WEBP=(-quiet -q 82 -m 6 -sharp_yuv)
for n in onboarding-0 onboarding-1 onboarding-2 onboarding-3 onboarding-4; do
  cwebp "${WEBP[@]}" -crop 48 108 654 820 "$TMP/$n.png" -o "$OUT/$n.webp"        # 사진 카드
  cwebp -quiet -q 80 -m 6 -sharp_yuv "$TMP/$n.png" -o "$OUT/$n-full.webp"          # 온보딩 전체 화면
done
cwebp "${WEBP[@]}" -crop 0 0 750 1624 "$TMP/home.png" -o "$OUT/home.webp"

rm -rf "$TMP"
echo "--- 결과 (각 200KB 이하인지 확인) ---"
for f in "$OUT"/*.webp; do printf "%-32s %6d KB\n" "$(basename "$f")" $(( $(stat -f %z "$f") / 1024 )); done
