# braws.app landing page (27 languages)

The landing page at braws.app exists in the same 27 languages the braws app ships. The pages in
`cloudflare/public/<code>/index.html` are **generated**: never edit them by hand.

| File | What it is |
|---|---|
| `template.html` | The page structure (sections, buttons, dock, meta tags). Shared by every language. |
| `strings/<code>.json` | All the copy for one language: title, meta and og/twitter text, alt texts, aria-labels, cards, steps, safety list, FAQ, buttons, dock, footer, skip link. `en.json` is the reference shape. |
| `build.mjs` | Plain Node (no packages). Writes `public/<code>/index.html` for all 27 languages, `public/index.html` (English fallback) and `public/sitemap.xml`. Also holds the language list (codes, native names, hreflang, og:locale). |

## Change copy and rebuild

1. Edit the text in `strings/<code>.json`. **Every language must be updated together**: if you
   change a sentence in English, change it in all 27 files in the same commit. The build fails if a
   file is missing a key, has an extra key or an empty value.
2. Rebuild: `node cloudflare/landing/build.mjs`
3. Commit the strings and the regenerated `public/` files together.

Rules for the copy:

- The brand is always lowercase Latin `braws`, also at the start of a sentence. "braws" also means
  "friends" ("your braws"): follow how each store listing translates it
  (`braw/mobile/store/listing/<code>.json`), and keep `room` and `stamp` in Latin like the listings do.
- Write `[[text]]` to make a link: in `safetyLead` it links to the privacy policy, in the last FAQ
  answer to the delete-account page. No URLs or HTML in the copy; everything else is escaped.
- Translate locally. Never paste braws text into an external translation service.
- Spanish keeps its old section ids (`ids`) and links to the Spanish part of the legal pages
  (`legalHash: "#es"`). Other languages link to the English legal pages.

To add or change a section, edit `template.html` (placeholders are `{{key}}`) and add the key to
all 27 strings files.

## How visitors get their language

- Every language lives at `/<code>/` (`/en/`, `/es/`, `/pt-PT/`, `/zh-Hant/`...).
- `/` is answered by the Worker (`cloudflare/src/index.ts`) with a 302 to the best match from
  `Accept-Language` (`Vary: Accept-Language`, not cached). `public/index.html` is an English copy
  only in case the asset is ever served directly.
- The header and the footer have a language picker: a `<details>` menu with plain links, so it
  works without JavaScript. `assets/site.js` only closes it on Escape or an outside tap.
- Arabic is right-to-left (`dir="rtl"`); the CSS uses logical properties so the layout mirrors.
  Per-script system font stacks live at the end of `assets/site.css` (Patrick Hand only covers Latin).

If the app adds a language: add it to `LANGUAGES` in `build.mjs`, to `LANDING` in
`cloudflare/src/index.ts`, write `strings/<code>.json`, rebuild.
