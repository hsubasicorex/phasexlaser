/* Four-scene homepage hero: localized markup, demand-loaded media. */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  var stage = hero && hero.querySelector('.hero__stage');
  if (!stage) return;
  var clips = [].slice.call(hero.querySelectorAll('.hero__clip'));
  var scenes = [].slice.call(stage.querySelectorAll('.hero__scene'));
  var dots = [].slice.call(stage.querySelectorAll('.hero__dot'));
  var toggle = stage.querySelector('[data-act="toggle"]');
  var status = stage.querySelector('.hero__status');
  if (clips.length !== scenes.length || scenes.length < 2) return;
  var reduce = false;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var mediaOff = reduce || saveData;
  var current = 0, timer = null, onScreen = true, userPaused = mediaOff, autoStopped = false;
  var dwell = parseInt(stage.getAttribute('data-dwell'), 10) || 13000;
  var L = {playing:stage.getAttribute('data-status-playing')||'', paused:stage.getAttribute('data-status-paused')||'', play:stage.getAttribute('data-label-play')||'', pause:stage.getAttribute('data-label-pause')||''};
  hero.classList.add('hero--js');
  if (mediaOff && toggle) toggle.hidden = true;
  function stopTimer(){if(timer){window.clearTimeout(timer);timer=null;}}
  function setStatus(announce){
    if(!status)return;
    var family=scenes[current].getAttribute('data-family')||'';
    status.setAttribute('aria-live',announce?'polite':'off');
    status.textContent=(userPaused?L.paused:L.playing).replace('{n}',current+1).replace('{total}',scenes.length).replace('{family}',family);
    if(announce)window.setTimeout(function(){status.setAttribute('aria-live','off');},1200);
  }
  function setFocusable(scene,active){
    scene.setAttribute('aria-hidden',active?'false':'true');
    [].slice.call(scene.querySelectorAll('a,button')).forEach(function(el){if(active)el.removeAttribute('tabindex');else el.setAttribute('tabindex','-1');});
    if('inert' in scene)scene.inert=!active;
  }
  function loadClip(clip){
    if(mediaOff)return;
    if(!clip.getAttribute('poster')&&clip.getAttribute('data-poster'))clip.setAttribute('poster',clip.getAttribute('data-poster'));
    if(!clip.getAttribute('src')&&clip.getAttribute('data-src')){clip.setAttribute('src',clip.getAttribute('data-src'));clip.load();}
  }
  function playCurrent(){
    if(mediaOff||userPaused||!onScreen||document.hidden)return;
    loadClip(clips[current]);
    var promise=clips[current].play();if(promise&&promise.catch)promise.catch(function(){});
  }
  function arm(){
    stopTimer();
    if(userPaused||autoStopped||mediaOff||!onScreen||document.hidden)return;
    timer=window.setTimeout(function(){activate(current+1,false);},dwell);
  }
  function activate(next,manual){
    current=(next+scenes.length)%scenes.length;
    scenes.forEach(function(scene,i){var active=i===current;scene.classList.toggle('is-current',active);setFocusable(scene,active);});
    clips.forEach(function(clip,i){var active=i===current;clip.classList.toggle('is-current',active);if(!active){try{clip.pause();}catch(e){}}});
    dots.forEach(function(dot,i){dot.classList.toggle('is-current',i===current);if(i===current)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
    playCurrent();setStatus(manual);arm();
  }
  function setPaused(paused,announce){
    userPaused=paused;if(!paused)autoStopped=false;hero.classList.toggle('is-paused',userPaused);
    if(toggle)toggle.setAttribute('aria-label',userPaused?L.play:L.pause);
    if(userPaused){stopTimer();try{clips[current].pause();}catch(e){}}else{playCurrent();arm();}
    setStatus(announce);
  }
  stage.addEventListener('click',function(e){
    var button=e.target.closest?e.target.closest('button'):null;if(!button||!stage.contains(button))return;
    if(button.getAttribute('data-act')==='toggle'){setPaused(!userPaused,true);return;}
    if(button.classList.contains('hero__dot')){autoStopped=true;hero.classList.add('is-manual');stopTimer();activate(parseInt(button.getAttribute('data-go'),10)||0,true);}
  });
  stage.addEventListener('keydown',function(e){
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    e.preventDefault();autoStopped=true;hero.classList.add('is-manual');stopTimer();activate(e.key==='ArrowRight'?current+1:current-1,true);dots[current].focus();
  });
  function suspend(){stopTimer();try{clips[current].pause();}catch(e){}}
  if('IntersectionObserver' in window)new IntersectionObserver(function(entries){onScreen=entries[0].isIntersecting;if(onScreen){playCurrent();arm();}else suspend();},{threshold:.2}).observe(hero);
  document.addEventListener('visibilitychange',function(){if(document.hidden)suspend();else if(onScreen){playCurrent();arm();}});
  activate(0,false);setPaused(userPaused,false);
}());
