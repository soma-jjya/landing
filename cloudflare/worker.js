/* peakpic-landing Worker (wrangler.toml). 정적 파일은 Cloudflare 가 코드 없이 바로 내보내고, 이 코드는 /ingest/* 만 받는다.
 *
 * /ingest: PostHog 프록시(광고 차단 우회). 예전 vercel.json 리라이트와 같은 규칙
 *   /ingest/static/…  → https://us-assets.i.posthog.com/static/…  (SDK 파일, 엣지에 1시간 캐시)
 *   /ingest/…         → https://us.i.posthog.com/…               (이벤트·플래그)
 * 방문자 IP 를 X-Forwarded-For 로 넘겨서 PostHog 의 나라·도시($geoip)가 Cloudflare/Vercel 서버 위치가 아니라 방문자 위치로 잡힌다.
 */
const POSTHOG_API = 'https://us.i.posthog.com';
const POSTHOG_ASSETS = 'https://us-assets.i.posthog.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/ingest/')) return ingest(request, url, env);
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
