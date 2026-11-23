/* 루트 / 전용 (2026-11-23)
   1) 쇼츠 카드(.vcard): 6초 미리보기는 화면에 보일 때만 받아 재생(모션 최소화·데이터 절약이면 포스터만). 누르면 유튜브 플레이어 창(소리 켬), 닫으면 iframe 을 빼서 멈춘다.
      JS 가 없거나 새 탭 열기면 링크 그대로 유튜브로 간다
   2) 실제 사례 컨베이어(#real): 화면 밖이면 멈춤(.is-paused)
   지표: video_opened{video: mirror|frame} · section_viewed{section:'real'} — js/analytics.js 의 window.peakpicTrack 으로 */
(function () {
  'use strict';
  var track = function (name, props) { try { if (window.peakpicTrack) window.peakpicTrack(name, props); } catch (e) { /* 무시 */ } };
  var calm = false;
  try { calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!(navigator.connection && navigator.connection.saveData); } catch (e) { /* 무시 */ }
  var hasIO = 'IntersectionObserver' in window;

  var cards = Array.prototype.slice.call(document.querySelectorAll('.vcard'));
  if (cards.length && !calm && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target.querySelector('video'); if (!v) return;
        if (en.isIntersecting && !document.querySelector('.yt-dialog[open]')) {
          if (!v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.preload = 'auto'; }
          var p = v.play(); if (p && p.catch) p.catch(function () { /* 저전력 모드 등: 포스터 그대로 */ });
        } else if (!v.paused) v.pause();
      });
    }, { threshold: 0.4 });
    cards.forEach(function (a) { io.observe(a); });
  }

  var dlg = document.querySelector('.yt-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    var box = dlg.querySelector('.yt-dialog__frame'), yt = dlg.querySelector('.yt-dialog__yt');
    var paused = [];
    cards.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + a.getAttribute('data-yt') + '?autoplay=1&playsinline=1&rel=0';
        f.title = (a.querySelector('b') || a).textContent + ' 영상';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        box.textContent = '';
        box.appendChild(f);
        yt.href = a.href;
        paused = cards.map(function (c) { return c.querySelector('video'); }).filter(function (v) { return v && !v.paused; });
        paused.forEach(function (v) { v.pause(); });
        dlg.showModal();
        track('video_opened', { video: a.getAttribute('data-vcard') });
      });
    });
    dlg.addEventListener('close', function () {
      box.textContent = '';
      paused.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
      paused = [];
    });
    dlg.querySelector('.yt-dialog__close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  var real = document.getElementById('real');
  if (real && hasIO) {
    var belt = real.querySelector('.real-belt');
    if (belt) new IntersectionObserver(function (e) { belt.classList.toggle('is-paused', !e[0].isIntersecting); }, { rootMargin: '100px 0px' }).observe(belt);
    var seen = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { track('section_viewed', { section: 'real' }); seen.disconnect(); }
    }, { threshold: 0.35 });
    seen.observe(real);
  }
})();
