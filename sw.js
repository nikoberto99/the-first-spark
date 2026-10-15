const CACHE='first-spark-alpha08-shell-0800';
const ASSET_CACHE='first-spark-alpha08-models-0800';
const STATIC=['./','./index.html','./style.css?v=0800','./game.js?v=0800','./manifest.webmanifest','./icons/cover.jpg','./icons/personaggio-originale.jpg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('first-spark')&&k!==CACHE&&k!==ASSET_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  const url=new URL(req.url);if(url.pathname.endsWith('.glb')){
    e.respondWith(caches.open(ASSET_CACHE).then(async cache=>{
      const cached=await cache.match(req);if(cached)return cached;
      const res=await fetch(req);
      if(res.ok)cache.put(req,res.clone()).catch(()=>{});
      return res;
    }));
    return;
  }
  e.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res}).catch(()=>caches.match(req)));
});
