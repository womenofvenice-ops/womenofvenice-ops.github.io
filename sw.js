// WoV Send — service worker: catches the OS-level Share, hands files to the page
const CACHE_NAME = "wov-send-share-v2";

self.addEventListener("install", (e) => { 
  self.skipWaiting(); 
});

self.addEventListener("activate", (e) => { 
  // 🛡️ Prune old cache versions on update
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // 🛡️ Strictly handle OS-level Share Target POST requests
  if (event.request.method === "POST" && url.pathname.endsWith("/share-target.html")) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const files = formData.getAll("photos");
        const cache = await caches.open(CACHE_NAME);
        
        await cache.put("shared-files", new Response(JSON.stringify({ count: files.length })));
        
        // Store each file's bytes with URL-safe encoded filenames (prevents ASCII header crash)
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const safeName = encodeURIComponent(f.name || ("photo" + i + ".jpg"));
          await cache.put(
            "shared-file-" + i, 
            new Response(f, { headers: { "X-Name": safeName, "Content-Type": f.type || "image/jpeg" } })
          );
        }
        
        // 🛡️ Absolute URL redirect prevents Chromium TypeError
        const redirectUrl = new URL("./share-target.html?shared=1", self.location.href).href;
        return Response.redirect(redirectUrl, 303);
      } catch (err) {
        // Fallback redirect if parsing fails
        return Response.redirect(new URL("./share-target.html?error=1", self.location.href).href, 303);
      }
    })());
  }
});
