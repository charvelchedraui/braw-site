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
