/* Shared hub helpers: remembers the player's name + character across the lobby
   and the minigames, and routes "back" to the lobby (if launched from it) or the
   card menu otherwise. Loaded by lobby.html and every level. */
(function(){
  'use strict';
  function get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function sget(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function sset(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
  function sdel(k){ try{ sessionStorage.removeItem(k); }catch(e){} }

  const Hub={
    getName(){ return get('tuck_name')||''; },
    getChar(){ return get('tuck_char')||''; },
    setIdentity(name,char){ if(name) set('tuck_name',String(name).slice(0,12)); if(char) set('tuck_char',String(char)); },

    // Lobby launches a level (remembers we came from the lobby).
    enterLevel(file){ sset('tuck_from_lobby','1'); location.href=file; },
    cameFromLobby(){ return sget('tuck_from_lobby')==='1'; },

    // Level → go home. prefix is the path back to client root ('' or '../').
    home(prefix){ prefix=prefix||'';
      if(Hub.cameFromLobby()){ sset('tuck_return','1'); sdel('tuck_from_lobby'); location.href=prefix+'lobby.html'; }
      else location.href=prefix+'index.html';
    },

    // Lobby asks: did we just come back from a minigame?
    isReturning(){ if(sget('tuck_return')==='1'){ sdel('tuck_return'); return true; } return false; },

    // ── "UPDATED" badges ──────────────────────────────────────────────────
    // Bump a level's version here whenever you change that level. A card/portal
    // shows an UPDATED badge until the player opens that level, then it clears.
    LEVEL_VERSIONS:{
      level1:'1', level2:'1', level3:'1', level4:'1',
      level5:'1', level6:'1', level7:'1', level8:'1',
    },
    levelKey(file){ const m=String(file||'').match(/([a-z0-9_]+)\.html/i); return m?m[1].toLowerCase():''; },
    isUpdated(file){ const k=Hub.levelKey(file), v=Hub.LEVEL_VERSIONS[k];
      return !!v && get('tuck_seen_'+k)!==v; },
    markSeen(file){ const k=Hub.levelKey(file), v=Hub.LEVEL_VERSIONS[k];
      if(v) set('tuck_seen_'+k, v); },

    // ── shared chat history (persists across lobby ↔ minigames) ──
    chatLog(){ try{ return JSON.parse(get('tuck_chat')||'[]'); }catch(e){ return []; } },
    chatPush(name,text,sys){
      const log=Hub.chatLog();
      log.push({ n:name||null, t:String(text||''), s:!!sys, at:Date.now() });
      while(log.length>60) log.shift();   // keep the last 60 lines
      set('tuck_chat', JSON.stringify(log));
      return log;
    },
    chatClear(){ set('tuck_chat','[]'); }
  };
  window.Hub=Hub;

  // Drop a persistent "go home" button into every minigame so you can bail out
  // mid-play (not only from the win/retry screens). Skips pages that already
  // have their own #menu-link (lobby, stephanie, tyler).
  // First time we ever see a level, record its current version silently so the
  // badge only fires on a LATER version bump (not for brand-new installs).
  function seedSeenBaseline(){
    Object.keys(Hub.LEVEL_VERSIONS).forEach(function(k){
      if(get('tuck_seen_'+k)===null) set('tuck_seen_'+k, Hub.LEVEL_VERSIONS[k]);
    });
  }

  // Opening a level page counts as "playing" it → clear its UPDATED badge.
  function markCurrentSeen(){
    if(/\/levels\//.test(location.pathname)) Hub.markSeen(location.pathname);
  }

  function injectHomeButton(){
    if(document.getElementById('menu-link')||document.getElementById('hub-home-btn')) return;
    if(/(lobby|index)\.html$/.test(location.pathname)||location.pathname.replace(/\/$/,'').endsWith('/client')) return;
    const prefix=location.pathname.indexOf('/levels/')>=0?'../':'';
    const b=document.createElement('button');
    b.id='hub-home-btn';
    b.textContent=Hub.cameFromLobby()?'⌂ Lobby':'⌂ Menu';
    b.style.cssText='position:fixed;top:12px;left:12px;z-index:9999;background:rgba(0,0,0,.5);'+
      'color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:16px;padding:6px 14px;'+
      'font:bold 13px Arial;cursor:pointer;letter-spacing:1px';
    b.addEventListener('click',function(){ Hub.home(prefix); });
    document.body.appendChild(b);
  }
  seedSeenBaseline();   // sync (localStorage only) so badge-renderers see correct state
  function onReady(){ injectHomeButton(); markCurrentSeen(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',onReady);
  else onReady();
})();
