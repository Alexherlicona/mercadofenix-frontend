// src/hooks/useNotificaciones.ts
//
// Hook que:
// 1. Registra el Service Worker (/sw.js)
// 2. Pide permiso de notificaciones al usuario
// 3. Suscribe al servidor Web Push y envía la suscripción al backend
// 4. Expone el número de notificaciones no leídas y la lista completa
//
// Uso:
//   const { noLeidas, notificaciones, pedirPermiso, marcarLeidas } = useNotificaciones("cliente");

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 30_000; // refrescar cada 30 segundos (respaldo del push)

export type TipoUsuario = "cliente" | "vendedor";

export interface Notificacion {
  id:           number;
  titulo:       string;
  cuerpo:       string;
  url:          string;
  leida:        boolean;
  tipo:         string;
  referencia_id: number | null;
  creado_en:    string;
}

function authToken(tipo: TipoUsuario): string {
  if (typeof window === "undefined") return "";
  return tipo === "vendedor"
    ? localStorage.getItem("vendedor_token") || ""
    : localStorage.getItem("access_token")   || "";
}

function authHdr(tipo: TipoUsuario): HeadersInit {
  const tk = authToken(tipo);
  return tk ? { Authorization: `Bearer ${tk}` } : {};
}

// Convierte la clave pública VAPID (base64url) al formato Uint8Array que pide el browser
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function useNotificaciones(tipo: TipoUsuario) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas,       setNoLeidas]       = useState(0);
  const [permiso,        setPermiso]        = useState<NotificationPermission>("default");
  const [suscrito,       setSuscrito]       = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  // ── Cargar historial de notificaciones ─────────────────────────────────────
  const cargar = useCallback(async () => {
    const tk = authToken(tipo);
    if (!tk) return;

    const path = tipo === "vendedor"
      ? "/api/notificaciones/vendedor/mis-notificaciones"
      : "/api/notificaciones/mis-notificaciones";

    try {
      const res = await fetch(`${API_URL}${path}`, { headers: authHdr(tipo) });
      if (!res.ok) return;
      const data = await res.json();
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(data.no_leidas || 0);
    } catch { /* silencioso */ }
  }, [tipo]);

  // ── Marcar todas como leídas ───────────────────────────────────────────────
  const marcarLeidas = useCallback(async () => {
    const path = tipo === "vendedor"
      ? "/api/notificaciones/vendedor/marcar-leidas"
      : "/api/notificaciones/marcar-leidas";

    try {
      await fetch(`${API_URL}${path}`, {
        method:  "POST",
        headers: authHdr(tipo),
      });
      setNoLeidas(0);
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch { /* silencioso */ }
  }, [tipo]);

  // ── Suscribir al push del navegador ───────────────────────────────────────
  const suscribirPush = useCallback(async (sw: ServiceWorkerRegistration) => {
    try {
      // Obtener clave pública VAPID del servidor
      const res = await fetch(`${API_URL}/api/notificaciones/vapid-public-key`);
      if (!res.ok) {
        console.error(
          `[Push] No se pudo obtener la clave VAPID del backend (HTTP ${res.status}). ` +
          `¿Está VAPID_PUBLIC_KEY configurada en el .env del backend?`
        );
        return;
      }
      const data = await res.json();
      if (!data?.public_key) {
        console.error("[Push] El backend respondió sin 'public_key'. Revisa /api/notificaciones/vapid-public-key");
        return;
      }
      const appServerKey = urlBase64ToUint8Array(data.public_key);

      // Suscribirse al servidor push del navegador
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });

      // Detectar dispositivo
      const dispositivo = `${navigator.platform}/${
        navigator.userAgent.includes("Chrome") ? "Chrome" :
        navigator.userAgent.includes("Firefox") ? "Firefox" :
        navigator.userAgent.includes("Safari") ? "Safari" : "Otro"
      }`;

      // Enviar suscripción al backend
      const path = tipo === "vendedor"
        ? "/api/notificaciones/suscribir/vendedor"
        : "/api/notificaciones/suscribir/cliente";

      const resSub = await fetch(`${API_URL}${path}`, {
        method:  "POST",
        headers: { ...authHdr(tipo), "Content-Type": "application/json" },
        body:    JSON.stringify({ subscription: subscription.toJSON(), dispositivo }),
      });

      if (!resSub.ok) {
        console.error(
          `[Push] El backend rechazó guardar la suscripción (HTTP ${resSub.status}). ` +
          `Revisa CORS y que el token de auth sea válido.`
        );
        return;
      }

      setSuscrito(true);
      console.log("[Push] ✓ Suscrito correctamente");
    } catch (e) {
      // Causa típica aquí: applicationServerKey inválida → revisar que
      // VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en el backend sean el MISMO par
      // generado juntos (no uno de un par y otro de otro).
      console.error("[Push] Error al suscribir:", e);
    }
  }, [tipo]);

  // ── Pedir permiso explícitamente (llamar desde un botón) ──────────────────
  const pedirPermiso = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      console.warn("[Push] Este navegador no soporta Notification o Service Worker.");
      return;
    }

    const resultado = await Notification.requestPermission();
    setPermiso(resultado);

    if (resultado === "granted" && swRef.current) {
      await suscribirPush(swRef.current);
    } else if (resultado === "granted" && !swRef.current) {
      console.error(
        "[Push] Permiso concedido pero el Service Worker nunca se registró — " +
        "revisa el warning de [SW] más arriba en la consola."
      );
    }
  }, [suscribirPush]);

  // ── Inicializar: leer permiso + registrar SW ────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Leer el permiso actual SIEMPRE, sin depender de si el Service
    //    Worker logra registrarse. Antes, si el registro fallaba, este
    //    estado se quedaba en "default" para siempre y la campana volvía a
    //    pedir activar las notificaciones en cada recarga, aunque el
    //    navegador ya tuviera el permiso concedido de una vez anterior.
    if ("Notification" in window) {
      setPermiso(Notification.permission);
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("[SW] Este navegador no soporta Service Workers — el push no puede funcionar aquí.");
      return;
    }

    // 2. Los Service Workers (y por lo tanto el Push) SOLO funcionan en un
    //    contexto seguro: HTTPS, o localhost para desarrollo. Si el sitio
    //    corre sobre HTTP en producción, esto fallará siempre sin importar
    //    qué más se configure — es la causa más común de que nada funcione.
    if (!window.isSecureContext) {
      console.error(
        "[SW] El sitio NO está en un contexto seguro (falta HTTPS). Los " +
        "Service Workers y las notificaciones push no funcionan sobre HTTP " +
        "en producción. Instala un certificado SSL en tu dominio."
      );
      return;
    }

    const init = async () => {
      try {
        const sw = await navigator.serviceWorker.register("/sw.js");
        swRef.current = sw;
        await navigator.serviceWorker.ready;

        const perm = Notification.permission;
        setPermiso(perm);

        if (perm === "granted") {
          const existingSub = await sw.pushManager.getSubscription();
          if (existingSub) {
            setSuscrito(true);
            console.log("[Push] Ya había una suscripción push activa en este navegador");
          } else {
            await suscribirPush(sw);
          }
        }
      } catch (e) {
        console.error(
          "[SW] Error registrando /sw.js. Verifica: " +
          "(1) que el archivo exista en public/sw.js y que al abrir " +
          "https://tu-sitio.com/sw.js en el navegador se vea el código JS " +
          "(no un 404 ni la página de Next.js), " +
          "(2) que el sitio esté en HTTPS.",
          e
        );
      }
    };

    init();
  }, [suscribirPush]);

  // ── Polling cada 30 s para actualizar el contador (respaldo del push) ─────
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // ── Refrescar al instante cuando el usuario vuelve a esta pestaña ─────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [cargar]);

  return {
    notificaciones,
    noLeidas,
    permiso,
    suscrito,
    cargar,
    marcarLeidas,
    pedirPermiso,
  };
}