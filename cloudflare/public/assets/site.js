// braws.app: barra de descarga fija en el teléfono cuando el botón principal ya no se ve. Sin rastreo ni datos.
(function () {
  var dock = document.getElementById('dock');
  var hero = document.querySelector('.hero .store');
  var last = document.querySelectorAll('.store');
  last = last[last.length - 1];
  if (!dock || !hero || !('IntersectionObserver' in window)) return;
  dock.hidden = false;
  var seen = new Set();
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); });
    var past = hero.getBoundingClientRect().bottom < 0;
    dock.classList.toggle('is-on', past && seen.size === 0);
  }, { threshold: 0 });
  io.observe(hero); if (last && last !== hero) io.observe(last);
  window.addEventListener('scroll', function () {
    var past = hero.getBoundingClientRect().bottom < 0;
    dock.classList.toggle('is-on', past && seen.size === 0);
  }, { passive: true });
})();
// Selector de idioma: es un <details> con enlaces y funciona sin JavaScript. Esto solo lo cierra con Escape,
// al tocar fuera o al abrir el otro selector.
(function () {
  var menus = [].slice.call(document.querySelectorAll('details.langs'));
  if (!menus.length) return;
  menus.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) menus.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener('click', function (e) {
    menus.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    menus.forEach(function (d) {
      if (!d.open) return;
      d.open = false;
      var s = d.querySelector('summary'); if (s) s.focus();
    });
  });
})();
