"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, TrendingUp, TrendingDown, Package, ShoppingBag,
  DollarSign, AlertTriangle, CheckCircle2, Clock, Loader2,
  Lightbulb, ChevronRight, BarChart3, Star, Tag, Zap,
  RefreshCw, Box, Archive, Users, Eye, ArrowUpRight,
  ArrowDownRight, Minus, Activity
} from "lucide-react";

const API_URL = "http://localhost:8000";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("vendedor_token") : null; }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Stats {
  productos: {
    total: number; activos: number; sin_stock: number; stock_bajo: number;
    fisicos: number; digitales: number;
    categorias: { categoria: string; total: number }[];
    top_vendidos: { id: string; nombre: string; categoria: string; precio: number; ventas: number; stock: number | null; tipo: string; foto: string | null }[];
  };
  pedidos: {
    total: number; entregados: number; pendientes: number; cancelados: number; en_camino: number;
    ultimos_30d: number;
    estados: { estado: string; total: number; color: string }[];
    metodos_pago: { metodo: string; total: number }[];
  };
  ingresos: {
    total: number; ultimos_30d: number; ultimos_7d: number; ticket_promedio: number;
    grafica_30d: { dia: string; total: number }[];
  };
  tienda: { plan: string; fecha_expiracion: string | null; visitas_totales: number; activa: boolean };
  sugerencias: { tipo: string; icono: string; titulo: string; desc: string; accion: string; url: string }[];
}

// ── Mini gráfica de barras SVG ────────────────────────────────────────────────
function GraficaBarras({ datos, color = "#f97316" }: { datos: { dia: string; total: number }[]; color?: string }) {
  const max = Math.max(...datos.map(d => d.total), 1);
  const w = 600; const h = 120; const barW = Math.floor(w / datos.length) - 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {datos.map((d, i) => {
        const bh = Math.max((d.total / max) * (h - 10), d.total > 0 ? 4 : 1);
        const x = i * (barW + 1);
        const y = h - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill="url(#barGrad)" rx="2" opacity={d.total > 0 ? 1 : 0.15} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Gráfica de área (línea) ───────────────────────────────────────────────────
function GraficaLinea({ datos, color = "#f97316" }: { datos: { dia: string; total: number }[]; color?: string }) {
  const max   = Math.max(...datos.map(d => d.total), 1);
  const w = 600; const h = 100;
  const pts   = datos.map((d, i) => {
    const x = (i / (datos.length - 1)) * w;
    const y = h - (d.total / max) * (h - 10) - 5;
    return `${x},${y}`;
  });
  const area  = `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
  const line  = `M${pts.join(" L")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {datos.map((d, i) => {
        if (d.total === 0) return null;
        const x = (i / (datos.length - 1)) * w;
        const y = h - (d.total / max) * (h - 10) - 5;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

// ── Dona SVG ──────────────────────────────────────────────────────────────────
function Dona({ segmentos }: { segmentos: { label: string; valor: number; color: string }[] }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0) || 1;
  const r = 40; const cx = 60; const cy = 60; const stroke = 18;
  let offset = 0;
  const circum = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
      {segmentos.map((seg, i) => {
        const pct   = seg.valor / total;
        const dash  = pct * circum;
        const gap   = circum - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circum}
            strokeLinecap="butt" opacity={seg.valor > 0 ? 1 : 0} />
        );
        offset += pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="#0c0c14" />
    </svg>
  );
}

// ── Tarjeta métrica ───────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, icon: Icon, color, trend, small
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: "up" | "down" | "flat"; small?: boolean;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-500";
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col gap-2`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center`} style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-gray-500 font-medium">{label}</p>
        <p className={`font-black text-white ${small ? "text-xl" : "text-2xl"} leading-none mt-0.5`}>{value}</p>
        {sub && (
          <div className="flex items-center gap-1 mt-1">
            {trend && <TrendIcon className={`w-3 h-3 ${trendColor}`} />}
            <p className={`text-[10px] ${trend ? trendColor : "text-gray-600"}`}>{sub}</p>
          </div>
        )}
      </div>
      {/* Glow de fondo */}
      <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20" style={{ background: color }} />
    </div>
  );
}

// ── Color por tipo de sugerencia ──────────────────────────────────────────────
const SUGERENCIA_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critica:     { bg: "bg-red-950/40",     border: "border-red-500/30",     text: "text-red-300",     dot: "bg-red-500" },
  alerta:      { bg: "bg-orange-950/40",  border: "border-orange-500/30",  text: "text-orange-300",  dot: "bg-orange-500" },
  advertencia: { bg: "bg-yellow-950/40",  border: "border-yellow-500/30",  text: "text-yellow-300",  dot: "bg-yellow-500" },
  info:        { bg: "bg-blue-950/30",    border: "border-blue-500/20",    text: "text-blue-300",    dot: "bg-blue-400" },
};

// ════════════════════════════════════════════════════════════════════════════
export default function Estadisticas() {
  const router   = useRouter();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [periodo, setPeriodo] = useState<"7d" | "30d">("30d");

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true); else setRecargando(true);
    try {
      const res = await axios.get(`${API_URL}/api/vendedor/estadisticas`, { headers: authHeaders() });
      setStats(res.data);
    } catch (e: any) {
      if (e.response?.status === 401) router.push("/vendedor");
    } finally { setCargando(false); setRecargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (cargando) return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-orange-500 animate-spin" />
          <BarChart3 className="absolute inset-0 m-auto w-6 h-6 text-orange-400" />
        </div>
        <p className="text-gray-500 text-sm">Cargando estadísticas...</p>
      </div>
    </div>
  );

  if (!stats) return null;

  const { productos, pedidos, ingresos, tienda, sugerencias } = stats;
  const graficaDatos = periodo === "7d" ? ingresos.grafica_30d.slice(-7) : ingresos.grafica_30d;
  const ingresoPeriodo = periodo === "7d" ? ingresos.ultimos_7d : ingresos.ultimos_30d;
  const tieneDatos = pedidos.total > 0 || productos.total > 0;

  // ── Días restantes plan ────────────────────────────────────────────────────
  let diasRestantes: number | null = null;
  if (tienda.fecha_expiracion) {
    const diff = new Date(tienda.fecha_expiracion).getTime() - Date.now();
    diasRestantes = Math.max(0, Math.floor(diff / 86400000));
  }

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#080810] pb-24">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#080810]/95 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/vendedor/dashboard")}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-white tracking-tight">Estadísticas</h1>
            <p className="text-xs text-gray-600">Vista general de tu tienda</p>
          </div>
          <button onClick={() => cargar(true)} disabled={recargando}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${recargando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* ── Alerta plan vencimiento ──────────────────────────────────────── */}
        {diasRestantes !== null && diasRestantes <= 7 && (
          <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${diasRestantes === 0 ? "bg-red-950/40 border-red-500/30" : "bg-orange-950/40 border-orange-500/30"}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${diasRestantes === 0 ? "text-red-400" : "text-orange-400"}`} />
            <div className="flex-1">
              <p className="text-white font-bold text-sm">
                {diasRestantes === 0 ? "Tu plan ha vencido" : `Tu plan vence en ${diasRestantes} día${diasRestantes > 1 ? "s" : ""}`}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">Renueva para seguir vendiendo sin interrupciones.</p>
            </div>
            <button onClick={() => router.push("/vendedor/dashboard/pagos")}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 transition whitespace-nowrap">
              Renovar →
            </button>
          </div>
        )}

        {/* ── Sugerencias ─────────────────────────────────────────────────── */}
        {sugerencias.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> Sugerencias para mejorar tus ventas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sugerencias.map((s, i) => {
                const cl = SUGERENCIA_COLORS[s.tipo] || SUGERENCIA_COLORS.info;
                return (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${cl.bg} ${cl.border}`}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{s.icono}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${cl.text}`}>{s.titulo}</p>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                    <button onClick={() => router.push(s.url)}
                      className={`text-xs font-bold ${cl.text} hover:opacity-80 transition whitespace-nowrap flex-shrink-0`}>
                      {s.accion} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── KPIs principales ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Ingresos totales" value={`L${ingresos.total.toLocaleString("es-HN")}`}
            sub={`L${ingresoPeriodo.toLocaleString("es-HN")} últimos ${periodo === "7d" ? "7" : "30"} días`}
            icon={DollarSign} color="#f97316"
            trend={ingresoPeriodo > 0 ? "up" : "flat"} small />
          <MetricCard
            label="Pedidos entregados" value={pedidos.entregados}
            sub={`${pedidos.ultimos_30d} este mes`}
            icon={CheckCircle2} color="#22c55e"
            trend={pedidos.entregados > 0 ? "up" : "flat"} />
          <MetricCard
            label="Ticket promedio" value={`L${ingresos.ticket_promedio.toLocaleString("es-HN")}`}
            sub="Por pedido entregado"
            icon={Tag} color="#a855f7" />
          <MetricCard
            label="Productos activos" value={productos.activos}
            sub={`${productos.sin_stock} sin stock`}
            icon={Package} color="#3b82f6"
            trend={productos.sin_stock > 0 ? "down" : "flat"} />
        </div>

        {/* ── Gráfica de ingresos ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 className="text-white font-bold text-sm">Ingresos por ventas</h3>
              <p className="text-gray-600 text-xs mt-0.5">Pedidos entregados · Lempiras</p>
            </div>
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {(["7d","30d"] as const).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-xs font-bold transition ${periodo === p ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}>
                  {p === "7d" ? "7 días" : "30 días"}
                </button>
              ))}
            </div>
          </div>

          {/* Valor destacado */}
          <div className="px-5 pb-3">
            <p className="text-3xl font-black text-white">
              L{ingresoPeriodo.toLocaleString("es-HN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              últimos {periodo === "7d" ? "7" : "30"} días
            </p>
          </div>

          {/* Gráfica */}
          <div className="px-3 pb-4 h-28">
            {graficaDatos.some(d => d.total > 0)
              ? <GraficaLinea datos={graficaDatos} color="#f97316" />
              : (
                <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30">
                  <Activity className="w-6 h-6 text-gray-500" />
                  <p className="text-xs text-gray-500">Sin ventas en este período</p>
                </div>
              )}
          </div>

          {/* Etiquetas de fechas */}
          <div className="flex justify-between px-5 pb-3">
            {[graficaDatos[0], graficaDatos[Math.floor(graficaDatos.length/2)], graficaDatos[graficaDatos.length-1]].map((d, i) => (
              <p key={i} className="text-[10px] text-gray-600">
                {d ? new Date(d.dia + "T00:00:00").toLocaleDateString("es-HN", { day:"numeric", month:"short" }) : ""}
              </p>
            ))}
          </div>
        </div>

        {/* ── Estado de pedidos + Métodos de pago ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Dona de estados */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <h3 className="text-white font-bold text-sm mb-4">Estado de pedidos</h3>
            {pedidos.total === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 opacity-40">
                <ShoppingBag className="w-8 h-8 text-gray-600" />
                <p className="text-xs text-gray-500">Sin pedidos aún</p>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <Dona segmentos={pedidos.estados.map(e => ({ label: e.estado, valor: e.total, color: e.color }))} />
                <div className="space-y-2 flex-1">
                  {pedidos.estados.map(e => (
                    <div key={e.estado} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                        <p className="text-xs text-gray-400">{e.estado}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">{e.total}</p>
                        <p className="text-[10px] text-gray-600">
                          {pedidos.total > 0 ? `${Math.round(e.total / pedidos.total * 100)}%` : "0%"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KPIs secundarios */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Pendientes" value={pedidos.pendientes}
              sub="Requieren atención" icon={Clock} color="#f97316"
              trend={pedidos.pendientes > 0 ? "down" : "flat"} />
            <MetricCard label="En camino" value={pedidos.en_camino}
              sub="En tránsito" icon={Activity} color="#3b82f6" />
            <MetricCard label="Cancelados" value={pedidos.cancelados}
              sub="Este histórico" icon={AlertTriangle} color="#ef4444"
              trend={pedidos.cancelados > 0 ? "down" : "flat"} />
            <MetricCard label="Visitas tienda" value={(tienda.visitas_totales || 0).toLocaleString()}
              sub="Total acumulado" icon={Eye} color="#a855f7" />
          </div>
        </div>

        {/* ── Inventario ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h3 className="text-white font-bold text-sm">Inventario</h3>
            <button onClick={() => router.push("/vendedor/dashboard/productos")}
              className="text-xs text-orange-400 hover:text-orange-300 transition font-semibold flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Barra de estado de inventario */}
          <div className="px-5 pb-5 space-y-4">

            {/* Resumen tipo vs estado */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Físicos",   val: productos.fisicos,   color: "#3b82f6", icon: Box },
                { label: "Digitales", val: productos.digitales, color: "#a855f7", icon: Archive },
                { label: "Sin stock", val: productos.sin_stock, color: "#ef4444", icon: AlertTriangle },
              ].map(({ label, val, color, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <p className="text-white font-black text-xl leading-none">{val}</p>
                  <p className="text-[10px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Barra visual de stock */}
            {productos.fisicos > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                  <span>Estado del inventario físico</span>
                  <span>{productos.fisicos - productos.sin_stock - productos.stock_bajo} con buen stock</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex gap-0.5">
                  {productos.fisicos > 0 && (() => {
                    const buenos   = productos.fisicos - productos.sin_stock - productos.stock_bajo;
                    const bajo_pct = (productos.stock_bajo / productos.fisicos) * 100;
                    const sin_pct  = (productos.sin_stock / productos.fisicos) * 100;
                    const bien_pct = (buenos / productos.fisicos) * 100;
                    return (<>
                      {bien_pct > 0 && <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${bien_pct}%` }} />}
                      {bajo_pct > 0 && <div className="h-full bg-yellow-500 transition-all" style={{ width: `${bajo_pct}%` }} />}
                      {sin_pct  > 0 && <div className="h-full bg-red-500 rounded-r-full transition-all" style={{ width: `${sin_pct}%` }} />}
                    </>);
                  })()}
                </div>
                <div className="flex gap-4 mt-1.5">
                  {[["#22c55e","Buen stock"],["#eab308","Stock bajo"],["#ef4444","Agotado"]].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                      <p className="text-[10px] text-gray-500">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categorías */}
            {productos.categorias.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Productos por categoría</p>
                <div className="space-y-2">
                  {productos.categorias.slice(0, 6).map(c => {
                    const pct = Math.round((c.total / productos.total) * 100);
                    return (
                      <div key={c.categoria}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400 truncate max-w-[70%]">{c.categoria}</span>
                          <span className="text-gray-500">{c.total} <span className="text-gray-600">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Top productos más vendidos ────────────────────────────────────── */}
        {productos.top_vendidos.length > 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> Top productos
              </h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {productos.top_vendidos.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition">
                  <span className={`w-6 text-center text-xs font-black flex-shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                    #{i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800/80 flex-shrink-0">
                    {p.foto
                      ? <img src={`${API_URL}${p.foto}`} alt={p.nombre} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-600" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{p.nombre}</p>
                    <p className="text-gray-500 text-xs">{p.categoria}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-orange-400 font-black text-sm">{p.ventas} ventas</p>
                    <p className="text-gray-500 text-xs">L{p.precio.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Métodos de pago ──────────────────────────────────────────────── */}
        {pedidos.metodos_pago.length > 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <h3 className="text-white font-bold text-sm mb-4">Métodos de pago preferidos</h3>
            <div className="space-y-3">
              {pedidos.metodos_pago.map(m => {
                const total = pedidos.metodos_pago.reduce((s, x) => s + x.total, 0) || 1;
                const pct   = Math.round((m.total / total) * 100);
                const colores: Record<string, string> = { efectivo: "#22c55e", transferencia: "#3b82f6", tigo: "#f59e0b" };
                const color = colores[m.metodo] || "#6b7280";
                return (
                  <div key={m.metodo}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-300 font-semibold capitalize">{m.metodo}</span>
                      <span className="text-gray-500">{m.total} pedidos · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Estado sin datos ─────────────────────────────────────────────── */}
        {!tieneDatos && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-gray-700" />
            </div>
            <div>
              <p className="text-white font-bold">Aún no hay datos que mostrar</p>
              <p className="text-gray-500 text-sm mt-1">Las estadísticas aparecerán cuando tengas productos y pedidos.</p>
            </div>
            <button onClick={() => router.push("/vendedor/dashboard/productos/nuevo")}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition">
              Publica tu primer producto
            </button>
          </div>
        )}

      </div>
    </div>
  );
}