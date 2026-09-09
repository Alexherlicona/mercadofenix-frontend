// src/app/sobre-nosotros/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, Shield, Zap, Users, MapPin, Star, TrendingUp } from "lucide-react";

function IconFacebook() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}
function IconInstagram() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
}
function IconTikTok() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z"/></svg>;
}
function IconYouTube() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
}
function IconTwitterX() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
}

const REDES = [
  { nombre: "Facebook",    icon: <IconFacebook />,  url: "https://facebook.com/mercadofenixhn",  textColor: "text-[#1877F2]", bg: "bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border-[#1877F2]/20" },
  { nombre: "Instagram",   icon: <IconInstagram />, url: "https://instagram.com/mercadofenixhn", textColor: "text-pink-500",   bg: "bg-pink-50 hover:bg-pink-100 border-pink-100" },
  { nombre: "TikTok",      icon: <IconTikTok />,    url: "https://tiktok.com/@mercadofenixhn",   textColor: "text-gray-900",   bg: "bg-gray-100 hover:bg-gray-200 border-gray-200" },
  { nombre: "YouTube",     icon: <IconYouTube />,   url: "https://youtube.com/@mercadofenixhn",  textColor: "text-red-600",    bg: "bg-red-50 hover:bg-red-100 border-red-100" },
  { nombre: "X / Twitter", icon: <IconTwitterX />,  url: "https://x.com/mercadofenixhn",         textColor: "text-gray-900",   bg: "bg-gray-100 hover:bg-gray-200 border-gray-200" },
];

const VALORES = [
  { icon: Shield,     color: "text-orange-500", bg: "bg-orange-50", titulo: "Confianza",   desc: "Verificamos cada tienda con documento de identidad." },
  { icon: Zap,        color: "text-purple-500", bg: "bg-purple-50", titulo: "Rapidez",     desc: "Conectamos compradores y vendedores en segundos." },
  { icon: Heart,      color: "text-red-500",    bg: "bg-red-50",    titulo: "Comunidad",   desc: "Apoyamos a emprendedores hondureños." },
  { icon: TrendingUp, color: "text-emerald-500",bg: "bg-emerald-50",titulo: "Crecimiento", desc: "Herramientas modernas para crecer digitalmente." },
];

export default function SobreNosotrosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <a href="/fenix" className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </a>
          <h1 className="font-black text-gray-900 text-base">Sobre nosotros</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 space-y-8 pt-6">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-orange-100">
              <span className="text-white font-black text-3xl">MF</span>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow">
              <span className="text-white text-[10px] font-black">HN</span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Mercado Fénix</h2>
            <p className="text-gray-500 text-sm mt-1">La plataforma de comercio digital de Honduras</p>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
            Somos una plataforma hondureña creada para conectar compradores y vendedores de todo el país de forma segura, rápida y sencilla.
          </p>
        </div>

        {/* Misión */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-6 text-center space-y-2 shadow-lg shadow-orange-100">
          <p className="text-orange-100 text-xs font-bold uppercase tracking-widest">Nuestra misión</p>
          <p className="text-white font-bold text-base leading-relaxed">
            "Democratizar el comercio electrónico en Honduras, dando a cada emprendedor las herramientas para crecer."
          </p>
        </div>

        {/* Valores */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Nuestros valores</p>
          <div className="grid grid-cols-2 gap-3">
            {VALORES.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${v.bg}`}>
                    <Icon className={`w-4.5 h-4.5 ${v.color}`} />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{v.titulo}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { val: "18",   label: "Departamentos", icon: MapPin   },
            { val: "100+", label: "Vendedores",    icon: Users    },
            { val: "4.8★", label: "Calificación",  icon: Star     },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <Icon className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                <p className="text-xl font-black text-gray-900">{s.val}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Redes */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Síguenos en redes</p>
          <div className="space-y-2">
            {REDES.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-4 px-4 py-3.5 border rounded-2xl transition-all group shadow-sm ${r.bg}`}>
                <span className={r.textColor}>{r.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{r.nombre}</p>
                  <p className="text-xs text-gray-400">@mercadofenixhn</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-orange-400 transition" />
              </a>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 pb-4">Mercado Fénix v1.0 · Honduras 🇭🇳 · 2025</p>
      </div>
    </div>
  );
}