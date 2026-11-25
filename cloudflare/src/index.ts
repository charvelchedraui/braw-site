// braws.app Worker: www -> apex redirect, security headers on every response,
// /.well-known/security.txt, /get/ios and /get/android (store redirects), /lang/<code> (remember the language picked), "/" -> landing in the visitor's language, videos with byte ranges
// (video-range.ts, Safari needs them) and static assets (with public/404.html for unknown paths).
import { isVideoPath, videoResponse } from './video-range';
// Store links, shared with cloudflare/landing/build.mjs. Android goes live (Play open testing, later the listing) by setting "androidLive": true there.
import STORES from '../stores.json';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const APEX = 'braws.app';

const SECURITY_TXT = `Contact: mailto:security@braws.app
Expires: 2027-11-14T00:00:00.000Z
Preferred-Languages: es, en
Canonical: https://braws.app/.well-known/security.txt
Policy: https://braws.app/support/
`;

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), clipboard-write=(self)',
};

// The 27 landing languages (same codes as the app and cloudflare/landing/build.mjs): each lives at /<code>/.
const LANDING = ['en', 'en-GB', 'es', 'pt', 'pt-PT', 'fr', 'de', 'it', 'nl', 'id', 'sv', 'da', 'ja', 'ko',
  'zh-Hans', 'zh-Hant', 'ru', 'tr', 'pl', 'nb', 'fi', 'vi', 'ar', 'hi', 'th', 'uk', 'cs'];
const PRIMARY = new Map(LANDING.filter((c) => !c.includes('-')).map((c) => [c, c]));
const EN_GB = new Set(['gb', 'uk', 'ie', 'au', 'nz', 'za', 'in']);

// One Accept-Language tag -> one of LANDING, or null.
function landingFor(tag: string): string | null {
  const parts = tag.toLowerCase().split(/[-_]/);
  const l = parts[0];
  const rest = parts.slice(1);
  if (l === 'zh') return rest.includes('hant') || rest.some((p) => p === 'tw' || p === 'hk' || p === 'mo') ? 'zh-Hant' : 'zh-Hans';
  if (l === 'no' || l === 'nn' || l === 'nb') return 'nb';
  if (l === 'en') return rest.some((p) => EN_GB.has(p)) ? 'en-GB' : 'en';
  // como el app: pt sin país y pt-BR → Brasil; pt con otro país (PT, AO, MZ…) → Portugal
  if (l === 'pt') return rest.length === 0 || rest.includes('br') ? 'pt' : 'pt-PT';
  return PRIMARY.get(l) ?? null;
}

// The language a visitor picked in the menu (LANGUAGES.md rule 3): a first-party cookie, strictly necessary, no tracking.
const LANG_COOKIE = 'braws_lang';
const langCookie = (code: string) => `${LANG_COOKIE}=${code}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
function cookieLanguage(header: string | null): string | null {
  const m = new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`).exec(header ?? '');
  const v = m ? m[1].trim() : '';
  return LANDING.includes(v) ? v : null;
}

// Best landing language for an Accept-Language header (q-values respected), default English.
function pickLanguage(header: string | null): string {
  if (!header) return 'en';
  const tags = header.slice(0, 1000).split(',').map((item, i) => {
    const [tag, ...params] = item.trim().split(';');
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=([0-9.]+)$/i);
      if (m) q = Number(m[1]);
    }
    return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, i };
  }).filter((t) => t.tag && t.tag !== '*' && t.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const t of tags) {
    const found = landingFor(t.tag);
    if (found) return found;
  }
  return 'en';
}

// Store redirects used by the download buttons on the landing (/get/ios, /get/android).
// While braws is not public on Google Play, /get/android sends the visitor to the landing's #get section instead
// (in the language from ?l=, else Accept-Language), never to a listing that does not answer.
function storeRedirect(request: Request, url: URL): Response | null {
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '/get/ios') {
    return new Response(null, { status: 302, headers: { Location: STORES.ios, 'Cache-Control': 'public, max-age=300' } });
  }
  if (path === '/get/android') {
    if (STORES.androidLive) {
      return new Response(null, { status: 302, headers: { Location: STORES.android, 'Cache-Control': 'public, max-age=300' } });
    }
    const asked = url.searchParams.get('l');
    const lang = asked && LANDING.includes(asked) ? asked : pickLanguage(request.headers.get('Accept-Language'));
    return new Response(null, {
      status: 302,
      headers: { Location: `${url.origin}/${lang}/#get`, Vary: 'Accept-Language', 'Cache-Control': 'private, max-age=0' },
    });
  }
  return null;
}

function secure(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === `www.${APEX}`) {
      return secure(Response.redirect(`https://${APEX}${url.pathname}${url.search}`, 301));
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return secure(new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' } }));
    }

    if (url.pathname === '/.well-known/security.txt' || url.pathname === '/security.txt') {
      if (url.pathname === '/security.txt') return secure(Response.redirect(`${url.origin}/.well-known/security.txt`, 301));
      return secure(new Response(request.method === 'HEAD' ? null : SECURITY_TXT, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
      }));
    }

    const store = storeRedirect(request, url);
    if (store) return secure(store);

    // "/" exactly: send each visitor to the landing in their language. public/index.html (English) is only a fallback.
    // The language menu links to /lang/<code>: remember the choice, then open that page (works without JavaScript).
    const pick = /^\/lang\/([A-Za-z-]{2,7})\/?$/.exec(url.pathname);
    if (pick) {
      const code = LANDING.find((c) => c.toLowerCase() === pick[1].toLowerCase());
      const headers = new Headers({ Location: `${url.origin}/${code ?? ''}${code ? '/' : ''}`, 'Cache-Control': 'private, max-age=0' });
      if (code) headers.append('Set-Cookie', langCookie(code));
      return secure(new Response(null, { status: 302, headers }));
    }

    if (url.pathname === '/') {
      // a language the visitor picked before wins, then the browser's languages, then English
      const lang = cookieLanguage(request.headers.get('Cookie')) ?? pickLanguage(request.headers.get('Accept-Language'));
      return secure(new Response(null, {
        status: 302,
        headers: {
          Location: `${url.origin}/${lang}/${url.search}`,
          Vary: 'Accept-Language, Cookie',
          'Cache-Control': 'private, max-age=0',
        },
      }));
    }

    // Old GitHub Pages paths (/braw-site/...) typed by hand: send them to the same page here.
    if (url.pathname === '/braw-site' || url.pathname.startsWith('/braw-site/')) {
      const rest = url.pathname.slice('/braw-site'.length) || '/';
      return secure(Response.redirect(`${url.origin}${rest}${url.search}`, 301));
    }

    if (isVideoPath(url.pathname)) return secure(await videoResponse(request, env.ASSETS));

    return secure(await env.ASSETS.fetch(request));
  },
};
