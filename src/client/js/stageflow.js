/* Shared stage-picker flow for the minigames: a locked stage list (next stage
   unlocks only when you clear the previous one), shown as the level's hub.
   - StageFlow.init(cfg) builds the picker and returns { open, complete, exit, isOpen }.
   - cfg.onPick(i)  : start stage i (set the stage + begin play).
   - cfg.onExit()   : optional, called on ESC before reopening the picker (stop play).
   Unlock progress persists in localStorage per level.

   Requires hub.js (for Hub.home / Hub.cameFromLobby). */
window.StageFlow = (function(){
  let injected=false;
  function injectCss(){
    if(injected) return; injected=true;
    const st=document.createElement('style');
    st.textContent=
      '.sf-picker{position:fixed;inset:0;background:rgba(8,10,20,.93);display:none;flex-direction:column;'+
      'align-items:center;justify-content:center;gap:12px;z-index:200;font-family:Arial,sans-serif;}'+
      '.sf-picker.show{display:flex;}'+
      '.sf-title{font-size:32px;font-weight:900;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;color:#fff;}'+
      '.sf-list{display:flex;flex-direction:column;gap:10px;}'+
      '.sf-btn{padding:13px 48px;min-width:270px;font-size:16px;font-weight:bold;letter-spacing:2px;border:none;'+
      'border-radius:26px;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;transition:background .15s,transform .1s;}'+
      '.sf-btn:hover:not(:disabled){transform:scale(1.04);}'+
      '.sf-btn:disabled{opacity:.4;cursor:default;}'+
      '.sf-home{margin-top:8px;padding:10px 34px;font-size:13px;letter-spacing:2px;text-transform:uppercase;border:none;'+
      'border-radius:20px;cursor:pointer;background:rgba(255,255,255,.08);color:rgba(255,255,255,.65);}'+
      '.sf-home:hover{color:#fff;background:rgba(255,255,255,.16);}';
    document.head.appendChild(st);
  }

  function init(cfg){
    injectCss();
    const count = cfg.count|0;
    const KEY = 'tuck_'+(cfg.levelKey||'level')+'_unlocked';
    const prefix = cfg.prefix||'';
    const accent = cfg.color||'#43a047';
    const names = cfg.names||null;
    let unlocked = Math.max(0, Math.min(count-1, parseInt(localStorage.getItem(KEY)||'0',10)||0));

    const ov=document.createElement('div'); ov.className='sf-picker';
    const title=document.createElement('div'); title.className='sf-title'; title.textContent=cfg.label||'Pick a Stage';
    const list=document.createElement('div'); list.className='sf-list';
    ov.appendChild(title); ov.appendChild(list);
    const btns=[];
    for(let i=0;i<count;i++){ const b=document.createElement('button'); b.className='sf-btn';
      b.addEventListener('mouseenter',()=>{ if(!b.disabled) b.style.background=accent; });
      b.addEventListener('mouseleave',()=>{ b.style.background='rgba(255,255,255,.1)'; });
      b.addEventListener('click',()=>{ if(i>unlocked) return; hide(); cfg.onPick(i); });
      list.appendChild(b); btns.push(b); }
    const home=document.createElement('button'); home.className='sf-home';
    home.textContent=(window.Hub&&Hub.cameFromLobby())?'⌂ Back to Lobby':'⌂ Main Menu';
    home.addEventListener('click',()=>{ if(window.Hub) Hub.home(prefix); });
    ov.appendChild(home);
    document.body.appendChild(ov);

    function refresh(){ btns.forEach((b,i)=>{ const lock=i>unlocked, done=i<unlocked;
      b.disabled=lock; const nm=names?names[i]:('Stage '+(i+1));
      b.textContent=(lock?'🔒 ':done?'✓ ':'▶ ')+nm; }); }
    function open(){ refresh(); ov.classList.add('show'); }
    function hide(){ ov.classList.remove('show'); }
    function unlock(i){ const u=Math.max(unlocked, Math.min(count-1, i|0));
      if(u!==unlocked){ unlocked=u; localStorage.setItem(KEY, String(unlocked)); } }
    function complete(i){ unlock((i|0)+1); open(); }
    function exit(){ if(cfg.onExit) cfg.onExit(); open(); }

    return { open, hide, complete, exit, unlock, isOpen:()=>ov.classList.contains('show'),
      get unlocked(){ return unlocked; } };
  }

  return { init };
})();
