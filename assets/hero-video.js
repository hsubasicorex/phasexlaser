/* Hero clip behaviour. The RIGHTS question is untouched and still open.

   The audit in _handoff/MEDIA-LEDGER.json could not establish a licence for
   hero.mp4 - it carries a broadcast timecode and no ownership record - and
   that stays a release blocker for the owner to settle. What is fixed here is
   behaviour, which is a defect whatever the rights turn out to be.

   WHAT WAS WRONG. The element was autoplay + loop with no preload attribute,
   so the browser default applied and most engines fetched the whole 3.69 MiB
   on every home-page load, on mobile data included, on the LCP route. Being
   loop, it then never stopped: not scrolled out of view, not with the tab
   hidden.

   preload="metadata" is the measured middle choice. "none" would leave the
   poster alone until play is attempted and autoplay would then stall on a
   slow link, showing a still frame where the design expects motion; "auto"
   is what produced the 3.69 MiB. Metadata fetches the container header, and
   playback starts from there. The poster carries the first paint either way,
   so LCP is the poster, not the clip.

   The reader's own choice outranks everything: if someone pauses the clip,
   scrolling away and back does not restart it.
*/
(function () {
  'use strict';
  var v = document.getElementById('heroVideo');
  if (!v) return;

  var userPaused = false;
  var onScreen = true;

  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      userPaused = true;
      v.removeAttribute('autoplay');
      try { v.pause(); } catch (e) {}
    }
  } catch (e) { /* older engine */ }

  v.addEventListener('pause', function () {
    // only a deliberate pause counts; ours set the flag before calling pause
    if (onScreen && !document.hidden) userPaused = true;
  });
  v.addEventListener('play', function () { userPaused = false; });

  function suspend() {
    if (v.paused) return;
    var wasUser = userPaused;
    try { v.pause(); } catch (e) {}
    userPaused = wasUser;              // suspending is not the reader pausing
  }

  function resume() {
    if (userPaused || !onScreen || document.hidden) return;
    var p = v.play();
    if (p && p.catch) { p.catch(function () { /* poster stays */ }); }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (onScreen) { resume(); } else { suspend(); }
    }, { threshold: 0.15 }).observe(v);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { suspend(); } else { resume(); }
  });
}());
