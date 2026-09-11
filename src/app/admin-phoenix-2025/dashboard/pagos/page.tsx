// src/app/admin-phoenix-2025/dashboard/pagos/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isToday, isThisMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  DollarSign, Search, X, CheckCircle2, Loader2, RefreshCw,
  MessageCircle, Download, TrendingUp, Calendar, Package,
  ChevronDown, Receipt, ImageIcon, FileText, ToggleLeft, ToggleRight
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function tk() { return localStorage.getItem("access_token") || ""; }
function hdr(): HeadersInit { return { Authorization: `Bearer ${tk()}`, "Content-Type": "application/json" }; }

// ── Planes ────────────────────────────────────────────────────────────────────
const PLANES = {
  prueba:  { nombre: "Prueba",   precio: 0,   color: "#10b981", icon: "🎁", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  basico:  { nombre: "Básico",   precio: 300, color: "#3b82f6", icon: "⚡", badge: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  pro:     { nombre: "Pro",      precio: 500, color: "#a855f7", icon: "🚀", badge: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
  premium: { nombre: "Premium",  precio: 800, color: "#f59e0b", icon: "👑", badge: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
} as const;
type PlanKey = keyof typeof PLANES;

const METODOS = [
  { v: "efectivo",      label: "Efectivo",     icon: "💵" },
  { v: "transferencia", label: "Transferencia", icon: "🏦" },
  { v: "tigo_money",    label: "Tigo Money",   icon: "⚡" },
  { v: "banco",         label: "Banco",        icon: "🏛️" },
  { v: "tarjeta",       label: "Tarjeta",      icon: "💳" },
];

const DESCUENTOS: Record<string, number> = { "1": 0, "3": 0.05, "6": 0.10, "12": 0.20 };

interface PagoRow {
  id: number; vendedor_dni: string; vendedor_nombre: string; propietario: string;
  plan: string; meses: number; monto: number; metodo: string; emisor: string;
  fecha_pago: string | null; inicio: string | null; fin: string | null; creado_en: string | null;
}
interface Vend {
  id: string; nombreTienda: string; propietario: string; ciudad: string;
  plan: string; activo: boolean; diasRestantes: number | null;
}

// ════════════════════════════════════════════════════════════════════════════
// DESCARGA DE FACTURA (Canvas → PNG o PDF simulado)
// ════════════════════════════════════════════════════════════════════════════
function drawFactura(params: {
  tienda: string; propietario: string; dni: string; telefono: string;
  plan: string; meses: number; metodo: string; emisor: string;
  total: number; ahorro: number; desc: number;
  numFact: string; fechaIni: Date; fechaFin: Date;
}): HTMLCanvasElement {
  const { tienda, propietario, dni, telefono, plan, meses, metodo, emisor,
          total, ahorro, desc, numFact, fechaIni, fechaFin } = params;
  const p = PLANES[plan as PlanKey] || PLANES.basico;

  const W = 640, H = 900;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!;

  // Fondo degradado
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0f0f1a");
  grad.addColorStop(1, "#1a0a00");
  c.fillStyle = grad; c.fillRect(0, 0, W, H);

  // Franja superior naranja
  c.fillStyle = "#ea580c"; c.fillRect(0, 0, W, 5);

  // Línea lateral de color del plan
  c.fillStyle = p.color; c.fillRect(0, 5, 4, H - 5);

  // Logo / título
  c.font = "bold 26px Arial";
  c.fillStyle = "#f97316";
  c.fillText("MERCADO FÉNIX", 30, 52);
  c.font = "12px Arial"; c.fillStyle = "#6b7280";
  c.fillText("mercadofenix.hn · Honduras", 30, 72);

  // N° factura — derecha
  c.textAlign = "right";
  c.font = "bold 13px Arial"; c.fillStyle = "#f97316";
  c.fillText(`N° ${numFact}`, W - 28, 48);
  c.font = "11px Arial"; c.fillStyle = "#6b7280";
  c.fillText(format(new Date(), "dd/MM/yyyy HH:mm"), W - 28, 66);
  c.textAlign = "left";

  // Separador
  c.strokeStyle = "#1f2937"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(28, 90); c.lineTo(W - 28, 90); c.stroke();

  // Datos del cliente
  c.font = "bold 10px Arial"; c.fillStyle = "#6b7280";
  c.fillText("CLIENTE", 28, 115);
  c.font = "bold 18px Arial"; c.fillStyle = "#fff";
  c.fillText(tienda, 28, 137);
  c.font = "12px Arial"; c.fillStyle = "#9ca3af";
  c.fillText(propietario, 28, 157);
  c.fillText(`DNI: ${dni}  ·  Tel: ${telefono}`, 28, 175);

  // Bloque plan
  c.fillStyle = "#111827";
  const rx = (x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
  };
  rx(28, 195, W - 56, 220, 12);

  c.font = "bold 10px Arial"; c.fillStyle = "#6b7280";
  c.fillText("DETALLE DE SUSCRIPCIÓN", 48, 220);

  const filas = [
    ["Plan",       `${p.icon} ${p.nombre}`],
    ["Período",    `${format(fechaIni, "dd/MM/yyyy")} → ${format(fechaFin, "dd/MM/yyyy")}`],
    ["Duración",   `${meses} mes${meses > 1 ? "es" : ""}`],
    ["Base",       `L${p.precio.toFixed(2)}/mes`],
    ["Método",     METODOS.find(m => m.v === metodo)?.label || metodo],
    ["Emisor",     emisor || "Mercado Fénix"],
  ];
  filas.forEach(([k, v], i) => {
    const y = 242 + i * 24;
    c.font = "11px Arial"; c.fillStyle = "#6b7280"; c.fillText(k, 48, y);
    c.font = "bold 11px Arial"; c.fillStyle = "#e5e7eb";
    c.fillText(v, 200, y);
  });

  // Descuento
  let yNext = 435;
  if (desc > 0) {
    c.fillStyle = "#064e3b"; rx(28, 440, W - 56, 44, 10);
    c.font = "bold 12px Arial"; c.fillStyle = "#34d399";
    c.fillText(`Descuento ${desc * 100}% — ahorro L${ahorro.toFixed(2)}`, 48, 467);
    yNext = 500;
  }

  // Total
  c.fillStyle = "#111827"; rx(28, yNext, W - 56, 100, 14);
  c.strokeStyle = "#f97316"; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(28, yNext, W - 56, 100, 14); c.stroke();

  c.textAlign = "center";
  c.font = "12px Arial"; c.fillStyle = "#9ca3af";
  c.fillText("TOTAL", W / 2, yNext + 36);
  c.font = "bold 52px Arial"; c.fillStyle = "#f97316";
  c.fillText(`L${total.toFixed(2)}`, W / 2, yNext + 88);
  c.textAlign = "left";

  // Restricciones/beneficios del plan
  const yBen = yNext + 120;
  c.font = "bold 10px Arial"; c.fillStyle = "#6b7280";
  c.fillText("INCLUYE", 28, yBen + 20);
  const bens = PLANES[plan as PlanKey]?.nombre === "Premium"
    ? ["Productos ilimitados","Destacados ilimitados","Soporte 24/7","Prioridad en catálogo"]
    : PLANES[plan as PlanKey]?.nombre === "Pro"
    ? ["150 productos","15 destacados","Estadísticas completas","Soporte prioritario"]
    : ["30 productos","5 destacados","Estadísticas básicas","Soporte general"];
  bens.forEach((b, i) => {
    c.font = "11px Arial"; c.fillStyle = p.color;
    c.fillText("✓", 28, yBen + 40 + i * 20);
    c.fillStyle = "#d1d5db";
    c.fillText(b, 44, yBen + 40 + i * 20);
  });

  // Footer
  c.fillStyle = "#1f2937"; c.fillRect(0, H - 48, W, 1);
  c.font = "10px Arial"; c.fillStyle = "#4b5563";
  c.textAlign = "center";
  c.fillText("Mercado Fénix Honduras · Todos los derechos reservados", W / 2, H - 26);
  c.fillText(`Documento generado el ${format(new Date(), "dd/MM/yyyy")}`, W / 2, H - 12);

  return cv;
}

function descargarFactura(params: Parameters<typeof drawFactura>[0], tipo: "png" | "pdf") {
  const cv    = drawFactura(params);
  const fname = `factura_${params.numFact}_${params.tienda.replace(/\s+/g, "_")}`;
  if (tipo === "png") {
    const a = document.createElement("a");
    a.download = fname + ".png";
    a.href = cv.toDataURL("image/png", 0.95);
    a.click();
    return;
  }
  // PDF usando canvas como imagen en una página A4 via print
  const img = cv.toDataURL("image/png", 0.95);
  const w   = window.open("", "_blank")!;
  w.document.write(`
    <html><head><title>${fname}</title>
    <style>
      * { margin:0; padding:0; }
      body { background:#000; display:flex; justify-content:center; align-items:center; min-height:100vh; }
      img  { max-width:640px; width:100%; display:block; }
      @media print { body { background:#fff; } img { width:100%; } }
    </style></head>
    <body><img src="${img}" onload="window.print(); setTimeout(()=>window.close(),500);" /></body>
    </html>`);
  w.document.close();
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL PAGO
// ════════════════════════════════════════════════════════════════════════════
function ModalPago({ vendedor, onClose, onGuardado }: {
  vendedor: Vend; onClose: () => void; onGuardado: (p: PagoRow) => void;
}) {
  const [plan,    setPlan]    = useState<PlanKey>("basico");
  const [meses,   setMeses]   = useState("1");
  const [metodo,  setMetodo]  = useState("efectivo");
  const [emisor,  setEmisor]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [ok,      setOk]      = useState(false);

  const pData  = PLANES[plan];
  const desc   = DESCUENTOS[meses] || 0;
  const total  = pData.precio * parseInt(meses) * (1 - desc);
  const ahorro = pData.precio * parseInt(meses) * desc;
  const hoy    = new Date();
  const numFact = `MF-${Date.now().toString().slice(-8)}`;
  const fechaFin = new Date(hoy); fechaFin.setMonth(fechaFin.getMonth() + parseInt(meses));

  const factParams = {
    tienda: vendedor.nombreTienda, propietario: vendedor.propietario,
    dni: vendedor.id, telefono: vendedor.id,
    plan, meses: parseInt(meses), metodo, emisor,
    total, ahorro, desc, numFact, fechaIni: hoy, fechaFin,
  };

  const waText = encodeURIComponent(
    `*🦅 FACTURA MERCADO FÉNIX*\n━━━━━━━━━━━━━━━━━━━\n` +
    `*N°:* ${numFact}\n*Tienda:* ${vendedor.nombreTienda}\n` +
    `*Plan:* ${pData.icon} ${pData.nombre}  ·  ${meses} mes${parseInt(meses)>1?"es":""}\n` +
    `*Método:* ${METODOS.find(m=>m.v===metodo)?.label||metodo}\n` +
    (desc>0?`*Descuento ${desc*100}%:* -L${ahorro.toFixed(2)}\n`:"")+
    `━━━━━━━━━━━━━━━━━━━\n*💰 TOTAL: L${total.toFixed(2)}*\n━━━━━━━━━━━━━━━━━━━\n` +
    `Por: ${emisor||"Mercado Fénix"} · ${format(hoy,"dd/MM/yyyy HH:mm")}`
  );
  const waUrl = `https://wa.me/504${vendedor.id.replace(/\D/g,"")}?text=${waText}`;

  const guardar = async () => {
    if (!emisor.trim()) { alert("Escribe tu nombre"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/vendedores/${vendedor.id}/extender`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ meses: parseInt(meses), plan, monto: total, metodo_pago: metodo, emisor }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error"); }
      setOk(true);
      onGuardado({
        id: Date.now(), vendedor_dni: vendedor.id, vendedor_nombre: vendedor.nombreTienda,
        propietario: vendedor.propietario, plan, meses: parseInt(meses), monto: total,
        metodo, emisor, fecha_pago: format(hoy,"yyyy-MM-dd"),
        inicio: hoy.toISOString(), fin: fechaFin.toISOString(), creado_en: hoy.toISOString(),
      });
      setTimeout(onClose, 1200);
    } catch(e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div className="bg-gray-950 border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header compacto */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{vendedor.nombreTienda}</p>
            <p className="text-xs text-gray-500 truncate">{vendedor.propietario}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition flex-shrink-0 ml-2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[85vh]">
          {ok && (
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-500/30 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-300 font-semibold">¡Pago registrado y plan extendido!</p>
            </div>
          )}

          {/* Plan */}
          <div className="grid grid-cols-3 gap-1.5">
            {(["basico","pro","premium"] as PlanKey[]).map(k => {
              const p = PLANES[k];
              return (
                <button key={k} onClick={() => setPlan(k)}
                  className={`flex flex-col items-center py-2.5 rounded-xl border-2 transition-all
                    ${plan===k ? "border-current bg-white/5" : "border-white/10 hover:border-white/20"}`}
                  style={plan===k ? {borderColor: p.color} : {}}>
                  <span className="text-base leading-none">{p.icon}</span>
                  <span className={`text-[11px] font-bold mt-1 ${plan===k ? "" : "text-gray-400"}`}
                    style={plan===k ? {color: p.color} : {}}>{p.nombre}</span>
                  <span className="text-[10px] text-gray-600">L{p.precio}/m</span>
                </button>
              );
            })}
          </div>

          {/* Duración */}
          <div className="grid grid-cols-4 gap-1.5">
            {[["1","1m",""],["3","3m","5%"],["6","6m","10%"],["12","12m","20%"]].map(([v,l,d]) => (
              <button key={v} onClick={() => setMeses(v)}
                className={`rounded-xl py-2 text-center border-2 transition-all
                  ${meses===v ? "border-orange-500 bg-orange-500/10" : "border-white/10 hover:border-white/20"}`}>
                <p className={`text-xs font-bold ${meses===v ? "text-orange-400" : "text-gray-300"}`}>{l}</p>
                {d && <p className="text-[10px] text-emerald-400">{d}</p>}
              </button>
            ))}
          </div>

          {/* Total inline */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border"
            style={{ background: `${PLANES[plan].color}15`, borderColor: `${PLANES[plan].color}40` }}>
            <div>
              <p className="text-xs text-gray-400">Total a cobrar</p>
              {desc>0 && <p className="text-[10px] text-emerald-400">-L{ahorro.toFixed(2)} ({desc*100}%)</p>}
            </div>
            <p className="text-2xl font-black" style={{color: PLANES[plan].color}}>L{total.toFixed(2)}</p>
          </div>

          {/* Método y emisor */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Método</p>
              <div className="relative">
                <select value={metodo} onChange={e=>setMetodo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white outline-none appearance-none focus:border-orange-500/40 transition">
                  {METODOS.map(m=><option key={m.v} value={m.v}>{m.icon} {m.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Emisor</p>
              <input value={emisor} onChange={e=>setEmisor(e.target.value)} placeholder="Tu nombre"
                className="w-full px-3 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-orange-500/40 transition placeholder-gray-600" />
            </div>
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={guardar} disabled={saving||ok}
              className="flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <DollarSign className="w-3.5 h-3.5"/>}
              {saving ? "Guardando…" : "Registrar pago"}
            </button>
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-all">
              <MessageCircle className="w-3.5 h-3.5"/> Factura WA
            </a>
          </div>

          {/* Descargas */}
          <div className="flex gap-2">
            <button onClick={()=>descargarFactura(factParams,"png")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all">
              <ImageIcon className="w-3.5 h-3.5"/> PNG
            </button>
            <button onClick={()=>descargarFactura(factParams,"pdf")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all">
              <FileText className="w-3.5 h-3.5"/> PDF
            </button>
          </div>

          <p className="text-[10px] text-gray-700 text-center">N° {numFact}</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA
// ════════════════════════════════════════════════════════════════════════════
export default function PagosPage() {
  const [pagos,    setPagos]    = useState<PagoRow[]>([]);
  const [vends,    setVends]    = useState<Vend[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filtroM,  setFiltroM]  = useState("");
  const [filtroP,  setFiltroP]  = useState("");
  const [tab,      setTab]      = useState<"historial"|"cobrar">("historial");
  const [modal,    setModal]    = useState<Vend|null>(null);
  const router = useRouter();

  const cargar = useCallback(async () => {
    if (!tk()) { router.push("/admin-phoenix-2025"); return; }
    setLoading(true);
    try {
      const [rP, rV] = await Promise.all([
        fetch(`${API}/api/admin/pagos`,  { headers: { Authorization:`Bearer ${tk()}` } }),
        fetch(`${API}/api/vendedores`,   { headers: { Authorization:`Bearer ${tk()}` } }),
      ]);
      if (rP.ok) setPagos(await rP.json());
      if (rV.ok) setVends(await rV.json());
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalHoy = pagos.filter(p=>p.fecha_pago&&isToday(parseISO(p.fecha_pago))).reduce((s,p)=>s+p.monto,0);
  const totalMes = pagos.filter(p=>p.fecha_pago&&isThisMonth(parseISO(p.fecha_pago))).reduce((s,p)=>s+p.monto,0);
  const totalAll = pagos.reduce((s,p)=>s+p.monto,0);

  const pagosFilt = pagos.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.vendedor_nombre?.toLowerCase().includes(q) || p.propietario?.toLowerCase().includes(q))
      && (!filtroM || p.metodo===filtroM)
      && (!filtroP || p.plan===filtroP);
  });

  const vendsFilt = vends.filter(v => {
    const q = search.toLowerCase();
    return !q || v.nombreTienda?.toLowerCase().includes(q) || v.propietario?.toLowerCase().includes(q);
  });

  const pBadge = (p:string) => PLANES[p as PlanKey]?.badge || "bg-gray-500/15 text-gray-400 border-gray-500/25";
  const mBadge = (m:string) => ({
    efectivo:"bg-green-500/15 text-green-400", transferencia:"bg-blue-500/15 text-blue-400",
    tigo_money:"bg-yellow-500/15 text-yellow-400", banco:"bg-indigo-500/15 text-indigo-400",
    tarjeta:"bg-pink-500/15 text-pink-400",
  }[m] || "bg-gray-500/15 text-gray-400");

  return (
    <>
      {modal && <ModalPago vendedor={modal} onClose={()=>setModal(null)} onGuardado={p=>{setPagos(prev=>[p,...prev]);setModal(null);}} />}

      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-white">Pagos</h1>
            <p className="text-xs text-gray-500">{pagos.length} registros</p>
          </div>
          <button onClick={cargar} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} /> Actualizar
          </button>
        </div>

        {/* KPIs compactos */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:"Hoy",   value:`L${totalHoy.toFixed(0)}`, color:"text-emerald-400" },
            { label:"Mes",   value:`L${totalMes.toFixed(0)}`, color:"text-orange-400" },
            { label:"Total", value:`L${totalAll.toFixed(0)}`, color:"text-blue-400" },
          ].map(k=>(
            <div key={k.label} className="bg-gray-900 border border-white/5 rounded-xl p-3 text-center">
              <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs compactos */}
        <div className="flex border-b border-white/5 gap-0.5">
          {[
            { id:"historial", label:`Historial (${pagos.length})` },
            { id:"cobrar",    label:`Cobrar (${vends.length})` },
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all -mb-px
                ${tab===t.id?"border-orange-500 text-orange-400":"border-transparent text-gray-500 hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-32">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-white/10 focus:border-orange-500/40 rounded-lg text-xs text-white placeholder-gray-600 outline-none transition" />
          </div>
          {tab==="historial" && <>
            <div className="relative">
              <select value={filtroM} onChange={e=>setFiltroM(e.target.value)}
                className="pl-2.5 pr-7 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 outline-none appearance-none transition focus:border-orange-500/40">
                <option value="">Método</option>
                {METODOS.map(m=><option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filtroP} onChange={e=>setFiltroP(e.target.value)}
                className="pl-2.5 pr-7 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 outline-none appearance-none transition focus:border-orange-500/40">
                <option value="">Plan</option>
                {Object.entries(PLANES).map(([k,p])=><option key={k} value={k}>{p.icon} {p.nombre}</option>)}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
            </div>
          </>}
          {(filtroM||filtroP||search) && (
            <button onClick={()=>{setFiltroM("");setFiltroP("");setSearch("");}}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition">
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* ── HISTORIAL ───────────────────────────────────────────────────── */}
        {tab==="historial" && (
          loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-400"/></div>
          ) : pagosFilt.length===0 ? (
            <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-white/5">
              <Receipt className="w-8 h-8 text-gray-700 mx-auto mb-2"/>
              <p className="text-gray-500 text-xs">Sin pagos</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-white/5 rounded-xl overflow-hidden">
              {/* Tabla desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Tienda","Plan","Meses","Monto","Método","Emisor","Período","Fecha"].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {pagosFilt.map(p=>(
                      <tr key={p.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-white truncate max-w-[120px]">{p.vendedor_nombre}</p>
                          <p className="text-gray-600 truncate max-w-[120px]">{p.propietario}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${pBadge(p.plan)}`}>
                            {PLANES[p.plan as PlanKey]?.icon} {PLANES[p.plan as PlanKey]?.nombre||p.plan}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-white font-bold">{p.meses}</td>
                        <td className="px-3 py-2.5 font-black text-emerald-400">L{Number(p.monto).toFixed(2)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mBadge(p.metodo)}`}>
                            {METODOS.find(m=>m.v===p.metodo)?.label||p.metodo}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-400 max-w-[80px] truncate">{p.emisor}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {p.inicio ? format(parseISO(p.inicio),"dd/MM/yy"):"—"}
                          {p.fin ? ` → ${format(parseISO(p.fin),"dd/MM/yy")}`:""}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                          {p.fecha_pago ? format(parseISO(p.fecha_pago),"dd/MM/yyyy"):"—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lista móvil */}
              <div className="sm:hidden divide-y divide-white/[0.03]">
                {pagosFilt.map(p=>(
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-white truncate">{p.vendedor_nombre}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${pBadge(p.plan)}`}>
                          {PLANES[p.plan as PlanKey]?.icon}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {p.meses}m · {METODOS.find(m=>m.v===p.metodo)?.label||p.metodo}
                        {p.fecha_pago ? ` · ${format(parseISO(p.fecha_pago),"dd/MM/yy")}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-black text-emerald-400 flex-shrink-0">L{Number(p.monto).toFixed(0)}</p>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] text-gray-600">{pagosFilt.length} registros</p>
                <p className="text-xs font-black text-emerald-400">L{pagosFilt.reduce((s,p)=>s+p.monto,0).toFixed(2)}</p>
              </div>
            </div>
          )
        )}

        {/* ── COBRAR ──────────────────────────────────────────────────────── */}
        {tab==="cobrar" && (
          loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-400"/></div>
          ) : vendsFilt.length===0 ? (
            <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-white/5">
              <Package className="w-8 h-8 text-gray-700 mx-auto mb-2"/>
              <p className="text-gray-500 text-xs">Sin vendedores</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {vendsFilt.map(v=>{
                const p       = PLANES[v.plan as PlanKey] || PLANES.basico;
                const urgente = v.diasRestantes!=null && v.diasRestantes<=7  && v.diasRestantes>0;
                const vencido = v.diasRestantes!=null && v.diasRestantes<=0;
                return (
                  <div key={v.id}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all
                      ${vencido ? "bg-red-950/20 border-red-500/20" : urgente ? "bg-amber-950/20 border-amber-500/20" : "bg-gray-900 border-white/5 hover:border-orange-500/20"}`}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                      {v.nombreTienda[0]?.toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-white truncate">{v.nombreTienda}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${p.badge}`}>{p.icon}</span>
                      </div>
                      <p className={`text-[11px] font-semibold ${vencido?"text-red-400":urgente?"text-amber-400":"text-gray-500"}`}>
                        {vencido ? "Vencida" : urgente ? `${v.diasRestantes}d restantes` : v.diasRestantes!=null ? `${v.diasRestantes}d` : "Activo"}
                      </p>
                    </div>
                    {/* Botón */}
                    <button onClick={()=>setModal(v)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0
                        ${vencido
                          ? "bg-red-600 hover:bg-red-500 text-white"
                          : "bg-orange-600 hover:bg-orange-500 text-white"}`}>
                      <DollarSign className="w-3.5 h-3.5 inline mr-1"/>+
                      {vencido ? "Renovar" : "Cobrar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </>
  );
}