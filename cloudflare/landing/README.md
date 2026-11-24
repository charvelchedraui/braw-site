# braws.app landing page (27 languages)

The landing page at braws.app exists in the same 27 languages the braws app ships. The pages in
`cloudflare/public/<code>/index.html` are **generated**: never edit them by hand.

| File | What it is |
|---|---|
| `src/` | The page itself: React 18 + TypeScript (`App.tsx`), the motion helpers (`motion.ts`), the styles (`styles.css`). |
| `template.html` | The `<head>` (meta, hreflang, og/twitter) and the shell the rendered page goes into. Shared by every language. |
| `strings/<code>.json` | All the copy for one language: title, meta and og/twitter text, alt texts, aria-labels, cards, moods, steps, safety list, FAQ, dock, footer, skip link. `en.json` is the reference shape. |
| `build.mjs` | Checks every strings file, renders each language with the same React components (server render at build time) and writes `public/<code>/index.html`, `public/index.html` (English fallback) and `public/sitemap.xml`. Also holds the language list (codes, native names, hreflang, og:locale) and the store-button switches (`stores.json`, `FLOAT_BAR`). |

How it is built: the page is static HTML that reads fully without JavaScript (language picker, FAQ, every
section). `public/assets/landing/app.js` then hydrates it and adds the motion: smooth scroll (Lenis), sections
that pin while you scroll (CSS `position: sticky` + motion's `useScroll`), the words lighting up, the lines on the
globe, the speed-reactive word row. With `prefers-reduced-motion: reduce` there is no video (poster only), no pinning,
no smooth scroll and nothing moves by itself. Media lives in `public/media/` (credits and licenses: `../CREDITS.md`).

## Change copy and rebuild

1. Edit the text in `strings/<code>.json`. **Every language must be updated together**: if you
   change a sentence in English, change it in all 27 files in the same commit. The build fails if a
   file is missing a key, has an extra key or an empty value.
2. Rebuild: `cd cloudflare/landing && npm ci && npm run build` (typecheck, client bundle, server render, pages)
3. Commit the strings and the regenerated `public/` files (pages, `assets/landing/`) together.

Rules for the copy:

- The brand is always lowercase Latin `braws`, also at the start of a sentence. "braws" also means
  "friends" ("your braws"): follow how each store listing translates it
  (`braw/mobile/store/listing/<code>.json`), and keep `room` and `stamp` in Latin like the listings do.
- Write `[[text]]` to make a link: in `safetyLead` it links to the privacy policy, in the last FAQ
  answer to the delete-account page. No URLs or HTML in the copy; everything else is escaped.
- Translate locally. Never paste braws text into an external translation service.
- Spanish keeps its old section ids (`ids`) and links to the Spanish part of the legal pages
  (`legalHash: "#es"`). Other languages link to the English legal pages.

To add or change a section, edit `src/App.tsx` (and `src/types.ts`), add the key to all 27 strings files, rebuild.

## How visitors get their language

- Every language lives at `/<code>/` (`/en/`, `/es/`, `/pt-PT/`, `/zh-Hant/`...).
- `/` is answered by the Worker (`cloudflare/src/index.ts`) with a 302 to the best match from
  `Accept-Language` (`Vary: Accept-Language`, not cached). `public/index.html` is an English copy
  only in case the asset is ever served directly.
- The header and the footer have a language picker: a `<details>` menu with plain links, so it
  works without JavaScript. The bundle only closes it on Escape or an outside tap.
- Arabic is right-to-left (`dir="rtl"`); the CSS uses logical properties so the layout mirrors.
  Per-script system font stacks live at the end of `src/styles.css` (Patrick Hand only covers Latin).
## Download buttons (~/landing-blueprint/STORE-BUTTONS.md v3)

- **No official store badges** on the landing (the build fails if `/media/badges/` appears). The badge files stay in
  `public/media/badges/` but are not used.
- **Hero and final section (`#get`):** two identical site buttons (phone outline, `iosCta` / `androidCta` in the hand
  font, the store on a small caps line: "App Store", "Google Play"). Same size and style; stacked full width on phones.
  `#download` still works as an alias for older links.
- **Header:** one button (`navCta`) to `#get`, smooth scroll. On phones the floating bar takes over.
- **Floating bar** (`FLOAT_BAR` in `build.mjs`, on): the same two buttons, compact ("iPhone", "Android"); a centered
  pill on tablet and desktop, a full-width bar on phones. It appears after the hero buttons scroll away and hides once
  the final buttons reach the screen, so it never covers them or the footer; safe-area aware; no motion with reduced
  motion.
- **Links** only through the Worker's `/get/ios` and `/get/android` (`cloudflare/src/index.ts`). The targets live in
  `cloudflare/stores.json`, shared by the Worker and `build.mjs` (the build fails on a direct store link). Never
  TestFlight: the build fails if it appears.
- **Android is not public yet** (`"androidLive": false`): the Android button is the same button, not a link, with no
  extra text; `/get/android` redirects to the landing's `#get` (language from `?l=`, else `Accept-Language`).
  **When Google Play open testing is public** (https://play.google.com/apps/testing/com.braw.app; never the
  internal-test link): set `"androidLive": true` in `cloudflare/stores.json`, rebuild and deploy. The button becomes a
  link, and the note and the devices answer in the FAQ switch to their Android versions (`noteAndroid`,
  `faqDevicesAndroid`). Once braws is in production on Play, change `"android"` to the listing
  (https://play.google.com/store/apps/details?id=com.braw.app). Preview first with `BRAWS_PLAY_PREVIEW=1 npm run build`
  (never deploy that build), then `npm run build` again.

If the app adds a language: add it to `LANGUAGES` in `build.mjs`, to `LANDING` in
`cloudflare/src/index.ts`, write `strings/<code>.json`, rebuild.
