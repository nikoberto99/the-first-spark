// THE FIRST SPARK Alpha 0.18 — update network-first, prevents stale 0.9/0.10.
const CACHE='first-spark-alpha018-fix0180';
const SHELL=['./','./index.html','./game.js?v=0180','./style.css?v=0180','./manifest.webmanifest','./icons/cover.jpg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(SHELL.map(url=>cache.add(url)));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('first-spark')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // I GLB con ?v=0180 sono immutabili: riutilizza la cache, senza
    // scaricare 30 MB a ogni apertura. Il cambio versione forza un nuovo URL.
    const isVersionedModel=new URL(request.url).pathname.endsWith('.glb') &&
      new URL(request.url).searchParams.get('v')==='0180';
    if(isVersionedModel){
      const existing=await cache.match(request);
      if(existing)return existing;
    }
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok)cache.put(request,response.clone()).catch(()=>{});
      return response;
    }catch(error){
      const cached=await cache.match(request,{ignoreSearch:true});
      if(cached)return cached;
      throw error;
    }
  })());
});
