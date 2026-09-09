// src/app/soporte/page.tsx
"use client";
import { useRouter } from "next/navigation";
import {
  MessageCircle, Mail, Phone, ChevronLeft, Clock,
  HelpCircle, BookOpen, AlertTriangle, Package, CreditCard, Shield
} from "lucide-react";

const WA_NUMBER = "50499751480";
const EMAIL     = "alicona031@gmail.com";

const TEMAS = [
  { icon: Package,      label: "Problema con un pedido",      msg: "Hola! Necesito ayuda con un pedido en Mercado Fénix 📦" },
  { icon: CreditCard,   label: "Problema de pago",            msg: "Hola! Tengo un problema con un pago en Mercado Fénix 💳" },
  { icon: Shield,       label: "Mi cuenta fue comprometida",  msg: "Hola! Creo que mi cuenta fue comprometida, necesito ayuda urgente 🚨" },
  { icon: AlertTriangle,label: "Reportar un vendedor",        msg: "Hola! Quiero reportar un vendedor en Mercado Fénix ⚠️" },
  { icon: BookOpen,     label: "Cómo usar la plataforma",     msg: "Hola! Tengo preguntas sobre cómo usar Mercado Fénix 📖" },
  { icon: HelpCircle,   label: "Otro problema",               msg: "Hola! Necesito ayuda con Mercado Fénix" },
];

const FAQS = [
  { q: "¿Cómo hago un pedido?",
    a: "Busca el producto, tócalo para ver los detalles y haz clic en 'Comprar'. Elige el método de pago y envía tu comprobante al vendedor por el chat del pedido." },
  { q: "¿Mi pago es seguro?",
    a: "Sí. Los pagos se coordinan directamente con vendedores verificados que presentaron su documento de identidad al registrarse." },
  { q: "¿Qué hago si mi pedido no llega?",
    a: "Escríbele al vendedor por el chat del pedido. Si no responde en 24 h, contáctanos por WhatsApp y lo investigaremos." },
  { q: "¿Puedo cancelar un pedido?",
    a: "Sí, mientras esté en estado 'Pendiente'. Una vez confirmado, coordina directamente con el vendedor." },
  { q: "¿Cómo registro mi tienda?",
    a: "Toca 'Vendedor' en el menú principal. Necesitas tu DNI, RTN y foto de tu documento de identidad para verificación." },
];

export default function SoportePage() {
  const router = useRouter();
  const wa = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <a href="/fenix" className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </a>
          <div>
            <h1 className="font-black text-gray-900 text-base">Soporte técnico</h1>
            <p className="text-xs text-gray-400">Te respondemos rápido</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-100">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">¿En qué podemos ayudarte?</h2>
            <p className="text-gray-500 text-sm mt-1">Nuestro equipo atiende de lunes a sábado, 8am – 6pm.</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-700 text-xs font-semibold">Soporte disponible ahora</span>
          </div>
        </div>

        {/* Canales */}
        <div className="grid grid-cols-2 gap-3">
          <a href={wa("Hola! Necesito ayuda con Mercado Fénix 👋")} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-2.5 p-5 bg-emerald-500 hover:bg-emerald-600 rounded-2xl transition-all active:scale-[0.97] text-center shadow-md shadow-emerald-100">
            <MessageCircle className="w-7 h-7 text-white" />
            <div>
              <p className="font-black text-white text-sm">WhatsApp</p>
              <p className="text-emerald-100 text-xs mt-0.5">Respuesta inmediata</p>
            </div>
          </a>
          <a href={`mailto:${EMAIL}?subject=Soporte Mercado Fénix`}
            className="flex flex-col items-center gap-2.5 p-5 bg-blue-500 hover:bg-blue-600 rounded-2xl transition-all active:scale-[0.97] text-center shadow-md shadow-blue-100">
            <Mail className="w-7 h-7 text-white" />
            <div>
              <p className="font-black text-white text-sm">Correo</p>
              <p className="text-blue-100 text-xs mt-0.5">En menos de 24 h</p>
            </div>
          </a>
        </div>

        {/* Temas */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Escríbenos por tu tema</p>
          {TEMAS.map((t, i) => {
            const Icon = t.icon;
            return (
              <a key={i} href={wa(t.msg)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-100 hover:border-orange-200 hover:bg-orange-50 rounded-2xl transition-all group shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center flex-shrink-0 transition">
                  <Icon className="w-4.5 h-4.5 text-orange-500" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition">{t.label}</span>
                <MessageCircle className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition flex-shrink-0" />
              </a>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Preguntas frecuentes</p>
          {FAQS.map((f, i) => (
            <details key={i} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none">
                <span className="text-sm font-semibold text-gray-800 pr-4">{f.q}</span>
                <ChevronLeft className="w-4 h-4 text-gray-400 -rotate-90 group-open:rotate-90 transition-transform flex-shrink-0" />
              </summary>
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </div>
            </details>
          ))}
        </div>

        {/* Info */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3.5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Información de contacto</p>
          {[
            { icon: Phone, text: "+504 9975-1480",    href: `https://wa.me/${WA_NUMBER}` },
            { icon: Mail,  text: EMAIL,               href: `mailto:${EMAIL}` },
            { icon: Clock, text: "Lun – Sáb, 8am – 6pm", href: null },
          ].map((item, i) => {
            const Icon = item.icon;
            const el = (
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">{item.text}</span>
              </div>
            );
            return item.href
              ? <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-75 transition">{el}</a>
              : <div key={i}>{el}</div>;
          })}
        </div>
      </div>
    </div>
  );
}