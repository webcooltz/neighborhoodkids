// Shared kid character model — single source of truth for the lobby and the
// minigame levels. Build a kid mesh with KidModel.buildKid(cfg); the returned
// THREE.Group exposes g.userData.parts (torso, head, hair, eyeL/R, lLP, rLP,
// lAP, rAP) so callers can drive their own walk / idle animation.
//
// Requires THREE to be loaded globally first.
window.KidModel = (function(){
  const CHARS = [
    {id:'dawson',   name:'Dawson',   emoji:'⚽', accent:'#4caf50', skin:0xffccaa, hair:0xc8961c, shirt:0x1565c0, pants:0x283593, shoe:0x1a1a1a},
    {id:'tj',       name:'TJ',       emoji:'🕷️', accent:'#cc1111', skin:0xffccaa, hair:0xcc1111, shirt:0xcc1111, pants:0x1a237e, shoe:0xcc1111},
    {id:'marshall', name:'Marshall', emoji:'🎻', accent:'#7b1fa2', skin:0xffcc80, hair:0x6d4c41, shirt:0x6a1b9a, pants:0x4a148c, shoe:0x263238},
    {id:'brady',    name:'Brady',    emoji:'🛹', accent:'#f57c00', skin:0xffccaa, hair:0xb89651, shirt:0xef6c00, pants:0x1565c0, shoe:0x212121},
    {id:'brooklynn',name:'Brooklynn',emoji:'🎨', accent:'#e91e63', skin:0xffe6cf, hair:0xe6a86b, shirt:0x80cbc4, pants:0x4db6ac, shoe:0xf06292},
    {id:'mackayla', name:'Mackayla', emoji:'🥋', accent:'#ab47bc', skin:0xffe0bd, hair:0x1a1a1a, shirt:0xf5f5f5, pants:0xf5f5f5, shoe:0x212121},
    {id:'wyatt',    name:'Wyatt',    emoji:'🎣', accent:'#1565c0', skin:0xffcc80, hair:0xe6c66b, shirt:0x1565c0, pants:0x26a69a, shoe:0x6d4c41},
    {id:'sawyer',   name:'Sawyer',   emoji:'🦄', accent:'#9c27b0', skin:0xffe0b2, hair:0xffd54f, shirt:0x9c27b0, pants:0x9c27b0, shoe:0xfff9c4},
    {id:'tyler',    name:'Tyler',    emoji:'🧟', accent:'#546e7a', skin:0xe8b48c, hair:0x3a2a1a, shirt:0x37474f, pants:0x263238, shoe:0x1a1a1a},
    {id:'stephanie',name:'Stephanie',emoji:'🚗', accent:'#fb8c00', skin:0xffd9b3, hair:0x6d4c41, shirt:0xfb8c00, pants:0x37474f, shoe:0x3e2723},
  ];
  const CHAR_BY_ID = Object.fromEntries(CHARS.map(c=>[c.id,c]));

  function MM(geo,col,shadow){
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:col}));
    if(shadow!==false){m.castShadow=true;m.receiveShadow=true;} return m;
  }

  function buildKid(cfg){
    const g=new THREE.Group(); const parts={};
    const body=new THREE.Group(); g.add(body); // kid body (raised when riding)
    const m=(geo,col,x,y,z)=>{ const me=MM(geo,col); me.position.set(x||0,y||0,z||0); return me; };
    const BG=THREE.BoxGeometry;
    parts.torso=m(new BG(.5,.72,.32),cfg.shirt,0,1.06,0); body.add(parts.torso);
    parts.head=m(new BG(.46,.48,.42),cfg.skin,0,1.72,0); body.add(parts.head);
    parts.hair=m(new BG(.5,.16,.46),cfg.hair,0,1.96,-.02); body.add(parts.hair);
    parts.eyeL=m(new BG(.09,.07,.03),0x222,-.1,1.74,.21); body.add(parts.eyeL);
    parts.eyeR=m(new BG(.09,.07,.03),0x222, .1,1.74,.21); body.add(parts.eyeR);
    parts.lLP=new THREE.Group(); parts.lLP.position.set(.13,.74,0);
    parts.lLP.add(m(new BG(.2,.74,.26),cfg.pants,0,-.37,0));
    parts.lLP.add(m(new BG(.2,.18,.3),cfg.shoe,0,-.8,.02)); body.add(parts.lLP);
    parts.rLP=new THREE.Group(); parts.rLP.position.set(-.13,.74,0);
    parts.rLP.add(m(new BG(.2,.74,.26),cfg.pants,0,-.37,0));
    parts.rLP.add(m(new BG(.2,.18,.3),cfg.shoe,0,-.8,.02)); body.add(parts.rLP);
    parts.lAP=new THREE.Group(); parts.lAP.position.set(.34,1.46,0);
    parts.lAP.add(m(new BG(.18,.66,.22),cfg.shirt,0,-.33,0));
    parts.lAP.add(m(new BG(.16,.18,.2),cfg.skin,0,-.7,0)); body.add(parts.lAP);
    parts.rAP=new THREE.Group(); parts.rAP.position.set(-.34,1.46,0);
    parts.rAP.add(m(new BG(.18,.66,.22),cfg.shirt,0,-.33,0));
    parts.rAP.add(m(new BG(.16,.18,.2),cfg.skin,0,-.7,0)); body.add(parts.rAP);
    customizeKid(cfg,parts,body,m,BG);
    g.userData.parts=parts; g.userData.body=body; g.userData.rideType='none';
    return g;
  }

  // Per-character signature details, ported from each kid's minigame model.
  function customizeKid(cfg,parts,body,m,BG){
    const add=(w,h,d,col,x,y,z)=>{ const me=m(new BG(w,h,d),col,x,y,z); body.add(me); return me; };
    const blueEyes=()=>{ parts.eyeL.material.color.setHex(0x1565c0); parts.eyeR.material.color.setHex(0x1565c0); };
    switch(cfg.id){
      case'dawson':        // soccer: blue eyes + white jersey stripe
        blueEyes();
        add(.52,.1,.34,0xffffff,0,1.18,0);
        break;
      case'tj':            // web shots: full red mask, white eyes, spider symbol
        parts.head.material=new THREE.MeshLambertMaterial({color:0xcc1111});
        parts.eyeL.visible=false; parts.eyeR.visible=false;
        add(.15,.11,.03,0xffffff,-.12,1.78,.22);
        add(.15,.11,.03,0xffffff, .12,1.78,.22);
        add(.2,.2,.03,0x111111,0,1.12,.17);
        break;
      case'marshall':{     // violin: tucked under chin
        blueEyes();
        const v=add(.16,.05,.38,0x6d3a1f,.3,1.5,.16); v.rotation.y=.2;
        const n=add(.02,.02,.38,0x111111,.3,1.54,.16); n.rotation.y=.2;  // strings
        break; }
      case'brady':{        // skateboard: orange helmet
        blueEyes(); parts.hair.visible=false;
        const helm=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),
          new THREE.MeshLambertMaterial({color:0xf57c00}));
        helm.scale.set(1,.8,1); helm.position.set(0,2.04,0); body.add(helm);
        add(.6,.07,.14,0xef6c00,0,1.92,.2);   // front rim
        break; }
      case'brooklynn':     // art: blue eyes + pink bun + ponytail
        blueEyes();
        add(.3,.24,.26,0xf06292,0,2.18,0);       // pink top bun
        add(.18,.5,.14,cfg.hair,0,1.7,-.28);     // ponytail down the back
        break;
      case'mackayla':{     // karate: black belt + purple collar + hair bun
        add(.54,.1,.34,0x212121,0,.82,0);
        add(.1,.1,.1,0x212121,0,.82,.17);
        const cL=add(.1,.46,.05,0x7b1fa2,-.12,1.0,.17); cL.rotation.z=.28;
        const cR=add(.1,.46,.05,0x7b1fa2, .12,1.0,.17); cR.rotation.z=-.28;
        const bun=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),
          new THREE.MeshLambertMaterial({color:0x1a1a1a}));
        bun.position.set(0,2.12,-.06); body.add(bun);
        break; }
      case'wyatt':         // fishing: blue eyes + hoodie pocket
        blueEyes();
        add(.22,.18,.05,0x0d47a1,0,.84,.17);
        break;
      case'sawyer':{       // magic: glasses + yellow hair + side buns
        parts.eyeL.visible=false; parts.eyeR.visible=false;
        [-.2,.2].forEach(bx=>{
          const bun=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),
            new THREE.MeshLambertMaterial({color:cfg.hair}));
          bun.position.set(bx,1.92,-.12); body.add(bun);
        });
        add(.16,.14,.02,0x3a3a3a,-.1,1.72,.215);
        add(.16,.14,.02,0x3a3a3a, .1,1.72,.215);
        add(.12,.1,.01,0xbbdefb,-.1,1.72,.225);
        add(.12,.1,.01,0xbbdefb, .1,1.72,.225);
        add(.05,.05,.01,0x222222,-.1,1.72,.232);
        add(.05,.05,.01,0x222222, .1,1.72,.232);
        add(.06,.025,.02,0x3a3a3a,0,1.74,.22);    // bridge
        add(.06,.02,.02,0x3a3a3a,-.19,1.74,.1);   // temples
        add(.06,.02,.02,0x3a3a3a, .19,1.74,.1);
        break; }
      case'tyler':{        // grown-up: beard + fringe + jacket hem, holds a water gun
        add(.48,.08,.06,cfg.hair,0,1.93,.2);     // fringe (hairline, above brows)
        add(.44,.16,.1,cfg.hair,0,1.56,.17);     // beard
        add(.54,.14,.34,0x2a363d,0,.86,0);       // jacket hem
        const gun=new THREE.Group(); gun.position.set(-.34,.8,.12); body.add(gun);
        gun.add(m(new BG(.1,.12,.34),0x2e7d32,0,0,.1));        // body
        gun.add(m(new BG(.07,.07,.22),0xff8f00,0,.01,.3));     // barrel
        const tank=MM(new THREE.CylinderGeometry(.07,.07,.2,8),0x4fc3f7);
        tank.rotation.x=Math.PI/2; tank.position.set(0,.09,0); gun.add(tank);   // water tank
        break; }
      case'stephanie':     // grown-up woman: brown ponytail + fringe
        add(.48,.08,.06,cfg.hair,0,1.93,.2);     // fringe (hairline, above brows)
        add(.18,.56,.16,cfg.hair,0,1.64,-.28);   // ponytail down the back
        add(.16,.16,.16,cfg.hair,0,1.96,-.24);   // hair tie/base
        break;
    }
  }

  return { CHARS, CHAR_BY_ID, MM, buildKid, customizeKid };
})();
