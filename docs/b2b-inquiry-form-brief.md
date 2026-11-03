# B2B 문의 폼 페이지 브리프 (`/b2b/`)

B2B 메타 광고(카페·매장 / 축제·행사·관광공사)의 **도착지**. 설치 랜딩이 아니라 **문의 접수 폼**이다. 목표는 폼 제출 한 가지.
서버 API 는 배포돼 있다(2026-11-03). 계약서: caestro-server `contracts/b2b-inquiries.md`.

## 위치·배포

- 파일: `b2b/index.html` (+ 필요하면 `b2b/b2b.css`, `b2b/b2b.js`). 기존 `fourcut/index.html` 을 본뜬다 — 헤더·푸터·CSS·`js/analytics.js`·`js/main.js` 공유, 히어로와 본문만 다르다.
- 라우팅: `peakpic.app/b2b/` 는 Cloudflare Worker(`peakpic.app` 레포, `cloudflare/landing-proxy.js` 의 `isLandingPath`) 가 랜딩으로 넘겨야 열린다. 이 레포에서는 `cloudflare/landing-proxy.js` 의 정규식에 `b2b` 를 추가하고 주석의 `run_worker_first` 목록에도 `/b2b/*` 를 넣는다(Worker 반영은 팀원).
- Vercel 미리보기 주소(`landing-pi-umber.vercel.app/b2b/`)로 먼저 확인한다. `vercel.json` 의 호스트 리다이렉트는 `x-peakpic-proxy` 헤더 없는 요청을 peakpic.app 으로 보내므로 미리보기는 로컬 `npx serve` 또는 Vercel 프리뷰 배포로 본다.

## 변형(한 페이지, 쿼리로 분기)

`utm_content` 를 읽어 문구와 유형 기본값을 바꾼다(기존 `fourcut/index.html` 의 `hearts|friends` 분기 코드와 같은 방식).

| utm_content | 히어로 제목 | 보조 문장 | 기본 유형 |
|---|---|---|---|
| `b2b_cafe*` | 손님 폰이 곧, 우리 가게 포토존. | 부스 자리도 렌탈비도 없이, 가게 이름 들어간 네컷을 손님이 찍어 올려요. | CAFE |
| `b2b_festival*`, `b2b_tour*` | 방문객이 찍고, 홍보까지 알아서. | 행사 이름이 들어간 네컷을 방문객이 직접 찍고 SNS 에 올려요. | FESTIVAL (tour 면 TOURISM) |
| 그 외·없음 | 우리 공간 전용 네컷 프레임, 무료로 시작해요. | 설치비 0원, 상주 인력 0명. 거치대 + 폰 1대면 끝. | OTHER |

포스터(B2B v6) 톤 그대로: 피크픽 로고, 큰 제목 + 형광 밑줄 강조, "설치비 0원 / 상주 인력 0명 / 필요한 것 거치대+폰 1대" 3칸, 손님 흐름 3단계(QR 찍기 → 거치대 폰으로 촬영 → 가게 이름 달고 업로드). 그림은 기존 `assets/` 의 네컷 프레임 예시를 재사용. 새 기능을 지어내지 않는다(CLAUDE.md 서비스 배경 참조).

## 폼

제목 "상담·견적 무료 문의". 필수 5 + 동의 1, 나머지는 접힘("자세히 적을래요" 토글) 또는 아래쪽 선택란.

| 필드명(JSON) | 라벨 | 필수 | 입력 |
|---|---|---|---|
| `type` | 어디에 쓰시나요 | 필수 | 라디오/셀렉트: CAFE 카페·매장, FESTIVAL 축제·행사, TOURISM 관광공사·지자체, OTHER 기타. utm 으로 기본 선택 |
| `organization` | 업체·행사명 | 필수 | text, 80자 |
| `contactName` | 담당자 성함 | 필수 | text, 40자 |
| `phone` | 연락처 | 필수 | tel, `^[0-9+\-\s()]{8,20}$`, 예 010-1234-5678 |
| `email` | 이메일 | 선택 | email, 120자. "제안서를 보내 드려요" |
| `region` | 지역 | 선택 | text 또는 시·도 셀렉트, 40자 |
| `preferredPeriod` | 희망 시기 | 선택 | text, 80자. 예 "12월 초", "2027.5.1~5.3" |
| `scale` | 규모 | 선택 | 셀렉트: 하루 손님 50명 미만 / 50~200 / 200 이상 / 행사 방문객 1천 미만 / 1천~1만 / 1만 이상 |
| `website` | 인스타그램·홈페이지 | 선택 | text, 200자 |
| `message` | 문의 내용 | 선택 | textarea, 500자 카운터 |
| `privacyAgreed` | 개인정보 수집·이용 동의 | 필수 | 체크박스. 문구: "상담을 위해 업체명·성함·연락처·이메일을 수집하며, 상담 종료 후 1년 보관합니다." + `/privacy.html` 링크 |
| `marketingAgreed` | 피크픽 소식 받기 | 선택 | 체크박스, 기본 해제 |
| `utm` | (숨김) | | `{source, medium, campaign, content, term}` — 주소창 `utm_*` 그대로. 없으면 생략 |
| `landingPath` | (숨김) | | `location.pathname` |
| `fax` | (허니팟) | | 화면에 보이지 않는 input(`position:absolute; left:-9999px; tabindex=-1; autocomplete=off`). 사람은 비워 둔다. **자동 채움을 막기 위해 label 없이** |

제출 버튼: 카페 변형 "우리 가게 프레임 문의하기 →", 행사 변형 "행사 전용 제안서 받기 →", 기본 "무료 상담 신청하기 →". 전송 중엔 비활성 + "보내는 중…".

## 전송

```
POST https://api.peakpic.app/inquiries
Content-Type: application/json
{ "type":"CAFE", "organization":"…", "contactName":"…", "phone":"…", "email":"…"|생략, …, "privacyAgreed":true, "marketingAgreed":false,
  "utm":{"source":"meta","medium":"paid_social","campaign":"…","content":"b2b_cafe","term":"…"}, "landingPath":"/b2b/", "fax":"" }
```

- 201 `{ "id": 123 }` → 성공 화면으로 교체: "문의가 접수됐어요. 영업일 기준 1~2일 안에 연락드릴게요." + 접수번호 + "그동안 앱 구경하기"(기존 `.btn-store` 와 같은 스토어 분기 버튼). 폼은 숨긴다.
- 400 `{ "status":400, "message":"연락처는 필수입니다, …" }` → 서버 message 를 폼 위에 그대로 표시. 제출 전 브라우저 검증(required, pattern, 체크박스)으로 대부분 막는다.
- 429 → "요청이 많아 잠시 막혔어요. 1시간 뒤 다시 시도하거나 asmjjya@gmail.com 으로 보내 주세요."
- 그 외/네트워크 → "일시적인 오류예요. 다시 시도하거나 asmjjya@gmail.com 으로 보내 주세요."
- 이메일 `mailto:` 는 폴백으로 남긴다(푸터 + 오류 문구).
- CORS 는 `https://peakpic.app`·`www` 만 허용. 로컬·Vercel 프리뷰에서는 브라우저가 막으니, 전송 테스트는 `curl` 로 하거나 `peakpic.app/b2b/` 반영 뒤 한다. 제출 성공 뒤 응답 `id` 가 보이면 서버 저장 완료.

## 분석(기존 `js/analytics.js` 재사용)

- `window.PEAKPIC_ANALYTICS = { key, host:'/ingest', uiHost, metaPixelId:'1758731071879086', variant:'b2b' }` — `index.html` 과 같은 값, variant 만 `b2b`.
- PostHog: 폼 첫 입력 때 `b2b_inquiry_started`, 성공 때 `b2b_inquiry_submitted { type, utm_content, has_email, has_message }`, 실패 때 `b2b_inquiry_failed { status }`.
- Meta 픽셀: 성공 때 `fbq('track', 'Lead', { content_category: type })`. **광고 세트의 전환 이벤트를 Lead 로 잡는 근거**라 반드시. 픽셀 로더는 `analytics.js` 가 이미 넣는다 — `metaTrack` 류 헬퍼가 있으면 그걸 쓴다.
- 설치 CTA(`StoreClick`)는 성공 화면 버튼에만 남긴다.

## 광고 CTA 주소 형식

`https://peakpic.app/b2b/?utm_source=meta&utm_medium=paid_social&utm_campaign=b2b_1103&utm_content=b2b_cafe&utm_term={{placement}}`
소재별로 `utm_content` 만 `b2b_cafe` / `b2b_festival` / `b2b_tour` 로 바꾼다.

## 하지 않는 것

파일 첨부(로고는 연락 뒤 받는다), 로그인, 캡차(스팸이 보이면 Turnstile), 이메일 자동 회신, 가격표.

## 완료 확인

1. `/b2b/?utm_content=b2b_cafe` 와 `?utm_content=b2b_festival` 에서 제목·기본 유형이 바뀐다. 쿼리 없이도 깨지지 않는다.
2. 모바일(390px)에서 폼이 한 화면에 들어오고 키보드가 올라와도 제출 버튼이 가려지지 않는다.
3. 필수 비우고 제출 → 브라우저 검증 메시지. 동의 안 하면 제출 불가.
4. 성공 뒤 PostHog 라이브 이벤트에 `b2b_inquiry_submitted`, Meta 픽셀 헬퍼에 `Lead`.
5. `peakpic.app/b2b/` 반영 뒤 실제 제출 1건 → 디스코드 채널에 `[B2B 문의 #N]` 한 줄(서버가 보낸다).
