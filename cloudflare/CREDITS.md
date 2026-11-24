# braws.app credits: footage, badges, art and packages

Everything on the landing page is real: real stock footage under a free license, real braws app screens,
Paula's own art from the app, and Apple's official badge. No AI-generated people, art, video or device UI.

## Footage (hero loop and strip clips)

All clips are from **Mixkit** under the **Mixkit Stock Video Free License** (https://mixkit.co/license/#videoFree),
checked on **November 16, 2026**: free for commercial and non-commercial use, modification allowed, attribution
not required (we credit the contributors in the footer anyway). Each clip page below showed the Free license
(not the "Restricted" one, which only allows personal use; clips under that license were rejected).
Mixkit's User Terms still apply: no implying that the people shown endorse braws, no reselling the clips as is.

Hands only, from behind or silhouettes; no identifiable faces, no names or places in captions.

| Clip | Page | Contributor | Used in |
|---|---|---|---|
| Hands of a person typing on a cell phone (4915) | https://mixkit.co/free-stock-video/hands-of-a-person-typing-on-a-cell-phone-4915/ | @arvizum | hero 4.0 to 6.0 s |
| Petting a cute cat, close up (1778) | https://mixkit.co/free-stock-video/petting-a-cute-cat-close-up-1778/ | @mustafab | hero 6.0 to 8.0 s; strip "cat" 10.0 to 12.6 s |
| Drawing a heart on a foggy window on a rainy day (18308) | https://mixkit.co/free-stock-video/drawing-a-heart-on-a-foggy-window-on-a-rainy-18308/ | @arvizum | hero 4.0 to 6.5 s; strip "window" 5.5 to 8.1 s |
| Close up view, serving a sparkling cappuccino (41858) | https://mixkit.co/free-stock-video/close-up-view-serving-a-sparkling-cappuccino-41858/ | @mixkit | hero 4.0 to 6.0 s; strip "latte" 7.0 to 9.6 s |
| Couple walking hand in hand (4661) | https://mixkit.co/free-stock-video/couple-walking-hand-in-hand-4661/ | @highwayvideography | hero 3.0 to 5.0 s |
| Hands shown texting on a smartphone (144) | https://mixkit.co/free-stock-video/hands-shown-texting-on-a-smartphone-144/ | @marcolopez | hero 6.0 to 8.0 s |
| Cat taking a nap (4102) | https://mixkit.co/free-stock-video/cat-taking-a-nap-4102/ | @dubassy | hero 5.0 to 7.0 s; strip "nap" 8.0 to 10.6 s |
| Steaming mug (808) | https://mixkit.co/free-stock-video/steaming-mug-808/ | @franklandgrave | strip "mug" 3.0 to 5.6 s |
| A person texting on a smartphone (1711) | https://mixkit.co/free-stock-video/a-person-texting-on-a-smartphone-1711/ | @joshjanssen | strip "phone" 4.0 to 6.6 s |

Edit: 7 cuts in the order above (hero), 24 fps, one light grade (saturation 0.86, contrast +4%, a little warmer),
the last 0.5 s dissolves into frame 1 so the loop is seamless. No audio, no text burned in, no AI upscaling.
The phone version is a centered vertical crop of the same cuts.

| File (`public/media/`) | Spec | Size |
|---|---|---|
| hero/hero.mp4 | 1920x1080, 14.0 s, H.264 High CRF 27, faststart, no audio | 2.8 MB |
| hero/hero.webm | 1920x1080, 14.0 s, VP9 CRF 40 | 1.6 MB |
| hero/hero-mobile.mp4 | 720x1280, 14.0 s, H.264 High CRF 28, faststart, no audio | 1.4 MB |
| hero/hero-mobile.webm | 720x1280, 14.0 s, VP9 CRF 41 | 0.9 MB |
| hero/hero-poster.webp / .jpg | 1600x900, frame 1 | 24 KB / 48 KB |
| hero/hero-mobile-poster.webp | 720x1280, frame 1 | 14 KB |
| clips/*.mp4 + *.webp | 480x600, 2.6 s, H.264 CRF 28, poster = frame 1 | 19 to 159 KB |

The videos are served by the Worker with byte ranges (206), which Safari needs: `src/video-range.ts`.

## App Store badge

`public/media/badges/app-store-<locale>.svg`: Apple's official "Download on the App Store" badge, black, downloaded
unmodified on November 16, 2026 from Apple's marketing tools
(https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/<locale>), used under
Apple's App Store marketing guidelines (https://developer.apple.com/app-store/marketing/guidelines/). Localized
badges are used where Apple has one; en-GB and Hindi use the US English badge (Apple has no en-gb or hi version).
Norwegian uses `no-no`, Arabic `ar-ar`, Traditional Chinese `zh-tw`. Only the display height is set in CSS.

## Google Play badge

`public/media/badges/google-play-<lang>.png`: Google's official "Get it on Google Play" badge (646x250), unmodified,
from `~/store-badges` (fetched November 23, 2026 from
https://play.google.com/intl/en_us/badges/static/images/badges/<lang>_badge_web_generic.png), used under the Google
Play badge guidelines (https://partnermarketinghub.withgoogle.com/brands/google-play/visual-identity/badge-guidelines/).
Shown only while `PLAY_LIVE` is on in `landing/build.mjs`. The page sizes it by its black area, so it matches the App
Store badge's height; its transparent margin overlaps, nothing is cropped. Footer line: "Google Play and the Google
Play logo are trademarks of Google LLC."

## braws art and app screens

- `public/media/pets/*.svg`: the pet (Mochi in its moods), exported from the app's own pet
  renderer (`braw/src/base.html`, Paula's art), nothing redrawn.
- `public/media/app/<en|es|ar>/*.webp`: raw screens of the real app (`braw/index.html`) with the demo account
  (invite `BRAW-DEMO`), rendered in Docker with Playwright on November 16, 2026 (recaptured the same day after the avatar-pet fix in braw PR #60). No frames, captions or edits.
  Other languages show the English screens.
- `public/assets/room.webp`, `public/assets/world.webp`: Paula's art, as on the previous landing.
- Patrick Hand font: SIL Open Font License, `public/assets/OFL-PatrickHand.txt`.

## npm packages (cloudflare/landing)

| Package | Version | License | Repository |
|---|---|---|---|
| react, react-dom | 18.3.1 | MIT | https://github.com/facebook/react |
| motion | 14.14.0 | MIT | https://github.com/motiondivision/motion |
| lenis | 1.3.27 | MIT | https://github.com/darkroomengineering/lenis |
| vite (dev) | 8.3.8 | MIT | https://github.com/vitejs/vite |
| @vitejs/plugin-react (dev) | 6.3.0 | MIT | https://github.com/vitejs/vite-plugin-react |
| typescript (dev) | 6.0.3 | Apache-2.0 | https://github.com/microsoft/TypeScript |
| @types/react, @types/react-dom (dev) | 18.3.31, 18.3.7 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |

GSAP was not used: its "Standard no-charge license" is not one of the licenses the project allows
(MIT, Apache-2.0, BSD, ISC, MPL-2.0). Scroll-driven motion uses `motion` (useScroll) and CSS `position: sticky` instead.

- 16 nov 2026: los clips de la tira se volvieron a codificar de ida y vuelta (adelante + en reversa) para que el loop no salte.
