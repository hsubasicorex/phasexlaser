/* PhaseX Laser Services - shared page behavior */
(function(){
  var nav=document.getElementById('nav'), toggle=document.getElementById('navToggle');
  if(!nav) return;
  var groups=[].slice.call(nav.querySelectorAll('.nav__links > li')).filter(function(li){
    return li.querySelector(':scope > button') && li.querySelector(':scope > .nav__menu');
  });
  var mq=window.matchMedia('(max-width:1060px)');
  var escLi=null; /* only the group closed by Escape is suppressed, and only until the user leaves it */

  function btnOf(li){ return li.querySelector(':scope > button'); }
  function closeOne(li){
    li.classList.remove('is-open');
    li.__hoverOpened=false;
    var b=btnOf(li); if(b) b.setAttribute('aria-expanded','false');
  }
  function closeAll(except){ groups.forEach(function(li){ if(li!==except) closeOne(li); }); }
  function openOne(li){
    closeAll(li);
    li.classList.add('is-open');
    var b=btnOf(li); if(b) b.setAttribute('aria-expanded','true');
  }

  groups.forEach(function(li){
    var btn=btnOf(li);
    btn.setAttribute('aria-haspopup','true');
    btn.setAttribute('aria-expanded','false');

    btn.addEventListener('click',function(e){
      e.preventDefault(); e.stopPropagation();
      escLi=null;
      if(li.__hoverOpened){ li.__hoverOpened=false; return; }
      if(li.classList.contains('is-open')) closeOne(li); else openOne(li);
    });

    li.addEventListener('mouseenter',function(){
      if(mq.matches) return;
      if(li===escLi) return;
      if(!li.classList.contains('is-open')){ openOne(li); li.__hoverOpened=true; }
    });
    li.addEventListener('mouseleave',function(){
      if(mq.matches) return;
      if(li===escLi) escLi=null;
      closeOne(li);
    });

    li.addEventListener('focusin',function(){
      if(mq.matches) return;
      if(li===escLi) return;
      if(!li.classList.contains('is-open')) openOne(li);
    });
    li.addEventListener('focusout',function(){
      if(mq.matches) return;
      setTimeout(function(){
        if(!li.contains(document.activeElement)){
          if(li===escLi) escLi=null;
          closeOne(li);
        }
      },0);
    });
  });

  function closeNav(){
    closeAll();
    nav.classList.remove('open');
    document.body.classList.remove('nav-locked');
    if(toggle) toggle.setAttribute('aria-expanded','false');
  }

  document.addEventListener('click',function(e){ if(!nav.contains(e.target)) { escLi=null; closeNav(); } });

  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape' && e.key!=='Esc') return;
    var openLi=null;
    groups.forEach(function(li){ if(li.classList.contains('is-open')) openLi=li; });
    var wasMobileMenu=nav.classList.contains('open');
    escLi=openLi;
    closeNav();
    if(wasMobileMenu && toggle){ toggle.focus(); }
    else if(openLi){ var b=btnOf(openLi); if(b) b.focus(); }
  });

  if(toggle){
    toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click',function(e){
      e.stopPropagation();
      escLi=null;
      var open=nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded',String(open));
      document.body.classList.toggle('nav-locked',open);
      if(!open) closeAll();
    });
  }

  nav.querySelectorAll('.nav__links a').forEach(function(a){ a.addEventListener('click',closeNav); });
  mq.addEventListener('change',function(){ escLi=null; closeNav(); });
})();
