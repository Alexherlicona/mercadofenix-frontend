// src/app/vendedor/suscripcion/page.tsx
// Se muestra automáticamente cuando la suscripción del vendedor expira
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown, Zap, Shield, Star, CheckCircle2, X,
  MessageCircle, Phone, ArrowRight, Clock, AlertCircle,
  Package, TrendingUp, Users, BadgeCheck
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PLANES = [
  {
    key:        "basico",
    nombre:     "Básico",
    precio:     300,
    icon:       <Zap className="w-6 h-6" />,
    color:      "text-blue-400",
    border:     "border-blue-500/40",
    bg:         "bg-blue-900/10",
    btnBg:      "bg-blue-600 hover:bg-blue-500",
    popular:    false,
    incluye: [
      "Hasta 30 productos",
      "2 productos destacados",
      "Estadísticas básicas",
      "Chat con clientes",
      "Soporte general",
    ],
    noIncluye: [
      "Insignia verificado",
      "Prioridad en catálogo",
      "Soporte prioritario",
      "Estadísticas avanzadas",
    ],
  },
  {
    key:        "pro",
    nombre:     "Pro",
    precio:     500,
    icon:       <Star className="w-6 h-6" />,
    color:      "text-purple-400",
    border:     "border-purple-500/40",
    bg:         "bg-purple-900/10",
    btnBg:      "bg-purple-600 hover:bg-purple-500",
    popular:    true,
    incluye: [
      "Hasta 150 productos",
      "10 productos destacados",
      "Estadísticas completas",
      "Chat con clientes",
      "Soporte prioritario",
      "Insignia verificado ✓",
    ],
    noIncluye: [
      "Prioridad máxima en catálogo",
      "Estadísticas con IA",
      "Análisis de competencia",
    ],
  },
  {
    key:        "premium",
    nombre:     "Premium",
    precio:     800,
    icon:       <Crown className="w-6 h-6" />,
    color:      "text-amber-400",
    border:     "border-amber-500/40",
    bg:         "bg-amber-900/10",
    btnBg:      "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500",
    popular:    false,
    incluye: [
      "Productos ilimitados",
      "Destacados ilimitados",
      "Estadísticas con IA",
      "Chat con clientes",
      "Soporte 24/7 prioritario",
      "Insignia verificado ✓",
      "Prioridad máxima en catálogo",
      "Análisis de competencia",
      "Primer lugar en búsquedas",
    ],
    noIncluye: [],
  },
] as const;

// ── Número de WhatsApp de soporte de Mercado Fénix ────────────────────────
const WA_SOPORTE = "50498887766"; // ← cambia al número real

export default function SuscripcionExpiradaPage() {
  const [vendedor, setVendedor] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [planSel,  setPlanSel]  = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("vendedor_token");
    if (!token) { router.push("/vendedor"); return; }

    fetch(`${API}/api/vendedor/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push("/vendedor"); return; }
        // Si aún tiene suscripción activa, redirigir al dashboard
        if (data.activo && data.fecha_expiracion) {
          const exp  = new Date(data.fecha_expiracion);
          const dias = Math.ceil((exp.getTime() - Date.now()) / 86400000);
          if (dias > 0) { router.push("/vendedor/dashboard"); return; }
        }
        setVendedor(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const mensajeWA = (plan: string) => {
    const p = PLANES.find(x => x.key === plan);
    if (!p || !vendedor) return "";
    return encodeURIComponent(
      `Hola Mercado Fénix! 👋\n\n` +
      `Soy *${vendedor.nombre_tienda}* y quiero renovar con el plan *${p.nombre}* (L${p.precio}/mes).\n\n` +
      `DNI: ${vendedor.dni}\n` +
      `Teléfono: ${vendedor.telefono}\n\n` +
      `Por favor indíquenme cómo proceder con el pago. Gracias! 🙏`
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Banner de alerta */}
      <div className="bg-gradient-to-r from-red-900/80 to-orange-900/60 border-b border-red-500/30 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-bold text-white text-sm">Tu suscripción ha expirado</p>
            <p className="text-xs text-red-300 mt-0.5">
              Tu tienda está temporalmente inactiva. Renueva para que tus clientes puedan verte.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
            <span className="text-2xl font-black">MF</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            {vendedor?.nombre_tienda
              ? `¡Hola, ${vendedor.nombre_tienda}!`
              : "Tu suscripción expiró"}
          </h1>
          <p className="text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
            Para seguir vendiendo en Mercado Fénix y que tus productos sean visibles para miles de compradores hondureños, elige un plan de renovación.
          </p>
        </div>

        {/* Comparativa rápida */}
        <div className="bg-gray-900/60 border border-white/5 rounded-3xl p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">
            ¿Qué incluye cada plan?
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <td className="pb-3 text-gray-600 font-semibold">Característica</td>
                  {PLANES.map(p => (
                    <td key={p.key} className={`pb-3 text-center font-bold ${p.color}`}>
                      {p.icon} {p.nombre}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {[
                  { label: "Productos",         vals: ["30", "150", "∞"] },
                  { label: "Destacados",         vals: ["2", "10", "∞"] },
                  { label: "Estadísticas",        vals: ["Básicas", "Completas", "IA"] },
                  { label: "Soporte",            vals: ["General", "Prioritario", "24/7"] },
                  { label: "Insignia verificado", vals: [false, true, true] },
                  { label: "Prioridad catálogo",  vals: [false, false, true] },
                ].map(row => (
                  <tr key={row.label}>
                    <td className="py-2 text-gray-500">{row.label}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} className="py-2 text-center">
                        {typeof v === "boolean"
                          ? v ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" /> : <X className="w-3.5 h-3.5 text-gray-700 mx-auto" />
                          : <span className="text-white font-semibold">{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANES.map(plan => (
            <div key={plan.key}
              className={`relative rounded-3xl border-2 p-5 flex flex-col gap-4 transition-all
                ${plan.popular ? "border-purple-500/60 bg-purple-900/10" : `${plan.border} ${plan.bg}`}
                ${planSel === plan.key ? "scale-[1.02] shadow-2xl" : "hover:scale-[1.01]"}`}>

              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-black px-4 py-1 rounded-full">
                  MÁS POPULAR
                </div>
              )}

              {/* Header del plan */}
              <div className="text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${plan.bg} border ${plan.border}`}>
                  <span className={plan.color}>{plan.icon}</span>
                </div>
                <p className={`text-lg font-black ${plan.color}`}>{plan.nombre}</p>
                <p className="text-3xl font-black text-white mt-1">
                  L{plan.precio}
                  <span className="text-sm font-normal text-gray-500">/mes</span>
                </p>
              </div>

              {/* Descuentos */}
              <div className="bg-gray-900/50 rounded-2xl p-3 space-y-1 text-xs">
                <p className="text-gray-500 font-semibold">Descuentos por adelantado:</p>
                {[
                  { m: 3,  d: 5  },
                  { m: 6,  d: 10 },
                  { m: 12, d: 20 },
                ].map(({ m, d }) => (
                  <div key={m} className="flex justify-between text-gray-400">
                    <span>{m} meses</span>
                    <span className="text-emerald-400 font-bold">-{d}% = L{(plan.precio * m * (1 - d/100)).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Incluye */}
              <div className="flex-1 space-y-1.5">
                {plan.incluye.map(item => (
                  <div key={item} className="flex items-start gap-2 text-xs text-gray-300">
                    <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${plan.color}`} />
                    {item}
                  </div>
                ))}
                {plan.noIncluye.map(item => (
                  <div key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {item}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a href={`https://wa.me/${WA_SOPORTE}?text=${mensajeWA(plan.key)}`}
                target="_blank" rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-3.5 ${plan.btnBg} text-white font-bold rounded-2xl text-sm transition-all active:scale-95`}>
                <MessageCircle className="w-4 h-4" />
                Contratar por WhatsApp
              </a>
            </div>
          ))}
        </div>

        {/* Contacto directo */}
        <div className="bg-gray-900 border border-white/5 rounded-3xl p-6 text-center space-y-4">
          <p className="font-bold text-white">¿Tienes preguntas?</p>
          <p className="text-sm text-gray-400">
            Nuestro equipo está disponible de lunes a sábado de 8am a 6pm para ayudarte a elegir el plan correcto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`https://wa.me/${WA_SOPORTE}?text=${encodeURIComponent("Hola! Tengo preguntas sobre los planes de Mercado Fénix.")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm transition-all">
              <MessageCircle className="w-4 h-4" /> WhatsApp soporte
            </a>
            <button onClick={() => router.push("/vendedor")}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-2xl text-sm transition-all">
              Volver al inicio
            </button>
          </div>
        </div>

        {/* Nota legal */}
        <p className="text-center text-xs text-gray-600 pb-4">
          Mercado Fénix Honduras · Los precios están en Lempiras (HNL) · Los planes se renuevan mensualmente
        </p>
      </div>
    </div>
  );
}