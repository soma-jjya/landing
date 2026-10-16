/* peakpic.app 의 랜딩 경로만 Vercel 랜딩으로 넘기는 분배 코드 — peakpic-app-site Worker 에 붙여 넣는다.
 *
 * 넘기는 경로(랜딩): /  /index.html  /couple/…  /fourcut/…  /css/…  /js/…  /assets/…  /ingest/…(PostHog)
 * 그 밖의 경로(/fill/, /api/, /.well-known/, /privacy/, /terms/, robots.txt 등)는 지금 Worker 가 그대로 처리한다.
 *
 * 붙이는 법
 * 1) 이 파일의 isLandingPath·proxyToLanding 을 Worker 코드 위쪽에 붙인다.
 * 2) fetch 핸들러 맨 앞에 한 줄:
 *      if (isLandingPath(new URL(request.url).pathname)) return proxyToLanding(request);
 * 3) wrangler 설정에 "assets"(정적 파일)가 있다면, 정적 파일이 코드보다 먼저 응답해서 "/" 가 안 넘어간다.
 *    아래처럼 랜딩 경로는 코드가 먼저 돌게 한다 (또는 Worker 의 기존 루트 index.html 을 지운다).
 *      wrangler.jsonc  "assets": { ..., "run_worker_first": ["/", "/index.html", "/couple/*", "/fourcut/*", "/css/*", "/js/*", "/assets/*", "/ingest/*"] }
 *      wrangler.toml   [assets]  run_worker_first = ["/", "/index.html", "/couple/*", "/fourcut/*", "/css/*", "/js/*", "/assets/*", "/ingest/*"]
 *    ※ Worker 가 /couple, /fourcut, /css, /js, /assets 같은 경로를 이미 쓰고 있지 않은지 먼저 확인
 * 4) 배포 후 확인: https://peakpic.app/ 이 새 랜딩, https://peakpic.app/fill/ 과 /.well-known/assetlinks.json 은 그대로
 */
const LANDING_ORIGIN = 'https://landing-pi-umber.vercel.app';

function isLandingPath(p) {
  return p === '/' || p === '/index.html'
    || /^\/(couple|fourcut)(\/|$)/.test(p)
    || /^\/(css|js|assets|ingest)\//.test(p);
}

async function proxyToLanding(request) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete('host');                 // Vercel 이 vercel.app 프로젝트로 찾도록
  headers.set('x-peakpic-proxy', '1');    // Vercel 쪽 "vercel.app → peakpic.app 리다이렉트" 에서 제외하는 표시
  const init = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;   // PostHog 이벤트(POST)
  const res = await fetch(LANDING_ORIGIN + url.pathname + url.search, init);
  const out = new Response(res.body, res);
  const loc = out.headers.get('location');
  if (loc && loc.startsWith(LANDING_ORIGIN)) out.headers.set('location', url.origin + loc.slice(LANDING_ORIGIN.length));
  return out;
}
