// WoV Send — service worker: catches the OS-level Share, hands files to the page
const CACHE_NAME = "wov-send-share-v1";

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { self.clients.claim(); });

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname.endsWith("/share-target.html")) {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const files = formData.getAll("photos");
      const cache = await caches.open(CACHE_NAME);
      await cache.put("shared-files", new Response(JSON.stringify({ count: files.length })));
      // store each file's bytes under its own cache key
      let i = 0;
      for (const f of files) {
        await cache.put("shared-file-" + i, new Response(f, { headers: { "X-Name": f.name || ("photo" + i + ".jpg") } }));
        i++;
      }
      return Response.redirect("./share-target.html?shared=1", 303);
    })());
  }
});
