// src/hooks/useNotificaciones.ts
//
// Hook que:
// 1. Registra el Service Worker
// 2. Pide permiso de notificaciones al usuario
// 3. Suscribe al servidor Web Push y envía la suscripción al backend
// 4. Expone el número de notificaciones no leídas y la lista completa
//
// Uso:
//   const { noLeidas, notificaciones, pedirPermiso, marcarLeidas } = useNotificaciones("cliente");

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 30_000; // refrescar cada 30 segundos

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
      const res  = await fetch(`${API_URL}/api/notificaciones/vapid-public-key`);
      if (!res.ok) return;
      const data = await res.json();
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

      await fetch(`${API_URL}${path}`, {
        method:  "POST",
        headers: { ...authHdr(tipo), "Content-Type": "application/json" },
        body:    JSON.stringify({ subscription: subscription.toJSON(), dispositivo }),
      });

      setSuscrito(true);
      console.log("[Push] ✓ Suscrito correctamente");
    } catch (e) {
      console.warn("[Push] Error al suscribir:", e);
    }
  }, [tipo]);

  // ── Pedir permiso explícitamente (llamar desde un botón) ──────────────────
  const pedirPermiso = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const resultado = await Notification.requestPermission();
    setPermiso(resultado);

    if (resultado === "granted" && swRef.current) {
      await suscribirPush(swRef.current);
    }
  }, [suscribirPush]);

  // ── Inicializar: registrar SW + permiso actual ─────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const init = async () => {
      try {
        // Registrar el service worker
        const sw = await navigator.serviceWorker.register("/sw.js");
        swRef.current = sw;

        // Revisar permiso actual
        const perm = Notification.permission;
        setPermiso(perm);

        if (perm === "granted") {
          // Ya tiene permiso — verificar si ya está suscrito
          const existingSub = await sw.pushManager.getSubscription();
          if (existingSub) {
            setSuscrito(true);
          } else {
            await suscribirPush(sw);
          }
        }
      } catch (e) {
        console.warn("[SW] Error registrando:", e);
      }
    };

    init();
  }, [suscribirPush]);

  // ── Polling cada 30 s para actualizar el contador ─────────────────────────
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
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