/* Co-play presence for the minigames: shows "Players online: N" and a chat box,
   connected to the same WebSocket server as the lobby. Chat history is shared
   across pages via Hub.chatLog/chatPush (localStorage), so messages persist when
   you move between the lobby and a level.

   Self-mounting: just include this script on a level page (after hub.js).
   The lobby has its own chat/HUD, so it does NOT load this. */
(function(){
  'use strict';
  if (/lobby\.html$/.test(location.pathname)) return;   // lobby has its own

  // Same server the lobby uses (see lobby.html). Falls back to localhost for ws://.
  const SERVER_URL = 'wss://neighborhoodkids.onrender.com';
  const WS_URL = SERVER_URL || 'ws://localhost:8787';

  const NAME = (window.Hub && Hub.getName()) || ('Player'+Math.floor(Math.random()*1000));
  const CHAR = (window.Hub && Hub.getChar()) || 'dawson';

  // ── UI ──
  const css = `
  #coplay-count{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9998;
    background:rgba(0,0,0,.5);color:#fff;font:bold 12px Arial;letter-spacing:.5px;
    padding:5px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.25);pointer-events:none;}
  #coplay-count .dot{color:#9e9e9e;} #coplay-count.on .dot{color:#66bb6a;}
  #coplay-chat-btn{position:fixed;right:12px;top:48px;z-index:9998;width:42px;height:42px;border-radius:50%;
    border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.55);color:#fff;font-size:18px;cursor:pointer;}
  #coplay-chat-btn .badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:8px;
    background:#e53935;color:#fff;font:bold 10px Arial;line-height:16px;display:none;padding:0 4px;}
  #coplay-chat{position:fixed;right:12px;top:96px;z-index:9998;width:260px;display:none;
    background:rgba(12,16,26,.92);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:8px;}
  #coplay-chat.show{display:block;}
  #coplay-log{max-height:180px;overflow-y:auto;font:12px Arial;color:#eee;margin-bottom:6px;}
  #coplay-log .m{margin:2px 0;word-wrap:break-word;overflow-wrap:anywhere;}
  #coplay-log .m .nm{font-weight:bold;color:#ffd54f;}
  #coplay-log .m.sys{opacity:.6;font-style:italic;}
  #coplay-row{display:flex;gap:5px;}
  #coplay-input{flex:1;padding:6px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.25);
    background:rgba(255,255,255,.1);color:#fff;font-size:12px;}
  #coplay-send{padding:6px 10px;border:none;border-radius:10px;background:#26a69a;color:#fff;font-weight:bold;cursor:pointer;}`;

  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }

  let logEl, inputEl, panelEl, btnEl, countEl, badgeEl;
  let unread=0;

  function mount(){
    const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    countEl=el('<div id="coplay-count"><span class="dot">●</span> Players online: <span class="n">1</span></div>');
    btnEl=el('<button id="coplay-chat-btn">💬<span class="badge">0</span></button>');
    panelEl=el('<div id="coplay-chat"><div id="coplay-log"></div>'+
      '<div id="coplay-row"><input id="coplay-input" maxlength="200" placeholder="Press Enter to chat…"/>'+
      '<button id="coplay-send">Send</button></div></div>');
    document.body.appendChild(countEl); document.body.appendChild(btnEl); document.body.appendChild(panelEl);
    logEl=panelEl.querySelector('#coplay-log'); inputEl=panelEl.querySelector('#coplay-input');
    badgeEl=btnEl.querySelector('.badge');
    btnEl.addEventListener('click',toggleChat);
    panelEl.querySelector('#coplay-send').addEventListener('click',sendChat);
    inputEl.addEventListener('keydown',e=>{ if(e.code==='Enter'){ e.preventDefault(); sendChat(); }
      e.stopPropagation(); });   // don't let game keys fire while typing
    // seed shared history; auto-open the panel if there are prior messages so it's
    // obvious the conversation carried over from the lobby / previous level
    const hist=(window.Hub?Hub.chatLog():[]);
    hist.forEach(m=>renderMsg(m.n,m.t,m.s,false));
    scrollLog();
    if(hist.some(m=>!m.s)) panelEl.classList.add('show');   // open if any real chat exists
  }

  function toggleChat(){ const open=!panelEl.classList.contains('show');
    panelEl.classList.toggle('show',open);
    if(open){ unread=0; badgeEl.style.display='none'; inputEl.focus(); scrollLog(); } }

  function renderMsg(name,text,sys){
    const m=document.createElement('div'); m.className='m'+(sys?' sys':'');
    if(sys) m.textContent=text;
    else { const nm=document.createElement('span'); nm.className='nm'; nm.textContent=name+': ';
      m.appendChild(nm); m.appendChild(document.createTextNode(text)); }
    logEl.appendChild(m); while(logEl.children.length>80) logEl.removeChild(logEl.firstChild);
  }
  function scrollLog(){ if(logEl) logEl.scrollTop=logEl.scrollHeight; }

  // add a message: render + persist to shared history
  function addMsg(name,text,sys,persist){
    renderMsg(name,text,sys); scrollLog();
    if(persist!==false && window.Hub) Hub.chatPush(name,text,sys);
    if(!panelEl.classList.contains('show')){ unread++; badgeEl.textContent=unread; badgeEl.style.display='block'; }
  }

  function setCount(n){ if(!countEl) return; countEl.querySelector('.n').textContent=n;
    countEl.classList.toggle('on', n>0 && netOn); }

  // ── WebSocket ──
  let ws=null, myId=null, netOn=false;
  function connect(){
    try { ws=new WebSocket(WS_URL); } catch(e){ return; }
    ws.onopen=()=>{ netOn=true;
      send({t:'join',name:NAME,char:CHAR,x:0,z:9,ry:Math.PI,ride:'none',hold:'none'}); };
    ws.onmessage=ev=>{ let msg; try{ msg=JSON.parse(ev.data); }catch(e){ return; }
      switch(msg.t){
        case'init': myId=msg.id; break;
        case'count': setCount(msg.n); break;
        case'join': if(msg.player&&msg.player.id!==myId) addMsg(null,(msg.player.name||'Player')+' came online',true); break;
        case'leave': break;
        case'chat': if(msg.id!==myId) addMsg(msg.name||'Player', String(msg.text||''), false); break;
      } };
    ws.onclose=()=>{ netOn=false; setCount(countEl?countEl.querySelector('.n').textContent:1); ws=null;
      setTimeout(connect, 4000); };   // auto-reconnect
    ws.onerror=()=>{ try{ ws.close(); }catch(e){} };
  }
  function send(o){ if(ws&&ws.readyState===1) ws.send(JSON.stringify(o)); }

  function sendChat(){ const text=(inputEl.value||'').trim().slice(0,200); if(!text) return;
    inputEl.value='';
    addMsg(NAME, text, false);          // show + persist locally
    send({t:'chat', text});             // broadcast to everyone else
  }

  function start(){ mount(); connect(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
