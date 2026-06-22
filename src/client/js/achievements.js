/* Shared achievement definitions, unlock detection, Steam-style toasts.
   Source of truth for index.html (list + count) and every play page (toasts).
   Self-contained: no dependencies, injects its own styles + toast container. */
(function(){
  'use strict';
  function stars(n){ return parseInt(localStorage.getItem('tuck_stars_'+n)||'0'); }
  function flag(k){ return localStorage.getItem(k)==='1'; }
  var LV=[1,2,3,4,5,6,7,8];

  var LIST=[
    { id:'star3',    ic:'⭐',  nm:'Star Student',       ds:'Earn 3 stars on any level',
      got:function(){ return LV.some(function(n){ return stars(n)>=3; }); } },
    { id:'beatall',  ic:'🏅',  nm:'Neighborhood Hero',  ds:'Beat all 8 levels',
      got:function(){ return LV.every(function(n){ return stars(n)>=1; }); } },
    { id:'beatall3', ic:'🌟',  nm:'Perfect Block',      ds:'Beat all 8 levels with 3 stars',
      got:function(){ return LV.every(function(n){ return stars(n)>=3; }); } },
    { id:'tyler',    ic:'🧟',  nm:'Zombie Slayer',      ds:'Survive all 5 waves in Tyler: Last Stand',
      got:function(){ return flag('tuck_tyler_beat'); } },
    { id:'friend',   ic:'🤝',  nm:'Better Together',    ds:'Play in the lobby with a friend',
      got:function(){ return flag('tuck_lobby_friend'); } },
    { id:'skate',    ic:'🛹',  nm:'Catch Air',          ds:'Launch off a ramp at the skatepark',
      got:function(){ return flag('tuck_skatepark'); } },
  ];

  function count(){
    var got=0; LIST.forEach(function(a){ try{ if(a.got()) got++; }catch(e){} });
    return { got:got, total:LIST.length };
  }

  function seenSet(){
    var raw=localStorage.getItem('tuck_ach_seen')||'';
    return raw? raw.split(',') : [];
  }
  function saveSeen(arr){ try{ localStorage.setItem('tuck_ach_seen',arr.join(',')); }catch(e){} }

  // ── toast UI ──
  var styled=false;
  function ensureStyle(){
    if(styled) return; styled=true;
    var s=document.createElement('style');
    s.textContent=
      '#ach-toasts{position:fixed;top:16px;right:16px;z-index:99999;display:flex;'+
        'flex-direction:column;gap:10px;pointer-events:none;font-family:Arial,Helvetica,sans-serif;}'+
      '.ach-toast{display:flex;align-items:center;gap:12px;min-width:240px;max-width:320px;'+
        'background:linear-gradient(160deg,#1b2a4a,#0e1830);color:#fff;border:1px solid rgba(129,199,132,.5);'+
        'border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.5);'+
        'transform:translateX(120%);opacity:0;transition:transform .4s cubic-bezier(.2,.9,.3,1.2),opacity .4s;}'+
      '.ach-toast.show{transform:translateX(0);opacity:1;}'+
      '.ach-toast .ic{font-size:32px;width:42px;text-align:center;}'+
      '.ach-toast .tx .hd{font-size:11px;letter-spacing:1.5px;color:#81c784;font-weight:bold;}'+
      '.ach-toast .tx .nm{font-size:16px;font-weight:bold;}'+
      '.ach-toast .tx .ds{font-size:12px;color:rgba(255,255,255,.6);}';
    document.head.appendChild(s);
  }
  function container(){
    var c=document.getElementById('ach-toasts');
    if(!c){ c=document.createElement('div'); c.id='ach-toasts'; document.body.appendChild(c); }
    return c;
  }
  function toast(a){
    ensureStyle();
    var el=document.createElement('div'); el.className='ach-toast';
    el.innerHTML='<div class="ic">'+a.ic+'</div>'+
      '<div class="tx"><div class="hd">ACHIEVEMENT UNLOCKED</div>'+
      '<div class="nm">'+a.nm+'</div><div class="ds">'+a.ds+'</div></div>';
    container().appendChild(el);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('show'); }); });
    setTimeout(function(){ el.classList.remove('show');
      setTimeout(function(){ el.remove(); }, 450); }, 4600);
  }

  // Evaluate all; toast any newly-unlocked since last check.
  function check(){
    if(!document.body){ document.addEventListener('DOMContentLoaded',check); return; }
    // first ever run: seed already-earned achievements silently (no toast flood)
    if(localStorage.getItem('tuck_ach_seen')===null){
      var init=[]; LIST.forEach(function(a){ try{ if(a.got()) init.push(a.id); }catch(e){} });
      saveSeen(init); return;
    }
    var seen=seenSet(), changed=false, queue=[];
    LIST.forEach(function(a){
      var ok=false; try{ ok=a.got(); }catch(e){}
      if(ok && seen.indexOf(a.id)<0){ seen.push(a.id); changed=true; queue.push(a); }
    });
    if(changed) saveSeen(seen);
    // stagger multiple unlocks
    queue.forEach(function(a,i){ setTimeout(function(){ toast(a); }, i*700); });
  }

  window.Ach={ LIST:LIST, count:count, check:check, toast:toast };

  // auto-run once the page is ready (catches unlocks earned just before navigating)
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',check);
  else check();
})();
