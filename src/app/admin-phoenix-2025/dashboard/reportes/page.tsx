// src/app/admin-phoenix-2025/dashboard/reportes/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle, MessageSquare, Search, RefreshCw,
  ChevronDown, Loader2, CheckCircle2, Clock, Eye,
  X, Store, Package, Wrench, HelpCircle, Lightbulb,
  Bug, TrendingUp, AlertCircle, Filter, ExternalLink
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function hdr(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (!t) return { "Content-Type": "application/json" };
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}
// ── Config visual ─────────────────────────────────────────────────────────────
const TIPO_REP_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  tienda:   { label: "Tienda",    icon: Store,       color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  producto: { label: "Producto",  icon: Package,     color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  servicio: { label: "Servicio",  icon: Wrench,      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  otro:     { label: "Otro",      icon: HelpCircle,  color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/20" },
};
const TIPO_SUG_CFG: Record<string, { label: string; icon: any; color: string }> = {
  sugerencia: { label: "Sugerencia", icon: Lightbulb,   color: "text-yellow-400" },
  queja:      { label: "Queja",      icon: AlertCircle, color: "text-red-400"    },
  error:      { label: "Error",      icon: Bug,         color: "text-orange-400" },
  mejora:     { label: "Mejora",     icon: TrendingUp,  color: "text-blue-400"   },
};
const ESTADO_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:    { label: "Pendiente",    color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  revisando:    { label: "Revisando",   color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  resuelto:     { label: "Resuelto",    color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20" },
  descartado:   { label: "Descartado",  color: "text-gray-500",   bg: "bg-gray-500/10 border-gray-500/20" },
  nueva:        { label: "Nueva",       color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  leida:        { label: "Leída",       color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  en_proceso:   { label: "En proceso",  color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  implementada: { label: "Implementada",color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20" },
};
const PRIORIDAD_CFG: Record<string, { color: string }> = {
  baja:    { color: "text-gray-500" },
  normal:  { color: "text-blue-400" },
  alta:    { color: "text-amber-400" },
  urgente: { color: "text-red-400" },
};

interface Reporte {
  id: number; nombre_reporter: string; email_reporter: string | null;
  tipo_reporte: string; vendedor_nombre: string | null; titulo: string;
  descripcion: string; evidencia_url: string | null;
  estado: string; prioridad: string; nota_admin: string | null;
  creado_en: string | null;
}
interface Sugerencia {
  id: number; vendedor_dni: string; nombre_tienda: string;
  tipo: string; titulo: string; descripcion: string;
  estado: string; prioridad: string; nota_admin: string | null;
  creado_en: string | null;
}

// ── Modal de detalle ──────────────────────────────────────────────────────────
function ModalDetalle({ item, tipo, onClose, onUpdate }: {
  item: Reporte | Sugerencia; tipo: "reporte" | "sugerencia";
  onClose: () => void; onUpdate: (id: number, patch: any) => void;
}) {
  const [estado,     setEstado]     = useState(item.estado);
  const [prioridad,  setPrioridad]  = useState(item.prioridad);
  const [nota,       setNota]       = useState(item.nota_admin || "");
  const [guardando,  setGuardando]  = useState(false);
  const [ok,         setOk]         = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      const url = tipo === "reporte"
        ? `${API}/api/admin/reportes/${item.id}`
        : `${API}/api/admin/sugerencias/${item.id}`;
      const res = await fetch(url, {
        method: "PUT", headers: hdr(),
        body: JSON.stringify({ estado, prioridad, nota_admin: nota }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setOk(true);
      onUpdate(item.id, { estado, prioridad, nota_admin: nota });
      setTimeout(onClose, 1000);
    } catch { alert("Error al guardar"); }
    finally { setGuardando(false); }
  };

  const esReporte    = tipo === "reporte";
  const rep          = item as Reporte;
  const sug          = item as Sugerencia;
  const tipoCfg      = esReporte
    ? TIPO_REP_CFG[rep.tipo_reporte] || TIPO_REP_CFG.otro
    : TIPO_SUG_CFG[sug.tipo] || TIPO_SUG_CFG.sugerencia;
  const TipoIcon     = tipoCfg.icon;
  const estadoStates = esReporte
    ? ["pendiente","revisando","resuelto","descartado"]
    : ["nueva","leida","en_proceso","implementada","descartada"];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-gray-950 border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-gray-950 border-b border-white/8 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${"bg" in tipoCfg ? tipoCfg.bg : "bg-gray-800"}`}>              <TipoIcon className={`w-4 h-4 ${tipoCfg.color}`} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{item.titulo}</p>
              <p className="text-xs text-gray-500">
                {esReporte ? rep.nombre_reporter : sug.nombre_tienda}
                {item.creado_en ? ` · ${format(parseISO(item.creado_en), "dd/MM/yyyy", { locale: es })}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition flex-shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {ok && (
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-500/30 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-300 font-semibold">Guardado correctamente</p>
            </div>
          )}

          {/* Descripción */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descripción</p>
            <p className="text-sm text-gray-300 leading-relaxed bg-gray-900 rounded-xl px-4 py-3 border border-white/5">
              {item.descripcion}
            </p>
          </div>

          {/* Evidencia */}
          {esReporte && rep.evidencia_url && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Evidencia</p>
              {rep.evidencia_url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img src={`${API}${rep.evidencia_url}`} alt="Evidencia"
                  className="w-full rounded-xl max-h-48 object-cover border border-white/10"
                  onContextMenu={e => e.preventDefault()} />
              ) : (
                <a href={`${API}${rep.evidencia_url}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition">
                  <ExternalLink className="w-4 h-4" /> Ver evidencia adjunta
                </a>
              )}
            </div>
          )}

          {/* Tienda reportada */}
          {esReporte && rep.vendedor_nombre && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/15 rounded-xl px-4 py-2.5">
              <Store className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300 font-semibold">{rep.vendedor_nombre}</p>
            </div>
          )}

          {/* Gestión */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Estado</p>
              <div className="relative">
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white outline-none appearance-none focus:border-orange-500/40 transition">
                  {estadoStates.map(s => (
                    <option key={s} value={s}>{ESTADO_CFG[s]?.label || s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Prioridad</p>
              <div className="relative">
                <select value={prioridad} onChange={e => setPrioridad(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white outline-none appearance-none focus:border-orange-500/40 transition">
                  {["baja","normal","alta","urgente"].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Nota interna {!esReporte && "(respuesta al vendedor)"}
            </p>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={3}
              placeholder="Agrega notas internas o respuesta..."
              className="w-full px-3 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-orange-500/40 transition resize-none placeholder-gray-600" />
          </div>

          <button onClick={guardar} disabled={guardando || ok}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fila de tabla compacta ────────────────────────────────────────────────────
function FilaReporte({ r, onClick }: { r: Reporte; onClick: () => void }) {
  const cfg   = TIPO_REP_CFG[r.tipo_reporte] || TIPO_REP_CFG.otro;
  const est   = ESTADO_CFG[r.estado]         || ESTADO_CFG.pendiente;
  const pri   = PRIORIDAD_CFG[r.prioridad]   || PRIORIDAD_CFG.normal;
  const Icon  = cfg.icon;
  return (
    <tr onClick={onClick} className="hover:bg-white/[0.02] cursor-pointer transition border-b border-white/[0.03] last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[160px]">{r.titulo}</p>
            <p className="text-xs text-gray-500">{r.nombre_reporter}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 hidden sm:table-cell">
        {r.vendedor_nombre
          ? <p className="text-xs text-gray-400 truncate max-w-[120px]">{r.vendedor_nombre}</p>
          : <p className="text-xs text-gray-700">—</p>}
      </td>
      <td className="px-3 py-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${est.bg} ${est.color}`}>
          {est.label}
        </span>
      </td>
      <td className="px-3 py-3 hidden md:table-cell">
        <span className={`text-[10px] font-bold ${pri.color}`}>{r.prioridad}</span>
      </td>
      <td className="px-3 py-3 hidden lg:table-cell">
        <p className="text-xs text-gray-500">{r.creado_en ? format(parseISO(r.creado_en), "dd/MM/yy") : "—"}</p>
      </td>
      <td className="px-3 py-3">
        <Eye className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition" />
      </td>
    </tr>
  );
}

function FilaSugerencia({ s, onClick }: { s: Sugerencia; onClick: () => void }) {
  const cfg  = TIPO_SUG_CFG[s.tipo] || TIPO_SUG_CFG.sugerencia;
  const est  = ESTADO_CFG[s.estado] || ESTADO_CFG.nueva;
  const Icon = cfg.icon;
  return (
    <tr onClick={onClick} className="hover:bg-white/[0.02] cursor-pointer transition border-b border-white/[0.03] last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[160px]">{s.titulo}</p>
            <p className="text-xs text-gray-500">{s.nombre_tienda}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 hidden sm:table-cell">
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
      </td>
      <td className="px-3 py-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${est.bg} ${est.color}`}>
          {est.label}
        </span>
      </td>
      <td className="px-3 py-3 hidden lg:table-cell">
        <p className="text-xs text-gray-500">{s.creado_en ? format(parseISO(s.creado_en), "dd/MM/yy") : "—"}</p>
      </td>
      <td className="px-3 py-3">
        <Eye className="w-4 h-4 text-gray-600" />
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function ReportesAdminPage() {
  const [reportes,    setReportes]    = useState<Reporte[]>([]);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<"reportes"|"sugerencias">("reportes");
  const [search,      setSearch]      = useState("");
  const [filtroEst,   setFiltroEst]   = useState("");
  const [filtroTipo,  setFiltroTipo]  = useState("");
  const [modal,       setModal]       = useState<{item: Reporte|Sugerencia; tipo: "reporte"|"sugerencia"} | null>(null);
  const router = useRouter();

  const cargar = useCallback(async () => {
    if (!localStorage.getItem("access_token")) { router.push("/admin-phoenix-2025"); return; }
    setLoading(true);
    try {
      const [rRep, rSug] = await Promise.all([
        fetch(`${API}/api/admin/reportes`,    { headers: hdr() }),
        fetch(`${API}/api/admin/sugerencias`, { headers: hdr() }),
      ]);
      if (rRep.ok)  setReportes(await rRep.json());
      if (rSug.ok)  setSugerencias(await rSug.json());
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { cargar(); }, [cargar]);

  const onUpdate = (id: number, patch: any) => {
    if (tab === "reportes") {
      setReportes(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    } else {
      setSugerencias(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    }
  };

  const repFilt = reportes.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.titulo.toLowerCase().includes(q) || r.nombre_reporter.toLowerCase().includes(q) || r.vendedor_nombre?.toLowerCase().includes(q))
      && (!filtroEst  || r.estado === filtroEst)
      && (!filtroTipo || r.tipo_reporte === filtroTipo);
  });

  const sugFilt = sugerencias.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.titulo.toLowerCase().includes(q) || s.nombre_tienda.toLowerCase().includes(q))
      && (!filtroEst  || s.estado === filtroEst)
      && (!filtroTipo || s.tipo === filtroTipo);
  });

  const pendRep = reportes.filter(r => r.estado === "pendiente").length;
  const nuevSug = sugerencias.filter(s => s.estado === "nueva").length;

  return (
    <>
      {modal && (
        <ModalDetalle
          item={modal.item} tipo={modal.tipo}
          onClose={() => setModal(null)}
          onUpdate={onUpdate}
        />
      )}

      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-white">Reportes y sugerencias</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {pendRep > 0 && <span className="text-amber-400">{pendRep} reporte{pendRep>1?"s":""} pendiente{pendRep>1?"s":""} · </span>}
              {nuevSug > 0 && <span className="text-blue-400">{nuevSug} sugerencia{nuevSug>1?"s":""} nueva{nuevSug>1?"s":""}</span>}
            </p>
          </div>
          <button onClick={cargar}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Reportes",         val: reportes.length,    color: "text-red-400"    },
            { label: "Pendientes",        val: pendRep,            color: "text-amber-400"  },
            { label: "Sugerencias",       val: sugerencias.length, color: "text-blue-400"   },
            { label: "Sin leer",          val: nuevSug,            color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-white/5 rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {[
            { id:"reportes",    label:`Reportes de clientes (${reportes.length})`,   badge: pendRep  },
            { id:"sugerencias", label:`Sugerencias de vendedores (${sugerencias.length})`, badge: nuevSug },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all -mb-px
                ${tab===t.id ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {t.label}
              {t.badge > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-32">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 outline-none focus:border-orange-500/40 transition" />
          </div>
          <div className="relative">
            <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)}
              className="pl-2.5 pr-7 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 outline-none appearance-none focus:border-orange-500/40 transition">
              <option value="">Estado</option>
              {tab === "reportes"
                ? ["pendiente","revisando","resuelto","descartado"].map(s => <option key={s} value={s}>{ESTADO_CFG[s]?.label}</option>)
                : ["nueva","leida","en_proceso","implementada","descartada"].map(s => <option key={s} value={s}>{ESTADO_CFG[s]?.label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="pl-2.5 pr-7 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 outline-none appearance-none focus:border-orange-500/40 transition">
              <option value="">Tipo</option>
              {tab === "reportes"
                ? Object.entries(TIPO_REP_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)
                : Object.entries(TIPO_SUG_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
          </div>
          {(search || filtroEst || filtroTipo) && (
            <button onClick={() => { setSearch(""); setFiltroEst(""); setFiltroTipo(""); }}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition">
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-400"/></div>
        ) : (
          <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
            {tab === "reportes" ? (
              repFilt.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-8 h-8 text-gray-700 mx-auto mb-2"/>
                  <p className="text-gray-500 text-xs">Sin reportes</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide">Reporte</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Tienda</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide">Estado</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide hidden md:table-cell">Prior.</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
                      <th className="px-3 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {repFilt.map(r => (
                      <FilaReporte key={r.id} r={r} onClick={() => setModal({ item: r, tipo: "reporte" })} />
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              sugFilt.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2"/>
                  <p className="text-gray-500 text-xs">Sin sugerencias</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide">Sugerencia</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide">Estado</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
                      <th className="px-3 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugFilt.map(s => (
                      <FilaSugerencia key={s.id} s={s} onClick={() => setModal({ item: s, tipo: "sugerencia" })} />
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}