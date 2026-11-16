#!/usr/bin/env node
// braws.app landing: writes public/<code>/index.html for the 27 languages the app ships,
// public/index.html (English fallback for "/") and public/sitemap.xml.
//
// Run through npm (it builds the React bundle first):  cd cloudflare/landing && npm run build
//   1. vite build             -> public/assets/landing/app.js + app.css (the client bundle)
//   2. vite build --ssr       -> .ssr/entry-server.js (the same components, for rendering at build time)
//   3. node build.mjs         -> checks every strings file, renders each page to static HTML
// The static HTML reads fully without JavaScript; the bundle then hydrates it and adds the motion.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, '..', 'public');
const ORIGIN = 'https://braws.app';

// Same codes and native names as the app's language picker (braw/src/i18n/i18n.js LANGUAGES).
// hreflang/htmlLang: "pt" in the app is Brazilian Portuguese.
// badge: the localized "Download on the App Store" badge from Apple's marketing tools (CREDITS.md);
// Apple has no en-GB or Hindi version, so those use the US English one.
export const LANGUAGES = [
  { code: 'en', name: 'English (US)', hreflang: 'en', og: 'en_US', badge: 'en-us' },
  { code: 'en-GB', name: 'English (UK)', hreflang: 'en-GB', og: 'en_GB', badge: 'en-us' },
  { code: 'es', name: 'Español', hreflang: 'es', og: 'es_MX', badge: 'es-mx' },
  { code: 'pt', name: 'Português (Brasil)', hreflang: 'pt-BR', og: 'pt_BR', badge: 'pt-br' },
  { code: 'pt-PT', name: 'Português (Portugal)', hreflang: 'pt-PT', og: 'pt_PT', badge: 'pt-pt' },
  { code: 'fr', name: 'Français', hreflang: 'fr', og: 'fr_FR', badge: 'fr-fr' },
  { code: 'de', name: 'Deutsch', hreflang: 'de', og: 'de_DE', badge: 'de-de' },
  { code: 'it', name: 'Italiano', hreflang: 'it', og: 'it_IT', badge: 'it-it' },
  { code: 'nl', name: 'Nederlands', hreflang: 'nl', og: 'nl_NL', badge: 'nl-nl' },
  { code: 'id', name: 'Bahasa Indonesia', hreflang: 'id', og: 'id_ID', badge: 'id-id' },
  { code: 'sv', name: 'Svenska', hreflang: 'sv', og: 'sv_SE', badge: 'sv-se' },
  { code: 'da', name: 'Dansk', hreflang: 'da', og: 'da_DK', badge: 'da-dk' },
  { code: 'ja', name: '日本語', hreflang: 'ja', og: 'ja_JP', badge: 'ja-jp' },
  { code: 'ko', name: '한국어', hreflang: 'ko', og: 'ko_KR', badge: 'ko-kr' },
  { code: 'zh-Hans', name: '简体中文', hreflang: 'zh-Hans', og: 'zh_CN', badge: 'zh-cn' },
  { code: 'zh-Hant', name: '繁體中文', hreflang: 'zh-Hant', og: 'zh_TW', badge: 'zh-tw' },
  { code: 'ru', name: 'Русский', hreflang: 'ru', og: 'ru_RU', badge: 'ru-ru' },
  { code: 'tr', name: 'Türkçe', hreflang: 'tr', og: 'tr_TR', badge: 'tr-tr' },
  { code: 'pl', name: 'Polski', hreflang: 'pl', og: 'pl_PL', badge: 'pl-pl' },
  { code: 'nb', name: 'Norsk', hreflang: 'nb', og: 'nb_NO', badge: 'no-no' },
  { code: 'fi', name: 'Suomi', hreflang: 'fi', og: 'fi_FI', badge: 'fi-fi' },
  { code: 'vi', name: 'Tiếng Việt', hreflang: 'vi', og: 'vi_VN', badge: 'vi-vn' },
  { code: 'ar', name: 'العربية', hreflang: 'ar', og: 'ar_AR', dir: 'rtl', badge: 'ar-ar' },
  { code: 'hi', name: 'हिन्दी', hreflang: 'hi', og: 'hi_IN', badge: 'en-us' },
  { code: 'th', name: 'ไทย', hreflang: 'th', og: 'th_TH', badge: 'th-th' },
  { code: 'uk', name: 'Українська', hreflang: 'uk', og: 'uk_UA', badge: 'uk-ua' },
  { code: 'cs', name: 'Čeština', hreflang: 'cs', og: 'cs_CZ', badge: 'cs-cz' },
];

// Real app screens were captured for these languages (media/app/<code>/); the others show the English ones.
const SHOT_LANGS = new Set(['en', 'es', 'ar']);
// Mixkit contributors of the clips used (see CREDITS.md).
const CREDITS = ['arvizum', 'mustafab', 'mixkit', 'highwayvideography', 'marcolopez', 'dubassy', 'franklandgrave', 'joshjanssen'];

// Every strings/<code>.json must have exactly this shape (en.json is the reference).
const LIST_SHAPES = { cards: ['ico', 'title', 'text'], steps: ['title', 'text'], checks: ['b', 'text'], faq: ['q', 'a'] };
const LIST_LENGTHS = { cards: 6, steps: 3, checks: 6, faq: 8, moods: 4 };
const STRING_LISTS = new Set(['moods']);
const OPTIONAL = new Set(['ids', 'legalHash']);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pathOf = (code) => `/${code}/`;
const urlOf = (code) => `${ORIGIN}${pathOf(code)}`;

function check(code, s, ref) {
  const errs = [];
  for (const k of Object.keys(ref)) {
    if (OPTIONAL.has(k)) continue;
    if (!(k in s)) { errs.push(`missing "${k}"`); continue; }
    if (k in LIST_LENGTHS) {
      if (!Array.isArray(s[k]) || s[k].length !== LIST_LENGTHS[k]) { errs.push(`"${k}" must have ${LIST_LENGTHS[k]} items`); continue; }
      if (STRING_LISTS.has(k)) s[k].forEach((v, i) => { if (typeof v !== 'string' || !v.trim()) errs.push(`${k}[${i}] empty`); });
      else s[k].forEach((item, i) => LIST_SHAPES[k].forEach((f) => { if (typeof item[f] !== 'string' || !item[f].trim()) errs.push(`${k}[${i}].${f} empty`); }));
    } else if (typeof s[k] !== 'string' || !s[k].trim()) errs.push(`"${k}" empty`);
  }
  for (const k of Object.keys(s)) if (!(k in ref) && !OPTIONAL.has(k)) errs.push(`unknown key "${k}"`);
  if (!/\[\[.+?\]\]/.test(s.safetyLead)) errs.push('safetyLead needs a [[privacy link]]');
  if (!/\[\[.+?\]\]/.test(s.faq?.[7]?.a || '')) errs.push('faq[7].a needs a [[delete link]]');
  const flat = JSON.stringify(s);
  for (const v of flat.match(/https?:\/\/[^"\s]+/g) || []) errs.push(`no URLs in copy: ${v}`);
  if (/<[a-z/!]/i.test(flat)) errs.push('no HTML in copy');
  if (/testflight/i.test(flat)) errs.push('no TestFlight in copy');
  if (errs.length) throw new Error(`strings/${code}.json:\n  - ${errs.join('\n  - ')}`);
}

function alternates() {
  return [
    ...LANGUAGES.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlOf(l.code)}">`),
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`,
  ].join('\n');
}

// The badge's own size (its viewBox), so width/height on the <img> keep Apple's proportions.
function badgeOf(locale) {
  const file = join(PUBLIC, 'media', 'badges', `app-store-${locale}.svg`);
  if (!existsSync(file)) throw new Error(`missing App Store badge ${file}`);
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(readFileSync(file, 'utf8'));
  if (!m) throw new Error(`no viewBox in ${file}`);
  return { src: `/media/badges/app-store-${locale}.svg`, w: Math.round(Number(m[1]) * 3), h: Math.round(Number(m[2]) * 3) };
}

// JSON inside <script type="application/json">: never let it close the tag.
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function sitemap() {
  const alt = [
    ...LANGUAGES.map((l) => `  <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${urlOf(l.code)}"/>`),
    `  <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/"/>`,
  ].join('\n');
  const pages = LANGUAGES.map((l) => `<url>\n  <loc>${urlOf(l.code)}</loc>\n${alt}\n</url>`);
  const legal = ['privacy', 'terms', 'support', 'delete'].map((p) => `<url><loc>${ORIGIN}/${p}/</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by cloudflare/landing/build.mjs. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...pages, ...legal].join('\n')}
</urlset>
`;
}

async function main() {
  const template = readFileSync(join(HERE, 'template.html'), 'utf8');
  const load = (code) => JSON.parse(readFileSync(join(HERE, 'strings', `${code}.json`), 'utf8'));
  const ref = load('en');
  // Check every language before writing anything: one bad file stops the whole build.
  const all = LANGUAGES.map((lang) => { const s = load(lang.code); check(lang.code, s, ref); return [lang, s]; });

  const bundle = join(PUBLIC, 'assets', 'landing');
  const js = readFileSync(join(bundle, 'app.js'));
  const css = readFileSync(join(bundle, 'app.css'));
  const version = createHash('sha256').update(js).update(css).digest('hex').slice(0, 12);
  const { render } = await import(pathToFileURL(join(HERE, '.ssr', 'entry-server.js')).href);
  const languages = LANGUAGES.map(({ badge, ...l }) => l);

  for (const [lang, s] of all) {
    const { badge, ...l } = lang;
    const data = { lang: l, languages, s, badge: badgeOf(badge), shots: SHOT_LANGS.has(lang.code) ? lang.code : 'en', credits: CREDITS };
    const ctx = {
      code: lang.code,
      htmlLang: lang.hreflang,
      dir: lang.dir || 'ltr',
      url: urlOf(lang.code),
      alternates: alternates(),
      ogLocale: lang.og,
      ogLocaleAlternates: LANGUAGES.filter((o) => o !== lang).map((o) => `<meta property="og:locale:alternate" content="${o.og}">`).join('\n'),
      title: esc(s.title),
      description: esc(s.description),
      ogDescription: esc(s.ogDescription),
      ogImageAlt: esc(s.ogImageAlt),
      twitterDescription: esc(s.twitterDescription),
      version,
      root: render(data),
      data: jsonForScript(data),
    };
    const html = template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!(k in ctx)) throw new Error(`template uses {{${k}}} but build.mjs has no value for it`);
      return ctx[k];
    });
    if (/testflight/i.test(html)) throw new Error(`${lang.code}: TestFlight must not appear on the landing`);
    mkdirSync(join(PUBLIC, lang.code), { recursive: true });
    writeFileSync(join(PUBLIC, lang.code, 'index.html'), html);
    // "/" is answered by the Worker with a redirect; this copy is only a fallback if the asset is ever served directly.
    if (lang.code === 'en') writeFileSync(join(PUBLIC, 'index.html'), html);
  }
  writeFileSync(join(PUBLIC, 'sitemap.xml'), sitemap());
  console.log(`built ${all.length} landing pages, public/index.html and sitemap.xml (bundle ${version}, ${Math.round(js.length / 1024)} KB js, ${Math.round(css.length / 1024)} KB css)`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
