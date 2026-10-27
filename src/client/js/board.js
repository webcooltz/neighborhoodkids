/* Town Message Board — kids leave notes (text + optional drawing) that persist
   for one week on the server. Self-mounting: include after hub.js on any page.
   A 📋 button opens the board; posts go to the same server as chat/lobby.

   Text is profanity-filtered server-side (see server.js). Drawing reuses the
   same 2D-canvas pen tech as Brooklynn's art level, made touch-friendly here. */
(function(){
  'use strict';
  const IS_LOCAL = location.hostname==='localhost' || location.hostname==='127.0.0.1'
                || location.hostname==='' || location.protocol==='file:';
  const API = IS_LOCAL ? 'http://localhost:8787' : 'https://neighborhoodkids.onrender.com';

  const css = `
  #mb-open{position:fixed;left:12px;top:56px;z-index:9997;width:46px;height:46px;border-radius:12px;
    border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.55);color:#fff;font-size:20px;cursor:pointer;}
  #mb-over{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;
    background:rgba(4,6,10,.8);padding:14px;font-family:Arial,sans-serif;}
  #mb-over.show{display:flex;}
  #mb-panel{background:linear-gradient(160deg,#1c2333,#0d1119);border:1px solid rgba(255,255,255,.16);
    border-radius:16px;width:100%;max-width:460px;max-height:90vh;display:flex;flex-direction:column;
    box-shadow:0 16px 50px rgba(0,0,0,.6);overflow:hidden;}
  #mb-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;
    border-bottom:1px solid rgba(255,255,255,.1);}
  #mb-head h2{font-size:18px;color:#fff;letter-spacing:1px;margin:0;}
  #mb-close{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;}
  #mb-list{overflow-y:auto;padding:12px 16px;flex:1;-webkit-overflow-scrolling:touch;}
  .mb-note{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;
    padding:10px 12px;margin-bottom:10px;}
  .mb-note .mb-meta{font-size:11px;color:#8ea2c0;margin-bottom:4px;}
  .mb-note .mb-meta b{color:#ffd54f;}
  .mb-note .mb-txt{color:#eee;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;}
  .mb-note img{display:block;margin-top:8px;max-width:100%;border-radius:8px;background:#fff;}
  #mb-empty{color:#7f8ca0;text-align:center;padding:24px 0;font-size:13px;}
  #mb-compose{border-top:1px solid rgba(255,255,255,.1);padding:12px 16px;}
  #mb-text{width:100%;box-sizing:border-box;resize:none;height:52px;border-radius:10px;padding:8px 10px;
    border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:14px;}
  #mb-tools{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;}
  .mb-btn{padding:8px 14px;border:none;border-radius:10px;font-weight:bold;font-size:13px;cursor:pointer;}
  #mb-drawtoggle{background:rgba(255,255,255,.14);color:#fff;}
  #mb-post{background:#26a69a;color:#fff;margin-left:auto;}
  #mb-post:disabled{opacity:.5;}
  #mb-draw{display:none;margin-top:10px;}
  #mb-draw.show{display:block;}
  #mb-canvas{width:100%;max-width:320px;height:190px;background:#fff;border-radius:10px;touch-action:none;
    border:2px solid rgba(255,255,255,.3);display:block;}
  #mb-draw .row{display:flex;gap:8px;align-items:center;margin-top:6px;}
  #mb-draw .sw{width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,.5);cursor:pointer;}
  #mb-clear{background:rgba(255,255,255,.14);color:#fff;margin-left:auto;}`;

  let over, listEl, textEl, canvas, ctx, drawWrap, postBtn;
  let penColor='#222', drawn=false, loaded=false;

  function esc(s){ const d=document.createElement('div'); d.textContent=s==null?'':s; return d.innerHTML; }
  function ago(ts){ const s=(Date.now()-ts)/1000;
    if(s<60) return 'just now'; if(s<3600) return Math.floor(s/60)+'m ago';
    if(s<86400) return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; }

  function mount(){
    const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    const btn=document.createElement('button'); btn.id='mb-open'; btn.title='Town message board'; btn.textContent='📋';
    btn.addEventListener('click',openBoard);
    document.body.appendChild(btn);

    over=document.createElement('div'); over.id='mb-over';
    over.innerHTML=
      '<div id="mb-panel">'
      +'<div id="mb-head"><h2>📋 Town Message Board</h2><button id="mb-close">✕</button></div>'
      +'<div id="mb-list"></div>'
      +'<div id="mb-compose">'
        +'<textarea id="mb-text" maxlength="280" placeholder="Leave a note for the neighborhood…"></textarea>'
        +'<div id="mb-tools">'
          +'<button class="mb-btn" id="mb-drawtoggle">✏️ Draw</button>'
          +'<button class="mb-btn" id="mb-post">Post</button>'
        +'</div>'
        +'<div id="mb-draw">'
          +'<canvas id="mb-canvas" width="320" height="190"></canvas>'
          +'<div class="row" id="mb-swatches"></div>'
        +'</div>'
      +'</div></div>';
    document.body.appendChild(over);

    listEl=over.querySelector('#mb-list');
    textEl=over.querySelector('#mb-text');
    canvas=over.querySelector('#mb-canvas');
    drawWrap=over.querySelector('#mb-draw');
    postBtn=over.querySelector('#mb-post');
    ctx=canvas.getContext('2d');

    over.querySelector('#mb-close').addEventListener('click',closeBoard);
    over.addEventListener('click',e=>{ if(e.target===over) closeBoard(); });
    over.querySelector('#mb-drawtoggle').addEventListener('click',()=>drawWrap.classList.toggle('show'));
    postBtn.addEventListener('click',submit);
    textEl.addEventListener('keydown',e=>e.stopPropagation());   // don't leak keys to the game

    // colour swatches + clear
    const sw=over.querySelector('#mb-swatches');
    ['#222','#e53935','#1e88e5','#43a047','#fdd835','#fb8c00'].forEach(c=>{
      const b=document.createElement('div'); b.className='sw'; b.style.background=c;
      b.addEventListener('click',()=>{ penColor=c; });
      sw.appendChild(b);
    });
    const clr=document.createElement('button'); clr.className='mb-btn'; clr.id='mb-clear'; clr.textContent='Clear';
    clr.addEventListener('click',clearCanvas); sw.appendChild(clr);

    setupDraw();
    clearCanvas();
  }

  function clearCanvas(){ ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); drawn=false; }

  // Pointer-based pen: one path covers mouse + touch + stylus.
  function setupDraw(){
    let drawing=false, lx=0, ly=0;
    const pos=e=>{ const r=canvas.getBoundingClientRect();
      return { x:(e.clientX-r.left)*(canvas.width/r.width), y:(e.clientY-r.top)*(canvas.height/r.height) }; };
    canvas.addEventListener('pointerdown',e=>{ e.preventDefault(); drawing=true; drawn=true;
      const p=pos(e); lx=p.x; ly=p.y; canvas.setPointerCapture(e.pointerId);
      ctx.strokeStyle=penColor; ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.beginPath(); ctx.arc(lx,ly,2,0,7); ctx.fillStyle=penColor; ctx.fill(); });
    canvas.addEventListener('pointermove',e=>{ if(!drawing) return; e.preventDefault();
      const p=pos(e); ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(p.x,p.y); ctx.stroke(); lx=p.x; ly=p.y; });
    const end=()=>{ drawing=false; };
    canvas.addEventListener('pointerup',end);
    canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('pointerleave',end);
  }

  function openBoard(){ over.classList.add('show'); load(); }
  function closeBoard(){ over.classList.remove('show'); }

  function load(){
    listEl.innerHTML='<div id="mb-empty">Loading…</div>';
    fetch(API+'/board').then(r=>r.json()).then(render).catch(()=>{
      listEl.innerHTML='<div id="mb-empty">Board offline — try again later.</div>';
    });
    loaded=true;
  }

  function render(notes){
    if(!Array.isArray(notes)||!notes.length){ listEl.innerHTML='<div id="mb-empty">No notes yet. Be the first!</div>'; return; }
    notes.sort((a,b)=>b.ts-a.ts);
    listEl.innerHTML=notes.map(n=>
      '<div class="mb-note"><div class="mb-meta"><b>'+esc(n.name)+'</b> · '+ago(n.ts)+'</div>'
      +(n.text?'<div class="mb-txt">'+esc(n.text)+'</div>':'')
      +(n.img?'<img alt="drawing" src="'+esc(n.img)+'">':'')
      +'</div>').join('');
    listEl.scrollTop=0;
  }

  function submit(){
    const text=(textEl.value||'').trim();
    const img=(drawn && drawWrap.classList.contains('show')) ? canvas.toDataURL('image/png') : null;
    if(!text && !img){ textEl.focus(); return; }
    const name=(window.Hub && Hub.getName && Hub.getName()) || 'Anon';
    postBtn.disabled=true; postBtn.textContent='Posting…';
    fetch(API+'/board',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,text,img})})
      .then(r=>{ if(!r.ok) throw 0; return r.json(); })
      .then(()=>{ textEl.value=''; clearCanvas(); drawWrap.classList.remove('show'); load(); })
      .catch(()=>{ alert('Could not post — board may be offline.'); })
      .finally(()=>{ postBtn.disabled=false; postBtn.textContent='Post'; });
  }

  function start(){ mount(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
