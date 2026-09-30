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

/* Packaging brands and platforms list: search, sector filter and reset.
   The complete list is already in the HTML. This only narrows what is shown,
   and every value is handled as text, never as markup. */
(function(){
  var list=document.getElementById('mlist'), tools=document.getElementById('mtools');
  if(!list||!tools) return;
  var q=document.getElementById('mq'), sec=document.getElementById('msec'),
      reset=document.getElementById('mreset'), count=document.getElementById('mcount'),
      none=document.getElementById('mnone');
  var rows=[].slice.call(list.children).map(function(li){
    return {el:li, sector:li.getAttribute('data-sector')||'', k:(li.textContent||'').toLowerCase()};
  });
  var total=rows.length;
  tools.hidden=false;

  function apply(){
    var text=(q.value||'').toLowerCase().trim();
    var words=text?text.split(/\s+/):[];
    var want=sec.value||'';
    var shown=0;
    rows.forEach(function(r){
      var ok=(!want||r.sector===want);
      for(var i=0;ok&&i<words.length;i++){ if(r.k.indexOf(words[i])<0) ok=false; }
      r.el.hidden=!ok; if(ok) shown++;
    });
    count.textContent=(shown===total)
      ? (total+' entries')
      : (shown+' of '+total+' entries shown');
    if(none) none.hidden=(shown!==0);
  }
  function clear(){ q.value=''; sec.value=''; apply(); q.focus(); }

  q.addEventListener('input',apply);
  sec.addEventListener('change',apply);
  reset.addEventListener('click',clear);
  q.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); clear(); } });
  apply();
})();

/* Intake form: preselect from the link that brought the visitor here, show the
   sector-specific guidance only when it applies, and check attachments against the
   form service's documented 10 MB total before anything is sent.
   Query values are only ever assigned to form field values or compared as
   strings. Nothing from the URL is written into the page as markup. */
(function(){
  var form=document.getElementById('intakeForm');
  if(!form) return;
  var etype=document.getElementById('etype'),
      filesErr=document.getElementById('filesErr'), formErr=document.getElementById('formErr');
  /* Content blocks and nav items that belong to one sector only.
     data-sector-content, never data-sector: the <option> elements in the equipment
     select carry data-sector so the URL can preselect one, and hiding those would
     leave the customer with no equipment to choose. */
  var scoped=[].slice.call(document.querySelectorAll('[data-sector-content]'));
  var fileInputs=['files','files2','files3'].map(function(id){return document.getElementById(id);})
                 .filter(function(el){return el;});
  var LIMIT=10*1024*1024; /* FormSubmit documents 10 MB as the total across all file fields */
  var OK_EXT=['jpg','jpeg','png','gif','webp','heic','heif','bmp','tif','tiff',
              'pdf','csv','txt','doc','docx','xls','xlsx'];

  function sectorOf(){
    if(!etype) return '';
    var o=etype.options[etype.selectedIndex];
    return (o && o.getAttribute('data-sector')) || '';
  }
  /* A hidden field must not be submitted, so it is disabled as well as hidden.
     Disabling keeps the typed value in place, so it comes back if the visitor
     switches back to that sector. */
  function syncSector(){
    var now=sectorOf();
    scoped.forEach(function(el){
      var off=(el.getAttribute('data-sector-content')!==now);
      el.hidden=off;
      [].slice.call(el.querySelectorAll('input,select,textarea')).forEach(function(f){
        f.disabled=off;
      });
    });
  }

  /* preselect from ?sector=&manufacturer=&model=&urgency=&intent= */
  try{
    var q=new URLSearchParams(window.location.search);
    var sec=q.get('sector');
    if(sec && etype){
      for(var i=0;i<etype.options.length;i++){
        if(etype.options[i].getAttribute('data-sector')===sec){ etype.selectedIndex=i; break; }
      }
    }
    [['manufacturer','mfr'],['model','model'],['city','city'],['serial','serial']].forEach(function(pair){
      var v=q.get(pair[0]), el=document.getElementById(pair[1]);
      if(v && el && !el.value) el.value=v;           /* value assignment only, never innerHTML */
    });
    var us=document.getElementById('urgency');
    var urgencyMap={'machine-stopped':'Machine stopped',
                    'production-running':'Production running with a problem',
                    'planned':'Planned work'};
    function pick(sel,want){
      if(!sel||!want) return;
      for(var j=0;j<sel.options.length;j++){ if(sel.options[j].value===want){ sel.selectedIndex=j; return; } }
    }
    var u=q.get('urgency');
    if(u) pick(us,urgencyMap[u]||u);
    /* ?intent=maintenance arrives from the preventive maintenance page */
    if(q.get('intent')==='maintenance'){
      var pref=document.getElementById('maintPref');
      var wanted={'monthly':'Monthly preventive maintenance',
                  'quarterly':'Quarterly preventive maintenance'}[q.get('program')]
                 || 'Recommend a program';
      pick(pref,wanted);
      if(!u) pick(us,'Planned work');
      var block=document.getElementById('maintBlock');
      if(block) block.setAttribute('data-intent','maintenance');
    }
    /* ?intent=parts arrives from the parts evaluation page and from a machine row.
       The symptoms field stays required: a parts enquiry still needs a sentence
       about what the part is for, and relaxing validation for one query value is
       how a form starts arriving empty. Only the wording changes. */
    /* Someone who knows the part but not the machine could not submit at all:
       Manufacturer and Model are required. Removing `required` would let the fault
       path arrive empty too, so instead the checkbox fills both with a real value
       and makes them readonly. readonly still submits; disabled does not, which
       would have failed validation AND dropped the answer. */
    var noMachine=document.getElementById('noMachine');
    if(noMachine){
      var mfrEl=document.getElementById('mfr'), modelEl=document.getElementById('model');
      var kept={mfr:'',model:''};
      noMachine.addEventListener('change',function(){
        if(!mfrEl||!modelEl) return;
        if(noMachine.checked){
          kept.mfr=mfrEl.value; kept.model=modelEl.value;
          mfrEl.value='Not known'; modelEl.value='Not known';
          mfrEl.readOnly=true; modelEl.readOnly=true;
        }else{
          mfrEl.readOnly=false; modelEl.readOnly=false;
          if(mfrEl.value==='Not known') mfrEl.value=kept.mfr;
          if(modelEl.value==='Not known') modelEl.value=kept.model;
        }
      });
    }
    if(q.get('intent')==='parts'){
      var pblock=document.getElementById('partsBlock');
      if(pblock) pblock.setAttribute('data-intent','parts');
      var hint=document.getElementById('symptomsHint');
      if(hint) hint.textContent='You are asking about a part. Say what the part is for '
        +'and what the machine is doing now, or write that there is no fault and it is '
        +'a spare. Either answer is useful; an empty box is not.';
      var slabel=document.querySelector('label[for="symptoms"]');
      if(slabel) slabel.textContent='What the part is for, or the fault behind it';
      var nm=document.getElementById('noMachine');
      if(nm&&nm.parentNode&&nm.parentNode.parentNode)
        nm.parentNode.parentNode.setAttribute('data-intent','parts');
      if(!u) pick(us,'Planned work');
    }
  }catch(e){ /* a malformed query must never stop the form from working */ }

  if(etype) etype.addEventListener('change',syncSector);
  syncSector();

  function extOf(name){
    var d=String(name).lastIndexOf('.');
    return d<0?'':String(name).slice(d+1).toLowerCase();
  }
  function checkFiles(){
    var total=0, badType=[];
    fileInputs.forEach(function(el){
      for(var i=0;i<el.files.length;i++){
        var f=el.files[i]; total+=f.size;
        if(OK_EXT.indexOf(extOf(f.name))<0) badType.push(f.name);
      }
    });
    var msg='';
    if(badType.length){
      msg='These files are not a type we can accept: '+badType.join(', ')+
          '. Accepted types are images, PDF, CSV, text, Word and Excel.';
    }else if(total>LIMIT){
      msg='The attachments add up to '+(total/1048576).toFixed(1)+
          ' MB. The form service accepts 10 MB in total across all three fields. '+
          'Remove a file, or send the request without attachments and reply to our response.';
    }
    if(filesErr){ filesErr.textContent=msg; filesErr.hidden=!msg; }
    fileInputs.forEach(function(el){
      if(msg){ el.setAttribute('aria-invalid','true'); el.setAttribute('aria-describedby','filesErr'); }
      else { el.removeAttribute('aria-invalid'); }
    });
    return !msg;
  }
  fileInputs.forEach(function(el){ el.addEventListener('change',checkFiles); });

  form.addEventListener('submit',function(e){
    if(!checkFiles()){
      e.preventDefault();
      if(formErr){
        formErr.textContent='Nothing has been sent. Please fix the attachments above and try again.';
        formErr.hidden=false;
      }
      if(filesErr) filesErr.scrollIntoView({block:'center'});
      if(fileInputs[0]) fileInputs[0].focus();
      return;
    }
    if(formErr) formErr.hidden=true;
  });
})();
