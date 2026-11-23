/* peakpic-landing Worker (wrangler.toml). 정적 파일은 Cloudflare 가 코드 없이 바로 내보내고, 이 코드는 /ingest/* 만 받는다.
 *
 * /ingest: PostHog 프록시(광고 차단 우회). 예전 vercel.json 리라이트와 같은 규칙
 *   /ingest/static/…  → https://us-assets.i.posthog.com/static/…  (SDK 파일, 엣지에 1시간 캐시)
 *   /ingest/…         → https://us.i.posthog.com/…               (이벤트·플래그)
 * 방문자 IP 를 X-Forwarded-For 로 넘겨서 PostHog 의 나라·도시($geoip)가 Cloudflare/Vercel 서버 위치가 아니라 방문자 위치로 잡힌다.
 *
 * /assets/video: Range(부분 요청) 처리 (2026-11-23). Cloudflare 정적 파일은 Range 를 무시하고 항상 200 전체를 준다.
 *   iOS Safari 는 206 을 못 받으면 <video> 를 재생하지 않고, Chrome 은 되감기·장면 이동(currentTime)이 안 된다.
 *   그래서 영상만 코드를 거쳐 파일을 받아 요청한 구간을 잘라 206 으로 준다(영상은 1MB 안팎이라 메모리에 올려도 된다).
 */
const POSTHOG_API = 'https://us.i.posthog.com';
const POSTHOG_ASSETS = 'https://us-assets.i.posthog.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/ingest/')) return ingest(request, url, env);
    if (url.pathname.startsWith('/assets/video/')) return video(request, env);
    return env.ASSETS.fetch(request);
  },
};

// env.POSTHOG_API·POSTHOG_ASSETS 는 로컬 확인용(wrangler dev --var 로 가짜 서버를 가리킬 때). 운영에는 두지 않는다
async function ingest(request, url, env) {
  const rest = url.pathname.slice('/ingest'.length) + url.search;
  if (rest.startsWith('/static/')) {
    return fetch((env.POSTHOG_ASSETS || POSTHOG_ASSETS) + rest, { cf: { cacheEverything: true, cacheTtl: 3600 } });
  }
  const headers = new Headers(request.headers);
  headers.delete('cookie');                       // peakpic.app 쿠키는 PostHog 로 보내지 않는다
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return fetch((env.POSTHOG_API || POSTHOG_API) + rest, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  });
}

async function video(request, env) {
  const range = request.headers.get('range');
  if (!range) {
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    headers.set('accept-ranges', 'bytes');
    return new Response(res.body, { status: res.status, headers });
  }
  const res = await env.ASSETS.fetch(new Request(request.url, { method: 'GET' }));
  if (!res.ok) return res;
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = 0, end = size - 1;
  if (m && m[1] === '' && m[2] !== '') start = Math.max(0, size - Number(m[2]));          // bytes=-500 (끝에서 500)
  else if (m && m[1] !== '') { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), size - 1); }
  if (!m || start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'content-range': 'bytes */' + size } });
  }
  const headers = new Headers(res.headers);
  headers.set('accept-ranges', 'bytes');
  headers.set('content-range', 'bytes ' + start + '-' + end + '/' + size);
  headers.set('content-length', String(end - start + 1));
  return new Response(request.method === 'HEAD' ? null : buf.slice(start, end + 1), { status: 206, headers });
}
