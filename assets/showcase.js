/* PhaseX systems showcase.

   Progressive enhancement over markup that already works. Without this file
   every panel is visible, stacked and readable - which is what a crawler, an
   answer engine and a reader with scripting blocked all get. This file adds
   .vshow--js and only then does one-at-a-time behaviour exist.

   NO USER-VISIBLE STRINGS LIVE HERE. Every label, including the status
   announcement, is read from data- attributes written by the page, so all of
   it goes through the normal four-language catalogue. A string hard-coded in a
   script ships in English on a German page, which this project has paid for
   twice.

   ---- ADVANCE: ONE OWNER AT A TIME -------------------------------------
   The first version kept a seven-second interval running after a clip
   started, so a twelve-second video would be cut at seven. While a video is
   playing the video owns advancing, through its own `ended` event, and the
   interval is not running at all. A static panel has no end, so there the
   timer owns it. Exactly one of the two is ever armed.

   ---- PAUSE: SAY WHAT YOU DO -------------------------------------------
   The old visibilitychange handler stopped the interval and left the video
   playing, while the comment above it claimed hidden tabs stopped it. Hidden
   tab and offscreen now both pause the element itself. On return, playback
   resumes only if the READER did not pause it: an explicit pause outranks
   coming back into view.

   ---- ANNOUNCEMENTS: ONLY WHEN ASKED -----------------------------------
   A polite live region rewritten every seven seconds interrupts a screen
   reader over and over for a change the reader did not ask for. Automatic
   rotation now updates the status text silently, with aria-live="off"; the
   region is switched to polite only for the moment an explicit control is
   used. That is the behaviour the carousel pattern asks for, and it is why
   the markup ships with aria-live="off".

   ---- TOGGLE: ONE MODEL ------------------------------------------------
   An action button with a changing accessible name - "Pause the panels" /
   "Play the panels" - and NO aria-pressed. The old control changed its name
   AND carried a pressed state, which is two models at once: a screen reader
   would announce a button that says "play" and is "not pressed", and neither
   half tells the reader what will happen.
*/
(function () {
  'use strict';
  var stage = document.querySelector('.vshow__stage');
  if (!stage) return;

  var slides = [].slice.call(stage.querySelectorAll('.vshow__slide'));
  if (slides.length < 2) return;

  var dots = [].slice.call(stage.querySelectorAll('.vshow__dot'));
  var status = stage.querySelector('.vshow__status');
  var toggle = stage.querySelector('[data-act="toggle"]');
  var L = {
    playing: stage.getAttribute('data-status-playing') || '',
    paused: stage.getAttribute('data-status-paused') || '',
    play: stage.getAttribute('data-label-play') || '',
    pause: stage.getAttribute('data-label-pause') || ''
  };

  var reduce = false;
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* older engine: treat as no preference */ }

  var i = 0;
  var timer = null;
  var onScreen = true;
  var userPaused = reduce;          // reduced motion starts paused, by choice
  var DWELL = 7000;

  stage.classList.add('vshow--js');

  function current() { return slides[i]; }
  function video() { return current().querySelector('video'); }

  function setStatus(announce) {
    if (!status) return;
    // polite only for an explicit action; silent for automatic rotation
    status.setAttribute('aria-live', announce ? 'polite' : 'off');
    // The whole sentence belongs to the language; this only substitutes.
    //
    // The previous version assembled it here from a bare "of" label, and when
    // that label was replaced by a sentence template this line was left
    // reading L.of, which no longer exists - so the status announced
    // "Playing panel 1 undefined 5" in all four languages. Worse, the last
    // report said the template had been applied. It had been applied to the
    // markup and the catalogue and not to this file, and nothing tested the
    // rendered string. The regression test in negatives.py now reads the
    // string this function produces, in every locale, and fails on the word
    // "undefined" or on a leftover placeholder.
    var fam = current().getAttribute('data-family') || '';
    status.textContent = (userPaused ? L.paused : L.playing)
      .replace('{n}', i + 1)
      .replace('{total}', slides.length)
      .replace('{family}', fam);
    if (announce) {
      window.setTimeout(function () {
        status.setAttribute('aria-live', 'off');
      }, 1200);
    }
  }

  function stopTimer() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  // Exactly one advance owner. A playing video advances on `ended`; a static
  // panel advances on the timer; neither runs when paused or out of view.
  function arm() {
    stopTimer();
    // document.hidden belongs in this guard, not only in the visibility
    // handler. suspend() pauses the video, the video's own `pause` listener
    // calls arm(), and a stage that is still geometrically on screen would
    // then start its interval while the tab is hidden - rotating panels
    // nobody is looking at and defeating the pause it had just performed.
    if (userPaused || !onScreen || document.hidden) return;
    var v = video();
    if (v && !v.paused) return;           // the clip owns advancing
    timer = window.setInterval(function () { go(i + 1, false); }, DWELL);
  }

  function go(n, announce) {
    var prev = video();
    if (prev) { try { prev.pause(); } catch (e) {} }
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      s.classList.toggle('is-current', k === i);
    });
    dots.forEach(function (d, k) {
      d.setAttribute('aria-current', k === i ? 'true' : 'false');
    });
    upgrade(current());
    playIfWanted();
    setStatus(announce);
    arm();
  }

  function playIfWanted() {
    var v = video();
    if (!v) return;
    if (userPaused || !onScreen) { try { v.pause(); } catch (e) {} return; }
    var p = v.play();
    if (p && p.catch) { p.catch(function () { /* blocked: poster stays */ }); }
  }

  // A slide only gets a clip when the media ledger has approved one. No slide
  // declares one today, so nothing large is fetched on any device.
  function upgrade(slide) {
    var src = slide.getAttribute('data-video');
    if (!src || slide.getAttribute('data-video-approved') !== 'yes') return;
    var box = slide.querySelector('.vshow__media');
    if (!box || box.querySelector('video')) return;
    var img = box.querySelector('img');
    var v = document.createElement('video');
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.preload = 'none';
    if (img) v.poster = img.getAttribute('src');
    // the clip's own end is the only advance trigger while it plays
    v.addEventListener('playing', stopTimer);
    v.addEventListener('ended', function () {
      if (!userPaused) go(i + 1, false);
    });
    v.addEventListener('pause', arm);
    // a source that fails leaves the panel in place and moves on; never an
    // empty stage
    v.addEventListener('error', function () {
      try { v.remove(); } catch (e) {}
      slide.setAttribute('data-video-approved', 'no');
      if (!userPaused) go(i + 1, false);
      else arm();
    });
    v.src = src;
    box.appendChild(v);
    playIfWanted();
  }

  function setPaused(on, announce) {
    userPaused = on;
    if (toggle) {
      // one model: an action button whose name says what it will do
      toggle.setAttribute('aria-label', on ? L.play : L.pause);
      toggle.textContent = on ? '▶' : '⏸';
    }
    var v = video();
    if (v) {
      if (on) { try { v.pause(); } catch (e) {} } else { playIfWanted(); }
    }
    setStatus(announce);
    arm();
  }

  stage.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b || !stage.contains(b)) return;
    var act = b.getAttribute('data-act');
    if (act === 'next') { setPaused(true, false); go(i + 1, true); }
    else if (act === 'prev') { setPaused(true, false); go(i - 1, true); }
    else if (act === 'toggle') { setPaused(!userPaused, true); }
    else if (b.classList.contains('vshow__dot')) {
      setPaused(true, false);
      go(parseInt(b.getAttribute('data-go'), 10) || 0, true);
    }
  });

  stage.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (!stage.contains(document.activeElement)) return;
    e.preventDefault();
    setPaused(true, false);
    go(e.key === 'ArrowRight' ? i + 1 : i - 1, true);
  });

  // Offscreen and hidden tab both pause the ELEMENT, not just the timer.
  // Coming back resumes only if the reader has not paused.
  function suspend() {
    stopTimer();
    var v = video();
    if (v) { try { v.pause(); } catch (e) {} }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (!onScreen) { suspend(); } else { playIfWanted(); arm(); }
    }, { threshold: 0.25 }).observe(stage);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { suspend(); }
    else if (onScreen) { playIfWanted(); arm(); }
  });

  setPaused(userPaused, false);
  go(0, false);
}());
