"use client";
/**
 * CompartirProducto — componente reutilizable
 *
 * Nivel A (activo hoy):
 *   Genera links de compartir para Facebook e Instagram con contenido
 *   pre-armado y redirige al cliente a la página del producto.
 *
 * Nivel B (automático, requiere OAuth de Meta):
 *   Si el vendedor conectó su Página de Facebook / cuenta Instagram Business,
 *   publica directamente a través de la Graph API sin salir de la plataforma.
 *
 * Uso:
 *   <CompartirProducto
 *     producto={producto}
 *     vendedor={vendedor}
 *     onClose={() => setCompartiendo(null)}
 *   />
 */

import { useState, useEffect } from "react";
import axios from "axios";
import {
  X, Share2, ExternalLink, CheckCircle2, AlertTriangle,
  Loader2, Zap, Settings, Eye, Copy, Check, Globe,
  ImageIcon, ChevronRight, Radio, Wifi
} from "lucide-react";

const API_URL = "http://localhost:8000";
const PLATAFORMA_URL = "https://mercadofenix.hn"; // ← cambia a tu dominio real

function getToken() { return typeof window !== "undefined" ? localStorage.getItem("vendedor_token") : null; }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

// ── Helpers ────────────────────────────────────────────────────────────────
function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildProductoURL(vendedor: any, productoId: string): string {
  const slugTienda = `${slugify(vendedor.nombre_tienda)}-${slugify(vendedor.municipio)}`;
  return `${PLATAFORMA_URL}/tienda/${slugTienda}/producto/${productoId}`;
}

function buildTextoPublicacion(producto: any, vendedor: any, url: string): string {
  const precio = producto.precio_con_descuento || producto.precio;
  const descuento = producto.porcentaje_descuento > 0
    ? ` 🏷️ ¡${producto.porcentaje_descuento}% de descuento!` : "";
  return `🔥 ${producto.nombre}${descuento}

${producto.descripcion ? producto.descripcion.slice(0, 120) + (producto.descripcion.length > 120 ? "..." : "") : ""}

💰 Precio: L${parseFloat(precio).toFixed(2)}
🏪 ${vendedor.nombre_tienda} · ${vendedor.municipio}
${producto.tipo === "fisico" ? `📦 Stock disponible: ${producto.stock ?? "consultar"}` : "⬇️ Descarga inmediata"}

👉 Ver producto completo:
${url}

#MercadoFenix #Honduras #${slugify(producto.categoria).replace(/-/g, "")}`;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface RedConexion {
  red: "facebook" | "instagram";
  conectada: boolean;
  nombre_pagina?: string;
  foto_pagina?: string;
  page_id?: string;
  ig_user_id?: string;
  ultimo_post?: string;
}

interface PublicacionEstado {
  red: string;
  estado: "idle" | "publicando" | "ok" | "error";
  mensaje?: string;
  post_url?: string;
}

interface Props {
  producto: any;
  vendedor: any;
  onClose: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
export default function CompartirProducto({ producto, vendedor, onClose }: Props) {
  const [conexiones, setConexiones] = useState<RedConexion[]>([]);
  const [cargandoConex, setCargandoConex] = useState(true);

  // Redes seleccionadas para esta publicación
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  // Texto editable
  const productoURL  = buildProductoURL(vendedor, producto.id);
  const textoDefault = buildTextoPublicacion(producto, vendedor, productoURL);
  const [texto, setTexto]   = useState(textoDefault);
  const [copiado, setCopiado] = useState(false);

  // Estado por red
  const [estados, setEstados] = useState<Record<string, PublicacionEstado>>({});
  const [publicando, setPublicando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<"facebook" | "instagram" | null>(null);

  // ── Cargar conexiones activas ────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/vendedor/redes-sociales`, { headers: authHeaders() });
        setConexiones(res.data || []);
        // Pre-seleccionar las que ya están conectadas
        const conectadas = (res.data || []).filter((r: RedConexion) => r.conectada).map((r: RedConexion) => r.red);
        setSeleccionadas(new Set(conectadas));
      } catch {
        // Si el endpoint no existe aún, mostrar modo Nivel A solamente
        setConexiones([
          { red: "facebook",  conectada: false },
          { red: "instagram", conectada: false },
        ]);
      } finally { setCargandoConex(false); }
    };
    cargar();
  }, []);

  const toggleRed = (red: string) => {
    setSeleccionadas(prev => {
      const s = new Set(prev);
      s.has(red) ? s.delete(red) : s.add(red);
      return s;
    });
  };

  const copiarTexto = () => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  // ── NIVEL A: Abrir ventana de compartir ──────────────────────────────────
  const compartirNivelA = (red: "facebook" | "instagram") => {
    const encodedUrl  = encodeURIComponent(productoURL);
    const encodedText = encodeURIComponent(texto);

    if (red === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
        "_blank", "width=600,height=500,scrollbars=yes"
      );
    } else if (red === "instagram") {
      // Instagram no tiene URL de compartir directa — copiamos y abrimos app
      navigator.clipboard.writeText(texto);
      window.open("https://www.instagram.com/", "_blank");
    }

    setEstados(prev => ({ ...prev, [red]: { red, estado: "ok", mensaje: "Abierto en nueva ventana" } }));
  };

  // ── NIVEL B: Publicar automáticamente vía API ────────────────────────────
  const publicarAutomatico = async (red: "facebook" | "instagram") => {
    setEstados(prev => ({ ...prev, [red]: { red, estado: "publicando" } }));
    try {
      const fotoUrl = producto.fotos?.[0]?.url ? `${API_URL}${producto.fotos[0].url}` : null;
      const res = await axios.post(
        `${API_URL}/api/vendedor/publicar-red-social`,
        {
          red,
          producto_id: producto.id,
          texto,
          foto_url: fotoUrl,
          producto_url: productoURL,
        },
        { headers: authHeaders() }
      );
      setEstados(prev => ({
        ...prev,
        [red]: { red, estado: "ok", mensaje: "Publicado con éxito", post_url: res.data?.post_url }
      }));
    } catch (err: any) {
      setEstados(prev => ({
        ...prev,
        [red]: { red, estado: "error", mensaje: err.response?.data?.detail || "Error al publicar" }
      }));
    }
  };

  // ── Publicar en todas las seleccionadas ──────────────────────────────────
  const publicarEnTodas = async () => {
    if (seleccionadas.size === 0) return;
    setPublicando(true);

    for (const red of Array.from(seleccionadas) as ("facebook" | "instagram")[]) {
      const conexion = conexiones.find(c => c.red === red);
      if (conexion?.conectada) {
        await publicarAutomatico(red);   // Nivel B
      } else {
        compartirNivelA(red);            // Nivel A
      }
    }
    setPublicando(false);
  };

  // ── Config de cada red ────────────────────────────────────────────────────
  const REDES = {
    facebook: {
      nombre: "Facebook",
      color: "#1877F2",
      bg: "bg-[#1877F2]/10",
      border: "border-[#1877F2]/30",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    instagram: {
      nombre: "Instagram",
      color: "#E1306C",
      bg: "bg-[#E1306C]/10",
      border: "border-[#E1306C]/30",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="url(#igGrad)">
          <defs>
            <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f09433" />
              <stop offset="25%" stopColor="#e6683c" />
              <stop offset="50%" stopColor="#dc2743" />
              <stop offset="75%" stopColor="#cc2366" />
              <stop offset="100%" stopColor="#bc1888" />
            </linearGradient>
          </defs>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
  };

  const todas_ok = Array.from(seleccionadas).every(r => estados[r]?.estado === "ok");

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-[#0e0e1a] sm:rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[95dvh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1877F2]/20 to-[#E1306C]/20 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-base">Publicar en redes</h2>
            <p className="text-gray-500 text-xs truncate">{producto.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll area */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">

            {/* ── Preview del producto ─────────────────────────────────── */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                {producto.fotos?.[0]?.url
                  ? <img src={`${API_URL}${producto.fotos[0].url}`} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-600" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{producto.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-orange-400 text-xs font-black">
                    L{parseFloat(producto.precio_con_descuento || producto.precio).toFixed(2)}
                  </span>
                  {producto.porcentaje_descuento > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      -{producto.porcentaje_descuento}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl">
                <Globe className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] text-gray-500 font-mono truncate max-w-[80px]">
                  .../{producto.id.slice(0, 8)}
                </span>
              </div>
            </div>

            {/* ── Selección de redes ───────────────────────────────────── */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                ¿Dónde publicar?
              </p>

              {cargandoConex ? (
                <div className="flex gap-3">
                  {[1, 2].map(i => <div key={i} className="flex-1 h-20 rounded-2xl bg-white/5 animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(REDES) as ("facebook" | "instagram")[]).map(red => {
                    const r        = REDES[red];
                    const conexion = conexiones.find(c => c.red === red);
                    const activa   = seleccionadas.has(red);
                    const estado   = estados[red];
                    const esNivelB = conexion?.conectada;

                    return (
                      <button key={red} onClick={() => toggleRed(red)}
                        className={`relative flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 transition-all text-left
                          ${activa ? `${r.border} ${r.bg}` : "border-white/[0.07] bg-white/[0.03] hover:border-white/[0.12]"}
                          ${estado?.estado === "ok" ? "border-emerald-500/50 bg-emerald-950/20" : ""}
                          ${estado?.estado === "error" ? "border-red-500/40 bg-red-950/20" : ""}`}>

                        {/* Checkbox */}
                        <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                          ${activa ? "border-white bg-white" : "border-white/20"}`}>
                          {activa && <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />}
                        </div>

                        {r.icon}

                        <div className="w-full">
                          <p className="text-white text-sm font-bold">{r.nombre}</p>
                          {esNivelB ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                              <p className="text-[10px] text-emerald-400 font-semibold truncate max-w-[100px]">
                                {conexion.nombre_pagina || "Conectado"}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                              <p className="text-[10px] text-gray-600">Sin conectar</p>
                            </div>
                          )}
                        </div>

                        {/* Estado de publicación */}
                        {estado?.estado === "publicando" && (
                          <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: r.color }} />
                          </div>
                        )}
                        {estado?.estado === "ok" && (
                          <div className="absolute inset-0 rounded-2xl bg-emerald-950/60 flex flex-col items-center justify-center gap-1">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <p className="text-[10px] text-emerald-400 font-bold">Publicado</p>
                          </div>
                        )}
                        {estado?.estado === "error" && (
                          <div className="absolute inset-0 rounded-2xl bg-red-950/60 flex flex-col items-center justify-center gap-1 p-3">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <p className="text-[10px] text-red-400 font-bold text-center leading-tight">{estado.mensaje}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Nivel A/B indicator */}
              {!cargandoConex && (
                <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  {conexiones.some(c => c.conectada) ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Las redes <span className="text-white font-semibold">conectadas</span> se publicarán automáticamente.
                        Las demás abrirán una ventana para compartir manualmente.
                      </p>
                    </>
                  ) : (
                    <>
                      <Radio className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Se abrirá una ventana de Facebook/Instagram con el contenido listo para publicar.
                        <button onClick={() => window.open("/vendedor/dashboard/redes-sociales", "_blank")}
                          className="text-orange-400 hover:text-orange-300 ml-1 underline transition">
                          Conectar para auto-publicar →
                        </button>
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Texto de la publicación ──────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Texto de publicación</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTexto(textoDefault)}
                    className="text-[10px] text-gray-600 hover:text-gray-400 transition">Restablecer</button>
                  <button onClick={copiarTexto}
                    className="flex items-center gap-1 text-[10px] font-semibold text-orange-400 hover:text-orange-300 transition">
                    {copiado ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                  </button>
                </div>
              </div>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={8}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 text-xs leading-relaxed placeholder-gray-600 focus:border-orange-500/40 outline-none transition resize-none font-mono" />
              <div className="flex justify-between mt-1">
                <p className="text-[10px] text-gray-600">El link redirige a la página del producto en Mercado Fénix</p>
                <p className={`text-[10px] ${texto.length > 2000 ? "text-red-400" : "text-gray-600"}`}>{texto.length}/2000</p>
              </div>
            </div>

            {/* ── Links directos al post (post-publicación) ───────────── */}
            {Object.values(estados).some(e => e.estado === "ok" && e.post_url) && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Ver publicaciones</p>
                {Object.values(estados).filter(e => e.estado === "ok" && e.post_url).map(e => (
                  <a key={e.red} href={e.post_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500/40 transition">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <p className="text-emerald-300 text-sm font-semibold flex-1">Ver en {e.red}</p>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                  </a>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Footer con botón */}
        <div className="flex-shrink-0 p-5 border-t border-white/[0.06] space-y-3 bg-[#0e0e1a]">

          {todas_ok && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-emerald-300 text-sm font-semibold">¡Publicado en todas las redes seleccionadas!</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/8 text-gray-400 font-bold text-sm transition">
              Cerrar
            </button>
            <button
              onClick={publicarEnTodas}
              disabled={seleccionadas.size === 0 || publicando || todas_ok}
              className="flex-[2] py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                bg-gradient-to-r from-[#1877F2] via-[#9b2f7f] to-[#E1306C] hover:opacity-90 text-white shadow-xl">
              {publicando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
                : <><Share2 className="w-4 h-4" /> Publicar ahora {seleccionadas.size > 0 ? `(${seleccionadas.size})` : ""}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}