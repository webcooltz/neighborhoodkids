// Single-player level/room editor — shared across the minigame levels.
// Ported from the lobby's object editor (lobby.html) minus all multiplayer plumbing.
//
//   const ed = LevelEditor.init({ scene, camera, renderer,
//       level:'brooklynn', global:'BROOKLYNN_LAYOUT',
//       layoutScript:'../js/brooklynn_layout.js',
//       saveUrl:'http://localhost:8787' });
//   ed.registerBase();      // tag the scene's existing objects as editable
//   ed.applyBakedLayout();  // load this level's saved layout (if any)
//   // in your render loop:
//   ed.update(dt);          // drives the free-cam while editing (no-op otherwise)
//   if (ed.isEditing()) { /* skip gameplay + your own camera */ }
//
// Requires THREE + js/catalog.js loaded first.
window.LevelEditor = (function(){
  const C = window.Catalog;
  const { MM, at, CATALOG, CAT_TYPES, COL_R, PAINTS, PAINT_BY } = C;

  // ── one-time CSS + panel markup (injected on first init) ──
  const CSS = `
  #edit-toggle{position:fixed;right:12px;bottom:12px;z-index:60;padding:7px 13px;border-radius:14px;
    border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.5);color:#fff;font-size:13px;font-weight:bold;cursor:pointer;}
  #edit-toggle.on{background:#ffb300;color:#222;}
  #editor{position:fixed;right:12px;top:64px;z-index:60;width:230px;display:none;
    background:rgba(15,20,32,.94);border:1px solid rgba(255,255,255,.18);border-radius:14px;
    padding:12px 13px;color:#fff;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,.5);
    font-family:Arial,sans-serif;max-height:88vh;overflow:auto;}
  #editor.show{display:block;}
  #editor h3{font-size:15px;letter-spacing:1px;margin-bottom:8px;color:#ffd54f;}
  #editor .grp{margin-bottom:10px;}
  #editor .lab{font-size:11px;letter-spacing:1px;opacity:.6;margin-bottom:4px;text-transform:uppercase;}
  #editor button{padding:6px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.2);
    background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:bold;cursor:pointer;margin:2px;}
  #editor button.active{background:#4caf50;border-color:#4caf50;}
  #editor button:hover{background:rgba(255,255,255,.18);}
  #editor button:disabled{opacity:.35;cursor:default;}
  #editor select{width:100%;padding:6px;border-radius:8px;background:#0d1320;color:#fff;border:1px solid rgba(255,255,255,.2);font-size:12px;}
  #editor .sel-info{font-size:11px;opacity:.75;min-height:14px;margin-top:6px;}
  #editor .exp{width:100%;background:#1565c0;border-color:#1565c0;margin-top:6px;}
  #editor .danger{background:#c62828;border-color:#c62828;}
  #editor .hintline{font-size:10px;opacity:.5;margin-top:8px;line-height:1.4;}`;
  const PANEL = `
  <h3>🛠 Object Editor</h3>
  <div class="grp"><div class="lab">History</div>
    <button id="ed-undo">↶ Undo</button><button id="ed-redo">↷ Redo</button></div>
  <div class="grp"><div class="lab">Tool</div>
    <button id="tool-move" class="active">Move</button>
    <button id="tool-rotate">Rotate</button>
    <button id="tool-scale">Scale</button>
    <button id="tool-paint">🎨 Paint</button>
    <button id="ed-grid" class="active" title="Snap to grid">▦ Grid</button></div>
  <div class="grp" id="ed-paintgrp" style="display:none">
    <div class="lab">Paint ground (click/drag)</div>
    <div id="ed-palette" style="display:flex;flex-wrap:wrap;gap:4px"></div></div>
  <div class="grp"><div class="lab">Selected</div>
    <button id="ed-rotL" title="Spin left (yaw)">⟲ spin</button><button id="ed-rotR" title="Spin right (yaw)">⟳ spin</button>
    <button id="ed-tiltL" title="Lean left (roll)">◳ tilt L</button><button id="ed-tiltR" title="Lean right (roll)">◲ tilt R</button>
    <button id="ed-dup">Duplicate</button><button id="ed-del" class="danger">Delete</button>
    <div class="sel-info" id="ed-selinfo">Nothing selected</div></div>
  <div class="grp"><div class="lab">Resize (gizmo cubes stretch one axis · white cube = proportional)</div>
    <button id="ed-smaller" title="Proportionally smaller">－ size</button>
    <button id="ed-bigger" title="Proportionally bigger">＋ size</button>
    <button id="ed-sx" title="Stretch X">↔ X</button>
    <button id="ed-sy" title="Stretch Y (taller)">↕ Y</button>
    <button id="ed-sz" title="Stretch Z (deeper)">⤢ Z</button>
    <button id="ed-sreset" title="Reset to original size">⟲ 1:1</button></div>
  <div class="grp" id="ed-colorgrp" style="display:none"><div class="lab">Color</div>
    <input id="ed-color" type="color" value="#ffffff" title="Recolor selected"
      style="width:100%;height:30px;padding:0;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:#0d1320;cursor:pointer" /></div>
  <div class="grp" id="ed-textgrp" style="display:none"><div class="lab">Sign text</div>
    <input id="ed-text" type="text" maxlength="60" placeholder="Type sign text…"
      style="width:100%;padding:6px;border-radius:8px;background:#0d1320;color:#fff;border:1px solid rgba(255,255,255,.2);font-size:12px" /></div>
  <div class="grp"><div class="lab">Group (shift-click to multi-select)</div>
    <button id="ed-group">⊞ Group</button><button id="ed-ungroup">⊟ Ungroup</button></div>
  <div class="grp"><div class="lab">Add object — pick one, then click to place (scroll = rotate)</div>
    <select id="ed-cat"></select></div>
  <button class="exp" id="ed-save">💾 Save level</button>
  <button id="ed-export" style="width:100%;margin-top:5px;font-size:11px">⬇ Download backup</button>
  <button id="ed-import" style="width:100%;margin-top:5px;font-size:11px">⬆ Import map</button>
  <input type="file" id="ed-import-file" accept=".js,.json,application/json,text/javascript" style="display:none">
  <div class="hintline">Fly: WASD + E/Q up/down, right-drag look, Shift = faster.
    <b>M</b> move · <b>R</b> rotate · <b>T</b> scale · click select · shift-click multi · drag the gizmo
    arrows (move), rings (rotate) or cubes (stretch one axis; white cube = proportional). Rotate-drag:
    L/R = spin, Shift = tilt. Resize buttons: ↔/↕/⤢ grow an axis (Shift-click shrinks). The gizmo + all tools
    work on multiple objects (shift-click to add). Arrow keys nudge the selection (Shift = bigger). Ctrl+G group · Ctrl+C/V copy.
    <b>Save level</b> writes the layout to the project (needs the node server running); it auto-loads on refresh.</div>`;

  function injectPanel(){
    const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
    const tog=document.createElement('button'); tog.id='edit-toggle'; tog.textContent='✏ Edit Mode'; document.body.appendChild(tog);
    const panel=document.createElement('div'); panel.id='editor'; panel.innerHTML=PANEL; document.body.appendChild(panel);
  }

  // ── init: builds an editor bound to one scene/camera/renderer ──
  function init(opts){
    const scene=opts.scene, camera=opts.camera, renderer=opts.renderer;
    const ROOT=opts.root||scene;           // container whose children become editable
    const PROTECT=opts.protect||[];        // roots to keep non-editable (e.g. the player)
    const LEVEL=opts.level||'level', GLOBAL=opts.global||'LEVEL_LAYOUT';
    const LAYOUT_SCRIPT=opts.layoutScript||('js/'+LEVEL+'_layout.js');
    const SAVE_URL=opts.saveUrl||'';
    injectPanel();
    const $=id=>document.getElementById(id);

    let editMode=false, editTool='move';
    let _eid=0;
    const editById=new Map();          // editId -> {obj,type,added,addEntry,group,groupEntry,objs}
    let layout={ moves:{}, deletes:[], adds:[], groups:[], paint:{} };
    const colliders=[];                // {x,z,r,obj} — exposed via getColliders()

    function edInfo(t){ const e=$('ed-selinfo'); if(e) e.textContent=t; }
    let selSet=[], selHelpers=[], edSel=null, dragging=false;
    let dragStartX=0, dragBefore=null, dragOffsets=null, dragRotStart=null, rotCentroid=null, dragRoll=false;
    const _ray=new THREE.Raycaster(), _ndc=new THREE.Vector2();
    const _gplane=new THREE.Plane(new THREE.Vector3(0,1,0),0), _hit=new THREE.Vector3();
    const _cwp=new THREE.Vector3(), _gv=new THREE.Vector3();
    let gizmo=null, gizmoHandles=[], gizmoDrag=null;   // transform gizmo (arrows/rings)

    // ── undo / redo ──
    const undoStack=[], redoStack=[];
    function pushHist(cmd){ undoStack.push(cmd); redoStack.length=0; updateUndoBtns(); }
    function doUndo(){ if(!undoStack.length) return; const c=undoStack.pop(); c.undo(); redoStack.push(c); updateUndoBtns(); }
    function doRedo(){ if(!redoStack.length) return; const c=redoStack.pop(); c.redo(); undoStack.push(c); updateUndoBtns(); }
    function updateUndoBtns(){ const u=$('ed-undo'), r=$('ed-redo'); if(u) u.disabled=!undoStack.length; if(r) r.disabled=!redoStack.length; }
    function snap(o){ return {x:+o.position.x.toFixed(3),y:+o.position.y.toFixed(3),z:+o.position.z.toFixed(3),
      rx:+o.rotation.x.toFixed(3),ry:+o.rotation.y.toFixed(3),rz:+o.rotation.z.toFixed(3),
      sx:+o.scale.x.toFixed(3),sy:+o.scale.y.toFixed(3),sz:+o.scale.z.toFixed(3)}; }
    let GRID=1, gridOn=true;
    function gsnap(v){ return gridOn ? Math.round(v/GRID)*GRID : v; }

    // ── place mode (ghost preview) ──
    let placeType=null, ghost=null, ghostRot=0;
    function enterPlace(type){ if(!CATALOG[type]){ exitPlace(); return; }
      if(ghost){ scene.remove(ghost); ghost=null; }
      placeType=type; ghostRot=0;
      ghost=CATALOG[type](); ghost.traverse(o=>{ o.userData.noEdit=true;
        if(o.material){ o.material=o.material.clone(); o.material.transparent=true; o.material.opacity=.45; } });
      ghost.position.set(0,0,0); scene.add(ghost);
      edInfo('Click to place '+type+' — scroll to rotate, Esc to stop'); }
    function exitPlace(){ if(ghost){ scene.remove(ghost); ghost=null; } placeType=null; const s=$('ed-cat'); if(s&&s.value) s.value=''; }

    function applyXform(id,t){ const e=editById.get(id); if(!e) return;
      e.obj.position.set(t.x,t.y,t.z);
      e.obj.rotation.set(t.rx||0, t.ry||0, t.rz||0);
      e.obj.scale.set(t.sx==null?1:t.sx, t.sy==null?1:t.sy, t.sz==null?1:t.sz);
      if(e.group) Object.assign(e.groupEntry,t);
      else if(e.added) Object.assign(e.addEntry,t); else layout.moves[id]=Object.assign({},t);
      refreshHelpers(); if(edSel===e.obj) setSelInfo(e.obj); }
    function multiXformCmd(beforeMap,afterMap){
      return { undo(){ for(const id in beforeMap) applyXform(id,beforeMap[id]); },
               redo(){ for(const id in afterMap)  applyXform(id,afterMap[id]); } }; }

    function isEditableRoot(o){ return o&&(o.isMesh||o.isGroup)&&!o.userData.noEdit&&!o.isLight; }
    function registerBase(){
      PROTECT.forEach(o=>{ if(o) o.userData.noEdit=true; });   // keep the player etc. fixed
      ROOT.children.slice().forEach(o=>{
        if(!isEditableRoot(o)||o.userData.editId!=null) return;
        o.getWorldPosition(_cwp);
        let id='b'+Math.round(_cwp.x*10)+'_'+Math.round(_cwp.z*10)+'_'+Math.round(_cwp.y*10);
        if(editById.has(id)){ let k=2; while(editById.has(id+'x'+k)) k++; id=id+'x'+k; }
        o.userData.editId=id;
        editById.set(id,{obj:o,type:o.userData.editType||null,added:false});
      });
    }
    function findRoot(o){ while(o){ if(o.userData&&o.userData.editId) return o; o=o.parent; } return null; }
    function editList(){ const a=[]; editById.forEach(e=>a.push(e.obj)); return a; }

    // ── colliders ──
    function addColliderFor(o,type){ const r=COL_R[type]; if(!r) return;
      o.getWorldPosition(_cwp); colliders.push({x:_cwp.x,z:_cwp.z,r,obj:o}); }
    function isUnder(root,o){ while(o){ if(o===root) return true; o=o.parent; } return false; }
    function collidersUnder(root){ return colliders.filter(c=>c.obj&&isUnder(root,c.obj)); }
    function removeColliders(list){ list.forEach(c=>{ const i=colliders.indexOf(c); if(i>=0)colliders.splice(i,1); }); }
    function syncColliders(){ for(const c of colliders){ if(c.obj){ c.obj.getWorldPosition(_cwp); c.x=_cwp.x; c.z=_cwp.z; } } }

    // ── recolor ──
    function applyColor(o,hex){ o.traverse(m=>{ if(m.isMesh&&!m.userData.noEdit&&m.material&&m.material.color&&!m.material.map) m.material.color.setHex(hex); }); }
    function captureCols(o){ const a=[]; o.traverse(m=>{ if(m.isMesh&&!m.userData.noEdit&&m.material&&m.material.color&&!m.material.map) a.push({m,hex:m.material.color.getHex()}); }); return a; }
    function restoreCols(a){ a.forEach(c=>c.m.material.color.setHex(c.hex)); }
    function colorOf(o){ let hex=0xffffff; o.traverse(m=>{ if(hex===0xffffff&&m.isMesh&&!m.userData.noEdit&&m.material&&m.material.color&&!m.material.map) hex=m.material.color.getHex(); }); return hex; }
    function entryOf(o){ const e=editById.get(o.userData.editId); if(!e) return null;
      if(e.group) return e.groupEntry; if(e.added) return e.addEntry;
      let m=layout.moves[o.userData.editId]; if(!m){ m=snap(o); layout.moves[o.userData.editId]=m; } return m; }
    function setEntryCol(o,val){ const en=entryOf(o); if(!en) return; if(val==null) delete en.col; else en.col=val; }
    function colEntryOf(o){ const e=editById.get(o.userData.editId); if(!e) return undefined;
      const en=e.group?e.groupEntry:(e.added?e.addEntry:layout.moves[o.userData.editId]); return en?en.col:undefined; }
    function recolorSelected(hex){ if(!selSet.length) return;
      const objs=selSet.slice();
      const before=objs.map(o=>({o, cols:captureCols(o), prev:colEntryOf(o)}));
      objs.forEach(o=>{ applyColor(o,hex); setEntryCol(o,hex); });
      pushHist({ undo(){ before.forEach(b=>{ restoreCols(b.cols); setEntryCol(b.o,b.prev); }); },
                 redo(){ objs.forEach(o=>{ applyColor(o,hex); setEntryCol(o,hex); }); } }); }
    function nudgeSelected(dx,dy,dz){ if(!selSet.length) return; const beforeMap={},afterMap={};
      selSet.forEach(o=>{ const id=o.userData.editId; beforeMap[id]=snap(o);
        o.position.x+=dx; o.position.y+=dy; o.position.z+=dz; recordXform(o); afterMap[id]=snap(o); });
      pushHist(multiXformCmd(beforeMap,afterMap)); }

    // ── transform gizmo (axis arrows = move, rings = rotate) ──
    function axisVec(ax){ return new THREE.Vector3(ax==='x'?1:0, ax==='y'?1:0, ax==='z'?1:0); }
    function rayAxisParam(P0,A,ray){ const O=ray.origin, D=ray.direction;
      const rx=P0.x-O.x, ry=P0.y-O.y, rz=P0.z-O.z;
      const b=A.x*D.x+A.y*D.y+A.z*D.z, d=A.x*rx+A.y*ry+A.z*rz, e=D.x*rx+D.y*ry+D.z*rz;
      const denom=1-b*b; if(Math.abs(denom)<1e-6) return 0; return (b*e-d)/denom; }
    function buildGizmo(){ const g=new THREE.Group(); g.userData.noEdit=true; gizmoHandles=[];
      const AX={ x:[new THREE.Vector3(1,0,0),0xff5252], y:[new THREE.Vector3(0,1,0),0x69f0ae], z:[new THREE.Vector3(0,0,1),0x448aff] };
      const mat=c=>new THREE.MeshBasicMaterial({color:c,depthTest:false,transparent:true,opacity:.95});
      const up=new THREE.Vector3(0,1,0);
      for(const ax in AX){ const dir=AX[ax][0], col=AX[ax][1];
        const arrow=new THREE.Group(); arrow.userData={gizmoAxis:ax,gizmoMode:'move'};
        const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.4,8),mat(col)); shaft.position.y=.7;
        const head=new THREE.Mesh(new THREE.ConeGeometry(.13,.34,10),mat(col)); head.position.y=1.55;
        arrow.add(shaft,head); arrow.quaternion.setFromUnitVectors(up,dir);
        arrow.traverse(o=>{ o.renderOrder=999; if(o.isMesh){ o.userData.gizmoAxis=ax; o.userData.gizmoMode='move'; gizmoHandles.push(o); } });
        g.add(arrow);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.05,8,40),mat(col));
        ring.userData={gizmoAxis:ax,gizmoMode:'rotate'}; ring.renderOrder=999;
        if(ax==='x') ring.rotation.y=Math.PI/2; else if(ax==='y') ring.rotation.x=Math.PI/2;
        gizmoHandles.push(ring); g.add(ring);
        // scale: cube on each axis (stretch one axis)
        const cube=new THREE.Mesh(new THREE.BoxGeometry(.24,.24,.24),mat(col));
        cube.userData={gizmoAxis:ax,gizmoMode:'scale'}; cube.renderOrder=999;
        cube.position.copy(dir).multiplyScalar(1.5); gizmoHandles.push(cube); g.add(cube);
      }
      // scale: white center cube (uniform / proportional)
      const uni=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3),mat(0xffffff));
      uni.userData={gizmoAxis:'u',gizmoMode:'scale'}; uni.renderOrder=999;
      gizmoHandles.push(uni); g.add(uni);
      return g; }
    function ensureGizmo(){ if(!gizmo){ gizmo=buildGizmo(); scene.add(gizmo); } }
    function updateGizmo(){ ensureGizmo();
      const show=editMode && selSet.length>=1 && (editTool==='move'||editTool==='rotate'||editTool==='scale');
      gizmo.visible=show; if(!show) return;
      gizmo.position.copy(centroidOf(selSet));   // centroid → works for one or many
      const d=camera.position.distanceTo(gizmo.position); gizmo.scale.setScalar(Math.max(.4,d*0.11));
      gizmo.children.forEach(h=>{ h.visible=(h.userData.gizmoMode===editTool); }); }

    // ── selection + helpers ──
    function updateSignUI(){ const tg=$('ed-textgrp'); if(!tg) return;
      if(edSel&&edSel.userData.editType==='sign'&&selSet.length===1){ tg.style.display='block';
        const inp=$('ed-text'); if(document.activeElement!==inp) inp.value=edSel.userData.signText||''; }
      else tg.style.display='none'; }
    function setSelInfo(o){ const info=$('ed-selinfo'); updateGroupBtns(); updateSignUI(); updateColorUI(); updateGizmo();
      if(!info) return;
      if(selSet.length>1){ info.textContent=selSet.length+' objects selected'; return; }
      if(o){ const e=editById.get(o.userData.editId);
        info.textContent=(e&&e.group?'group':(e&&e.type)||'object')+'  ['+o.userData.editId+']  ('+o.position.x.toFixed(1)+', '+o.position.z.toFixed(1)+')';
      } else info.textContent='Nothing selected'; }
    function updateColorUI(){ const cg=$('ed-colorgrp'), ci=$('ed-color'); if(!cg) return;
      if(selSet.length){ cg.style.display='block'; if(ci&&edSel) ci.value='#'+colorOf(edSel).toString(16).padStart(6,'0'); }
      else cg.style.display='none'; }
    function refreshHelpers(){ selHelpers.forEach(h=>h.update()); }
    function rebuildHelpers(){ selHelpers.forEach(h=>scene.remove(h)); selHelpers=[];
      selSet.forEach(o=>{ const h=new THREE.BoxHelper(o,0xffeb3b); h.userData.noEdit=true; scene.add(h); selHelpers.push(h); }); }
    function setSel(o){ selSet=o?[o]:[]; edSel=o||null; rebuildHelpers(); setSelInfo(o); }
    function addToSel(o){ const i=selSet.indexOf(o);
      if(i>=0){ selSet.splice(i,1); if(edSel===o) edSel=selSet[selSet.length-1]||null; }
      else { selSet.push(o); edSel=o; }
      rebuildHelpers(); setSelInfo(edSel); }
    function recordXform(o){ const e=editById.get(o.userData.editId); if(!e) return;
      const t=snap(o); const prev=layout.moves[o.userData.editId];
      if(prev&&prev.col!=null) t.col=prev.col;   // keep any saved tint
      if(e.group){ Object.assign(e.groupEntry,t); }
      else if(e.added){ Object.assign(e.addEntry,t); } else { layout.moves[o.userData.editId]=t; }
      refreshHelpers(); }
    function updateGroupBtns(){ const g=$('ed-group'), u=$('ed-ungroup');
      if(g) g.disabled=selSet.length<2;
      if(u){ const e=edSel&&editById.get(edSel.userData.editId); u.disabled=!(selSet.length===1&&e&&e.group); } }

    // ── add / delete ──
    function addObject(type,x,z,opts){ opts=opts||{};
      const o=CATALOG[type](opts.text); o.position.set(x,0,z);
      const id='a'+(_eid++); o.userData.editId=id; o.userData.editType=type; scene.add(o);
      const entry={id,type,x:+x.toFixed(3),y:0,z:+z.toFixed(3),ry:0};
      if(type==='sign') entry.text=o.userData.signText;
      layout.adds.push(entry); addColliderFor(o,type);
      editById.set(id,{obj:o,type,added:true,addEntry:entry});
      if(!opts.noSelect) setSel(o);
      pushHist({
        undo(){ scene.remove(o); const i=layout.adds.indexOf(entry); if(i>=0)layout.adds.splice(i,1);
          editById.delete(id); if(edSel===o) setSel(null); },
        redo(){ scene.add(o); if(layout.adds.indexOf(entry)<0)layout.adds.push(entry);
          editById.set(id,{obj:o,type,added:true,addEntry:entry}); setSel(o); }
      });
      return o; }
    function deleteOps(obj){ const id=obj.userData.editId, e=editById.get(id);
      const wasAdded=e.added, entry=e.addEntry, type=e.type, isGroup=e.group, gEntry=e.groupEntry;
      const cols=collidersUnder(obj);
      function removeIt(){ scene.remove(obj); editById.delete(id); removeColliders(cols);
        if(isGroup){ const i=layout.groups.indexOf(gEntry); if(i>=0)layout.groups.splice(i,1); }
        else if(wasAdded){ const i=layout.adds.indexOf(entry); if(i>=0)layout.adds.splice(i,1); }
        else { if(!layout.deletes.includes(id)) layout.deletes.push(id); delete layout.moves[id]; } }
      function restoreIt(){ scene.add(obj); editById.set(id,{obj,type,added:wasAdded,addEntry:entry,group:isGroup,groupEntry:gEntry});
        cols.forEach(c=>{ if(colliders.indexOf(c)<0)colliders.push(c); });
        if(isGroup){ if(layout.groups.indexOf(gEntry)<0)layout.groups.push(gEntry); }
        else if(wasAdded){ if(layout.adds.indexOf(entry)<0)layout.adds.push(entry); }
        else { const di=layout.deletes.indexOf(id); if(di>=0)layout.deletes.splice(di,1); } }
      return {removeIt,restoreIt}; }
    function delSelected(){ if(!selSet.length) return;
      const ops=selSet.map(deleteOps); ops.forEach(o=>o.removeIt()); setSel(null);
      pushHist({ undo(){ ops.forEach(o=>o.restoreIt()); }, redo(){ ops.forEach(o=>o.removeIt()); } }); }
    function dupSelected(){ if(!selSet.length) return; copySelection(); if(clipboard&&clipboard.length) pasteClipboard(); }

    // ── copy / paste ──
    let clipboard=null, clipboardGroup=false;
    const _cq=new THREE.Quaternion(), _ce=new THREE.Euler();
    function copySelection(){ const picked=[];
      const collect=(obj)=>{ const rec=editById.get(obj.userData.editId)||{};
        const type=rec.type||obj.userData.editType; if(!type||!CATALOG[type]) return;
        const wp=obj.getWorldPosition(new THREE.Vector3());
        obj.getWorldQuaternion(_cq); _ce.setFromQuaternion(_cq,'YXZ');
        const text=(rec.addEntry&&rec.addEntry.text!=null)?rec.addEntry.text:(obj.userData.signText||null);
        picked.push({type,text,x:wp.x,z:wp.z,ry:_ce.y}); };
      clipboardGroup=selSet.some(o=>{ const e=editById.get(o.userData.editId); return e&&e.group; });
      selSet.forEach(o=>{ const e=editById.get(o.userData.editId); if(!e) return;
        if(e.group&&e.objs){ e.objs.forEach(collect); } else collect(o); });
      if(!picked.length){ edInfo('Select placed props (or a group of them) to copy.'); return; }
      const cx=picked.reduce((s,i)=>s+i.x,0)/picked.length, cz=picked.reduce((s,i)=>s+i.z,0)/picked.length;
      clipboard=picked.map(i=>({type:i.type,text:i.text,dx:i.x-cx,dz:i.z-cz,ry:i.ry}));
      edInfo('Copied '+clipboard.length+' object'+(clipboard.length>1?'s':'')); }
    function pasteClipboard(){ if(!clipboard||!clipboard.length){ edInfo('Nothing copied yet (Ctrl+C).'); return; }
      let bx,bz;
      if(edSel){ bx=edSel.position.x+3; bz=edSel.position.z+3; }
      else { _ray.setFromCamera(new THREE.Vector2(0,-0.2),camera); const p=_ray.ray.intersectPlane(_gplane,_hit); bx=p?p.x:0; bz=p?p.z:0; }
      const created=[];
      clipboard.forEach(c=>{ const o=addObject(c.type, bx+c.dx, bz+c.dz, {noSelect:true,text:c.text});
        if(o){ o.rotation.y=c.ry; recordXform(o); created.push(o); } });
      if(created.length){ selSet=created; edSel=created[created.length-1]; rebuildHelpers();
        if(clipboardGroup&&created.length>=2) groupSelected(); else setSelInfo(edSel); }
      edInfo('Pasted '+created.length+' object'+(created.length>1?'s':'')); }
    function centroidOf(list){ const c=new THREE.Vector3();
      list.forEach(o=>c.add(o.getWorldPosition(new THREE.Vector3()))); if(list.length)c.multiplyScalar(1/list.length); return c; }

    // ── grouping ──
    function makeGroupController(pivot,objs,ge){ const addEntries={};
      function apply(){ if(pivot.parent!==scene) scene.add(pivot);
        objs.forEach((o,i)=>{ if(o.parent!==pivot) pivot.attach(o); o.userData.editId=null;
          const m=ge.members[i];
          if(m.kind==='base'){ editById.delete(m.id); delete layout.moves[m.id]; }
          else { const en=addEntries[i]; if(en){ const k=layout.adds.indexOf(en); if(k>=0)layout.adds.splice(k,1); editById.delete(en.id); } } });
        editById.set(ge.id,{obj:pivot,group:true,groupEntry:ge,objs});
        if(layout.groups.indexOf(ge)<0)layout.groups.push(ge); }
      function revert(){ editById.delete(ge.id); const gi=layout.groups.indexOf(ge); if(gi>=0)layout.groups.splice(gi,1);
        objs.forEach((o,i)=>{ scene.attach(o); const m=ge.members[i];
          if(m.kind==='base'){ o.userData.editId=m.id; editById.set(m.id,{obj:o,type:o.userData.editType||null,added:false}); layout.moves[m.id]=snap(o); }
          else { const id='a'+(_eid++); o.userData.editId=id; const entry=Object.assign({id,type:m.type},snap(o));
            if(o.userData.editType==='sign') entry.text=o.userData.signText;
            addEntries[i]=entry; layout.adds.push(entry); editById.set(id,{obj:o,type:m.type,added:true,addEntry:entry}); } });
        scene.remove(pivot); setSel(null); }
      return {apply,revert}; }
    function groupSelected(){
      const members=selSet.filter(o=>{ const e=editById.get(o.userData.editId); return e&&!e.group; });
      if(members.length<2){ edInfo('Select 2+ objects to group (shift-click).'); return; }
      const c=centroidOf(members);
      const pivot=new THREE.Group(); pivot.position.copy(c); pivot.userData.editId='g'+(_eid++); pivot.userData.isGroup=true; scene.add(pivot);
      const ge={ id:pivot.userData.editId, x:+c.x.toFixed(3),y:+c.y.toFixed(3),z:+c.z.toFixed(3),ry:0, members:[] };
      const objs=[];
      members.forEach(o=>{ const e=editById.get(o.userData.editId);
        const md=e.added?{kind:'add',type:e.type}:{kind:'base',id:o.userData.editId};
        if(e.added&&e.addEntry&&e.addEntry.text!=null) md.text=e.addEntry.text;
        ge.members.push(md); objs.push(o); });
      const ctrl=makeGroupController(pivot,objs,ge); ctrl.apply();
      objs.forEach((o,i)=>{ const m=ge.members[i]; m.lx=+o.position.x.toFixed(3);m.ly=+o.position.y.toFixed(3);m.lz=+o.position.z.toFixed(3);m.lry=+o.rotation.y.toFixed(3); });
      setSel(pivot);
      pushHist({ undo:ctrl.revert, redo:ctrl.apply }); }
    function ungroupSelected(){ if(!edSel) return; const rec=editById.get(edSel.userData.editId);
      if(!rec||!rec.group) return;
      const ctrl=makeGroupController(rec.obj,rec.objs,rec.groupEntry); ctrl.revert();
      pushHist({ undo:ctrl.apply, redo:ctrl.revert }); }
    function syncGroups(){ layout.groups.forEach(ge=>{ const rec=editById.get(ge.id); if(!rec||!rec.objs)return;
      const p=rec.obj; ge.x=+p.position.x.toFixed(3);ge.y=+p.position.y.toFixed(3);ge.z=+p.position.z.toFixed(3);ge.ry=+p.rotation.y.toFixed(3);
      rec.objs.forEach((o,i)=>{ const m=ge.members[i]; if(!m)return;
        m.lx=+o.position.x.toFixed(3);m.ly=+o.position.y.toFixed(3);m.lz=+o.position.z.toFixed(3);m.lry=+o.rotation.y.toFixed(3); }); }); }

    // ── save / export / import / load ──
    function saveLayout(){ syncGroups(); const btn=$('ed-save'); const old=btn.textContent;
      if(!SAVE_URL){ btn.textContent='🌐 Sandbox only';
        edInfo('Online = temporary sandbox. Run the project locally (npm start) to save permanently — or use Download backup.');
        setTimeout(()=>{ btn.textContent=old; },2800); return; }
      btn.textContent='Saving…'; btn.disabled=true;
      fetch(SAVE_URL+'/save-layout',{ method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({level:LEVEL,global:GLOBAL,layout}) })
        .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(j=>{ btn.textContent='✅ Saved to '+j.file; })
        .catch(err=>{ btn.textContent='❌ Save failed';
          edInfo('Save failed ('+err.message+') — start the local server: cd src/server && npm start. Or use Download backup.'); })
        .finally(()=>{ btn.disabled=false; setTimeout(()=>{ btn.textContent=old; },2800); }); }
    function exportLayout(){ syncGroups();
      const data='window.'+GLOBAL+' = '+JSON.stringify(layout,null,2)+';\n';
      const blob=new Blob([data],{type:'text/javascript'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=LEVEL+'_layout.js'; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000); }
    function parseLayoutText(txt){ let s=txt.trim();
      const i=s.indexOf('{'), j=s.lastIndexOf('}'); if(i<0||j<0) throw new Error('no layout object found');
      return JSON.parse(s.slice(i,j+1)); }
    function importLayout(file){ const r=new FileReader();
      r.onload=()=>{ try{ const L=parseLayoutText(String(r.result));
          sessionStorage.setItem('tuck_'+LEVEL+'_import',JSON.stringify(L)); location.reload();
        }catch(err){ edInfo('Import failed: '+err.message); } };
      r.onerror=()=>{ edInfo('Import failed: could not read file'); }; r.readAsText(file); }
    function applyLayoutData(L){ if(!L) return;
      layout={moves:L.moves||{},deletes:L.deletes||[],adds:L.adds||[],groups:L.groups||[],paint:L.paint||{}};
      loadPaint(layout.paint);
      for(const id in layout.moves){ const e=editById.get(id); if(e){ const t=layout.moves[id];
        e.obj.position.set(t.x,t.y||0,t.z); e.obj.rotation.set(t.rx||0,t.ry||0,t.rz||0);
        if(t.sx!=null) e.obj.scale.set(t.sx,t.sy,t.sz);
        if(t.col!=null) applyColor(e.obj,t.col); } }
      layout.deletes.forEach(id=>{ const e=editById.get(id); if(e){ removeColliders(collidersUnder(e.obj)); scene.remove(e.obj); editById.delete(id); } });
      layout.adds.forEach(a=>{ if(!CATALOG[a.type]) return; const o=CATALOG[a.type](a.text);
        o.position.set(a.x,a.y||0,a.z); o.rotation.set(a.rx||0,a.ry||0,a.rz||0); o.userData.editId=a.id; o.userData.editType=a.type;
        if(a.sx!=null) o.scale.set(a.sx,a.sy,a.sz);
        if(a.col!=null) applyColor(o,a.col);
        scene.add(o); editById.set(a.id,{obj:o,type:a.type,added:true,addEntry:a}); addColliderFor(o,a.type);
        const n=parseInt(String(a.id).slice(1)); if(!isNaN(n)&&n>=_eid)_eid=n+1; });
      layout.groups.forEach(ge=>{ const pivot=new THREE.Group();
        pivot.position.set(ge.x||0,ge.y||0,ge.z||0); pivot.rotation.set(ge.rx||0,ge.ry||0,ge.rz||0);
        if(ge.sx!=null) pivot.scale.set(ge.sx,ge.sy,ge.sz);
        pivot.userData.editId=ge.id; pivot.userData.isGroup=true; scene.add(pivot);
        const objs=[];
        (ge.members||[]).forEach(m=>{ let o=null;
          if(m.kind==='base'){ const e=editById.get(m.id); if(e){ o=e.obj; editById.delete(m.id); o.userData.editId=null; delete layout.moves[m.id]; } }
          else if(m.kind==='add'&&CATALOG[m.type]){ o=CATALOG[m.type](m.text); o.userData.editId=null; o.userData.editType=m.type; }
          if(o){ pivot.add(o); o.position.set(m.lx||0,m.ly||0,m.lz||0); o.rotation.y=m.lry||0; objs.push(o);
            if(m.kind==='add') addColliderFor(o,m.type); } });
        if(ge.col!=null) applyColor(pivot,ge.col);
        editById.set(ge.id,{obj:pivot,group:true,groupEntry:ge,objs});
        const n=parseInt(String(ge.id).slice(1)); if(!isNaN(n)&&n>=_eid)_eid=n+1; }); }
    function applyBakedLayout(){
      try{ const pend=sessionStorage.getItem('tuck_'+LEVEL+'_import');
        if(pend){ sessionStorage.removeItem('tuck_'+LEVEL+'_import'); applyLayoutData(JSON.parse(pend)); return; } }catch(e){}
      if(window[GLOBAL]){ applyLayoutData(window[GLOBAL]); return; }
      const s=document.createElement('script'); s.src=LAYOUT_SCRIPT;
      s.onload=()=>applyLayoutData(window[GLOBAL]); s.onerror=()=>{}; document.head.appendChild(s); }

    // ── ground paint ──
    const TILE=3; let paintType='grass', paintStroke=null; const paintTiles=new Map();
    function tileMesh(type){ const p=PAINT_BY[type]; const g=new THREE.Group();
      const base=MM(new THREE.PlaneGeometry(TILE,TILE),p?p.col:0x6ab04c,false); base.rotation.x=-Math.PI/2; g.add(base);
      if(p&&p.line){ [-TILE/2+.16,TILE/2-.16].forEach(x=>{ const l=MM(new THREE.PlaneGeometry(.16,TILE-.3),0xffffff,false);
        l.rotation.x=-Math.PI/2; l.position.set(x,.01,0); g.add(l); }); }
      g.traverse(o=>{ o.userData.noEdit=true; }); return g; }
    function setPaint(key,type){ const old=paintTiles.get(key); if(old){ scene.remove(old); paintTiles.delete(key); }
      if(type&&type!=='erase'){ const [ix,iz]=key.split(',').map(Number);
        const g=tileMesh(type); g.position.set(ix*TILE,.05,iz*TILE); scene.add(g); paintTiles.set(key,g); layout.paint[key]=type; }
      else delete layout.paint[key]; }
    function loadPaint(P){ for(const k in (P||{})) setPaint(k,P[k]); }
    function paintAt(x,z){ const key=Math.round(x/TILE)+','+Math.round(z/TILE);
      if(paintStroke && !(key in paintStroke)) paintStroke[key]=layout.paint[key]||'erase'; setPaint(key,paintType); }

    // ── pointer → world ──
    function setNdc(e){ const r=renderer.domElement.getBoundingClientRect();
      _ndc.x=((e.clientX-r.left)/r.width)*2-1; _ndc.y=-((e.clientY-r.top)/r.height)*2+1; }
    function groundPoint(e){ setNdc(e); _ray.setFromCamera(_ndc,camera);
      return _ray.ray.intersectPlane(_gplane,_hit)? _hit.clone() : null; }

    renderer.domElement.addEventListener('pointerdown',e=>{
      if(!editMode||e.button!==0) return;
      if(editTool==='paint'){ const gp=groundPoint(e); if(gp){ paintStroke={}; paintAt(gp.x,gp.z); } e.preventDefault(); e.stopPropagation(); return; }
      if(placeType){ const gp=groundPoint(e); if(gp){ const o=addObject(placeType, gsnap(gp.x), gsnap(gp.z));
          if(o){ o.rotation.y=ghostRot; recordXform(o); } } e.preventDefault(); e.stopPropagation(); return; }
      // gizmo handle drag takes priority over selection
      if(gizmo&&gizmo.visible&&selSet.length){ setNdc(e); _ray.setFromCamera(_ndc,camera);
        const gh=_ray.intersectObjects(gizmoHandles.filter(h=>h.userData.gizmoMode===editTool),false);
        if(gh.length){ const hit=gh[0].object, ax=hit.userData.gizmoAxis, mode=hit.userData.gizmoMode;
          const A=axisVec(ax), C=centroidOf(selSet);
          const items=selSet.map(o=>({o, p0:o.position.clone(), q0:o.quaternion.clone(), s0:o.scale.clone(),
            off:o.getWorldPosition(new THREE.Vector3()).sub(C)}));
          dragging=true; dragBefore=selSet.map(o=>({id:o.userData.editId,t:snap(o)}));
          gizmoDrag={mode,ax,A,C,items,startX:e.clientX,t0:rayAxisParam(C,A,_ray.ray)};
          e.preventDefault(); e.stopPropagation(); return; }
      }
      setNdc(e); _ray.setFromCamera(_ndc,camera);
      const hits=_ray.intersectObjects(editList(),true);
      const root=hits.length?findRoot(hits[0].object):null;
      if(root){
        if(e.shiftKey){ addToSel(root); }
        else if(selSet.indexOf(root)<0){ setSel(root); }
        else { dragging=true; dragStartX=e.clientX;
          dragBefore=selSet.map(o=>({id:o.userData.editId,t:snap(o)}));
          if(editTool==='move'){ const gp=groundPoint(e);
            if(gp){ dragOffsets=selSet.map(o=>({o,dx:o.position.x-gp.x,dz:o.position.z-gp.z})); } }
          else { rotCentroid=centroidOf(selSet); dragRoll=e.shiftKey;
            dragRotStart=selSet.map(o=>({o,px:o.position.x,pz:o.position.z,ry:o.rotation.y,rz:o.rotation.z})); } }
        e.preventDefault(); e.stopPropagation();
      } else if(!e.shiftKey) setSel(null);
    });
    renderer.domElement.addEventListener('wheel',e=>{
      if(editMode&&placeType&&ghost){ e.preventDefault(); ghostRot+=(e.deltaY>0?1:-1)*Math.PI/12; ghost.rotation.y=ghostRot; }
    },{passive:false});
    renderer.domElement.addEventListener('pointermove',e=>{
      if(editMode&&placeType&&ghost){ const gp=groundPoint(e); if(gp) ghost.position.set(gsnap(gp.x),0,gsnap(gp.z)); return; }
      if(editMode&&editTool==='paint'&&paintStroke){ const gp=groundPoint(e); if(gp) paintAt(gp.x,gp.z); return; }
      if(editMode&&gizmoDrag){ setNdc(e); _ray.setFromCamera(_ndc,camera); const gd=gizmoDrag;
        const single=gd.items.length===1;
        if(gd.mode==='move'){ const t=rayAxisParam(gd.C,gd.A,_ray.ray); const delta=t-gd.t0;
          gd.items.forEach(it=>{ const np=it.p0.clone().addScaledVector(gd.A,delta);
            if(single){ it.o.position[gd.ax]=(gd.ax==='y')? +np.y.toFixed(3) : gsnap(np[gd.ax]); }
            else it.o.position.copy(np);
            recordXform(it.o); }); }
        else if(gd.mode==='scale'){ const f=Math.max(.05, 1+(e.clientX-gd.startX)*0.01);
          gd.items.forEach(it=>{ if(gd.ax==='u'){ it.o.scale.set(it.s0.x*f,it.s0.y*f,it.s0.z*f);
              it.o.position.copy(gd.C).add(it.off.clone().multiplyScalar(f)); }   // grow about centroid
            else { it.o.scale[gd.ax]=it.s0[gd.ax]*f;
              const no=it.off.clone(); no[gd.ax]*=f; it.o.position.copy(gd.C).add(no); }
            recordXform(it.o); }); }
        else { const ang=(e.clientX-gd.startX)*0.01; const q=new THREE.Quaternion().setFromAxisAngle(gd.A,ang);
          gd.items.forEach(it=>{ it.o.position.copy(gd.C).add(it.off.clone().applyQuaternion(q));   // orbit about centroid
            it.o.quaternion.copy(q).multiply(it.q0); recordXform(it.o); }); }
        e.preventDefault(); return; }
      if(!editMode||!dragging) return;
      if(editTool==='move'&&dragOffsets){ const gp=groundPoint(e); if(gp){
          dragOffsets.forEach(d=>{ d.o.position.x=gsnap(gp.x+d.dx); d.o.position.z=gsnap(gp.z+d.dz); recordXform(d.o); }); } }
      else if(editTool==='rotate'&&dragRotStart){ const ang=(e.clientX-dragStartX)*0.01;
          if(dragRoll){ dragRotStart.forEach(d=>{ d.o.rotation.z=d.rz+ang; recordXform(d.o); }); }   // Shift = tilt left/right (roll)
          else { const cx=rotCentroid.x, cz=rotCentroid.z, ca=Math.cos(ang), sa=Math.sin(ang);
            dragRotStart.forEach(d=>{ const dx=d.px-cx, dz=d.pz-cz;
              d.o.position.x=cx+dx*ca-dz*sa; d.o.position.z=cz+dx*sa+dz*ca; d.o.rotation.y=d.ry+ang; recordXform(d.o); }); } }
    });
    addEventListener('pointerup',()=>{
      if(paintStroke){ const before=paintStroke; paintStroke=null; const keys=Object.keys(before);
        if(keys.length){ const after={}; keys.forEach(k=>after[k]=layout.paint[k]||'erase');
          pushHist({ undo(){ keys.forEach(k=>setPaint(k,before[k])); }, redo(){ keys.forEach(k=>setPaint(k,after[k])); } }); } }
      if(dragging&&dragBefore){ const beforeMap={},afterMap={}; let changed=false;
        dragBefore.forEach(b=>{ const rec=editById.get(b.id); if(!rec)return; const a=snap(rec.obj);
          beforeMap[b.id]=b.t; afterMap[b.id]=a;
          if(a.x!==b.t.x||a.y!==b.t.y||a.z!==b.t.z||a.rx!==b.t.rx||a.ry!==b.t.ry||a.rz!==b.t.rz
             ||a.sx!==b.t.sx||a.sy!==b.t.sy||a.sz!==b.t.sz) changed=true; });
        if(changed) pushHist(multiXformCmd(beforeMap,afterMap)); }
      dragging=false; dragBefore=null; dragOffsets=null; dragRotStart=null; dragRoll=false; gizmoDrag=null;
    });

    // ── free-fly camera (edit mode) ──
    const freeCam={pos:new THREE.Vector3(0,8,16),yaw:Math.PI,pitch:-.3,up:false,down:false,back:false};
    const fkeys={forward:false,backward:false,left:false,right:false,sprint:false};
    const _UP=new THREE.Vector3(0,1,0);
    function freeCamDir(){ const cp=Math.cos(freeCam.pitch);
      return new THREE.Vector3(Math.sin(freeCam.yaw)*cp, Math.sin(freeCam.pitch), Math.cos(freeCam.yaw)*cp); }
    function initFreeCam(){ freeCam.pos.copy(camera.position);
      const d=new THREE.Vector3(); camera.getWorldDirection(d);
      freeCam.yaw=Math.atan2(d.x,d.z); freeCam.pitch=Math.max(-1.4,Math.min(1.4,Math.asin(Math.max(-1,Math.min(1,d.y))))); }
    function updateFreeCam(dt){ const dir=freeCamDir();
      const right=new THREE.Vector3().crossVectors(_UP,dir).normalize();
      const mv=new THREE.Vector3();
      if(fkeys.forward)mv.add(dir); if(fkeys.backward)mv.sub(dir);
      if(fkeys.right)mv.sub(right); if(fkeys.left)mv.add(right);
      if(freeCam.up)mv.y+=1; if(freeCam.down)mv.y-=1; if(freeCam.back)mv.sub(dir);
      if(mv.lengthSq()>0){ mv.normalize().multiplyScalar((fkeys.sprint?30:13)*dt); freeCam.pos.add(mv); }
      camera.position.copy(freeCam.pos); camera.lookAt(freeCam.pos.clone().add(dir)); }

    // free-cam look (right-drag) — only while editing
    let rmb=false,lmx=0,lmy=0;
    addEventListener('mousedown',e=>{ if(e.button===2){ rmb=true; lmx=e.clientX; lmy=e.clientY; } });
    addEventListener('mouseup',e=>{ if(e.button===2)rmb=false; });
    addEventListener('mousemove',e=>{ if(!rmb||!editMode)return;
      const dx=e.clientX-lmx, dy=e.clientY-lmy; lmx=e.clientX; lmy=e.clientY;
      freeCam.yaw-=dx*.005; freeCam.pitch=Math.max(-1.4,Math.min(1.4,freeCam.pitch-dy*.005)); });
    renderer.domElement.addEventListener('contextmenu',e=>{ if(editMode) e.preventDefault(); });

    // free-cam keys (independent of host input; active only while editing)
    addEventListener('keydown',e=>{
      if(e.key==='F2'){ e.preventDefault(); toggleEdit(); return; }
      if(!editMode) return;
      if(e.target&&e.target.tagName==='INPUT'){
        // still allow undo/redo while not focused-typing handled below
        return;
      }
      if(e.code==='Escape'&&placeType){ exitPlace(); return; }
      if((e.ctrlKey||e.metaKey)&&(e.code==='KeyZ'||e.code==='KeyY')){ e.preventDefault();
        if(e.code==='KeyY'||(e.code==='KeyZ'&&e.shiftKey)) doRedo(); else doUndo(); return; }
      if((e.ctrlKey||e.metaKey)&&e.code==='KeyC'){ e.preventDefault(); copySelection(); return; }
      if((e.ctrlKey||e.metaKey)&&e.code==='KeyV'){ e.preventDefault(); pasteClipboard(); return; }
      if((e.ctrlKey||e.metaKey)&&e.code==='KeyG'){ e.preventDefault(); groupSelected(); return; }
      if(e.code==='Delete'||e.code==='Backspace'){ e.preventDefault(); delSelected(); return; }
      if(e.code==='KeyR'){ setTool('rotate'); return; }   // R = rotate tool
      if(e.code==='KeyM'){ setTool('move'); return; }      // M = move tool
      if(e.code==='KeyT'){ setTool('scale'); return; }     // T = scale / stretch tool
      // arrow keys nudge the selection (Shift = bigger step); only fly when nothing selected
      if(selSet.length&&(e.code==='ArrowLeft'||e.code==='ArrowRight'||e.code==='ArrowUp'||e.code==='ArrowDown')){
        e.preventDefault(); const s=e.shiftKey?1:.2;
        if(e.code==='ArrowLeft') nudgeSelected(-s,0,0);
        else if(e.code==='ArrowRight') nudgeSelected(s,0,0);
        else if(e.code==='ArrowUp') nudgeSelected(0,0,-s);
        else nudgeSelected(0,0,s);
        return;
      }
      switch(e.code){
        case'KeyW':case'ArrowUp':fkeys.forward=true;break;
        case'KeyS':case'ArrowDown':fkeys.backward=true;break;
        case'KeyA':case'ArrowLeft':fkeys.left=true;break;
        case'KeyD':case'ArrowRight':fkeys.right=true;break;
        case'ShiftLeft':case'ShiftRight':fkeys.sprint=true;break;
        case'KeyE':freeCam.up=true;break;
        case'KeyQ':freeCam.down=true;break;
        case'Space':e.preventDefault();freeCam.back=true;break;
      }
    });
    addEventListener('keyup',e=>{
      switch(e.code){
        case'KeyW':case'ArrowUp':fkeys.forward=false;break;
        case'KeyS':case'ArrowDown':fkeys.backward=false;break;
        case'KeyA':case'ArrowLeft':fkeys.left=false;break;
        case'KeyD':case'ArrowRight':fkeys.right=false;break;
        case'ShiftLeft':case'ShiftRight':fkeys.sprint=false;break;
        case'KeyE':freeCam.up=false;break;
        case'KeyQ':freeCam.down=false;break;
        case'Space':freeCam.back=false;break;
      }
    });

    // ── tools + toggle ──
    function setTool(t){ exitPlace(); editTool=t;
      $('tool-move').classList.toggle('active',t==='move');
      $('tool-rotate').classList.toggle('active',t==='rotate');
      $('tool-scale').classList.toggle('active',t==='scale');
      $('tool-paint').classList.toggle('active',t==='paint');
      $('ed-paintgrp').style.display=t==='paint'?'block':'none';
      updateGizmo(); }
    function toggleEdit(){ editMode=!editMode;
      $('editor').classList.toggle('show',editMode);
      $('edit-toggle').classList.toggle('on',editMode);
      $('edit-toggle').textContent=editMode?'✏ Editing…':'✏ Edit Mode';
      // reset transient key state on toggle
      Object.keys(fkeys).forEach(k=>fkeys[k]=false); freeCam.up=freeCam.down=freeCam.back=false;
      if(editMode){ initFreeCam(); } else setSel(null);
      updateGizmo(); }

    // ── wire UI ──
    (function wireEditor(){
      const sel=$('ed-cat');
      const ph=document.createElement('option'); ph.value=''; ph.textContent='— pick to place —'; sel.appendChild(ph);
      CAT_TYPES.slice().sort().forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); });
      sel.value='';
      $('edit-toggle').addEventListener('click',toggleEdit);
      $('tool-move').addEventListener('click',()=>setTool('move'));
      $('tool-rotate').addEventListener('click',()=>setTool('rotate'));
      $('tool-scale').addEventListener('click',()=>setTool('scale'));
      $('tool-paint').addEventListener('click',()=>setTool('paint'));
      $('ed-grid').addEventListener('click',function(){ gridOn=!gridOn; this.classList.toggle('active',gridOn); });
      (function buildPalette(){ const pal=$('ed-palette');
        const mk=(id,col)=>{ const b=document.createElement('button'); b.textContent=id; b.title=id;
          b.style.cssText='width:48px;height:28px;font-size:10px;border:2px solid transparent;border-radius:5px;'+
            'color:#fff;text-shadow:0 1px 1px #000;cursor:pointer;background:#'+col.toString(16).padStart(6,'0');
          b.addEventListener('click',()=>{ paintType=id; pal.querySelectorAll('button').forEach(x=>x.style.borderColor='transparent'); b.style.borderColor='#fff'; });
          pal.appendChild(b); return b; };
        PAINTS.forEach(p=>mk(p.id,p.col)); mk('erase',0x222222); pal.firstChild.style.borderColor='#fff'; })();
      const rotBy=(ang)=>{ if(!selSet.length)return;
        const c=centroidOf(selSet), ca=Math.cos(ang), sa=Math.sin(ang); const beforeMap={},afterMap={};
        selSet.forEach(o=>{ const id=o.userData.editId; beforeMap[id]=snap(o);
          const dx=o.position.x-c.x, dz=o.position.z-c.z;
          o.position.x=c.x+dx*ca-dz*sa; o.position.z=c.z+dx*sa+dz*ca; o.rotation.y+=ang; recordXform(o); afterMap[id]=snap(o); });
        pushHist(multiXformCmd(beforeMap,afterMap)); };
      $('ed-rotL').addEventListener('click',()=>rotBy(-Math.PI/12));
      $('ed-rotR').addEventListener('click',()=>rotBy(Math.PI/12));
      // tilt = roll around Z (the "lean left/right" axis), in place
      const tiltBy=(ang)=>{ if(!selSet.length)return; const beforeMap={},afterMap={};
        selSet.forEach(o=>{ const id=o.userData.editId; beforeMap[id]=snap(o);
          o.rotation.z+=ang; recordXform(o); afterMap[id]=snap(o); });
        pushHist(multiXformCmd(beforeMap,afterMap)); };
      $('ed-tiltL').addEventListener('click',()=>tiltBy(-Math.PI/12));
      $('ed-tiltR').addEventListener('click',()=>tiltBy(Math.PI/12));
      // resize: multiply scale (per-axis or uniform), one undo step
      const scaleBy=(fx,fy,fz)=>{ if(!selSet.length)return; const beforeMap={},afterMap={};
        selSet.forEach(o=>{ const id=o.userData.editId; beforeMap[id]=snap(o);
          o.scale.set(Math.max(.05,o.scale.x*fx),Math.max(.05,o.scale.y*fy),Math.max(.05,o.scale.z*fz));
          recordXform(o); afterMap[id]=snap(o); });
        pushHist(multiXformCmd(beforeMap,afterMap)); };
      const setScale1=()=>{ if(!selSet.length)return; const beforeMap={},afterMap={};
        selSet.forEach(o=>{ const id=o.userData.editId; beforeMap[id]=snap(o); o.scale.set(1,1,1); recordXform(o); afterMap[id]=snap(o); });
        pushHist(multiXformCmd(beforeMap,afterMap)); };
      $('ed-bigger').addEventListener('click',()=>scaleBy(1.15,1.15,1.15));
      $('ed-smaller').addEventListener('click',()=>scaleBy(1/1.15,1/1.15,1/1.15));
      $('ed-sx').addEventListener('click',e=>scaleBy(e.shiftKey?1/1.15:1.15,1,1));
      $('ed-sy').addEventListener('click',e=>scaleBy(1,e.shiftKey?1/1.15:1.15,1));
      $('ed-sz').addEventListener('click',e=>scaleBy(1,1,e.shiftKey?1/1.15:1.15));
      $('ed-sreset').addEventListener('click',setScale1);
      $('ed-color').addEventListener('change',e=>recolorSelected(parseInt(e.target.value.slice(1),16)));
      $('ed-undo').addEventListener('click',doUndo);
      $('ed-redo').addEventListener('click',doRedo);
      $('ed-del').addEventListener('click',delSelected);
      $('ed-dup').addEventListener('click',dupSelected);
      $('ed-group').addEventListener('click',groupSelected);
      $('ed-ungroup').addEventListener('click',ungroupSelected);
      $('ed-text').addEventListener('input',()=>{
        if(edSel&&edSel.userData.setText){ const v=$('ed-text').value;
          edSel.userData.setText(v); const e=editById.get(edSel.userData.editId);
          if(e&&e.addEntry) e.addEntry.text=v; refreshHelpers(); } });
      sel.addEventListener('change',()=>{ sel.value ? enterPlace(sel.value) : exitPlace(); });
      $('ed-save').addEventListener('click',saveLayout);
      $('ed-export').addEventListener('click',exportLayout);
      $('ed-import').addEventListener('click',()=>$('ed-import-file').click());
      $('ed-import-file').addEventListener('change',e=>{ if(e.target.files[0]) importLayout(e.target.files[0]); e.target.value=''; });
      updateUndoBtns();
    })();

    return {
      registerBase, applyBakedLayout,
      isEditing: ()=>editMode,
      toggle: toggleEdit,
      update(dt){ if(editMode){ updateFreeCam(dt); syncColliders(); updateGizmo(); } },
      getColliders: ()=>colliders,
    };
  }

  return { init };
})();
