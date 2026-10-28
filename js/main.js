/* PeakPic 랜딩 — 최소 JS
   1) 모바일 고정 CTA: 히어로의 CTA가 화면에서 벗어나면 표시 (설치 섹션이 보이면 숨김)
   2) 히어로 시연 영상: 파일이 없거나 재생 불가면 포스터 이미지 유지
   3) 단일 "앱 다운로드" 버튼을 방문자 OS 의 스토어로 연결 (+ 데스크톱 배지 순서)
   4) 광고 UTM → 스토어 설치 귀속(Play 리퍼러 · App Store 캠페인 링크)
   5) 푸터 연도 */
(function () {
  'use strict';

  // 1) 고정 CTA
  var sticky = document.querySelector('.sticky-cta');
  var heroCta = document.querySelector('.hero__cta');
  var installSection = document.querySelector('.install');
  if (sticky && heroCta && 'IntersectionObserver' in window) {
    var stickyLink = sticky.querySelector('a');
    var heroCtaVisible = true;
    var installVisible = false;
    var update = function () {
      var show = !heroCtaVisible && !installVisible;
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (stickyLink) {
        if (show) stickyLink.removeAttribute('tabindex');
        else stickyLink.setAttribute('tabindex', '-1');
      }
    };
    new IntersectionObserver(function (entries) {
      heroCtaVisible = entries[0].isIntersecting;
      update();
    }, { threshold: 0 }).observe(heroCta);
    if (installSection) {
      new IntersectionObserver(function (entries) {
        installVisible = entries[0].isIntersecting;
        update();
      }, { threshold: 0.2 }).observe(installSection);
    }
  }

  // 2) 히어로 영상 폴백
  var video = document.querySelector('.reel video');
  if (video && video.tagName === 'VIDEO') {
    var reel = video.closest('.reel');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var setPoster = function (on) {
      video.classList.toggle('is-poster', on);
      if (reel) reel.classList.toggle('is-poster', on);
      if (on) video.removeAttribute('autoplay');
    };
    var check = function () {
      // NETWORK_NO_SOURCE(3): 소스 선택 실패 = 파일 없음
      if (video.error || video.networkState === 3) setPoster(true);
    };
    video.addEventListener('error', function () { setPoster(true); });
    var src = video.querySelector('source');
    if (src) src.addEventListener('error', function () { setPoster(true); });
    video.addEventListener('playing', function () { setPoster(false); });
    setTimeout(check, 1200);
    setTimeout(check, 4000);
    if (reduce) {
      video.removeAttribute('autoplay');
      video.pause();
    } else {
      var p = video.play && video.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* 자동재생 차단 시 포스터 유지 */ });
    }
  }

  // 3) 단일 "앱 다운로드" 버튼(.btn-store): 방문자 OS 의 스토어로 직행. 데스크톱 등 판별 불가면 #install(공식 배지 2개)로 둔다
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = !isIOS && /Android/.test(ua);
  // 영어 페이지(/couple/en/ 등, <html lang="en">)는 국가 없는 스토어 주소 — 방문자 나라의 스토어로 자동 연결된다
  var isEn = /^en/i.test(document.documentElement.lang || '');
  var STORE = isEn ? {
    play: { url: 'https://play.google.com/store/apps/details?id=soma.project.caestro&hl=en' },
    app: { url: 'https://apps.apple.com/app/peakpic/id6807646621' }
  } : {
    play: { url: 'https://play.google.com/store/apps/details?id=soma.project.caestro&hl=ko' },
    app: { url: 'https://apps.apple.com/kr/app/peakpic/id6807646621' }
  };
  var target = isIOS ? STORE.app : (isAndroid ? STORE.play : null);
  if (target) {
    Array.prototype.forEach.call(document.querySelectorAll('.btn-store'), function (a) {
      a.href = target.url;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }
  // 데스크톱용 공식 배지: 방문자 OS와 같은 스토어를 앞으로
  var primary = isIOS ? 'app' : 'play';
  Array.prototype.forEach.call(document.querySelectorAll('.stores'), function (group) {
    var el = group.querySelector(primary === 'app' ? '.badge-app' : '.badge-play');
    if (el) el.classList.add('is-primary');
  });
  // 4) 광고 UTM → 스토어 설치 귀속 (포스터별 설치 수 → CPI 계산용)
  //   Google Play: referrer 로 utm 을 넘기면 Play Console 사용자 확보 보고서에 캠페인별 설치가 잡힌다.
  //     보고서가 utm_campaign 단위로 묶이므로 캠페인 이름에 소재(utm_content)를 합쳐 포스터별로 나눈다 (예: test_1021__couple_d)
  //   App Store: PEAKPIC_ANALYTICS.appStorePt(제공자 토큰)가 있으면 캠페인 링크(pt·ct)로 바꿔
  //     App Store Connect 앱 분석 > 획득 > 캠페인에 같은 이름으로 잡히게 한다. ct 는 40자 제한
  try {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    params.forEach(function (v, k) { if (/^utm_/.test(k) && v) utm[k] = v; });
    var creative = utm.utm_content
      ? (utm.utm_campaign ? utm.utm_campaign + '__' : '') + utm.utm_content
      : (utm.utm_campaign || '');
    if (creative) {
      var ref = [];
      Object.keys(utm).forEach(function (k) { ref.push(k + '=' + encodeURIComponent(k === 'utm_campaign' ? creative : utm[k])); });
      if (!utm.utm_campaign) ref.push('utm_campaign=' + encodeURIComponent(creative));
      var referrer = encodeURIComponent(ref.join('&'));
      Array.prototype.forEach.call(document.querySelectorAll('a[href*="play.google.com"]'), function (a) {
        if (a.href.indexOf('referrer=') === -1) a.href += (a.href.indexOf('?') === -1 ? '?' : '&') + 'referrer=' + referrer;
      });
      var pt = (window.PEAKPIC_ANALYTICS || {}).appStorePt;
      if (pt) {
        var appUrl = 'https://apps.apple.com/app/apple-store/id6807646621?pt=' + encodeURIComponent(pt) +
          '&ct=' + encodeURIComponent(creative.slice(0, 40)) + '&mt=8';
        Array.prototype.forEach.call(document.querySelectorAll('a[href*="apps.apple.com"]'), function (a) { a.href = appUrl; });
      }
    }
  } catch (e) { /* URLSearchParams 미지원 시 무시 */ }

  // 5) 연도
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
