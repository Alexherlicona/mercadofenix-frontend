// src/app/vendedor/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Package, DollarSign, TrendingUp, Clock,
  ShoppingBag, MessageCircle, Eye, ArrowRight,
  AlertTriangle, CheckCircle2, Zap, Crown, Star,
  RefreshCw, BarChart3, ChevronRight, Users,
  Link2, Copy, Check, QrCode, Share2
} from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function token() { return localStorage.getItem("vendedor_token") || ""; }
function hdr()   { return { Authorization: `Bearer ${token()}` }; }

// ── Helper URL imágenes ───────────────────────────────────────────────────────
function imgUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

const PLAN_CFG: Record<string, { label: string; icon: string; color: string; ring: string; gradient: string }> = {
  prueba:  { label: "Prueba",   icon: "🎁", color: "text-emerald-400", ring: "ring-emerald-500/30", gradient: "from-emerald-600 to-green-700" },
  basico:  { label: "Básico",   icon: "⚡", color: "text-blue-400",    ring: "ring-blue-500/30",    gradient: "from-blue-600 to-blue-700"    },
  pro:     { label: "Pro",      icon: "🚀", color: "text-purple-400",  ring: "ring-purple-500/30",  gradient: "from-purple-600 to-purple-700" },
  premium: { label: "Premium",  icon: "👑", color: "text-amber-400",   ring: "ring-amber-500/30",   gradient: "from-amber-600 to-orange-700"  },
};

function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: any; label: string; value: string | number;
  sub?: string; color: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`bg-[#111120] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-2.5 ${onClick ? "cursor-pointer hover:border-orange-500/30 transition-all" : ""}`}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "18" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-black text-white leading-none">{value}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-orange-400 font-semibold mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function VendedorDashboard() {
  const router  = useRouter();
  const [v,         setV]         = useState<any>(null);
  const [stats,     setStats]     = useState<any>(null);
  const [msgs,      setMsgs]      = useState(0);
  const [load,      setLoad]      = useState(true);
  const [tiendaUrl, setTiendaUrl] = useState<string>("");
  const [copiado,   setCopiado]   = useState(false);
  const [verQr,     setVerQr]     = useState(false);

  useEffect(() => {
    const tk = token();
    if (!tk) { router.replace("/vendedor"); return; }

    Promise.all([
      fetch(`${API_URL}/api/vendedor/me`,           { headers: hdr() }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/api/vendedor/estadisticas`,  { headers: hdr() }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/api/chat/vendedor/salas`,    { headers: hdr() }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/api/vendedor/mi-url`,        { headers: hdr() }).then(r => r.ok ? r.json() : null),
    ]).then(([me, st, chat, urlData]) => {
      if (!me) { localStorage.removeItem("vendedor_token"); router.replace("/vendedor"); return; }
      setV(me);
      if (st) setStats(st);
      if (chat) setMsgs((chat.salas || []).reduce((s: number, x: any) => s + (x.no_leidos || 0), 0));
      if (urlData?.url) setTiendaUrl(urlData.url);
    }).finally(() => setLoad(false));
  }, []);

  if (load) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-orange-400">
        <RefreshCw className="w-7 h-7 animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Cargando tu tienda...</p>
      </div>
    </div>
  );
  if (!v) return null;

  const plan    = v.plan || "prueba";
  const planCfg = PLAN_CFG[plan] || PLAN_CFG.basico;

  // Días restantes
  let diasRestantes: number | null = null;
  if (v.fecha_expiracion) {
    try { diasRestantes = differenceInDays(parseISO(v.fecha_expiracion), new Date()); } catch {}
  }
  const vencido = diasRestantes !== null && diasRestantes <= 0;
  const urgente = diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 7;
  const expFmt  = v.fecha_expiracion
    ? format(parseISO(v.fecha_expiracion), "dd 'de' MMMM, yyyy", { locale: es })
    : null;

  // Stats
  const totalProd   = stats?.productos?.total      ?? v.productos_count ?? 0;
  const activosProd = stats?.productos?.activos    ?? 0;
  const pedidosTot  = stats?.pedidos?.total        ?? 0;
  const pedidosPend = stats?.pedidos?.pendientes   ?? 0;
  const ingresos30  = stats?.ingresos?.ultimos_30d ?? 0;
  const ingresosAll = stats?.ingresos?.total       ?? 0;
  const visitas     = stats?.tienda?.visitas_totales ?? v.visitas_totales ?? 0;
  const sugerencias = stats?.sugerencias           ?? [];

  // Logo (Cloudinary o local)
  const logoSrc = imgUrl(v.logo_url);

  // QR
  const qrSrc = tiendaUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(tiendaUrl)}&size=220x220&ecc=H&margin=2`
    : null;

  const copiar = () => {
    navigator.clipboard.writeText(tiendaUrl).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    /* ── overflow-x-hidden evita scroll horizontal en móvil ── */
    <div className="max-w-xl mx-auto space-y-5 pb-10 px-4 overflow-x-hidden">

      {/* ── HEADER TIENDA ─────────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${planCfg.gradient} rounded-3xl p-5 shadow-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex items-center gap-4">
          {/* Logo */}
          <div className={`w-16 h-16 rounded-2xl ring-2 ${planCfg.ring} bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg`}>
            {logoSrc
              ? <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
              : <Store className="w-7 h-7 text-white" />}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-white leading-tight truncate">{v.nombre_tienda}</h1>
              <span className="text-xs font-bold bg-white/15 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                {planCfg.icon} {planCfg.label}
              </span>
            </div>
            <p className="text-white/70 text-xs mt-0.5 truncate">{v.propietario} · {v.municipio}, {v.departamento}</p>

            <div className="mt-2">
              {vencido ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-500/30 text-red-200 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> Suscripción vencida
                </span>
              ) : diasRestantes !== null ? (
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                  ${urgente ? "bg-amber-500/30 text-amber-200" : "bg-white/15 text-white/80"}`}>
                  <Clock className="w-3 h-3" />
                  {urgente ? `Vence en ${diasRestantes}d` : `Activo hasta ${expFmt}`}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {(urgente || vencido) && (
          <button onClick={() => router.push("/vendedor/suscripcion")}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl text-white text-xs font-bold transition-all">
            <Zap className="w-3.5 h-3.5" />
            {vencido ? "Renovar suscripción ahora" : "Renovar antes de que venza"}
          </button>
        )}
      </div>

      {/* ── LINK ÚNICO DE LA TIENDA ──────────────────────────────────────── */}
      {tiendaUrl && (
        <div className="bg-[#111120] border border-white/[0.07] rounded-2xl overflow-hidden">

          {/* Cabecera */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <Link2 className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <p className="text-xs font-bold text-white">Tu link de tienda</p>
            </div>
            <button onClick={() => setVerQr(q => !q)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 hover:text-orange-400 transition px-2 py-1 rounded-lg hover:bg-white/5">
              <QrCode className="w-3.5 h-3.5" />
              {verQr ? "Ocultar QR" : "Ver QR"}
            </button>
          </div>

          {/* URL + botones — columna en móvil, fila en sm+ */}
          <div className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="w-full text-[11px] text-gray-400 font-mono truncate select-all sm:flex-1" title={tiendaUrl}>
              {tiendaUrl}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={copiar}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all
                  ${copiado
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/[0.06] text-gray-300 hover:bg-orange-500/15 hover:text-orange-300 border border-white/[0.07]"}`}>
                {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Visita mi tienda en Mercado Fénix: ${tiendaUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition border border-[#25D366]/20">
                <Share2 className="w-3.5 h-3.5" /> Compartir
              </a>
            </div>
          </div>

          {/* Panel QR */}
          {verQr && qrSrc && (
            <div className="border-t border-white/[0.05] px-4 py-5 flex flex-col items-center gap-4">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
                Escanea para visitar tu tienda
              </p>

              {/* QR con logo superpuesto en el centro */}
              <div className="relative inline-block rounded-2xl overflow-hidden shadow-xl shadow-black/40 ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="QR de tu tienda" width={220} height={220} className="block" />

                {/* Logo centrado — ecc=H soporta hasta 30% tapado */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white shadow-md bg-white flex items-center justify-center">
                    {logoSrc
                      ? /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
                      : <Store className="w-6 h-6 text-orange-500" />}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-600 text-center max-w-[220px] leading-relaxed">
                Comparte este código en tus redes, catálogos o tarjetas de presentación.
              </p>
              <a href={qrSrc}
                download={`qr-${v.nombre_tienda?.replace(/\s+/g, "-").toLowerCase()}.png`}
                target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition underline underline-offset-2">
                Descargar imagen del QR
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── ALERTA MENSAJES ───────────────────────────────────────────────── */}
      {msgs > 0 && (
        <button onClick={() => router.push("/vendedor/dashboard/pedidos")}
          className="w-full flex items-center gap-3 bg-orange-500/10 border border-orange-500/25 hover:border-orange-500/50 rounded-2xl px-4 py-3.5 transition-all group">
          <div className="relative flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-orange-400" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
              {msgs > 9 ? "9+" : msgs}
            </span>
          </div>
          <p className="flex-1 text-left text-sm text-orange-300 font-semibold">
            {msgs} mensaje{msgs > 1 ? "s" : ""} sin leer de tus clientes
          </p>
          <ChevronRight className="w-4 h-4 text-orange-500/40 group-hover:text-orange-400 transition flex-shrink-0" />
        </button>
      )}

      {/* ── MÉTRICAS PRINCIPALES ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Resumen</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Package}     label="Productos activos" value={activosProd}
            sub={totalProd > activosProd ? `${totalProd} total` : undefined}
            color="#f97316"
            onClick={() => router.push("/vendedor/dashboard/productos")} />
          <StatCard icon={ShoppingBag} label="Pedidos totales"   value={pedidosTot}
            sub={pedidosPend > 0 ? `${pedidosPend} pendientes` : undefined}
            color="#3b82f6"
            onClick={() => router.push("/vendedor/dashboard/pedidos")} />
          <StatCard icon={DollarSign}  label="Ingresos 30 días"  value={`L${ingresos30.toFixed(0)}`}
            sub={ingresosAll > 0 ? `L${ingresosAll.toFixed(0)} total` : undefined}
            color="#10b981"
            onClick={() => router.push("/vendedor/dashboard/estadisticas")} />
          <StatCard icon={Eye}         label="Visitas totales"   value={visitas.toLocaleString("es-HN")}
            color="#8b5cf6" />
        </div>
      </div>

      {/* ── ACCESOS RÁPIDOS ──────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Nuevo producto", icon: Package,     href: "/vendedor/dashboard/productos/nuevo", color: "#f97316" },
            { label: "Ver pedidos",    icon: ShoppingBag, href: "/vendedor/dashboard/pedidos",          color: "#3b82f6" },
            { label: "Estadísticas",   icon: BarChart3,   href: "/vendedor/dashboard/estadisticas",    color: "#8b5cf6" },
            { label: "Mi perfil",      icon: Store,       href: "/vendedor/dashboard/perfil",          color: "#10b981" },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                className="flex items-center gap-3 px-4 py-3.5 bg-[#111120] border border-white/[0.07] hover:border-orange-500/25 rounded-2xl transition-all group text-left">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: item.color + "18" }}>
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SUGERENCIAS INTELIGENTES ─────────────────────────────────────── */}
      {sugerencias.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Sugerencias para tu tienda</p>
          <div className="space-y-2">
            {sugerencias.slice(0, 3).map((s: any, i: number) => {
              const colorMap: Record<string, { bg: string; border: string; text: string }> = {
                critica:     { bg: "bg-red-950/40",    border: "border-red-500/25",    text: "text-red-300"    },
                alerta:      { bg: "bg-amber-950/40",  border: "border-amber-500/25",  text: "text-amber-300"  },
                advertencia: { bg: "bg-yellow-950/40", border: "border-yellow-500/25", text: "text-yellow-300" },
                info:        { bg: "bg-blue-950/30",   border: "border-blue-500/20",   text: "text-blue-300"   },
              };
              const cfg = colorMap[s.tipo] || colorMap.info;
              return (
                <button key={i} onClick={() => s.url && router.push(s.url)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 ${cfg.bg} border ${cfg.border} rounded-2xl text-left transition-all hover:opacity-90 group`}>
                  <span className="text-base leading-none flex-shrink-0 mt-0.5">{s.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${cfg.text}`}>{s.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                  {s.url && <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-0.5 transition" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TOP VENDIDOS ─────────────────────────────────────────────────── */}
      {stats?.productos?.top_vendidos?.filter((p: any) => p.ventas > 0).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Más vendidos</p>
            <button onClick={() => router.push("/vendedor/dashboard/estadisticas")}
              className="text-[10px] text-orange-400 font-semibold hover:text-orange-300 transition">
              Ver todo →
            </button>
          </div>
          <div className="space-y-2">
            {stats.productos.top_vendidos.filter((p: any) => p.ventas > 0).slice(0, 3).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-[#111120] border border-white/[0.07] rounded-2xl">
                {p.foto
                  ? <img
                      src={p.foto.startsWith("http") ? p.foto : `${API_URL}${p.foto}`}
                      alt={p.nombre}
                      className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-white/10" />
                  : <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-gray-600" />
                    </div>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{p.nombre}</p>
                  <p className="text-[10px] text-gray-500">{p.ventas} venta{p.ventas !== 1 ? "s" : ""} · L{p.precio.toFixed(2)}</p>
                </div>
                <span className="text-xs font-black text-orange-400 flex-shrink-0">
                  #{stats.productos.top_vendidos.findIndex((x: any) => x.id === p.id) + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ESTADO GENERAL si no hay productos ───────────────────────────── */}
      {totalProd === 0 && (
        <div className="text-center py-8 bg-[#111120] border border-white/[0.07] rounded-3xl space-y-4">
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Store className="w-7 h-7 text-orange-400" />
          </div>
          <div>
            <p className="font-bold text-white text-base">¡Tu tienda está lista!</p>
            <p className="text-gray-500 text-sm mt-1 px-4">Empieza publicando tu primer producto para aparecer en el catálogo.</p>
          </div>
          <button onClick={() => router.push("/vendedor/dashboard/productos/nuevo")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-orange-900/30">
            Publicar primer producto
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}