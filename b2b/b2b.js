/* /b2b/ 문의 폼 (2026-11-03) — 브리프 docs/b2b-inquiry-form-brief.md
   1) utm_content 변형(<html data-b2b>)에 맞춰 유형 기본 선택
   2) 모바일 고정 버튼: 히어로 버튼이 화면 밖이고 폼이 안 보일 때만
   3) 제출 → POST https://api.peakpic.app/inquiries (CORS 는 peakpic.app 만 허용 — 로컬·미리보기에선 전송 실패가 정상)
   4) 지표: js/analytics.js 가 열어 둔 window.peakpicTrack / peakpicMeta 로
      PostHog  b2b_inquiry_started{type, field}(첫 입력) · b2b_inquiry_submitted{type, utm_content, contact_method, has_message} · b2b_inquiry_failed{status, contact_method}
               b2b_contact_method{method}(연락 방법 바꿈, 2026-11-07)
               b2b_inquiry_invalid{fields, first_field}(빈 칸·형식 오류로 막힘) · b2b_inquiry_abandoned{last_field, filled_count, type}(입력 시작 후 미접수 이탈)
               b2b_more_opened(선택 칸 펼침) · cta_click{cta:'b2b_inquiry', placement: hero|proof|examples|how|faq|sticky}
               b2b_zoom_opened{src}(예시 사진 확대) · b2b_faq_opened{q}(자주 묻는 질문 펼침) — 2026-11-07
      Meta     Lead{content_category: type} — 접수 성공 때만. 광고 세트 b2b_* 의 전환 이벤트 */
(function () {
  'use strict';
  var API = 'https://api.peakpic.app/inquiries';
  // 연락 방법 선택(이메일·인스타 DM) 스위치 — 서버가 phone 없는 접수를 받기 전(caestro-server feat/b2b-contact-method 배포 + DB phone NULL 허용)엔 false.
  // false 면 '전화·문자'만 보이고 예전처럼 전화번호로만 받는다. 서버 배포 뒤 true 로 바꾸고 ?v= 를 올려 배포
  var MULTI_CONTACT = false;
  var MAIL = 'asmjjya@gmail.com';
  var form = document.getElementById('b2b-form');
  if (!form) return;

  var track = function (name, props, now) { try { if (window.peakpicTrack) window.peakpicTrack(name, props, now); } catch (e) { /* 무시 */ } };
  var meta = function (name, props) { try { if (window.peakpicMeta) window.peakpicMeta(name, props); } catch (e) { /* 무시 */ } };

  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; } }; }
  var variant = document.documentElement.getAttribute('data-b2b') || 'other';

  // 1) 유형 기본값
  var defType = { cafe: 'CAFE', festival: 'FESTIVAL', tourism: 'TOURISM' }[variant];
  if (defType) {
    var r = form.querySelector('input[name="type"][value="' + defType + '"]');
    if (r) r.checked = true;
  }

  // 2) 고정 버튼
  var sticky = document.querySelector('.b2b-sticky');
  var heroCta = document.querySelector('.b2b-hero__cta');
  var section = document.getElementById('inquiry');
  if (sticky && heroCta && section && 'IntersectionObserver' in window) {
    var link = sticky.querySelector('a');
    var heroVisible = true, formVisible = false;
    var update = function () {
      var show = !heroVisible && !formVisible;
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) link.removeAttribute('tabindex'); else link.setAttribute('tabindex', '-1');
    };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0 }).observe(heroCta);
    new IntersectionObserver(function (e) { formVisible = e[0].isIntersecting; update(); }, { threshold: 0 }).observe(section);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-b2b-cta]'), function (a) {
    a.addEventListener('click', function () {
      track('cta_click', { cta: 'b2b_inquiry', placement: a.getAttribute('data-b2b-cta') });
      // 키보드 사용자를 위해 첫 빈 칸으로 포커스(스크롤은 앵커가 한다)
      setTimeout(function () { var f = form.querySelector('input[name="organization"]'); if (f) f.focus({ preventScroll: true }); }, 450);
    });
  });

  // 예시 사진 확대 (히어로·실적·예시 섹션의 [data-zoom])
  var zoom = document.querySelector('.b2b-zoom');
  if (zoom && typeof zoom.showModal === 'function') {
    var zimg = zoom.querySelector('img');
    Array.prototype.forEach.call(document.querySelectorAll('[data-zoom]'), function (fig) {
      var img = fig.querySelector('img'); if (!img) return;
      fig.setAttribute('role', 'button');
      fig.setAttribute('tabindex', '0');
      var open = function () {
        zimg.src = img.currentSrc || img.src;
        zimg.alt = img.alt;
        zoom.showModal();
        track('b2b_zoom_opened', { src: (img.getAttribute('src') || '').split('/').pop() });
      };
      fig.addEventListener('click', open);
      fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    zoom.querySelector('.b2b-zoom__close').addEventListener('click', function () { zoom.close(); });
    zoom.addEventListener('click', function (e) { if (e.target === zoom) zoom.close(); });   // 바깥(배경) 누르면 닫기
  }
  Array.prototype.forEach.call(document.querySelectorAll('.b2b-faq__list details'), function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('b2b_faq_opened', { q: d.querySelector('summary').textContent }); });
  });

  // 글자 수
  var msg = form.querySelector('textarea[name="message"]');
  var count = form.querySelector('[data-count-for="message"]');
  if (msg && count) msg.addEventListener('input', function () { count.textContent = msg.value.length + ' / 500'; });

  // 첫 입력 + 마지막으로 만진 칸(이탈 지점)
  var started = false, submitted = false, lastField = '(none)';
  var FIELDS = ['type', 'organization', 'contactName', 'contactValue', 'region', 'preferredPeriod', 'scale', 'website', 'message', 'privacyAgreed', 'marketingAgreed'];
  function filledCount() { return FIELDS.filter(function (k) { var v = val(k); return v === true || (typeof v === 'string' && v); }).length; }
  form.addEventListener('focusin', function (e) { if (e.target.name && e.target.name !== 'fax') lastField = e.target.name; });
  form.addEventListener('input', function (e) {
    if (e.target.name && e.target.name !== 'fax') lastField = e.target.name;
    if (started) return;
    started = true;
    track('b2b_inquiry_started', { type: val('type') || '(none)', field: lastField });
  });
  // 입력을 시작하고 접수하지 않은 채 떠나면: 어느 칸에서 멈췄는지
  var abandonSent = false;
  window.addEventListener('pagehide', function () {
    if (!started || submitted || abandonSent) return;
    abandonSent = true;
    track('b2b_inquiry_abandoned', { last_field: lastField, filled_count: filledCount(), type: val('type') || '(none)' }, true);
  });
  var more = form.querySelector('.b2b-more');
  if (more) more.addEventListener('toggle', function () { if (more.open) track('b2b_more_opened'); });

  // 3) 제출
  var errBox = form.querySelector('.b2b-form__error');
  var btn = form.querySelector('.b2b-submit');
  var btnHtml = btn.innerHTML;
  var done = document.querySelector('.b2b-done');

  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.length && !el.tagName) {   // 라디오 묶음
      for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value;
      return '';
    }
    return el.type === 'checkbox' ? el.checked : String(el.value || '').trim();
  }
  /* 연락처 정규화(2026-11-07, 연락 방법 선택) — 고른 방법에 맞춰 값을 다듬고 형식을 검사한다.
     반환 { value, error }: value 는 서버로 보낼 값, error 는 화면에 띄울 문장(없으면 '')
     전화   : 공백·하이픈·괄호·점 제거, +82 / 82 로 시작하면 0 으로(+82 10… → 010…). 휴대폰·지역번호 9~11자리(0 시작) 또는 대표번호 8자리(15xx·16xx·18xx)
     이메일 : 앞뒤·중간 공백 제거, 전각 ＠·． → @ ., 소문자. 이름@도메인.최상위 형식, 120자 이하
     인스타 : @, instagram.com/ 주소, 뒤쪽 ?igsh=… · / 제거 → 아이디만. 소문자. 영문·숫자·밑줄·마침표 1~30자, 마침표로 시작·끝·연속 금지 */
  function normalizeContact(method, raw) {
    var v = String(raw || '');
    try { v = v.normalize('NFKC'); } catch (e) { /* 옛 브라우저 */ }   // 전각 숫자·＠·． → 반각
    v = v.trim();
    if (!v) return { value: '', error: '' };
    if (method === 'EMAIL') {
      v = v.replace(/[\s\u3000]+/g, '').replace(/\uFF20/g, '@').replace(/\uFF0E/g, '.').toLowerCase();
      if (v.length > 120 || !/^[^@]+@[^@.]+(\.[^@.]+)*\.[a-z]{2,}$/.test(v)) return { value: v, error: '이메일 형식을 확인해 주세요. 예: name@example.com' };
      return { value: v, error: '' };
    }
    if (method === 'INSTAGRAM') {
      v = v.replace(/\s+/g, '').replace(/^https?:\/\//i, '').replace(/^(www\.|m\.)?instagram\.com\//i, '').replace(/^@+/, '');
      v = v.split(/[/?#]/)[0].toLowerCase();
      if (!/^[a-z0-9._]{1,30}$/.test(v) || /^\.|\.$|\.\./.test(v)) return { value: v, error: '인스타그램 아이디를 확인해 주세요. 예: @cafe_peak' };
      return { value: v, error: '' };
    }
    // PHONE
    var digits = v.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
    digits = digits.replace(/^\+?82(?=[1-9])/, '0').replace(/^\+/, '');
    if (!/^0\d{8,10}$/.test(digits) && !/^1[568]\d{6}$/.test(digits)) return { value: digits, error: '전화번호를 확인해 주세요. 예: 010-1234-5678' };
    return { value: digits, error: '' };
  }

  // 연락 방법 바꾸기: 입력 칸의 키보드·자동완성·안내를 맞추고, 방법마다 적던 값을 따로 기억한다
  var CONTACT = {
    PHONE: { type: 'tel', mode: 'tel', ac: 'tel', max: 20, ph: '010-1234-5678', label: '전화번호', hint: '숫자만 적어도 돼요. 예: 01012345678' },
    EMAIL: { type: 'email', mode: 'email', ac: 'email', max: 120, ph: 'name@example.com', label: '이메일', hint: '제안서를 이메일로 보내 드려요.' },
    INSTAGRAM: { type: 'text', mode: 'text', ac: 'off', max: 60, ph: '@cafe_peak', label: '인스타그램 아이디', hint: '아이디나 프로필 주소 둘 다 돼요. DM 으로 연락드려요.' }
  };
  var contactInput = form.querySelector('input[name="contactValue"]');
  var contactHint = form.querySelector('[data-contact-hint]');
  var contactDraft = {};
  var currentMethod = 'PHONE';
  function applyMethod(m, fromUser) {
    var c = CONTACT[m] || CONTACT.PHONE;
    contactDraft[currentMethod] = contactInput.value;
    currentMethod = m;
    contactInput.type = c.type;
    contactInput.inputMode = c.mode;
    contactInput.autocomplete = c.ac;
    contactInput.maxLength = c.max;
    contactInput.placeholder = c.ph;
    contactInput.setAttribute('aria-label', c.label);
    contactInput.value = contactDraft[m] || '';
    contactInput.setCustomValidity('');
    contactHint.textContent = c.hint;
    contactHint.classList.remove('is-error');
    if (fromUser) { track('b2b_contact_method', { method: m }); contactInput.focus({ preventScroll: true }); }
  }
  function checkContact(show) {
    var r = normalizeContact(currentMethod, contactInput.value);
    contactInput.setCustomValidity(r.error);
    if (show) {
      contactHint.textContent = r.error || CONTACT[currentMethod].hint;
      contactHint.classList.toggle('is-error', !!r.error);
    }
    return r;
  }
  if (contactInput && !MULTI_CONTACT) {
    var chips = form.querySelector('.b2b-contact .b2b-chips');
    if (chips) chips.hidden = true;
    form.querySelector('.b2b-contact legend').firstChild.textContent = '연락처 ';
  }
  if (contactInput) {
    Array.prototype.forEach.call(form.querySelectorAll('input[name="contactMethod"]'), function (r) {
      r.addEventListener('change', function () { if (r.checked) applyMethod(r.value, true); });
    });
    contactInput.addEventListener('input', function () { if (contactHint.classList.contains('is-error')) checkContact(true); else checkContact(false); });
    contactInput.addEventListener('blur', function () { if (contactInput.value.trim()) checkContact(true); });
    // 다듬은 값을 칸에도 보여 준다(전화는 그대로 두고 이메일·인스타만 — 숫자만 남은 번호는 읽기 어렵다)
    contactInput.addEventListener('change', function () {
      var r = checkContact(true);
      if (!r.error && currentMethod !== 'PHONE') contactInput.value = (currentMethod === 'INSTAGRAM' ? '@' : '') + r.value;
    });
  }

  function showError(text) {
    errBox.textContent = text;
    errBox.hidden = false;
    errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function setBusy(on) {
    btn.disabled = on;
    btn.innerHTML = on ? '보내는 중…' : btnHtml;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;
    form.classList.add('is-checked');
    var contact = contactInput ? checkContact(true) : { value: '', error: '' };
    if (!form.checkValidity()) {
      // 접힌 칸에 오류가 있으면 펼친다
      var bad = form.querySelector(':invalid');
      var badNames = [];
      Array.prototype.forEach.call(form.querySelectorAll('input:invalid, select:invalid, textarea:invalid'), function (el) { if (badNames.indexOf(el.name) === -1) badNames.push(el.name); });
      track('b2b_inquiry_invalid', { fields: badNames.join(','), first_field: badNames[0] || '(none)' });
      var det = bad && bad.closest('details');
      if (det) det.open = true;
      form.reportValidity();
      return;
    }

    var body = {
      type: val('type'),
      organization: val('organization'),
      contactName: val('contactName'),
      contactMethod: currentMethod,
      privacyAgreed: true,
      marketingAgreed: val('marketingAgreed') === true,
      landingPath: location.pathname,
      fax: val('fax')
    };
    ['region', 'preferredPeriod', 'scale', 'website', 'message'].forEach(function (k) { var v = val(k); if (v) body[k] = v; });
    // 고른 연락 방법의 칸 하나만 보낸다(서버 계약 docs/b2b-contact-method-server.md).
    // 인스타는 서버에 instagram 칸이 생기기 전까지 관리자 화면에서도 보이게 website 가 비어 있으면 프로필 주소로도 넣는다
    if (currentMethod === 'EMAIL') body.email = contact.value;
    else if (currentMethod === 'INSTAGRAM') {
      body.instagram = contact.value;
      if (!body.website) body.website = 'https://www.instagram.com/' + contact.value;
    } else body.phone = contact.value;
    var utm = {};
    ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (k) { var v = params.get('utm_' + k); if (v) utm[k] = v; });
    if (Object.keys(utm).length) body.utm = utm;

    setBusy(true);
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.status === 201 || (r.status >= 200 && r.status < 300)) return success(r.data, body);
        fail(r.status, r.data);
      })
      .catch(function () { fail(0); });
  });

  function success(data, body) {
    submitted = true;
    track('b2b_inquiry_submitted', {
      type: body.type,
      utm_content: params.get('utm_content') || '(none)',
      contact_method: body.contactMethod,
      has_message: !!body.message
    }, true);
    meta('Lead', { content_category: body.type, content_name: 'b2b_inquiry' });
    var id = done.querySelector('[data-inquiry-id]');
    if (id) id.textContent = data && data.id != null ? '#' + data.id : '-';
    form.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    done.closest('.b2b-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fail(status, data) {
    setBusy(false);
    track('b2b_inquiry_failed', { status: status, contact_method: currentMethod });
    if (status === 400 && data && data.message) return showError(data.message);
    if (status === 429) return showError('요청이 많아 잠시 막혔어요. 1시간 뒤 다시 시도하거나 ' + MAIL + ' 으로 보내 주세요.');
    showError('일시적인 오류예요. 다시 시도하거나 ' + MAIL + ' 으로 보내 주세요.');
  }
})();
