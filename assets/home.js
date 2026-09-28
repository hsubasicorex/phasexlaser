/* PhaseX home page behaviour.

   Three things the home page needs beyond the shared navigation: the hero video
   playback rate, the FAQ accordion, and the scroll reveal.

   The reveal is deliberately fail-safe. The hiding rule in home.css is gated on
   html.reveal-on, and only this file ever sets that class. If this script does
   not load, does not parse, or stops before it runs, the class is never set and
   every section stays visible. A blank page is not an acceptable failure mode
   for a decorative animation.

   Anyone who has asked their system not to animate gets the content with no
   transition and no starting offset. */
(function () {
  var root = document.documentElement;

  /* ---- hero video ---- */
  var hv = document.getElementById('heroVideo');
  if (hv) {
    var setRate = function () { try { hv.playbackRate = 1.4; } catch (e) {} };
    hv.addEventListener('loadedmetadata', setRate);
    setRate();
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.parentElement,
          answer = q.nextElementSibling,
          wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq__item').forEach(function (i) {
        i.classList.remove('open');
        var a = i.querySelector('.faq__a');
        if (a) a.style.maxHeight = null;
      });
      if (!wasOpen) {
        item.classList.add('open');
        if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ---- scroll reveal ---- */
  var targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  function showAll() {
    targets.forEach(function (el) { el.classList.add('in'); });
  }

  var reduce = false;
  try {
    reduce = window.matchMedia &&
             window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduce = false; }

  if (reduce || !('IntersectionObserver' in window)) {
    /* never arm the hiding rule: content is visible from the first paint */
    showAll();
    return;
  }

  root.classList.add('reveal-on');   /* from here the CSS may hide .reveal */
  try {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } catch (e) {
    /* observer construction failed: undo the gate and show everything */
    root.classList.remove('reveal-on');
    showAll();
  }

  /* Last resort. If anything above silently fails to reveal a section that is
     already in view, this makes the page readable rather than empty. */
  window.setTimeout(function () {
    var hidden = 0;
    targets.forEach(function (el) { if (!el.classList.contains('in')) hidden++; });
    if (hidden === targets.length) {
      root.classList.remove('reveal-on');
      showAll();
    }
  }, 2500);
})();
