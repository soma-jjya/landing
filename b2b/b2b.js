/* /b2b/ 문의 폼 (2026-11-03) — 브리프 docs/b2b-inquiry-form-brief.md
   1) utm_content 변형(<html data-b2b>)에 맞춰 유형 기본 선택
   2) 모바일 고정 버튼: 히어로 버튼이 화면 밖이고 폼이 안 보일 때만
   3) 제출 → POST https://api.peakpic.app/inquiries (CORS 는 peakpic.app 만 허용 — 로컬·미리보기에선 전송 실패가 정상)
   4) 지표: js/analytics.js 가 열어 둔 window.peakpicTrack / peakpicMeta 로
      PostHog  b2b_inquiry_started{type, field}(첫 입력) · b2b_inquiry_submitted{type, utm_content, contact_method, has_message} · b2b_inquiry_failed{status, contact_method}
               b2b_contact_method{method}(연락 방법 바꿈, 2026-11-07)
               b2b_inquiry_invalid{fields, first_field}(빈 칸·형식 오류로 막힘) · b2b_inquiry_abandoned{last_field, filled_count, type}(입력 시작 후 미접수 이탈)
               b2b_more_opened(선택 칸 펼침) · cta_click{cta:'b2b_inquiry', placement: hero|proof|how|faq|sticky} (examples 는 2026-11-24 섹션과 함께 빠짐)
               b2b_zoom_opened{src}(예시 사진 확대) · b2b_faq_opened{q}(자주 묻는 질문 펼침) — 2026-11-07
               b2b_video_opened{video: shop|gstar|yuja}(업종별 사례 영상 재생) · b2b_case_scene{scene: shop|festival|tourism}(그 장면이 화면에 들어옴, 2026-11-24부터 장면마다 한 번) · section_viewed{section:'cases'} · cta_click placement=cases — 2026-11-23
               b2b_demo_step{step: 1~4}(히어로 실제 과정의 단계를 누름) — 2026-11-23
      Meta     Lead{content_category: type} — 접수 성공 때만. 광고 세트 b2b_* 의 전환 이벤트 */
(function () {
  'use strict';
  var API = 'https://api.peakpic.app/inquiries';
  // 연락 방법 선택(이메일·인스타 DM) 스위치 — 서버가 phone 없는 접수를 받기 전(caestro-server feat/b2b-contact-method 배포 + DB phone NULL 허용)엔 false.
  // false 면 '전화·문자'만 보이고 예전처럼 전화번호로만 받는다. 서버 배포 뒤 true 로 바꾸고 ?v= 를 올려 배포
  var MULTI_CONTACT = true;   // 2026-11-07 서버 PR #234 운영 배포 확인 → 켬
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

  var calm = false;   // 모션 최소화·데이터 절약이면 사례 장면의 움직임·미리보기 자동재생을 하지 않는다
  try { calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!(navigator.connection && navigator.connection.saveData); } catch (e) { /* 무시 */ }

  // 히어로 실제 과정 (2026-11-23, .b2b-demo): 페이지가 다 뜬 뒤 영상을 받아 재생하고(첫 로드 예산 밖), 영상 시간에 맞춰 단계를 켠다(--p = 그 단계 진행률).
  // 단계를 누르면 그 장면으로. 히어로가 화면 밖이면 멈춤. 모션 최소화·데이터 절약이면 영상 없이 포스터(완성 장면) + 마지막 단계만 켬
  var demo = document.querySelector('.b2b-demo');
  if (demo) {
    var dv = demo.querySelector('video');
    var steps = Array.prototype.slice.call(demo.querySelectorAll('.b2b-demo__steps button'));
    var at = steps.map(function (b) { return parseFloat(b.getAttribute('data-at')) || 0; });
    var total = parseFloat(demo.getAttribute('data-total')) || 16;
    var shown = -1;
    var mark = function (t) {
      var i = 0;
      for (var k = 0; k < at.length; k++) if (t >= at[k] - 0.05) i = k;
      if (i !== shown) {
        steps.forEach(function (b, k) { b.classList.toggle('is-on', k === i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
        shown = i;
      }
      var end = i + 1 < at.length ? at[i + 1] : total;
      steps[i].style.setProperty('--p', Math.min(1, Math.max(0, (t - at[i]) / (end - at[i]))).toFixed(3));
    };
    mark(at[at.length - 1]);
    steps[steps.length - 1].style.setProperty('--p', '1');
    if (dv && !calm) {
      var heroOn = true, raf = 0;
      var tick = function () { mark(dv.currentTime); raf = (!dv.paused && heroOn) ? requestAnimationFrame(tick) : 0; };
      dv.addEventListener('playing', function () { if (!raf) raf = requestAnimationFrame(tick); });
      var startDemo = function () {
        if (dv.getAttribute('src')) return;
        dv.src = dv.getAttribute('data-src'); dv.preload = 'auto';
        var p = dv.play(); if (p && p.catch) p.catch(function () { /* 저전력 모드 등: 포스터 그대로 */ });
      };
      if (document.readyState === 'complete') setTimeout(startDemo, 150);
      else window.addEventListener('load', function () { setTimeout(startDemo, 150); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          heroOn = e[0].isIntersecting;
          if (!dv.getAttribute('src')) return;
          if (heroOn) { var p = dv.play(); if (p && p.catch) p.catch(function () {}); } else dv.pause();
        }, { threshold: 0.15 }).observe(demo);
      }
      steps.forEach(function (b, k) {
        b.addEventListener('click', function () {
          startDemo();
          if (dv.readyState >= 1) dv.currentTime = at[k];
          else dv.addEventListener('loadedmetadata', function () { dv.currentTime = at[k]; }, { once: true });
          var p = dv.play(); if (p && p.catch) p.catch(function () {});
          mark(at[k]);
          track('b2b_demo_step', { step: k + 1 });
        });
      });
    }
  }

  // 업종별 실제 사례 (#cases): 2026-11-24 세 업종을 한 열로 이어 붙임(그전엔 화면에 붙은 무대에서 스크롤로 장면을 바꿨다).
  // 장면마다: 실제 사진 벽(data-imgs → 비스듬한 기둥, 데이터 절약이면 안 만듦) · 이음매 글자 테이프 · 비눗방울(모션 최소화·데이터 절약이면 없음).
  // .is-live(모션 최소화·데이터 절약·IntersectionObserver 없음이면 안 붙음): 화면에 들어오면(.is-on, 한 번) 카드가 3D 로 뒤집혀 들어오고 도장·종이 조각,
  // 보이는 동안(.is-vis) 벽·테이프·방울이 움직이고 미리보기 재생, 스크롤에 따라 카드가 살짝 돌고(--tilt·--rot) 벽이 밀린다(--py).
  // 카드를 누르면: 매장 = 원본 영상(소리 켬), 나머지 = 유튜브 창
  var story = document.querySelector('.b2b-story');
  var scenes = story ? Array.prototype.slice.call(story.querySelectorAll('.b2b-scene')) : [];
  var cards = scenes.map(function (sc) { return sc.querySelector('.b2b-scene__card'); });
  var player = document.querySelector('.b2b-video');
  var saveData = false;
  try { saveData = !!(navigator.connection && navigator.connection.saveData); } catch (e) { /* 무시 */ }
  var syncPreviews = function () {   // 카드가 보이는 장면(.is-play) 미리보기만 재생(영상 창이 열려 있으면 모두 멈춤)
    scenes.forEach(function (sc) {
      var v = sc.querySelector('video'); if (!v) return;
      if (sc.classList.contains('is-play') && !(player && player.open)) {
        if (!v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.preload = 'auto'; }
        var p = v.play(); if (p && p.catch) p.catch(function () { /* 저전력 모드 등: 포스터 그대로 */ });
      } else if (!v.paused) v.pause();
    });
  };
  // 사진 벽: 기둥 수는 화면 너비로, 기둥마다 목록을 다른 자리부터 돌려 옆 기둥과 겹치지 않게. 같은 목록 두 벌이라 -50% 이동이 이음매 없이 반복된다
  var buildWalls = function () {
    scenes.forEach(function (sc) {
      var wall = sc.querySelector('.b2b-scene__wall'); if (!wall) return;
      var imgs = (wall.getAttribute('data-imgs') || '').split(/\s+/).filter(Boolean); if (!imgs.length) return;
      var W = sc.offsetWidth * 1.36, H = sc.offsetHeight * 1.6;
      var cols = Math.max(4, Math.min(9, Math.round(W / (W >= 1100 ? 210 : 120))));
      var colW = W / cols, per = Math.max(5, Math.ceil(H / (colW * 1.25)) + 1);
      var html = '', stride = Math.max(1, Math.round(imgs.length / cols)) + 1;
      for (var c = 0; c < cols; c++) {
        var list = '';
        for (var j = 0; j < per; j++) list += '<img src="' + imgs[(c * stride + j) % imgs.length] + '" alt="" loading="lazy" decoding="async">';
        html += '<div class="b2b-wall__col" style="--wd:' + (54 + (c * 7) % 26) + 's;--wdl:-' + ((c * 13) % 40) + 's">' + list + list + '</div>';
      }
      wall.innerHTML = html;
    });
  };
  if (story && scenes.length) {
    if (!saveData) {
      buildWalls();
      var wallW = window.innerWidth, wallTimer;
      window.addEventListener('resize', function () {   // 너비가 크게 바뀌면(회전 등) 기둥 수를 다시
        clearTimeout(wallTimer);
        wallTimer = setTimeout(function () { if (Math.abs(window.innerWidth - wallW) > 120) { wallW = window.innerWidth; buildWalls(); } }, 300);
      });
    }
    // 글자 테이프: 단어 사이에 반짝이 모양, 같은 줄 두 벌이라 -50% 흐름이 이어진다
    Array.prototype.slice.call(story.querySelectorAll('.b2b-tape')).forEach(function (t) {
      var words = (t.getAttribute('data-words') || '').split(' ').map(function (w) { return '<b>' + w + '</b>'; }).join('');
      var line = ''; for (var k = 0; k < 6; k++) line += words;
      t.innerHTML = '<span>' + line + line + '</span>';
    });
  }
  if (story && scenes.length && !calm && 'IntersectionObserver' in window) {
    story.classList.add('is-live');
    // 비눗방울: 장면마다 크기·위치·속도·흔들림을 섞어서. 작은 화면은 적게
    scenes.forEach(function (sc) {
      var box = sc.querySelector('.b2b-scene__bubbles'); if (!box) return;
      var nB = window.innerWidth >= 900 ? 12 : 8, bh = '';
      for (var bi = 0; bi < nB; bi++) {
        var big = bi % 4 === 0, size = big ? 70 + Math.random() * 60 : 18 + Math.random() * 44, dur = 9 + Math.random() * 9 + (big ? 4 : 0);
        bh += '<span class="b2b-bubble' + (bi % 2 ? ' b2b-bubble--b' : '') + '" style="--x:' + (2 + ((bi * 37) % 92) + Math.random() * 4).toFixed(1) + '%;--s:' + size.toFixed(0) + 'px;--d:' + dur.toFixed(1) +
          's;--dl:-' + (Math.random() * dur).toFixed(1) + 's;--o:' + (0.55 + Math.random() * 0.4).toFixed(2) + ';--sw:' + (6 + Math.random() * 14).toFixed(0) + 'px;--sd:' + (2.2 + Math.random() * 2).toFixed(1) + 's"><i></i></span>';
      }
      box.innerHTML = bh;
    });
    var COLORS = { shop: ['#ff5a47', '#ffffff', '#ffb4a8', '#ff2d55'], festival: ['#ffd400', '#5ec8ff', '#ffffff', '#ff5ab4'], tourism: ['#ffc21a', '#ffffff', '#ff9f1a', '#2bb673'] };
    var pop = function (sc) {   // 카드 자리에서 종이 조각
      var burst = sc.querySelector('.b2b-scene__burst'), card = sc.querySelector('.b2b-scene__card'); if (!burst || !card) return;
      var r = sc.getBoundingClientRect(), c = card.getBoundingClientRect();
      burst.style.setProperty('--bx', (c.left + c.width / 2 - r.left).toFixed(0) + 'px');
      burst.style.setProperty('--by', (c.top + c.height / 2 - r.top).toFixed(0) + 'px');
      var cs = COLORS[sc.getAttribute('data-cat')] || COLORS.shop;
      for (var k = 0; k < 46; k++) {
        var el = document.createElement('i'); el.className = 'b2b-confetti';
        var ang = Math.random() * Math.PI * 2, dist = 140 + Math.random() * Math.min(window.innerWidth, 900) * 0.42;
        el.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        el.style.setProperty('--dy', Math.round(Math.sin(ang) * dist * 0.8 + 60) + 'px');
        el.style.setProperty('--r', Math.round((Math.random() - 0.5) * 900) + 'deg');
        el.style.setProperty('--c', cs[k % cs.length]);
        var round = k % 3 === 0;
        el.style.setProperty('--w', (round ? 10 : 7 + Math.random() * 8) + 'px');
        el.style.setProperty('--h', (round ? 10 : 10 + Math.random() * 10) + 'px');
        el.style.setProperty('--br', round ? '50%' : '2px');
        el.style.animationDelay = (0.25 + Math.random() * 0.12).toFixed(2) + 's';
        burst.appendChild(el);
        setTimeout(function (n) { return function () { if (n.parentNode) n.parentNode.removeChild(n); }; }(el), 1800);
      }
    };
    var rafS = 0;
    var measure = function () {   // 보이는 장면만: 화면 가운데와의 거리(-1~1)로 카드 기울기·벽 밀림
      rafS = 0;
      var vh = window.innerHeight;
      scenes.forEach(function (sc) {
        if (!sc.classList.contains('is-vis')) return;
        var r = sc.getBoundingClientRect();
        var q = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
        var side = sc.getAttribute('data-cat') === 'festival' ? -1 : 1;
        sc.style.setProperty('--tilt', (q * -12 * side).toFixed(2) + 'deg');
        sc.style.setProperty('--rot', (q * 3 * side - side).toFixed(2) + 'deg');
        sc.style.setProperty('--py', (q * 90).toFixed(1));
      });
    };
    var onScroll = function () { if (!rafS) rafS = requestAnimationFrame(measure); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    var visIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('is-vis', en.isIntersecting);
        if (en.isIntersecting) en.target.classList.add('is-seen');
      });
      syncPreviews(); onScroll();
    }, { rootMargin: '120px 0px' });
    var onIO = new IntersectionObserver(function (entries) {   // 장면의 30% 가 보이면 한 번 들어온다
      entries.forEach(function (en) {
        if (!en.isIntersecting || en.target.classList.contains('is-on')) return;
        var sc = en.target;
        sc.classList.add('is-on'); pop(sc);
        setTimeout(function () { sc.classList.add('is-settled'); }, 1000);   // 들어온 뒤엔 스크롤 기울기를 빠르게 따라간다
        track('b2b_case_scene', { scene: sc.getAttribute('data-cat') });
        onIO.unobserve(sc);
      });
    }, { threshold: 0.3 });
    var playIO = new IntersectionObserver(function (entries) {   // 카드가 40% 이상 보일 때만 미리보기 재생
      entries.forEach(function (en) { en.target.closest('.b2b-scene').classList.toggle('is-play', en.isIntersecting); });
      syncPreviews();
    }, { threshold: 0.4 });
    scenes.forEach(function (sc) { visIO.observe(sc); onIO.observe(sc); var cd = sc.querySelector('.b2b-scene__card'); if (cd) playIO.observe(cd); });
  } else if (scenes.length) {
    scenes.forEach(function (sc) { sc.classList.add('is-vis'); });   // 움직임 없이: 미리보기는 자동재생하지 않고 포스터만
  }
  if (player && typeof player.showModal === 'function' && cards.length) {
    var box = player.querySelector('.b2b-video__frame'), yt = player.querySelector('.b2b-video__yt');
    cards.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        box.textContent = '';
        if (a.getAttribute('data-play') === 'local') {   // 매장: 받아 둔 원본 영상을 소리와 함께
          var v = document.createElement('video');
          v.src = a.getAttribute('data-full'); v.controls = true; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', '');
          box.appendChild(v);
          yt.textContent = '인스타그램에서 보기';
        } else {
          var f = document.createElement('iframe');
          f.src = 'https://www.youtube-nocookie.com/embed/' + a.getAttribute('data-yt') + '?autoplay=1&playsinline=1&rel=0';
          f.title = '현장 영상';
          f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          f.allowFullscreen = true;
          box.appendChild(f);
          yt.textContent = 'YouTube에서 보기';
        }
        yt.href = a.href;
        player.showModal();
        syncPreviews();
        track('b2b_video_opened', { video: a.getAttribute('data-case') });
      });
    });
    player.addEventListener('close', function () {
      box.textContent = '';
      if (story && story.classList.contains('is-live')) syncPreviews();
    });
    player.querySelector('.b2b-video__close').addEventListener('click', function () { player.close(); });
    player.addEventListener('click', function (e) { if (e.target === player) player.close(); });
  }
  var casesSec = document.getElementById('cases');   // section_viewed 목록(js/analytics.js)은 공유 파일이라 이 섹션만 여기서
  if (casesSec && 'IntersectionObserver' in window) {
    var casesIO = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { track('section_viewed', { section: 'cases' }); casesIO.disconnect(); }
    }, { threshold: 0.1 });
    casesIO.observe(casesSec);
  }

  // 예시 사진 확대 (히어로·실적·예시 섹션의 [data-zoom]). 누르기는 문서 한 곳에서 받는다 — 컨베이어 복제본(창 크기가 바뀌면 다시 만든다)도 눌린다. 포커스는 원본만
  var zoom = document.querySelector('.b2b-zoom');
  if (zoom && typeof zoom.showModal === 'function') {
    var zimg = zoom.querySelector('img');
    var openZoom = function (fig) {
      var img = fig.querySelector('img'); if (!img) return;
      zimg.src = img.getAttribute('data-full') || img.currentSrc || img.src;   // 컨베이어 그림은 작게 싣고 크게 볼 때만 큰 그림(data-full)
      zimg.alt = img.alt;
      zoom.showModal();
      track('b2b_zoom_opened', { src: (img.getAttribute('src') || '').split('/').pop() });
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-zoom]'), function (fig) {
      if (fig.closest('[data-clone]')) return;
      fig.setAttribute('role', 'button');
      fig.setAttribute('tabindex', '0');
      fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(fig); } });
    });
    document.addEventListener('click', function (e) {
      var fig = e.target.closest && e.target.closest('[data-zoom]');
      if (fig) openZoom(fig);
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
