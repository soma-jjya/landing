/* PeakPic 랜딩 — 페이지 전체 3D 무대 (three.js r170, 2026-11-11 3차 "전체를 3D 로, 영상 보듯이") — 모든 랜딩(루트·/couple/·/fourcut/ + 다국어·/b2b/, 같은 날 4차)
   화면에 고정된 캔버스 하나(.stage3d)가 섹션 배경 위·글 아래에 깔리고, 스크롤이 곧 영상의 재생 위치가 된다.
   - 히어로: 폴라로이드 2장·테이프·로고 스티커 + 둘레에 떠다니는 사진 카드(CLOUD). "찰칵"(7초 루프·콜라주 누르기)마다 플래시, 카드가 튕기고 한 장이 튀어나온다
   - 기능 섹션(.cluster): 큰 사진·폰 화면·네컷이 3D 카드가 되어, 스크롤에 맞춰 뒤에서 돌며 날아와 자리 잡고 지나가면 카메라 쪽으로 빠져나간다
   - 페이지 전체: 깊이가 다른 사진 카드들이 스크롤을 따라 흘러간다(가까운 건 빠르게, 먼 건 느리게)
   - 영상 느낌: 헤더 아래 재생 막대(스크롤 진행)
   - 변형별: 히어로에 폴라로이드 콜라주(.collage > .reel)가 있으면(루트·/couple/) 그 사진까지 3D. /fourcut/(.booth)·/b2b/(.b2b-frames)는 히어로 그림은 DOM 그대로 두고 둘레 카드만.
     루트 밖에서는 떠다니는 카드 사진을 그 페이지에 실린 사진에서 먼저 고른다(나라별 모델 사진이 그대로 쓰인다)
   위치·크기·기울기는 DOM 을 재서 옮긴다 → 배치는 css/style.css 만 고치면 된다. 말풍선·스티커·글은 DOM 그대로(캔버스 위).
   - 꺼지는 경우: 모션 최소화 설정(전부), 데이터 절약 모드·느린 회선(2g·3g)·메모리 4GB 미만 기기·WebGL 없음/컨텍스트 유실(3D 만) → 원래 DOM 페이지가 그대로 보인다
   - three.js 는 load + idle 뒤에 동적 import (LCP·초기 로드 예산에 넣지 않는다). 섹션 사진은 그 섹션이 가까워질 때 받는다
   - 로딩(2026-11-11 5차 "모바일에서 느리다"): three.js 는 쓰는 것만 묶은 js/vendor/three.peakpic.min.js(gzip 128KB, 전체판 171KB).
     다시 만들기: `export { WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, PlaneGeometry, ShapeGeometry, ExtrudeGeometry, Shape, MeshBasicMaterial, CanvasTexture, VideoTexture, Vector3, SRGBColorSpace } from 'three'`
     한 줄짜리 entry.js 를 `esbuild entry.js --bundle --format=esm --minify --target=es2019` (three@0.170.0). 여기서 THREE.xxx 를 새로 쓰면 그 목록에도 추가할 것.
     셰이더는 첫 프레임 전에 멈춤 없이 미리 컴파일(warmUp). 좁은 화면에서는 무거운 사진(onboarding-*, 각 110KB 이상)을 떠다니는 카드에 쓰지 않는다
   - 탭이 숨겨지면 렌더 루프를 멈춘다 */

const collage = document.querySelector('.hero .collage');
const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection;
const saveData = conn && conn.saveData;
const slowNet = conn && /(^|-)2g$|^3g$/.test(conn.effectiveType || '');
const lowMem = navigator.deviceMemory && navigator.deviceMemory < 4;
const hasCards = !!(collage && collage.querySelector('.reel'));
const anchor = hasCards ? collage : document.querySelector('.hero .booth, .b2b-hero .b2b-frames');   // 히어로 무대의 중심
const root = document.documentElement;

function stageOff() {
  root.classList.remove('has-stage');
  if (collage) collage.classList.remove('is-3d');
  Array.prototype.forEach.call(document.querySelectorAll('.in-3d'), (el) => el.classList.remove('in-3d'));
}

if (anchor && !reduce) {
  videoUi();
  if (!saveData && !slowNet && !lowMem) {
    const kick = () => {
      const run = () => init().catch(stageOff);
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
      else setTimeout(run, 300);
    };
    if (document.readyState === 'complete') kick();
    else window.addEventListener('load', kick, { once: true });
  }
}

// ---------- 영상 느낌: 재생 막대(스크롤 진행) ----------
function videoUi() {
  const bar = document.createElement('div');
  bar.className = 'reel-bar';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  const maxScroll = () => Math.max(1, root.scrollHeight - window.innerHeight);
  let barTick = false;
  const drawBar = () => { barTick = false; bar.style.setProperty('--k', Math.min(1, window.scrollY / maxScroll()).toFixed(4)); };
  window.addEventListener('scroll', () => { if (!barTick) { barTick = true; requestAnimationFrame(drawBar); } }, { passive: true });
  drawBar();

}

async function init() {
  const THREE = await import('./vendor/three.peakpic.min.js');

  const canvas = document.createElement('canvas');
  canvas.className = 'stage3d';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { return; }

  const hero = anchor.closest('section');
  const reel = hasCards ? collage.querySelector('.reel') : null;
  const side = hasCards ? collage.querySelector('.pola--side') : null;
  const stickerEl = hasCards ? collage.querySelector(':scope > .logo-sticker') : null;
  const video = reel && reel.querySelector('video');
  const sideImg = side && side.querySelector('img');
  const loopEl = hasCards ? collage.querySelector('.bubble--b') : null;
  const isB2b = anchor.classList.contains('b2b-frames');
  const autoFire = !isB2b;                                   // 문의 페이지는 차분하게: 7초마다 튕기는 "찰칵" 없음

  // 자산: 페이지가 이미 받은 파일을 그대로 다시 쓴다(캐시)
  const [mainPhoto, sidePhoto, stickerImg] = await Promise.all([
    loadImage(video ? video.poster : ''),
    sideImg ? loadImage(sideImg.currentSrc || sideImg.src) : null,
    stickerEl ? loadSvg(stickerEl.querySelector('img').src, 920, 540) : null,
    document.fonts && document.fonts.ready
  ]);

  // 떠다니는 카드에 쓰는 사진. 히어로 둘레 자리: x·y(화면에서 보이는 자리)·z(깊이)·w 는 콜라주 폭(cw) 배수, 원점은 콜라주 한가운데(y 위쪽 +, z 앞쪽 +).
  // kind p=폴라로이드, s=네컷·프레임 한 장. 같은 사진을 페이지 전체에 흐르는 카드(buildAmbient)에도 돌려 쓴다
  const IMG = new URL('../assets/img/', import.meta.url).href;
  const CLOUD = [
    { src: 'fourcut-cut-1.webp', kind: 'p', x: -0.52, y: 0.58, z: -0.55, w: 0.22, r: 8 },
    { src: 'couple-hero-beach.webp', kind: 'p', x: 0.66, y: 0.50, z: -0.70, w: 0.30, r: -9 },
    { src: 'fourcut-dessert.webp', kind: 's', x: 0.72, y: -0.02, z: -0.35, w: 0.26, r: 7 },
    { src: 'fourcut-cut-2.webp', kind: 'p', x: -0.60, y: -0.44, z: 0.25, w: 0.20, r: -12 },
    { src: 'fourcut-hearts-full.webp', kind: 's', x: 0.34, y: 0.64, z: -0.90, w: 0.28, r: -6 },
    { src: 'onboarding-2.webp', kind: 'p', x: 0.22, y: -0.66, z: 0.30, w: 0.26, r: 5 },
    { src: 'fourcut-cut-3.webp', kind: 'p', x: -0.08, y: 0.66, z: -0.30, w: 0.18, r: -5 },
    { src: 'fourcut-cut-4.webp', kind: 'p', x: 0.68, y: -0.56, z: 0.45, w: 0.20, r: 10 },
    { src: 'fourcut-vintage-model.webp', kind: 's', x: -0.24, y: -0.68, z: -0.50, w: 0.24, r: -8 }
  ];
  // 루트 밖: 그 페이지에 실린 사진(나라별 모델·프레임)을 먼저 쓰고, 모자라면 위 기본 사진으로 채운다. 자리(x·y·z·w·r)는 그대로
  if (!/^\/(index\.html)?$/.test(location.pathname)) {
    const seen = {}, own = [];
    Array.prototype.forEach.call(document.querySelectorAll('main img'), (im) => {
      const name = (im.getAttribute('src') || '').split('/').pop().split('?')[0];
      if (!/\.webp$/.test(name) || /^(pose-|frame-(?!goheung))/.test(name) || seen[name]) return;   // 폰 목업(투명)·빈 프레임 제외
      seen[name] = 1;
      if (anchor.contains(im)) return;                       // 히어로 그림에 이미 나온 사진은 둘레에 또 띄우지 않는다
      own.push({ name, url: im.src, kind: /^(fourcut-(?!cut)|frame-)|hearts/.test(name) ? 's' : 'p' });
    });
    const rest = CLOUD.filter((c) => !seen[c.src] && !(isB2b && /^(couple|onboarding)/.test(c.src))).map((c) => ({ name: c.src, url: IMG + c.src, kind: c.kind }));
    const pick = own.concat(rest);
    CLOUD.forEach((c, i) => { const o = pick[i % pick.length]; c.src = o.name; c.url = o.url; c.kind = o.kind; });
  }
  const K = 22, C = 5.5;     // 카드 스프링(탄성·감쇠)
  const T = 4;               // 폴라로이드 두께(px)
  const Z_SIDE = 46, Z_STICKER = 78;
  const LOOP = 7000;         // css 의 pop-a/pop-b/flash 와 같은 7초 루프

  // 좌표: 화면 한가운데가 원점인 화면 픽셀(x 오른쪽 +, y 위쪽 +). 카메라는 고정이고, 무대가 스크롤에 맞춰 올라간다
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 5000);
  const rig = new THREE.Group();             // 히어로 무대(콜라주 한가운데가 중심)
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  let vw = 0, vh = 0, D = 1200, cw = 0, ch = 0, texScale = 2, buildId = 0, built = false;
  let main = null, sideCard = null, sticker = null, flash = null, sheenMat = null, softShadow = null, fronts = [];
  let cloud = [], cloudImgs = null, cloudT0 = -1, ejectI = 0, ambient = [];
  const sets = Array.prototype.map.call(document.querySelectorAll('main .cluster'), (el) => ({ el, pivot: null, items: [], wanted: false }));

  // ---------- 도우미 ----------
  function tex(source) {
    const t = new THREE.CanvasTexture(source);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  }
  function cssDeg(el, name, fallback) {
    const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return (isNaN(v) ? fallback : v) * Math.PI / 180;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(v) { const x = clamp(v, 0, 1); return x * x * (3 - 2 * x); }
  function roundedShape(w, h, r) {
    const x = -w / 2, y = -h / 2, s = new THREE.Shape();
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function fitUv(geo, w, h) {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    return geo;
  }
  function cover(g, img, x, y, w, h) {
    const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(w / iw, h / ih);
    const sw = w / s, sh = h / s;
    g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  const FONT = '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif';
  function setFont(g, weight, size, spacingEm) {
    g.font = weight + ' ' + size + 'px ' + FONT;
    if ('letterSpacing' in g) g.letterSpacing = (size * spacingEm) + 'px';
  }
  // 사진 위 핀 라벨(css .pin): 그림 안에 같이 그린다. ox·oy 는 그림 왼쪽 위가 캔버스에서 시작하는 자리
  function drawPins(g, fig, w, h, cq, ox, oy) {
    fig.querySelectorAll(':scope > .pin').forEach((pin) => {
      const cs = getComputedStyle(pin);
      const x = ox + parseFloat(cs.getPropertyValue('--x')) / 100 * w, y = oy + parseFloat(cs.getPropertyValue('--y')) / 100 * h;
      const fs = clamp(2.7 * cq, 10, 12), text = pin.textContent.trim();
      setFont(g, 800, fs, 0);
      const tw = g.measureText(text).width, bw = 9 + 7 + 6 + tw + 9, bh = fs * 1.6 + 10;
      g.fillStyle = 'rgba(0,0,0,.82)'; rr(g, x - bw / 2, y - bh / 2, bw, bh, bh / 2); g.fill();
      g.fillStyle = '#ff5a47'; g.beginPath(); g.arc(x - bw / 2 + 12.5, y, 3.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText(text, x - bw / 2 + 22, y + 0.5);
    });
  }
  // 무대 P(화면 좌표)가 기준 자리에 있을 때, 화면에서 P+(x, y) 에 원래 크기로 보이도록 깊이 z 만큼 보정해 놓는다
  // → 기준 자리에서는 DOM 배치와 같고, 스크롤하거나 기울일 때만 깊이 차이가 보인다
  function place(group, parent, P, x, y, z, rot) {
    const f = (D - z) / D;
    group.position.set((P.x + x) * f - P.x, (P.y + y) * f - P.y, z);
    group.scale.setScalar(f);
    group.rotation.z = rot;
    Object.assign(group.userData, { x: group.position.x, y: group.position.y, z, rot });
    parent.add(group);
    return group;
  }

  // ---------- 폴라로이드 (css .pola) ----------
  function makeCard(fig, photo, z, box, parent, P) {
    const w = fig.offsetWidth, h = fig.offsetHeight, cq = box.cq;
    const arRaw = getComputedStyle(fig).getPropertyValue('--ar').split('/').map(parseFloat);
    const ar = arRaw.length === 2 ? arRaw[0] / arRaw[1] : (arRaw[0] || 0.8);
    const p = 3.2 * cq + 1, pw = w - p * 2, ph = pw / ar;

    // 앞면 텍스처: 종이 + 사진 + REC + 핀 + 캡션 (css .pola / .rec / .pin / .pola__cap 과 같은 수치)
    const c = document.createElement('canvas');
    c.width = Math.round(w * texScale); c.height = Math.round(h * texScale);
    const g = c.getContext('2d');
    g.scale(texScale, texScale);
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.save(); rr(g, p, p, pw, ph, 3); g.clip(); cover(g, photo, p, p, pw, ph); g.restore();

    if (fig.querySelector('.rec')) {
      const fs = clamp(2.6 * cq, 10, 12), bx = p + 3 * cq, by = p + 3 * cq, bh = fs * 1.6 + 8;
      setFont(g, 800, fs, 0.12);
      const bw = 8 + 8 + 6 + g.measureText('REC').width + 8;
      g.fillStyle = 'rgba(0,0,0,.78)'; rr(g, bx, by, bw, bh, 6); g.fill();
      g.fillStyle = '#ff5a47'; g.beginPath(); g.arc(bx + 12, by + bh / 2, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText('REC', bx + 22, by + bh / 2 + 0.5);
    }
    drawPins(g, fig, w, h, cq, 0, 0);

    const cap = fig.querySelector('.pola__cap');
    if (cap) {
      const fs = clamp(2.5 * cq, 9, 12), cy = h - 2.4 * cq - fs * 0.8;
      const spans = cap.querySelectorAll(':scope > span');
      g.textBaseline = 'middle';
      spans.forEach((span, i) => {
        const runs = [];
        span.childNodes.forEach((n) => {
          const text = (n.textContent || '').toUpperCase();
          if (text) runs.push({ text, bold: n.nodeName === 'B' });
        });
        const measure = (r) => { setFont(g, r.bold ? 800 : 700, fs, 0.08); return g.measureText(r.text).width; };
        const total = runs.reduce((s, r) => s + measure(r), 0);
        let x = i === 0 ? p : w - p - total;
        g.textAlign = 'left';
        runs.forEach((r) => {
          const tw = measure(r);
          g.fillStyle = r.bold ? '#000' : 'rgba(0,0,0,.4)';
          g.fillText(r.text, x, cy);
          x += tw;
        });
      });
    }
    g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 1; rr(g, 0.5, 0.5, w - 1, h - 1, 6); g.stroke();

    const group = new THREE.Group();
    const shape = roundedShape(w, h, 6);

    // 그림자 (css --shadow-card: 0 18px 40px -18px rgba(0,0,0,.35))
    const m = 60, s = 0.5, sc = document.createElement('canvas');
    sc.width = Math.round((w + m * 2) * s); sc.height = Math.round((h + m * 2) * s);
    const sg = sc.getContext('2d');
    sg.shadowColor = 'rgba(0,0,0,.35)'; sg.shadowBlur = 40 * s; sg.shadowOffsetX = 5000; sg.fillStyle = '#000';
    sg.fillRect(-5000 + (m + 18) * s, (m + 18) * s, (w - 36) * s, (h - 36) * s);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w + m * 2, h + m * 2),
      new THREE.MeshBasicMaterial({ map: tex(sc), transparent: true, depthWrite: false })
    );
    shadow.position.set(0, -18, -T - 1);
    group.add(shadow);

    // 두께가 있는 종이 몸통 + 앞면
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -T),
      [new THREE.MeshBasicMaterial({ color: 0xf1f1f1 }), new THREE.MeshBasicMaterial({ color: 0xd6d6d6 })]
    );
    group.add(body);
    const frontGeo = fitUv(new THREE.ShapeGeometry(shape, 6), w, h);
    const frontMat = new THREE.MeshBasicMaterial({ map: tex(c) });
    const front = new THREE.Mesh(frontGeo, frontMat);
    front.position.z = 0.1;
    group.add(front);
    fronts.push(frontMat);

    // 광택: 기울기에 따라 빛 띠가 지나간다
    const sheen = new THREE.Mesh(frontGeo, sheenMat);
    sheen.position.z = 0.4;
    group.add(sheen);

    // 테이프 (css .tape)
    fig.querySelectorAll(':scope > .tape').forEach((el) => {
      const tw = el.offsetWidth, th = el.offsetHeight;
      if (!tw || !th) return;
      const tc = document.createElement('canvas');
      tc.width = Math.round(tw * texScale); tc.height = Math.round(th * texScale);
      const tg = tc.getContext('2d');
      tg.scale(texScale, texScale);
      const poly = [[0, 0], [1, 0], [.98, .22], [1, .45], [.97, .65], [1, .82], [.98, 1], [0, 1], [.02, .8], [0, .6], [.03, .4], [0, .2]];
      tg.beginPath(); poly.forEach((pt, i) => tg[i ? 'lineTo' : 'moveTo'](pt[0] * tw, pt[1] * th)); tg.closePath(); tg.clip();
      const clear = el.classList.contains('tape--clear');
      tg.fillStyle = clear ? 'rgba(0,0,0,.1)' : 'rgba(255,90,71,.9)'; tg.fillRect(0, 0, tw, th);
      tg.fillStyle = clear ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.22)';
      for (let x = 0; x < tw; x += 6) tg.fillRect(x, 0, 2, th);
      const tape = new THREE.Mesh(
        new THREE.PlaneGeometry(tw, th),
        new THREE.MeshBasicMaterial({ map: tex(tc), transparent: true, depthWrite: false })
      );
      tape.position.set(el.offsetLeft + tw / 2 - w / 2, -(el.offsetTop + th / 2 - h / 2), 1.4);
      tape.rotation.z = -cssDeg(el, '--tr', -8);
      tape.renderOrder = 2;
      group.add(tape);
    });

    group.userData.photo = { x: p + pw / 2 - w / 2, y: -(p + ph / 2 - h / 2), w: pw, h: ph };
    return place(group, parent, P, fig.offsetLeft + w / 2 - box.w / 2, -(fig.offsetTop + h / 2 - box.h / 2), z, -cssDeg(fig, '--r', 0));
  }

  // ---------- 그림 한 장(로고 스티커·폰 화면 목업·네컷): 그림자를 같이 구운 평면 ----------
  function makeImage(el, img, z, box, parent, P, opt) {
    const w = el.offsetWidth, h = el.offsetHeight, m = Math.ceil(opt.blur * 1.6 + opt.oy);
    const c = document.createElement('canvas');
    c.width = Math.round((w + m * 2) * texScale); c.height = Math.round((h + m * 2) * texScale);
    const g = c.getContext('2d');
    g.scale(texScale, texScale);
    g.shadowColor = 'rgba(0,0,0,' + opt.alpha + ')'; g.shadowBlur = opt.blur * texScale; g.shadowOffsetY = opt.oy * texScale;
    if (opt.radius) {                                       // 둥근 카드: 흰 바탕에 그림자를 주고 그 안에 그림
      g.fillStyle = '#fff'; rr(g, m, m, w, h, opt.radius); g.fill();
      g.shadowColor = 'transparent';
      g.save(); rr(g, m, m, w, h, opt.radius); g.clip(); cover(g, img, m, m, w, h); g.restore();
    } else {
      g.drawImage(img, m, m, w, h);                         // 투명 배경 그림: 윤곽을 따라 그림자
      g.shadowColor = 'transparent';
    }
    drawPins(g, el, w, h, box.cq, m, m);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w + m * 2, h + m * 2),
      new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false })
    );
    mesh.renderOrder = opt.order || 0;
    group.add(mesh);
    return place(group, parent, P, el.offsetLeft + w / 2 - box.w / 2, -(el.offsetTop + h / 2 - box.h / 2), z, -cssDeg(el, '--r', opt.rot || 0));
  }

  // ---------- 떠다니는 카드 한 장(히어로 둘레·페이지 전체 공용) ----------
  function makeLoose(img, isP, w) {
    const pad = isP ? w * 0.06 : 0, pw = w - pad * 2;
    const ph = isP ? pw / 0.857 : pw * img.naturalHeight / img.naturalWidth;
    const h = isP ? pad + ph + w * 0.2 : ph, rad = isP ? 4 : w * 0.035;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * texScale); cv.height = Math.round(h * texScale);
    const g = cv.getContext('2d');
    g.scale(texScale, texScale);
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.save(); rr(g, pad, pad, pw, ph, isP ? 2 : 0); g.clip(); cover(g, img, pad, pad, pw, ph); g.restore();
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; rr(g, 0.5, 0.5, w - 1, h - 1, rad); g.stroke();

    const group = new THREE.Group();
    const shadowMat = new THREE.MeshBasicMaterial({ map: softShadow, transparent: true, depthWrite: false, opacity: 0 });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.9, h * 1.9), shadowMat);
    shadow.position.set(0, -w * 0.07, -2);
    group.add(shadow);
    const geo = fitUv(new THREE.ShapeGeometry(roundedShape(w, h, rad), 5), w, h);
    const mat = new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true, opacity: 0 });
    group.add(new THREE.Mesh(geo, mat));
    const sheen = new THREE.Mesh(geo, sheenMat);
    sheen.position.z = 0.3;
    group.add(sheen);
    group.visible = false;
    return { group, mat, shadowMat, w, h };
  }

  // 시연 영상(assets/video/hero-demo.mp4)이 생겨서 재생되면 포스터 위에 영상을 얹는다
  function attachVideo() {
    if (!main || !video || main.userData.video) return;
    if (video.error || video.readyState < 2 || video.paused || video.classList.contains('is-poster')) return;
    const r = main.userData.photo, vt = new THREE.VideoTexture(video);
    vt.colorSpace = THREE.SRGBColorSpace;
    const va = video.videoWidth / video.videoHeight, pa = r.w / r.h;   // object-fit: cover
    if (va > pa) { vt.repeat.x = pa / va; vt.offset.x = (1 - vt.repeat.x) / 2; }
    else { vt.repeat.y = va / pa; vt.offset.y = (1 - vt.repeat.y) / 2; }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshBasicMaterial({ map: vt }));
    mesh.position.set(r.x, r.y, 0.2);
    main.add(mesh);
    main.userData.video = mesh;
  }

  // ---------- 화면 크기 ----------
  function setView() {
    vw = window.innerWidth; vh = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (vw * vh * dpr * dpr > 3.2e6) dpr = Math.sqrt(3.2e6 / (vw * vh));
    renderer.setPixelRatio(dpr);
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.fov = 2 * Math.atan(vh / 2 / D) * 180 / Math.PI;   // z=0 평면이 화면 픽셀과 1:1
    camera.near = D * 0.05; camera.far = D * 4;
    camera.position.set(0, 0, D);
    camera.updateProjectionMatrix();
  }

  // ---------- 무대 만들기 (폭이 바뀌면 전부 다시) ----------
  function disposeAll() {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => { if (mt.map) mt.map.dispose(); mt.dispose(); });
    });
    scene.clear(); rig.clear();
    fronts = []; cloud = []; ambient = []; main = sideCard = sticker = flash = null; built = false;
    sets.forEach((s) => { s.pivot = null; s.items = []; });
  }

  function buildAll() {
    buildId++;
    disposeAll();
    D = clamp(window.innerHeight * 1.5, 950, 1500);
    texScale = Math.min(window.devicePixelRatio || 1, 2) * 1.25;
    setView();
    scene.add(rig);

    const hc = document.createElement('canvas');
    hc.width = hc.height = 128;
    const hg = hc.getContext('2d');
    hg.shadowColor = 'rgba(0,0,0,.9)'; hg.shadowBlur = 22; hg.shadowOffsetX = 500; hg.fillRect(-500 + 34, 34, 60, 60);
    softShadow = tex(hc);
    const gc = document.createElement('canvas');
    gc.width = gc.height = 128;
    const gg = gc.getContext('2d'), grad = gg.createLinearGradient(0, 128, 128, 0);
    grad.addColorStop(0.32, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, 'rgba(255,255,255,.6)'); grad.addColorStop(0.68, 'rgba(255,255,255,0)');
    gg.fillStyle = grad; gg.fillRect(0, 0, 128, 128);
    sheenMat = new THREE.MeshBasicMaterial({ map: tex(gc), transparent: true, depthWrite: false, opacity: 0 });

    // 히어로: 스크롤 0 일 때의 콜라주 자리가 기준
    cw = anchor.clientWidth; ch = anchor.clientHeight;
    if (!cw || !ch) return;
    built = true;
    const cb = anchor.getBoundingClientRect(), box = { w: cw, h: ch, cq: cw / 100 };
    const P = { x: cb.left + cb.width / 2 - vw / 2, y: vh / 2 - (cb.top + window.scrollY + cb.height / 2) };
    if (reel && mainPhoto) {                                 // 폴라로이드 콜라주가 있는 히어로(루트·/couple/)
      main = makeCard(reel, mainPhoto, 0, box, rig, P);
      const r = main.userData.photo;
      flash = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      flash.position.set(r.x, r.y, 0.6);
      flash.renderOrder = 1;
      main.add(flash);
      if (side && sidePhoto) sideCard = makeCard(side, sidePhoto, Z_SIDE, box, rig, P);
      if (stickerEl && stickerImg) sticker = makeImage(stickerEl, stickerImg, Z_STICKER, box, rig, P, { blur: 12, oy: 8, alpha: 0.18, rot: -8, order: 3 });
      attachVideo();
    } else {
      cw = Math.min(cw, 520);                                // 둘레 카드 자리·크기의 기준 폭
    }
    buildCloud();
    buildAmbient();
    sets.forEach((s) => { if (s.wanted) buildSet(s); });
  }

  // ---------- 히어로 둘레 카드 ----------
  function buildCloud() {
    if (!cloudImgs || !built || cloud.length) return;
    CLOUD.forEach((c, i) => {
      const img = cloudImgs[i];
      if (!img) return;
      if (!main && vw < 900 && (isB2b ? c.y > 0.3 : c.y < -0.3)) return;   // 한 단(모바일): 글 쪽으로 가는 카드는 뺀다(/fourcut/ 는 글이 아래, /b2b/ 는 위)
      const card = makeLoose(img, c.kind === 'p', c.w * cw);
      rig.add(card.group);
      // x·y 는 화면에서 보이는 자리 → 깊이만큼 보정(뒤에 있는 카드가 가운데로 몰려 큰 사진 뒤에 숨지 않게). 한 단(모바일)에서는 위쪽 카드가 글을 덜 덮게 낮춘다
      const f = (D - c.z * cw) / D, yk = c.y > 0 && vw < 900 ? 0.86 : 1;
      const home = new THREE.Vector3(c.x * cw * f, c.y * yk * cw * f, c.z * cw);
      const out = new THREE.Vector3(c.x, c.y, 0).normalize();
      cloud.push(Object.assign(card, {
        home, out,
        disp: new THREE.Vector3(out.x * cw * 0.9, out.y * cw * 0.9, D * 0.55),   // 카메라 쪽 바깥에서 날아온다
        vel: new THREE.Vector3(), rot: -c.r * Math.PI / 180, spin: (i % 2 ? 1 : -1) * 1.2, spinVel: 0, scale: 1,
        delay: i * 0.09, seed: i * 1.7 + 0.5, base: clamp(1 + c.z * 0.4, 0.62, 1)
      }));
    });
    cloudT0 = -1;
  }

  // ---------- 페이지 전체에 흐르는 카드: 히어로 아래부터 끝까지, 좌우 번갈아·깊이 제각각 ----------
  function buildAmbient() {
    if (!cloudImgs || !built || ambient.length) return;
    const imgs = cloudImgs.map((img, i) => ({ img, isP: CLOUD[i].kind === 'p' })).filter((o) => o.img);
    if (!imgs.length) return;
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const wide = vw >= 900;
    const formSec = document.querySelector('.b2b-form-section');       // 문의 폼 둘레에는 카드를 흘리지 않는다
    const start = hero.offsetTop + hero.offsetHeight + vh * 0.2;
    const end = formSec ? formSec.getBoundingClientRect().top + window.scrollY - vh * 0.4 : root.scrollHeight - vh * 0.5;
    let i = 0;
    for (let y = start; y < end; y += vh * (wide ? 0.34 : 0.42), i++) {
      const o = imgs[(i * 4 + 3) % imgs.length], sideSign = i % 2 ? 1 : -1;
      const z = -900 + rnd() * 1250;                                   // -900(멀리) ~ 350(가까이)
      const card = makeLoose(o.img, o.isP, (wide ? 150 : 92) * (0.8 + rnd() * 0.5));
      scene.add(card.group);
      const base = clamp(1 + z / 1500, 0.5, 1);
      card.mat.opacity = base; card.shadowMat.opacity = 0.3 * base;
      ambient.push(Object.assign(card, {
        pageY: y + rnd() * vh * 0.2, z,
        sx: sideSign * vw * (wide ? 0.36 + rnd() * 0.12 : 0.36 + rnd() * 0.16),   // 화면에서 보이는 x (가장자리 쪽 — 글을 덜 덮게)
        rot: (rnd() - 0.5) * 0.5, seed: rnd() * 10
      }));
    }
  }

  // ---------- 기능 섹션 무대(.cluster): 큰 사진·폰 화면·네컷을 3D 카드로 ----------
  function buildSet(s) {
    const id = buildId;
    const els = Array.prototype.slice.call(s.el.querySelectorAll(':scope > .pola:not(.cutout), :scope > .shot, :scope > .fourcut, :scope > .frame-card'));
    if (!els.length) return;
    Promise.all(els.map((el) => loadImage((el.querySelector('img') || {}).src))).then((imgs) => {
      if (id !== buildId || s.pivot || !built) return;
      const w = s.el.clientWidth, h = s.el.clientHeight;
      if (!w || !h) return;
      const b = s.el.getBoundingClientRect(), box = { w, h, cq: w / 100 };
      const P = { x: b.left + b.width / 2 - vw / 2, y: 0 };            // 기준: 묶음이 화면 한가운데 높이에 왔을 때
      const pivot = new THREE.Group();
      scene.add(pivot);
      els.forEach((el, i) => {
        const img = imgs[i];
        if (!img) return;
        let group;
        if (el.classList.contains('pola')) group = makeCard(el, img, 0, box, pivot, P);
        else if (el.classList.contains('shot')) group = makeImage(el, img, el.classList.contains('shot--main') ? 34 : -34, box, pivot, P, { blur: 28, oy: 26, alpha: 0.26 });
        else if (el.classList.contains('frame-card')) group = makeImage(el, img, el.classList.contains('frame-card--main') ? 30 : -30, box, pivot, P, { blur: 22, oy: 18, alpha: 0.2, radius: 4 });
        else group = makeImage(el, img, 0, box, pivot, P, { blur: 30, oy: 16, alpha: 0.3, radius: 10, rot: -3 });
        const cx = el.offsetLeft + el.offsetWidth / 2 - w / 2;
        s.items.push({ group, el, i: s.items.length, side: els.length > 1 ? (cx < 0 ? -1 : 1) : (b.left + b.width / 2 < vw / 2 ? -1 : 1), fresh: true });
        el.classList.add('in-3d');
      });
      s.pivot = pivot;
    });
  }

  // "찰칵": 플래시 + 카드들이 밖으로 튕기고, 한 장이 큰 사진에서 튀어나온다
  let shutterT = -1e9;
  function fire(now) {
    if (now - shutterT < 600) return;
    shutterT = now;
    const live = cloud.filter((c) => c.group.visible);
    live.forEach((c) => {
      c.vel.addScaledVector(c.out, cw * 1.1);
      c.vel.z += cw * (0.5 + Math.random() * 0.6);
      c.spinVel += (Math.random() - 0.5) * 5;
    });
    if (live.length && main) {
      const c = live[ejectI++ % live.length], r = main.userData.photo, a = main.userData.rot;
      const tx = main.userData.x + r.x * Math.cos(a) - r.y * Math.sin(a), ty = main.userData.y + r.x * Math.sin(a) + r.y * Math.cos(a);
      c.disp.set(tx - c.home.x, ty - c.home.y, 24 - c.home.z);
      c.vel.set(0, 0, cw * 2.4);
      c.scale = 0.15;
      c.spinVel += 7;
    }
  }

  // ---------- 움직임 ----------
  let px = 0, py = 0, pointerOn = false, live = 0, last = 0, raf = 0, shown = false, prevLp = 1;
  let tiltX = 0, tiltY = 0, lastScroll = window.scrollY, vel = 0;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    px = clamp(e.clientX / vw * 2 - 1, -1, 1);
    py = clamp(e.clientY / vh * 2 - 1, -1, 1);
    pointerOn = true;
  }, { passive: true });
  root.addEventListener('pointerleave', () => { pointerOn = false; });

  function loopProgress(now) {
    const a = loopEl && loopEl.getAnimations ? loopEl.getAnimations()[0] : null;
    const ms = a && typeof a.currentTime === 'number' ? a.currentTime : now;
    return (ms % LOOP) / LOOP;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!built) return;
    const t = now / 1000, dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    live = Math.min(1, live + dt / 1.4);
    const ease = live * live * (3 - 2 * live);
    const sy = window.scrollY, k = Math.min(1, dt * 5);
    vel += ((sy - lastScroll) / dt - vel) * Math.min(1, dt * 6);       // 스크롤 속도(px/s)
    lastScroll = sy;
    const rush = clamp(vel / 2600, -0.55, 0.55);

    // 전체 기울기: 마우스(데스크톱) 또는 느린 흔들림(터치)
    tiltY += ((pointerOn ? px * 0.34 : Math.sin(t * 0.7) * 0.16) * ease - tiltY) * k;
    tiltX += ((pointerOn ? py * 0.2 : Math.cos(t * 0.5) * 0.07) * ease - tiltX) * k;
    sheenMat.opacity = clamp(0.06 + Math.abs(tiltY) * 1.6, 0, 0.5) * ease;
    sheenMat.map.offset.x = tiltY * 2.4;
    const shade = 1 - Math.min(0.1, Math.abs(tiltY) * 0.35);
    fronts.forEach((mt) => mt.color.setScalar(shade));

    // ----- 히어로 -----
    const cb = anchor.getBoundingClientRect();
    rig.visible = cb.bottom > -vh && cb.top < vh * 2;
    if (rig.visible) {
      const scrollP = clamp(sy / (hero.offsetHeight || 1), 0, 1);
      rig.position.set(cb.left + cb.width / 2 - vw / 2, vh / 2 - (cb.top + cb.height / 2), 0);
      rig.rotation.y = tiltY;
      rig.rotation.x = tiltX + scrollP * 0.3;

      // "찰칵": css 7초 루프의 35% 지점마다 + 콜라주를 누르면 바로
      const lp = loopProgress(now);
      if (autoFire && prevLp < 0.35 && lp >= 0.35 && scrollP < 0.9) fire(now);
      prevLp = lp;
      if (main) {
        const u = main.userData, e = (now - shutterT) / 1000;
        flash.material.opacity = e < 0.1 ? e / 0.1 * 0.9 : e < 0.38 ? (1 - (e - 0.1) / 0.28) * 0.9 : 0;
        const s = clamp(e / 0.63, 0, 1), punch = Math.sin(s * Math.PI) * (1 - s);
        main.position.z = u.z + punch * 60;
        main.rotation.z = u.rot + Math.sin(s * Math.PI * 3) * 0.02 * (1 - s);
      }

      if (sideCard) {
        const su = sideCard.userData;
        sideCard.position.y = su.y + (1 - Math.cos(t * Math.PI * 2 / 4.5)) * 3;        // css float: 위로 6px
        sideCard.position.z = su.z + Math.sin(t * 0.9) * 10 * ease;
        sideCard.rotation.y = Math.sin(t * 0.6 + 1) * 0.06 * ease;
      }
      if (sticker) {
        const tu = sticker.userData;
        sticker.rotation.z = tu.rot + Math.cos(t * Math.PI * 2 / 3.6) * 0.052;         // css swing: ±3deg
        sticker.position.z = tu.z + Math.sin(t * 1.3) * 6 * ease;
      }

      // 둘레 카드: 스프링으로 제자리에 돌아오며 천천히 떠다닌다. 스크롤하면 바깥·앞으로 흩어진다
      if (cloud.length) {
        if (cloudT0 < 0) cloudT0 = t;
        cloud.forEach((c) => {
          const age = t - cloudT0 - c.delay;
          if (age < 0) return;
          c.group.visible = true;
          c.vel.x += (-K * c.disp.x - C * c.vel.x) * dt; c.vel.y += (-K * c.disp.y - C * c.vel.y) * dt; c.vel.z += (-K * c.disp.z - C * c.vel.z) * dt;
          c.disp.addScaledVector(c.vel, dt);
          c.spinVel += (-K * c.spin - C * c.spinVel) * dt; c.spin += c.spinVel * dt;
          c.scale += (1 - c.scale) * Math.min(1, dt * 4);
          const sc = 1 + scrollP * 0.5, sd = c.seed;
          c.group.position.set(
            c.home.x * sc + c.disp.x + Math.sin(t * 0.5 + sd) * cw * 0.02,
            c.home.y * sc + c.disp.y + Math.cos(t * 0.4 + sd * 2) * cw * 0.025,
            c.home.z + scrollP * cw * 0.5 + c.disp.z + Math.sin(t * 0.3 + sd * 3) * cw * 0.05
          );
          c.group.rotation.set(Math.sin(t * 0.45 + sd) * 0.22 + rush, Math.cos(t * 0.38 + sd * 1.7) * 0.3, c.rot + c.spin + Math.sin(t * 0.35 + sd) * 0.06);
          c.group.scale.setScalar(c.scale);
          const op = Math.min(1, age / 0.45);
          c.mat.opacity = c.base * op; c.shadowMat.opacity = 0.3 * c.base * op;
        });
      }
    }

    // ----- 기능 섹션: 스크롤 위치 q(아래 +1 → 한가운데 0 → 위 -1)에 맞춰 날아와 자리 잡고, 지나가면 카메라 쪽으로 빠진다 -----
    const k2 = Math.min(1, dt * 9);
    sets.forEach((s) => {
      if (!s.pivot) return;
      const b = s.el.getBoundingClientRect();
      s.pivot.visible = b.bottom > -vh * 0.8 && b.top < vh * 1.8;
      if (!s.pivot.visible) return;
      const q = (b.top + b.height / 2 - vh / 2) / vh;
      s.pivot.position.set(b.left + b.width / 2 - vw / 2, vh / 2 - (b.top + b.height / 2), 0);
      s.pivot.rotation.y = tiltY * 0.7;
      s.pivot.rotation.x = tiltX * 0.7;
      s.items.forEach((it) => {
        const g = it.group, u = g.userData;
        const en = smooth((q - 0.16 - it.i * 0.05) / 0.5), ex = smooth((-q - 0.22 - it.i * 0.05) / 0.55);
        const tx = u.x + it.side * (en * 150 + ex * 80);
        const ty = u.y - en * 110 + ex * 60 + Math.sin(t * 0.8 + it.i * 2) * 4;
        const tz = u.z - en * 560 + ex * 440;
        const rx = -en * 0.55 + ex * 0.65 + rush * 0.4, ry = it.side * (en * 1.05 - ex * 0.75), rz = u.rot + it.side * (en * 0.28 - ex * 0.12);
        const kk = it.fresh ? 1 : k2;
        it.fresh = false;
        g.position.x += (tx - g.position.x) * kk; g.position.y += (ty - g.position.y) * kk; g.position.z += (tz - g.position.z) * kk;
        g.rotation.x += (rx - g.rotation.x) * kk; g.rotation.y += (ry - g.rotation.y) * kk; g.rotation.z += (rz - g.rotation.z) * kk;
      });
    });

    // ----- 페이지 전체에 흐르는 카드: 깊이에 따라 스크롤 속도가 달라 보인다 -----
    ambient.forEach((a) => {
      const persp = D / (D - a.z), wy = vh / 2 - (a.pageY - sy);
      const on = Math.abs(wy * persp) < vh * 0.5 + a.h * 1.2 * persp;
      a.group.visible = on;
      if (!on) return;
      a.group.position.set(a.sx / persp + Math.sin(t * 0.5 + a.seed) * 10, wy + Math.cos(t * 0.4 + a.seed * 2) * 12, a.z);
      a.group.rotation.set(Math.sin(t * 0.45 + a.seed) * 0.25 + rush, Math.cos(t * 0.38 + a.seed * 1.7) * 0.35 + tiltY * 0.5, a.rot + Math.sin(t * 0.35 + a.seed) * 0.08);
    });

    renderer.render(scene, camera);
    if (!shown) { shown = true; if (main) collage.classList.add('is-3d'); root.classList.add('has-stage'); }
  }
  function setRunning() {
    if (raf < 0) return;
    const on = !document.hidden;
    if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    else if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  // 셰이더를 첫 프레임 전에, 화면을 멈추지 않고 미리 컴파일한다(첫 프레임에서 한꺼번에 하면 폰에서 수백 ms 멈춘다).
  // 이 파일이 쓰는 재질 조합 4가지(그림 있음/없음 × 불투명/투명)를 작은 판으로 만들어 넘긴다. 판의 재질은 버리지 않는다(버리면 컴파일한 프로그램도 같이 사라진다)
  async function warmUp() {
    renderer.debug.checkShaderErrors = false;
    const dc = document.createElement('canvas');
    dc.width = dc.height = 2;
    const t = tex(dc), geo = new THREE.PlaneGeometry(1, 1);
    const tmps = [{ map: t }, { map: t, transparent: true }, { color: 0xffffff }, { color: 0xffffff, transparent: true, opacity: 0 }].map((o) => {
      const sc = new THREE.Scene();
      sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial(o)));
      return sc;
    });
    try {
      if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) {
        // 병렬 컴파일을 지원하면(대부분의 폰) 기다리는 동안 화면이 멈추지 않는다
        await Promise.race([Promise.all(tmps.map((sc) => renderer.compileAsync(sc, camera))), new Promise((r) => setTimeout(r, 4000))]);
      } else {
        // 지원하지 않으면 한 프레임에 하나씩 나눠서(한 번에 길게 멈추지 않게). 캔버스는 아직 투명이라 보이지 않는다
        for (let i = 0; i < tmps.length; i++) {
          renderer.render(tmps[i], camera);
          await new Promise((r) => requestAnimationFrame(r));
        }
        renderer.clear();
      }
    } catch (e) { /* 그냥 첫 프레임에서 컴파일 */ }
  }

  // ---------- 시작 ----------
  document.body.insertBefore(canvas, document.body.firstChild);
  buildAll();
  if (!built) { canvas.remove(); return; }
  await warmUp();

  if (autoFire) anchor.addEventListener('click', () => fire(performance.now()));
  const light = window.innerWidth < 900;                     // 좁은 화면: 무거운 사진은 받지 않는다(그 자리 카드는 없음)
  Promise.all(CLOUD.map((c) => (light && /^onboarding-/.test(c.src) ? null : loadImage(c.url || IMG + c.src)))).then((imgs) => { cloudImgs = imgs; buildCloud(); buildAmbient(); });
  if (video) video.addEventListener('playing', attachVideo);
  if ('IntersectionObserver' in window) {                    // 섹션 사진은 그 섹션이 한 화면 반 앞까지 왔을 때 받는다
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const s = sets.find((x) => x.el === en.target);
        if (s) { s.wanted = true; buildSet(s); }
      });
    }, { rootMargin: '150% 0px' });
    sets.forEach((s) => io.observe(s.el));
  }
  document.addEventListener('visibilitychange', setRunning);
  let timer = 0, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) { setView(); return; }   // 높이만 바뀜(모바일 주소창): 화면만 다시 맞춘다
    lastW = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(buildAll, 180);
  });
  canvas.addEventListener('webglcontextlost', (e) => {       // GPU 컨텍스트가 날아가면 DOM 페이지로 되돌린다
    e.preventDefault();
    cancelAnimationFrame(raf); raf = -1;
    stageOff();
  });
  setRunning();
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
// viewBox 만 있는 SVG 는 브라우저에 따라 캔버스에 못 그린다 → width/height 를 넣은 사본으로 읽는다
async function loadSvg(src, w, h) {
  try {
    const text = await (await fetch(src)).text();
    const url = URL.createObjectURL(new Blob([text.replace('<svg ', '<svg width="' + w + '" height="' + h + '" ')], { type: 'image/svg+xml' }));
    const img = await loadImage(url);
    URL.revokeObjectURL(url);
    return img;
  } catch (e) { return null; }
}
