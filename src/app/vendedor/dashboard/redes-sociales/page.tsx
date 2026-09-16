"use client";
/**
 * /dashboard/redes-sociales/page.tsx
 *
 * Página de configuración de redes sociales.
 *
 * NIVEL A (activo):  muestra instrucciones + genera links de compartir.
 * NIVEL B (OAuth):   conecta Facebook Pages / Instagram Business vía
 *                    Meta Graph API. Requiere que registres tu app en
 *                    Meta for Developers (ver SETUP.md al final del archivo).
 */

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Wifi, WifiOff, Settings, ExternalLink, CheckCircle2,
  AlertTriangle, Loader2, Zap, Shield, RefreshCw, Trash2,
  ChevronRight, Globe, Link, Info, Copy, Check
} from "lucide-react";

const API_URL         = "http://localhost:8000";
const PLATAFORMA_URL  = "https://mercadofenix.hn"; // ← tu dominio

// ── Tu App ID de Meta for Developers ─────────────────────────────────────────
// Regístrala en https://developers.facebook.com/apps/
// Agrégala al .env del frontend como NEXT_PUBLIC_META_APP_ID
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "TU_META_APP_ID";

// Permisos que necesitamos pedir
const FB_SCOPES = [
  "pages_manage_posts",      // publicar en páginas
  "pages_read_engagement",   // leer métricas
  "instagram_basic",         // info básica de IG
  "instagram_content_publish", // publicar en IG
].join(",");

function getToken() { return typeof window !== "undefined" ? localStorage.getItem("vendedor_token") : null; }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface RedConexion {
  red: "facebook" | "instagram";
  conectada: boolean;
  nombre_pagina?: string;
  foto_pagina?: string;
  page_id?: string;
  ig_user_id?: string;
  ultimo_post?: string;
  posts_total?: number;
}

// ── Carga el SDK de Facebook ──────────────────────────────────────────────────
function cargarFBSDK(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).FB) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/es_LA/sdk.js";
    script.onload = () => {
      (window as any).FB.init({ appId: META_APP_ID, cookie: true, xfbml: true, version: "v19.0" });
      resolve();
    };
    document.body.appendChild(script);
  });
}

// ════════════════════════════════════════════════════════════════════════════
export default function RedesSociales() {
  const router = useRouter();
  const [conexiones, setConexiones] = useState<RedConexion[]>([
    { red: "facebook",  conectada: false },
    { red: "instagram", conectada: false },
  ]);
  const [cargando, setCargando]       = useState(true);
  const [conectando, setConectando]   = useState<string | null>(null);
  const [desconectando, setDescon]    = useState<string | null>(null);
  const [toast, setToast]             = useState<{msg:string;tipo:"ok"|"err"|"info"}|null>(null);
  const [copiado, setCopiado]         = useState(false);

  const showToast = (msg: string, tipo: "ok"|"err"|"info") => {
    setToast({msg,tipo}); setTimeout(()=>setToast(null),4000);
  };

  // ── Cargar estado actual de conexiones ────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/vendedor/redes-sociales`, { headers: authHeaders() });
        if (res.data?.length) setConexiones(res.data);
      } catch { /* endpoint aún no existe, se muestra en modo desconectado */ }
      finally { setCargando(false); }
    };
    cargar();
  }, []);

  // ── Iniciar OAuth de Facebook / Instagram ─────────────────────────────────
  const conectarFacebook = async () => {
    setConectando("facebook");
    try {
      await cargarFBSDK();
      const FB = (window as any).FB;

      // Abrir login de Facebook
      FB.login(async (resp: any) => {
        if (resp.status !== "connected") {
          showToast("Inicio de sesión cancelado", "info");
          setConectando(null);
          return;
        }

        const { accessToken, userID } = resp.authResponse;

        // Enviar el token al backend para intercambiarlo por un token de larga duración
        // y obtener las páginas administradas
        const res = await axios.post(
          `${API_URL}/api/vendedor/redes-sociales/conectar-facebook`,
          { access_token: accessToken, user_id: userID },
          { headers: authHeaders() }
        );

        setConexiones(prev => prev.map(c =>
          c.red === "facebook" || c.red === "instagram"
            ? { ...c, ...res.data.find((r: RedConexion) => r.red === c.red) || c }
            : c
        ));
        showToast("¡Facebook e Instagram conectados con éxito!", "ok");
        setConectando(null);

        // Recargar conexiones
        const updated = await axios.get(`${API_URL}/api/vendedor/redes-sociales`, { headers: authHeaders() });
        if (updated.data?.length) setConexiones(updated.data);

      }, { scope: FB_SCOPES });

    } catch (err: any) {
      showToast(err.response?.data?.detail || "Error al conectar con Facebook", "err");
      setConectando(null);
    }
  };

  // ── Desconectar una red ────────────────────────────────────────────────────
  const desconectar = async (red: string) => {
    if (!confirm(`¿Desconectar ${red === "facebook" ? "Facebook" : "Instagram"}? Las publicaciones anteriores no se eliminarán.`)) return;
    setDescon(red);
    try {
      await axios.delete(`${API_URL}/api/vendedor/redes-sociales/${red}`, { headers: authHeaders() });
      setConexiones(prev => prev.map(c => c.red === red ? { ...c, conectada: false, nombre_pagina: undefined } : c));
      showToast(`${red} desconectado`, "ok");
    } catch { showToast("Error al desconectar", "err"); }
    finally { setDescon(null); }
  };

  const copiarCallbackURL = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : PLATAFORMA_URL}/api/auth/facebook/callback`;
    navigator.clipboard.writeText(url);
    setCopiado(true); setTimeout(() => setCopiado(false), 2000);
  };

  // ── Config visual de cada red ─────────────────────────────────────────────
  const REDES_CONFIG = {
    facebook: {
      nombre: "Facebook Pages",
      desc:   "Publica automáticamente en tu Página de Facebook de negocio.",
      color:  "#1877F2",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      permisos: ["Publicar en tu Página", "Leer estadísticas de engagement", "Conectar Instagram Business"],
    },
    instagram: {
      nombre: "Instagram Business",
      desc:   "Publica en tu cuenta de Instagram Business vinculada a tu Página de Facebook.",
      color:  "#E1306C",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <defs>
            <linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f09433"/>
              <stop offset="50%" stopColor="#dc2743"/>
              <stop offset="100%" stopColor="#bc1888"/>
            </linearGradient>
          </defs>
          <path fill="url(#ig2)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      permisos: ["Publicar fotos y videos", "Se conecta automáticamente con Facebook"],
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080810] pb-24">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold pointer-events-none
          ${toast.tipo==="ok"
            ?"bg-emerald-50 dark:bg-[#0a1f14] border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200"
            :toast.tipo==="err"
            ?"bg-red-50 dark:bg-[#1f0a0a] border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-200"
            :"bg-blue-50 dark:bg-[#0a0a1f] border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-200"}`}>
          {toast.tipo==="ok"?<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>:toast.tipo==="err"?<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400"/>:<Info className="w-4 h-4 text-blue-600 dark:text-blue-400"/>}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#080810]/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.05]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/vendedor/dashboard")}
            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black text-gray-900 dark:text-white">Redes Sociales</h1>
            <p className="text-xs text-gray-400 dark:text-gray-600">Publica tus productos automáticamente</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* ── Banner modo actual ───────────────────────────────────────── */}
        <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${
          conexiones.some(c => c.conectada)
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/20"
            : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/15"
        }`}>
          {conexiones.some(c => c.conectada)
            ? <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            : <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className="text-gray-900 dark:text-white font-bold text-sm">
              {conexiones.some(c => c.conectada) ? "Publicación automática activa" : "Modo compartir manual activo"}
            </p>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
              {conexiones.some(c => c.conectada)
                ? "Las publicaciones se envían directamente a tus redes conectadas sin salir de la plataforma."
                : "Al publicar un producto, se abrirá Facebook con el contenido listo. Conecta tus redes para automatizar el proceso."}
            </p>
          </div>
        </div>

        {/* ── Cards de redes ───────────────────────────────────────────── */}
        {cargando ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-36 rounded-2xl bg-gray-200 dark:bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {(["facebook","instagram"] as const).map(red => {
              const cfg      = REDES_CONFIG[red];
              const conexion = conexiones.find(c => c.red === red);
              const activa   = conexion?.conectada;
              const esFB     = red === "facebook";
              const esCargando = conectando === red || desconectando === red;

              return (
                <div key={red} className={`rounded-2xl border overflow-hidden transition-all
                  ${activa ? "border-gray-300 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.03]" : "border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"}`}>

                  {/* Header de la tarjeta */}
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 dark:text-white font-bold text-sm">{cfg.nombre}</p>
                        {activa && (
                          <span className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/20">
                            <Wifi className="w-2.5 h-2.5" /> Conectado
                          </span>
                        )}
                        {!activa && (
                          <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-500/10 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/[0.07]">
                            <WifiOff className="w-2.5 h-2.5" /> Sin conectar
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{cfg.desc}</p>
                    </div>
                  </div>

                  {/* Info si conectado */}
                  {activa && conexion?.nombre_pagina && (
                    <div className="mx-5 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06]">
                      {conexion.foto_pagina && (
                        <img src={conexion.foto_pagina} className="w-8 h-8 rounded-lg object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white text-sm font-semibold">{conexion.nombre_pagina}</p>
                        {conexion.ultimo_post && (
                          <p className="text-gray-500 text-xs">
                            Última publicación: {new Date(conexion.ultimo_post).toLocaleDateString("es-HN")}
                          </p>
                        )}
                      </div>
                      {conexion.posts_total !== undefined && (
                        <div className="text-right">
                          <p className="text-gray-900 dark:text-white font-black text-lg leading-none">{conexion.posts_total}</p>
                          <p className="text-gray-400 dark:text-gray-600 text-[10px]">publicaciones</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Permisos */}
                  <div className="mx-5 mb-4">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-2">Permisos requeridos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cfg.permisos.map(p => (
                        <span key={p} className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[10px] px-2 py-1 rounded-lg border border-gray-200 dark:border-white/[0.07]">
                          <Shield className="w-2.5 h-2.5 text-gray-400 dark:text-gray-600" /> {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="px-5 pb-5 flex gap-2">
                    {!activa ? (
                      esFB ? (
                        // Facebook: inicia el flujo OAuth completo (conecta FB + IG a la vez)
                        <button onClick={conectarFacebook} disabled={esCargando || !!conectando}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50"
                          style={{ background: "#1877F2", color: "white" }}>
                          {esCargando
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                            : <><svg viewBox="0 0 24 24" className="w-4 h-4" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                              Conectar con Facebook</>}
                        </button>
                      ) : (
                        // Instagram: se conecta automáticamente al conectar Facebook
                        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                          <Info className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                          <p className="text-gray-500 text-xs">Se conecta automáticamente al vincular Facebook. Requiere cuenta Instagram Business.</p>
                        </div>
                      )
                    ) : (
                      <>
                        <button onClick={() => desconectar(red)} disabled={esCargando}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-600/10 hover:bg-red-100 dark:hover:bg-red-600/20 text-red-600 dark:text-red-400 font-semibold text-sm border border-red-200 dark:border-red-500/20 transition disabled:opacity-50">
                          {esCargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Desconectar
                        </button>
                        <button onClick={() => {
                          setConectando(red);
                          conectarFacebook().then(() => setConectando(null));
                        }} disabled={esCargando}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 text-gray-500 dark:text-gray-400 font-semibold text-sm border border-gray-200 dark:border-white/[0.07] transition disabled:opacity-50">
                          {esCargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Reconectar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Setup guide ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-white/[0.05]">
            <h3 className="text-gray-900 dark:text-white font-bold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" /> Configuración para administradores
            </h3>
            <p className="text-gray-500 text-xs mt-0.5">Pasos necesarios para activar la publicación automática</p>
          </div>
          <div className="p-5 space-y-4">

            {[
              {
                n: "1", titulo: "Crear app en Meta for Developers",
                desc: "Crea una app de tipo \"Business\" en developers.facebook.com. Activa los productos Facebook Login y Pages API.",
                link: "https://developers.facebook.com/apps/", linkLabel: "Ir a Meta Developers"
              },
              {
                n: "2", titulo: "Configurar permisos",
                desc: `Solicita los permisos: pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish. Para producción necesitarás revisión de Meta.`,
              },
              {
                n: "3", titulo: "Agregar Redirect URI",
                desc: "En la configuración de Facebook Login, agrega esta URL como Redirect URI válida:",
                showCopy: true,
              },
              {
                n: "4", titulo: "Variables de entorno",
                desc: "Agrega al .env de tu backend: META_APP_ID, META_APP_SECRET. Y al frontend: NEXT_PUBLIC_META_APP_ID.",
              },
              {
                n: "5", titulo: "Agregar endpoint al backend",
                desc: "Agrega el archivo social_routes.py a tu proyecto (incluido en la entrega) y monta el router en main.py.",
              },
            ].map(step => (
              <div key={step.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-orange-600 dark:text-orange-400 text-[10px] font-black">{step.n}</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white text-sm font-semibold">{step.titulo}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{step.desc}</p>
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 transition">
                      {step.linkLabel} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {step.showCopy && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08]">
                      <code className="text-xs text-blue-700 dark:text-blue-300 flex-1 truncate font-mono">
                        {typeof window !== "undefined" ? window.location.origin : PLATAFORMA_URL}/api/auth/facebook/callback
                      </code>
                      <button onClick={copiarCallbackURL}
                        className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition flex-shrink-0">
                        {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Link a docs de Meta ──────────────────────────────────────── */}
        <a href="https://developers.facebook.com/docs/pages/publishing" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/[0.12] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition group">
          <Globe className="w-5 h-5 text-gray-400 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-white transition flex-shrink-0" />
          <div className="flex-1">
            <p className="text-gray-900 dark:text-white text-sm font-semibold">Documentación oficial de Meta</p>
            <p className="text-gray-500 text-xs">Pages Publishing API · Graph API v19.0</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition" />
        </a>

      </div>
    </div>
  );
}