/* THE FIRST SPARK — Alpha 0.3 | Foresta Incantata
   Una dimostrazione WebGL reale: personaggi e ambiente sono costruiti da mesh
   tridimensionali morbide e illuminate, senza asset 3D esterni.
   Il solo motore Three.js si carica via CDN per mantenere leggero il pacchetto. */
const $ = s => document.querySelector(s);
const loading = $('#loading');
const hint = $('#load-note');
let THREE;
try {
  try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js'); }
  catch (_) { THREE = await import('https://unpkg.com/three@0.160.1/build/three.module.js'); }
  init();
} catch (err) {
  hint.textContent = 'Impossibile caricare il motore 3D. Verifica Internet e aggiorna la pagina. ' + String(err.message || err).slice(0,120);
  console.error(err);
}
function init(){
  const V=THREE.Vector3;
  const clock=new THREE.Clock();
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#b9dadd');
  scene.fog=new THREE.FogExp2('#b9dadd',.024);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.32;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('#game').appendChild(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,120);
  const cameraOffset=new V(11.2,14.8,13.5);
  const world=new THREE.Group();scene.add(world);
  scene.add(new THREE.HemisphereLight('#f5fff2','#68828b',2.05));
  const sun=new THREE.DirectionalLight('#fff2d5',2.65);
  sun.position.set(-10,19,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;
  sun.shadow.camera.near=1;sun.shadow.camera.far=46;sun.shadow.normalBias=.027;
  scene.add(sun);scene.add(sun.target);
  const ambient=new THREE.DirectionalLight('#e4faff',.65);ambient.position.set(8,7,-9);scene.add(ambient);
  const mat=(c,r=.9,more={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,...more});
  const m={
    grass:mat('#a7c791'),path:mat('#ddc194'),bark:mat('#94745b'),barkLight:mat('#b38b67'),
    leaf:mat('#5c9d75'),leafLight:mat('#8bc98a'),leafDark:mat('#467c6b'),leafGold:mat('#b3c882'),
    rock:mat('#a4b8b2'),rock2:mat('#8aadae'),cream:mat('#f9ead1'),white:mat('#fff8ee'),
    skin:mat('#f4c9a9',.87),skinShadow:mat('#e5a99a'),hair:mat('#463c37'),hairLight:mat('#615048'),
    navy:mat('#1c4d80'),blue:mat('#3279b0'),blueLight:mat('#4a91c2'),blueShade:mat('#244f82'),
    hat:mat('#295c91'),hatLight:mat('#4281af'),belt:mat('#563d34'),gold:mat('#e8bb6e',.46),
    boot:mat('#695447'),bootSole:mat('#4a3b36'),iris:mat('#4ba0c8',.3),irisDark:mat('#193b56',.35),
    blush:mat('#efaa9d'),bow:mat('#91633e'),bowLight:mat('#c79558'),string:mat('#efe6ce'),arrow:mat('#f9e7bb'),
    slime:mat('#6bd5bb',.33,{transparent:true,opacity:.91}),slimeTop:mat('#aeefca',.4,{transparent:true,opacity:.7}),
    slimeDark:mat('#4abfa5',.37),water:mat('#76b9bd',.24,{transparent:true,opacity:.85,metalness:.06}),
    flowers:mat('#ffd7c7'),flowerYellow:mat('#ffe1a1'),blueFlower:mat('#d6e7ff'),
    rune:mat('#a8f0df',.35,{emissive:'#50b9b0',emissiveIntensity:.62}),
    crystal:mat('#a8eaff',.19,{metalness:.18,emissive:'#348de7',emissiveIntensity:.85})
  };
  const sphere=new THREE.SphereGeometry(1,28,20);
  const sphereLow=new THREE.SphereGeometry(1,14,10);
  const cylinder=new THREE.CylinderGeometry(1,1,1,20);
  const disc=new THREE.CylinderGeometry(1,1,1,48);
  const cone=new THREE.ConeGeometry(1,1,24);
  function mesh(geo,material,parent,pos=[0,0,0],scale=[1,1,1],shadow=true){
    const o=new THREE.Mesh(geo,material);o.position.set(...pos);o.scale.set(...scale);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;
  }
  const ball=(parent,material,pos,scale,low=false,shadow=true)=>mesh(low?sphereLow:sphere,material,parent,pos,scale,shadow);
  function stick(parent,material,a,b,r1,r2=r1,radial=12){
    const A=new V(...a),B=new V(...b),D=B.clone().sub(A),len=D.length();
    const c=mesh(new THREE.CylinderGeometry(r2,r1,len,radial),material,parent,A.add(B).multiplyScalar(.5).toArray());
    c.quaternion.setFromUnitVectors(new V(0,1,0),D.normalize());return c;
  }
  function curveTube(parent,material,points,r=.04,steps=28){
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new V(...p))),steps,r,8,false),material,parent);
  }
  function circularShadow(parent,x,z,r,opacity=.14){
    const sm=new THREE.MeshBasicMaterial({color:'#285645',transparent:true,opacity,depthWrite:false});
    const s=mesh(new THREE.CircleGeometry(r,28),sm,parent,[x,.012,z],[1,.72,1],false);
    s.rotation.x=-Math.PI/2;return s;
  }
  // Texture erbosa naturale: evita il pavimento piatto e gli artefatti a triangoli.
  function grassTexture(){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle='#b4cda0';ctx.fillRect(0,0,256,256);
    for(let i=0;i<5300;i++){
      const xx=rand(i*1.37+11)*256, yy=rand(i*9.71+33)*256;
      ctx.fillStyle=['#b2d09f','#aac49c','#c3d6a9','#a0c294','#d0d9b4'][i%5];
      ctx.globalAlpha=.12+rand(i+70)*.28;ctx.beginPath();ctx.ellipse(xx,yy,1.1+rand(i*3)*2.5,.5+rand(i*7)*1.2,rand(i)*6.28,0,6.283);ctx.fill();
    }
    ctx.globalAlpha=1;const t=new THREE.CanvasTexture(c);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,8);t.colorSpace=THREE.SRGBColorSpace;
    t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
  }
  function rand(n){const v=Math.sin(n*128.237+12.4)*43758.5453;return v-Math.floor(v)}
  const ground=mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({map:grassTexture(),color:'#d5f2cb',roughness:1}),world,[0,-.085,0],[1,1,1],false);
  ground.rotation.x=-Math.PI/2;
  // Sentiero: UN'UNICA SUPERFICIE CURVA, non piu una fila di dischi sovrapposti.
  const pathPts=[[-22,-1],[-17,-1.1],[-13,-.4],[-9,.8],[-5,1.5],[-1,.5],[3,.35],[7,1.4],[12,1.1],[17,.1],[22,-.7]];
  const pathCurve=new THREE.CatmullRomCurve3(pathPts.map(p=>new V(p[0],0,p[1])),false,'catmullrom',.42);
  function pathSurface(){
    const p=[],col=[],ind=[],length=175,slices=8;
    const cg=new THREE.Color('#a9c897'),cm=new THREE.Color('#e3c99e'),ce=new THREE.Color('#cab18a');
    for(let i=0;i<=length;i++){
      const t=i/length,q=pathCurve.getPoint(t),dir=pathCurve.getTangent(t),n=new V(-dir.z,0,dir.x);
      const width=1.38+.24*Math.sin(t*14)+.14*Math.sin(t*41);
      for(let j=0;j<=slices;j++){
        const u=(j/slices-.5)*2,edge=Math.abs(u),w=u*width;
        p.push(q.x+n.x*w,.005-.015*edge,q.z+n.z*w);
        const c=edge>.75?cg.clone().lerp(ce,Math.max(0,(1-edge)/.25)*.53):cm.clone().lerp(ce,edge*.19);
        col.push(c.r,c.g,c.b);
        if(i<length&&j<slices){const a=i*(slices+1)+j,b=a+slices+1;ind.push(a,b,a+1,b,b+1,a+1)}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(ind);g.computeVertexNormals();
    mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),world,[0,0,0],[1,1,1],false);
  }
  pathSurface();
  // Laghetto laterale con sponda e morbidi riflessi.
  const pond=new THREE.Group();pond.position.set(-10,0,9);world.add(pond);
  function flatEllipse(parent,material,radx,radz,y){const s=mesh(new THREE.CircleGeometry(1,60),material,parent,[0,y,0],[radx,radz,1],false);s.rotation.x=-Math.PI/2;return s}
  flatEllipse(pond,mat('#d3c8ac'),3.8,2.5,.012);flatEllipse(pond,m.water,3.45,2.2,.025);
  const ripples=[];
  for(let i=0;i<4;i++){
    const ring=mesh(new THREE.RingGeometry(.18+i*.37,.205+i*.37,56),new THREE.MeshBasicMaterial({color:'#d1f5eb',transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false}),pond,[-.8,.03,.3],[1,.72,1],false);
    ring.rotation.x=-Math.PI/2;ripples.push(ring);
  }
  for(let i=0;i<5;i++){
    const x=(rand(i+17)-.5)*4,z=(rand(i+77)-.5)*2.8;
    const pad=flatEllipse(pond,mat('#7bad6d'),.34,.25,.05);pad.position.x=x;pad.position.z=z;
    if(i%2===0){ball(pond,m.flowerYellow,[x,.11,z],[.11,.08,.11],true,false)}
  }
  // Rocce levigate. Geometry con vertici irregolari ma normali calcolate e superficie liscia.
  function smoothRock(x,z,r,seed){
    const g=new THREE.SphereGeometry(1,20,14),a=g.attributes.position;
    for(let i=0;i<a.count;i++){
      const xx=a.getX(i),yy=a.getY(i),zz=a.getZ(i);
      const noise=1+.06*Math.sin(xx*7+seed)*Math.sin(zz*9+seed)+.035*Math.cos(yy*11+seed);
      a.setXYZ(i,xx*noise,yy*noise,zz*noise);
    }
    g.computeVertexNormals();return mesh(g,seed%2?m.rock:m.rock2,world,[x,.17*r,z],[r*1.25,r*.5,r*.95]);
  }
  // Alberi fiabeschi: tronco curvo, chiome tonde continue e sfumature naturali.
  const trees=[];
  function tree(x,z,s,seed){
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);trees.push(g);
    circularShadow(g,0,0,1.3,.15);
    curveTube(g,m.bark,[[0,.06,0],[.05,.56,0],[.1,1.22,.03],[.02,1.75,.05]],.18,17);
    stick(g,m.bark,[.07,1.1,0],[.6,1.92,.08],.09,.07);
    stick(g,m.bark,[0,1.42,0],[-.53,2.12,-.12],.09,.065);
    const colors=[m.leaf,m.leafLight,m.leafDark,m.leafGold,m.leaf];
    const lumps=[[-.56,2.2,.0,.88,.7,.73],[.55,2.26,-.07,.84,.82,.78],[0,2.63,-.05,1.02,.82,.86],[-.28,2.16,.61,.7,.6,.64],[.45,2.25,.53,.67,.59,.68],[.03,2.06,-.54,.85,.71,.73]];
    for(let j=0;j<lumps.length;j++){
      const [lx,ly,lz,sx,sy,sz]=lumps[j];
      ball(g,colors[(j+(seed|0))%colors.length],[lx,ly+(rand(seed+j)-.5)*.13,lz],[sx,sy,sz],false,false);
    }
    return g;
  }
  for(let i=0;i<57;i++){
    const x=(rand(i*7+6)-.5)*58,z=(rand(i*13+26)-.5)*54;
    const nearest=pathPts.reduce((min,_,n)=>{
      if(n===0)return min;
      const a=pathPts[n-1],b=pathPts[n],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))),d=Math.hypot(x-(a[0]+dx*t),z-(a[1]+dz*t));return Math.min(min,d);
    },99);
    if(nearest<2.8||Math.hypot(x+10,z-9)<5||Math.hypot(x+6,z-.7)<4.8||Math.hypot(x-8,z-2)<4.0)continue;
    tree(x,z,.81+rand(i+402)*.63,i);
  }
  // Presenze piccole e colorate nel sottobosco.
  function mushroom(x,z,s,color){
    stick(world,m.cream,[x,.07*s,z],[x,.39*s,z],.075*s,.062*s,10);
    const cap=ball(world,color,[x,.41*s,z],[.29*s,.17*s,.28*s],true,false);
    const collar=ball(world,m.white,[x,.35*s,z],[.22*s,.05*s,.22*s],true,false);return [cap,collar];
  }
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),m.flowerYellow,175);
  const grassStems=new THREE.InstancedMesh(new THREE.ConeGeometry(.04,.28,5),mat('#77b985'),420);
  const inst=new THREE.Object3D();
  for(let i=0;i<420;i++){
    const x=(rand(i*17+100)-.5)*48,z=(rand(i*31+114)-.5)*48;
    inst.position.set(x,.11,z);inst.rotation.set(0,rand(i)*Math.PI*2,(rand(i+48)-.5)*.42);const s=.63+rand(i*12)*1.4;
    inst.scale.set(s,s,s);inst.updateMatrix();grassStems.setMatrixAt(i,inst.matrix);
  }
  grassStems.castShadow=false;grassStems.receiveShadow=false;world.add(grassStems);
  for(let i=0;i<175;i++){
    const x=(rand(i*19+601)-.5)*40,z=(rand(i*33+809)-.5)*40;
    inst.position.set(x,.13,z);inst.rotation.set(0,0,0);const s=.06+rand(i)*.045;inst.scale.set(s,s*.55,s);inst.updateMatrix();petals.setMatrixAt(i,inst.matrix);
  }
  petals.castShadow=false;world.add(petals);
  for(let i=0;i<33;i++){
    const x=(rand(i*4+235)-.5)*43,z=(rand(i*8+335)-.5)*42;
    if(Math.hypot(x+6,z)<3||Math.hypot(x-9,z-2)<3)continue;
    smoothRock(x,z,.28+rand(i+91)*.65,i);
  }
  for(let i=0;i<19;i++){
    const x=(rand(i*8+123)-.5)*46,z=(rand(i*7+213)-.5)*39;
    mushroom(x,z,.6+rand(i)*.8,i%2?m.flowers:m.blueFlower);
  }
  // Piccolo altare del cristallo, sempre visibile oltre il sentiero.
  const altar=new THREE.Group();altar.position.set(9,.045,1.45);world.add(altar);
  circularShadow(altar,0,0,1.8,.16);
  mesh(new THREE.CylinderGeometry(1.53,1.62,.18,48),mat('#99aca2'),altar,[0,.075,0]);
  mesh(new THREE.CylinderGeometry(1.18,1.30,.24,48),mat('#c1c5ac'),altar,[0,.27,0]);
  mesh(new THREE.TorusGeometry(.98,.055,9,58),m.rune,altar,[0,.405,0]).rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){
    const t=i*Math.PI/4;ball(altar,m.rune,[Math.cos(t)*1.0,.405,Math.sin(t)*1],[.072,.08,.072],true,false);
  }
  const centerCrystal=new THREE.Group();centerCrystal.position.set(0,1.1,0);altar.add(centerCrystal);
  const crystalMesh=mesh(new THREE.OctahedronGeometry(.37,0),m.crystal,centerCrystal);
  const glow=new THREE.PointLight('#84efff',0,3.1);glow.position.set(0,.35,0);centerCrystal.add(glow);
  centerCrystal.visible=false;
  // Personaggio chibi fedele ai tratti dell'illustrazione originale.
  function starShape(outer=.20,inner=.095){
    const s=new THREE.Shape();for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,r=i%2?inner:outer;
      const x=Math.cos(a)*r,y=Math.sin(a)*r;
      if(i===0)s.moveTo(x,y);else s.lineTo(x,y);
    }s.closePath();return s;
  }
  function curvedHat(parent){
    // Cappello da mago piegato: superficie continua a 24 lati e 19 anelli.
    const rings=20,sides=28,positions=[],indices=[];
    for(let i=0;i<=rings;i++){
      const t=i/rings, y=1.95+t*1.07;
      const cx= -.54*t*t*t,cz=-.05*t;
      const rad=Math.max(.018,.46*Math.pow(1-t,.84));
      for(let j=0;j<=sides;j++){
        const a=j/sides*Math.PI*2;
        positions.push(cx+Math.cos(a)*rad,y,cz+Math.sin(a)*rad);
        if(i<rings&&j<sides){const p=i*(sides+1)+j,q=p+sides+1;indices.push(p,q,p+1,q,q+1,p+1)}
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    mesh(geo,m.hat,parent);
    // Ala del cappello: larga, morbida, senza piramidi.
    mesh(new THREE.CylinderGeometry(.71,.68,.083,50),m.hatLight,parent,[0,1.97,0],[1,1,.91]);
    mesh(new THREE.CylinderGeometry(.47,.47,.10,38),m.belt,parent,[0,2.052,0],[1,1,.93]);
    const buckle=mesh(new THREE.TorusGeometry(.113,.025,7,18),m.gold,parent,[.08,2.06,.466],[1.05,.82,1]);
    buckle.rotation.z=.10;
    const star=mesh(new THREE.ExtrudeGeometry(starShape(.19,.09),{depth:.032,bevelEnabled:true,bevelThickness:.012,bevelSize:.01,bevelSegments:2}),m.cream,parent,[-.12,2.51,.19],[1,1,1],false);
    star.rotation.y=-.13;
  }
  function heroModel(){
    const root=new THREE.Group();world.add(root);
    const motion=new THREE.Group();root.add(motion);
    circularShadow(motion,0,0,.68,.24);
    // Piedi e stivali con punte tonde.
    const legs=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.x=.19*side;motion.add(leg);legs.push(leg);
      ball(leg,m.blueShade,[0,.32,0],[.18,.27,.2]);
      ball(leg,m.boot,[0,.135,.09],[.2,.15,.3]);
      ball(leg,m.bootSole,[0,.065,.14],[.21,.07,.3]);
    }
    // Mantello a forma di goccia e tunica sagomata con cintura.
    ball(motion,m.navy,[0,.74,-.21],[.53,.74,.36]);
    const profile=[new THREE.Vector2(0,.24),new THREE.Vector2(.29,.25),new THREE.Vector2(.49,.31),new THREE.Vector2(.51,.43),new THREE.Vector2(.43,.75),new THREE.Vector2(.38,1.03),new THREE.Vector2(.30,1.30),new THREE.Vector2(0,1.34)];
    const robe=mesh(new THREE.LatheGeometry(profile,42),m.blue,motion);
    robe.receiveShadow=true;
    ball(motion,m.blueShade,[0,.62,.31],[.36,.57,.13]);
    // Bordi decorativi dorati sul davanti della tunica.
    curveTube(motion,m.gold,[[-.35,.28,.20],[-.30,.38,.34],[-.22,.61,.39],[-.19,.84,.37]],.018,16);
    curveTube(motion,m.gold,[[.35,.28,.20],[.30,.38,.34],[.22,.61,.39],[.19,.84,.37]],.018,16);
    mesh(new THREE.CylinderGeometry(.393,.41,.145,44),m.belt,motion,[0,.82,0]);
    const buckle=mesh(new THREE.TorusGeometry(.113,.032,8,22),m.gold,motion,[0,.82,.39],[1.2,.78,1]);
    const center=ball(motion,m.belt,[0,.82,.405],[.065,.058,.025],true);
    // Testa grande, capelli e volto chibi leggibile da lontano.
    ball(motion,m.hair,[0,1.592,-.055],[.48,.48,.44]);
    ball(motion,m.skin,[0,1.545,.045],[.442,.421,.395]);
    for(const side of [-1,1]){
      ball(motion,m.skinShadow,[side*.428,1.51,.044],[.105,.155,.11]);
      ball(motion,m.skin,[side*.445,1.53,.082],[.083,.111,.072]);
      ball(motion,m.blush,[side*.285,1.44,.370],[.10,.042,.013],true,false);
      // Occhio bianco, iride azzurra e pupilla con luce.
      ball(motion,m.white,[side*.183,1.58,.397],[.131,.169,.061]);
      ball(motion,m.iris,[side*.183,1.568,.458],[.085,.123,.025]);
      ball(motion,m.irisDark,[side*.183,1.564,.475],[.044,.080,.014]);
      ball(motion,m.white,[side*.205-.022,1.616,.49],[.028,.038,.01],true,false);
      // Sopracciglio scuro inclinato.
      const brow=ball(motion,m.hair,[side*.18,1.784,.414],[.125,.029,.036],true,false);
      brow.rotation.z=side*.12;
    }
    ball(motion,m.skin,[0,1.46,.452],[.052,.043,.038],true,false);
    curveTube(motion,m.hair,[[-.06,1.372,.419],[0,1.364,.43],[.06,1.372,.419]],.015,8);
    // Ciocche morbide sopra la fronte e ai lati.
    for(let i=-2;i<=2;i++){
      const b=ball(motion,i%2?m.hairLight:m.hair,[i*.148,1.858,-.02+Math.cos(i)*.18],[.147,.16,.23]);
      b.rotation.z=i*.13;
    }
    for(const side of [-1,1])ball(motion,m.hair,[side*.403,1.61,.0],[.125,.29,.27]);
    curvedHat(motion);
    // Maniche mobili con polsi e mani, accompagnano lo scocco.
    const arms=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.35,1.18,.03);motion.add(arm);
      const sleeve=ball(arm,m.blue,[side*.16,-.12,.03],[.24,.36,.26]);sleeve.rotation.z=side*.30;
      ball(arm,m.gold,[side*.25,-.35,.06],[.19,.035,.18],true,false);
      ball(arm,m.skin,[side*.25,-.425,.10],[.15,.15,.15]);arms.push(arm);
    }
    const bow=new THREE.Group();bow.position.set(.64,.90,.38);motion.add(bow);
    curveTube(bow,m.bow,[[0,-.65,0],[.23,-.48,-.02],[.37,-.22,-.04],[.39,0,-.04],[.37,.22,-.04],[.23,.48,-.02],[0,.65,0]],.05,34);
    curveTube(bow,m.bowLight,[[.02,-.64,.015],[.23,-.47,-.005],[.39,-.2,-.015],[.4,0,-.02],[.39,.2,-.015],[.23,.47,-.005],[.02,.64,.015]],.014,28);
    stick(bow,m.string,[0,-.65,.006],[0,.65,.006],.011,.011,7);
    for(const y of [-.39,.39])ball(bow,m.gold,[.29,y,0],[.07,.085,.075],true,false);
    return {root,motion,arms,legs,bow};
  }
  const hero=heroModel();hero.root.position.set(-6,0,.55);
  const facing=new V(0,0,1);
  // Slime morbidi e animati, non piramidi né cristalli sfaccettati.
  function slime(x,z,seed){
    const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
    circularShadow(g,0,0,.65,.2);
    const body=new THREE.Group();g.add(body);
    ball(body,m.slimeDark,[0,.23,0],[.58,.25,.52]);
    ball(body,m.slime,[0,.46,0],[.60,.50,.55]);
    ball(body,m.slimeTop,[-.19,.70,.20],[.23,.13,.19],true,false);
    for(const s of [-1,1]){
      ball(body,m.white,[s*.215,.48,.472],[.14,.17,.080]);
      ball(body,m.irisDark,[s*.215,.483,.542],[.071,.108,.034]);
      ball(body,m.white,[s*.240,.540,.567],[.027,.036,.009],true,false);
      ball(body,m.blush,[s*.38,.36,.390],[.096,.051,.020],true,false);
    }
    curveTube(body,m.slimeDark,[[-.10,.321,.526],[0,.29,.55],[.10,.321,.526]],.016,10);
    const life=new THREE.Group();life.position.set(0,1.20,0);g.add(life);
    const plate=mesh(new THREE.PlaneGeometry(.74,.09),new THREE.MeshBasicMaterial({color:'#253c40',transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}),life);plate.rotation.y=Math.PI/4;
    const fill=mesh(new THREE.PlaneGeometry(.70,.056),new THREE.MeshBasicMaterial({color:'#f6c785',side:THREE.DoubleSide}),life,[0,0,.003]);fill.rotation.y=Math.PI/4;
    life.visible=false;
    g.userData={hp:3,maxHp:3,speed:.62+rand(seed)*.27,phase:rand(seed+9)*6,attack:0,flash:0,body,fill,life,seed};return g;
  }
  const enemies=[];
  const origins=[[-.6,2.5],[2.8,-2.5],[5.0,3.8],[11.7,-2.1],[14.2,3.3]];
  origins.forEach((p,i)=>enemies.push(slime(p[0],p[1],i)));
  let state='menu',health=100,coins=0,kills=0,cooldown=0,elapsed=0,attackSwing=0,toastTime=0,shake=0,winTimer=-1;
  const arrows=[],sparks=[];
  const move={x:0,y:0};const keys=new Set();let joyPointer=null;
  let popupTimer=0;
  function toast(t,sec=2){$('#toast').textContent=t;toastTime=sec}
  function updateHud(){
    $('#hpbar').style.width=health+'%';$('#hptext').textContent=health+' / 100 HP';
    $('#coins').textContent='✦ '+coins+' monete';$('#kills').textContent='Slime '+kills+' / 5';
  }
  function showDialog(title,detail,button='CONTINUA'){
    $('#dialog').classList.add('visible');$('#dialog-text').innerHTML=detail;
    $('.dialog-card h1').textContent=title;$('#start').innerHTML=button+' <span>➜</span>';
  }
  function start(){
    if(state==='won')reset();
    state='playing';$('#dialog').classList.remove('visible');toast('Segui il sentiero e scopri la foresta!',3);
  }
  function reset(){
    for(const e of enemies)world.remove(e);enemies.length=0;
    origins.forEach((p,i)=>enemies.push(slime(p[0],p[1],i)));
    for(const a of arrows)world.remove(a.mesh);arrows.length=0;
    for(const a of sparks)world.remove(a.mesh);sparks.length=0;
    hero.root.position.set(-6,0,.55);health=100;coins=0;kills=0;centerCrystal.visible=false;winTimer=-1;cooldown=0;updateHud();
  }
  $('#start').addEventListener('click',start);
  $('#pause').addEventListener('click',()=>{
    if(state!=='playing')return;state='paused';showDialog('PAUSA','La Foresta Incantata ti aspetta. Riprendi l’avventura quando vuoi.','RIPRENDI');
  });
  function nearestEnemy(){
    let best=null,dmin=9.0;for(const e of enemies){const d=e.position.distanceTo(hero.root.position);if(d<dmin){best=e;dmin=d}}
    return best;
  }
  function shoot(){
    if(state!=='playing'||cooldown>0)return;
    cooldown=.49;attackSwing=1;
    const target=nearestEnemy();const start=hero.root.position.clone().add(new V(.04,1.1,0));
    const aim=target?target.position.clone().add(new V(0,.53,0)):start.clone().addScaledVector(facing,12);
    const dir=aim.clone().sub(start).normalize();if(target)facing.copy(dir).setY(0).normalize();
    const g=new THREE.Group();g.position.copy(start);world.add(g);
    stick(g,m.bow,[0,-.34,0],[0,.34,0],.028,.027,8);
    mesh(new THREE.ConeGeometry(.09,.22,12),mat('#c8dfdd',.42),g,[0,.42,0]);
    for(let s of [-1,1]){const feather=ball(g,m.white,[s*.07,-.26,0],[.045,.12,.024],true,false);feather.rotation.z=s*.22}
    g.quaternion.setFromUnitVectors(new V(0,1,0),dir);
    arrows.push({mesh:g,dir,target,life:1.5});
    if(navigator.vibrate)navigator.vibrate(9);
  }
  $('#fire').addEventListener('pointerdown',e=>{e.preventDefault();shoot()});
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();keys.add(k);
    if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
    if(k===' '&&!e.repeat)shoot();
    if(k==='escape'&&state==='playing')$('#pause').click();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();move.x=move.y=0;resetStick()});
  const joy=$('#joy'),nub=$('#joy-center');
  function resetStick(){move.x=move.y=0;nub.style.transform='translate(0,0)';joyPointer=null}
  function applyStick(e){
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;
    const limit=r.width*.35,len=Math.hypot(dx,dy);
    if(len>limit){dx=dx/len*limit;dy=dy/len*limit}
    move.x=dx/limit;move.y=dy/limit;
    nub.style.transform=`translate(${dx}px,${dy}px)`;
  }
  joy.addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);applyStick(e)});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)applyStick(e)});
  joy.addEventListener('pointerup',e=>{if(e.pointerId===joyPointer)resetStick()});
  joy.addEventListener('pointercancel',resetStick);
  // Colpo, particelle ed esperienza visiva.
  function sparkAt(pos,color='#fff3b8',count=8){
    for(let i=0;i<count;i++){
      const o=ball(world,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.86}),pos.toArray(),[.06,.06,.06],true,false);
      const a=i/count*Math.PI*2,dir=new V(Math.cos(a)*(1.4+rand(i)*.9),1.4+rand(i+36)*1.3,Math.sin(a)*(1.4+rand(i+5)));
      sparks.push({mesh:o,velocity:dir,life:.40+rand(i)*.20,full:.6});
    }
  }
  function defeated(e){
    const pos=e.position.clone().add(new V(0,.50,0));sparkAt(pos,'#b7fff0',12);
    world.remove(e);const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);
    coins+=20;kills++;updateHud();toast('✦ +20 MONETE · SLIME SCONFITTO!',1.4);
    if(kills>=5){winTimer=1.8;centerCrystal.visible=true;sparkAt(altar.position.clone().add(new V(0,1.5,0)),'#a7eaff',22);toast('IL CRISTALLO DELLA FORESTA SI È RISVEGLIATO!',2.7)}
  }
  function hurt(e){
    e.userData.hp--;e.userData.flash=.16;e.userData.life.visible=true;
    e.userData.fill.scale.x=Math.max(.01,e.userData.hp/e.userData.maxHp);
    sparkAt(e.position.clone().add(new V(0,.52,0)),'#eaffd3',5);
    if(e.userData.hp<=0)defeated(e);
  }
  function takeDamage(amount){
    health=Math.max(0,health-amount);updateHud();shake=.25;
    if(navigator.vibrate)navigator.vibrate(24);
    if(health===0){health=100;hero.root.position.set(-6,0,.55);updateHud();toast('Sei tornato all’inizio della foresta!',2.8)}
  }
  function resize(){
    const w=window.innerWidth,h=window.innerHeight;
    renderer.setSize(w,h,false);
    // Area visibile costante in altezza per far risaltare davvero il personaggio 3D.
    const span=h<450?7.5:8.0;
    camera.top=span;camera.bottom=-span;camera.right=span*w/h;camera.left=-camera.right;camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',resize);resize();
  const camLook=new V();
  const zero=new V();
  function tick(){
    requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.045);elapsed+=dt;
    // L'ambiente è vivo anche quando è aperto il menu.
    for(const [i,treeObj] of trees.entries())treeObj.rotation.z=Math.sin(elapsed*.5+i*.9)*.005;
    for(const [i,r] of ripples.entries()){r.material.opacity=.11+.06*Math.sin(elapsed*2+i);}
    if(centerCrystal.visible){centerCrystal.rotation.y=elapsed*.8;centerCrystal.position.y=1.1+Math.sin(elapsed*2.2)*.15;glow.intensity=1.4+Math.sin(elapsed*3)*.45;}
    if(state==='playing'){
      const x=move.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
      const y=move.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      const dist=Math.hypot(x,y);
      const strength=Math.min(1,dist);
      if(dist>.08){
        const mx=x/dist,my=y/dist;
        // Asse del joystick allineato alla telecamera isometrica.
        const vx=(mx+my)*Math.SQRT1_2,vz=(my-mx)*Math.SQRT1_2;
        hero.root.position.x=THREE.MathUtils.clamp(hero.root.position.x+vx*4.15*dt*strength,-23,23);
        hero.root.position.z=THREE.MathUtils.clamp(hero.root.position.z+vz*4.15*dt*strength,-22,22);
        facing.set(vx,0,vz);hero.motion.position.y=.045+Math.sin(elapsed*13)*.04;
        hero.legs[0].rotation.x=Math.sin(elapsed*12)*.20;
        hero.legs[1].rotation.x=-hero.legs[0].rotation.x;
        hero.arms[0].rotation.x=Math.sin(elapsed*12)*.07;
      }else{
        hero.motion.position.y=THREE.MathUtils.lerp(hero.motion.position.y,Math.sin(elapsed*2.5)*.021,dt*8);
        for(const leg of hero.legs)leg.rotation.x*=.8;
        hero.arms[0].rotation.x*=.82;
      }
      cooldown=Math.max(0,cooldown-dt);
      attackSwing=Math.max(0,attackSwing-dt*3.3);
      hero.arms[1].rotation.z=-.25*attackSwing;
      hero.bow.rotation.z=-.35*attackSwing;
      hero.motion.rotation.z=-.065*attackSwing;
      hero.root.rotation.y=THREE.MathUtils.lerp(hero.root.rotation.y,Math.atan2(facing.x,facing.z),Math.min(1,dt*10));
      for(const e of enemies){
        const data=e.userData;
        const dx=hero.root.position.x-e.position.x,dz=hero.root.position.z-e.position.z,d=Math.hypot(dx,dz);
        if(d<8.5&&d>1.03){e.position.x+=dx/d*data.speed*dt;e.position.z+=dz/d*data.speed*dt}
        if(d<1.03){data.attack-=dt;if(data.attack<=0){takeDamage(9);data.attack=1.28}}
        const b=data.body;
        b.scale.y=1+.055*Math.sin(elapsed*6+data.phase);
        b.scale.x=1-.036*Math.sin(elapsed*6+data.phase);
        b.position.y=Math.max(0,Math.sin(elapsed*3+data.phase)*.035);
        b.rotation.y=Math.atan2(dx,dz);
        if(data.flash>0){data.flash-=dt;b.scale.multiplyScalar(1.006)}
        data.life.quaternion.copy(camera.quaternion);
      }
      for(let i=arrows.length-1;i>=0;i--){
        const a=arrows[i];
        if(a.target&&enemies.includes(a.target)){
          const goal=a.target.position.clone().add(new V(0,.52,0));
          const wanted=goal.sub(a.mesh.position).normalize();
          a.dir.lerp(wanted,Math.min(1,dt*5)).normalize();
        }
        a.mesh.position.addScaledVector(a.dir,dt*12.3);
        a.mesh.quaternion.setFromUnitVectors(new V(0,1,0),a.dir);
        a.life-=dt;
        let hitOne=false;
        for(const e of [...enemies]){
          const h=e.position.clone().add(new V(0,.53,0));
          if(a.mesh.position.distanceTo(h)<.62){hurt(e);hitOne=true;break}
        }
        if(hitOne||a.life<0){world.remove(a.mesh);arrows.splice(i,1)}
      }
      if(winTimer>=0){winTimer-=dt;if(winTimer<0){state='won';showDialog('CRISTALLO RISVEGLIATO!','Hai sconfitto i cinque slime e ottenuto <b>'+coins+' monete</b>.<br>Questa è una prova di stile 3D chibi: il viaggio nelle dieci isole continua nelle prossime versioni.','GIOCA DI NUOVO')}}
      if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').textContent=''}
    }else{
      hero.motion.position.y=Math.sin(elapsed*2.0)*.026;
      for(const e of enemies){e.userData.body.scale.y=1+.044*Math.sin(elapsed*4+e.userData.phase)}
    }
    for(let i=sparks.length-1;i>=0;i--){
      const p=sparks[i];p.life-=dt;p.mesh.position.addScaledVector(p.velocity,dt);
      p.velocity.y-=dt*6.0;
      p.mesh.scale.multiplyScalar(1-dt*1.8);
      if(p.life<0){world.remove(p.mesh);p.mesh.material.dispose();sparks.splice(i,1)}
    }
    // Inquadratura fissa isometrica che segue dolcemente il personaggio.
    const target=hero.root.position.clone().add(new V(0,.8,0));
    const desired=target.clone().add(cameraOffset);
    camera.position.lerp(desired,Math.min(1,dt*5.0));
    camLook.lerp(target,Math.min(1,dt*6));camera.lookAt(camLook);
    if(shake>0){shake-=dt;camera.position.x+=(rand(elapsed*246)-.5)*shake*.12}
    renderer.render(scene,camera);
  }
  camera.position.copy(hero.root.position).add(cameraOffset);
  camLook.copy(hero.root.position).add(new V(0,.8,0));camera.lookAt(camLook);
  updateHud();tick();loading.classList.add('hide');
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=0331').catch(()=>{});
}
