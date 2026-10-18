/* THE FIRST SPARK — Alpha 0.20 | Rigging, Boss, salvataggi, ingresso 3D, boss in area separata
   Una dimostrazione WebGL reale: personaggi e ambiente sono costruiti da mesh
   tridimensionali morbide e illuminate, senza asset 3D esterni.
   Il solo motore Three.js si carica via CDN per mantenere leggero il pacchetto. */
const $ = s => document.querySelector(s);
const loading = $('#loading');
const hint = $('#load-note');
let THREE;
try {
  try { THREE = await import('three'); }
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
  // Mobile: meno pixel da disegnare, stessa dimensione visiva del canvas.
  const mobileDevice=window.matchMedia('(pointer: coarse)').matches;
  let qualityScale=mobileDevice?Math.min(window.devicePixelRatio||1,1):Math.min(window.devicePixelRatio||1,1.35);
  renderer.setPixelRatio(qualityScale);
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
    const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
    ctx.fillStyle='#b4cda0';ctx.fillRect(0,0,512,512);
    for(let i=0;i<12000;i++){
      const xx=rand(i*1.37+11)*512, yy=rand(i*9.71+33)*512;
      ctx.fillStyle=['#b2d09f','#aac49c','#c3d6a9','#a0c294','#d0d9b4'][i%5];
      ctx.globalAlpha=.12+rand(i+70)*.28;ctx.beginPath();ctx.ellipse(xx,yy,1.1+rand(i*3)*2.5,.5+rand(i*7)*1.2,rand(i)*6.28,0,6.283);ctx.fill();
    }
    ctx.globalAlpha=1;const t=new THREE.CanvasTexture(c);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(9,9);t.colorSpace=THREE.SRGBColorSpace;
    t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
  }
  function rand(n){const v=Math.sin(n*128.237+12.4)*43758.5453;return v-Math.floor(v)}
  // Alpha 0.18: una vera isola delimitata da coste irregolari, non un piano
  // erboso infinito. Il mare resta sotto al terreno e NON copre l'arena Boss.
  const islandCorners=[[-29,-15],[-27,-22],[-20,-27],[-9,-29],[7,-30],[22,-28],
    [29,-23],[32,-14],[33,-3],[31,10],[27,22],[18,29],[7,32],[-8,33],
    [-18,31],[-22,28],[-23.6,23],[-23.6,16],[-23.6,9],[-24,3],[-29,-3],[-31,-10]];
  const islandOutline=[];
  for(let i=0;i<islandCorners.length;i++){
    const a=islandCorners[i],b=islandCorners[(i+1)%islandCorners.length];
    for(let j=0;j<3;j++){
      const t=j/3,noise=j===0?0:.17*Math.sin(i*3.8+j*1.7);
      const nx=b[1]-a[1],nz=-(b[0]-a[0]),len=Math.hypot(nx,nz)||1;
      islandOutline.push([a[0]*(1-t)+b[0]*t+noise*nx/len,
        a[1]*(1-t)+b[1]*t+noise*nz/len]);
    }
  }
  const islandShape=new THREE.Shape();
  islandOutline.forEach(([x,z],i)=>i?islandShape.lineTo(x,-z):islandShape.moveTo(x,-z));
  islandShape.closePath();
  const islandGeometry=new THREE.ShapeGeometry(islandShape);
  const groundPositions=islandGeometry.attributes.position;
  const groundUV=[];
  for(let i=0;i<groundPositions.count;i++)groundUV.push((groundPositions.getX(i)+35)/70,(groundPositions.getY(i)+35)/70);
  islandGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(groundUV,2));
  const ground=mesh(islandGeometry,new THREE.MeshStandardMaterial({map:grassTexture(),color:'#d5f2cb',roughness:1,side:THREE.DoubleSide}),world,[0,-.085,0],[1,1,1],false);
  ground.rotation.x=-Math.PI/2;
  const oceanGeometry=new THREE.PlaneGeometry(160,140,45,40);
  oceanGeometry.rotateX(-Math.PI/2);
  // 0.19: acqua OPACA con pigmento azzurro. La texture delle onde 0.18
  // aveva lo sfondo trasparente: usata come mappa colore anneriva il mare.
  // MeshBasicMaterial evita che il mare diventi nero con l'illuminazione mobile.
  const oceanMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide});
  const ocean=mesh(oceanGeometry,oceanMaterial,world,[0,-.19,0],[1,1,1],false);
  ocean.name='Mare_unificato_azzurro_020';
  // Schiuma costiera: un'unica fascia leggera che segue il perimetro.
  const shoreVertices=[],shoreIndices=[];
  for(let i=0;i<islandOutline.length;i++){
    const [x,z]=islandOutline[i],d=Math.hypot(x,z)||1;
    shoreVertices.push(x,-.072,z,x+x/d*.72,-.079,z+z/d*.72);
    const k=i*2,l=((i+1)%islandOutline.length)*2;
    // Lascia aperte le due foci: nessuna linea di schiuma che tagli il fiume.
    const next=islandOutline[(i+1)%islandOutline.length];
    const atMouth=Math.abs(x-4.1)<3.0&&Math.abs(next[0]-4.1)<3.0&&
      (z< -26||z>28)&& (next[1]< -26||next[1]>28);
    if(!atMouth)shoreIndices.push(k,k+1,l,k+1,l+1,l);
  }
  const shoreGeometry=new THREE.BufferGeometry();
  shoreGeometry.setAttribute('position',new THREE.Float32BufferAttribute(shoreVertices,3));
  shoreGeometry.setIndex(shoreIndices);shoreGeometry.computeVertexNormals();
  const outerFoam=mesh(shoreGeometry,new THREE.MeshBasicMaterial({color:'#d4fff5',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}),world,[0,0,0],[1,1,1],false);
  outerFoam.name='Schiuma_costiera_perimetrale';
  function insideIsland(x,z){
    let inside=false;
    for(let i=0,j=islandOutline.length-1;i<islandOutline.length;j=i++){
      const a=islandOutline[i],b=islandOutline[j];
      if(((a[1]>z)!==(b[1]>z))&&(x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
    }
    return inside;
  }
  function nearIslandEdge(x,z,r){
    for(let i=0;i<islandOutline.length;i++){
      const a=islandOutline[i],b=islandOutline[(i+1)%islandOutline.length];
      const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
      if(Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<r+.28)return true;
    }
    return false;
  }
  // Sentiero: UN'UNICA SUPERFICIE CURVA, non piu una fila di dischi sovrapposti.
  // Alpha 0.15: UN PERCORSO leggibile dalla spiaggia alla soglia del Boss.
  // Spiaggia -> bosco -> ponte sul fiume -> campo Goblin -> ingresso 3D.
  const pathPts=[
    [-17.0,12.1],[-16.2,9.0],[-14.2,5.7],[-12.8,2.2],
    [-10.2,-2.0],[-6.5,-3.0],[-2.0,-.8],[1.0,.15],
    [4.5,.7],[7.7,-1.0],[10.8,-3.0],[14.2,-4.7],
    [16.0,-6.7],[16.0,-9.7],[16.0,-14.9]
  ];
  const pathCurve=new THREE.CatmullRomCurve3(pathPts.map(p=>new V(p[0],0,p[1])),false,'catmullrom',.42);
  function pathSurface(){
    const p=[],col=[],ind=[],length=175,slices=8;
    const cg=new THREE.Color('#a9c897'),cm=new THREE.Color('#e3c99e'),ce=new THREE.Color('#cab18a');
    for(let i=0;i<=length;i++){
      const t=i/length,q=pathCurve.getPoint(t),dir=pathCurve.getTangent(t),n=new V(-dir.z,0,dir.x);
      const width=1.62+.18*Math.sin(t*14)+.12*Math.sin(t*41);
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
  // Il sentiero principale parte direttamente dal punto di sbarco.
  const arrivalPath=pathCurve;
  // Laghetto laterale con sponda e morbidi riflessi.
  const pond=new THREE.Group();pond.position.set(-10,0,9);world.add(pond);
  function flatEllipse(parent,material,radx,radz,y){const s=mesh(new THREE.CircleGeometry(1,60),material,parent,[0,y,0],[radx,radz,1],false);s.rotation.x=-Math.PI/2;return s}
  // Sponda stratificata e acqua più profonda: il laghetto ora è distinto
  // dalla costa marina e dal fiume.
  flatEllipse(pond,mat('#8a9f82'),4.12,2.79,-.004);
  flatEllipse(pond,mat('#d9c9a4'),3.86,2.54,.010);
  flatEllipse(pond,mat('#327c85',.22,{transparent:true,opacity:.96,depthWrite:false}),3.55,2.26,.021);
  flatEllipse(pond,mat('#73bdc0',.25,{transparent:true,opacity:.72,depthWrite:false}),3.31,2.08,.027);
  // Superficie animata vera: 9 anelli concentrici, 64 settori,
  // piccoli spostamenti verticali senza librerie esterne.
  const waterMeshes=[{geometry:oceanGeometry,base:new Float32Array(oceanGeometry.attributes.position.array),type:'ocean'}];
  function makePondSurface(rx,rz,y,material){
    const vertices=[],uv=[],indices=[],rings=10,sides=64;
    for(let r=0;r<=rings;r++){
      const k=r/rings;
      for(let j=0;j<=sides;j++){
        const a=j/sides*Math.PI*2;
        vertices.push(Math.cos(a)*rx*k,y,Math.sin(a)*rz*k);
        uv.push((Math.cos(a)*k+1)*.5,(Math.sin(a)*k+1)*.5);
        if(r<rings&&j<sides){const v=r*(sides+1)+j,w=v+sides+1;
          indices.push(v,w,v+1,v+1,w,w+1);
        }
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(indices);g.computeVertexNormals();
    const o=mesh(g,material,pond,[0,0,0],[1,1,1],false);
    waterMeshes.push({geometry:g,base:new Float32Array(vertices),type:'pond'});
    return o;
  }
  // Trasparenza e piccole increspature luminose sopra l'acqua base.
  const waterPatternCanvas=document.createElement('canvas');
  waterPatternCanvas.width=waterPatternCanvas.height=256;
  const wc=waterPatternCanvas.getContext('2d');
  wc.clearRect(0,0,256,256);
  for(let i=0;i<110;i++){
    const x=rand(i*31+4)*256,y=rand(i*11+8)*256;
    wc.strokeStyle='rgba(240,255,250,'+(.09+rand(i+99)*.18)+')';
    wc.lineWidth=.8+rand(i*3)*1.4;
    wc.beginPath();wc.moveTo(x,y);wc.quadraticCurveTo(x+8,y-2,x+16+rand(i)*16,y+1);wc.stroke();
  }
  const waterPattern=new THREE.CanvasTexture(waterPatternCanvas);
  waterPattern.wrapS=waterPattern.wrapT=THREE.RepeatWrapping;
  waterPattern.repeat.set(2.2,2.2);waterPattern.colorSpace=THREE.SRGBColorSpace;
  // Tessitura colorata: niente trasparenza nella mappa diffuse del mare.
  const seaCanvas=document.createElement('canvas');seaCanvas.width=seaCanvas.height=512;
  const seaCtx=seaCanvas.getContext('2d');
  seaCtx.fillStyle='#268dbb';seaCtx.fillRect(0,0,512,512);
  const seaGradient=seaCtx.createLinearGradient(0,0,512,512);
  seaGradient.addColorStop(0,'rgba(92,198,218,.24)');
  seaGradient.addColorStop(.48,'rgba(19,105,170,.09)');
  seaGradient.addColorStop(1,'rgba(83,185,214,.18)');
  seaCtx.fillStyle=seaGradient;seaCtx.fillRect(0,0,512,512);
  for(let i=0;i<155;i++){
    const x=rand(i*11.31+21)*512,y=rand(i*17.17+18)*512;
    seaCtx.strokeStyle=i%4===0?'rgba(215,252,255,.16)':'rgba(174,239,248,.075)';
    seaCtx.lineWidth=.8+rand(i*3.9)*1.6;
    seaCtx.beginPath();seaCtx.moveTo(x,y);
    seaCtx.quadraticCurveTo(x+10,y-2,x+25+rand(i*5)*20,y+1);
    seaCtx.stroke();
  }
  const oceanPattern=new THREE.CanvasTexture(seaCanvas);
  oceanPattern.colorSpace=THREE.SRGBColorSpace;
  oceanPattern.wrapS=oceanPattern.wrapT=THREE.RepeatWrapping;
  oceanPattern.repeat.set(13,12);
  oceanPattern.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  oceanMaterial.map=oceanPattern;oceanMaterial.needsUpdate=true;
  const pondWaves=makePondSurface(3.27,2.04,.075,
    new THREE.MeshBasicMaterial({color:'#e5ffec',map:waterPattern,transparent:true,opacity:.80,
      depthWrite:false,side:THREE.DoubleSide}));
  const pondFoam=mesh(new THREE.RingGeometry(.93,1.01,90),
    new THREE.MeshBasicMaterial({color:'#e2fff2',transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false}),
    pond,[0,.086,0],[3.50,2.22,1],false);
  pondFoam.rotation.x=-Math.PI/2;
  const pondHighlights=[];
  for(let i=0;i<17;i++){
    const x=(rand(i*11+61)-.5)*5.8,z=(rand(i*23+70)-.5)*3.3;
    const h=mesh(new THREE.PlaneGeometry(.24+rand(i)*.27,.022),
      new THREE.MeshBasicMaterial({color:'#e8fffa',transparent:true,opacity:.20,depthWrite:false,side:THREE.DoubleSide}),
      pond,[x,.090,z],[1,1,1],false);
    h.rotation.x=-Math.PI/2;pondHighlights.push(h);
  }
  // Canne lungo la riva. Le rocce di contorno arrivano dal GLB.
  for(let i=0;i<16;i++){
    const a=i*2.39996,rad=1+.07*Math.sin(i*5);
    const x=Math.cos(a)*3.77*rad,z=Math.sin(a)*2.44*rad;
    const reed=mesh(new THREE.ConeGeometry(.045,.24,4),
      mat('#81a875'),pond,[x,.13,z],[1,1,1],false);
    reed.rotation.z=.12*Math.sin(i*2);
  }
  const ripples=[];
  for(let i=0;i<4;i++){
    const ring=mesh(new THREE.RingGeometry(.18+i*.37,.205+i*.37,56),new THREE.MeshBasicMaterial({color:'#d1f5eb',transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false}),pond,[-.8,.105,.3],[1,.72,1],false);
    ring.rotation.x=-Math.PI/2;ripples.push(ring);
  }
  for(let i=0;i<5;i++){
    const x=(rand(i+17)-.5)*4,z=(rand(i+77)-.5)*2.8;
    const pad=flatEllipse(pond,mat('#7bad6d'),.34,.25,.115);pad.position.x=x;pad.position.z=z;
    if(i%2===0){ball(pond,m.flowerYellow,[x,.18,z],[.11,.08,.11],true,false)}
  }
  // Alpha 0.12: nessuna roccia procedurale: ogni sasso visibile viene
  // dal GLB Roccia_media, scalato in due taglie (media/piccola).
  // Alberi fiabeschi: tronco curvo, chiome tonde continue e sfumature naturali.
  // Alpha 0.9: eliminati gli alberi procedurali della vecchia versione.
  // Le chiome sono ora esclusivamente quelle dei modelli Meshy (pini,
  // latifoglie e palme), organizzate in tre biomi separati.
  const trees=[];
  // Presenze piccole e colorate nel sottobosco.
  function mushroom(x,z,s,color){
    stick(world,m.cream,[x,.07*s,z],[x,.39*s,z],.075*s,.062*s,10);
    const cap=ball(world,color,[x,.41*s,z],[.29*s,.17*s,.28*s],true,false);
    const collar=ball(world,m.white,[x,.35*s,z],[.22*s,.05*s,.22*s],true,false);return [cap,collar];
  }
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),m.flowerYellow,175);
  // Erba bassa tridimensionale: ciuffi a tre lame, instanziati in una sola
  // draw call per variante. Non interferiscono con sentieri, spiaggia o acqua.
  const grassShape=new THREE.BufferGeometry();
  const grassVertices=[];
  for(let blade=0;blade<3;blade++){
    const a=blade*Math.PI/3,dx=Math.cos(a)*.13,dz=Math.sin(a)*.13;
    grassVertices.push(-dx*.24,0,-dz*.24, dx*.24,0,dz*.24, Math.sin(a)*.012,.010,Math.cos(a)*.012);
  }
  grassShape.setAttribute('position',new THREE.Float32BufferAttribute(grassVertices,3));
  grassShape.computeVertexNormals();
  const grassColors=['#83b877','#9cc785','#72aa71'];
  const inst=new THREE.Object3D();
  function nearPath(x,z){
    for(let j=1;j<pathPts.length;j++){
      const a=pathPts[j-1],b=pathPts[j],dx=b[0]-a[0],dz=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
      if(Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<2.05)return true;
    }
    for(let j=0;j<=24;j++){
      const p=arrivalPath.getPoint(j/24);
      if(Math.hypot(x-p.x,z-p.z)<1.1)return true;
    }
    return false;
  }
  function validGrass(x,z){
    const riverX=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
    return !(x< -15&&z>5) &&
      !(x< -11&&x> -19&&z>1&&z<14) &&
      Math.hypot((x+10)/4.2,(z-9)/3.1)>1.12 &&
      Math.abs(x-riverX)>2.3 &&
      Math.hypot((x-16)/8.5,(z+9)/7.6)>1 &&
      Math.hypot((x-9)/3.5,(z-1.45)/3.5)>1 &&
      !(x>14&&x<25&&z< -12&&z> -27&&Math.abs(x-(16+(z+12)*(-.37)))<2.0) &&
      !nearPath(x,z);
  }
  for(let layer=0;layer<3;layer++){
    const count=3600,tufts=new THREE.InstancedMesh(grassShape,
      new THREE.MeshStandardMaterial({color:grassColors[layer],roughness:1,side:THREE.DoubleSide}),count);
    let placed=0;
    for(let k=0;k<30000&&placed<count;k++){
      const x=(rand(k*19+layer*500+101)-.5)*58;
      const z=(rand(k*37+layer*800+305)-.5)*55;
      if(!validGrass(x,z))continue;
      const h=.80+rand(k*7+layer)*.20; // altezza massima 0,01 unità = 1 cm
      inst.position.set(x,.013,z);
      inst.rotation.set(0,rand(k+layer*77)*6.283,0);
      inst.scale.set(h,h,h);inst.updateMatrix();
      tufts.setMatrixAt(placed++,inst.matrix);
    }
    for(let k=placed;k<count;k++){
      inst.position.set(0,-10,0);inst.scale.set(0,0,0);inst.updateMatrix();
      tufts.setMatrixAt(k,inst.matrix);
    }
    tufts.instanceMatrix.needsUpdate=true;tufts.castShadow=false;tufts.receiveShadow=false;
    world.add(tufts);
  }
  for(let i=0;i<175;i++){
    const x=(rand(i*19+601)-.5)*40,z=(rand(i*33+809)-.5)*40;
    if(!validGrass(x,z)){
      inst.position.set(0,-10,0);inst.scale.set(0,0,0);inst.updateMatrix();petals.setMatrixAt(i,inst.matrix);continue;
    }
    inst.position.set(x,.13,z);inst.rotation.set(0,0,0);const s=.06+rand(i)*.045;inst.scale.set(s,s*.55,s);inst.updateMatrix();petals.setMatrixAt(i,inst.matrix);
  }
  petals.castShadow=false;world.add(petals);
  // ERBA VISIBILE: un centimetro reale è sub-pixel con questa telecamera.
  // Oltre ai ciuffi 3D di 1 cm, un tappeto di piccoli fili sulla texture
  // rende il sottobosco erboso anche dall'alto (solo due draw call).
  function forestGrassOverlay(){
    const c=document.createElement('canvas');c.width=c.height=512;
    const ctx=c.getContext('2d');ctx.clearRect(0,0,512,512);
    for(let i=0;i<12500;i++){
      const x=rand(i*19+7)*512,y=rand(i*41+19)*512;
      const nx=(x-256)/256,ny=(y-256)/256;
      const falloff=Math.max(0,Math.min(1,(1.05-Math.hypot(nx,ny))/.30));
      if(falloff<.02)continue;
      ctx.strokeStyle=i%4===0?'#427c43':i%4===1?'#64934d':i%4===2?'#a3c278':'#4f8d53';
      ctx.globalAlpha=(.12+rand(i*7)*.30)*falloff;
      ctx.lineWidth=.55+rand(i*5)*1.25;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand(i*13)-.5)*4,y-2-rand(i*3)*4);ctx.stroke();
    }
    ctx.globalAlpha=1;
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.94,
      side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    for(const [x,z,rx,rz] of [[-15,-14,26,24],[16,15,27,26],[-6,15,14,13]]){
      const o=mesh(new THREE.PlaneGeometry(rx,rz),material,world,[x,-.043,z],[1,1,1],false);
      o.rotation.x=-Math.PI/2;
    }
  }
  forestGrassOverlay();

  for(let i=0;i<19;i++){
    const x=(rand(i*8+123)-.5)*46,z=(rand(i*7+213)-.5)*39;
    mushroom(x,z,.6+rand(i)*.8,i%2?m.flowers:m.blueFlower);
  }
  // Piccolo altare del cristallo, sempre visibile oltre il sentiero.
  const altar=new THREE.Group();altar.position.set(170,.045,-3.2);world.add(altar);
  circularShadow(altar,0,0,1.8,.16);
  mesh(new THREE.CylinderGeometry(1.53,1.62,.18,48),mat('#99aca2'),altar,[0,.075,0]);
  mesh(new THREE.CylinderGeometry(1.18,1.30,.24,48),mat('#c1c5ac'),altar,[0,.27,0]);
  mesh(new THREE.TorusGeometry(.98,.055,9,58),m.rune,altar,[0,.405,0]).rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){
    const t=i*Math.PI/4;ball(altar,m.rune,[Math.cos(t)*1.0,.405,Math.sin(t)*1],[.072,.08,.072],true,false);
  }
  // Primo dei dieci amuleti unici. Galleggia dopo la sconfitta e
  // la vittoria si attiva SOLTANTO quando il mago lo raccoglie.
  const centerCrystal=new THREE.Group();centerCrystal.position.set(0,1.48,0);altar.add(centerCrystal);
  const amuletGold=mat('#f3c66b',.25,{metalness:.7,emissive:'#6b4312',emissiveIntensity:.23});
  const amuletGem=mat('#6debd1',.17,{metalness:.2,emissive:'#13a8a2',emissiveIntensity:.95});
  const amuletRing=mesh(new THREE.TorusGeometry(.42,.11,12,36),amuletGold,centerCrystal,[0,0,0],[1,1,1],false);
  mesh(new THREE.OctahedronGeometry(.29,0),amuletGem,centerCrystal,[0,0,.08],[1,1,1],false);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    const tip=mesh(new THREE.ConeGeometry(.105,.26,6),amuletGold,centerCrystal,
      [Math.sin(a)*.47,Math.cos(a)*.47,0],[1,1,1],false);
    tip.rotation.z=-a;
  }
  const amuletHalo=mesh(new THREE.TorusGeometry(.67,.018,6,48),
    new THREE.MeshBasicMaterial({color:'#b6ffe8',transparent:true,opacity:.55}),
    centerCrystal,[0,0,0],[1,1,1],false);
  const amuletBeam=mesh(new THREE.CylinderGeometry(.20,.40,6.5,12,1,true),
    new THREE.MeshBasicMaterial({color:'#88ffe2',transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}),
    altar,[0,3.15,0],[1,1,1],false);
  amuletBeam.visible=false;
  const glow=new THREE.PointLight('#76f6cf',.75,3.1);glow.position.set(0,.2,.2);centerCrystal.add(glow);
  centerCrystal.visible=false;
  // ALPHA 0.12 — AMBIENTAZIONE ESPLORABILE (GEOMETRIE LEGGERE)
  // Gli elementi architettonici goblin sono segnaposto originali e modulari:
  // potranno essere sostituiti dai futuri GLB senza toccare il gameplay.
  const env=new THREE.Group();env.name='Ambiente_Alpha_010';world.add(env);
  const em={
    earth:mat('#7f9870'),earthLight:mat('#91a77a'),sand:mat('#d8c39c'),
    moss:mat('#719774'),mossLight:mat('#a5c58d'),darkStone:mat('#7d8d83'),
    slate:mat('#a5afa1'),slateEdge:mat('#7c8b83'),
    wood:mat('#806046'),woodLight:mat('#aa8159'),woodDark:mat('#594b3d'),
    rope:mat('#d3b68a'),tent:mat('#8e6550',.98,{side:THREE.DoubleSide}),
    tentEdge:mat('#bb936a',.98,{side:THREE.DoubleSide}),
    goblinCloth:mat('#7d6842',.95,{side:THREE.DoubleSide}),
    banner:mat('#a95542',.95,{side:THREE.DoubleSide}),
    flame:mat('#ffc270',.42,{emissive:'#ff8c36',emissiveIntensity:1.8}),
    flameCore:mat('#fff0ad',.36,{emissive:'#ffd05c',emissiveIntensity:1.4}),
    waterDeep:new THREE.MeshBasicMaterial({color:'#ffffff',map:oceanPattern,side:THREE.DoubleSide}),
    waterLight:new THREE.MeshBasicMaterial({color:'#c2edfa',transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false}),
    shrub:mat('#659c69'),shrubLight:mat('#91bb77'),reed:mat('#8baa6b'),
    magic:mat('#c3d7ed',.37,{emissive:'#72bbdb',emissiveIntensity:.48})
  };
  // Chiazze di terreno: distinguono bosco, costa, rovine e campo nemico.
  function terrainPatch(x,z,rx,rz,material,seed,y=-.055){
    const geo=new THREE.CircleGeometry(1,26),a=geo.attributes.position;
    for(let i=1;i<a.count;i++){
      const ang=Math.atan2(a.getY(i),a.getX(i));
      const wave=1+.07*Math.sin(ang*5+seed)+.06*Math.cos(ang*8+seed*2);
      a.setXY(i,a.getX(i)*wave,a.getY(i)*wave);
    }
    geo.computeVertexNormals();
    const o=mesh(geo,material,env,[x,y,z],[rx,rz,1],false);o.rotation.x=-Math.PI/2;return o;
  }
  terrainPatch(16,-9,7.0,6.1,em.earthLight,2,-.053);
  terrainPatch(-10,9,6.4,5.4,em.sand,3,-.050);
  terrainPatch(9,1.4,4.4,4.0,em.moss,4,-.052);
  terrainPatch(-18,-14,5.5,4.4,em.earth,5,-.054);
  // Spiaggia vera, separata dal laghetto: sabbia calda, battigia e mare
  // sulla costa occidentale. La barca GLB sarà arenata sulla sabbia.
  terrainPatch(-20,14,10.6,11.2,mat('#e9d4a7'),17,-.049);
  terrainPatch(-20.8,15.0,8.1,9.3,mat('#efdcb6'),29,-.046);
  const coast=new THREE.Group();coast.name='Spiaggia_e_mare';env.add(coast);
  function coastalStrip(innerOffset,outerOffset,y,material){
    const p=[],uv=[],ind=[],n=78;
    for(let i=0;i<=n;i++){
      const z=3+i*27/n,edge=-23.6+.55*Math.sin(z*.42)+.18*Math.cos(z*.85);
      p.push(edge+innerOffset,y,z,edge+outerOffset,y,z);
      uv.push(i/n,0,i/n,1);
      if(i<n){const k=i*2;ind.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(ind);g.computeVertexNormals();
    return mesh(g,material,coast,[0,0,0],[1,1,1],false);
  }
  coastalStrip(-15,.0,-.024,mat('#368e9d',.31,{transparent:true,opacity:.97,side:THREE.DoubleSide,depthWrite:false}));
  coastalStrip(-.7,.0,-.012,mat('#8ccdc4',.34,{transparent:true,opacity:.80,side:THREE.DoubleSide,depthWrite:false}));
  coastalStrip(0,.28,-.008,mat('#f8e9c8',.7,{transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
  const shoreFoam=[];
  for(let i=0;i<21;i++){
    const z=4+i*1.20,edge=-23.6+.55*Math.sin(z*.42)+.18*Math.cos(z*.85);
    const foam=mesh(new THREE.PlaneGeometry(.22,.55),
      new THREE.MeshBasicMaterial({color:'#eafff8',transparent:true,opacity:.37,depthWrite:false,side:THREE.DoubleSide}),
      coast,[edge-.24,-.002,z],[1,1,1],false);
    foam.rotation.x=-Math.PI/2;shoreFoam.push(foam);
  }
  // Conchiglie e piccoli sassi: dettagli leggeri della spiaggia.
  for(let i=0;i<34;i++){
    const x=-22+rand(i*13+9)*6,z=7+rand(i*17+19)*15;
    const shell=mesh(new THREE.DodecahedronGeometry(.09+rand(i)*.055,0),
      i%2?em.sand:em.slate,coast,[x,.028,z],[1,.42,.72],false);
    shell.rotation.y=rand(i*2+4)*6.28;
  }

  // Segno dello scafo sulla sabbia; rende riconoscibile il punto d'approdo.
  terrainPatch(-20.6,16.1,2.85,1.35,mat('#d4b88c'),51,-.025);

  // Alpha 0.15: la battaglia ha un'area autonoma, molto lontana dalla mappa.
  // La distanza consente al frustum culling di non disegnare il campo Goblin
  // mentre il giocatore combatte il Boss (senza ricaricare la pagina).
  const BOSS_X=170,BOSS_Z=0;
  const flames=[];
  const bossArena=new THREE.Group();bossArena.name='Area_separata_Boss_Goblin';
  bossArena.position.set(BOSS_X,0,BOSS_Z);env.add(bossArena);
  const bossGround=mesh(new THREE.CircleGeometry(24,96),mat('#637a65'),bossArena,[0,-.08,0],[1,1,1],false);
  bossGround.rotation.x=-Math.PI/2;bossGround.visible=false; // niente terreno esterno al bordo
  const bossGround2=mesh(new THREE.CircleGeometry(18.2,96),mat('#a9a18b'),bossArena,[0,-.04,0],[1,1,1],false);
  bossGround2.rotation.x=-Math.PI/2;bossGround2.visible=false;
  const bossGround3=mesh(new THREE.CircleGeometry(15.45,96),mat('#a9ae9c'),bossArena,[0,-.022,0],[1,1,1],false);
  bossGround3.rotation.x=-Math.PI/2;
  const arenaRing=mesh(new THREE.RingGeometry(15.55,16.30,96),
    mat('#777e74',.98,{side:THREE.DoubleSide}),bossArena,[0,.016,0],[1,.93,1],false);
  arenaRing.rotation.x=-Math.PI/2;
  // Alpha 0.15: arena architettonica costruita con moduli semplici, SENZA
  // la roccaforte GLB chiusa (la mesh originale si accavallava come un blob).
  // Raggio utile ~15m; tutti i muri sono fuori dal bordo di collisione.
  const stoneCanvas=document.createElement('canvas');stoneCanvas.width=512;stoneCanvas.height=512;
  const stoneCtx=stoneCanvas.getContext('2d');stoneCtx.fillStyle='#9f9e8b';stoneCtx.fillRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const stagger=(row%2)*32,x=col*64-stagger,y=row*64;
    const variation=Math.floor(rand(row*31+col*7)*34);
    stoneCtx.fillStyle=`rgb(${133+variation},${133+variation},${121+variation})`;
    stoneCtx.fillRect(x+2,y+2,61,61);
    stoneCtx.strokeStyle='rgba(58,66,57,.47)';stoneCtx.lineWidth=2;
    stoneCtx.strokeRect(x+2,y+2,61,61);
    for(let k=0;k<6;k++){
      stoneCtx.fillStyle='rgba(45,55,47,.08)';
      stoneCtx.fillRect(x+6+rand(row*171+col*19+k)*50,y+6+rand(row*21+col*31+k)*50,3,3);
    }
  }
  const stoneTexture=new THREE.CanvasTexture(stoneCanvas);
  stoneTexture.colorSpace=THREE.SRGBColorSpace;
  stoneTexture.wrapS=stoneTexture.wrapT=THREE.RepeatWrapping;
  stoneTexture.repeat.set(3,3);stoneTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const arenaStone=mat('#ffffff',.95,{map:stoneTexture}),arenaStoneLight=mat('#ddd6c0',.91,{map:stoneTexture});
  const arenaStoneDark=mat('#77857a',.96,{map:stoneTexture}),arenaWood=mat('#6e4d38',.88);
  bossGround3.material=mat('#d5d2bd',.97,{map:stoneTexture});
  bossGround2.material=mat('#c7bda9',.97,{map:stoneTexture});
  const arenaGold=mat('#bd985d',.56,{metalness:.15});
  // 0.20: arena circolare modulare pulita, senza il GLB roccaforte sovrapposto.
  // Pavimento e bordo finiscono insieme: nessun quadrato esterno.
  const arenaMarkerStones=[];
  // Pietre incastonate e cerchi rituali: geometrie basse, nessun groviglio.
  for(let i=0;i<20;i++){
    const a=i*Math.PI*2/20,x=Math.cos(a)*13.75,z=Math.sin(a)*13.75;
    const tile=mesh(new THREE.BoxGeometry(1.3,.11,.85),i%3?arenaStone:arenaStoneLight,
      bossArena,[x,.045,z],[1,1,1],false);tile.rotation.y=-a;
  }
  for(const r of [6.5,10.7]){
    const circle=mesh(new THREE.RingGeometry(r-.08,r+.08,96),
      new THREE.MeshBasicMaterial({color:r<8?'#d5bb78':'#798d7a',side:THREE.DoubleSide,
        transparent:true,opacity:.75,depthWrite:false}),bossArena,[0,.018,0],[1,1,1],false);
    circle.rotation.x=-Math.PI/2;
  }
  // Quattro bracieri, senza costose luci dinamiche supplementari.
  for(let i=0;i<4;i++){
    const a=(i+.5)*Math.PI/2,x=Math.cos(a)*12.9,z=Math.sin(a)*12.9;
    mesh(new THREE.CylinderGeometry(.32,.42,1.0,8),arenaStoneDark,bossArena,[x,.48,z],[1,1,1],false);
    const flame=mesh(new THREE.ConeGeometry(.27,.76,9),em.flame,bossArena,[x,1.30,z],[1,1,1],false);
    flames.push({mesh:flame,phase:i*.64});
  }
  // Mura di pietra modulari, istanziate: poche draw call anche su iPhone.
  // Apertura a sud (verso z positivo), allineata al punto d'arrivo del mago.
  const wallCount=68,wallGeo=new THREE.BoxGeometry(1.52,1.16,.95);
  const wallMaterials=[mat('#756b5b'),mat('#91816a'),mat('#6b665d')];
  const wallInstances=wallMaterials.map(material=>new THREE.InstancedMesh(wallGeo,material,wallCount*2));
  const wallFill=[0,0,0],wallDummy=new THREE.Object3D();
  for(let i=0;i<wallCount;i++){
    const a=i*Math.PI*2/wallCount;
    if(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.13)continue;
    for(let row=0;row<2;row++){
      const r=15.85,materialIndex=(i+row*2)%3;
      wallDummy.position.set(Math.cos(a)*r,.63+row*1.08,Math.sin(a)*r);
      wallDummy.rotation.set(0,-a,0);
      wallDummy.scale.set(1,.96+rand(i*5+row)*.09,1);
      wallDummy.updateMatrix();
      wallInstances[materialIndex].setMatrixAt(wallFill[materialIndex]++,wallDummy.matrix);
    }
  }
  for(let i=0;i<wallInstances.length;i++){
    wallInstances[i].count=wallFill[i];wallInstances[i].instanceMatrix.needsUpdate=true;
    wallInstances[i].castShadow=false;wallInstances[i].receiveShadow=true;
    bossArena.add(wallInstances[i]);
  }
  // Merli superiori alternati, per un profilo riconoscibile senza grovigli.
  const battlement=new THREE.InstancedMesh(new THREE.BoxGeometry(.85,.72,.90),arenaStoneDark,34);
  let merlons=0;
  for(let i=0;i<68;i+=2){const a=i*Math.PI*2/68;
    if(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.16)continue;
    wallDummy.position.set(Math.cos(a)*15.85,2.56,Math.sin(a)*15.85);
    wallDummy.rotation.set(0,-a,0);wallDummy.scale.set(1,1,1);wallDummy.updateMatrix();
    battlement.setMatrixAt(merlons++,wallDummy.matrix);
  }
  battlement.count=merlons;battlement.instanceMatrix.needsUpdate=true;bossArena.add(battlement);
  // Portale aperto e coerente con l'arena: colonne in pietra e architrave in legno.
  for(const side of [-1,1]){
    const x=side*2.45;
    mesh(new THREE.BoxGeometry(1.20,3.45,1.5),arenaStoneDark,bossArena,[x,1.72,15.45],[1,1,1],false);
    mesh(new THREE.BoxGeometry(1.48,.38,1.75),arenaStoneLight,bossArena,[x,3.55,15.45],[1,1,1],false);
    const flag=mesh(new THREE.PlaneGeometry(.65,1.65),mat('#ad4639',.95,{side:THREE.DoubleSide}),bossArena,[x,2.45,14.55],[1,1,1],false);
    flag.rotation.y=Math.PI;
  }
  mesh(new THREE.BoxGeometry(6.3,.55,1.5),arenaWood,bossArena,[0,3.72,15.45],[1,1,1],false);
  // Tracce di torce sui muri, disposte fuori dal campo di combattimento.
  for(let i=0;i<8;i++){
    const a=(i+.5)*Math.PI*2/8,r=15.0;
    const post=mesh(new THREE.CylinderGeometry(.11,.15,1.55,7),arenaWood,bossArena,[Math.cos(a)*r,.86,Math.sin(a)*r],[1,1,1],false);
    mesh(new THREE.ConeGeometry(.25,.52,7),em.flame,bossArena,[post.position.x,1.89,post.position.z],[1,1,1],false);
  }
  // Percorso finale dal falò alla vera soglia del modello 3D.
  const specialTelegraph=new THREE.Mesh(new THREE.RingGeometry(3.65,4.1,64),
    new THREE.MeshBasicMaterial({color:'#f7a14b',side:THREE.DoubleSide,transparent:true,opacity:.52,depthWrite:false}));
  specialTelegraph.rotation.x=-Math.PI/2;specialTelegraph.visible=false;
  specialTelegraph.position.y=.08;world.add(specialTelegraph);
  const gateTrail=new THREE.Group();gateTrail.name='Sentiero_porta_del_Boss';env.add(gateTrail);
  for(let i=0;i<10;i++){
    const z=-10.3-i*.54;
    const tile=mesh(new THREE.BoxGeometry(2.5,.045,.48),i%3?em.sand:em.earthLight,
      gateTrail,[16,.007,z],[1,1,1],false);
    tile.rotation.y=(i%2?.02:-.02);
  }
  // Luce nella soglia: il trigger e' il passaggio reale del mago oltre la porta.
  const gatewayGlow=mesh(new THREE.PlaneGeometry(2.9,3.6),
    new THREE.MeshBasicMaterial({color:'#87d4c6',transparent:true,opacity:.15,
      depthWrite:false,side:THREE.DoubleSide}),env,[16,1.9,-14.9],[1,1,1],false);
  // Piano verticale orientato verso chi arriva dall'accampamento.
  gatewayGlow.rotation.y=0;
  const arrivalMark=mesh(new THREE.RingGeometry(1.15,1.27,40),
    new THREE.MeshBasicMaterial({color:'#8be2d3',transparent:true,opacity:.65,
      depthWrite:false,side:THREE.DoubleSide}),bossArena,[0,.028,11.6],[1,1,1],false);
  arrivalMark.rotation.x=-Math.PI/2;

  // 0.20: dettagli distribuiti nei vuoti senza moltiplicare le draw call.
  const decorStone=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.30,0),mat('#9fa79a'),130);
  const decorBush=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.45,0),mat('#739d72'),170);
  let nStone=0,nBush=0;const decorDummy=new THREE.Object3D();
  for(let i=0;i<650&&(nStone<130||nBush<170);i++){
    const x=-27+rand(i*7.73+5)*58,z=-27+rand(i*13.17+91)*54;
    if(!insideIsland(x,z)||nearIslandEdge(x,z,.7)||nearPath(x,z))continue;
    const rx=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
    if(Math.abs(x-rx)<3.4||Math.hypot((x+10)/4.2,(z-9)/3.1)<1.6)continue;
    if(x>6&&x<31&&z>-22&&z<-1)continue; // non affollare l'avamposto
    const stone=i%3===0&&nStone<130;
    if(!stone&&nBush>=170)continue;
    const h=stone?.18+.23*rand(i*9):.34+.25*rand(i*4);
    decorDummy.position.set(x,h*.65,z);decorDummy.rotation.set(0,rand(i*19)*6.28,0);
    decorDummy.scale.set(1.0+rand(i*5)*.9,h/.4,.75+rand(i*11)*.8);decorDummy.updateMatrix();
    if(stone)decorStone.setMatrixAt(nStone++,decorDummy.matrix);else decorBush.setMatrixAt(nBush++,decorDummy.matrix);
  }
  decorStone.count=nStone;decorBush.count=nBush;
  decorStone.instanceMatrix.needsUpdate=true;decorBush.instanceMatrix.needsUpdate=true;
  decorStone.castShadow=false;decorBush.castShadow=false;world.add(decorStone,decorBush);
  // Bordo naturale del percorso: ciuffi di arbusti bassi, solo decorativi.
  // I cespugli NON generano collider: il mago non si blocca nell'erba.
  const pathShrubGeometry=new THREE.IcosahedronGeometry(.42,0);
  const pathShrubMaterial=mat('#739c69');
  const pathShrubs=new THREE.InstancedMesh(pathShrubGeometry,pathShrubMaterial,110);
  const shrubTransform=new THREE.Object3D();
  for(let i=0;i<110;i++){
    const t=.10+(i%55)/55*.68;
    const q=pathCurve.getPoint(t),d=pathCurve.getTangent(t);
    const side=i<55?-1:1;
    const offset=3.6+rand(i*13)*1.4;
    const x=q.x-d.z*side*offset,z=q.z+d.x*side*offset;
    const riverX=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
    if(Math.abs(x-riverX)<2.4||Math.hypot((x+10)/4.2,(z-9)/3.1)<1.2){
      shrubTransform.position.set(0,-100,0);shrubTransform.scale.setScalar(0);
    }else{
      const r=.6+rand(i*31)*.55;
      shrubTransform.position.set(x,.19*r,z);
      shrubTransform.scale.set(r,.55*r,.86*r);
    }
    shrubTransform.rotation.y=rand(i*7)*6.283;
    shrubTransform.updateMatrix();pathShrubs.setMatrixAt(i,shrubTransform.matrix);
  }
  pathShrubs.castShadow=false;pathShrubs.receiveShadow=false;
  env.add(pathShrubs);
  // Piccoli cartelli che rendono distinguibili le tappe, senza nuovi file.
  function areaSign(x,z,label,angle=0){
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;env.add(group);
    mesh(new THREE.CylinderGeometry(.075,.10,1.4,7),em.woodDark,group,[0,.70,0],[1,1,1],false);
    const wood=mesh(new THREE.BoxGeometry(1.45,.53,.12),em.wood,group,[0,1.32,0],[1,1,1],false);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f5e6bc';ctx.font='bold 56px Georgia,serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,95,490);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const labelPlane=mesh(new THREE.PlaneGeometry(1.36,.48),
      new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}),
      group,[0,1.32,.067],[1,1,1],false);
    labelPlane.renderOrder=1;
    return group;
  }
  areaSign(-18.9,5.0,'FORESTA',-.12);
  areaSign(10.9,-1.3,'CAMPO GOBLIN',.10);
  areaSign(18.3,-11.5,'BOSS',-.08);

  // Fiume sinuoso: letto, rive e superficie traslucida. Il sentiero lo attraversa.
  function riverStrip(width,material,y,phase){
    const verts=[],uv=[],idx=[],N=110,C=(material===em.waterDeep||material===em.waterLight||!!material.map)?8:1;
    for(let i=0;i<=N;i++){
      const z=-35+i*70/N,mid=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
      const mouthBlend=Math.max(0,Math.min(1,(Math.abs(z)-26)/8));
      const w=width*(1+.08*Math.sin(z*.31))*(1+mouthBlend*.38);
      for(let c=0;c<=C;c++){
        const side=-1+2*c/C;
        // Alla foce l'acqua si abbassa dolcemente fino alla quota del mare.
        const mouth=Math.max(0,Math.min(1,(Math.abs(z)-27.0)/7.0));
        const riverY=y-mouth*(y+.155);
        verts.push(mid+side*w,riverY,z);
        uv.push(i/N*5,c/C*2);
        if(i<N&&c<C){const a=i*(C+1)+c,b=a+C+1;
          idx.push(a,b,a+1,a+1,b,b+1);
        }
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const o=mesh(g,material,env,[0,0,0],[1,1,1],false);
    if(C>1)waterMeshes.push({geometry:g,base:new Float32Array(verts),type:'river'});
    return o;
  }
  riverStrip(2.35,em.sand,-.035,0);
  riverStrip(1.99,em.moss,-.024,0);
  riverStrip(1.64,em.waterDeep,.015,0);
  riverStrip(1.31,em.waterLight,.021,0);
  // Alpha 0.20: mare e fiume usano esattamente la stessa texture, la stessa
  // colorimetria e lo stesso movimento. Le foci si allargano senza dischi colorati.
  // Solo una tenue increspatura, senza il precedente strato verde traslucido.
  const riverPattern=oceanPattern;
  // Riflessi d'acqua discreti, senza shader o effetti pesanti su iPhone.
  // Fasce luminose che scorrono realmente lungo il fiume, unite in una
  // sola geometria dinamica. Risultano visibili anche su schermi piccoli.
  const flowCount=34,flowVertices=new Float32Array(flowCount*6*3);
  const flowGeo=new THREE.BufferGeometry();
  flowGeo.setAttribute('position',new THREE.BufferAttribute(flowVertices,3).setUsage(THREE.DynamicDrawUsage));
  const flowMesh=mesh(flowGeo,new THREE.MeshBasicMaterial({color:'#e9fff5',
    transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}),env,[0,0,0],[1,1,1],false);
  function updateFlowLines(t){
    for(let i=0;i<flowCount;i++){
      const z=-29+((i*2.83+t*(1.35+.18*(i%3)))%58);
      const cx=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
      const side=(rand(i*37+11)-.5)*1.85,w=.035+.025*rand(i*7),length=.35+rand(i*13)*.65;
      const x=cx+side,y=.132;
      const j=i*18;
      flowVertices.set([x-w,y,z,x+w,y,z,x-w,y,z+length,
        x+w,y,z,x+w,y,z+length,x-w,y,z+length],j);
    }
    flowGeo.attributes.position.needsUpdate=true;
    flowGeo.computeBoundingSphere();
  }
  updateFlowLines(0);
  // Anelli più ampi che si espandono e si dissolvono sul laghetto.
  const lakeRings=[];
  for(let i=0;i<7;i++){
    const ring=mesh(new THREE.RingGeometry(.62,.67,64),
      new THREE.MeshBasicMaterial({color:'#f3fff0',transparent:true,opacity:.4,
        side:THREE.DoubleSide,depthWrite:false}),pond,
      [(i%3-1)*.75,.105,((i*2)%3-1)*.48],[1,1,1],false);
    ring.rotation.x=-Math.PI/2;lakeRings.push(ring);
  }
  const riverGlints=[];
  for(let i=0;i<16;i++){
    const z=-25+i*3.1,mid=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
    const g=mesh(new THREE.PlaneGeometry(.32,.024),new THREE.MeshBasicMaterial({color:'#e1fff1',transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}),env,[mid+Math.sin(i*7)*.65,.023,z],[1,1,1],false);
    g.rotation.x=-Math.PI/2;riverGlints.push(g);
  }
  // Ponticello praticabile visivamente (nessun salto richiesto dal movimento).
  const riverBridge=new THREE.Group();riverBridge.position.set(4.5,0,.7);env.add(riverBridge);
  for(let i=0;i<13;i++){
    const x=(i-6)*.34;
    const plank=mesh(new THREE.BoxGeometry(.31,.115,3.9),i%3?em.woodLight:em.wood,riverBridge,[x,.047,0]);
    plank.rotation.y=Math.sin(i*1.9)*.015;
  }
  // 0.17: nessun paletto o parapetto vicino al ponte: tavolato completamente libero.
  // Cespugli e canneti delle sponde. Istanziare evita decine di draw-call.
  const bushGeo=new THREE.IcosahedronGeometry(1,1),bushM=new THREE.InstancedMesh(bushGeo,em.shrub,66);
  const reeds=new THREE.InstancedMesh(new THREE.ConeGeometry(.075,.78,5),em.reed,92);
  const dummy=new THREE.Object3D();
  for(let i=0;i<66;i++){
    const z=-27+rand(i*12+9)*54,mid=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
    const x=mid+(i%2?1:-1)*(2.5+rand(i*31)*1.3);
    dummy.position.set(x,.18,z);dummy.rotation.set(0,rand(i+3)*6.28,0);
    const sc=.19+rand(i*7+2)*.36;dummy.scale.set(sc,sc*.75,sc);dummy.updateMatrix();bushM.setMatrixAt(i,dummy.matrix);
  }
  bushM.castShadow=false;bushM.receiveShadow=false;env.add(bushM);
  for(let i=0;i<92;i++){
    const z=-28+rand(i*19+8)*56,mid=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
    const x=mid+(i%2?1:-1)*(1.93+rand(i*37)*.85);
    dummy.position.set(x,.25,z);dummy.rotation.set(0,rand(i+2)*6.28,(rand(i+13)-.5)*.35);
    const sc=.55+rand(i*3+11)*.85;dummy.scale.set(sc,sc,sc);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix);
  }
  reeds.castShadow=false;reeds.receiveShadow=false;env.add(reeds);
  // Sentieri secondari e pietre che guidano verso il futuro avamposto.
  function steppingTrail(points,seed){
    const line=new THREE.CatmullRomCurve3(points.map(p=>new V(p[0],0,p[1])));
    for(let i=0;i<23;i++){
      const t=i/22,at=line.getPoint(t),s=.27+rand(i*11+seed)*.23;
      const stone=mesh(new THREE.CylinderGeometry(s*.9,s,.055,7),i%4?em.sand:em.slate,env,[at.x,-.004,at.z],[1,1,.8],false);
      stone.rotation.y=rand(i+seed)*6.28;
    }
  }
  steppingTrail([[11,-.7],[12,-3],[13.6,-4.5],[15,-5.8]],13);
  steppingTrail([[-10,5],[-11.4,7],[-12.6,8.6]],21);
  // AVAMPOSTO GOBLIN PROVVISORIO: palizzata, torri, tende, fuoco e bottino.
  // Il centro rimane aperto, con ingresso sul lato nord (verso il sentiero).
  const camp=new THREE.Group();camp.position.set(16,0,-9);camp.visible=false;camp.name='Avamposto_goblin_segnaposto';env.add(camp);
  function localBox(parent,material,x,y,z,w,h,d){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,[x,y,z]);}
  function pole(parent,a,b,r=.075,material=em.woodDark){return stick(parent,material,a,b,r,r*.86,7)}
  function fenceSegment(parent,x1,z1,x2,z2,n=5){
    for(let i=0;i<=n;i++){
      const t=i/n,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;
      pole(parent,[x,0,z],[x,1.35+(i%3)*.09,z],.13,i%3?em.wood:em.woodDark);
    }
    pole(parent,[x1,.65,z1],[x2,.65,z2],.075,em.woodLight);
  }
  fenceSegment(camp,-5,-4.1,5,-4.1,18);
  fenceSegment(camp,-5,-4.1,-5,3.8,13);
  fenceSegment(camp,5,-4.1,5,3.8,13);
  fenceSegment(camp,-5,3.8,-1.8,3.8,5);
  fenceSegment(camp,1.8,3.8,5,3.8,5);
  // Portale senza porte: pronto a essere sostituito dalla futura roccaforte GLB.
  for(let x of [-1.75,1.75]){
    pole(camp,[x,0,3.85],[x,2.55,3.85],.19,em.woodDark);
    ball(camp,em.flame,[x,2.6,3.85],[.14,.18,.14],true,false);
  }
  localBox(camp,em.woodDark,0,2.3,3.85,3.65,.28,.35);
  function goblinFlag(parent,x,y,z){
    pole(parent,[x,y,z],[x,y+1.5,z],.058,em.woodDark);
    const flag=mesh(new THREE.PlaneGeometry(.84,.55),em.banner,parent,[x+.43,y+1.15,z],[1,1,1],false);
    flag.rotation.y=.09;
    ball(parent,em.woodDark,[x,y+1.53,z],[.095,.095,.095],true,false);
  }
  goblinFlag(camp,-1.5,2.2,3.85);goblinFlag(camp,1.5,2.2,3.85);
  function tower(parent,x,z){
    const t=new THREE.Group();t.position.set(x,0,z);parent.add(t);
    for(let sx of [-.65,.65])for(let sz of [-.65,.65])pole(t,[sx,0,sz],[sx,2.45,sz],.16,em.woodDark);
    localBox(t,em.woodLight,0,2.2,0,1.8,.2,1.8);
    for(let sx of [-.76,.76])localBox(t,em.woodDark,sx,2.63,0,.12,.75,1.9);
    for(let sz of [-.76,.76])localBox(t,em.woodDark,0,2.63,sz,1.9,.75,.12);
    const roof=mesh(new THREE.ConeGeometry(1.42,1.15,4),em.goblinCloth,t,[0,3.37,0]);roof.rotation.y=Math.PI/4;
    return t;
  }
  tower(camp,-4.2,2.95);tower(camp,4.2,2.95);
  function tent(parent,x,z,rotation=0,scale=1){
    const t=new THREE.Group();t.position.set(x,0,z);t.rotation.y=rotation;t.scale.setScalar(scale);parent.add(t);
    localBox(t,em.woodDark,0,.10,0,2.5,.16,2.1);
    const pts=[-1.25,0,-1.05, 1.25,0,-1.05, 0,1.9,-1.05, -1.25,0,1.05, 1.25,0,1.05, 0,1.9,1.05];
    const ind=[0,2,5,0,5,3,2,1,4,2,4,5,0,1,2,3,5,4];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(ind);g.computeVertexNormals();
    mesh(g,em.tent,t,[0,0,0],[1,1,1],false);
    pole(t,[0,0,-1.2],[0,1.95,-1.2],.075,em.woodLight);
    pole(t,[0,0,1.2],[0,1.95,1.2],.075,em.woodLight);
    localBox(t,em.woodDark,0,.68,1.065,.9,1.2,.06);
    return t;
  }
  tent(camp,-2.65,-1.3,.16,1);tent(camp,2.6,-1.3,-.28,.91);
  function barrel(parent,x,z,s=1){
    const b=new THREE.Group();b.position.set(x,0,z);b.scale.setScalar(s);parent.add(b);
    mesh(new THREE.CylinderGeometry(.32,.38,.77,9),em.wood,b,[0,.38,0]);
    for(let y of [.16,.64])mesh(new THREE.TorusGeometry(.34,.035,5,9),em.woodDark,b,[0,y,0]).rotation.x=Math.PI/2;
  }
  function crate(parent,x,z,s=1){
    const c=new THREE.Group();c.position.set(x,0,z);c.rotation.y=rand(x*9+z*13)*.3;c.scale.setScalar(s);parent.add(c);
    localBox(c,em.woodLight,0,.32,0,.73,.64,.7);
    localBox(c,em.woodDark,0,.34,.365,.77,.08,.065);
    localBox(c,em.woodDark,0,.34,-.365,.77,.08,.065);
    localBox(c,em.woodDark,.365,.34,0,.065,.08,.77);
  }
  barrel(camp,-3.8,-3.0);barrel(camp,-3.2,-3.1,.76);
  crate(camp,3.7,-2.5,1);crate(camp,3.0,-3.1,.73);crate(camp,2.9,-2.1,.59);
  // Falò, pietre e ceppi; le fiamme si muovono nel ciclo di animazione.
  function firepit(parent,x,z,size=1){
    const f=new THREE.Group();f.position.set(x,0,z);f.scale.setScalar(size);parent.add(f);
    for(let i=0;i<9;i++){
      const a=i*6.283/9;
      ball(f,em.slate,[Math.cos(a)*.57,.14,Math.sin(a)*.57],[.24,.17,.19],true,false);
    }
    for(let i=0;i<4;i++){
      const a=i*Math.PI/4;
      pole(f,[-Math.cos(a)*.48,.13,-Math.sin(a)*.48],[Math.cos(a)*.48,.22,Math.sin(a)*.48],.10,em.woodDark);
    }
    for(let i=0;i<3;i++){
      const flame=mesh(new THREE.ConeGeometry(.20+i*.055,.7-i*.1,6),i===1?em.flameCore:em.flame,f,[Math.sin(i*2.3)*.14,.56+i*.07,Math.cos(i*1.5)*.12],[1,1,1],false);
      flames.push({mesh:flame,phase:i*1.7});
    }
  }
  firepit(camp,0,-.35,.87);
  // Falò centrale visibile, anche dopo la sostituzione degli edifici provvisori.
  const campSquare=new THREE.Group();campSquare.name='Piazza_centrale_goblin';
  campSquare.position.set(12.6,0,-8.4);env.add(campSquare);
  firepit(campSquare,0,0,1.15);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.35;
    const log=mesh(new THREE.CylinderGeometry(.24,.26,.66,9),em.wood,campSquare,
      [Math.cos(a)*1.65,.26,Math.sin(a)*1.65],[1,1,1],false);
    log.rotation.z=Math.PI/2;
  }

  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.5;
    const log=mesh(new THREE.CylinderGeometry(.27,.30,.43,9),em.wood,camp,[Math.cos(a)*1.65,.22,Math.sin(a)*1.65-.4]);log.rotation.z=Math.PI/2;
  }
  // 0.17: rimosse le colonne/torri delle rovine dopo il ponte.
  // Il ponte e la strada verso il campo rimangono liberi.
  // Molo e attrezzi accanto al laghetto esistente.
  const dock=new THREE.Group();dock.position.set(-12.0,0,7.7);dock.rotation.y=-.36;env.add(dock);
  for(let i=0;i<7;i++)localBox(dock,i%2?em.woodLight:em.wood,(i-3)*.34,.11,0,.31,.13,1.55);
  for(let x of [-1.14,1.14])for(let z of [-.65,.65])pole(dock,[x,-.03,z],[x,.62,z],.10,em.woodDark);
  barrel(dock,-1.45,-1.05,.64);
  // Pannelli direzionali leggibili anche prima di modellare gli edifici definitivi.
  function signpost(x,z,angle=0){
    const sign=new THREE.Group();sign.position.set(x,0,z);sign.rotation.y=angle;env.add(sign);
    pole(sign,[0,0,0],[0,1.95,0],.10,em.woodDark);
    localBox(sign,em.woodLight,.22,1.64,0,1.3,.30,.12);
    const arrow=mesh(new THREE.ConeGeometry(.22,.40,3),em.woodLight,sign,[.99,1.64,0]);arrow.rotation.z=-Math.PI/2;
    localBox(sign,em.wood,.04,1.19,0,.9,.26,.12);
  }
  signpost(-3,2.6,.22);signpost(11,-1.2,-.26);
  // Dettagli magici nella radura iniziale e sulla strada delle rovine.
  const fireflies=[];
  const fireflyMaterial=new THREE.MeshBasicMaterial({color:'#e8ffe4',transparent:true,opacity:.7,depthWrite:false});
  const fireflyGeo=new THREE.SphereGeometry(.042,6,4);
  for(let i=0;i<19;i++){
    const x=-13+rand(i*17+31)*26,z=-6+rand(i*23+72)*17;
    const light=mesh(fireflyGeo,fireflyMaterial,env,[x,.8+rand(i*19)*1.2,z],[1,1,1],false);
    fireflies.push({mesh:light,x,z,y:light.position.y,phase:rand(i*9+2)*6.28});
  }
  // Altri elementi di scena sono statici e non modificano collisioni o nemici.
  let lastWaterUpdate=-1;
  function animateEnvironment(time){
    // Onde geometriche a 12 FPS (anziché ogni frame): meno upload GPU.
    // L'animazione delle texture e delle schiume resta fluida a ogni frame.
    if(time-lastWaterUpdate>.11){
      lastWaterUpdate=time;
      for(const w of waterMeshes){
        const a=w.geometry.attributes.position,base=w.base;
        for(let i=0;i<a.count;i++){
          const j=i*3,x=base[j],y=base[j+1],z=base[j+2];
          const dy=w.type==='pond'
            ? .035*Math.sin(x*1.9+time*2.0)*Math.cos(z*2.4-time*1.6)
            : w.type==='ocean'
              ? .045*Math.sin(x*.55+time*1.35)*Math.cos(z*.65-time*1.12)+.012*Math.sin(x*1.7+z*.8-time*2.2)
              : .048*Math.sin(z*2.0-time*3.8+x*1.7)+.016*Math.cos(z*3.4-time*4.0);
          a.setY(i,y+dy);
        }
        a.needsUpdate=true;
      }
      updateFlowLines(time);
    }
    for(let i=0;i<lakeRings.length;i++){
      const phase=(time*.17+i/lakeRings.length)%1;
      const scale=.42+phase*2.45;
      lakeRings[i].scale.set(scale,scale*.68,1);
      lakeRings[i].material.opacity=.53*(1-phase);
    }
    waterPattern.offset.x=time*.055;waterPattern.offset.y=time*.047;
    oceanPattern.offset.x=time*.025;oceanPattern.offset.y=-time*.034;
    outerFoam.material.opacity=.23+.09*Math.sin(time*1.5);
    // La texture condivisa e' gia animata da oceanPattern: nessun secondo offset.
    for(let i=0;i<riverGlints.length;i++){
      riverGlints[i].material.opacity=.17+.14*Math.sin(time*1.5+i*.85);
      riverGlints[i].position.z=-25+i*3.1+Math.sin(time*.8+i)*.18;
    }
    for(let i=0;i<pondHighlights.length;i++)pondHighlights[i].material.opacity=.13+.12*Math.sin(time*1.6+i*.9);
    pondFoam.material.opacity=.21+.06*Math.sin(time*1.3);
    for(let i=0;i<shoreFoam.length;i++)shoreFoam[i].material.opacity=.22+.15*Math.sin(time*1.7+i*.55);
    for(const f of flames){f.mesh.scale.y=.88+.19*Math.sin(time*9+f.phase);f.mesh.rotation.z=.11*Math.sin(time*6+f.phase)}
    for(const p of fireflies){p.mesh.position.y=p.y+.18*Math.sin(time*1.6+p.phase);p.mesh.position.x=p.x+.13*Math.sin(time*.9+p.phase)}
  }
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
  const hero=heroModel();hero.root.position.set(-17.0,0,12.1);
  // Alpha 0.7: il mondo non diventa giocabile finché il protagonista e i
  // nemici iniziali non sono pronti. Gli asset decorativi arrivano dopo.
  let enemyLoader=null;
  let criticalAssetsReady=false;
  // Sintesi di una Idle stabile dalla media delle pose del ciclo Walking.
  // Le animazioni Meshy fornite contengono soltanto Walking e Running.
  function makeNeutralIdle(clip){
    if(!clip)return null;
    const tracks=[];
    for(const track of clip.tracks){
      const stride=track.getValueSize(),values=track.values,n=track.times.length;
      if(!stride||!n)continue;
      const avg=new Array(stride).fill(0);
      for(let i=0;i<n;i++){
        let sign=1;
        if(stride===4&&track.name.endsWith('.quaternion')&&i>0){
          let dot=0;for(let j=0;j<4;j++)dot+=values[j]*values[i*4+j];
          if(dot<0)sign=-1;
        }
        for(let j=0;j<stride;j++)avg[j]+=sign*values[i*stride+j]/n;
      }
      if(stride===4&&track.name.endsWith('.quaternion')){
        const mag=Math.hypot(...avg)||1;for(let j=0;j<4;j++)avg[j]/=mag;
      }
      tracks.push(new track.constructor(track.name,[0,1],[...avg,...avg]));
    }
    return new THREE.AnimationClip('Idle_neutra',1,tracks);
  }
  function cloneRiggedScene(source){
    // Object3D.clone() da solo non rimappa le ossa di uno SkinnedMesh.
    const clone=source.clone(true),sourceNodes=[],cloneNodes=[];
    source.traverse(n=>sourceNodes.push(n));clone.traverse(n=>cloneNodes.push(n));
    const cloned=new Map(sourceNodes.map((n,i)=>[n,cloneNodes[i]]));
    for(let i=0;i<sourceNodes.length;i++){
      const original=sourceNodes[i],copy=cloneNodes[i];
      if(!original.isSkinnedMesh)continue;
      const bones=original.skeleton.bones.map(b=>cloned.get(b));
      if(bones.some(b=>!b))throw Error('Scheletro Goblin incompleto nella clonazione');
      copy.bind(new THREE.Skeleton(bones,original.skeleton.boneInverses.map(m=>m.clone())),original.bindMatrix.clone());
    }
    return clone;
  }
  let heroMixer=null,heroWalk=null,heroRun=null,heroIdle=null,heroCurrentAction=null;
  function updateHeroAnimation(dt,movement){
    if(!heroMixer)return;
    const wanted=movement<.08?heroIdle:(movement>.72&&heroRun?heroRun:heroWalk);
    if(wanted&&heroCurrentAction!==wanted){
      if(heroCurrentAction)heroCurrentAction.fadeOut(.24);
      wanted.reset().fadeIn(.24).play();heroCurrentAction=wanted;
    }
    // Anche quando ci si ferma il mixer avanza: non rimane bloccato nell'ultima posa.
    heroMixer.update(dt);
  }
  async function loadHeroModel(loader){
    const gltf=await new Promise((resolve,reject)=>loader.load('./assets/mago-animato.glb?v=0200',resolve,undefined,reject));
    const model=gltf.scene;
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new V());
    const center=bounds.getCenter(new V());
    if(!size.y||!Number.isFinite(size.y))throw Error('Dimensioni GLB del mago non valide');
    const scale=1.90/size.y; // 0.17: dimensioni coerenti con i Goblin e il mondo
    model.scale.setScalar(scale);
    model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    hero.motion.add(model);
    if(gltf.animations&&gltf.animations.length){
      heroMixer=new THREE.AnimationMixer(model);
      const walk=gltf.animations.find(a=>/walk/i.test(a.name));
      const run=gltf.animations.find(a=>/run/i.test(a.name));
      if(walk)heroWalk=heroMixer.clipAction(walk);
      if(run)heroRun=heroMixer.clipAction(run);
      if(!heroWalk&&gltf.animations[0])heroWalk=heroMixer.clipAction(gltf.animations[0]);
      const idleClip=makeNeutralIdle(walk||gltf.animations[0]);
      if(idleClip)heroIdle=heroMixer.clipAction(idleClip);
      for(const action of [heroIdle,heroWalk,heroRun])if(action){action.setLoop(THREE.LoopRepeat);action.clampWhenFinished=false;}
      if(heroIdle){heroIdle.play();heroCurrentAction=heroIdle;heroMixer.update(0);}
      console.info('Animazioni scheletriche del mago:',gltf.animations.map(a=>a.name));
    }
    // Forza l'inizializzazione delle risorse grafiche prima di mostrare il menu.
    renderer.compile(scene,camera);
    console.info('Mago ottimizzato pronto');
  }
  // Barra di caricamento con tempo minimo reale di 15 secondi e progresso
  // degli asset: non dichiara il 100% finché i file non sono pronti.
  const MIN_LOADING_MS=15000;
  const loadStarted=performance.now();
  let assetsFinished=false, assetsProgress=0, assetsTotal=1;
  const loadBar=$('#load-bar'),loadPercent=$('#load-percent'),loadClock=$('#load-clock');
  function updateLoadingUI(){
    const seconds=(performance.now()-loadStarted)/1000;
    const timeProgress=Math.min(1,seconds/15);
    const fileProgress=Math.min(1,assetsProgress/assetsTotal);
    const pct=Math.round(Math.min(timeProgress,fileProgress)*100);
    if(loadBar)loadBar.style.width=pct+'%';
    if(loadPercent)loadPercent.textContent=pct+'%';
    if(loadClock)loadClock.textContent=assetsFinished&&seconds<15
      ?'Preparazione del mondo · '+Math.ceil(15-seconds)+' s'
      :assetsFinished?'Tutto pronto!':'Modelli caricati '+assetsProgress+' / '+assetsTotal;
    if(!loading.classList.contains('hide'))requestAnimationFrame(updateLoadingUI);
  }
  requestAnimationFrame(updateLoadingUI);
  async function initializeModels(){
    try{
      hint.textContent='Preparazione del motore 3D…';
      let module;
      try{module=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js');}
      catch(primaryError){
        console.warn('GLTFLoader jsDelivr non disponibile', primaryError);
        try { module=await import('https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js'); }
        catch(secondaryError){
          throw new Error('Impossibile importare GLTFLoader. Controlla la connessione ai CDN jsDelivr/unpkg e che GitHub Pages abbia pubblicato tutti i file. '+String(secondaryError.message||secondaryError));
        }
      }
      const loader=new module.GLTFLoader();enemyLoader=loader;
      assetsTotal=4+Object.keys(modelSources).length; // mago, slime, goblin, boss + ambientazione
      async function countTask(task){
        try{return await task();}finally{assetsProgress++;}
      }
      hint.textContent='Caricamento personaggi e prima isola…';
      // Prima i personaggi necessari; poi gli elementi scenografici.
      await countTask(()=>loadHeroModel(loader));
      const essential=await Promise.allSettled([
        countTask(()=>loadEnemyModel('slime')),
        countTask(()=>loadEnemyModel('goblin')),
        countTask(()=>loadEnemyModel('boss'))
      ]);
      if(essential.some(r=>r.status==='rejected'))console.warn('Alcuni nemici usano modelli provvisori',essential);
      // L'intero mondo deve essere pronto prima di nascondere il caricamento.
      // Non è più una sequenza post-menu, che dava l'impressione di vedere la 0.9.
      for(const key of ['boat',...Object.keys(modelSources).filter(k=>k!=='boat')]){
        hint.textContent='Preparazione ambiente: '+key.replaceAll('_',' ')+'…';
        await countTask(()=>loadOneAsset(loader,key));
      }
      assetsFinished=true;
      hint.textContent='Il mondo è pronto. Ultimi preparativi…';
      // Lascia respirare il renderer: compila una sola volta dopo il caricamento.
      renderer.compile(scene,camera);
      const wait=Math.max(0,MIN_LOADING_MS-(performance.now()-loadStarted));
      if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
      criticalAssetsReady=true;
      hint.textContent='Tutto pronto! Ruota il telefono in orizzontale e gioca.';
      if(loadBar)loadBar.style.width='100%';
      if(loadPercent)loadPercent.textContent='100%';
      if(loadClock)loadClock.textContent='Caricamento completato';
      await new Promise(resolve=>requestAnimationFrame(resolve));
      loading.classList.add('hide');
    }catch(error){
      console.error('Errore caricamento',error);
      hint.textContent='Errore caricamento motore 3D: '+String(error.message||error).slice(0,180)+'. Controlla la connessione, poi ricarica.';
      hint.style.color='#ffe2a5';
    }
  }
  // Alpha 0.6: gli oggetti ambientali Meshy sono caricati in sequenza per
  // limitare i picchi di memoria su iPhone. Tutti i GLB restano senza rigging.
  // GLB originali ottimizzati per iPhone. Un solo download per modello:
  // le copie della scena condividono geometrie e texture in GPU.
  const modelSources={
    goblin_fence:'./assets/goblin_fence.glb?v=0200',
    goblin_tower:'./assets/goblin_tower_3d.glb?v=0200',
    goblin_tent:'./assets/goblin_tent.glb?v=0200',
    boat:'./assets/boat.glb?v=0200',palm:'./assets/palm.glb?v=0200',
    pine:'./assets/pine.glb?v=0200',tree:'./assets/tree.glb?v=0200',
    bow:'./assets/bow.glb?v=0200',dagger:'./assets/dagger.glb?v=0200',mace:'./assets/mace.glb?v=0200',
    rock_mid:'./assets/rock_mid.glb?v=0200',rock_big:'./assets/rock_big.glb?v=0200'
  };
  // Alpha 0.18: il quadrante Goblin e' ampliato. Il perimetro usa SOLO
  // i GLB Meshy delle palizzate e delle torri, non pali cilindrici.
  const goblinDistrict=new THREE.Group();goblinDistrict.name='Distretto_Goblin_0_18';env.add(goblinDistrict);
  const campFloor=mesh(new THREE.PlaneGeometry(24.8,20.0),mat('#8b8265',1),goblinDistrict,[18.3,-.026,-11.1],[1,1,1],false);
  campFloor.rotation.x=-Math.PI/2;
  const campClear=mesh(new THREE.PlaneGeometry(5.6,18.8),mat('#bca783',1),goblinDistrict,[16,-.016,-11.1],[1,1,1],false);
  campClear.rotation.x=-Math.PI/2;
  // Portale Goblin 0.20: legno grezzo e bandiere rosse, varco centrale aperto.
  // I pilastri non attraversano il sentiero verso il Boss.
  const campGate=new THREE.Group();campGate.name='Ingresso_Boss_legno_Goblin_020';
  campGate.position.set(16,0,-14.8);goblinDistrict.add(campGate);
  for(const side of [-1,1]){
    const x=side*2.25;
    const post=mesh(new THREE.CylinderGeometry(.34,.43,4.15,7),em.woodDark,campGate,[x,2.05,0],[1,1,1],false);
    post.rotation.z=side*.045;
    mesh(new THREE.ConeGeometry(.43,.85,7),em.woodDark,campGate,[x,4.50,0],[1,1,1],false);
    const ribbon=mesh(new THREE.PlaneGeometry(.76,1.30),em.banner,campGate,[x,3.18,.48],[1,1,1],false);
    ribbon.rotation.y=0;
    mesh(new THREE.BoxGeometry(.72,.24,.72),em.woodLight,campGate,[x,1.5,0],[1,1,1],false);
  }
  const beam=mesh(new THREE.CylinderGeometry(.28,.34,5.15,8),em.wood,campGate,[0,4.0,0],[1,1,1],false);
  beam.rotation.z=Math.PI/2;
  mesh(new THREE.BoxGeometry(1.15,.85,.16),em.banner,campGate,[0,3.52,.36],[1,1,1],false);
  // Gli slot sono generati sul bordo: ingresso a nord libero per il sentiero.
  const goblinWallSlots=[];
  function wallRow(x1,x2,z,gate=false){
    const segments=Math.ceil((x2-x1)/3.7),step=(x2-x1)/segments;
    for(let i=0;i<segments;i++){
      const x=x1+(i+.5)*step;
      if(gate&&x>8.8&&x<19.0)continue;
      goblinWallSlots.push(['goblin_fence',[x,0,z],2.18,0]);
    }
  }
  function wallColumn(x,z1,z2){
    const segments=Math.ceil((z2-z1)/3.7),step=(z2-z1)/segments;
    for(let i=0;i<segments;i++)goblinWallSlots.push(['goblin_fence',[x,0,z1+(i+.5)*step],2.18,Math.PI/2]);
  }
  wallRow(7.5,29.5,-20.0,false);wallRow(7.5,29.5,-2.6,true);
  wallColumn(7.5,-20,-2.6);wallColumn(29.5,-20,-2.6);
  const goblinTowerSlots=[[8.0,-19.5],[29.0,-19.5],[8.0,-3.0],[29.0,-3.0]]
    .map(([x,z],i)=>['goblin_tower',[x,0,z],3.95,i*Math.PI/2]);
  // I collider sono aggiunti dopo la creazione delle strutture di collisione.
  // [modello, posizione X/Y/Z, altezza, rotazione Y]
  // Biomi: spiaggia a ovest; pineta a nord-ovest; latifoglie a sud-est.
  // Disposizione ordinata: roccaforte aperta = ingresso del campo;
  // torri agli angoli, tende a lati del focolare, palizzate sul perimetro.
  // Arena Boss ricostruita a moduli per eliminare geometrie deformate.
  // 0.17: rocce GLB originali ottimizzate (Roccia media e Sasso grande).
  // Niente sassi tondeggianti procedurali: fallback spigoloso solo se GLB manca.
  const rockLandmarks=[
    [-18.7,5.9,1.75,.30],[-15.2,-3.6,1.55,1.1],[-11.0,-7.3,1.9,.5],
    [-8.0,-9.1,1.45,1.8],[-3.8,5.7,1.65,.3],[.2,-7.0,1.6,1.0],
    [9.5,5.2,1.65,2.2],[23.8,-3.8,1.75,1.2],[-21.0,20.8,1.35,.5]
  ];

  const environmentSlots=[
    // Torrette 3D ai quattro angoli, palizzate 3D sui lati e tende 3D all'interno.
    ...goblinWallSlots,...goblinTowerSlots,
    ['goblin_tent',[10.4,0,-9.0],2.20,.12],
    ['goblin_tent',[25.2,0,-9.1],2.20,-.12],
    ['goblin_tent',[10.7,0,-15.5],2.12,.34],
    ['goblin_tent',[25.0,0,-15.6],2.12,-.35],
    // Rocce modellate in 3D: gli slot sostituiscono i sassi sferici precedenti.
    ...rockLandmarks.map(([x,z,sz,rot],i)=>[i===2||i===6||i===7?'rock_big':'rock_mid',[x,0,z],sz*1.06,rot]),
    ['boat',[-20.6,.035,16.1],1.10,.18],
    ['palm',[-21.7,0,18.2],4.45,.25],
    ['palm',[-15.2,0,18.9],4.75,1.62],
    ['palm',[-21.7,0,8.4],4.10,2.15],
    ['palm',[-16.7,0,23.8],4.55,3.10],
    ['palm',[-19.6,0,6.8],4.25,.77],
    ['pine',[-21,0,-15],5.4,.22],
    ['pine',[-15.6,0,-18],5.15,1.12],
    ['pine',[-9.3,0,-16.2],5.6,2.43],
    ['pine',[-22,0,-8],4.9,2.88],
    ['pine',[-14.2,0,-10.2],5.25,.63],
    ['pine',[-7.2,0,-20],5.15,1.93],
    ['tree',[14.2,0,16.4],5.2,.35],
    ['tree',[19.1,0,15.2],5.55,1.7],
    ['tree',[22.0,0,20.2],5.0,2.6],
    ['tree',[10.6,0,20.4],4.8,.55],
    ['tree',[20.2,0,8.7],5.35,1.25],
    ['tree',[10.5,0,12.4],4.95,3.05],
    // I due lati del percorso nel bosco sono leggibili e riconoscibili.
    ['pine',[-19.0,0,1.0],5.15,.7],
    ['pine',[-15.6,0,-8.0],5.50,1.6],
    ['pine',[-11.4,0,-9.5],5.25,2.4],
    ['pine',[-6.1,0,-9.3],5.0,.2],
    ['pine',[-9.0,0,5.2],4.8,2.1],
    ['tree',[-3.1,0,5.7],5.15,.9],
    ['tree',[0.1,0,-7.2],5.35,1.9],
    ['tree',[8.5,0,6.0],5.1,2.4],
    ['tree',[10.3,0,-9.8],5.1,.4],
    ['tree',[24.8,0,-5.3],5.0,1.2]
  ];
  // Alpha 0.13: collisioni leggere indipendenti dai poligoni GLB.
  // Cerchi per tronchi/rocce, rettangoli orientati per edifici e recinti.
  // Sono registrate SOLO quando il modello relativo viene caricato.
  const solidCircles=[],solidBoxes=[];
  const PLAYER_RADIUS=.37;
  function addCircle(x,z,r){solidCircles.push({x,z,r});}
  // Collider delle rocce aggiunti solo dopo che il GLB risulta visibile.
  function addBox(x,z,hx,hz,angle=0){
    solidBoxes.push({x,z,hx,hz,c:Math.cos(angle),s:Math.sin(angle)});
  }
  // Collisioni aggiunte per ciascun GLB caricato, senza muri invisibili.
  function registerModelCollision(key,pos,height,angle){
    const [x,,z]=pos;
    if(key==='boat')addBox(x,z,2.38,.82,angle);
    else if(key==='pine')addCircle(x,z,.52);
    else if(key==='tree')addCircle(x,z,.62);
    else if(key==='palm')addCircle(x,z,.43);
    else if((key==='rock_mid'||key==='rock_big')&&height>=.60)addCircle(x,z,Math.max(.24,height*.49));
    else if(key==='goblin_tower')addCircle(x,z,1.22);
    else if(key==='goblin_tent')addBox(x,z,1.25,1.18,angle);
    else if(key==='goblin_fence')addBox(x,z,1.83,.30,angle);
    else if(key==='gate_back')return; // solo scenografia, il portale resta attraversabile
    else if(key==='fort_open'){
      // Il modello e un grande portale: i pilastri sono solidi,
      // ma il varco centrale resta sempre attraversabile.
      addBox(x-3.2,z,1.35,.60,angle);
      addBox(x+3.2,z,1.35,.60,angle);
    }
    }
  function collisionAt(x,z,r=.37,includeEnemies=false){
    if(currentArea==='boss'){
      const dx=x-BOSS_X,dz=z-BOSS_Z;
      // Arena circolare con bordo solido: entrata e uscita tramite porta.
      if(Math.hypot(dx/1.0,dz/.94)>15.15-r)return true;
      if(includeEnemies){
        for(const e of enemies){
          if(e.userData.kind!=='boss')continue;
          if(Math.hypot(x-e.position.x,z-e.position.z)<r+1.12)return true;
        }
      }
      return false;
    }
    // Non permettere al giocatore di camminare fuori dall'isola.
    if(!insideIsland(x,z)||nearIslandEdge(x,z,r))return true;
    // Costa ovest: il personaggio non entra nel mare.
    if(z>3&&z<30){
      const coastEdge=-23.6+.55*Math.sin(z*.42)+.18*Math.cos(z*.85);
      if(x<coastEdge+r+.35)return true;
    }
    // Laghetto: perimetro ellittico, con margine per il personaggio.
    if(((x+10)/(3.5+r))**2+((z-9)/(2.2+r))**2<1)return true;
    // Fiume: attraversabile soltanto sul ponte a z=0.7.
    if(z>-31&&z<31){
      const riverX=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
      const bridgePass=Math.abs(z-.7)<1.52;
      if(Math.abs(x-riverX)<1.30+r&&!bridgePass)return true;
    }
    // L'arena e' una mappa indipendente: non usare i collider del bosco.
    for(const c of solidCircles){
      const dx=x-c.x,dz=z-c.z,R=c.r+r;
      if(dx*dx+dz*dz<R*R)return true;
    }
    for(const b of solidBoxes){
      const dx=x-b.x,dz=z-b.z;
      const lx=dx*b.c-dz*b.s,lz=dx*b.s+dz*b.c;
      const cx=Math.max(-b.hx,Math.min(b.hx,lx));
      const cz=Math.max(-b.hz,Math.min(b.hz,lz));
      if((lx-cx)**2+(lz-cz)**2<r*r)return true;
    }
    if(includeEnemies){
      for(const e of enemies){
        const rad=e.userData.kind==='boss'?1.12:.48;
        const dx=x-e.position.x,dz=z-e.position.z,R=r+rad;
        if(dx*dx+dz*dz<R*R)return true;
      }
    }
    return false;
  }
  // Quattro colonne delle rovine e falò centrale: solidi anche senza GLB.
  // 0.15: rimossi i collider invisibili delle colonne presso il ponte.
  // Restano solo i collider reali degli edifici e dei modelli caricati.
  addCircle(12.6,-8.4,.62);
  // Scivolamento: tenta la diagonale, poi i due assi separati.
  // Sottopassi per evitare di attraversare oggetti con dt variabile.
  function moveWithCollision(object,dx,dz,r=.37,checkEnemies=false){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.22));
    const sx=dx/steps,sz=dz/steps;
    for(let i=0;i<steps;i++){
      const x=object.position.x,z=object.position.z;
      if(!collisionAt(x+sx,z+sz,r,checkEnemies)){
        object.position.x=x+sx;object.position.z=z+sz;
      }else if(!collisionAt(x+sx,z,r,checkEnemies)){
        object.position.x=x+sx;
      }else if(!collisionAt(x,z+sz,r,checkEnemies)){
        object.position.z=z+sz;
      }
    }
  }
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
        const heights={pine:5.25,palm:4.5,tree:5.1,rock_mid:1.10,rock_big:1.10,boat:1.25,
          fort_open:5.25,gate_back:5.25,goblin_tower:3.9,goblin_tent:2.25,goblin_fence:2.05};
        normalizeModel(scene,heights[key]);
        for(const [name,pos,height,rotation] of environmentSlots){
          if(name!==key)continue;
          const instance=scene.clone(true),holder=new THREE.Group();
          holder.position.set(...pos);holder.rotation.y=rotation;
          if(key==='rock_mid'||key==='rock_big')holder.position.y=.025;
          // L'altezza indicata nello slot ora si applica a TUTTI i modelli.
          // Nella 0.10 solo le rocce erano scalate: la roccaforte del Boss
          // rimaneva minuscola anche modificando l'altezza nella tabella.
          holder.scale.setScalar(height/heights[key]);
          holder.add(instance);
          if(key==='boat'){
            holder.rotation.z=.035;holder.rotation.x=.02;
            holder.name='Barca_arenata_spiaggia';
            // Un'ombra piatta fa risaltare lo scafo anche su schermi piccoli.
            circularShadow(world,pos[0],pos[2],1.65,.22);
          }
          if(key==='fort_open'||key.startsWith('goblin_'))holder.name='Roccaforte_Goblin_'+key;
          world.add(holder);
          registerModelCollision(key,pos,height,rotation);
        }
      }
      // Rimuoviamo i vecchi edifici geometrici solo quando la nuova
      // roccaforte GLB è realmente visibile (fallback se manca il file).
      if(key==='fort_open')camp.visible=false;
      loadedAssets.add(key);updateAssetStatus();
    }catch(err){
      console.warn('Asset facoltativo non caricato:',key,err);
      if(key==='rock_mid'||key==='rock_big'){
        // Rocce di emergenza se il GLB non viene caricato dal browser.
        for(const [name,pos,height,rotation] of environmentSlots){
          if(name!==key)continue;
          const stone=mesh(new THREE.IcosahedronGeometry(.7,0),em.slate,world,
            [pos[0],height*.33,pos[2]],[height*.78,height*.53,height*.65],false);
          stone.rotation.y=rotation;
          registerModelCollision(key,pos,height,rotation);
        }
      }
      if(key==='boat'){
        // Non lasciare mai la spiaggia vuota se il download GLB fallisce.
        const fallback=new THREE.Group();fallback.name='Barca_emergenza';
        fallback.position.set(-20.6,.20,16.1);fallback.rotation.y=.18;
        const hull=mesh(new THREE.CylinderGeometry(.70,.42,4.2,10,1),mat('#87552f'),fallback,[0,0,0],[1,1,1],false);
        hull.rotation.z=Math.PI/2;
        const cavity=mesh(new THREE.BoxGeometry(3.4,.12,.84),mat('#3e281d'),fallback,[0,.34,0],[1,1,1],false);
        world.add(fallback);addBox(-20.6,16.1,2.38,.82,.18);
      }
      failedAssets.add(key);updateAssetStatus();
    }
  }
  const loadedAssets=new Set(),failedAssets=new Set(),weaponAssets={};
  function updateAssetStatus(){
    const el=$('#asset-status');if(el)el.textContent=`Modelli aggiuntivi: ${loadedAssets.size}/${Object.keys(modelSources).length}`+(failedAssets.size?` · ${failedAssets.size} non caricati`:'');
  }
  function attachDagger(e){
    if(e.userData.daggerAttached||!weaponAssets.dagger)return;
    const copy=weaponAssets.dagger.clone(true);
    const rig=e.userData.visual;
    const rightHand=rig?.getObjectByName('RightHand')||rig?.getObjectByName('mixamorig:RightHand');
    if(rightHand){
      // L'arma segue realmente il polso animato, senza fluttuare accanto al corpo.
      const grip=new THREE.Group();
      grip.position.set(.015,-.045,.015);
      grip.rotation.set(Math.PI*.5,0,Math.PI*.5);
      grip.scale.setScalar(.78);
      rightHand.add(grip);grip.add(copy);
    }else{
      copy.position.x+=.60;copy.position.y+=.63;copy.position.z+=.15;
      copy.rotation.z=-.65;e.userData.body.add(copy);
    }
    e.userData.daggerAttached=true;
  }
  async function loadDecorAssets(loader){
    for(const key of Object.keys(modelSources)){
      await loadOneAsset(loader,key);
    }
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
  function setEnemyAnimation(data,name){
    if(!data.animMixer)return;
    const actions=data.animActions;
    const next=actions[name]||actions.idle||actions.walk;
    if(next&&next!==data.animCurrent){
      if(data.animCurrent)data.animCurrent.fadeOut(.20);
      next.reset().fadeIn(.20).play();data.animCurrent=next;
    }
  }
  async function loadEnemyModel(type){
    if(!enemyLoader)throw Error('Caricatore non pronto');
    const paths={slime:'./slime-verde.glb?v=0200',goblin:'./assets/goblin-animato.glb?v=0200',boss:'./assets/boss.glb?v=0200'};
    const gltf=await new Promise((resolve,reject)=>enemyLoader.load(paths[type],resolve,undefined,reject));
    const model=gltf.scene;
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new V());
    if(!size.y||!Number.isFinite(size.y))throw Error('Dimensioni GLB non valide: '+type);
    const scale=(type==='boss'?3.25:type==='goblin'?1.38:1.22)/size.y;
    model.scale.setScalar(scale);
    model.position.set(-box.getCenter(new V()).x*scale,-box.min.y*scale,-box.getCenter(new V()).z*scale);
    enemyAssets[type]={scene:model,animations:gltf.animations||[]};
    for(const e of enemies)if(e.userData.kind===type)applyEnemyAsset(e);
    console.info('Modello nemico pronto:',type,'animazioni:',gltf.animations.map(a=>a.name));
  }
  function applyEnemyAsset(e){
    const data=e.userData,asset=enemyAssets[data.kind];
    if(!asset||data.meshyLoaded)return;
    data.body.clear();
    const visual=data.kind==='goblin'?cloneRiggedScene(asset.scene):asset.scene.clone(true);
    visual.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    data.body.add(visual);data.meshyLoaded=true;data.visual=visual;
    if(data.kind==='goblin'&&asset.animations.length){
      const mixer=new THREE.AnimationMixer(visual);
      const walking=asset.animations.find(a=>/walk/i.test(a.name));
      const running=asset.animations.find(a=>/run/i.test(a.name));
      const idle=makeNeutralIdle(walking||asset.animations[0]);
      data.animMixer=mixer;
      data.animActions={idle:idle?mixer.clipAction(idle):null,
        walk:walking?mixer.clipAction(walking):null,
        run:running?mixer.clipAction(running):null};
      if(data.animActions.idle){data.animActions.idle.play();data.animCurrent=data.animActions.idle;}
      mixer.update(0);
    }
    if(data.kind==='goblin')attachDagger(e);
  }
  function goblin(x,z,seed){
    const e=slime(x,z,seed);
    e.userData.kind='goblin';e.userData.hp=5;e.userData.maxHp=5;
    e.userData.speed=.85+rand(seed)*.2;
    e.userData.life.position.y=1.62;
    e.userData.fill.material=e.userData.fill.material.clone();
    e.userData.fill.material.color.set('#f59c68');
    applyEnemyAsset(e);
    return e;
  }
  function bossGoblin(x,z,seed){
    const e=slime(x,z,seed);
    e.userData.kind='boss';e.userData.hp=35;e.userData.maxHp=35; // 0.17: 35 HP
    e.userData.speed=.91;e.userData.attack=1.3;e.userData.specialCooldown=6.0;e.userData.phaseTwo=false;
    e.userData.life.position.y=3.5;
    e.userData.fill.material=e.userData.fill.material.clone();
    e.userData.fill.material.color.set('#f44e61');
    applyEnemyAsset(e);return e;
  }
  function spawnEnemy(x,z,i){
    const e=i<3?slime(x,z,i):goblin(x,z,i);
    if(i<3){e.userData.kind='slime';applyEnemyAsset(e);}
    e.userData.spawnIndex=i;
    return e;
  }
  const enemies=[];
  const origins=[[-12.5,4.1],[-7.2,2.4],[-.6,2.5],[8.1,-1.9],[13.2,-5.4]];
  origins.forEach((p,i)=>enemies.push(spawnEnemy(p[0],p[1],i)));
  let state='menu',health=100,coins=0,kills=0,cooldown=0,elapsed=0,attackSwing=0,toastTime=0,shake=0;
  let firstAmuletCollected=false,bossDefeated=false;
  const deadSpawnIndices=new Set();
  let currentArea='island',portalCooldown=0,bossSpawned=false;
  const areaTransition=$('#area-transition');
  function transitionArea(target){
    if(state!=='playing'||portalCooldown>0)return;
    state='transition';portalCooldown=2.5;playSfx(460,.32,'sine');
    if(areaTransition){areaTransition.classList.add('active');
      areaTransition.querySelector('strong').textContent=target==='boss'?'LA FORTEZZA DEL BOSS':'RITORNO ALL’ACCAMPAMENTO';
      areaTransition.querySelector('span').textContent=target==='boss'?'Preparazione dello scontro…':'Ritorno alla prima isola…';}
    setTimeout(()=>{
      currentArea=target;
      if(target==='boss'){
        hero.root.position.set(BOSS_X,0,BOSS_Z+11.3);
        if(!bossSpawned){const boss=bossGoblin(BOSS_X,BOSS_Z-3.5,89);enemies.push(boss);bossSpawned=true;}
        stage=2;toast('IL BOSS GOBLIN TI ATTENDE!',3.0);
      }else{
        hero.root.position.set(16,0,-11.5);
        toast('SEI TORNATO ALL’ACCAMPAMENTO',2.2);
      }
      camera.position.copy(hero.root.position).add(cameraOffset);
      camLook.copy(hero.root.position).add(new V(0,.8,0));
      updateHud();if(target==='boss'){checkpointId='boss';saveGame(false);}
      setTimeout(()=>{if(areaTransition)areaTransition.classList.remove('active');state='playing';},450);
    },520);
  }
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
  // Alpha 0.17: salvataggio locale versionato, nessun invio a server.
  const SAVE_KEY='the-first-spark-save-v016';
  const AUDIO_KEY='the-first-spark-audio-v016';
  let checkpointId='beach',lastSavedAt=0;
  const checkpointPositions={beach:[-17,12.1],forest:[-7,-3],camp:[16,-8.8],boss:[BOSS_X,BOSS_Z+11.3]};
  function safeRead(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}}
  function safeWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){console.warn('Salvataggio locale non disponibile',e);return false}}
  let volumeSettings={music:55,effects:75};
  const previousAudio=safeRead(AUDIO_KEY);
  if(previousAudio&&Number.isFinite(previousAudio.music)&&Number.isFinite(previousAudio.effects)){
    volumeSettings.music=THREE.MathUtils.clamp(previousAudio.music,0,100);
    volumeSettings.effects=THREE.MathUtils.clamp(previousAudio.effects,0,100);
  }
  let audioCtx=null,musicGain=null,effectsGain=null;
  function setupAudio(){
    try{
      if(!audioCtx){
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx)return;
        audioCtx=new Ctx();musicGain=audioCtx.createGain();effectsGain=audioCtx.createGain();
        musicGain.connect(audioCtx.destination);effectsGain.connect(audioCtx.destination);
        for(const [frequency,level] of [[196,.011],[293.66,.006],[392,.003]]){
          const o=audioCtx.createOscillator(),g=audioCtx.createGain();
          o.type='sine';o.frequency.value=frequency;g.gain.value=level;
          o.connect(g);g.connect(musicGain);o.start();
        }
      }
      audioCtx.resume().catch(()=>{});
      applyVolumes();
    }catch(err){console.warn('Audio non disponibile',err)}
  }
  function applyVolumes(){
    if(musicGain)musicGain.gain.value=volumeSettings.music/100;
    if(effectsGain)effectsGain.gain.value=volumeSettings.effects/100;
    safeWrite(AUDIO_KEY,volumeSettings);
    $('#music-volume').value=volumeSettings.music;$('#effects-volume').value=volumeSettings.effects;
    $('#music-value').textContent=volumeSettings.music+'%';$('#effects-value').textContent=volumeSettings.effects+'%';
  }
  function playSfx(frequency=440,duration=.12,type='sine'){
    if(!audioCtx||!effectsGain||volumeSettings.effects===0)return;
    try{
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type=type;osc.frequency.setValueAtTime(frequency,audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(90,frequency*.66),audioCtx.currentTime+duration);
      gain.gain.setValueAtTime(.11,audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
      osc.connect(gain);gain.connect(effectsGain);osc.start();osc.stop(audioCtx.currentTime+duration+.02);
    }catch(_){}
  }
  function makeSave(){
    const boss=enemies.find(e=>e.userData.kind==='boss');
    return {version:16,at:Date.now(),checkpoint:checkpointId,area:currentArea,
      health,maxHealth,coins,kills,level,xp,damage,fireRate,moveSpeed,extraArrows,pierce,regeneration,
      stage,element,upgradeLevels:{...upgradeLevels},dead:[...deadSpawnIndices],
      bossDefeated,firstAmuletCollected,bossHp:boss?boss.userData.hp:null,
      bossSpawned,upgradeQueue};
  }
  function updateContinueButton(){
    const saved=safeRead(SAVE_KEY);
    const valid=!!(saved&&saved.version===16);
    $('#continue-game').hidden=!valid;
    if(valid){const label=saved.firstAmuletCollected?'ISOLA COMPLETATA':
      saved.checkpoint==='boss'?'ARENA DEL BOSS':saved.checkpoint==='camp'?'ACCAMPAMENTO':
      saved.checkpoint==='forest'?'FORESTA':'SPIAGGIA';
      $('#continue-game').textContent='CONTINUA · '+label;}
  }
  function saveGame(manual=false){
    if(state==='menu'||state==='lost')return false;
    const ok=safeWrite(SAVE_KEY,makeSave());
    if(ok){lastSavedAt=performance.now();updateContinueButton();
      if(manual){$('#save-status').textContent='✓ Partita salvata sul dispositivo';playSfx(700,.18);}
      else toast('✦ CHECKPOINT SALVATO',1.8);
    }else if(manual)$('#save-status').textContent='Impossibile salvare: controlla lo spazio del browser.';
    return ok;
  }
  function loadSavedGame(){
    const saved=safeRead(SAVE_KEY);
    if(!saved||saved.version!==16){toast('NESSUN SALVATAGGIO DISPONIBILE');return;}
    reset();
    const fields=['health','maxHealth','coins','kills','level','xp','damage','fireRate','moveSpeed',
      'extraArrows','pierce','regeneration','stage','upgradeQueue'];
    const defaults={health:100,maxHealth:100,coins:0,kills:0,level:1,xp:0,damage:1,fireRate:1,moveSpeed:4.15,
      extraArrows:0,pierce:0,regeneration:0,stage:1,upgradeQueue:0};
    const values={};for(const key of fields){const v=saved[key];values[key]=Number.isFinite(v)?v:defaults[key];}
    ({health,maxHealth,coins,kills,level,xp,damage,fireRate,moveSpeed,extraArrows,pierce,regeneration,stage,upgradeQueue}=values);
    Object.assign(upgradeLevels,saved.upgradeLevels||{});
    element=elements[saved.element]?saved.element:'arcana';
    for(const id of saved.dead||[]){
      if(!Number.isInteger(id)||id<0||id>4)continue;
      deadSpawnIndices.add(id);
      const enemy=enemies.find(e=>e.userData.spawnIndex===id);
      if(enemy){world.remove(enemy);enemies.splice(enemies.indexOf(enemy),1);}
    }
    bossDefeated=!!saved.bossDefeated;firstAmuletCollected=!!saved.firstAmuletCollected;
    currentArea=saved.area==='boss'?'boss':'island';
    checkpointId=checkpointPositions[saved.checkpoint]?saved.checkpoint:'beach';
    if(currentArea==='boss'){
      checkpointId='boss';
      if(!bossDefeated){
        const boss=bossGoblin(BOSS_X,BOSS_Z-3.5,89);
        if(Number.isFinite(saved.bossHp))boss.userData.hp=THREE.MathUtils.clamp(saved.bossHp,1,35);
        enemies.push(boss);bossSpawned=true;
      }
    }
    const spawn=checkpointPositions[checkpointId];hero.root.position.set(spawn[0],0,spawn[1]);
    centerCrystal.visible=bossDefeated&&!firstAmuletCollected;amuletBeam.visible=centerCrystal.visible;
    refreshElement();updateHud();
    camera.position.copy(hero.root.position).add(cameraOffset);camLook.copy(hero.root.position).add(new V(0,.8,0));
    state='playing';$('#dialog').classList.remove('visible');$('#settings-overlay').classList.remove('visible');
    toast('PARTITA CARICATA · '+checkpointId.toUpperCase(),3);
    setupAudio();
  }
  function updateCheckpoint(){
    let next=checkpointId;
    if(currentArea==='boss')next='boss';
    else if(hero.root.position.x>10&&hero.root.position.z< -3.5)next='camp';
    else if(hero.root.position.x>-11&&hero.root.position.z<5)next='forest';
    const ranks={beach:0,forest:1,camp:2,boss:3};
    if(ranks[next]>ranks[checkpointId]){checkpointId=next;saveGame(false);}
  }
  function showSettings(){
    if(state!=='playing')return;
    state='paused';$('#settings-overlay').classList.add('visible');
    $('#save-status').textContent='Checkpoint: '+({beach:'Spiaggia',forest:'Foresta',camp:'Accampamento',boss:'Arena Boss'}[checkpointId]||'Spiaggia');
    applyVolumes();
  }
  function hideSettings(){if(state!=='paused')return;$('#settings-overlay').classList.remove('visible');state='playing';}
  $('#music-volume').addEventListener('input',e=>{volumeSettings.music=+e.target.value;applyVolumes();});
  $('#effects-volume').addEventListener('input',e=>{volumeSettings.effects=+e.target.value;applyVolumes();});
  $('#settings-resume').addEventListener('click',hideSettings);
  $('#settings-save').addEventListener('click',()=>saveGame(true));
  $('#settings-home').addEventListener('click',()=>{
    if(!window.confirm('Tornare alla schermata principale? I progressi non salvati andranno persi.'))return;
    $('#settings-overlay').classList.remove('visible');
    state='menu';updateContinueButton();
    showDialog('THE FIRST SPARK','Prima isola · Spiaggia, foresta, accampamento e Boss. Puoi iniziare una nuova avventura o riprendere un salvataggio.','NUOVA PARTITA');
  });
  $('#continue-game').addEventListener('click',loadSavedGame);
  applyVolumes();updateContinueButton();
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
    $('#coins').textContent='✦ '+coins+' monete';$('#kills').textContent=stage===1?'Nemici '+Math.min(kills,5)+' / 5':stage===2?(currentArea==='boss'?'BOSS GOBLIN':'PORTA DEL BOSS'):'BOSS SCONFITTO';
    $('#level').textContent='Livello '+level;$('#xpbar').style.width=(xp/xpNeeded()*100)+'%';
    $('#quest-text').textContent=firstAmuletCollected?'Isola 1 completata!':bossDefeated?'Raccogli l’Amuleto della Prima Scintilla!':currentArea==='boss'?'Sconfiggi il Boss Goblin!':stage===1?'Esplora la foresta, libera il campo e raggiungi la porta':'Attraversa la porta 3D del Boss';
    const boss=enemies.find(e=>e.userData.kind==='boss');
    const bossUI=$('#boss-health');
    if(bossUI){bossUI.classList.toggle('visible',currentArea==='boss'&&!!boss&&state!=='won');
      if(boss){$('#boss-hp-fill').style.width=(100*boss.userData.hp/boss.userData.maxHp)+'%';
        $('#boss-hp-numbers').textContent=Math.ceil(boss.userData.hp)+' / '+boss.userData.maxHp+' HP';
        $('#boss-phase').textContent=boss.userData.hp<=boss.userData.maxHp*.5?'FASE 2':'FASE 1';}}
  }
  function showDialog(title,detail,button='CONTINUA'){
    $('#dialog').classList.add('visible');$('#dialog-text').innerHTML=detail;
    $('.dialog-card h1').textContent=title;$('#start').innerHTML=button+' <span>➜</span>';
  }
  function start(){
    if(!criticalAssetsReady)return;
    if(state==='won'||state==='lost'||state==='menu')reset();
    state='playing';$('#dialog').classList.remove('visible');setupAudio();toast('Segui il sentiero e scopri la foresta!',3);
  }
  function reset(){
    for(const e of enemies)world.remove(e);enemies.length=0;
    origins.forEach((p,i)=>enemies.push(spawnEnemy(p[0],p[1],i)));
    for(const a of arrows)removeArrow(a);arrows.length=0;
    for(const a of sparks)world.remove(a.mesh);sparks.length=0;
    currentArea='island';bossSpawned=false;portalCooldown=0;deadSpawnIndices.clear();checkpointId='beach';
    if(areaTransition)areaTransition.classList.remove('active');
    hero.root.position.set(-17.0,0,12.1);health=100;maxHealth=100;coins=0;kills=0;level=1;xp=0;
    damage=1;fireRate=1;moveSpeed=4.15;extraArrows=0;pierce=0;regeneration=0;
    stage=1;element='arcana';upgradeQueue=0;Object.keys(upgradeLevels).forEach(k=>delete upgradeLevels[k]);
    $('#upgrade-overlay').classList.remove('visible');refreshElement();
    centerCrystal.visible=false;amuletBeam.visible=false;specialTelegraph.visible=false;firstAmuletCollected=false;bossDefeated=false;cooldown=0;updateHud();
  }
  $('#start').addEventListener('click',start);
  $('#pause').addEventListener('click',showSettings);
  function nearestEnemy(){
    let best=null,dmin=9.0;for(const e of enemies){const d=e.position.distanceTo(hero.root.position);if(d<dmin){best=e;dmin=d}}
    return best;
  }
  function shoot(){
    if(state!=='playing'||cooldown>0)return;
    cooldown=.49/fireRate;attackSwing=1;playSfx(550,.095,'triangle');
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
    if(k==='escape'&&state==='playing')$('#pause').click();else if(k==='escape'&&state==='paused')hideSettings();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();move.x=move.y=0;resetStick()});
  const joy=$('#joy'),nub=$('#joy-center');
  let joyMoved=false;
  function resetStick(){
    move.x=move.y=0;nub.style.transform='translate(-50%,-50%)';joyPointer=null;
    joy.classList.remove('floating');joy.style.left='';joy.style.top='';joy.style.bottom='';
    joyMoved=false;
  }
  function applyStick(e){
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;
    const limit=r.width*.34,len=Math.hypot(dx,dy);
    if(len>limit){dx=dx/len*limit;dy=dy/len*limit;}
    move.x=dx/limit;move.y=dy/limit;
    nub.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  }
  // Floating joystick: ogni tocco libero nella meta' sinistra lo attiva.
  // Non intercetta pausa, dialoghi o pulsanti; l'arco a destra e' invariato.
  document.addEventListener('pointerdown',e=>{
    if(state!=='playing'||joyPointer!==null||e.clientX>innerWidth*.49||e.clientY<58)return;
    if(e.target.closest('button,input,a,#dialog,#settings-overlay,#upgrade-overlay,#mini-map-wrap'))return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();
    const size=joy.getBoundingClientRect().width;
    const cx=Math.max(size/2+8,Math.min(innerWidth*.49-size/2-5,e.clientX));
    const cy=Math.max(size/2+8,Math.min(innerHeight-size/2-8,e.clientY));
    joy.classList.add('floating');joy.style.left=(cx-size/2)+'px';
    joy.style.top=(cy-size/2)+'px';joy.style.bottom='auto';
    joyPointer=e.pointerId;joyMoved=true;
    try{joy.setPointerCapture(e.pointerId)}catch(_){/* window fallback */}
    applyStick(e);
  },{capture:true,passive:false});
  window.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)applyStick(e)},{passive:true});
  window.addEventListener('pointerup',e=>{if(e.pointerId===joyPointer)resetStick()});
  window.addEventListener('pointercancel',e=>{if(e.pointerId===joyPointer)resetStick()});
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
    if(kind==='boss')specialTelegraph.visible=false;
    if(Number.isInteger(e.userData.spawnIndex))deadSpawnIndices.add(e.userData.spawnIndex);
    world.remove(e);const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);
    const reward=kind==='boss'?150:kind==='goblin'?30:20;
    coins+=reward;kills++;updateHud();playSfx(kind==='boss'?800:600,.25,'triangle');
    toast('✦ +'+reward+' MONETE · '+kind.toUpperCase()+' SCONFITTO!',1.6);
    if(kind==='boss'){
      stage=3;bossDefeated=true;centerCrystal.visible=true;amuletBeam.visible=true;
      sparkAt(altar.position.clone().add(new V(0,1.5,0)),'#9bffe3',24);
      toast('BOSS SCONFITTO! RACCOGLI L’AMULETO LUMINOSO!',4.5);
      updateHud();
      return;
    }
    gainXp(kind==='goblin'?20:12);
    if(stage===1&&kills>=5){
      stage=2;
      // La battaglia comincia solo oltrepassando il portale 3D.
      toast('ACCAMPAMENTO LIBERATO! ATTRAVERSA LA PORTA DEL BOSS!',5);updateHud();
    }
  }
  function hurt(e,a){
    const data=e.userData;
    data.hp=Math.max(0,data.hp-damage);data.flash=.16;data.life.visible=true;
    data.fill.scale.x=Math.max(.01,data.hp/data.maxHp);
    if(data.kind==='boss')updateHud();
    if(a?.element==='ice')data.slow=Math.max(data.slow||0,2.8);
    // Il fuoco applica una sola bruciatura breve, senza sommare tick
    // a ogni freccia. Rimane utile ma non elimina il Boss in pochi colpi.
    if(a?.element==='fire'&&!(data.burn>0)){data.burn=1.65;data.burnTick=0;}
    sparkAt(e.position.clone().add(new V(0,.52,0)),elements[a?.element||'arcana'].color,5);
    if(data.hp<=0)defeated(e);
  }
  function takeDamage(amount){
    health=Math.max(0,health-amount);updateHud();shake=.25;playSfx(170,.19,'sawtooth');
    if(navigator.vibrate)navigator.vibrate(24);
    if(health===0){
      state='lost';showDialog('LA SCINTILLA SI È SPENTA','Hai raccolto <b>'+coins+' monete</b> e raggiunto il livello <b>'+level+'</b>. Riprova e scegli potenziamenti diversi.','RIPROVA');
    }
  }
  let normalCameraSpan=8.5;
  function resize(){
    const w=window.innerWidth,h=window.innerHeight;
    renderer.setSize(w,h,false);
    // Area visibile costante in altezza per far risaltare davvero il personaggio 3D.
    normalCameraSpan=h<450?8.2:8.5;
    const span=normalCameraSpan;
    camera.top=span;camera.bottom=-span;camera.right=span*w/h;camera.left=-camera.right;camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',resize);resize();
  // Mini-mappa in Canvas 2D: nessuna texture aggiuntiva da scaricare.
  const mini=$('#mini-map'),miniCtx=mini?.getContext('2d');
  let miniClock=0,lastRegion='';
  function updateMiniMap(dt){
    miniClock+=dt;if(!miniCtx||miniClock<.18)return;miniClock=0;
    const c=miniCtx,W=c.canvas.width,H=c.canvas.height;
    if(currentArea==='boss'){
      c.clearRect(0,0,W,H);c.fillStyle='#b9dadd';c.fillRect(0,0,W,H);
      c.fillStyle='#ada48f';c.beginPath();c.arc(W/2,H/2,55,0,Math.PI*2);c.fill();
      c.strokeStyle='#625d51';c.lineWidth=8;c.stroke();
      c.fillStyle='#d15e4b';c.beginPath();c.arc(W/2,H/2-12,6,0,Math.PI*2);c.fill();
      const hx=W/2+(hero.root.position.x-BOSS_X)*3.3;
      const hz=H/2+(hero.root.position.z-BOSS_Z)*3.3;
      c.fillStyle='#fff4c8';c.strokeStyle='#215e91';c.lineWidth=2;
      c.beginPath();c.arc(hx,hz,5,0,Math.PI*2);c.fill();c.stroke();
      if(lastRegion!=='ARENA DEL BOSS GOBLIN'){
        $('#region-name').textContent='ARENA DEL BOSS GOBLIN';lastRegion='ARENA DEL BOSS GOBLIN';
      }
      return;
    }
    const mapX=x=>(x+39)/78*W,mapY=z=>(z+39)/78*H;
    c.clearRect(0,0,W,H);
    c.fillStyle='#268dbb';c.fillRect(0,0,W,H); // mare vero su ogni lato
    c.beginPath();islandOutline.forEach(([x,z],i)=>i?c.lineTo(mapX(x),mapY(z)):c.moveTo(mapX(x),mapY(z)));
    c.closePath();c.fillStyle='#a7c393';c.fill();
    c.strokeStyle='#f4dfb4';c.lineWidth=3;c.stroke();
    // Piccoli gruppi di alberi: indizi geografici, non una seconda scena 3D.
    c.fillStyle='#679d73';for(let i=0;i<60;i++){
      const x=(rand(i*7+6)-.5)*56,z=(rand(i*13+26)-.5)*56;
      if(!insideIsland(x,z))continue;
      c.beginPath();c.arc(mapX(x),mapY(z),1.1+rand(i*11)*1.3,0,Math.PI*2);c.fill();
    }
    c.fillStyle='#e0cda2';c.beginPath();c.ellipse(mapX(-10),mapY(9),14,10,0,0,Math.PI*2);c.fill();
    c.fillStyle='#72b6b5';c.beginPath();c.ellipse(mapX(-10),mapY(9),11,7,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#c7a978';c.lineWidth=6;c.lineCap='round';c.beginPath();
    pathPts.forEach(([x,z],i)=>i?c.lineTo(mapX(x),mapY(z)):c.moveTo(mapX(x),mapY(z)));c.stroke();
    c.strokeStyle='#268dbb';c.lineWidth=7;c.beginPath();
    for(let i=0;i<=60;i++){
      const z=-33+i*66/60,x=4.1+.83*Math.sin(z*.19+.3)+.28*Math.sin(z*.43);
      if(i)c.lineTo(mapX(x),mapY(z));else c.moveTo(mapX(x),mapY(z));
    }c.stroke();
    c.fillStyle='#9b7050';c.fillRect(mapX(16)-10,mapY(-9)-8,20,16);
    c.strokeStyle='#624d37';c.lineWidth=2;c.strokeRect(mapX(16)-10,mapY(-9)-8,20,16);
    c.fillStyle='#394c4b';c.fillRect(mapX(16)-5,mapY(-14.5)-4,10,7);
    c.fillStyle='#e9d4a7';c.beginPath();c.ellipse(mapX(-20),mapY(14),13,12,0,0,Math.PI*2);c.fill();
    c.fillStyle='#e3caa0';c.fillRect(mapX(4.5)-6,mapY(.7)-3,12,6);
    c.fillStyle='#b7e4ef';c.beginPath();c.arc(mapX(9),mapY(1.45),5,0,Math.PI*2);c.fill();
    for(const e of enemies){c.fillStyle=e.userData.kind==='boss'?'#b94336':'#c56d42';c.beginPath();c.arc(mapX(e.position.x),mapY(e.position.z),e.userData.kind==='boss'?4.4:2.5,0,Math.PI*2);c.fill();}
    const px=mapX(hero.root.position.x),py=mapY(hero.root.position.z);
    c.fillStyle='#fff4c8';c.strokeStyle='#215e91';c.lineWidth=2.3;c.beginPath();c.arc(px,py,4.3,0,Math.PI*2);c.fill();c.stroke();
    let region='BOSCO DEL RISVEGLIO';
    if(Math.hypot(hero.root.position.x-16,hero.root.position.z+14.5)<3)region='PORTA DEL BOSS';
    else if(Math.hypot(hero.root.position.x-16,hero.root.position.z+9)<8)region='AVAMPOSTO GOBLIN';
    else if(Math.hypot(hero.root.position.x-9,hero.root.position.z-1.45)<4)region='ROVINE DEL CRISTALLO';
    else if(hero.root.position.x< -15&&hero.root.position.z>5)region='SPIAGGIA DEL NAUFRAGIO';
    else if(hero.root.position.x< -7&&hero.root.position.z< -8)region='PINETA DEI VENTI';
    else if(hero.root.position.x>9&&hero.root.position.z>8)region='BOSCO DELLE FOGLIE';
    else if(Math.hypot(hero.root.position.x+10,hero.root.position.z-9)<6)region='LAGHETTO CRISTALLINO';
    else if(Math.abs(hero.root.position.x-(4.1+.83*Math.sin(hero.root.position.z*.19+.3)+.28*Math.sin(hero.root.position.z*.43)))<3)region='FIUME DELLE SCINTILLE';
    if(region!==lastRegion){$('#region-name').textContent=region;lastRegion=region;}
  }
  // FPS mobile: riduce la risoluzione interna solo se gli scatti persistono.
  let fpsFrames=0,fpsAccum=0,fpsWindow=0;
  function adaptResolution(dt){
    if(!mobileDevice||dt<=0)return;
    fpsFrames++;fpsAccum+=dt;fpsWindow+=dt;
    if(fpsWindow<5)return;
    const fps=fpsFrames/Math.max(.001,fpsAccum);
    const target=fps<26?Math.max(.70,qualityScale-.12):fps>52?Math.min(1,qualityScale+.08):qualityScale;
    if(Math.abs(target-qualityScale)>.03){qualityScale=target;renderer.setPixelRatio(qualityScale);}
    fpsFrames=0;fpsAccum=0;fpsWindow=0;
  }
  const camLook=new V();
  const zero=new V();
  function tick(){
    requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.045);elapsed+=dt;adaptResolution(dt);
    // L'ambiente è vivo anche quando è aperto il menu.
    // Gli alberi GLB rimangono statici per limitare il carico GPU su iPhone.
    for(const [i,r] of ripples.entries()){
      const k=.83+((elapsed*.20+i*.23)%1)*.30;
      r.scale.set(k,k*.72,1);r.material.opacity=.18*(1-((elapsed*.20+i*.23)%1));
    }
    if(currentArea!=='boss')animateEnvironment(elapsed);
    else for(const f of flames){f.mesh.scale.y=.88+.19*Math.sin(elapsed*9+f.phase);}
    updateMiniMap(dt);
    if(centerCrystal.visible){centerCrystal.rotation.y=elapsed*.85;centerCrystal.position.y=1.48+Math.sin(elapsed*2.6)*.18;glow.intensity=1.1+Math.sin(elapsed*3)*.35;amuletBeam.material.opacity=.13+.07*Math.sin(elapsed*2);}
    if(state==='playing'){
      const x=move.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
      const y=move.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      const dist=Math.hypot(x,y);
      const strength=Math.min(1,dist);
      updateHeroAnimation(dt,dist);
      if(dist>.08){
        const mx=x/dist,my=y/dist;
        // Asse del joystick allineato alla telecamera isometrica.
        const vx=(mx+my)*Math.SQRT1_2,vz=(my-mx)*Math.SQRT1_2;
        const oldX=hero.root.position.x,oldZ=hero.root.position.z;
        moveWithCollision(hero.root,vx*moveSpeed*dt*strength,vz*moveSpeed*dt*strength,PLAYER_RADIUS,true);
        if(currentArea==='island'){
          hero.root.position.x=THREE.MathUtils.clamp(hero.root.position.x,-39,39);
          hero.root.position.z=THREE.MathUtils.clamp(hero.root.position.z,-46,41);
        }
        if(Math.hypot(hero.root.position.x-oldX,hero.root.position.z-oldZ)<.0001)hero.motion.position.y=.02;
        facing.set(vx,0,vz);hero.motion.position.y=.045+Math.sin(elapsed*13)*.04;
        hero.legs[0].rotation.x=Math.sin(elapsed*12)*.20;
        hero.legs[1].rotation.x=-hero.legs[0].rotation.x;
        hero.arms[0].rotation.x=Math.sin(elapsed*12)*.07;
      }else{
        hero.motion.position.y=THREE.MathUtils.lerp(hero.motion.position.y,Math.sin(elapsed*2.5)*.021,dt*8);
        for(const leg of hero.legs)leg.rotation.x*=.8;
        hero.arms[0].rotation.x*=.82;
      }
      // La porta del Boss e' il modello 3D in fondo al campo:
      // il trigger scatta solo attraversando la sua soglia, non toccando un'icona.
      portalCooldown=Math.max(0,portalCooldown-dt);
      if(currentArea==='island'&&Math.abs(hero.root.position.x-16)<1.6&&
         hero.root.position.z< -14.55&&hero.root.position.z> -18.5){
        transitionArea('boss');
      }else if(currentArea==='boss'&&Math.abs(hero.root.position.x-BOSS_X)<2.2&&
               hero.root.position.z>BOSS_Z+13.1){
        transitionArea('island');
      }
      updateCheckpoint();
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
          if(data.burnTick>=1.3){data.burnTick=0;data.hp=Math.max(0,data.hp-1);data.life.visible=true;data.fill.scale.x=Math.max(.01,data.hp/data.maxHp);
            if(data.kind==='boss')updateHud();
            if(data.hp<=0){defeated(e);continue;}}
        }
        data.slow=Math.max(0,(data.slow||0)-dt);
        const slowFactor=data.slow>0?.55:1;
        const reach=data.kind==='boss'?1.65:1.03;
        let actuallyMoved=false;
        if(d<9.5&&d>reach){
          const er=data.kind==='boss'?1.10:.43;
          const beforeX=e.position.x,beforeZ=e.position.z;
          moveWithCollision(e,dx/d*data.speed*slowFactor*dt,dz/d*data.speed*slowFactor*dt,er,false);
          actuallyMoved=Math.hypot(e.position.x-beforeX,e.position.z-beforeZ)>dt*.04;
        }
        if(data.animMixer){
          setEnemyAnimation(data,actuallyMoved?(d<4.2?'run':'walk'):'idle');
          data.animMixer.update(dt);
        }
        if(data.kind==='boss'){
          if(!data.phaseTwo&&data.hp<=data.maxHp*.5){
            data.phaseTwo=true;data.speed*=1.13;data.specialCooldown=2.1;
            toast('⚠ IL GOBLIN MAGGIORE ENTRA NELLA SECONDA FASE!',3);
          }
          if(data.phaseTwo){
            data.specialCooldown=Math.max(0,(data.specialCooldown||0)-dt);
            if(data.specialWindup!==undefined){
              data.specialWindup-=dt;
              specialTelegraph.visible=true;
              specialTelegraph.position.set(e.position.x,.09,e.position.z);
              specialTelegraph.material.opacity=.28+.36*Math.abs(Math.sin(elapsed*9));
              if(data.specialWindup<=0){
                specialTelegraph.visible=false;
                if(Math.hypot(hero.root.position.x-e.position.x,hero.root.position.z-e.position.z)<4.1)takeDamage(15);
                sparkAt(e.position.clone().add(new V(0,.2,0)),'#ffb65e',30);
                data.specialCooldown=7.0;delete data.specialWindup;
              }
            }else if(data.specialCooldown<=0&&d<7){
              delete data.attackWindup;data.attack=2.0;data.specialWindup=1.35;
              toast('⚠ ONDA D’URTO! ALLONTANATI DAL CERCHIO!',1.7);
            }
          }
          // Faccia a faccia: carica il colpo, poi colpisce solo se il mago
          // è ancora a distanza. Una schivata laterale evita il danno.
          if(d<2.6&&data.attackWindup===undefined&&data.specialWindup===undefined&&data.attack<=0){
            data.attackWindup=.85;toast('⚠ IL GOBLIN MAGGIORE PREPARA UN COLPO!',.9);
          }
          if(data.attackWindup!==undefined){
            data.attackWindup-=dt;
            if(data.attackWindup<=0){
              if(d<2.6)takeDamage(18);
              data.attack=2.0;delete data.attackWindup;
            }
          }else data.attack-=dt;
        }else if(d<reach){data.attack-=dt;if(data.attack<=0){takeDamage(9);data.attack=1.28}}
        const b=data.body;
        // Il colpo non moltiplica più la scala a ogni fotogramma:
        // il Boss torna sempre alle proporzioni originali.
        const sway=Math.sin(elapsed*6+data.phase);
        const pulse=data.flash>0?1+.035*Math.min(1,data.flash/.16):1;
        b.scale.set((1-(data.kind!=='slime'?.008:.036)*sway)*pulse,
          (1+(data.kind!=='slime'?.012:.055)*sway)*pulse,pulse);
        b.position.y=Math.max(0,Math.sin(elapsed*3+data.phase)*.035);
        b.rotation.y=Math.atan2(dx,dz);
        if(data.flash>0)data.flash=Math.max(0,data.flash-dt);
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
      if(bossDefeated&&!firstAmuletCollected&&currentArea==='boss'&&
         Math.hypot(hero.root.position.x-altar.position.x,hero.root.position.z-altar.position.z)<2.15){
        firstAmuletCollected=true;centerCrystal.visible=false;amuletBeam.visible=false;
        sparkAt(altar.position.clone().add(new V(0,1.5,0)),'#ffe5a1',32);
        state='won';updateHud();saveGame(false);
        showDialog('ISOLA COMPLETATA!',
          'Hai sconfitto il <b>Goblin Maggiore</b> e raccolto l’<b>Amuleto della Prima Scintilla</b>!<br>'+ 
          '✦ Amuleto 1 / 10 conservato nella collezione.<br>Livello raggiunto: <b>'+level+'</b> · Monete: <b>'+coins+'</b>.',
          'GIOCA DI NUOVO');
      }
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
    if(currentArea==='boss'){
      const boss=enemies.find(e=>e.userData.kind==='boss');
      if(boss){
        // Camera isometrica A: mago e Boss nello stesso fotogramma,
        // con più peso al mago per non perderlo mai di vista.
        target.lerp(boss.position.clone().add(new V(0,1.0,0)),.28);
      }
    }
    const desired=target.clone().add(cameraOffset);
    camera.position.lerp(desired,Math.min(1,dt*5.0));
    camLook.lerp(target,Math.min(1,dt*6));camera.lookAt(camLook);
    // L'arena del Boss occupa ~33 metri: quando ci si avvicina la
    // telecamera si allarga gradualmente per mostrarne l'estensione.
    const arenaBlend=currentArea==='boss'?1:0;
    const bossForView=enemies.find(e=>e.userData.kind==='boss');
    const duelDistance=bossForView?hero.root.position.distanceTo(bossForView.position):0;
    const bossSpan=THREE.MathUtils.clamp(8.2+duelDistance*.15,8.7,10.2);
    const spanTarget=THREE.MathUtils.lerp(normalCameraSpan,bossSpan,arenaBlend);
    const nextSpan=THREE.MathUtils.lerp(camera.top,spanTarget,Math.min(1,dt*2.2));
    if(Math.abs(nextSpan-camera.top)>.001){
      camera.top=nextSpan;camera.bottom=-nextSpan;
      camera.right=nextSpan*window.innerWidth/window.innerHeight;
      camera.left=-camera.right;camera.updateProjectionMatrix();
    }
    if(shake>0){shake-=dt;camera.position.x+=(rand(elapsed*246)-.5)*shake*.12}
    renderer.render(scene,camera);
  }
  camera.position.copy(hero.root.position).add(cameraOffset);
  camLook.copy(hero.root.position).add(new V(0,.8,0));camera.lookAt(camLook);
  updateHud();tick();initializeModels();
  refreshElement();updateAssetStatus();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=0200').catch(()=>{});
}
