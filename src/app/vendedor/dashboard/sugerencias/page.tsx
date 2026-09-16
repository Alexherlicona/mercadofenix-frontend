// src/app/vendedor/dashboard/sugerencias/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Lightbulb, AlertCircle, Bug, TrendingUp, Send,
  CheckCircle2, Loader2, Clock, ChevronRight, X,
  MessageSquare, RefreshCw
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function hdr() {
  const t = localStorage.getItem("vendedor_token");
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}
function fhdr() {
  const t = localStorage.getItem("vendedor_token");
  return { Authorization: `Bearer ${t}` };
}

const TIPOS = [
  {
    v: "sugerencia",
    label: "Sugerencia",
    icon: Lightbulb,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/30",
    desc: "Tengo una idea para mejorar Mercado Fénix",
    placeholder: "Ej: Sería genial poder programar publicaciones de productos para una fecha específica...",
  },
  {
    v: "mejora",
    label: "Mejora",
    icon: TrendingUp,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30",
    desc: "Algo que ya existe pero podría funcionar mejor",
    placeholder: "Ej: El proceso de subir fotos tarda mucho, sería mejor poder subir varias a la vez...",
  },
  {
    v: "queja",
    label: "Queja",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30",
    desc: "Algo de la plataforma me molesta o afecta mis ventas",
    placeholder: "Ej: Las notificaciones de nuevos pedidos no llegan a tiempo y pierdo ventas...",
  },
  {
    v: "error",
    label: "Error / Bug",
    icon: Bug,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30",
    desc: "Encontré un problema técnico o fallo en la plataforma",
    placeholder: "Ej: Cuando intento subir más de 3 fotos, la página se congela y tengo que recargar...",
  },
] as const;

const ESTADO_CFG: Record<string, { label: string; color: string; icon: any }> = {
  nueva:        { label: "Enviada",      color: "text-amber-600 dark:text-amber-400",     icon: Clock         },
  leida:        { label: "Leída",        color: "text-blue-600 dark:text-blue-400",       icon: CheckCircle2  },
  en_proceso:   { label: "En proceso",   color: "text-purple-600 dark:text-purple-400",   icon: RefreshCw     },
  implementada: { label: "Implementada", color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2  },
  descartada:   { label: "Descartada",   color: "text-gray-500",                          icon: X             },
};

interface Sugerencia {
  id: number; tipo: string; titulo: string; descripcion: string;
  estado: string; prioridad: string; nota_admin: string | null;
  creado_en: string | null;
}

// ════════════════════════════════════════════════════════════════════════════
export default function VendedorSugerenciasPage() {
  const router = useRouter();
  const [tab,         setTab]         = useState<"nueva"|"historial">("nueva");
  const [tipo,        setTipo]        = useState<string>("");
  const [titulo,      setTitulo]      = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando,    setEnviando]    = useState(false);
  const [exito,       setExito]       = useState(false);
  const [error,       setError]       = useState("");
  const [historial,   setHistorial]   = useState<Sugerencia[]>([]);
  const [cargando,    setCargando]    = useState(false);
  const [detalle,     setDetalle]     = useState<Sugerencia | null>(null);

  const tipoActual = TIPOS.find(t => t.v === tipo);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API}/api/vendedor/sugerencias`, { headers: fhdr() });
      if (res.ok) setHistorial(await res.json());
    } finally { setCargando(false); }
  };

  useEffect(() => {
    if (tab === "historial") cargarHistorial();
  }, [tab]);

  const enviar = async () => {
    if (!tipo || !titulo.trim() || descripcion.trim().length < 20) {
      setError("Selecciona el tipo, completa el título y la descripción (mínimo 20 caracteres)");
      return;
    }
    setEnviando(true); setError("");
    try {
      const fd = new FormData();
      fd.append("tipo",        tipo);
      fd.append("titulo",      titulo.trim());
      fd.append("descripcion", descripcion.trim());

      const res = await fetch(`${API}/api/vendedor/sugerencias`, {
        method: "POST", headers: fhdr(), body: fd,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error"); }
      setExito(true);
    } catch (e: any) { setError(e.message); }
    finally { setEnviando(false); }
  };

  const resetForm = () => {
    setTipo(""); setTitulo(""); setDescripcion(""); setExito(false); setError("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Sugerencias y quejas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ayúdanos a mejorar Mercado Fénix. Tu opinión impacta directamente en la plataforma.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/5">
        {[
          { id: "nueva",     label: "Enviar nueva" },
          { id: "historial", label: `Mis envíos (${historial.length || "..."})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-px
              ${tab === t.id ? "border-orange-500 text-orange-600 dark:text-orange-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── NUEVA ────────────────────────────────────────────────────────── */}
      {tab === "nueva" && (
        exito ? (
          <div className="text-center py-10 space-y-5">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">¡Gracias por tu opinión!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                Tu {tipoActual?.label.toLowerCase() || "mensaje"} fue enviada al equipo de Mercado Fénix.
                La revisaremos y te notificaremos si es implementada.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={resetForm}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition">
                Enviar otra
              </button>
              <button onClick={() => { resetForm(); setTab("historial"); }}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-sm transition">
                Ver mis envíos
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Aviso motivacional */}
            <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/15 rounded-2xl px-4 py-3.5">
              <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700/80 dark:text-orange-300/80 leading-relaxed">
                Cada sugerencia es revisada por nuestro equipo. Las mejoras más votadas y viables se implementan en las próximas actualizaciones de la plataforma.
              </p>
            </div>

            {/* Selección de tipo */}
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2.5">¿Qué quieres enviar? <span className="text-red-600 dark:text-red-400">*</span></p>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.v} onClick={() => { setTipo(t.v); setError(""); }}
                      className={`flex items-start gap-3 px-3.5 py-3 rounded-2xl border-2 text-left transition-all
                        ${tipo === t.v ? t.bg : "bg-white dark:bg-gray-900 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15"}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tipo === t.v ? t.color : "text-gray-400 dark:text-gray-500"}`} />
                      <div>
                        <p className={`text-xs font-bold ${tipo === t.v ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>{t.label}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 leading-relaxed">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Título <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={200}
                placeholder="Resume tu idea en una línea..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-orange-500/40 transition" />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Descripción <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                rows={5}
                placeholder={tipoActual?.placeholder || "Descríbelo con detalle..."}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-orange-500/40 transition resize-none"
              />
              <p className={`text-[10px] text-right ${descripcion.length < 20 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-600"}`}>
                {descripcion.length} / mínimo 20 caracteres
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <button onClick={enviar} disabled={enviando}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98]">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>
        )
      )}

      {/* ── HISTORIAL ────────────────────────────────────────────────────── */}
      {tab === "historial" && (
        cargando ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-400"/></div>
        ) : historial.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-white/5">
            <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">Aún no has enviado nada</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Tus sugerencias y quejas aparecerán aquí</p>
            <button onClick={() => setTab("nueva")}
              className="mt-4 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition">
              Enviar primera sugerencia
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {historial.map(s => {
              const tipoCfg  = TIPOS.find(t => t.v === s.tipo);
              const estadoCfg = ESTADO_CFG[s.estado] || ESTADO_CFG.nueva;
              const Icon      = tipoCfg?.icon || Lightbulb;
              const EstIcon   = estadoCfg.icon;
              return (
                <button key={s.id} onClick={() => setDetalle(detalle?.id === s.id ? null : s)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-500/20 rounded-2xl text-left transition-all">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tipoCfg?.bg || "bg-gray-100 dark:bg-gray-800"}`}>
                    <Icon className={`w-4 h-4 ${tipoCfg?.color || "text-gray-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <EstIcon className={`w-3 h-3 ${estadoCfg.color}`} />
                      <span className={`text-xs font-semibold ${estadoCfg.color}`}>{estadoCfg.label}</span>
                      {s.creado_en && (
                        <span className="text-xs text-gray-400 dark:text-gray-600">· {format(parseISO(s.creado_en), "dd/MM/yy", { locale: es })}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0 transition-transform ${detalle?.id === s.id ? "rotate-90" : ""}`} />
                </button>
              );
            })}

            {/* Detalle expandido */}
            {detalle && (
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-orange-200 dark:border-orange-500/20 rounded-2xl px-4 py-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Descripción</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{detalle.descripcion}</p>
                {detalle.nota_admin && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/20 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Respuesta del equipo</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{detalle.nota_admin}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}