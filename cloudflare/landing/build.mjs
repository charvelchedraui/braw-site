#!/usr/bin/env node
// braws.app landing: builds public/<code>/index.html for the 27 languages the app ships,
// public/index.html (English fallback for "/") and public/sitemap.xml.
// Plain Node, no packages:  node cloudflare/landing/build.mjs
// Copy lives in strings/<code>.json; the page structure lives in template.html.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, '..', 'public');
const ORIGIN = 'https://braws.app';
const STORE = 'https://apps.apple.com/app/id6833073203';

// Same codes and native names as the app's language picker (braw/src/i18n/i18n.js LANGUAGES).
// hreflang/htmlLang: "pt" in the app is Brazilian Portuguese.
export const LANGUAGES = [
  { code: 'en', name: 'English (US)', hreflang: 'en', og: 'en_US' },
  { code: 'en-GB', name: 'English (UK)', hreflang: 'en-GB', og: 'en_GB' },
  { code: 'es', name: 'Español', hreflang: 'es', og: 'es_MX' },
  { code: 'pt', name: 'Português (Brasil)', hreflang: 'pt-BR', og: 'pt_BR' },
  { code: 'pt-PT', name: 'Português (Portugal)', hreflang: 'pt-PT', og: 'pt_PT' },
  { code: 'fr', name: 'Français', hreflang: 'fr', og: 'fr_FR' },
  { code: 'de', name: 'Deutsch', hreflang: 'de', og: 'de_DE' },
  { code: 'it', name: 'Italiano', hreflang: 'it', og: 'it_IT' },
  { code: 'nl', name: 'Nederlands', hreflang: 'nl', og: 'nl_NL' },
  { code: 'id', name: 'Bahasa Indonesia', hreflang: 'id', og: 'id_ID' },
  { code: 'sv', name: 'Svenska', hreflang: 'sv', og: 'sv_SE' },
  { code: 'da', name: 'Dansk', hreflang: 'da', og: 'da_DK' },
  { code: 'ja', name: '日本語', hreflang: 'ja', og: 'ja_JP' },
  { code: 'ko', name: '한국어', hreflang: 'ko', og: 'ko_KR' },
  { code: 'zh-Hans', name: '简体中文', hreflang: 'zh-Hans', og: 'zh_CN' },
  { code: 'zh-Hant', name: '繁體中文', hreflang: 'zh-Hant', og: 'zh_TW' },
  { code: 'ru', name: 'Русский', hreflang: 'ru', og: 'ru_RU' },
  { code: 'tr', name: 'Türkçe', hreflang: 'tr', og: 'tr_TR' },
  { code: 'pl', name: 'Polski', hreflang: 'pl', og: 'pl_PL' },
  { code: 'nb', name: 'Norsk', hreflang: 'nb', og: 'nb_NO' },
  { code: 'fi', name: 'Suomi', hreflang: 'fi', og: 'fi_FI' },
  { code: 'vi', name: 'Tiếng Việt', hreflang: 'vi', og: 'vi_VN' },
  { code: 'ar', name: 'العربية', hreflang: 'ar', og: 'ar_AR', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', hreflang: 'hi', og: 'hi_IN' },
  { code: 'th', name: 'ไทย', hreflang: 'th', og: 'th_TH' },
  { code: 'uk', name: 'Українська', hreflang: 'uk', og: 'uk_UA' },
  { code: 'cs', name: 'Čeština', hreflang: 'cs', og: 'cs_CZ' },
];

// Every strings/<code>.json must have exactly this shape (en.json is the reference).
const LIST_SHAPES = { cards: ['ico', 'title', 'text'], steps: ['title', 'text'], checks: ['b', 'text'], faq: ['q', 'a'] };
const LIST_LENGTHS = { cards: 6, steps: 3, checks: 6, faq: 8 };
const OPTIONAL = new Set(['ids', 'legalHash']);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pathOf = (code) => `/${code}/`;
const urlOf = (code) => `${ORIGIN}${pathOf(code)}`;

// "[[text]]" in a string becomes a link to `href`; everything else is escaped.
function linked(s, href) {
  const out = esc(s).replace(/\[\[(.+?)\]\]/g, (_, t) => `<a href="${href}">${t}</a>`);
  if (/\[\[|\]\]/.test(out)) throw new Error(`unbalanced [[link]] in: ${s}`);
  return out;
}

function check(code, s, ref) {
  const errs = [];
  for (const k of Object.keys(ref)) {
    if (OPTIONAL.has(k)) continue;
    if (!(k in s)) { errs.push(`missing "${k}"`); continue; }
    if (k in LIST_SHAPES) {
      if (!Array.isArray(s[k]) || s[k].length !== LIST_LENGTHS[k]) { errs.push(`"${k}" must have ${LIST_LENGTHS[k]} items`); continue; }
      s[k].forEach((item, i) => LIST_SHAPES[k].forEach((f) => { if (typeof item[f] !== 'string' || !item[f].trim()) errs.push(`${k}[${i}].${f} empty`); }));
    } else if (typeof s[k] !== 'string' || !s[k].trim()) errs.push(`"${k}" empty`);
  }
  for (const k of Object.keys(s)) if (!(k in ref) && !OPTIONAL.has(k)) errs.push(`unknown key "${k}"`);
  if (!/\[\[.+?\]\]/.test(s.safetyLead)) errs.push('safetyLead needs a [[privacy link]]');
  if (!/\[\[.+?\]\]/.test(s.faq[7]?.a || '')) errs.push('faq[7].a needs a [[delete link]]');
  for (const v of JSON.stringify(s).match(/https?:\/\/[^"\s]+/g) || []) errs.push(`no URLs in copy: ${v}`);
  if (errs.length) throw new Error(`strings/${code}.json:\n  - ${errs.join('\n  - ')}`);
}

function alternates() {
  return [
    ...LANGUAGES.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlOf(l.code)}">`),
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`,
  ].join('\n');
}

const GLOBE = '<svg class="globe-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

// A <details> menu of plain links: works without JavaScript; site.js only adds Escape/outside-click closing.
function langPicker(lang, s, where) {
  const items = LANGUAGES.map((l) => {
    const cur = l.code === lang.code ? ' aria-current="page"' : '';
    const dir = l.dir ? ` dir="${l.dir}"` : '';
    return `      <li><a href="${pathOf(l.code)}" hreflang="${l.hreflang}" lang="${l.hreflang}"${dir}${cur}>${esc(l.name)}</a></li>`;
  }).join('\n');
  return `  <details class="langs langs-${where}">
    <summary>${GLOBE}<span class="vh">${esc(s.langLabel)}: </span><span class="lang-name" lang="${lang.hreflang}">${esc(lang.name)}</span></summary>
    <ul class="langs-list" aria-label="${esc(s.langLabel)}">
${items}
    </ul>
  </details>`;
}

function storeButton(s) {
  return `<a class="store" href="${STORE}" aria-label="${esc(s.storeLabel)}"><img src="/apple-touch-icon.png" alt="" width="44" height="44"><span class="txt"><strong>${esc(s.storeTitle)}</strong><small>${esc(s.storeSub)}</small></span><span class="go" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>`;
}

function render(template, lang, s) {
  const legalHash = s.legalHash || '';
  const ids = { what: 'what', how: 'how', safety: 'safety', faq: 'faq', ...(s.ids || {}) };
  const ctx = {
    code: lang.code,
    htmlLang: lang.hreflang,
    dir: lang.dir || 'ltr',
    url: urlOf(lang.code),
    path: pathOf(lang.code),
    alternates: alternates(),
    ogLocale: lang.og,
    ogLocaleAlternates: LANGUAGES.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${l.og}">`).join('\n'),
    langPickerHead: langPicker(lang, s, 'head'),
    langPickerFoot: langPicker(lang, s, 'foot'),
    storeButton: storeButton(s),
    idWhat: ids.what, idHow: ids.how, idSafety: ids.safety, idFaq: ids.faq,
    legalHash,
    safetyLead: linked(s.safetyLead, `/privacy/${legalHash}`),
    cards: s.cards.map((c) => `    <article class="card"><span class="ico">${esc(c.ico)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join('\n'),
    steps: s.steps.map((st) => `    <li><strong>${esc(st.title)}</strong>${esc(st.text)}</li>`).join('\n'),
    checks: s.checks.map((c) => `    <li><strong>${esc(c.b)}</strong> ${esc(c.text)}</li>`).join('\n'),
    faq: s.faq.map((f) => `  <details><summary>${esc(f.q)}</summary><p>${linked(f.a, `/delete/${legalHash}`)}</p></details>`).join('\n'),
  };
  for (const [k, v] of Object.entries(s)) if (typeof v === 'string' && !(k in ctx)) ctx[k] = esc(v);
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in ctx)) throw new Error(`template uses {{${k}}} but ${lang.code} has no value for it`);
    return ctx[k];
  });
}

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

function main() {
  const template = readFileSync(join(HERE, 'template.html'), 'utf8');
  const load = (code) => JSON.parse(readFileSync(join(HERE, 'strings', `${code}.json`), 'utf8'));
  const ref = load('en');
  const out = [];
  for (const lang of LANGUAGES) {
    const s = load(lang.code);
    check(lang.code, s, ref);
    const html = render(template, lang, s);
    mkdirSync(join(PUBLIC, lang.code), { recursive: true });
    writeFileSync(join(PUBLIC, lang.code, 'index.html'), html);
    out.push(lang.code);
    // "/" is answered by the Worker with a redirect; this copy is only a fallback if the asset is ever served directly.
    if (lang.code === 'en') writeFileSync(join(PUBLIC, 'index.html'), html);
  }
  writeFileSync(join(PUBLIC, 'sitemap.xml'), sitemap());
  console.log(`built ${out.length} landing pages (${out.join(', ')}), public/index.html and sitemap.xml`);
}

main();
