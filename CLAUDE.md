# PeakPic 랜딩페이지

## 이 프로젝트가 무엇인가
피크픽(PeakPic) 공식 랜딩페이지. **광고 유입의 도착지**로, 목표는 소개가 아니라
**Google Play 설치 전환**이다. 레퍼런스는 당근 랜딩 — 히어로, 스크롤당 기능 하나,
명확한 CTA, 실사 중심. 백엔드 레포(caestro-server)와 완전 분리된 정적 사이트.

역할 (우선순위 순):
1. 광고 클릭 → 10초 안에 이해 → Google Play 설치 버튼 전환
2. 스토어 심사·정책용 URL — 마케팅/지원/개인정보처리방침
3. 서비스의 얼굴

## 서비스 배경 — 카피의 원천 (여기 없는 기능을 지어내지 말 것)
**피크픽은 "찍히는 사람"이 카메라를 지휘하는 촬영 앱이다.**
해결하는 문제: 남에게 사진을 부탁하면 구도·타이밍이 마음에 안 들고, 다시 부탁하기 민망하다.

앱 기능 4개 (랜딩에는 1·2·4만 노출 — 2026-09-23 결정: 1인 촬영은 보조 설명이라 광고 랜딩에서 제외):
1. **미러링 촬영**: 촬영자의 카메라 화면을 내 폰에서 실시간 확인, 구도 직접 지휘 + 원격 셔터.
   역할 스왑, 플래시·타이머·비율 원격 설정. 두 폰 직접 연결(P2P)로 지연 거의 없음(앱 표기 38ms)
2. **포즈 추천**: 상황별 추천 포즈(길거리/셀카 항공/광각)와 가이드 따라 촬영
3. **1인 촬영**: 미러링 없이 혼자 촬영하는 모드. 포즈 추천 등 AI 기능은 그대로 사용 가능
   (2026-09-08 정정: "내 폰으로 구도 확인" 같은 미러링성 표현 금지)
4. **나만의 네컷**(구 AI 네컷 프레임 → 나만의 프레임 → 2026-09-23 발표자료 명칭으로 통일. **2026-10-16: 같은 이름의 기존 서비스가 있어 랜딩·광고 등 외부 노출 문구에는 "나만의 네컷" 사용 금지** — 티커는 "네컷 꾸미기", 섹션 라벨은 "my frame"): 내 사진을 네컷 프레임에 넣고, 좋아하는 캐릭터·연예인
   사진을 누끼 따서 스티커처럼 붙여 자유롭게 꾸미는 기능. **출시됨** (2026-09-23 확인 — "출시 예정" 표기 전부 제거, 랜딩 라벨은 "my frame")
   + **친구와 함께 채우기**(2026-10-13 랜딩 반영): 네컷 프레임을 공유하면 친구들이 각자 한 컷씩 올려 네컷을 완성한다. 랜딩 카피의 1순위 메시지
기타: 로그인 없이 시작(게스트), 카카오/구글/애플 로그인 선택, Pro 존재.
표기: 한글 "피크픽", 로고 "peakpic."(소문자+마침표), 강조 "PEAK PIC".

## 스토어 현황 (CTA의 사실 관계 — 반대로 표기 금지)
- **Android: 출시됨** — 주 CTA. Google Play 배지 + 링크:
  https://play.google.com/store/apps/details?id=soma.project.caestro&hl=ko
- **iOS: 출시됨 (2026-09-23)** — App Store 공식 배지 + 링크:
  https://apps.apple.com/kr/app/peakpic/id6807646621
- **CTA 는 단일 "앱 다운로드" 버튼** (2026-10-15 결정, 모든 변형 공통): `<html class="os-android|os-ios|os-other">`(head 인라인 스크립트)를 보고
  js/main.js 가 `.btn-store` 를 방문자 OS 의 스토어로 직행시킨다. 데스크톱·JS 없음(os-other)은 #install 로 스크롤 → 설치 섹션에만 공식 배지 2개 + QR.
  공식 배지는 설치 섹션 외에 두지 않는다
- 푸터에 Google·Apple 상표 고지 유지. "iOS 준비 중" 류 표기는 전부 폐기

## 카피 뱅크 (팀 확정 문장 — 우선 사용, 새 카피는 이 톤으로)
- "쉽게 건지는 나만의 PEAK PIC" / "복잡한 구도 고민 없이, 내가 원하는 모습 그대로
  가장 빛나는 순간을 사진으로 남겨보세요."
- 미러링: "내가 찍히는 모습을 실시간으로 확인해요" — "촬영자의 카메라 화면을 내 스마트폰에서
  바로 확인하고, 원하는 구도를 직접 맞춰보세요."
- 포즈 추천: "어색한 포즈 고민 끝, 가이드 따라 찰칵" — "사진에 어울리는 포즈를 추천받고,
  가이드에 맞춰 더 쉽게 인생샷을 완성해보세요."
- 1인 촬영: "이제 혼자서도 원하는 사진을 찍어요" — "혼자 찍을 때도 포즈 추천과 가이드 같은
  AI 기능은 그대로 써요." (2026-09-08 변경, 이전 문구는 미러링을 암시해 폐기)
- 공감(커플): "다시 찍어달라는 말, 이제 그만해도 돼요" — "연인에게 부탁한 인생샷,
  마음에 든 적 있나요?" ※ 커플은 대표 공감 장면으로만 사용 — 랜딩 정체성을 커플 앱으로
  좁히지 말 것, 성별 지칭("남친/여친") 금지, "연인"으로 중립 표기.
  **예외: /couple/ 변형의 히어로만** 광고 D 와 메시지를 맞추기 위해 "똥손 남친도 인생샷 찍어줌."을 쓴다(2026-10-15 사용자 결정). 그 외 문장은 "연인"
- 나만의 네컷(2026-10-13): "친구와 한 컷씩 채우고, 최애 누끼로 꾸민 네컷" — "네컷 프레임을 친구에게 공유하면 각자 한 컷씩 올려
  함께 완성해요. 좋아하는 캐릭터나 연예인 사진은 누끼 따서 스티커처럼 붙이고, 완성한 네컷은 바로 저장·공유하세요."
  말풍선 "너도 한 컷 올려!"(Meta 포스터 B와 동일 문구). ※ "인생네컷"은 타사 상표 → "네컷"으로만 표기
톤: 가볍고 친근한 존댓말. 기술 용어(WebRTC·P2P·세션) 노출 금지.

## 페이지 구조
변형(2026-10-15~): 레포·Vercel 프로젝트 하나에 폴더로 나눈다. `/` 범용(스토어 심사 URL·QR·직접 유입), `/couple/` 커플 타깃(광고 D 도착지),
`/fourcut/` 네컷 타깃(광고 B 도착지). 변형은 **히어로·문제 공감·기능 순서·카피만** 다르고 헤더·티커·설치·푸터·CSS·JS 는 공유한다.
하위 폴더 페이지는 자산 경로를 `/assets/...` 처럼 루트 기준으로. 공통 부분을 고치면 모든 변형 파일에 반영할 것(빌드 도구 없음).
변형별 PostHog 속성 `landing_variant` 는 각 페이지 head 의 `PEAKPIC_ANALYTICS.variant`.
- /couple/: 미러링 → 포즈 → 네컷, 히어로 "똥손 남친도 인생샷 찍어줌.", 미러링·네컷 카피를 "연인/둘이"로
- /fourcut/ (2026-10-16): 네컷 → 미러링 → 포즈, 히어로 "뭐하러 부스까지 가? 폰으로 공짜 네컷." + 영상 프레임 대신 채워지는 네컷 콜라주
  (`.collage--fourcut`: 마지막 칸 `.cell-empty` 가 7초 루프 안에서 채워지고 3/4 → 4/4). 문제 공감은 줄·모임·비용 3장. 광고 URL 은 utm_content=fourcut_b
  01 my frame 은 히어로와 이미지가 겹치지 않게 프레임 3종 부채꼴(`.cluster--frames`) + 누끼 카드, 헤드라인 "프레임은 취향대로 고르고, 최애 누끼로 꾸미기"
  누끼 강조: 누끼 따기 카드 → 행진하는 점선 화살표 → 앞 프레임 모서리에 같은 고양이 스티커가 "쏙" 붙는 6초 루프. 스티커는 칸 안이 아니라 프레임 테두리·모서리에 걸쳐 붙인다(칸은 비움)

1. 히어로: 시연 영상(자동재생·음소거·루프 — 영상 오기 전엔 home 화면 목업+포스터) +
   슬로건 + **단일 "앱 다운로드" 버튼(주 CTA, OS 별 스토어 직행)**
   히어로 모션(2026-10-16, my4cut-official.com 참고): 7초 루프로 말풍선 팝업 → "찰칵" 흔들림 → 프레임 플래시, 폴라로이드 부유, 로고 스티커 스윙.
   모션은 css 의 개별 속성(scale·translate·rotate)만 쓴다(transform 은 기울기용). 버튼 라벨은 "앱 다운로드"만, 스토어명은 고정 CTA 에만
2. 문제 공감 한 섹션
3. 기능 섹션 3개(미러링 → 나만의 네컷 → 포즈 추천. 2026-10-13 네컷을 2번으로 올림, 교차 레이아웃 `feature--alt paper`는 2번에): 콜라주 비주얼 + 온보딩 문법
   (오렌지 소문자 라벨 → 볼드 헤드라인 2줄 → 회색 설명 2줄)
4. 설치 CTA 재노출 (모바일: 단일 버튼 / 데스크톱: 공식 배지 2개 + QR)
5. 푸터: 문의 asmjjya@gmail.com, 개인정보처리방침, 이용약관

## 디자인 규칙 (엄수)
- 토큰: 블랙 #000000 / 포인트 오렌지 #FF5A47 / 화이트 #FFFFFF / 본문 회색은 블랙 투명도만
- 서체: Pretendard (CDN). 굵기로만 위계
- 로고: assets/logo.svg 만 사용, 변형 금지
- 오렌지는 절제(라벨·마침표·포인트만), 대면적 오렌지 금지. 보라는 미출시 기능의 "출시 예정" 뱃지 외 금지(현재 미사용)
- 실사 중심: 제공된 앱 화면·실기기 영상만. AI 생성 이미지·스톡 일러스트 금지
- AI 랜딩 클리셰 금지: 보라/파랑 그라데이션, 글래스모피즘, 이모지 남발, 과한 스크롤 애니메이션
- 없는 자산은 만들지 말고 요청 목록으로 알릴 것

## 자산 (assets/)
- logo.svg — 공식 로고 (흰 배경 포함판)
- img/google-play-badge-ko-v2.png (투명 여백 제거판 646×192, 캐시 무효화를 위해 v2), img/app-store-badge-ko.svg — 각 스토어 공식 배지 원본(변형 금지)
- img/sticker-*.svg — 디자이너 스티커 시트(다이컷·오렌지/블랙 라벨)를 logo.svg 레터폼으로 SVG화한 콜라주용 스티커
- img/pose-camera.webp, img/pose-list.webp — 발표자료(Figma Peakpic 파일 node 1106:62804)의 앱 화면 목업, 기기 프레임 포함·투명 배경.
  pose-camera에는 실루엣 가이드를 합성했다: 인물은 덮지 않고, 인물 중심 1.10배·좌상단(-34,-18)으로 비낀 실루엣을
  가장자리 블러 10px의 반투명 흰 형태(28%) + 은은한 외곽선(55%)으로 올림. 재생성: scripts/make-silhouette.swift (macOS Vision)
  `swiftc -O scripts/make-silhouette.swift -o seg && ./seg <목업.png> <outdir> -34 -18 1.10 0.28 0.55 10`
- img/fourcut-dessert.webp — 앱에서 만든 네컷 결과물(디저트 프레임, Figma node 1106:62814). 핑크 Popteen 프레임은 헬로키티 포함이라 랜딩 사용 금지
- img/fourcut-friends.webp — /fourcut/ 히어로 전용(2026-10-16). fourcut-dessert 는 네 칸이 모두 같은 인물이라 "친구가 한 컷 올렸다" 장면이 어색해서,
  마지막 칸(우하단) 사진만 Meta 포스터 v3 네컷①의 왼쪽 아래 인물(원본 assets/raw/fourcut/friend-cut.png)로 바꿨다. 레이스·스티커는 원본 유지.
  재생성 `python3 scripts/swap-fourcut-cell.py assets/img/fourcut-dessert.webp assets/raw/fourcut/friend-cut.png <out.png>` 후 cwebp -q 82
- img/fourcut-app.webp — "AI 네컷사진" 화면 목업(현재 미사용, 필요 시 사용)
- img/char-*.svg — 나만의 네컷 섹션의 누끼 스티커용 자체 캐릭터(저작권 없음). 실제 캐릭터/연예인 누끼는 팀이 권리 확인 후 교체
- img/couple-hero-beach.webp — /couple/ 히어로 큰 사진(2026-10-16, "여친샷" 느낌). 앱 포즈 상세 화면의 추천 포즈 사진(Figma node 1720:34208,
  원본 assets/raw/couple/). 원본이 480×640 이라 업스케일 없이 4:5(477×596)로만 잘랐다. 루트 히어로는 onboarding-4 그대로
- img/frame-cute.webp, frame-dessert.webp, frame-gyaru.webp — 앱의 네컷 프레임 3종(Figma "Frame PNGs" node 1720:34589, 원본 assets/raw/frames/).
  /fourcut/ 01 my frame 섹션 전용(2026-10-16): 세 장 모두 빈 칸(흰색). 칸에 인물 사진 합성은 어색하다는 피드백으로 폐기 — 칸은 누끼 스티커로만 꾸민다.
  재생성 `python3 scripts/compose-frames.py <출력폴더>` 후 cwebp
- raw/ 의 SVG들(온보딩 1~4, home 등)은 **원본 보관용** — 사진이 base64 내장이라 3~11MB.
  **페이지에 원본 직접 삽입 금지**, 반드시 PNG/WebP(폭 750px 내외, 각 200KB 이하)로
  변환해 assets/img/ 에 두고 그것만 사용
- 성능 예산(광고 랜딩): LCP 2.5s 이내, 초기 로드 1MB 이내, 이미지 lazy loading

## 기술 스택
- 프레임워크·빌드 도구 없는 정적 사이트: index.html + CSS + 최소 JS. 모바일 우선 반응형
  (광고 유입은 대부분 모바일)
- 배포: Vercel(main 자동 배포, https://landing-pi-umber.vercel.app). S3/CloudFront 계획은 폐기
- 도메인 peakpic.app(2026-10-16 연결 완료, 팀원이 Worker 에 분배 코드 배포): DNS·도메인은 팀원의 Cloudflare Worker `peakpic-app-site`(peakpic-app-site.peakpic-app-site.workers.dev)가 갖고 있고
  /fill/(네컷 친구 채우기)·/api/(그 임시 서버, KV FRAMES)·/.well-known/assetlinks.json(안드로이드 앱 링크)·/privacy/·/terms/ 를 서빙한다 → **DNS 를 Vercel 로 돌리지 말 것**(공유 기능이 깨짐).
  대신 그 Worker 가 랜딩 경로(/, /couple/, /fourcut/, /css, /js, /assets, /ingest)만 Vercel 로 넘긴다: 붙여 넣을 코드 cloudflare/landing-proxy.js (요청에 x-peakpic-proxy: 1 헤더를 붙임).
  새 경로를 랜딩에 추가하면 그 파일의 isLandingPath 와 Worker 의 run_worker_first 에도 추가할 것.
  canonical·og:url·og:image 는 https://peakpic.app/... 절대 URL. vercel.json 이 landing-pi-umber.vercel.app 직접 접속을 peakpic.app 으로 307 리다이렉트한다
  (x-peakpic-proxy 헤더가 있으면 제외 — 이 조건을 빼면 무한 루프로 peakpic.app 전체가 죽는다)
  개인정보처리방침·이용약관은 팀원 사이트의 https://peakpic.app/privacy/ · /terms/ 가 정본(랜딩 푸터가 링크). 레포의 privacy.html·terms.html 초안은 미사용

## 지표 (PostHog, 2026-10-13 추가)
- 설정: index.html <head> 의 `window.PEAKPIC_ANALYTICS = { key, host:'/ingest', uiHost }`. key 가 비면 꺼진다.
  `/ingest` 는 vercel.json 리라이트(광고 차단 우회) → S3/CloudFront 로 옮기면 CloudFront 동작 또는 host 를 https://us.i.posthog.com 으로
- 이벤트 스키마는 js/analytics.js 머리 주석이 원본. 핵심 전환 = `store_click`(store, placement, os). 모든 이벤트에
  super property `ad_creative`(=utm_content)·`ad_campaign`·`ad_source`·`visitor_os` 가 붙는다
- 광고 URL 규칙: `https://peakpic.app<변형 경로>?utm_source=meta&utm_medium=paid_social&utm_campaign=<캠페인>&utm_content=<소재>`
  소재 값은 Figma 포스터 이름과 맞춘다. v3(2026-10-16, Figma "META 광고 포스터" 페이지 상단): 커플① 똥손 남친 비포·애프터 `couple_d`,
  커플② 다시 찍어달라기 미안하죠? `couple_sorry` → `/couple/` / 네컷① 너만 올리면 완성(친구 알림) `fourcut_friends`, 네컷② 찍고 끝 말고, 직접 꾸미는 네컷 `fourcut_frame` → `/fourcut/`.
  네컷① 변형(2026-10-21, 팀원 수정안 기반, 섹션 오른쪽 끝): ①-B 칸마다 다른 실사 인물 `fourcut_friends_b`, ①-C 네 칸이 모여 큰 하트(왼쪽 위·오른쪽 위 머리 위 팔 아치가 가운데서 만남 — 오른쪽 위는 같은 포즈 좌우 반전, 왼쪽 아래 대각선 팔, 빈 칸 점선이 마지막 조각. 인물 3명 모두 Figma AI 생성) `fourcut_hearts`.
  ①-C 는 AI 생성 인물이 있어 랜딩에는 쓰지 말 것(디자인 규칙), 광고 집행 시 Meta 의 AI 표시 확인
  v2 값(`fourcut_b`, `mirror_a`, `pose_c`)은 보관용. 포스터 CTA 바(2026-10-16)는 왼쪽 "지금 무료로 다운로드 →" + 오른쪽 가격표 스티커 "~~Pro 월 3,900원~~ 현재 무료!"(스토어 배지 없음 — 클릭하면 랜딩으로 가므로).
  무료 종료 시점이 미정이라 기간("3개월" 등)은 쓰지 않는다. Pro 가격은 사용자가 준 값 — 가격이 바뀌거나 무료가 끝나면 포스터 8장 모두 고칠 것(표시광고 사실관계)
- super property `landing_variant`(main/couple/fourcut) 로 변형별 비교. 핵심 비교 지표 = 변형별 `store_click` 전환율
- 측정 범위: 랜딩 도착 → 스토어 클릭까지. 설치·앱 내 행동은 Meta SDK/MMP 또는 앱 쪽 PostHog 와 연결해야 보인다
- 개인정보처리방침에 분석 도구 사용 항목 필요(privacy.html 에 초안 문장 있음)
- Meta 픽셀(2026-10-20): 데이터 세트 `peakpic` ID 1758731071879086, 광고 계정 peakpic 에 연결됨. 각 페이지 head 의 `PEAKPIC_ANALYTICS.metaPixelId` 로 켠다(js/analytics.js).
  이벤트 PageView + 커스텀 `StoreClick`(store_click 과 같은 순간). 광고 최적화·성과는 광고 관리자에서 StoreClick 으로 "맞춤 전환"을 만들어 쓴다.
  Conversions API 는 끔. 정식 개인정보처리방침(peakpic.app/privacy/)에 Meta 픽셀 항목 추가 필요(팀원 담당)
- 설치 귀속·CPI(2026-10-21): 앱에 Meta SDK/MMP 가 없어 Meta 화면에는 설치가 안 잡힌다. 대신 js/main.js 가 스토어 링크에 포스터별 이름을 붙인다:
  Google Play 는 referrer 의 utm_campaign 을 `<캠페인>__<소재>`(예 test_1021__couple_d)로 바꿔 Play Console 사용자 확보 보고서에 포스터별 설치가 잡히게,
  App Store 는 head 의 `PEAKPIC_ANALYTICS.appStorePt`(App Store Connect 제공자 토큰, 2026-10-22 팀원이 캠페인 링크 생성으로 확인한 129647718 적용)로 캠페인 링크(pt·ct=같은 이름)로 바꾼다 → App Store Connect 앱 분석 > 획득 > 캠페인.
  CPI = 포스터별 광고비 ÷ (Play 설치 + App Store 설치). App Store 수치는 분석 공유에 동의한 사용자만 잡혀 과소 집계

## 아직 없는 것 (플레이스홀더 진행)
- [ ] 히어로 시연 영상 (팀 촬영 예정)
- [ ] 미러링 실사용 카메라 화면 캡처 (광고에 가장 강한 장면 — 선택이지만 권장)
- [ ] 개인정보처리방침·이용약관 본문
- [x] PostHog 프로젝트 키 (앱과 같은 US 프로젝트, 2026-10-13 적용)