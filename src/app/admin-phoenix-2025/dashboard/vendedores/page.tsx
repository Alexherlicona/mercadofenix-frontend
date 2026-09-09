// src/app/admin-phoenix-2025/dashboard/vendedores/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Users, Package, Eye, Clock, Crown, Zap, Shield,
  ToggleLeft, ToggleRight, X, Phone, MapPin, CalendarCheck,
  DollarSign, FileText, MessageCircle, CheckCircle2, RefreshCw,
  ChevronLeft, ChevronRight, Star, AlertCircle, Loader2,
  Mail, Building2, ExternalLink, Download, Trash2, BadgeCheck,
  Lock, Unlock, TrendingUp, Info, ShoppingCart, Receipt
} from "lucide-react";
import { format, addMonths, startOfMonth, isBefore, isAfter, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE PLANES
// ════════════════════════════════════════════════════════════════════════════
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PLANES = {
  prueba: {
    nombre:        "Prueba Gratuita",
    precio:        0,
    color:         "text-emerald-400",
    bg:            "from-emerald-900/40 to-emerald-950/60",
    border:        "border-emerald-500/30",
    badge:         "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    icon:          "🎁",
    duracion:      "3 meses",
    max_productos: 30,
    max_destacados: 0,
    estadisticas:  "básicas",
    soporte:       false,
    prioridad:     false,
    verificado:    false,
    descripcion:   "Para comenzar. Sin tarjeta de crédito.",
    restricciones: ["Máx. 30 productos", "Sin productos destacados", "Estadísticas básicas", "Sin soporte prioritario"],
  },
  basico: {
    nombre:        "Básico",
    precio:        300,
    color:         "text-blue-400",
    bg:            "from-blue-900/40 to-blue-950/60",
    border:        "border-blue-500/30",
    badge:         "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon:          "⚡",
    duracion:      "mensual",
    max_productos: 30,
    max_destacados: 2,
    estadisticas:  "básicas",
    soporte:       false,
    prioridad:     false,
    verificado:    false,
    descripcion:   "Para tiendas pequeñas que quieren crecer.",
    restricciones: ["Máx. 30 productos", "2 productos destacados", "Estadísticas básicas", "Soporte por chat general"],
  },
  pro: {
    nombre:        "Pro",
    precio:        500,
    color:         "text-purple-400",
    bg:            "from-purple-900/40 to-purple-950/60",
    border:        "border-purple-500/30",
    badge:         "bg-purple-500/15 text-purple-400 border-purple-500/25",
    icon:          "🚀",
    duracion:      "mensual",
    max_productos: 150,
    max_destacados: 10,
    estadisticas:  "completas",
    soporte:       true,
    prioridad:     false,
    verificado:    true,
    descripcion:   "Para tiendas en crecimiento con más visibilidad.",
    restricciones: ["Máx. 150 productos", "10 productos destacados", "Estadísticas completas", "Soporte prioritario", "Insignia verificado"],
  },
  premium: {
    nombre:        "Premium",
    precio:        800,
    color:         "text-amber-400",
    bg:            "from-amber-900/40 to-amber-950/60",
    border:        "border-amber-500/30",
    badge:         "bg-amber-500/15 text-amber-400 border-amber-500/25",
    icon:          "👑",
    duracion:      "mensual",
    max_productos: 999999,
    max_destacados: 999999,
    estadisticas:  "avanzadas + IA",
    soporte:       true,
    prioridad:     true,
    verificado:    true,
    descripcion:   "Sin límites. Todo incluido. Máxima visibilidad.",
    restricciones: ["Productos ilimitados", "Destacados ilimitados", "Estadísticas avanzadas + IA", "Soporte 24/7 prioritario", "Insignia verificado", "Prioridad en catálogo", "Análisis de competencia"],
  },
} as const;

type PlanKey = keyof typeof PLANES;

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════
interface PagoRegistro {
  inicio:    string;
  fin:       string;
  plan:      string;
  meses:     number;
  monto:     number;
  metodo:    string;
  emisor:    string;
  creado_en: string;
}

interface VendedorAdmin {
  id:              string;
  dni:             string;
  rtn:             string;
  propietario:     string;
  nombreTienda:    string;
  telefono:        string;
  email:           string | null;
  ciudad:          string;
  departamento:    string;
  logo:            string | null;
  documento_url:   string | null;
  google_maps_url: string | null;
  plan:            string;
  activo:          boolean;
  fechaRegistro:   string;
  fechaExpiracion: string | null;
  fechaAprobacion: string | null;
  diasRestantes:   number | null;
  productosCount:  number;
  visitasTotales:  number;
  mesesPagados:    PagoRegistro[];
  ips:             string[];
  pedidosCompletados?: PedidoCompletado[];
}

interface PedidoCompletado {
  id:            number;
  total:         number;
  metodo_pago:   string;
  fecha_entrega: string;
  items_count:   number;
  cliente:       string;
  es_digital:    boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function adminHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

function planInfo(planKey: string) {
  return PLANES[planKey as PlanKey] || PLANES.basico;
}

function PlanBadge({ plan }: { plan: string }) {
  const p = planInfo(plan);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${p.badge}`}>
      <span>{p.icon}</span> {p.nombre}
    </span>
  );
}

function diasColor(dias: number | null) {
  if (dias === null) return "text-gray-500";
  if (dias <= 0)   return "text-red-400";
  if (dias <= 7)   return "text-red-400";
  if (dias <= 30)  return "text-amber-400";
  return "text-emerald-400";
}

// ════════════════════════════════════════════════════════════════════════════
// CALENDARIO COMPLETO 2026+
// ════════════════════════════════════════════════════════════════════════════
function CalendarioVendedor({ vendedor }: { vendedor: VendedorAdmin }) {
  const hoy        = new Date();
  const [año, setAño] = useState(Math.max(hoy.getFullYear(), 2026));

  const meses = Array.from({ length: 12 }, (_, i) => new Date(año, i, 1));

  function estadoMes(mes: Date): "pagado" | "prueba" | "vencido" | "activo" | "futuro" {
    const mesStr = format(mes, "yyyy-MM");
    const hoyStr = format(hoy, "yyyy-MM");

    // ¿Hay algún pago que cubra este mes?
    for (const pago of vendedor.mesesPagados) {
      const ini = pago.inicio ? format(parseISO(pago.inicio), "yyyy-MM") : null;
      const fin = pago.fin    ? format(parseISO(pago.fin),    "yyyy-MM") : null;
      if (ini && fin && mesStr >= ini && mesStr <= fin) return "pagado";
    }

    // ¿Es un mes de prueba? (3 meses desde registro)
    if (vendedor.fechaRegistro) {
      const regStr = format(parseISO(vendedor.fechaRegistro), "yyyy-MM");
      const fin3   = format(addMonths(parseISO(vendedor.fechaRegistro), 3), "yyyy-MM");
      if (mesStr >= regStr && mesStr < fin3) return "prueba";
    }

    if (mesStr < hoyStr) return "vencido";
    if (mesStr === hoyStr) return "activo";
    return "futuro";
  }

  const CONFIG_ESTADO = {
    pagado: { bg: "bg-emerald-600 hover:bg-emerald-500", text: "text-white",   title: "Pagado" },
    prueba: { bg: "bg-blue-600/60",                      text: "text-blue-200", title: "Prueba gratuita" },
    activo: { bg: "bg-orange-600",                       text: "text-white",   title: "Mes actual" },
    vencido:{ bg: "bg-gray-800",                         text: "text-gray-600",title: "Vencido/pendiente" },
    futuro: { bg: "bg-gray-800/50 border border-gray-700/50", text: "text-gray-500", title: "Futuro" },
  };

  return (
    <div className="space-y-3">
      {/* Navegador de año */}
      <div className="flex items-center gap-3">
        <button onClick={() => setAño(a => a - 1)}
          disabled={año <= 2026}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-30">
          <ChevronLeft className="w-4 h-4 text-gray-300" />
        </button>
        <span className="text-sm font-bold text-white flex-1 text-center">{año}</span>
        <button onClick={() => setAño(a => a + 1)}
          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      {/* Grid 12 meses */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
        {meses.map((mes, i) => {
          const estado = estadoMes(mes);
          const cfg    = CONFIG_ESTADO[estado];
          return (
            <div key={i} title={cfg.title}
              className={`rounded-lg h-9 flex flex-col items-center justify-center text-[10px] font-bold transition-all cursor-default ${cfg.bg} ${cfg.text}`}>
              <span>{format(mes, "MMM", { locale: es })}</span>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
        {[
          { color: "bg-emerald-600", label: "Pagado" },
          { color: "bg-blue-600/60", label: "Prueba gratuita" },
          { color: "bg-orange-600",  label: "Mes actual" },
          { color: "bg-gray-800",    label: "Vencido" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Historial de pagos */}
      {vendedor.mesesPagados.length > 0 && (
        <div className="space-y-1 mt-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Historial de pagos</p>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {[...vendedor.mesesPagados].reverse().map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-gray-800/50 rounded-lg px-3 py-1.5">
                <span className="text-emerald-400 font-bold">L{p.monto?.toFixed(2) || "?"}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">{p.plan}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-500">{p.metodo}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-600">
                  {p.creado_en ? format(parseISO(p.creado_en), "dd/MM/yy") : "—"}
                </span>
                <span className="text-gray-600 ml-auto">por {p.emisor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GENERADOR DE FACTURA PDF (sin dependencias externas — usa canvas nativo)
// ════════════════════════════════════════════════════════════════════════════
function generarFacturaPDF(params: {
  vendedor:    VendedorAdmin;
  plan:        PlanKey;
  meses:       string;
  metodo:      string;
  emisor:      string;
  total:       number;
  ahorro:      number;
  desc:        number;
  numFactura:  string;
  fechaIni:    Date;
  fechaFin:    Date;
}) {
  const { vendedor, plan, meses, metodo, emisor, total, ahorro, desc, numFactura, fechaIni, fechaFin } = params;
  const planData = PLANES[plan];

  // Crear canvas para el PDF
  const canvas  = document.createElement("canvas");
  canvas.width  = 794;  // A4 a 96dpi
  canvas.height = 1123;
  const ctx     = canvas.getContext("2d")!;

  // Fondo
  ctx.fillStyle = "#0f0f1a";
  ctx.fillRect(0, 0, 794, 1123);

  // Header gradient simulado
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(0, 0, 794, 200);

  // Franja naranja superior
  ctx.fillStyle = "#ea580c";
  ctx.fillRect(0, 0, 794, 6);

  // Título
  ctx.font      = "bold 32px Arial";
  ctx.fillStyle = "#f97316";
  ctx.fillText("MERCADO FÉNIX", 50, 65);
  ctx.font      = "16px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("La plataforma #1 de Honduras", 50, 90);

  // Número de factura
  ctx.font      = "bold 14px Arial";
  ctx.fillStyle = "#f97316";
  ctx.textAlign = "right";
  ctx.fillText(`FACTURA N° ${numFactura}`, 744, 55);
  ctx.font      = "12px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(format(new Date(), "dd/MM/yyyy HH:mm"), 744, 75);
  ctx.textAlign = "left";

  // Línea separadora
  ctx.strokeStyle = "#374151";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(50, 110);
  ctx.lineTo(744, 110);
  ctx.stroke();

  // Datos del cliente
  ctx.font      = "bold 11px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("DATOS DEL CLIENTE", 50, 140);
  ctx.font      = "bold 16px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(vendedor.nombreTienda, 50, 162);
  ctx.font      = "13px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(`Propietario: ${vendedor.propietario}`, 50, 182);
  ctx.fillText(`Teléfono: ${vendedor.telefono}`, 350, 162);
  ctx.fillText(`DNI: ${vendedor.dni}`, 350, 182);

  // Bloque de detalles del plan
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.roundRect(50, 215, 694, 200, 12);
  ctx.fill();

  ctx.font      = "bold 11px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("DETALLES DE LA SUSCRIPCIÓN", 75, 245);

  const filas = [
    ["Plan",             `${planData.icon} ${planData.nombre}`],
    ["Período",          `${format(fechaIni,"dd/MM/yyyy")} → ${format(fechaFin,"dd/MM/yyyy")}`],
    ["Duración",         `${meses} mes${parseInt(meses)>1?"es":""}`],
    ["Precio unitario",  `L${planData.precio.toFixed(2)}/mes`],
    ["Método de pago",   metodo],
    ["Recibido por",     emisor || "Mercado Fénix"],
  ];

  filas.forEach(([k, v], i) => {
    const y = 270 + i * 22;
    ctx.font = "12px Arial"; ctx.fillStyle = "#6b7280";
    ctx.fillText(k, 75, y);
    ctx.font = "bold 12px Arial"; ctx.fillStyle = "#e5e7eb";
    ctx.fillText(v, 280, y);
  });

  // Descuento si aplica
  if (desc > 0) {
    ctx.fillStyle = "#064e3b";
    ctx.beginPath();
    ctx.roundRect(50, 430, 694, 50, 10);
    ctx.fill();
    ctx.font = "bold 13px Arial"; ctx.fillStyle = "#34d399";
    ctx.fillText(`Descuento ${desc*100}% por ${meses} meses: -L${ahorro.toFixed(2)}`, 75, 462);
  }

  // Total
  const yTotal = desc > 0 ? 510 : 455;
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.roundRect(50, yTotal, 694, 100, 14);
  ctx.fill();
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth   = 2;
  ctx.stroke();

  ctx.font = "14px Arial"; ctx.fillStyle = "#9ca3af";
  ctx.textAlign = "center";
  ctx.fillText("TOTAL A PAGAR", 397, yTotal + 38);
  ctx.font = "bold 44px Arial"; ctx.fillStyle = "#f97316";
  ctx.fillText(`L${total.toFixed(2)}`, 397, yTotal + 82);
  ctx.textAlign = "left";

  // Beneficios del plan
  const yBen = yTotal + 125;
  ctx.font = "bold 11px Arial"; ctx.fillStyle = "#6b7280";
  ctx.fillText("BENEFICIOS INCLUIDOS", 50, yBen + 20);

  planData.restricciones.forEach((r, i) => {
    const col = i < 4 ? 50  : 420;
    const row = i < 4 ? i   : i - 4;
    ctx.font = "12px Arial"; ctx.fillStyle = "#10b981";
    ctx.fillText("✓", col, yBen + 40 + row * 22);
    ctx.fillStyle = "#d1d5db";
    ctx.fillText(r, col + 18, yBen + 40 + row * 22);
  });

  // Footer
  ctx.fillStyle = "#374151";
  ctx.fillRect(0, 1070, 794, 1);
  ctx.font = "11px Arial"; ctx.fillStyle = "#6b7280";
  ctx.textAlign = "center";
  ctx.fillText("Mercado Fénix Honduras · mercadofenix.hn · Todos los derechos reservados", 397, 1095);
  ctx.fillText(`Este documento es un comprobante de pago válido emitido el ${format(new Date(),"dd/MM/yyyy")}`, 397, 1112);

  // Descargar
  const link    = document.createElement("a");
  link.download = `factura_${numFactura}_${vendedor.nombreTienda.replace(/\s+/g,"_")}.png`;
  link.href     = canvas.toDataURL("image/png", 0.95);
  link.click();
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL FACTURA + WHATSAPP
// ════════════════════════════════════════════════════════════════════════════
function ModalFactura({ vendedor, onClose, onGuardado }: {
  vendedor: VendedorAdmin;
  onClose: () => void;
  onGuardado: (v: VendedorAdmin) => void;
}) {
  const [plan,      setPlan]      = useState<PlanKey>("basico");
  const [meses,     setMeses]     = useState("1");
  const [metodo,    setMetodo]    = useState("Efectivo");
  const [emisor,    setEmisor]    = useState("");
  const [guardando, setGuardando] = useState(false);
  const [enviando,  setEnviando]  = useState(false);
  const [exito,     setExito]     = useState(false);

  const planData  = PLANES[plan];
  const descuentos: Record<string, number> = { "1": 0, "3": 0.05, "6": 0.10, "12": 0.20 };
  const desc      = descuentos[meses] || 0;
  const precioBase = planData.precio;
  const total     = precioBase * parseInt(meses) * (1 - desc);
  const ahorro    = precioBase * parseInt(meses) * desc;

  const hoy           = new Date();
  const fechaIni      = hoy;
  const fechaFin      = addMonths(hoy, parseInt(meses));
  const numFactura    = `MF-${Date.now().toString().slice(-8)}`;

  const textoWhatsapp = encodeURIComponent(
    `*🦅 MERCADO FÉNIX — FACTURA*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*N°:* ${numFactura}\n` +
    `*Tienda:* ${vendedor.nombreTienda}\n` +
    `*Plan:* ${planData.icon} ${planData.nombre}\n` +
    `*Período:* ${format(fechaIni,"dd/MM/yyyy")} → ${format(fechaFin,"dd/MM/yyyy")}\n` +
    `*Meses:* ${meses}\n` +
    `*Método:* ${metodo}\n` +
    `${desc > 0 ? `*Descuento ${desc*100}%:* -L${ahorro.toFixed(2)}\n` : ""}` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*💰 TOTAL: L${total.toFixed(2)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Emitido por: ${emisor || "Mercado Fénix"}\n` +
    `📅 ${format(hoy,"dd/MM/yyyy HH:mm")}\n\n` +
    `_Mercado Fénix — La plataforma #1 de Honduras_ 🇭🇳`
  );

  const telefonoLimpio = vendedor.telefono.replace(/\D/g,"");
  const waUrl = `https://wa.me/504${telefonoLimpio}?text=${textoWhatsapp}`;

  const guardar = async () => {
    if (!emisor.trim()) { alert("Escribe tu nombre como emisor"); return; }
    setGuardando(true);
    try {
      const res = await fetch(`${API}/api/vendedores/${vendedor.dni}/extender`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          meses: parseInt(meses),
          plan,
          monto: total,
          metodo_pago: metodo,
          emisor: emisor.trim(),
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setExito(true);
      setTimeout(() => {
        onGuardado({ ...vendedor, plan, activo: true });
        onClose();
      }, 1500);
    } catch { alert("Error al registrar el pago"); }
    finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-gray-950 border border-white/10 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-gray-950 border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="font-black text-white">Registrar pago</p>
            <p className="text-xs text-gray-500">{vendedor.nombreTienda} · {vendedor.propietario}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {exito && (
            <div className="flex items-center gap-3 bg-emerald-900/30 border border-emerald-500/30 rounded-2xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <p className="text-sm text-emerald-300 font-semibold">¡Pago registrado correctamente!</p>
            </div>
          )}

          {/* Selección de plan */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Plan</p>
            <div className="grid grid-cols-2 gap-2">
              {(["basico","pro","premium"] as PlanKey[]).map(k => {
                const p = PLANES[k];
                return (
                  <button key={k} onClick={() => setPlan(k)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left
                      ${plan === k ? `border-current ${p.color} bg-white/5` : "border-white/10 hover:border-white/20"}`}>
                    <span className="text-xl leading-none">{p.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${plan===k ? p.color : "text-gray-300"}`}>{p.nombre}</p>
                      <p className="text-xs text-gray-500">L{p.precio}/mes</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meses */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Duración</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { v: "1",  label: "1 mes",     desc: "" },
                { v: "3",  label: "3 meses",   desc: "5% off" },
                { v: "6",  label: "6 meses",   desc: "10% off" },
                { v: "12", label: "12 meses",  desc: "20% off" },
              ].map(m => (
                <button key={m.v} onClick={() => setMeses(m.v)}
                  className={`rounded-2xl py-3 text-center border-2 transition-all
                    ${meses === m.v ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-white/10 hover:border-white/20 text-gray-400"}`}>
                  <p className="text-sm font-bold">{m.label}</p>
                  {m.desc && <p className="text-[10px] text-emerald-400 font-semibold">{m.desc}</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className={`rounded-2xl p-4 bg-gradient-to-r ${planData.bg} border ${planData.border}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-400">Total a cobrar</span>
              <span className={`text-3xl font-black ${planData.color}`}>L{total.toFixed(2)}</span>
            </div>
            {desc > 0 && (
              <p className="text-xs text-emerald-400 font-semibold mt-1 text-right">
                Ahorro de L{ahorro.toFixed(2)} ({desc*100}% descuento)
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {format(fechaIni,"dd/MM/yyyy")} → {format(fechaFin,"dd/MM/yyyy")}
            </p>
          </div>

          {/* Método y emisor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Método de pago</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-orange-500/40 transition appearance-none">
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tigo Money</option>
                <option>Banco</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Recibido por</label>
              <input type="text" value={emisor} onChange={e => setEmisor(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-orange-500/40 transition placeholder-gray-600" />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button onClick={guardar} disabled={guardando || exito}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all text-sm">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {guardando ? "Guardando..." : "Registrar pago"}
            </button>
            <button
              onClick={() => generarFacturaPDF({ vendedor, plan, meses, metodo, emisor, total, ahorro, desc, numFactura, fechaIni, fechaFin })}
              className="flex items-center gap-2 px-4 py-3.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl transition-all text-sm"
              title="Descargar factura en imagen PNG">
              <Download className="w-4 h-4" />
              PDF
            </button>
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all text-sm whitespace-nowrap">
              <MessageCircle className="w-4 h-4" />
              WA
            </a>
          </div>

          <p className="text-[10px] text-gray-600 text-center">
            N° {numFactura} · El enlace de WhatsApp abre la app con la factura lista para enviar.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PEDIDOS COMPLETADOS POR VENDEDOR
// ════════════════════════════════════════════════════════════════════════════
function PedidosCompletados({ vendedorDni }: { vendedorDni: string }) {
  const [pedidos,  setPedidos]  = useState<PedidoCompletado[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [cargado,  setCargado]  = useState(false);
  const [error,    setError]    = useState(false);

  const cargar = async () => {
    if (cargado) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/admin/vendedor/${vendedorDni}/pedidos-completados`,
        { headers: adminHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPedidos(data);
      setCargado(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const [pagosHist, setPagosHist] = useState<any[]>([]);

  // Cargar al montar
  useEffect(() => {
    cargar();
    // También cargar historial de pagos de este vendedor
    fetch(`${API}/api/admin/pagos`, { headers: adminHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setPagosHist(data.filter(p => p.vendedor_dni === vendedorDni)))
      .catch(() => {});
  }, [vendedorDni]);

  const totalVentas = pedidos.reduce((s, p) => s + p.total, 0);
  const totalCobrado = pagosHist.reduce((s, p) => s + (p.monto || 0), 0);

  if (loading) return (
    <div className="flex items-center gap-2 py-3 text-gray-600 text-xs">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando pedidos...
    </div>
  );

  if (error) return (
    <p className="text-xs text-red-400 py-2">No se pudieron cargar los pedidos</p>
  );

  return (
    <div className="space-y-3">
      {/* Resumen de ventas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-emerald-400">{pedidos.length}</p>
          <p className="text-[10px] text-gray-500">completados</p>
        </div>
        <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-orange-400">L{totalVentas.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">en ventas</p>
        </div>
        <div className="bg-green-950/30 border border-green-500/20 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-green-400">L{totalCobrado.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">cobrado MF</p>
        </div>
      </div>

      {/* Historial de pagos a Mercado Fénix */}
      {pagosHist.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Receipt className="w-3 h-3" /> Pagos a Mercado Fénix
          </p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {pagosHist.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-gray-800/40 rounded-lg px-3 py-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${p.plan === "premium" ? "bg-amber-500/20 text-amber-400" :
                    p.plan === "pro"     ? "bg-purple-500/20 text-purple-400" :
                                           "bg-blue-500/20 text-blue-400"}`}>
                  {p.plan}
                </span>
                <span className="text-gray-500">{p.meses}m · {p.metodo}</span>
                <span className="ml-auto font-black text-emerald-400">L{Number(p.monto).toFixed(2)}</span>
                <span className="text-gray-700">{p.fecha_pago ? format(parseISO(p.fecha_pago), "dd/MM/yy") : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pedidos completados */}
      {pedidos.length === 0 ? (
        <div className="flex items-center gap-2 py-2 bg-gray-800/30 rounded-xl px-3">
          <ShoppingCart className="w-3.5 h-3.5 text-gray-600" />
          <p className="text-xs text-gray-600">Sin pedidos completados aún</p>
        </div>
      ) : (

        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {pedidos.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-gray-800/40 rounded-xl px-3 py-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs
                ${p.es_digital ? "bg-violet-900/50 text-violet-400" : "bg-orange-900/50 text-orange-400"}`}>
                {p.es_digital ? "💾" : "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate">
                  #{p.id} · {p.cliente}
                </p>
                <p className="text-[10px] text-gray-600">
                  {p.items_count} artículo{p.items_count !== 1 ? "s" : ""} · {p.metodo_pago}
                  {p.fecha_entrega && ` · ${format(parseISO(p.fecha_entrega), "dd/MM/yy")}`}
                </p>
              </div>
              <span className="text-xs font-black text-emerald-400 flex-shrink-0">
                L{p.total.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        )}
      </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// TARJETA DE VENDEDOR
// ════════════════════════════════════════════════════════════════════════════
function VendedorCard({ vendedor, onUpdate }: { vendedor: VendedorAdmin; onUpdate: (v: VendedorAdmin) => void }) {
  const [expand,       setExpand]       = useState(false);
  const [facturaOpen,  setFacturaOpen]  = useState(false);
  const [toggling,     setToggling]     = useState(false);

  const plan    = planInfo(vendedor.plan);
  const dias    = vendedor.diasRestantes;
  const urgente = dias !== null && dias <= 7 && dias > 0;
  const vencido = dias !== null && dias <= 0;

  const toggleActivo = async () => {
    setToggling(true);
    try {
      const res = await fetch(`${API}/api/vendedores/${vendedor.dni}/toggle`, {
        method: "PUT",
        headers: adminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ ...vendedor, activo: data.activo });
      }
    } finally { setToggling(false); }
  };

  return (
    <>
      {facturaOpen && (
        <ModalFactura
          vendedor={vendedor}
          onClose={() => setFacturaOpen(false)}
          onGuardado={v => { onUpdate(v); setFacturaOpen(false); }}
        />
      )}

      <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-all
        ${vencido ? "border-red-500/30" : urgente ? "border-amber-500/30" : "border-white/5 hover:border-orange-500/20"}`}>

        {/* CABECERA */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Logo */}
            <div className="flex-shrink-0 relative">
              {vendedor.logo
                ? <img src={vendedor.logo.startsWith("http") ? vendedor.logo : `${API}${vendedor.logo}`}
                    alt="logo" className="w-12 h-12 rounded-xl object-cover border border-white/10"
                    onContextMenu={e => e.preventDefault()} />
                : <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.bg} border ${plan.border} flex items-center justify-center text-lg font-black text-white`}>
                    {vendedor.nombreTienda[0]?.toUpperCase()}
                  </div>}
              {vendedor.plan === "premium" && (
                <Crown className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-400 fill-amber-400" />
              )}
              {(vendedor.plan === "pro" || vendedor.plan === "premium") && (
                <BadgeCheck className="absolute -bottom-1 -right-1 w-4 h-4 text-blue-400 fill-blue-400/20" />
              )}
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">{vendedor.nombreTienda}</p>
                  <p className="text-xs text-gray-500">{vendedor.propietario} · {vendedor.ciudad}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PlanBadge plan={vendedor.plan} />
                  <button onClick={toggleActivo} disabled={toggling}
                    title={vendedor.activo ? "Desactivar" : "Activar"}
                    className={`transition hover:scale-110 active:scale-95 ${toggling ? "opacity-50" : ""}`}>
                    {toggling
                      ? <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                      : vendedor.activo
                        ? <ToggleRight className="w-7 h-7 text-emerald-400" />
                        : <ToggleLeft className="w-7 h-7 text-gray-600" />}
                  </button>
                </div>
              </div>

              {/* Estado de suscripción */}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-bold ${diasColor(dias)}`}>
                  {dias === null
                    ? "Sin fecha de expiración"
                    : dias <= 0
                      ? "⚠️ Suscripción vencida"
                      : dias <= 7
                        ? `⏰ Vence en ${dias} día${dias !== 1 ? "s" : ""}`
                        : `✓ ${dias} días restantes`}
                </span>
                {vendedor.fechaExpiracion && (
                  <span className="text-[10px] text-gray-600">
                    hasta {format(parseISO(vendedor.fechaExpiracion), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats mini */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { icon: Package,    val: vendedor.productosCount,                 label: "Productos" },
              { icon: Eye,        val: vendedor.visitasTotales.toLocaleString("es-HN"), label: "Visitas"  },
              { icon: DollarSign, val: vendedor.mesesPagados.reduce((s, p) => s + (p.monto || 0), 0).toFixed(0), label: "L cobrado" },
            ].map(({ icon: Ico, val, label }) => (
              <div key={label} className="bg-gray-800/50 rounded-xl p-2.5 text-center">
                <Ico className="w-3.5 h-3.5 mx-auto text-orange-400 mb-1" />
                <p className="text-sm font-black text-white">{val}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setFacturaOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl text-xs transition-all">
              <DollarSign className="w-3.5 h-3.5" /> Registrar pago
            </button>
            <button onClick={() => setExpand(e => !e)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all
                ${expand ? "bg-orange-600/20 text-orange-400 border border-orange-500/30" : "bg-gray-800 hover:bg-gray-700 text-gray-400"}`}>
              {expand ? "Ocultar" : "Ver más"}
            </button>
          </div>
        </div>

        {/* EXPANDIDO */}
        {expand && (
          <div className="border-t border-white/5 p-4 space-y-5">

            {/* Info de contacto */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span>{vendedor.telefono}</span>
              </div>
              {vendedor.email && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="truncate">{vendedor.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>{vendedor.ciudad}, {vendedor.departamento}</span>
              </div>
              {vendedor.google_maps_url && (
                <a href={vendedor.google_maps_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition">
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Ver en Maps</span>
                </a>
              )}
            </div>

            {/* DNI / RTN */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-800/30 rounded-xl p-3">
              <span>DNI: <strong className="text-gray-300">{vendedor.dni}</strong></span>
              <span>RTN: <strong className="text-gray-300">{vendedor.rtn || "—"}</strong></span>
              {vendedor.fechaAprobacion && (
                <span className="col-span-2">
                  Aprobado el {format(parseISO(vendedor.fechaAprobacion), "dd/MM/yyyy")}
                </span>
              )}
            </div>

            {/* Restricciones del plan actual */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                {plan.icon} Plan {plan.nombre} — Límites
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {plan.restricciones.map(r => (
                  <div key={r} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <CheckCircle2 className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            </div>

            {/* Pedidos completados */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
                Pedidos completados
              </p>
              <PedidosCompletados vendedorDni={vendedor.dni} />
            </div>

            {/* Calendario */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Calendario de pagos</p>
              <CalendarioVendedor vendedor={vendedor} />
            </div>

          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function VendedoresPage() {
  const [vendedores,  setVendedores]  = useState<VendedorAdmin[]>([]);
  const [search,      setSearch]      = useState("");
  const [filtroPlan,  setFiltroPlan]  = useState("");
  const [filtroEstado,setFiltroEstado]= useState("");
  const [loading,     setLoading]     = useState(true);
  const [refreshKey,  setRefreshKey]  = useState(0);
  const router = useRouter();

  const cargar = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/admin-phoenix-2025"); return; }
    setLoading(true);
    try {
      let url = `${API}/api/vendedores?`;
      if (search)      url += `search=${encodeURIComponent(search)}&`;
      if (filtroPlan)  url += `plan=${filtroPlan}&`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.push("/admin-phoenix-2025"); return; }
      let data: VendedorAdmin[] = await res.json();

      // Enriquecer con diasRestantes en frontend también
      const hoy = new Date();
      data = data.map(v => {
        if (!v.fechaExpiracion) return { ...v, diasRestantes: null };
        const exp  = parseISO(v.fechaExpiracion);
        const dias = Math.ceil((exp.getTime() - hoy.getTime()) / 86400000);
        return { ...v, diasRestantes: dias };
      });

      // Filtro estado
      if (filtroEstado === "activo")   data = data.filter(v => v.activo && (v.diasRestantes ?? 1) > 0);
      if (filtroEstado === "vencido")  data = data.filter(v => !v.activo || (v.diasRestantes ?? 1) <= 0);
      if (filtroEstado === "urgente")  data = data.filter(v => v.diasRestantes !== null && v.diasRestantes > 0 && v.diasRestantes <= 7);

      setVendedores(data);
    } finally { setLoading(false); }
  }, [search, filtroPlan, filtroEstado, router]);

  useEffect(() => { cargar(); }, [cargar, refreshKey]);

  // Desactivación automática en cliente cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      const hoy = new Date();
      setVendedores(prev => prev.map(v => {
        if (!v.fechaExpiracion) return v;
        const dias = Math.ceil((parseISO(v.fechaExpiracion).getTime() - hoy.getTime()) / 86400000);
        return { ...v, diasRestantes: dias, activo: dias > 0 ? v.activo : false };
      }));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const onUpdate = (updated: VendedorAdmin) => {
    setVendedores(prev => prev.map(v => v.id === updated.id ? updated : v));
  };

  const stats = {
    total:   vendedores.length,
    activos: vendedores.filter(v => v.activo && (v.diasRestantes ?? 1) > 0).length,
    urgentes:vendedores.filter(v => v.diasRestantes !== null && v.diasRestantes > 0 && v.diasRestantes <= 7).length,
    vencidos:vendedores.filter(v => (v.diasRestantes ?? 1) <= 0).length,
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Vendedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.activos} activos · {stats.urgentes > 0 && <span className="text-amber-400">{stats.urgentes} por vencer · </span>}
            {stats.vencidos > 0 && <span className="text-red-400">{stats.vencidos} vencidos</span>}
          </p>
        </div>
        <button onClick={() => setRefreshKey(k => k+1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",    val: stats.total,    color: "text-white",    bg: "bg-gray-800", cursor: "", f: "" },
          { label: "Activos",  val: stats.activos,  color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-500/20", cursor: "cursor-pointer", f: "activo" },
          { label: "Por vencer (≤7d)", val: stats.urgentes, color: "text-amber-400", bg: "bg-amber-950/30 border-amber-500/20", cursor: "cursor-pointer", f: "urgente" },
          { label: "Vencidos", val: stats.vencidos, color: "text-red-400",   bg: "bg-red-950/30 border-red-500/20",  cursor: "cursor-pointer", f: "vencido" },
        ].map(s => (
          <div key={s.label} onClick={() => setFiltroEstado(filtroEstado === s.f ? "" : s.f)}
            className={`${s.bg} border border-white/5 rounded-2xl px-4 py-3 ${s.cursor} hover:border-orange-500/20 transition-all`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setRefreshKey(k => k+1)}
            placeholder="Buscar tienda, propietario..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-white/10 focus:border-orange-500/40 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition" />
        </div>
        <select value={filtroPlan} onChange={e => setFiltroPlan(e.target.value)}
          className="px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-sm text-gray-300 outline-none appearance-none transition focus:border-orange-500/40">
          <option value="">Todos los planes</option>
          {Object.entries(PLANES).map(([k, p]) => (
            <option key={k} value={k}>{p.icon} {p.nombre}</option>
          ))}
        </select>
        {(filtroPlan || filtroEstado || search) && (
          <button onClick={() => { setFiltroPlan(""); setFiltroEstado(""); setSearch(""); }}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs text-gray-400 font-semibold transition">
            Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-orange-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Cargando vendedores...</p>
          </div>
        </div>
      ) : vendedores.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-white/5">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">Sin vendedores</p>
          <p className="text-gray-600 text-sm mt-1">Ajusta los filtros o espera nuevos registros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendedores.map(v => (
            <VendedorCard key={v.id} vendedor={v} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}