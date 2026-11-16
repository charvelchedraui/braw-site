// braws.app Worker: www -> apex redirect, security headers on every response,
// /.well-known/security.txt, and static assets (with public/404.html for unknown paths).

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

    // Old GitHub Pages paths (/braw-site/...) typed by hand: send them to the same page here.
    if (url.pathname === '/braw-site' || url.pathname.startsWith('/braw-site/')) {
      const rest = url.pathname.slice('/braw-site'.length) || '/';
      return secure(Response.redirect(`${url.origin}${rest}${url.search}`, 301));
    }

    return secure(await env.ASSETS.fetch(request));
  },
};
