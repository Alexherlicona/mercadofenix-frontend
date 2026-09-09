// src/components/ui/NotificationBell.tsx
//
// Campana de notificaciones con dropdown panel.
// Muestra el contador de no leídas, lista de notificaciones y
// botón para activar notificaciones push si aún no hay permiso.
//
// Uso en el header:
//   <NotificationBell tipo="cliente" />
//   <NotificationBell tipo="vendedor" />

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, Package, ShoppingBag, MessageCircle, Info, X } from "lucide-react";
import { useNotificaciones, type TipoUsuario, type Notificacion } from "@/hooks/useNotificaciones";

// ── Helper: icono según tipo de notificación ──────────────────────────────────
function IconoTipo({ tipo }: { tipo: string }) {
  const cls = "w-4 h-4 flex-shrink-0";
  switch (tipo) {
    case "pedido":  return <ShoppingBag className={`${cls} text-orange-500`} />;
    case "estado":  return <Package      className={`${cls} text-blue-500`}   />;
    case "chat":    return <MessageCircle className={`${cls} text-purple-500`}/>;
    default:        return <Info          className={`${cls} text-gray-400`}  />;
  }
}

// ── Helper: tiempo relativo ───────────────────────────────────────────────────
function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins <   1) return "Ahora";
  if (mins <  60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs  <  24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

// ── Componente tarjeta de notificación ───────────────────────────────────────
function NotifCard({ n, onClick }: { n: Notificacion; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50
        ${!n.leida ? "bg-orange-50/60" : ""}`}>
      {/* Punto de no leída */}
      <div className="flex-shrink-0 mt-1 relative">
        <IconoTipo tipo={n.tipo} />
        {!n.leida && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!n.leida ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
          {n.titulo}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.cuerpo}</p>
      </div>
      <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
        {tiempoRelativo(n.creado_en)}
      </span>
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function NotificationBell({ tipo }: { tipo: TipoUsuario }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { notificaciones, noLeidas, permiso, pedirPermiso, marcarLeidas } = useNotificaciones(tipo);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const abrir = () => {
    setAbierto(o => !o);
    if (!abierto && noLeidas > 0) {
      // Marcar como leídas al abrir el panel
      setTimeout(marcarLeidas, 2000);
    }
  };

  const irA = (url: string) => {
    setAbierto(false);
    router.push(url);
  };

  return (
    <div className="relative" ref={panelRef}>

      {/* Botón campana */}
      <button onClick={abrir}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
        <Bell className="w-5 h-5 text-gray-600" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
            bg-red-500 text-white text-[10px] font-black rounded-full
            flex items-center justify-center leading-none">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {/* Panel dropdown */}
      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl
          border border-gray-100 z-50 overflow-hidden">

          {/* Cabecera del panel */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-700" />
              <span className="font-bold text-sm text-gray-900">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {noLeidas} nueva{noLeidas !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {noLeidas > 0 && (
                <button onClick={marcarLeidas}
                  title="Marcar todas como leídas"
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-700">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner activar push (solo si no tiene permiso) */}
          {permiso !== "granted" && (
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-3">
              <BellOff className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-orange-800">Activa las notificaciones</p>
                <p className="text-[11px] text-orange-600 mt-0.5">Recibe alertas instantáneas en este dispositivo</p>
              </div>
              <button onClick={pedirPermiso}
                className="flex-shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition">
                Activar
              </button>
            </div>
          )}

          {/* Lista */}
          <div className="overflow-y-auto max-h-80 divide-y divide-gray-50">
            {notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">Sin notificaciones</p>
                <p className="text-xs mt-1">Aquí aparecerán tus alertas</p>
              </div>
            ) : (
              notificaciones.slice(0, 20).map(n => (
                <NotifCard key={n.id} n={n} onClick={() => irA(n.url)} />
              ))
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                onClick={() => irA(tipo === "vendedor" ? "/vendedor/dashboard" : "/fenix/mi-cuenta")}
                className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition">
                Ver todas las actividades →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}