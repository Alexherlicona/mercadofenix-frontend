// public/sw.js
//
// Este archivo debe ir en la carpeta /public de tu proyecto Next.js, para
// que quede servido en la RAÍZ del sitio: https://tudominio.com/sw.js
// (si lo sirves desde una subcarpeta, su alcance (scope) queda limitado a
// esa subcarpeta y no podrá controlar notificaciones para todo el sitio).
//
// Este Service Worker es la pieza que FALTABA: tu backend (push_service.py)
// ya mandaba correctamente los Web Push vía pywebpush, pero sin este
// archivo no había nada en el navegador escuchando ese envío — por eso las
// notificaciones solo aparecían dentro de la campana mientras la pestaña
// de Mercado Fénix estaba abierta (el polling cada 30s del hook), nunca
// como una notificación real del sistema operativo con la app cerrada.

self.addEventListener("install", () => {
  // Activar este SW de inmediato, sin esperar a que se cierren las pestañas
  // antiguas que pudieran tener una versión previa controlándolas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Evento push: llega cuando el servidor envía una notificación ─────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Por si algún día se manda texto plano en vez de JSON
    data = { titulo: "Mercado Fénix", cuerpo: event.data ? event.data.text() : "" };
  }

  const titulo = data.titulo || "Mercado Fénix";
  const opciones = {
    body: data.cuerpo || "",
    icon: data.icono || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined,    // si viene "tag", agrupa/reemplaza notifs repetidas en vez de apilarlas
    renotify: !!data.tag,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

// ── Clic en la notificación: enfocar una pestaña ya abierta o abrir una nueva ─
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        try {
          const clienteUrl = new URL(cliente.url);
          if (clienteUrl.origin === self.location.origin && "focus" in cliente) {
            if ("navigate" in cliente) cliente.navigate(url);
            return cliente.focus();
          }
        } catch (e) { /* ignorar y seguir con el siguiente cliente */ }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});