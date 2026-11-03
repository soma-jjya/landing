/* /b2b/ 문의 폼 (2026-11-03) — 브리프 docs/b2b-inquiry-form-brief.md
   1) utm_content 변형(<html data-b2b>)에 맞춰 유형 기본 선택
   2) 모바일 고정 버튼: 히어로 버튼이 화면 밖이고 폼이 안 보일 때만
   3) 제출 → POST https://api.peakpic.app/inquiries (CORS 는 peakpic.app 만 허용 — 로컬·미리보기에선 전송 실패가 정상)
   4) 지표: js/analytics.js 가 열어 둔 window.peakpicTrack / peakpicMeta 로
      PostHog  b2b_inquiry_started{type, field}(첫 입력) · b2b_inquiry_submitted{type, utm_content, has_email, has_message} · b2b_inquiry_failed{status}
               b2b_inquiry_invalid{fields, first_field}(빈 칸·형식 오류로 막힘) · b2b_inquiry_abandoned{last_field, filled_count, type}(입력 시작 후 미접수 이탈)
               b2b_more_opened(선택 칸 펼침) · cta_click{cta:'b2b_inquiry', placement: hero|sticky}
      Meta     Lead{content_category: type} — 접수 성공 때만. 광고 세트 b2b_* 의 전환 이벤트 */
(function () {
  'use strict';
  var API = 'https://api.peakpic.app/inquiries';
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

  // 글자 수
  var msg = form.querySelector('textarea[name="message"]');
  var count = form.querySelector('[data-count-for="message"]');
  if (msg && count) msg.addEventListener('input', function () { count.textContent = msg.value.length + ' / 500'; });

  // 첫 입력 + 마지막으로 만진 칸(이탈 지점)
  var started = false, submitted = false, lastField = '(none)';
  var FIELDS = ['type', 'organization', 'contactName', 'phone', 'email', 'region', 'preferredPeriod', 'scale', 'website', 'message', 'privacyAgreed', 'marketingAgreed'];
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
  /* 연락처 정규화: 공백·하이픈·괄호·점을 지우고 숫자(맨 앞 + 허용)만 보낸다. 010 1234 5678, 010-1234-5678, (02)1234-5678 모두 같은 값 */
  function normalizePhone(raw) {
    var v = String(raw || '').trim();
    var plus = v.charAt(0) === '+' ? '+' : '';
    return plus + v.replace(/[^0-9]/g, '');
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
      phone: normalizePhone(val('phone')),
      privacyAgreed: true,
      marketingAgreed: val('marketingAgreed') === true,
      landingPath: location.pathname,
      fax: val('fax')
    };
    ['email', 'region', 'preferredPeriod', 'scale', 'website', 'message'].forEach(function (k) { var v = val(k); if (v) body[k] = v; });
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
      has_email: !!body.email,
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
    track('b2b_inquiry_failed', { status: status });
    if (status === 400 && data && data.message) return showError(data.message);
    if (status === 429) return showError('요청이 많아 잠시 막혔어요. 1시간 뒤 다시 시도하거나 ' + MAIL + ' 으로 보내 주세요.');
    showError('일시적인 오류예요. 다시 시도하거나 ' + MAIL + ' 으로 보내 주세요.');
  }
})();
