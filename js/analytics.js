/* PeakPic 랜딩 — PostHog 지표
   설정은 index.html <head> 의 window.PEAKPIC_ANALYTICS = { key, host, uiHost } 에서 한다.
   key 가 비어 있으면 아무것도 하지 않는다(로컬·미리보기 안전).

   이벤트 설계 (광고 소재 비교가 목적):
   - $pageview / $pageleave  자동. utm_* 가 이벤트·사람 속성에 붙는다
   - ad_creative, ad_campaign  super property — 모든 이벤트에 utm_content/utm_campaign 을 복사해 breakdown 을 쉽게
   - ad_placement              super property — utm_term (메타 동적 값 {{placement}}: 노출 위치별 이탈·전환 비교)
   - landing_variant           super property — 랜딩 변형 (main / couple / fourcut). 페이지 head 의 PEAKPIC_ANALYTICS.variant
   - section_viewed {section}  hero · pain · mirroring · pose · my-frame · install 이 35% 이상 보일 때 각 1회
   - scroll_depth {percent}    25 · 50 · 75 · 100 각 1회
   - cta_click {cta, placement} 헤더·고정 "앱 다운로드" (설치 섹션으로 스크롤)
   - store_click {store, placement, os}  스토어로 가는 링크 클릭(단일 버튼·공식 배지 모두) = 랜딩의 전환 지표
   - hero_video_play           시연 영상이 실제로 재생된 경우 1회
   퍼널: $pageview → section_viewed(install) → store_click, breakdown by ad_creative

   Meta 픽셀 (2026-10-20, 광고 최적화용 — PEAKPIC_ANALYTICS.metaPixelId 가 있을 때만)
   - PageView     페이지 로드 시
   - ViewContent  (표준, 2026-10-26) 페이지 로드 시 {content_name: 변형}
   - Lead         (표준, 2026-10-26) store_click 과 같은 순간 — 새 캠페인(리드 목표)의 최적화 이벤트
   - StoreClick   (custom) store_click 과 같은 순간. 기존 테스트 캠페인 호환용으로 유지 {store, placement, os, landing_variant, ad_creative}
                  광고 관리자에서 "맞춤 전환"으로 만들어 최적화·성과 지표로 쓴다 */
(function () {
  'use strict';
  var cfg = window.PEAKPIC_ANALYTICS || {};

  /* ---- Meta 픽셀 (공식 기본 코드) ---- */
  var metaTrack = function () {};
  var metaStd = function () {};
  if (cfg.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.metaPixelId);
    fbq('track', 'PageView');
    // 2026-10-26 멘토 피드백: 표준 이벤트로 최적화. 랜딩 도착 = ViewContent, 스토어 클릭 = Lead
    try { fbq('track', 'ViewContent', { content_name: cfg.variant || 'main', content_category: 'landing' }); } catch (e) { /* 무시 */ }
    metaTrack = function (name, props) { try { fbq('trackCustom', name, props || {}); } catch (e) { /* 수집 실패는 무시 */ } };
    metaStd = function (name, props) { try { fbq('track', name, props || {}); } catch (e) { /* 수집 실패는 무시 */ } };
  }

  if (!cfg.key) return;

  /* ---- PostHog 공식 로더 스니펫 (array.js 로드 전 호출을 큐에 쌓는다) ---- */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  var params = {};
  try { new URLSearchParams(window.location.search).forEach(function (v, k) { params[k] = v; }); } catch (e) { /* 구형 브라우저 */ }
  var ua = navigator.userAgent || '';
  var os = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : (/Android/.test(ua) ? 'android' : 'other');

  posthog.init(cfg.key, {
    api_host: cfg.host || 'https://us.i.posthog.com',
    ui_host: cfg.uiHost || 'https://us.posthog.com',
    person_profiles: 'identified_only',   // 익명 방문자는 사람 프로필을 만들지 않아 비용 절감. utm 은 이벤트 속성으로 남는다
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,                     // 클릭 히트맵용. 핵심 지표는 아래 커스텀 이벤트로 본다
    loaded: function (ph) {
      // 모든 이벤트에 소재·캠페인·OS 를 붙여 breakdown 을 쉽게 한다
      ph.register({
        ad_creative: params.utm_content || '(none)',
        ad_campaign: params.utm_campaign || '(none)',
        ad_source: params.utm_source || '(direct)',
        ad_placement: params.utm_term || '(none)',   // 2026-10-26: 메타 URL 의 utm_term={{placement}} (피드·스토리·릴스 등)
        visitor_os: os,
        landing_variant: cfg.variant || 'main'   // 랜딩 변형 (main / couple / fourcut)
      });
    }
  });

  var track = function (name, props) { try { posthog.capture(name, props || {}); } catch (e) { /* 수집 실패는 무시 */ } };
  // 페이지를 떠나는 순간의 이벤트(스토어 클릭)는 배치 대기 없이 바로 보낸다 — iOS 인앱 브라우저에서 유실이 컸다(2026-10-24 분석)
  var trackNow = function (name, props) { try { posthog.capture(name, props || {}, { send_instantly: true, transport: 'sendBeacon' }); } catch (e) { /* 수집 실패는 무시 */ } };

  // 1) 섹션 노출
  var sections = [['hero', '.hero'], ['pain', '.pain'], ['mirroring', '#mirroring'], ['pose', '#pose'], ['my-frame', '#my-frame'], ['install', '#install']];
  if ('IntersectionObserver' in window) {
    sections.forEach(function (s) {
      var el = document.querySelector(s[1]); if (!el) return;
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { track('section_viewed', { section: s[0] }); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(el);
    });
  }

  // 2) 스크롤 깊이
  var marks = [25, 50, 75, 100], fired = {};
  var onScroll = function () {
    var doc = document.documentElement;
    var depth = Math.round((window.scrollY + window.innerHeight) / Math.max(1, doc.scrollHeight) * 100);
    marks.forEach(function (m) { if (!fired[m] && depth >= m) { fired[m] = true; track('scroll_depth', { percent: m }); } });
    if (fired[100]) window.removeEventListener('scroll', onScroll);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // 3) CTA · 스토어 클릭 (이벤트 위임)
  var placementOf = function (el) {
    if (el.closest('.sticky-cta')) return 'sticky';
    if (el.closest('.header')) return 'header';
    if (el.closest('.hero')) return 'hero';
    if (el.closest('.install')) return 'install';
    return 'other';
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a'); if (!a) return;
    var href = a.getAttribute('href') || '';   // 단일 버튼(.btn-store)은 main.js 가 OS 에 맞는 스토어 URL 로 바꿔 두므로 href 로 판별
    var store = /play\.google\.com/.test(href) ? 'google_play' : (/apps\.apple\.com/.test(href) ? 'app_store' : null);
    if (store) {
      trackNow('store_click', { store: store, placement: placementOf(a), os: os });
      metaStd('Lead', { content_name: cfg.variant || 'main', content_category: store });
      metaTrack('StoreClick', { store: store, placement: placementOf(a), os: os, landing_variant: cfg.variant || 'main', ad_creative: params.utm_content || '(none)' });
    } else if (href === '#install') {
      track('cta_click', { cta: 'app_download', placement: placementOf(a) });
    } else if (a.closest('.hero__more')) {
      track('cta_click', { cta: 'see_how', placement: 'hero' });   // 2026-10-27 네컷 히어로 '어떻게 찍는지 보기'
    }
  }, true);

  // 4) 히어로 영상
  var video = document.querySelector('.reel video');
  if (video) video.addEventListener('playing', function () { track('hero_video_play'); }, { once: true });
})();
