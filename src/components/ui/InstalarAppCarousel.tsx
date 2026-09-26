// src/components/InstalarAppCarousel.tsx
"use client";

import { useState, useRef } from "react";
import {
  ChevronLeft, ChevronRight, MoreVertical, Share2, PlusSquare,
  Smartphone, CheckCircle2, Chrome, Compass,
} from "lucide-react";

type Plataforma = "android" | "ios";

interface Paso {
  titulo: string;
  desc: string;
  icon: any;
}

const PASOS: Record<Plataforma, Paso[]> = {
  android: [
    { titulo: "Abre el menú",        desc: "Toca los tres puntos (⋮) arriba a la derecha en Chrome.",              icon: MoreVertical },
    { titulo: "Instalar aplicación", desc: 'Selecciona "Instalar aplicación" o "Agregar a pantalla de inicio".',   icon: PlusSquare   },
    { titulo: "Confirma",            desc: 'Toca "Instalar" en la ventana que aparece.',                           icon: CheckCircle2 },
    { titulo: "¡Listo!",             desc: "El ícono de tu tienda aparecerá en tu pantalla de inicio.",            icon: Smartphone   },
  ],
  ios: [
    { titulo: "Toca compartir", desc: "Presiona el ícono de compartir (□↑) en la barra inferior de Safari.", icon: Share2       },
    { titulo: "Agregar a inicio", desc: 'Desliza hacia abajo y selecciona "Agregar a pantalla de inicio".',  icon: PlusSquare   },
    { titulo: "Confirma",       desc: 'Toca "Agregar" arriba a la derecha.',                                 icon: CheckCircle2 },
    { titulo: "¡Listo!",        desc: "El ícono de tu tienda aparecerá en tu pantalla de inicio.",            icon: Smartphone   },
  ],
};

const TABS: { id: Plataforma; label: string; icon: any }[] = [
  { id: "android", label: "Android", icon: Chrome  },
  { id: "ios",     label: "iPhone",  icon: Compass },
];

export default function InstalarAppCarousel() {
  const [plataforma, setPlataforma] = useState<Plataforma>("android");
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);

  const pasos = PASOS[plataforma];
  const paso  = pasos[idx];
  const Icon  = paso.icon;

  function cambiarPlataforma(p: Plataforma) {
    setPlataforma(p);
    setIdx(0);
  }

  function siguiente() { setIdx(i => Math.min(i + 1, pasos.length - 1)); }
  function anterior()  { setIdx(i => Math.max(i - 1, 0)); }

  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    if (delta < -40) siguiente();
    if (delta > 40)  anterior();
    touchX.current = null;
  }

  return (
    <div className="bg-white border border-gray-200 dark:bg-[#111120] dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm dark:shadow-none">

      {/* Cabecera + tabs de plataforma */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center">
            <Smartphone className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
          </div>
          <p className="text-xs font-bold text-gray-900 dark:text-white">Instala la app en tu celular</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-white/[0.06] rounded-xl p-0.5">
          {TABS.map(t => {
            const TIcon = t.icon;
            const activo = plataforma === t.id;
            return (
              <button key={t.id} onClick={() => cambiarPlataforma(t.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[10px] font-bold transition-all
                  ${activo
                    ? "bg-white dark:bg-[#1a1a2e] text-orange-500 dark:text-orange-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-500"}`}>
                <TIcon className="w-3 h-3" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Carrusel */}
      <div className="px-4 py-5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex items-center gap-2">
          <button onClick={anterior} disabled={idx === 0}
            className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 disabled:opacity-30 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Mockup de teléfono */}
          <div className="flex-1 flex flex-col items-center gap-4 select-none">
            <div className="relative w-36 h-64 rounded-[26px] bg-gray-900 dark:bg-black p-1.5 shadow-xl">
              <div className="w-full h-full rounded-[20px] bg-gray-50 dark:bg-[#0b0b16] overflow-hidden flex flex-col">
                {/* Barra del navegador */}
                <div className="h-7 flex-shrink-0 bg-white dark:bg-[#111120] border-b border-gray-200 dark:border-white/[0.07] flex items-center justify-between px-2">
                  <div className="w-14 h-2 rounded-full bg-gray-200 dark:bg-white/10" />
                  <MoreVertical className={`w-3 h-3 text-gray-400 dark:text-gray-600 ${plataforma === "android" && idx === 0 ? "text-orange-500 dark:text-orange-400 animate-pulse" : ""}`} />
                </div>
                {/* Contenido simulado */}
                <div className="flex-1 flex items-center justify-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all
                    ${idx === pasos.length - 1
                      ? "bg-emerald-50 dark:bg-emerald-500/15 ring-2 ring-emerald-400/40"
                      : "bg-orange-50 dark:bg-orange-500/15 ring-2 ring-orange-400/30 animate-pulse"}`}>
                    <Icon className={`w-6 h-6 ${idx === pasos.length - 1 ? "text-emerald-500 dark:text-emerald-400" : "text-orange-500 dark:text-orange-400"}`} />
                  </div>
                </div>
                {/* Barra inferior (solo iOS) */}
                {plataforma === "ios" && (
                  <div className="h-7 flex-shrink-0 bg-white dark:bg-[#111120] border-t border-gray-200 dark:border-white/[0.07] flex items-center justify-center">
                    <Share2 className={`w-3 h-3 text-gray-400 dark:text-gray-600 ${idx === 0 ? "text-orange-500 dark:text-orange-400 animate-pulse" : ""}`} />
                  </div>
                )}
              </div>
            </div>

            <div className="text-center px-2">
              <p className="text-xs font-bold text-gray-900 dark:text-white">{paso.titulo}</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[220px]">{paso.desc}</p>
            </div>
          </div>

          <button onClick={siguiente} disabled={idx === pasos.length - 1}
            className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 disabled:opacity-30 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {pasos.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-orange-500 dark:bg-orange-400" : "w-1.5 bg-gray-200 dark:bg-white/10"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}