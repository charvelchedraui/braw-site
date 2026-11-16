// Invite landing: reads ?code=BRAW-XXXX&lang=en|es and offers the braw:// deep link (the app's URL scheme).
(function () {
  const APP_STORE = 'https://apps.apple.com/app/id6833073203';
  const TESTFLIGHT = 'https://testflight.apple.com/join/Yx2byAmn';
  // mientras Apple no aprueba la versión 1.0, el botón principal lleva a TestFlight; al publicarse, cambiar a true
  const LIVE = true;
  const params = new URLSearchParams(location.search);
  const raw = (params.get('code') || '').trim().toUpperCase();
  const valid = /^BRAW-[A-HJ-NP-Z2-9]{4}$/.test(raw);
  const q = params.get('lang');
  let lang = q === 'es' ? 'es' : q === 'en' ? 'en' : (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
  const copy = {
    en: {title: 'your friend saved you a spot.', intro: 'a pet to care for, a room to make yours, and a little world to share together.', open: 'open my invitation in braws', install: LIVE ? 'get braws on the App Store' : 'get braws (beta on TestFlight)', help: 'already have braws? open your invitation and the code will be ready. installing for the first time? get braws from the App Store, then return to this link. beta tester? ', tf: 'use TestFlight', copy: 'copy', copied: 'code copied', missing: 'you need an invitation.', invalid: 'ask your friend to send you their full invitation link.', fallback: 'if braws didn’t open, install it from the App Store, then come back to this link. you can also copy the code and enter it in braws.'},
    es: {title: 'tu braw te guardó un lugar.', intro: 'una mascota que cuidar, un cuarto para hacerlo tuyo y un pequeño mundo para compartir.', open: 'abrir mi invitación en braws', install: LIVE ? 'bajar braws en el App Store' : 'bajar braws (beta en TestFlight)', help: '¿ya tienes braws? abre tu invitación y el código estará listo. ¿es tu primera vez? baja braws del App Store y después vuelve a este enlace. ¿estás en la beta? ', tf: 'usa TestFlight', copy: 'copiar', copied: 'código copiado', missing: 'necesitas una invitación.', invalid: 'pídele a tu braw que te mande el enlace completo de su invitación.', fallback: 'si braws no se abrió, instálala desde el App Store y después vuelve a este enlace. también puedes copiar el código e ingresarlo en braws.'}
  };
  const $ = id => document.getElementById(id);
  function render() {
    const t = copy[lang];
    document.documentElement.lang = lang;
    $('title').textContent = valid ? t.title : t.missing;
    $('intro').textContent = valid ? t.intro : t.invalid;
    $('codeBox').hidden = !valid;
    $('open').hidden = !valid;
    $('code').textContent = valid ? raw : '';
    $('open').textContent = t.open;
    $('open').href = valid ? 'braw://invite/' + encodeURIComponent(raw) : '#';
    $('install').textContent = t.install;
    $('install').href = LIVE ? APP_STORE : TESTFLIGHT;
    const help = $('help');
    help.textContent = t.help;
    const a = document.createElement('a');
    a.href = TESTFLIGHT;
    a.textContent = t.tf;
    help.append(a, '.');
    $('copy').textContent = t.copy;
    $('language').textContent = lang === 'en' ? 'español' : 'english';
    $('language').lang = lang === 'en' ? 'es' : 'en';
    $('status').textContent = '';
  }
  function init() {
    $('language').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; render(); });
    $('copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(raw); $('status').textContent = copy[lang].copied; }
      catch { const sel = getSelection(), range = document.createRange(); range.selectNodeContents($('code')); sel.removeAllRanges(); sel.addRange(range); }
    });
    $('open').addEventListener('click', () => { $('status').textContent = copy[lang].fallback; });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
