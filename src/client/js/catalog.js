// Shared placeable-object catalog — single source of truth for the lobby editor and
// the per-level editors (js/editor.js). Each factory returns a fresh THREE.Object3D
// whose origin sits on the floor (y = 0) facing +Z.
//
// Requires THREE to be loaded globally first.
window.Catalog = (function(){
  function MM(geo,col,shadow){
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:col}));
    if(shadow!==false){m.castShadow=true;m.receiveShadow=true;} return m;
  }
  function at(m,x,y,z){ m.position.set(x||0,y||0,z||0); return m; }

  // canvas texture for writable signs
  function makeSignTexture(text){
    const c=document.createElement('canvas'); c.width=512; c.height=224;
    const x=c.getContext('2d');
    x.fillStyle='#caa15e'; x.fillRect(0,0,c.width,c.height);
    x.strokeStyle='#6d4c2a'; x.lineWidth=14; x.strokeRect(7,7,c.width-14,c.height-14);
    x.fillStyle='#2a1a0a'; x.textAlign='center'; x.textBaseline='middle'; x.font='bold 56px Arial';
    const words=String(text||'').split(/\s+/), lines=[]; let line='';
    words.forEach(w=>{ const t=line?line+' '+w:w; if(x.measureText(t).width>c.width-70&&line){ lines.push(line); line=w; } else line=t; });
    if(line)lines.push(line); const show=lines.slice(0,3);
    const lh=62, sy=c.height/2-(show.length-1)*lh/2;
    show.forEach((ln,i)=>x.fillText(ln,c.width/2,sy+i*lh));
    const tex=new THREE.CanvasTexture(c); tex.anisotropy=4; return tex;
  }

  const BG=THREE.BoxGeometry, CG=THREE.CylinderGeometry, SG=THREE.SphereGeometry, CO=THREE.ConeGeometry;

  const CATALOG={
    sign(text){ const g=new THREE.Group();
      g.add(at(MM(new BG(.14,2.0,.14),0x6d4c2a),0,1.0,0));      // post
      g.add(at(MM(new BG(2.3,1.1,.12),0x8a6432),0,2.05,0));     // board frame
      const tex=makeSignTexture(text||'Sign');
      const face=new THREE.Mesh(new THREE.PlaneGeometry(2.1,.92),new THREE.MeshBasicMaterial({map:tex}));
      face.position.set(0,2.05,.07); g.add(face);
      const back=new THREE.Mesh(new THREE.PlaneGeometry(2.1,.92),new THREE.MeshBasicMaterial({map:tex}));
      back.position.set(0,2.05,-.07); back.rotation.y=Math.PI; g.add(back);
      g.userData.signText=text||'Sign';
      g.userData.setText=(t)=>{ const nt=makeSignTexture(t); face.material.map=nt; face.material.needsUpdate=true;
        back.material.map=nt; back.material.needsUpdate=true; g.userData.signText=t; };
      g.traverse(o=>{ if(o.isMesh&&o.geometry.type!=='PlaneGeometry'){o.castShadow=true;o.receiveShadow=true;} });
      return g; },
    tree(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.25,.34,2.6,7),0x6d4c41),0,1.3,0));
      g.add(at(MM(new SG(1.6,7,6),0x43a047),0,3.2,0)); return g; },
    pine(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.2,.28,1.6,6),0x5d4037),0,.8,0));
      g.add(at(MM(new CO(1.3,2.2,7),0x2e7d32),0,2.2,0));
      g.add(at(MM(new CO(1.0,1.8,7),0x388e3c),0,3.1,0)); return g; },
    bush(){ const g=new THREE.Group();
      g.add(at(MM(new SG(.9,6,5),0x388e3c),0,.7,0));
      g.add(at(MM(new SG(.7,6,5),0x43a047),.7,.6,.2)); return g; },
    barrel(){ return at(MM(new CG(.5,.5,1.2,12),0x4a5a3a),0,.6,0); },
    crate(){ return at(MM(new BG(1.1,1.1,1.1),0x8d6e3a),0,.55,0); },
    rock(){ const r=MM(new THREE.DodecahedronGeometry(.8),0x808a90); r.position.y=.5;
      r.rotation.set(Math.random(),Math.random(),Math.random()); return r; },
    bench(){ const g=new THREE.Group();
      g.add(at(MM(new BG(2,.16,.6),0xa0522d),0,.5,0));
      g.add(at(MM(new BG(2,.6,.1),0xa0522d),0,.8,-.25));
      [-.8,.8].forEach(x=>g.add(at(MM(new BG(.12,.5,.5),0x5d3a1a),x,.25,0))); return g; },
    lamp(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.12,.16,4.2,8),0x37474f),0,2.1,0));
      const head=MM(new BG(.5,.3,.5),0xfff3cf,false);
      head.material=new THREE.MeshBasicMaterial({color:0xfff3cf}); head.position.y=4.1; g.add(head);
      const lp=new THREE.PointLight(0xffe2a8,1.4,18,1.8); lp.position.y=4.0; lp.userData.noEdit=true; g.add(lp);
      return g; },
    cone(){ const g=new THREE.Group();
      g.add(at(MM(new CO(.35,.9,12),0xff7043),0,.45,0));
      g.add(at(MM(new BG(.7,.06,.7),0xff7043),0,.05,0)); return g; },
    flowerbed(){ const g=new THREE.Group();
      g.add(at(MM(new BG(1.6,.3,1.6),0x6d4c2a),0,.15,0));
      [[-.4,-.4,0xe91e63],[.4,-.4,0xffeb3b],[-.4,.4,0xff7043],[.4,.4,0xab47bc]].forEach(([x,z,c])=>{
        g.add(at(MM(new SG(.22,6,5),c),x,.5,z)); }); return g; },
    // ── level-builder pieces ──
    car(){ const g=new THREE.Group(); const col=[0xe53935,0x1565c0,0xfdd835,0x43a047,0x37474f][Math.floor(Math.random()*5)];
      g.add(at(MM(new BG(1.8,.7,3.4),col),0,.6,0));
      g.add(at(MM(new BG(1.6,.7,1.8),col),0,1.15,-.2));
      g.add(at(MM(new BG(1.5,.5,1.6),0x263238),0,1.16,-.2));
      [[-.9,1.1],[.9,1.1],[-.9,-1.1],[.9,-1.1]].forEach(([wx,wz])=>{ const w=MM(new CG(.35,.35,.3,10),0x111);
        w.rotation.z=Math.PI/2; w.position.set(wx,.35,wz); g.add(w); }); return g; },
    concrete(){ return at(MM(new BG(3,.12,3),0x9e9e9e),0,.06,0); },
    road(){ const g=new THREE.Group();
      g.add(at(MM(new BG(4,.1,4),0x3a3d42),0,.05,0));
      for(let z=-1.2;z<=1.2;z+=1.2) g.add(at(MM(new BG(.3,.02,.7),0xffe082,false),0,.11,z)); return g; },
    crosswalk(){ const g=new THREE.Group();
      g.add(at(MM(new BG(4,.1,3),0x3a3d42),0,.05,0));
      for(let x=-1.4;x<=1.4;x+=.7) g.add(at(MM(new BG(.4,.02,2.4),0xffffff,false),x,.11,0)); return g; },
    hoop(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.12,.12,4,8),0xb0bec5),0,2,0));
      g.add(at(MM(new BG(1.8,1.2,.12),0xffffff),0,3.4,.6));
      const rim=MM(new THREE.TorusGeometry(.35,.05,8,16),0xff6f00); rim.rotation.x=Math.PI/2; rim.position.set(0,3.0,.95); g.add(rim); return g; },
    fence(){ const g=new THREE.Group();
      [-1.2,1.2].forEach(x=>g.add(at(MM(new BG(.16,1.2,.16),0x9e9e9e),x,.6,0)));
      [.95,.45].forEach(y=>g.add(at(MM(new BG(2.4,.1,.1),0xbdbdbd),0,y,0))); return g; },
    hedge(){ return at(MM(new BG(3,1,.9),0x2e7d32),0,.5,0); },
    gravestone(){ const g=new THREE.Group();
      g.add(at(MM(new BG(.8,1.0,.18),0x9e9e9e),0,.5,0));
      const cap=MM(new CG(.4,.4,.18,12),0x9e9e9e); cap.rotation.x=Math.PI/2; cap.position.y=1.0; g.add(cap); return g; },
    mailbox(){ const g=new THREE.Group();
      g.add(at(MM(new BG(.14,1.1,.14),0x5d4037),0,.55,0));
      g.add(at(MM(new BG(.4,.35,.6),0x1565c0),0,1.2,0)); return g; },
    hydrant(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.22,.26,.8,10),0xe53935),0,.4,0));
      g.add(at(MM(new SG(.24,8,6),0xc62828),0,.85,0));
      [-.28,.28].forEach(x=>g.add(at(MM(new CG(.08,.08,.18,8),0xc62828),x,.45,0))); return g; },
    trafficlight(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.12,.14,4,8),0x37474f),0,2,0));        // pole
      g.add(at(MM(new BG(.6,1.7,.5),0x263238),0,3.7,0));        // housing
      [[0xff1744,4.25],[0xffea00,3.65],[0x00e676,3.05]].forEach(([c,y])=>{
        g.add(at(MM(new SG(.18,10,8),c),0,y,.26)); });          // lamps
      return g; },
    musicstand(){ const g=new THREE.Group(); const m=0x23262b;
      [0,2.09,4.19].forEach(a=>{ const l=MM(new CG(.03,.03,.95,6),m);
        l.position.set(Math.sin(a)*.26,.32,Math.cos(a)*.26); l.rotation.set(Math.cos(a)*.32,0,-Math.sin(a)*.32); g.add(l); });
      g.add(at(MM(new CG(.035,.035,1.25,8),m),0,1.0,0));            // pole
      const desk=MM(new BG(.72,.52,.04),m); desk.position.set(0,1.55,.06); desk.rotation.x=-.35; g.add(desk);
      const ledge=MM(new BG(.72,.05,.11),m); ledge.position.set(0,1.32,.13); ledge.rotation.x=-.35; g.add(ledge);
      const sheet=MM(new BG(.52,.38,.01),0xfafafa); sheet.position.set(0,1.56,.09); sheet.rotation.x=-.35; g.add(sheet);
      return g; },
    easel(){ const g=new THREE.Group(); const wood=0x8d6e3a;
      [-.45,.45].forEach(x=>{ const l=MM(new CG(.05,.05,2.2,6),wood); l.position.set(x,1.05,.2); l.rotation.z=x>0?-.12:.12; g.add(l); });
      const bl=MM(new CG(.05,.05,2.3,6),wood); bl.position.set(0,1.1,-.45); bl.rotation.x=.28; g.add(bl);
      g.add(at(MM(new BG(1.2,.08,.18),wood),0,.95,.22));                 // tray ledge
      g.add(at(MM(new BG(1.1,1.3,.06),0xfafafa),0,1.65,.16));            // canvas
      g.add(at(MM(new BG(.86,1.0,.02),0x90caf9),0,1.65,.2));             // painting sky
      g.add(at(MM(new BG(.86,.3,.03),0x66bb6a),0,1.25,.21));             // grass
      g.add(at(MM(new SG(.12,8,6),0xffeb3b),.24,1.95,.22));              // sun
      return g; },
    goal(){ const g=new THREE.Group(); const W=3.8,H=2.1,D=1.4,t=.1,c=0xf5f5f5;
      [-W/2,W/2].forEach(x=>g.add(at(MM(new BG(t,H,t),c),x,H/2,0)));
      g.add(at(MM(new BG(W+t,t,t),c),0,H,0));
      [-W/2,W/2].forEach(x=>g.add(at(MM(new BG(t,t,D),c),x,t/2,-D/2)));
      [-W/2,W/2].forEach(x=>g.add(at(MM(new BG(t,H*.55,t),c),x,H*.275,-D)));
      g.add(at(MM(new BG(W+t,t,t),c),0,H*.55,-D));
      const netMat=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.16,side:THREE.DoubleSide});
      const back=new THREE.Mesh(new THREE.PlaneGeometry(W,H*.55),netMat); back.position.set(0,H*.275,-D); g.add(back);
      const roof=new THREE.Mesh(new THREE.PlaneGeometry(W,D*1.2),netMat); roof.rotation.x=-Math.PI/2.4; roof.position.set(0,H*.8,-D/2); g.add(roof);
      [-1,1].forEach(s=>{ const side=new THREE.Mesh(new THREE.PlaneGeometry(D,H*.55),netMat); side.rotation.y=Math.PI/2; side.position.set(s*W/2,H*.275,-D/2); g.add(side); });
      return g; },

    // ── indoor furniture (room-building set) ──
    bed(){ const g=new THREE.Group(); const frame=0x8d6e63;
      g.add(at(MM(new BG(2.0,.4,3.2),frame),0,.3,0));                   // base
      g.add(at(MM(new BG(2.0,.22,3.0),0xfff3e0),0,.6,0));               // mattress
      g.add(at(MM(new BG(2.0,.7,.2),frame),0,.85,-1.6));               // headboard
      g.add(at(MM(new BG(1.7,.12,1.9),0xf06292),0,.74,.2));             // blanket
      g.add(at(MM(new BG(1.5,.22,.5),0xffffff),0,.78,-1.2));           // pillow
      return g; },
    nightstand(){ const g=new THREE.Group(); const w=0x9e7b66;
      g.add(at(MM(new BG(.8,.7,.7),w),0,.5,0));
      g.add(at(MM(new BG(.7,.18,.6),0x7a5c49),0,.78,.02));             // top lip
      [-.3,.3].forEach(x=>[ .15,.15].forEach(()=>{}));
      g.add(at(MM(new BG(.5,.1,.05),0x4e342e),0,.45,.36)); return g; }, // drawer handle
    dresser(){ const g=new THREE.Group(); const w=0x9e7b66;
      g.add(at(MM(new BG(2.0,1.3,.8),w),0,.65,0));
      [.35,.75,1.05].forEach(y=>{ g.add(at(MM(new BG(1.8,.32,.04),0x86604c),0,y,.41));
        g.add(at(MM(new BG(.3,.06,.05),0x4e342e),0,y,.44)); }); return g; },
    desk(){ const g=new THREE.Group(); const w=0xbcaaa4;
      g.add(at(MM(new BG(2.4,.14,1.2),w),0,1.0,0));
      [[-1.05,-.5],[1.05,-.5],[-1.05,.5],[1.05,.5]].forEach(([x,z])=>g.add(at(MM(new BG(.12,1.0,.12),0xa1887f),x,.5,z)));
      return g; },
    chair(){ const g=new THREE.Group(); const w=0xa1887f;
      g.add(at(MM(new BG(.7,.12,.7),w),0,.7,0));                        // seat
      g.add(at(MM(new BG(.7,.8,.12),w),0,1.1,-.29));                    // back
      [[-.28,-.28],[.28,-.28],[-.28,.28],[.28,.28]].forEach(([x,z])=>g.add(at(MM(new BG(.1,.7,.1),0x795548),x,.35,z)));
      return g; },
    stool(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.35,.35,.12,12),0xf06292),0,.7,0));
      [0,2.09,4.19].forEach(a=>g.add(at(MM(new CG(.05,.05,.7,6),0x795548),Math.sin(a)*.25,.35,Math.cos(a)*.25)));
      return g; },
    bookshelf(){ const g=new THREE.Group(); const w=0x8d6e63;
      g.add(at(MM(new BG(1.8,3.0,.6),w),0,1.5,0));                      // body
      const cols=[0xe53935,0x1e88e5,0x43a047,0xfdd835,0xab47bc,0xff7043];
      [.6,1.4,2.2].forEach(y=>{ g.add(at(MM(new BG(1.7,.08,.55),0x6d4c41),0,y,0));
        for(let i=-3;i<=3;i++){ if(Math.random()<.25)continue;
          g.add(at(MM(new BG(.12,.5,.4),cols[(i+3)%cols.length]),i*.24,y+.32,.05)); } });
      return g; },
    shelf(){ const g=new THREE.Group(); const w=0x9e7b66;
      g.add(at(MM(new BG(1.8,.1,.5),w),0,.5,0));                        // board (raise with the Y gizmo to wall height)
      [-.85,.85].forEach(x=>g.add(at(MM(new BG(.1,.5,.5),0x7a5c49),x,.25,0)));   // end supports
      return g; },
    book(){ const cols=[0xe53935,0x1e88e5,0x43a047,0xfdd835,0xab47bc,0xff7043,0x26a69a];
      return at(MM(new BG(.14,.42,.3),cols[Math.floor(Math.random()*cols.length)]),0,.21,0); },   // one upright book
    books(){ const g=new THREE.Group(); const cols=[0xe53935,0x1e88e5,0x43a047,0xfdd835,0xab47bc,0xff7043,0x26a69a];
      let x=-.34; for(let i=0;i<5;i++){ const h=.34+Math.random()*.16;
        const b=MM(new BG(.12,h,.3),cols[i%cols.length]); b.position.set(x,h/2,0); b.rotation.z=(Math.random()-.5)*.12;
        g.add(b); x+=.15; } return g; },   // a row of books for a shelf
    rug(){ const g=new THREE.Group();
      g.add(at(MM(new BG(3.0,.04,2.2),0xab47bc,false),0,.02,0));
      g.add(at(MM(new BG(2.4,.05,1.6),0xce93d8,false),0,.03,0)); return g; },
    floorlamp(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.3,.3,.08,12),0x546e7a),0,.04,0));             // base
      g.add(at(MM(new CG(.05,.05,2.6,8),0x546e7a),0,1.3,0));            // pole
      const shade=MM(new CG(.45,.3,.6,12),0xfff3cf,false);
      shade.material=new THREE.MeshBasicMaterial({color:0xfff3cf}); shade.position.y=2.5; g.add(shade);
      const lp=new THREE.PointLight(0xffe2a8,.9,12,1.6); lp.position.y=2.4; lp.userData.noEdit=true; g.add(lp);
      return g; },
    poster(){ const g=new THREE.Group();
      g.add(at(MM(new BG(.08,1.6,1.2),0x4e342e),0,1.6,0));              // frame
      const cols=[0x29b6f6,0xffca28,0xa5d6a7,0xf06292];
      g.add(at(MM(new BG(.03,1.3,.9),cols[Math.floor(Math.random()*cols.length)]),.04,1.6,0));
      g.add(at(MM(new BG(.02,.6,.45),0xe040fb),.06,1.6,0)); return g; },
    wallposter(){ const g=new THREE.Group();   // frameless sheet, random colors (raise with Y gizmo to wall)
      const cols=[0xef5350,0x42a5f5,0x66bb6a,0xffca28,0xab47bc,0xff7043,0x26c6da,0xec407a,0x5c6bc0,0xffffff];
      const pick=()=>cols[Math.floor(Math.random()*cols.length)];
      g.add(at(MM(new BG(.03,1.5,1.05),pick()),0,1.6,0));              // sheet
      const disc=MM(new CG(.3,.3,.02,18),pick()); disc.rotation.z=Math.PI/2; disc.position.set(.035,1.9,.22); g.add(disc);
      g.add(at(MM(new BG(.02,.28,.85),pick()),.04,1.3,0));             // stripe
      g.add(at(MM(new BG(.02,.4,.4),pick()),.04,1.7,-.22)); return g; }, // block
    poster2(){ const g=new THREE.Group();   // bold stripes, random colors
      const cols=[0xef5350,0x42a5f5,0x66bb6a,0xffca28,0xab47bc,0xff7043,0x26c6da,0xec407a,0x5c6bc0];
      const pick=()=>cols[Math.floor(Math.random()*cols.length)];
      g.add(at(MM(new BG(.03,1.5,1.0),pick()),0,1.6,0));
      for(let i=-1;i<=1;i++) g.add(at(MM(new BG(.02,1.3,.24),pick()),.035,1.6,i*.32)); return g; },
    window(){ const g=new THREE.Group();
      g.add(at(MM(new BG(.14,3.0,3.0),0xd7ccc8),0,2.0,0));             // frame
      g.add(at(MM(new BG(.06,2.6,2.6),0x81d4fa),0,2.0,0));            // glass
      g.add(at(MM(new BG(.08,2.6,.08),0xd7ccc8),0,2.0,0));           // mullion V
      g.add(at(MM(new BG(.08,.08,2.6),0xd7ccc8),0,2.0,0)); return g; },// mullion H
    door(){ const g=new THREE.Group();
      g.add(at(MM(new BG(.16,3.2,1.6),0x8d6e63),0,1.6,0));            // frame
      g.add(at(MM(new BG(.1,2.9,1.3),0xa1887f),0,1.5,0));            // panel
      g.add(at(MM(new SG(.08,8,6),0xffd54f),.1,1.5,.5)); return g; },// knob
    plant(){ const g=new THREE.Group();
      g.add(at(MM(new CG(.3,.22,.5,10),0xbf6a3a),0,.25,0));            // pot
      g.add(at(MM(new SG(.5,7,6),0x388e3c),0,.85,0));
      g.add(at(MM(new SG(.35,7,6),0x43a047),.25,1.1,.1)); return g; },
    toychest(){ const g=new THREE.Group();
      g.add(at(MM(new BG(1.4,.7,.8),0xef6c00),0,.35,0));
      g.add(at(MM(new BG(1.42,.18,.82),0xf57c00),0,.78,0)); return g; },
    beanbag(){ const b=MM(new SG(.8,12,10),0x42a5f5); b.scale.set(1,.6,1); b.position.y=.5; return b; },
    clock(){ const g=new THREE.Group();
      const face=MM(new CG(.5,.5,.1,20),0xffffff); face.rotation.x=Math.PI/2; face.position.y=2.4; g.add(face);
      g.add(at(MM(new BG(.04,.3,.02),0x222),0,2.5,.06));
      g.add(at(MM(new BG(.22,.04,.02),0x222),.08,2.4,.06)); return g; },

    // ── generic shapes (scale + recolor them) ──
    box(){ return at(MM(new BG(1,1,1),0xb0bec5),0,.5,0); },
    ball(){ return at(MM(new SG(.6,16,12),0xb0bec5),0,.6,0); },
    cylinder(){ return at(MM(new CG(.5,.5,1,16),0xb0bec5),0,.5,0); },
    pyramid(){ return at(MM(new CO(.8,1.2,4),0xb0bec5),0,.6,0); },
    slab(){ return at(MM(new BG(2,.2,2),0xb0bec5),0,.1,0); },
    wall(){ return at(MM(new BG(3,1.6,.3),0xb0bec5),0,.8,0); },
  };
  const CAT_TYPES=Object.keys(CATALOG);

  // collider radius per type (editor keeps a hitbox glued to each placed object)
  const COL_R={ tree:.9, pine:1, bush:.7, barrel:.7, crate:.8, rock:.8, bench:1.2, lamp:.45, cone:.4, flowerbed:1.1, sign:.3,
    car:1.6, hoop:.4, gravestone:.5, mailbox:.3, hydrant:.35, hedge:1.0, easel:.5, musicstand:.3, trafficlight:.4,
    bed:1.4, nightstand:.45, dresser:1.0, desk:1.2, chair:.4, stool:.35, bookshelf:.95, shelf:.9, floorlamp:.35,
    poster:.4, window:1.4, door:.9, plant:.4, toychest:.8, beanbag:.6 };

  const PAINTS=[
    {id:'grass',col:0x6ab04c}, {id:'concrete',col:0x9e9e9e}, {id:'asphalt',col:0x3a3d42},
    {id:'parking',col:0x3a3d42,line:true}, {id:'dirt',col:0x8d6e4f}, {id:'sand',col:0xe6c98f},
    {id:'water',col:0x4f86c6}, {id:'brick',col:0xb05a3a}, {id:'path',col:0xd2c2a0},
    {id:'parquet',col:0xd7ccc8}, {id:'carpet',col:0xce93d8},
  ];
  const PAINT_BY=Object.fromEntries(PAINTS.map(p=>[p.id,p]));

  return { MM, at, makeSignTexture, CATALOG, CAT_TYPES, COL_R, PAINTS, PAINT_BY };
})();
