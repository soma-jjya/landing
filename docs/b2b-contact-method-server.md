# B2B 문의: 연락 방법 선택 — 서버 변경 요청 (2026-11-07)

랜딩 `/b2b/` 폼이 "연락처 + 이메일(선택)" 대신 **연락받을 방법(전화·이메일·인스타 DM) 중 하나를 고르고 그 칸 하나만** 받도록 바뀌었다.
지금 서버(caestro-server `CreateInquiryRequest`)는 `phone` 이 `@NotBlank` 라서 **이메일·인스타를 고르면 400 "연락처는 필수입니다"** 가 난다.
→ 아래 변경이 운영에 배포된 뒤에 랜딩을 배포해야 한다(전화를 고른 문의는 지금 서버에서도 그대로 된다).

## 폼이 보내는 값

| 필드 | 값 |
|---|---|
| `contactMethod` | `PHONE` / `EMAIL` / `INSTAGRAM` (새 필드, 필수) |
| `phone` | PHONE 일 때만. 숫자만(예 `01012345678`, `021234567`, `15881234`). +82 는 0 으로 바꿔 보냄 |
| `email` | EMAIL 일 때만. 소문자·공백 제거(예 `owner@example.com`) |
| `instagram` | INSTAGRAM 일 때만. `@`·주소 뗀 아이디, 소문자(예 `cafe_peak`) (새 필드) |
| `website` | 사용자가 '홈페이지·SNS 주소'에 적은 값. 비어 있고 INSTAGRAM 이면 `https://www.instagram.com/<아이디>` 를 넣어 보냄(서버에 instagram 칸이 생기기 전에도 관리자 화면에서 보이게) |

나머지 필드(type·organization·contactName·privacyAgreed …)는 그대로.

## 서버에 필요한 것

1. `CreateInquiryRequest`
   - `phone`: `@NotBlank` 제거(형식 `@Pattern` 은 유지, null 허용)
   - `contactMethod`: enum `PHONE|EMAIL|INSTAGRAM`, null 이면 `PHONE` 으로 본다(옛 폼 호환)
   - `instagram`: `@Pattern("^[a-z0-9._]{1,30}$")`
   - `@AssertTrue` "선택한 연락 방법의 연락처를 입력해 주세요": 고른 방법에 맞는 칸이 비어 있지 않아야 한다
2. `inquiries` 테이블에 `contact_method VARCHAR(16)`, `instagram VARCHAR(30)` 추가, `phone` NULL 허용
3. 응답·관리자 API 항목에 `contactMethod`, `instagram` 추가
4. 웹훅 한 줄의 연락처 자리를 고른 방법의 값으로(예 `인스타 @cafe_peak`, `메일 owner@example.com`)
5. 계약서 contracts/b2b-inquiries.md 갱신

## 랜딩 쪽 정규화(b2b/b2b.js `normalizeContact`)

- 공통: NFKC(전각 숫자·＠·． → 반각), 앞뒤 공백 제거
- 전화: 숫자·맨 앞 + 만 남김 → `+82`/`82` 를 0 으로 → `^0\d{8,10}$` 또는 대표번호 `^1[568]\d{6}$`
- 이메일: 모든 공백 제거, 소문자, `이름@도메인.최상위(2자 이상)`, 120자 이하
- 인스타: `https://`, `www.`/`m.instagram.com/`, `@` 제거, `/ ? #` 뒤 버림, 소문자 → `^[a-z0-9._]{1,30}$`, 마침표로 시작·끝·연속 금지
서버도 같은 규칙으로 한 번 더 검사하면 된다.
