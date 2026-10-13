// Cache rigenerata per il nuovo stile 3D. I file sorgente vengono cercati prima online.
const CACHE='first-spark-alpha04-meshy-0340';
const STATIC=['./','./index.html','./style.css?v=0331','./game.js?v=0340','./mago-colorato.glb','./manifest.webmanifest','./icons/cover.jpg','./icons/personaggio-originale.jpg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('first-spark')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  if(req.mode==='navigate'||/\.(?:js|css|html)(?:\?|$)/.test(new URL(req.url).pathname)){
    event.respondWith(fetch(req).then(response=>{
      const copy=response.clone();if(response.ok)caches.open(CACHE).then(cache=>cache.put(req,copy));return response;
    }).catch(()=>caches.match(req).then(res=>res||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return res;
  })));
});
