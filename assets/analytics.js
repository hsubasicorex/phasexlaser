/* PhaseX Laser Services — measurement, and the choice that governs it.
 *
 * Measurement is OFF for every visitor on a first visit, wherever they are. No
 * Google code is requested, no cookie is set and no event can be sent until the
 * visitor chooses Allow analytics. There is no geographic test: the same rule
 * applies to everyone, because a rule that depends on guessing where someone is
 * is a rule that is wrong for whoever it guesses wrong about.
 *
 * Three states, held in localStorage under phasex_analytics_consent:
 *   unset    — nothing loaded. A small notice offers Allow analytics or Decline.
 *   granted  — the tag is loaded, a page view is sent, three events may fire.
 *   denied   — nothing loaded, notice not shown again.
 *
 * Global Privacy Control and Do Not Track are treated as a decision already
 * made: denied, and the notice is not shown at all. Honouring them is not
 * universally required; ignoring them is a choice we are not making.
 *
 * Withdrawal takes effect on the page you are standing on, not on the next one.
 * That was a real defect in the first version of this file: it gated the loader
 * at start-up, but the click and submit listeners it had already attached went
 * on sending. Now every send goes through send(), which checks a live flag, so
 * the moment Decline is pressed the listeners stop being able to send anything.
 * Withdrawal also tells the tag storage is denied and deletes the GA cookies
 * this site can see.
 *
 * What this file controls, and what it does not. It controls what may be sent:
 * a closed enum of four parameters and their permitted values, never a form
 * field. It sets consent defaults and the signals flags on every load, so the
 * pages do not depend on an administrative setting staying where it was put. It
 * does not control the GA4 property itself — retention, enhanced measurement
 * and Signals are settings in that property, recorded in _handoff/manifest.json
 * with who verified them and where.
 */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-71M1P1YN8H';
  var CONSENT_KEY = 'phasex_analytics_consent';

  /* live gate. Nothing may be sent unless this is true, and Decline sets it
     false immediately, on the open page. */
  var enabled = false;
  var loaded = false;

  /* ---- storage, which may be unavailable ---------------------------------- */

  function readConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function writeConsent(value) {
    try {
      if (value) window.localStorage.setItem(CONSENT_KEY, value);
      else window.localStorage.removeItem(CONSENT_KEY);
      return true;
    } catch (e) { return false; }
  }

  /* ---- browser-level refusals -------------------------------------------- */

  function browserRefuses() {
    var gpc = navigator.globalPrivacyControl;
    if (gpc === true || gpc === '1') return 'globalPrivacyControl';
    var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    if (dnt === '1' || dnt === 'yes') return 'doNotTrack';
    return null;
  }

  function state() {
    var refused = browserRefuses();
    if (refused) return refused;
    var stored = readConsent();
    if (stored === 'granted' || stored === 'denied') return stored;
    return 'unset';
  }

  /* ---- the tag ------------------------------------------------------------ */

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  /* every event in this file goes through here, so one flag turns all of them
     off on the page the visitor is already looking at */
  function send(name, params) {
    if (!enabled) return false;
    gtag('event', name, params || {});
    return true;
  }

  /* Query parameters that may be measured, as a closed enum of values rather
     than a list of names or a pattern. A name allowlist alone would let
     ?sector=<a person's name> through, and a pattern like /^[a-z0-9-]+$/ would
     carry it happily. Every value here is one this site's own links generate.
     Everything else is dropped: 88 links carry a manufacturer name, and there
     are lang and subject parameters too, and none of them reach an event. */
  var ALLOWED = {
    sector: ['industrial', 'packaging', 'scientific', 'company'],
    intent: ['maintenance', 'repair', 'parts'],
    program: ['monthly', 'quarterly', 'recommend'],
    urgency: ['planned', 'machine-stopped']
  };
  var ORDER = ['sector', 'intent', 'program', 'urgency'];

  function cleanQuery(search) {
    if (!search || search.charAt(0) !== '?') return '';
    var found = {};
    var pairs = search.slice(1).split('&');
    for (var i = 0; i < pairs.length; i++) {
      var eq = pairs[i].indexOf('=');
      if (eq < 0) continue;
      var key = pairs[i].slice(0, eq);
      if (!Object.prototype.hasOwnProperty.call(ALLOWED, key)) continue;
      var value;
      try { value = decodeURIComponent(pairs[i].slice(eq + 1).replace(/\+/g, ' ')); }
      catch (e) { continue; }
      if (ALLOWED[key].indexOf(value) < 0) continue;
      found[key] = value;
    }
    var kept = [];
    for (var j = 0; j < ORDER.length; j++) {
      if (found[ORDER[j]] !== undefined) kept.push(ORDER[j] + '=' + found[ORDER[j]]);
    }
    return kept.length ? '?' + kept.join('&') : '';
  }

  function cleanOwnUrl(loc) {
    return loc.protocol + '//' + loc.host + loc.pathname + cleanQuery(loc.search);
  }

  function cleanReferrer(ref) {
    if (!ref) return '';
    var a;
    try { a = document.createElement('a'); a.href = ref; } catch (e) { return ''; }
    if (a.protocol !== 'http:' && a.protocol !== 'https:') return '';
    if (a.host === location.host) {
      return a.protocol + '//' + a.host + a.pathname + cleanQuery(a.search);
    }
    return a.protocol + '//' + a.host + a.pathname;
  }

  function load() {
    if (loaded) return;
    loaded = true;
    gtag('js', new Date());
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted'
    });
    gtag('config', MEASUREMENT_ID, {
      page_location: cleanOwnUrl(location),
      page_referrer: cleanReferrer(document.referrer),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      anonymize_ip: true
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(s);
  }

  /* ---- withdrawal -------------------------------------------------------- */

  /* Cookies this site's own scripts set are visible to this script, so they can
     be removed. Expiring on every plausible domain and path scope is deliberate:
     a cookie written for .phasexlaser.com is not removed by expiring it for
     phasexlaser.com alone, and getting this wrong leaves the cookie in place. */
  function clearGaCookies() {
    var names = [];
    var all = '';
    try { all = document.cookie || ''; } catch (e) { return; }
    var parts = all.split(';');
    for (var i = 0; i < parts.length; i++) {
      var name = parts[i].split('=')[0].replace(/^\s+/, '');
      if (/^_ga/.test(name) || name === '_gid' || /^_gac_/.test(name)) names.push(name);
    }
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var bare = host.replace(/^www\./, '');
    if (bare !== host) { domains.push(bare); domains.push('.' + bare); }
    for (var j = 0; j < names.length; j++) {
      for (var k = 0; k < domains.length; k++) {
        var base = names[j] + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
        try {
          document.cookie = domains[k] ? base + '; domain=' + domains[k] : base;
        } catch (e) { /* nothing we can do about a refused write */ }
      }
    }
  }

  /* Google's own opt-out flag. Setting window['ga-disable-<id>'] to true stops a
     tag that is already on the page from sending anything at all, including the
     automatic sends our own gate cannot intercept. Belt and braces with the
     enabled flag: ours stops our events, this one stops the library's. */
  var GA_DISABLE = 'ga-disable-' + MEASUREMENT_ID;

  function gaDisable(off) {
    try { window[GA_DISABLE] = !!off; } catch (e) { /* nothing else to try */ }
  }

  /* Fail closed, both times it matters.
     1. If the browser refuses at its own level, granting is not available at all,
        including through the public API. An independent test found that
        phasexAnalytics.allow() would load the tag with Global Privacy Control on,
        which made the honouring of GPC a matter of which code path was used.
     2. If the consent cannot be STORED, nothing is granted. Otherwise the page
        would load the tag while state() — which reads storage — reported off, so
        the visitor is told one thing and another is happening. When storage is
        blocked, off is the only honest answer. */
  function grant() {
    if (browserRefuses()) { paint(); return false; }
    if (!writeConsent('granted')) {
      enabled = false;
      gaDisable(true);
      paint();
      return false;
    }
    gaDisable(false);
    enabled = true;
    load();
    gtag('consent', 'update', { analytics_storage: 'granted' });
    paint();
    return true;
  }

  function deny() {
    /* Order matters. The gate closes before anything else, so a listener firing
       part-way through this function cannot slip an event out, and Google's own
       flag goes up in the same breath. The stored state is written after, because
       a failed write must still leave measurement off rather than on. */
    enabled = false;
    gaDisable(true);
    if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' });
    clearGaCookies();
    var stored = writeConsent('denied');
    paint();
    return stored;
  }

  /* ---- the notice and the controls on /privacy/ --------------------------- */

  var NOTICE_ID = 'px-analytics-notice';

  function removeNotice() {
    var n = document.getElementById(NOTICE_ID);
    if (n && n.parentNode) n.parentNode.removeChild(n);
  }

  function showNotice() {
    if (document.getElementById(NOTICE_ID)) return;
    if (!document.body) return;
    var box = document.createElement('div');
    box.id = NOTICE_ID;
    box.className = 'cnotice';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Website measurement choice');
    var p = document.createElement('p');
    p.className = 'cnotice__text';
    p.appendChild(document.createTextNode(
      'Measurement is off. We would like to count page views and whether a '
      + 'service request was sent, so we know which pages are worth writing. '
      + 'No advertising, and nothing you type in a form. '));
    var link = document.createElement('a');
    link.href = '/privacy/';
    link.appendChild(document.createTextNode('What is collected'));
    p.appendChild(link);
    p.appendChild(document.createTextNode('.'));
    var acts = document.createElement('div');
    acts.className = 'cnotice__act';
    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'btn btn--primary';
    yes.setAttribute('data-analytics-allow', '');
    yes.appendChild(document.createTextNode('Allow analytics'));
    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'btn btn--ghost';
    no.setAttribute('data-analytics-decline', '');
    no.appendChild(document.createTextNode('Decline'));
    acts.appendChild(yes);
    acts.appendChild(no);
    box.appendChild(p);
    box.appendChild(acts);
    document.body.appendChild(box);
  }

  function paint() {
    var st = state();
    if (st === 'unset') showNotice(); else removeNotice();

    var words = {
      granted: 'Measurement is on for this browser. You can switch it off here.',
      denied: 'Measurement is off on this browser.',
      unset: 'Measurement is off until you choose to allow it.',
      globalPrivacyControl: 'Your browser sends Global Privacy Control, so '
        + 'measurement is off and we do not ask.',
      doNotTrack: 'Your browser sends Do Not Track, so measurement is off and '
        + 'we do not ask.'
    };
    var status = document.querySelectorAll('[data-analytics-status]');
    for (var i = 0; i < status.length; i++) status[i].textContent = words[st];

    /* Allow is offered unless it is already granted or the browser refused;
       Decline is offered only when there is something to decline. */
    var allow = document.querySelectorAll('[data-analytics-allow]');
    for (var j = 0; j < allow.length; j++) {
      allow[j].hidden = (st === 'granted' || st === 'globalPrivacyControl'
                         || st === 'doNotTrack');
    }
    var decline = document.querySelectorAll('[data-analytics-decline]');
    for (var k = 0; k < decline.length; k++) {
      decline[k].hidden = (st === 'denied' || st === 'globalPrivacyControl'
                           || st === 'doNotTrack');
    }
  }

  function say(text) {
    var out = document.querySelectorAll('[data-analytics-result]');
    for (var i = 0; i < out.length; i++) out[i].textContent = text;
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest
      ? ev.target.closest('[data-analytics-allow],[data-analytics-decline]') : null;
    if (!t) return;
    ev.preventDefault();
    var allowing = t.hasAttribute('data-analytics-allow');
    /* grant() and deny() own the write and report whether it stuck, so there is
       one place that decides and one answer to report */
    var ok = allowing ? grant() : deny();
    say(!ok
      ? (allowing
         ? 'Measurement stays off. Either your browser refuses tracking at its own '
           + 'level, or it would not let this page remember the choice. Nothing has '
           + 'been loaded.'
         : 'Measurement is off on this page now, but your browser would not let us '
           + 'remember the choice, so it will ask again on the next page.')
      : allowing
        ? 'Thank you. Measurement is on for this browser from now, and you can '
          + 'switch it off on this page at any time.'
        : 'Measurement is off, on this page immediately, and the analytics cookies '
          + 'this site can see have been deleted.');
  }, false);

  /* ---- intent signals, all behind send() --------------------------------- */

  /* A tap on a phone number is not a call and a tap on an address is not a
     message. Ordinary events, never key events, never to be reported as calls.
     Enhanced measurement is off in the property, so these three events and the
     page view are the whole of what is collected; nothing is added
     automatically behind our backs. */
  document.addEventListener('click', function (ev) {
    if (!enabled) return;
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) {
      send('phone_number_click', { link_type: 'tel' });
    } else if (href.indexOf('mailto:') === 0) {
      send('email_address_click', { link_type: 'mailto' });
    }
  }, true);

  /* ---- the request signal ------------------------------------------------ */

  var SUBMIT_KEY = 'px_submit_at';
  var COUNTED_KEY = 'px_request_counted';
  var WINDOW_MS = 15 * 60 * 1000;
  var THANKS_PATH = '/scientific-laser-repair/intake/thank-you/';

  function store(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function read(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function drop(key) {
    try { window.sessionStorage.removeItem(key); } catch (e) { /* private mode */ }
  }

  document.addEventListener('submit', function (ev) {
    var f = ev.target;
    if (!f || f.tagName !== 'FORM') return;
    /* the timestamp is written whether or not measurement is on, because it is
       this site's own session marker and never leaves the browser unless the
       visitor has allowed measurement */
    store(SUBMIT_KEY, String(Date.now()));
    drop(COUNTED_KEY);
    /* the form's own id, nothing inside it */
    send('request_form_submit', { form_id: f.id || 'unnamed' });
  }, true);

  function requestSignal() {
    if (location.pathname !== THANKS_PATH) return;
    var at = parseInt(read(SUBMIT_KEY) || '0', 10);
    var fresh = at > 0 && (Date.now() - at) < WINDOW_MS;
    if (fresh && read(COUNTED_KEY) !== '1') {
      /* Named for what it measures. A submit in this session followed by the page
         the form service redirects to, counted once. Evidence the form was
         submitted, NOT evidence an email arrived: the form service can fail after
         the redirect, and only the service mailbox shows a delivered request. The
         two numbers are compared, never assumed equal. */
      if (send('service_request_submitted',
               { source: 'intake_form', delivery_confirmed: false })) {
        store(COUNTED_KEY, '1');
        drop(SUBMIT_KEY);
      }
    } else {
      /* Direct open, bookmark or refresh. Measured, never as a request. */
      send('thank_you_view_unmatched', { matched_submit: false });
    }
  }

  /* ---- start ------------------------------------------------------------- */

  window.phasexAnalytics = {
    state: state,
    allow: grant,
    decline: deny
  };

  function start() {
    var st = state();
    if (st === 'granted') {
      gaDisable(false);
      enabled = true;
      load();
    } else {
      /* off, and Google's own flag up before any tag could arrive from anywhere */
      gaDisable(true);
    }
    paint();
    requestSignal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
