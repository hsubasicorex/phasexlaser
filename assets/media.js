/* Service-page clip: one short, silent, looping clip per page.
 *
 * WHAT THIS DOES NOT DO, and why. It never ships a byte of video until the
 * page has decided the viewer wants it. The <video> element carries no src at
 * all - only data-src - so preload="none" is not a request the browser can
 * quietly ignore. Nothing is fetched on a phone, on a metered connection, on a
 * slow connection, or for a reader who has asked for reduced motion; those
 * viewers get the poster, which is a still frame of the same clip, and a
 * control they can press if they want it anyway.
 *
 * Only one clip exists per page, but the pause-the-others rule is written
 * anyway: a page that later carries two must not play both.
 */
(function () {
  'use strict';

  var vids = [].slice.call(document.querySelectorAll('video[data-src]'));
  if (!vids.length) return;

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function thrifty() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    if (c.saveData) return true;
    var t = c.effectiveType || '';
    return t === 'slow-2g' || t === '2g';
  }

  function small() {
    try { return !window.matchMedia('(min-width: 768px)').matches; }
    catch (e) { return false; }
  }

  /* THREE PATHS, not two. The first version of this file had only two - play
     by itself, or wait for a press - and it put every viewer who was not on
     the autoplay path onto the press-to-play one. That included the two groups
     who must not be offered the clip at all: a reader who has asked for
     reduced motion, and a connection the browser itself reports as metered or
     slow. They were shown a control whose whole purpose is to fetch a megabyte
     of video. The control is now withheld from them entirely, so no request
     can be made from those paths even by accident.

       poster  reduced motion, Save-Data, 2g  - poster only, no control, no src
       press   anything under 768px            - control shown, load on press
       auto    everything else                 - load and play when in view   */
  var mode = (reduced() || thrifty()) ? 'poster' : (small() ? 'press' : 'auto');

  function attach(v) {
    if (v.dataset.attached) return;
    v.dataset.attached = '1';
    v.src = v.getAttribute('data-src');
    v.load();
  }

  function stopOthers(keep) {
    vids.forEach(function (v) {
      if (v !== keep && !v.paused) v.pause();
    });
  }

  function play(v) {
    attach(v);
    stopOthers(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* a refused play is not an error */ });
  }

  vids.forEach(function (v) {
    var fig = v.closest('.pxv') || v.parentNode;
    var btn = fig.querySelector('.pxv__play');

    /* The poster path returns before anything is wired. No control, no
       listener, no src: the <video> keeps its poster and stays a picture.
       The button is REMOVED rather than left hidden, because `hidden` is a
       presentation hint and a stylesheet can out-rank it - which is exactly
       what happened once already. A node that is not in the document cannot be
       revealed by CSS. The stylesheet rule is still there as well: it covers
       the moment before this script runs, and the case where it never does. */
    if (mode === 'poster') {
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      return;
    }

    if (btn) {
      btn.hidden = false;
      btn.addEventListener('click', function () {
        if (v.paused) play(v); else v.pause();
      });
    }
    v.addEventListener('play', function () { fig.classList.add('is-playing'); });
    v.addEventListener('pause', function () { fig.classList.remove('is-playing'); });

    if (mode !== 'auto') return;

    if (!('IntersectionObserver' in window)) { return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.35) play(v);
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.35, 0.6] });
    io.observe(v);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) vids.forEach(function (v) { if (!v.paused) v.pause(); });
  });
}());
