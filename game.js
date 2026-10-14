/* THE FIRST SPARK — Alpha 0.7 | Foresta Incantata
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.32;
  renderer.shadowMap.enabled=!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches);
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  $('#game').appendChild(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,120);
  const cameraOffset=new V(11.2,14.8,13.5);
  const world=new THREE.Group();scene.add(world);
  scene.add(new THREE.HemisphereLight('#f5fff2','#68828b',2.05));
  const sun=new THREE.DirectionalLight('#fff2d5',2.65);
  sun.position.set(-10,19,8);sun.castShadow=true;sun.shadow.mapSize.set(768,768);
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
  // Protagonista Meshy: corpo statico GLB, animazioni scheletriche in una fase successiva.
  function heroModel(){
    const root=new THREE.Group();world.add(root);
    const motion=new THREE.Group();root.add(motion);
    circularShadow(root,0,0,.68,.24);
    const arms=[new THREE.Group(),new THREE.Group()];
    const legs=[new THREE.Group(),new THREE.Group()];
    const bow=new THREE.Group();motion.add(bow);
    // L'arco resta un accessorio indipendente, visibile anche senza rigging.
    bow.position.set(.52,1.02,.25);
    curveTube(bow,m.bow,[[0,-.43,0],[.18,-.26,0],[.24,0,0],[.18,.26,0],[0,.43,0]],.035,24);
    stick(bow,m.string,[0,-.43,0],[0,.43,0],.008,.008,5);
    return {root,motion,arms,legs,bow};
  }
  const hero=heroModel();hero.root.position.set(-6,0,.55);
  // Alpha 0.7: il mondo non diventa giocabile finché il protagonista e i
  // nemici iniziali non sono pronti. Gli asset decorativi arrivano dopo.
  let enemyLoader=null;
  let criticalAssetsReady=false;
  async function loadHeroModel(loader){
    const gltf=await new Promise((resolve,reject)=>loader.load('./mago-colorato.glb',resolve,undefined,reject));
    const model=gltf.scene;
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new V());
    const center=bounds.getCenter(new V());
    if(!size.y||!Number.isFinite(size.y))throw Error('Dimensioni GLB del mago non valide');
    const scale=2.72/size.y;
    model.scale.setScalar(scale);
    model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    hero.motion.add(model);
    // Forza l'inizializzazione delle risorse grafiche prima di mostrare il menu.
    renderer.compile(scene,camera);
    console.info('Mago ottimizzato pronto');
  }
  async function initializeModels(){
    try{
      hint.textContent='Preparazione del motore 3D…';
      let module;
      try{module=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js');}
      catch(_){module=await import('https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js');}
      const loader=new module.GLTFLoader();enemyLoader=loader;
      hint.textContent='Caricamento del mago…';
      await loadHeroModel(loader);
      hint.textContent='Preparazione di Goblin e Slime…';
      const ready=await Promise.allSettled([loadEnemyModel('slime'),loadEnemyModel('goblin')]);
      const failures=ready.filter(r=>r.status==='rejected');
      if(failures.length)console.warn('Alcuni nemici usano il modello provvisorio',failures);
      criticalAssetsReady=true;
      hint.textContent='Personaggi pronti!';
      await new Promise(resolve=>requestAnimationFrame(resolve));
      loading.classList.add('hide');
      // Prima il boss, poi gli oggetti di scena: non rallentano l'avvio.
      loadEnemyModel('boss').catch(e=>console.warn('Boss GLB non disponibile:',e))
        .then(()=>loadDecorAssets(loader));
    }catch(error){
      console.error('Errore caricamento risorse fondamentali',error);
      hint.textContent='Non riesco a caricare il mago. Controlla la connessione e aggiorna la pagina. '+String(error.message||error).slice(0,100);
      hint.style.color='#ffe2a5';
    }
  }
  // Alpha 0.6: gli oggetti ambientali Meshy sono caricati in sequenza per
  // limitare i picchi di memoria su iPhone. Tutti i GLB restano senza rigging.
  const modelSources={
    bow:'./assets/bow.glb',dagger:'./assets/dagger.glb',mace:'./assets/mace.glb',
    boat:'./assets/boat.glb',pine:'./assets/pine.glb',palm:'./assets/palm.glb',
    tree:'./assets/tree.glb',rock_big:'./assets/rock_big.glb',
    rock_mid:'./assets/rock_mid.glb',bridge:'./assets/bridge.glb'
  };
  const environmentSlots=[
    ['pine',[-18,0,-10],5.0,0.2],['pine',[17,0,10],5.5,1.4],
    ['palm',[-16,0,13],4.4,.6],['palm',[19,0,-12],4.8,2.2],
    ['tree',[-13,0,-15],5.4,0],['tree',[16,0,17],5.1,2.6],
    ['rock_big',[-5,0,7],1.7,.3],['rock_big',[16,0,-5],2.1,1.1],
    ['rock_mid',[-7,0,-8],1.1,.4],['rock_mid',[12,0,9],1.3,2.5],
    ['bridge',[-10,0,5.5],3.7,.25],['boat',[-11,0,10.0],2.8,1.4]
  ];
  function normalizeModel(source,targetHeight){
    const box=new THREE.Box3().setFromObject(source),size=box.getSize(new V());
    if(!Number.isFinite(size.y)||size.y<.00001)throw Error('Dimensioni GLB non valide');
    const scale=targetHeight/size.y;
    source.scale.setScalar(scale);
    source.position.set(-box.getCenter(new V()).x*scale,-box.min.y*scale,-box.getCenter(new V()).z*scale);
    source.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    return source;
  }
  async function loadOneAsset(loader,key){
    try{
      const gltf=await new Promise((resolve,reject)=>loader.load(modelSources[key],resolve,undefined,reject));
      const scene=gltf.scene;
      if(key==='bow'){
        normalizeModel(scene,1.06);hero.bow.children.forEach(child=>{if(child!==bowGem)child.visible=false;});
        hero.bow.add(scene);
      }else if(key==='dagger'||key==='mace'){
        const height=key==='dagger'?.67:1.5;
        normalizeModel(scene,height);
        if(key==='dagger'){
          weaponAssets.dagger=scene;
          for(const e of enemies)if(e.userData.kind==='goblin')attachDagger(e);
        }else{
          // Il Boss Meshy originale contiene gia una mazza: quella separata
          // viene esposta nell'accampamento, evitando armi doppie sul Boss.
          const display=new THREE.Group();display.position.set(8.5,0,-4.5);
          scene.rotation.z=-.24;display.add(scene);world.add(display);
          weaponAssets.mace=scene;
        }
      }else{
        const heights={pine:5,palm:4.5,tree:4.7,rock_big:1.45,rock_mid:.82,bridge:1.5,boat:1.45};
        normalizeModel(scene,heights[key]);
        for(const [name,pos,height,rotation] of environmentSlots){
          if(name!==key)continue;
          const instance=scene.clone(true),holder=new THREE.Group();
          holder.position.set(...pos);holder.rotation.y=rotation;holder.add(instance);
          world.add(holder);
        }
      }
      loadedAssets.add(key);updateAssetStatus();
    }catch(err){console.warn('Asset facoltativo non caricato:',key,err);failedAssets.add(key);updateAssetStatus();}
  }
  const loadedAssets=new Set(),failedAssets=new Set(),weaponAssets={};
  function updateAssetStatus(){
    const el=$('#asset-status');if(el)el.textContent=`Modelli aggiuntivi: ${loadedAssets.size}/${Object.keys(modelSources).length}`+(failedAssets.size?` · ${failedAssets.size} non caricati`:'');
  }
  function attachDagger(e){
    if(e.userData.daggerAttached||!weaponAssets.dagger)return;
    const copy=weaponAssets.dagger.clone(true);
    // Posizione indicativa: il Goblin non e ancora riggato.
    copy.position.x+=.60;copy.position.y+=.63;copy.position.z+=.15;
    copy.rotation.z=-.65;e.userData.body.add(copy);e.userData.daggerAttached=true;
  }
  async function loadDecorAssets(loader){
    for(const key of Object.keys(modelSources))await loadOneAsset(loader,key);
  }
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
  // Nemici Meshy: manteniamo il corpo provvisorio come fallback fino al caricamento GLB.
  const enemyAssets={};
  async function loadEnemyModel(type){
    if(!enemyLoader)throw Error('Caricatore non pronto');
    const paths={slime:'./slime-verde.glb',goblin:'./goblin-ottimizzato.glb',boss:'./assets/boss.glb'};
    const gltf=await new Promise((resolve,reject)=>enemyLoader.load(paths[type],resolve,undefined,reject));
    const scene=gltf.scene;
    const box=new THREE.Box3().setFromObject(scene);
    const size=box.getSize(new V());
    if(!size.y||!Number.isFinite(size.y))throw Error('Dimensioni GLB non valide: '+type);
    const scale=(type==='boss'?3.25:type==='goblin'?1.85:1.22)/size.y;
    scene.scale.setScalar(scale);
    scene.position.set(-box.getCenter(new V()).x*scale,-box.min.y*scale,-box.getCenter(new V()).z*scale);
    enemyAssets[type]=scene;
    for(const e of enemies)if(e.userData.kind===type)applyEnemyAsset(e);
    console.info('Modello nemico pronto:',type);
  }
  function applyEnemyAsset(e){
    const data=e.userData,source=enemyAssets[data.kind];
    if(!source||data.meshyLoaded)return;
    data.body.clear();
    const visual=source.clone(true);
    visual.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    data.body.add(visual);data.meshyLoaded=true;
    if(data.kind==='goblin')attachDagger(e);
  }
  function goblin(x,z,seed){
    const e=slime(x,z,seed);
    e.userData.kind='goblin';e.userData.hp=5;e.userData.maxHp=5;
    e.userData.speed=.85+rand(seed)*.2;
    e.userData.life.position.y=2.05;
    e.userData.fill.material=e.userData.fill.material.clone();
    e.userData.fill.material.color.set('#f59c68');
    applyEnemyAsset(e);
    return e;
  }
  function bossGoblin(x,z,seed){
    const e=slime(x,z,seed);
    e.userData.kind='boss';e.userData.hp=24;e.userData.maxHp=24;
    e.userData.speed=.75;e.userData.attack=1.3;
    e.userData.life.position.y=3.5;
    e.userData.fill.material=e.userData.fill.material.clone();
    e.userData.fill.material.color.set('#f44e61');
    applyEnemyAsset(e);return e;
  }
  function spawnEnemy(x,z,i){
    const e=i<3?slime(x,z,i):goblin(x,z,i);
    if(i<3){e.userData.kind='slime';applyEnemyAsset(e);}
    return e;
  }
  const enemies=[];
  const origins=[[-.6,2.5],[2.8,-2.5],[5.0,3.8],[11.7,-2.1],[14.2,3.3]];
  origins.forEach((p,i)=>enemies.push(spawnEnemy(p[0],p[1],i)));
  let state='menu',health=100,coins=0,kills=0,cooldown=0,elapsed=0,attackSwing=0,toastTime=0,shake=0,winTimer=-1;
  let level=1,xp=0,maxHealth=100,damage=1,fireRate=1,moveSpeed=4.15,
      extraArrows=0,pierce=0,regeneration=0,stage=1,element='arcana',upgradeQueue=0;
  const upgradeLevels={};
  const elements={arcana:{label:'Arcana',color:'#b5f3fa'},fire:{label:'Fuoco',color:'#ff9a54'},ice:{label:'Gelo',color:'#86ddff'}};
  const upgrades=[
    {id:'power',icon:'⚔️',name:'Freccia potente',desc:'+1 danno per colpo',max:5,apply:()=>damage++},
    {id:'rapid',icon:'⚡',name:'Tiro rapido',desc:'Frequenza di tiro +18%',max:4,apply:()=>fireRate*=1.18},
    {id:'multishot',icon:'🏹',name:'Doppia freccia',desc:'+1 freccia per attacco',max:2,apply:()=>extraArrows++},
    {id:'pierce',icon:'🎯',name:'Perforazione',desc:'Le frecce attraversano un nemico in più',max:2,apply:()=>pierce++},
    {id:'speed',icon:'👟',name:'Passo leggero',desc:'Velocità movimento +12%',max:3,apply:()=>moveSpeed*=1.12},
    {id:'health',icon:'❤️',name:'Cuore magico',desc:'+25 salute massima e cura 25 HP',max:4,apply:()=>{maxHealth+=25;health=Math.min(maxHealth,health+25)}},
    {id:'regen',icon:'✨',name:'Rigenerazione',desc:'Recupera 0,65 HP al secondo',max:3,apply:()=>regeneration+=.65},
    {id:'fire',icon:'🔥',name:'Frecce di fuoco',desc:'Sblocca le frecce infuocate',max:1,apply:()=>{element='fire';refreshElement()}},
    {id:'ice',icon:'❄️',name:'Frecce di gelo',desc:'Sblocca le frecce rallentanti',max:1,apply:()=>{element='ice';refreshElement()}}
  ];
  function xpNeeded(){return 16+(level-1)*13;}
  function refreshElement(){
    const b=$('#element-button');if(b)b.textContent=elements[element].label+' ◈';
    gemMaterial.color.set(elements[element].color);gemMaterial.emissive.set(elements[element].color);
  }
  const gemMaterial=new THREE.MeshStandardMaterial({color:'#b5f3fa',emissive:'#64a8e7',emissiveIntensity:1.5,roughness:.24});
  const bowGem=ball(hero.bow,gemMaterial,[.20,0,.12],[.12,.13,.12],true,false);
  function openUpgrade(){
    if(state!=='playing'||upgradeQueue<=0)return;
    state='upgrading';
    const available=upgrades.filter(u=>(upgradeLevels[u.id]||0)<u.max);
    if(!available.length){upgradeQueue=0;state='playing';return;}
    const selected=[...available].sort((a,b)=>rand(level*91+a.id.length*13+upgrades.indexOf(a)*7)-rand(level*91+b.id.length*13+upgrades.indexOf(b)*7)).slice(0,3);
    const elemental=level===2?available.find(u=>u.id==='fire'):level===3?available.find(u=>u.id==='ice'):null;
    if(elemental&&!selected.includes(elemental))selected[2]=elemental;
    const panel=$('#upgrade-panel');panel.innerHTML='';
    for(const u of selected){
      const button=document.createElement('button');button.className='upgrade-card';
      button.innerHTML=`<span class="upgrade-icon">${u.icon}</span><span class="upgrade-name">${u.name}</span><span class="upgrade-desc">${u.desc}</span><span class="upgrade-stack">Livello ${(upgradeLevels[u.id]||0)+1}/${u.max}</span>`;
      button.addEventListener('click',()=>{
        upgradeLevels[u.id]=(upgradeLevels[u.id]||0)+1;u.apply();upgradeQueue--;
        $('#upgrade-overlay').classList.remove('visible');updateHud();
        state='playing';toast('POTENZIAMENTO: '+u.name.toUpperCase(),2);
        if(upgradeQueue>0)openUpgrade();
      });panel.appendChild(button);
    }
    $('#upgrade-title').textContent='LIVELLO '+level+' · SCEGLI UN POTENZIAMENTO';
    $('#upgrade-overlay').classList.add('visible');
  }
  function gainXp(amount){
    xp+=amount;
    while(xp>=xpNeeded()){
      xp-=xpNeeded();level++;upgradeQueue++;
    }
    updateHud();if(upgradeQueue>0&&state==='playing')openUpgrade();
  }
  function cycleElement(){
    const unlocked=['arcana'];if(upgradeLevels.fire)unlocked.push('fire');if(upgradeLevels.ice)unlocked.push('ice');
    element=unlocked[(unlocked.indexOf(element)+1)%unlocked.length];refreshElement();
  }
  $('#element-button').addEventListener('click',cycleElement);

  const arrows=[],sparks=[];
  const move={x:0,y:0};const keys=new Set();let joyPointer=null;
  let popupTimer=0;
  function toast(t,sec=2){$('#toast').textContent=t;toastTime=sec}
  function updateHud(){
    $('#hpbar').style.width=(health/maxHealth*100)+'%';$('#hptext').textContent=Math.ceil(health)+' / '+maxHealth+' HP';
    $('#coins').textContent='✦ '+coins+' monete';$('#kills').textContent=stage===1?'Nemici '+Math.min(kills,5)+' / 5':stage===2?'BOSS GOBLIN':'BOSS SCONFITTO';
    $('#level').textContent='Livello '+level;$('#xpbar').style.width=(xp/xpNeeded()*100)+'%';
    $('#quest-text').textContent=stage===1?'Sconfiggi 5 nemici e ottieni potenziamenti':stage===2?'Sconfiggi il Boss Goblin':'Il cristallo si è risvegliato!';
  }
  function showDialog(title,detail,button='CONTINUA'){
    $('#dialog').classList.add('visible');$('#dialog-text').innerHTML=detail;
    $('.dialog-card h1').textContent=title;$('#start').innerHTML=button+' <span>➜</span>';
  }
  function start(){
    if(!criticalAssetsReady)return;
    if(state==='won'||state==='lost')reset();
    state='playing';$('#dialog').classList.remove('visible');toast('Segui il sentiero e scopri la foresta!',3);
  }
  function reset(){
    for(const e of enemies)world.remove(e);enemies.length=0;
    origins.forEach((p,i)=>enemies.push(spawnEnemy(p[0],p[1],i)));
    for(const a of arrows)removeArrow(a);arrows.length=0;
    for(const a of sparks)world.remove(a.mesh);sparks.length=0;
    hero.root.position.set(-6,0,.55);health=100;maxHealth=100;coins=0;kills=0;level=1;xp=0;
    damage=1;fireRate=1;moveSpeed=4.15;extraArrows=0;pierce=0;regeneration=0;
    stage=1;element='arcana';upgradeQueue=0;Object.keys(upgradeLevels).forEach(k=>delete upgradeLevels[k]);
    $('#upgrade-overlay').classList.remove('visible');refreshElement();
    centerCrystal.visible=false;winTimer=-1;cooldown=0;updateHud();
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
    cooldown=.49/fireRate;attackSwing=1;
    const target=nearestEnemy(),start=hero.root.position.clone().add(new V(.04,1.1,0));
    const aim=target?target.position.clone().add(new V(0,.53,0)):start.clone().addScaledVector(facing,12);
    const baseDir=aim.clone().sub(start).normalize();if(target)facing.copy(baseDir).setY(0).normalize();
    for(let i=0;i<=extraArrows;i++){
      const angle=(i-extraArrows/2)*.14,dir=baseDir.clone().applyAxisAngle(new V(0,1,0),angle);
      const g=new THREE.Group();g.position.copy(start);world.add(g);
      const color=elements[element].color;
      stick(g,mat('#91633e'),[0,-.34,0],[0,.34,0],.028,.027,8);
      mesh(new THREE.ConeGeometry(.09,.22,10),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.7}),g,[0,.42,0]);
      for(let sign of [-1,1])ball(g,m.white,[sign*.07,-.26,0],[.045,.12,.024],true,false);
      g.quaternion.setFromUnitVectors(new V(0,1,0),dir);
      arrows.push({mesh:g,dir,target:extraArrows?null:target,life:1.7,pierces:pierce,hit:new Set(),element});
    }
    if(navigator.vibrate)navigator.vibrate(9);
  }
  function removeArrow(a){
    world.remove(a.mesh);a.mesh.traverse(o=>{if(o.isMesh&&o.geometry&&o.geometry!==sphere&&o.geometry!==sphereLow)o.geometry.dispose();});
  }
  $('#fire').addEventListener('pointerdown',e=>{e.preventDefault();shoot()});
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();keys.add(k);
    if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
    if(k===' '&&!e.repeat)shoot();
    if(k==='e'&&!e.repeat)cycleElement();
    if(state==='upgrading'&&['1','2','3'].includes(k))$('#upgrade-panel').children[Number(k)-1]?.click();
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
    const kind=e.userData.kind;
    const pos=e.position.clone().add(new V(0,.50,0));sparkAt(pos,kind==='boss'?'#ffb17e':'#b7fff0',kind==='boss'?26:12);
    world.remove(e);const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);
    const reward=kind==='boss'?150:kind==='goblin'?30:20;
    coins+=reward;kills++;updateHud();
    toast('✦ +'+reward+' MONETE · '+kind.toUpperCase()+' SCONFITTO!',1.6);
    if(kind==='boss'){
      stage=3;winTimer=2.0;centerCrystal.visible=true;
      sparkAt(altar.position.clone().add(new V(0,1.5,0)),'#a7eaff',22);
      toast('IL BOSS È SCONFITTO! IL CRISTALLO SI RISVEGLIA!',2.7);
      return;
    }
    gainXp(kind==='goblin'?20:12);
    if(stage===1&&kills>=5){
      stage=2;const boss=bossGoblin(13.2,0.8,89);enemies.push(boss);
      // Il boss arriva dopo i cinque nemici iniziali.
      toast('ATTENZIONE! È ARRIVATO IL BOSS GOBLIN!',3.5);updateHud();
    }
  }
  function hurt(e,a){
    const data=e.userData;
    data.hp=Math.max(0,data.hp-damage);data.flash=.16;data.life.visible=true;
    data.fill.scale.x=Math.max(.01,data.hp/data.maxHp);
    if(a?.element==='ice')data.slow=Math.max(data.slow||0,2.8);
    if(a?.element==='fire')data.burn=Math.max(data.burn||0,2.6);
    sparkAt(e.position.clone().add(new V(0,.52,0)),elements[a?.element||'arcana'].color,5);
    if(data.hp<=0)defeated(e);
  }
  function takeDamage(amount){
    health=Math.max(0,health-amount);updateHud();shake=.25;
    if(navigator.vibrate)navigator.vibrate(24);
    if(health===0){
      state='lost';showDialog('LA SCINTILLA SI È SPENTA','Hai raccolto <b>'+coins+' monete</b> e raggiunto il livello <b>'+level+'</b>. Riprova e scegli potenziamenti diversi.','RIPROVA');
    }
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
        hero.root.position.x=THREE.MathUtils.clamp(hero.root.position.x+vx*moveSpeed*dt*strength,-23,23);
        hero.root.position.z=THREE.MathUtils.clamp(hero.root.position.z+vz*moveSpeed*dt*strength,-22,22);
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
      if(regeneration>0&&health<maxHealth){health=Math.min(maxHealth,health+regeneration*dt);updateHud();}
      attackSwing=Math.max(0,attackSwing-dt*3.3);
      hero.arms[1].rotation.z=-.25*attackSwing;
      hero.bow.rotation.z=-.35*attackSwing;
      hero.motion.rotation.z=-.065*attackSwing;
      hero.root.rotation.y=THREE.MathUtils.lerp(hero.root.rotation.y,Math.atan2(facing.x,facing.z),Math.min(1,dt*10));
      for(const e of enemies){
        const data=e.userData;
        const dx=hero.root.position.x-e.position.x,dz=hero.root.position.z-e.position.z,d=Math.hypot(dx,dz);
        if(data.burn>0){data.burn-=dt;data.burnTick=(data.burnTick||0)+dt;
          if(data.burnTick>=.75){data.burnTick=0;data.hp=Math.max(0,data.hp-1);data.life.visible=true;data.fill.scale.x=Math.max(.01,data.hp/data.maxHp);
            if(data.hp<=0){defeated(e);continue;}}
        }
        data.slow=Math.max(0,(data.slow||0)-dt);
        const slowFactor=data.slow>0?.55:1;
        const reach=data.kind==='boss'?1.65:1.03;
        if(d<9.5&&d>reach){e.position.x+=dx/d*data.speed*slowFactor*dt;e.position.z+=dz/d*data.speed*slowFactor*dt}
        if(d<reach){data.attack-=dt;if(data.attack<=0){takeDamage(data.kind==='boss'?18:9);data.attack=data.kind==='boss'?1.65:1.28}}
        const b=data.body;
        b.scale.y=1+(data.kind!=='slime'?.012:.055)*Math.sin(elapsed*6+data.phase);
        b.scale.x=1-(data.kind!=='slime'?.008:.036)*Math.sin(elapsed*6+data.phase);
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
          const radius=e.userData.kind==='boss'?1.15:.62;
          if(!a.hit.has(e)&&a.mesh.position.distanceTo(h)<radius){
            a.hit.add(e);hurt(e,a);
            if(a.pierces>0){a.pierces--;a.target=null;}else{hitOne=true;break}
          }
        }
        if(hitOne||a.life<0){removeArrow(a);arrows.splice(i,1)}
      }
      if(winTimer>=0){winTimer-=dt;if(winTimer<0){state='won';showDialog('CRISTALLO RISVEGLIATO!','Hai sconfitto il Boss Goblin, raggiunto il <b>livello '+level+'</b> e raccolto <b>'+coins+' monete</b>!<br>La prima isola è salva.','GIOCA DI NUOVO')}}
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
  updateHud();tick();initializeModels();
  refreshElement();updateAssetStatus();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=0600').catch(()=>{});
}
