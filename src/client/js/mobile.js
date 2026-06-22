/* Shared mobile touch controls for all levels.
   Detects touch devices and overlays a joystick + action buttons that
   drive each level through synthetic keyboard / mouse events, so the
   existing desktop input handlers work unchanged. */
(function(){
  'use strict';
  const isTouch = ('ontouchstart' in window) ||
                  (navigator.maxTouchPoints > 0) ||
                  matchMedia('(pointer:coarse)').matches;

  const M = { ready: isTouch };
  window.Mobile = M;

  // No-op stubs on desktop so level init code can call unconditionally.
  if(!isTouch){
    M.joystick=function(){}; M.button=function(){return null;};
    M.tapCanvas=function(){}; M.touchDraw=function(){};
    M.lanes=function(){return null;}; M.key=function(){};
    return;
  }

  document.documentElement.classList.add('is-touch');

  const style=document.createElement('style');
  style.textContent=`
    html.is-touch, html.is-touch body{ overflow:hidden; touch-action:none; overscroll-behavior:none; }
    #mc-joy{ position:fixed; left:20px; bottom:20px; width:130px; height:130px; border-radius:50%;
      background:rgba(255,255,255,.10); border:2px solid rgba(255,255,255,.32); z-index:9000; touch-action:none; }
    #mc-knob{ position:absolute; left:40px; top:40px; width:50px; height:50px; border-radius:50%;
      background:rgba(255,255,255,.5); border:2px solid rgba(255,255,255,.75); }
    #mc-btns{ position:fixed; right:18px; bottom:26px; display:flex; flex-direction:column-reverse;
      gap:14px; z-index:9000; align-items:flex-end; }
    .mc-btn{ min-width:68px; height:68px; padding:0 16px; border-radius:50%;
      border:2px solid rgba(255,255,255,.6); background:rgba(0,0,0,.45); color:#fff;
      font-family:Arial,sans-serif; font-weight:bold; font-size:14px; letter-spacing:1px;
      display:flex; align-items:center; justify-content:center; user-select:none;
      -webkit-user-select:none; touch-action:none; }
    .mc-btn.mc-on{ background:rgba(255,255,255,.4); transform:scale(.94); }
    #mc-lanes{ position:fixed; left:50%; transform:translateX(-50%); bottom:22px;
      display:flex; gap:12px; z-index:9000; }
    #mc-lanes .mc-btn{ width:60px; height:60px; min-width:60px; padding:0; }
  `;
  document.head.appendChild(style);

  function key(code,type){
    document.dispatchEvent(new KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));
  }
  M.key=key;

  // Mouse event helper (mousedown→canvas, mouseup→window to match level handlers)
  function canvasMouse(type){
    const c=document.getElementById('c'); if(!c) return;
    const r=c.getBoundingClientRect();
    const ev=new MouseEvent(type,{button:0,clientX:r.left+r.width/2,clientY:r.top+r.height*0.4,
      bubbles:true,cancelable:true});
    (type==='mouseup'?window:c).dispatchEvent(ev);
  }
  M.canvasMouse=canvasMouse;

  M.joystick=function(map){
    const joy=document.createElement('div'); joy.id='mc-joy';
    const knob=document.createElement('div'); knob.id='mc-knob'; joy.appendChild(knob);
    document.body.appendChild(joy);
    let id=null, cx=0, cy=0;
    const state={up:false,down:false,left:false,right:false};
    function setKey(dir,on){
      if(state[dir]===on) return; state[dir]=on;
      if(map[dir]) key(map[dir], on?'keydown':'keyup');
    }
    function reset(){ ['up','down','left','right'].forEach(d=>setKey(d,false));
      knob.style.left='40px'; knob.style.top='40px'; }
    function handle(x,y){
      const dx=x-cx, dy=y-cy, R=60, mag=Math.hypot(dx,dy)||1;
      const nx=mag>R?dx/mag*R:dx, ny=mag>R?dy/mag*R:dy;
      knob.style.left=(40+nx)+'px'; knob.style.top=(40+ny)+'px';
      const dead=18;
      setKey('left', dx<-dead); setKey('right', dx>dead);
      setKey('up', dy<-dead);   setKey('down', dy>dead);
    }
    joy.addEventListener('touchstart',e=>{ e.preventDefault();
      const t=e.changedTouches[0]; id=t.identifier;
      const r=joy.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2;
      handle(t.clientX,t.clientY);
    },{passive:false});
    joy.addEventListener('touchmove',e=>{ e.preventDefault();
      for(const t of e.changedTouches) if(t.identifier===id) handle(t.clientX,t.clientY);
    },{passive:false});
    const end=e=>{ for(const t of e.changedTouches) if(t.identifier===id){ id=null; reset(); } };
    joy.addEventListener('touchend',end); joy.addEventListener('touchcancel',end);
    return joy;
  };

  function btnContainer(){
    let c=document.getElementById('mc-btns');
    if(!c){ c=document.createElement('div'); c.id='mc-btns'; document.body.appendChild(c); }
    return c;
  }

  // opts: {label, code, canvasMouse, parent}
  M.button=function(opts){
    const b=document.createElement('div'); b.className='mc-btn'; b.textContent=opts.label;
    (opts.parent||btnContainer()).appendChild(b);
    function down(e){ e.preventDefault(); b.classList.add('mc-on');
      if(opts.code) key(opts.code,'keydown');
      if(opts.canvasMouse) canvasMouse('mousedown');
    }
    function up(e){ e.preventDefault(); b.classList.remove('mc-on');
      if(opts.code) key(opts.code,'keyup');
      if(opts.canvasMouse) canvasMouse('mouseup');
    }
    b.addEventListener('touchstart',down,{passive:false});
    b.addEventListener('touchend',up,{passive:false});
    b.addEventListener('touchcancel',up,{passive:false});
    return b;
  };

  // Row of lane buttons (rhythm game). codes e.g. ['KeyA','KeyS','KeyD','KeyF']
  M.lanes=function(codes){
    const wrap=document.createElement('div'); wrap.id='mc-lanes';
    document.body.appendChild(wrap);
    codes.forEach(code=>M.button({label:code.replace('Key',''),code,parent:wrap}));
    return wrap;
  };

  // Tap on the 3D canvas → fn(clientX,clientY). Ignores drags.
  M.tapCanvas=function(fn){
    const c=document.getElementById('c'); if(!c) return;
    let sx=0,sy=0,moved=false,t0=0;
    c.addEventListener('touchstart',e=>{ const t=e.changedTouches[0];
      sx=t.clientX; sy=t.clientY; moved=false; t0=Date.now(); },{passive:true});
    c.addEventListener('touchmove',e=>{ const t=e.changedTouches[0];
      if(Math.hypot(t.clientX-sx,t.clientY-sy)>14) moved=true; },{passive:true});
    c.addEventListener('touchend',e=>{ if(moved||Date.now()-t0>500) return;
      const t=e.changedTouches[0]; fn(t.clientX,t.clientY); },{passive:true});
  };

  // Forward touch as mouse events to a 2D drawing canvas (drawing minigame).
  M.touchDraw=function(canvasId){
    const cv=document.getElementById(canvasId); if(!cv) return;
    const fwd=(type,t)=>cv.dispatchEvent(new MouseEvent(type,
      {button:0,clientX:t.clientX,clientY:t.clientY,bubbles:true,cancelable:true}));
    cv.addEventListener('touchstart',e=>{ e.preventDefault(); fwd('mousedown',e.changedTouches[0]); },{passive:false});
    cv.addEventListener('touchmove',e=>{ e.preventDefault(); fwd('mousemove',e.changedTouches[0]); },{passive:false});
    cv.addEventListener('touchend',e=>{ e.preventDefault();
      window.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true})); },{passive:false});
  };
})();
