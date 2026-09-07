/* PeakPic 랜딩 — 최소 JS
   1) 모바일 고정 CTA: 히어로의 CTA가 화면에서 벗어나면 표시 (설치 섹션이 보이면 숨김)
   2) 히어로 시연 영상: 파일이 없거나 재생 불가면 포스터 유지 + "시연 영상 준비 중" 표시
   3) 푸터 연도 */
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

  // 3) 연도
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
