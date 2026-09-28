/* PhaseX Laser Services - shared page behavior */
(function(){
  var nav=document.getElementById('nav'), toggle=document.getElementById('navToggle');
  if(!nav) return;
  var groups=[].slice.call(nav.querySelectorAll('.nav__links > li'));
  var mq=window.matchMedia('(max-width:1060px)');

  groups.forEach(function(li){
    var btn=li.querySelector(':scope > button'), menu=li.querySelector(':scope > .nav__menu');
    if(!btn||!menu) return;
    btn.setAttribute('aria-haspopup','true');
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',function(e){
      e.preventDefault(); e.stopPropagation();
      var open=li.classList.contains('is-open');
      groups.forEach(function(o){ if(o!==li){o.classList.remove('is-open'); var b=o.querySelector(':scope > button'); if(b) b.setAttribute('aria-expanded','false');} });
      li.classList.toggle('is-open',!open);
      btn.setAttribute('aria-expanded',String(!open));
    });
    li.addEventListener('mouseenter',function(){ if(!mq.matches) btn.setAttribute('aria-expanded','true'); });
    li.addEventListener('mouseleave',function(){ if(!mq.matches){ li.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); } });
  });

  function closeAll(){
    groups.forEach(function(o){ o.classList.remove('is-open'); var b=o.querySelector(':scope > button'); if(b) b.setAttribute('aria-expanded','false'); });
  }
  function closeNav(){
    closeAll(); nav.classList.remove('open');
    document.body.classList.remove('nav-locked');
    if(toggle) toggle.setAttribute('aria-expanded','false');
  }

  document.addEventListener('click',function(e){ if(!nav.contains(e.target)) closeNav(); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ closeNav(); }
  });

  if(toggle){
    toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click',function(e){
      e.stopPropagation();
      var open=nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded',String(open));
      document.body.classList.toggle('nav-locked',open);
      if(!open) closeAll();
    });
  }
  nav.querySelectorAll('.nav__links a').forEach(function(a){ a.addEventListener('click',closeNav); });
  mq.addEventListener('change',closeNav);
})();
