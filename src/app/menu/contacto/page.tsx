// src/app/contacto/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle, Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";

const WA_NUMBER = "50499751480";
const EMAIL     = "alicona031@gmail.com";

function IconFacebook()  { return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>; }
function IconInstagram() { return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>; }
function IconTikTok()    { return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z"/></svg>; }
function IconYouTube()   { return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>; }

const REDES = [
  { nombre: "Facebook",   icon: <IconFacebook />,  url: "https://facebook.com/mercadofenixhn",  textColor: "text-[#1877F2]", bg: "bg-[#1877F2]/10 hover:bg-[#1877F2]/15 border-[#1877F2]/15" },
  { nombre: "Instagram",  icon: <IconInstagram />, url: "https://instagram.com/mercadofenixhn", textColor: "text-pink-500",   bg: "bg-pink-50 hover:bg-pink-100 border-pink-100" },
  { nombre: "TikTok",     icon: <IconTikTok />,    url: "https://tiktok.com/@mercadofenixhn",   textColor: "text-gray-900",   bg: "bg-gray-100 hover:bg-gray-200 border-gray-200" },
  { nombre: "YouTube",    icon: <IconYouTube />,   url: "https://youtube.com/@mercadofenixhn",  textColor: "text-red-600",    bg: "bg-red-50 hover:bg-red-100 border-red-100" },
];

const inp = "w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition";

export default function ContactoPage() {
  const router = useRouter();
  const [form, setForm]   = useState({ nombre: "", email: "", mensaje: "" });
  const [sent, setSent]   = useState(false);

  const enviarWA = () => {
    if (!form.nombre || !form.mensaje) return;
    const txt = `*Mercado Fénix — Contacto*\n\n*Nombre:* ${form.nombre}\n*Email:* ${form.email || "No indicado"}\n*Mensaje:* ${form.mensaje}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(txt)}`, "_blank");
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <a href="/fenix" className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </a>
          <div>
            <h1 className="font-black text-gray-900 text-base">Contáctanos</h1>
            <p className="text-xs text-gray-400">Estamos para ayudarte</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-8">

        {/* Canales rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hola Mercado Fénix! 👋")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl transition-all active:scale-[0.97] shadow-md shadow-emerald-100">
            <MessageCircle className="w-6 h-6 text-white flex-shrink-0" />
            <div>
              <p className="font-black text-white text-sm">WhatsApp</p>
              <p className="text-emerald-100 text-xs">+504 9975-1480</p>
            </div>
          </a>
          <a href={`mailto:${EMAIL}`}
            className="flex items-center gap-3 px-4 py-4 bg-blue-500 hover:bg-blue-600 rounded-2xl transition-all active:scale-[0.97] shadow-md shadow-blue-100">
            <Mail className="w-6 h-6 text-white flex-shrink-0" />
            <div>
              <p className="font-black text-white text-sm">Correo</p>
              <p className="text-blue-100 text-xs truncate">alicona031@gmail.com</p>
            </div>
          </a>
        </div>

        {/* Info */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Información de contacto</p>
          {[
            { icon: Phone, text: "+504 9975-1480",       sub: "WhatsApp disponible",   href: `https://wa.me/${WA_NUMBER}` },
            { icon: Mail,  text: EMAIL,                  sub: "Respuesta en 24 h",     href: `mailto:${EMAIL}` },
            { icon: MapPin,text: "Honduras",             sub: "Cobertura nacional 🇭🇳", href: null },
            { icon: Clock, text: "Lun – Sáb, 8am – 6pm",sub: "Horario de atención",   href: null },
          ].map((item, i) => {
            const Icon = item.icon;
            const content = (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.text}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
              </div>
            );
            return item.href
              ? <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-75 transition">{content}</a>
              : <div key={i}>{content}</div>;
          })}
        </div>

        {/* Redes */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Redes sociales</p>
          <div className="grid grid-cols-2 gap-2">
            {REDES.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm ${r.bg}`}>
                <span className={r.textColor}>{r.icon}</span>
                <span className="text-sm font-semibold text-gray-800">{r.nombre}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Envíanos un mensaje</p>

          {sent ? (
            <div className="text-center py-8 space-y-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-gray-900">¡Mensaje enviado!</p>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">Se abrió WhatsApp con tu mensaje. Si no abrió automáticamente, toca el botón de arriba.</p>
              <button onClick={() => { setSent(false); setForm({ nombre:"", email:"", mensaje:"" }); }}
                className="text-orange-500 text-sm font-semibold hover:text-orange-600 transition">
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm">
              <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                placeholder="Tu nombre *" className={inp} />
              <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                type="email" placeholder="Tu correo electrónico (opcional)" className={inp} />
              <textarea value={form.mensaje} onChange={e => setForm(p => ({...p, mensaje: e.target.value}))}
                rows={4} placeholder="¿En qué podemos ayudarte? *"
                className={inp + " resize-none"} />
              <p className="text-xs text-gray-400">Al enviar serás redirigido a WhatsApp con tu mensaje listo.</p>
              <button onClick={enviarWA} disabled={!form.nombre || !form.mensaje}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-md shadow-orange-100">
                <Send className="w-4 h-4" />
                Enviar por WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}