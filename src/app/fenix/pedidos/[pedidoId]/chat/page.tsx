// src/app/fenix/pedidos/[pedidoId]/chat/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Send, Upload, Receipt, Loader2,
  Download, Lock, Unlock, CheckCircle2, Package,
  MessageCircle, AlertCircle, ExternalLink, Zap,
  Banknote, CreditCard, Clock, X, MapPin
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL  = API_URL.replace("http", "ws");

// ── Ubicación fija de la oficina de Mercado Fénix (entrega "oficina_fenix") ──
// Coordenadas resueltas una sola vez a partir del enlace corto de Maps.
const OFICINA_FENIX_MAPS_URL = "https://maps.app.goo.gl/P3jwAp6FNPnxaW2g8";
const OFICINA_FENIX_LAT = 14.0393003;
const OFICINA_FENIX_LNG = -86.5661934;

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Mensaje {
  id: number;
  sala_id: number;
  remitente_tipo: "cliente" | "vendedor";
  contenido: string;
  es_comprobante: boolean;
  archivo_url: string | null;
  enviado_en: string;
}

interface VendedorInfo {
  nombre_tienda: string;
  google_maps_url: string | null;
  google_maps_lat?: number | null;
  google_maps_lng?: number | null;
}

interface PedidoInfo {
  id: number;
  estado: string;
  tipo_entrega: string;
  metodo_pago: string;
  total: number;
  es_digital: boolean;
  descarga_habilitada: boolean;
  descarga_token: string | null;
  vendedor?: VendedorInfo | null;
  items: { nombre_producto: string; cantidad: number; precio_unitario: number }[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token")
    || localStorage.getItem("cliente_token")
    || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getToken(): string | null {
  return localStorage.getItem("access_token")
    || localStorage.getItem("cliente_token")
    || localStorage.getItem("token");
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

// Src del iframe embebido de Google Maps a partir de coordenadas — no requiere
// API key (es el mismo formato "output=embed" que usa Google para enlaces
// compartidos de solo lectura).
function mapsEmbedSrc(lat: number, lng: number, zoom = 16) {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:      { label: "Pendiente",      color: "text-amber-700",   bg: "bg-amber-100 border-amber-200" },
  confirmado:     { label: "Confirmado",     color: "text-blue-700",    bg: "bg-blue-100 border-blue-200"   },
  en_preparacion: { label: "En preparación", color: "text-purple-700",  bg: "bg-purple-100 border-purple-200"},
  en_camino:      { label: "En camino",      color: "text-cyan-700",    bg: "bg-cyan-100 border-cyan-200"   },
  entregado:      { label: "Entregado",      color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200"},
  cancelado:      { label: "Cancelado",      color: "text-red-700",     bg: "bg-red-100 border-red-200"     },
};

// ─── BANNER DE DESCARGA (aparece cuando el vendedor habilita) ─────────────────
function BannerDescarga({ token, pedidoId, onPoll }: {
  token: string; pedidoId: number; onPoll: () => void;
}) {
  const url = `${API_URL}/api/descargas/archivo/${token}`;
  return (
    <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-emerald-200 shadow-lg">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3 flex items-center gap-2">
        <Unlock className="w-4 h-4 text-white flex-shrink-0" />
        <p className="text-white font-black text-sm">¡Tu descarga está lista!</p>
      </div>
      <div className="bg-emerald-50 px-4 py-3 space-y-3">
        <p className="text-xs text-emerald-700">
          El vendedor verificó tu pago. Descarga tu archivo ahora.
        </p>
        <a
          href={url}
          download
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-xl text-sm transition-all active:scale-[0.98] shadow-md"
        >
          <Download className="w-4 h-4" />
          Descargar archivo
        </a>
        <p className="text-[10px] text-emerald-600 text-center">
          Si el enlace no funciona, recarga la página.
        </p>
      </div>
    </div>
  );
}

// ─── BANNER PENDIENTE (instrucciones de pago) ─────────────────────────────────
function BannerPendientePago({ pedido }: { pedido: PedidoInfo }) {
  const iconoPago = pedido.metodo_pago === "tigo_money" ? Zap
    : pedido.metodo_pago === "efectivo" ? Banknote : CreditCard;
  const IconoPago = iconoPago;

  const instrucciones: Record<string, string> = {
    tigo_money:    "Envía el pago por Tigo Money al número del vendedor y sube el comprobante aquí.",
    transferencia: "Realiza la transferencia bancaria y sube tu comprobante de pago aquí abajo.",
    efectivo:      "Coordina con el vendedor la entrega del efectivo y confirma en este chat.",
  };

  return (
    <div className="mx-4 mb-3 rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border-b border-amber-200">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-amber-800 font-bold text-xs">Pago pendiente de verificación</p>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <IconoPago className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-semibold capitalize">
            {pedido.metodo_pago.replace("_", " ")}
          </p>
          <span className="ml-auto text-sm font-black text-amber-800">
            L{pedido.total.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          {instrucciones[pedido.metodo_pago] || instrucciones.transferencia}
        </p>
        <div className="flex items-start gap-1.5 bg-white/60 rounded-xl px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-600 leading-relaxed">
            Una vez que el vendedor verifique tu pago, recibirás el enlace de descarga aquí en el chat.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── BANNER DE UBICACIÓN CON MAPA INCRUSTADO ──────────────────────────────────
// (recoger en tienda / oficina Mercado Fénix)
function BannerUbicacion({ tipo, nombreTienda, mapsUrl, lat, lng }: {
  tipo: "tienda" | "oficina_fenix";
  nombreTienda?: string | null;
  mapsUrl: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const esTienda    = tipo === "tienda";
  const tieneCoords = typeof lat === "number" && typeof lng === "number";

  return (
    <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-blue-200 shadow-lg">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-white flex-shrink-0" />
        <p className="text-white font-black text-sm">
          {esTienda ? "Ubicación para recoger tu pedido" : "Ubicación de la oficina Mercado Fénix"}
        </p>
      </div>

      {/* Mapa incrustado — solo si logramos resolver coordenadas */}
      {tieneCoords && (
        <iframe
          src={mapsEmbedSrc(lat as number, lng as number)}
          className="w-full h-44 border-0 block"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={esTienda ? "Ubicación de la tienda" : "Ubicación de la oficina Mercado Fénix"}
        />
      )}

      <div className="bg-blue-50 px-4 py-3 space-y-2.5">
        <p className="text-xs text-blue-700 leading-relaxed">
          {esTienda
            ? <>Recoge tu pedido directamente en <span className="font-bold">{nombreTienda || "la tienda del vendedor"}</span>.</>
            : "Tu pedido llegará a nuestra oficina. Pásalo a recoger cuando te notifiquemos que está listo."}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-sm border border-blue-200 transition-all active:scale-[0.98]"
        >
          <MapPin className="w-4 h-4" />
          {tieneCoords ? "Abrir en Google Maps" : "Ver ubicación en Google Maps"}
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
        </a>
      </div>
    </div>
  );
}

// ─── BURBUJA DE MENSAJE ───────────────────────────────────────────────────────
function BurbujaMensaje({ msg }: { msg: Mensaje }) {
  const esMio    = msg.remitente_tipo === "cliente";
  const esEnlace = msg.contenido.includes("/api/descargas/archivo/");

  return (
    <div className={`flex ${esMio ? "justify-end" : "justify-start"} px-4`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
        esMio
          ? "bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-tr-sm"
          : "bg-white text-gray-900 rounded-tl-sm shadow-sm border border-gray-100"
      }`}>

        {/* Comprobante */}
        {msg.es_comprobante && msg.archivo_url && (
          <div className="mb-2">
            <p className={`text-[10px] font-bold mb-1.5 flex items-center gap-1 ${esMio ? "text-orange-100" : "text-orange-500"}`}>
              <Receipt className="w-3 h-3" /> Comprobante de pago
            </p>
            <a href={`${API_URL}${msg.archivo_url}`} target="_blank" rel="noopener noreferrer">
              <img
                src={`${API_URL}${msg.archivo_url}`}
                alt="Comprobante"
                className="w-full rounded-xl max-h-44 object-cover border border-white/20 hover:opacity-90 transition"
              />
            </a>
          </div>
        )}

        {/* Enlace de descarga — renderizado especial */}
        {esEnlace ? (
          <div className="space-y-2">
            {msg.contenido.split("\n").map((line, i) => {
              const isLink = line.includes("/api/descargas/archivo/");
              if (isLink) {
                const url = line.startsWith("http") ? line : `${API_URL}${line.trim()}`;
                return (
                  <a key={i} href={url} download
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition rounded-xl px-3 py-2.5 font-bold text-sm w-full">
                    <Download className="w-4 h-4 flex-shrink-0" />
                    Descargar archivo
                    <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                  </a>
                );
              }
              return line ? <p key={i} className="text-sm leading-relaxed">{line}</p> : null;
            })}
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.contenido}</p>
        )}

        <p className={`text-[10px] mt-1 text-right ${esMio ? "text-orange-200" : "text-gray-400"}`}>
          {formatHora(msg.enviado_en)}
        </p>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function ChatPedidoDigitalPage() {
  const params   = useParams();
  const router   = useRouter();
  const pedidoId = Number(params.pedidoId);

  const [pedido,          setPedido]          = useState<PedidoInfo | null>(null);
  const [salaId,          setSalaId]          = useState<number | null>(null);
  const [mensajes,        setMensajes]        = useState<Mensaje[]>([]);
  const [texto,           setTexto]           = useState("");
  const [cargando,        setCargando]        = useState(true);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [typing,          setTyping]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const wsRef       = useRef<WebSocket | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  // ── Cargar pedido + sala + mensajes ────────────────────────────────────────
  const iniciar = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push("/fenix/mi-cuenta/login"); return; }

    try {
      // Detalle del pedido
      const resPedido = await fetch(`${API_URL}/api/pedidos/${pedidoId}`, {
        headers: authHeaders(),
      });
      if (!resPedido.ok) { setError("Pedido no encontrado"); return; }
      const dataPedido = await resPedido.json();
      setPedido(dataPedido);

      // Crear/obtener sala
      const resSala = await fetch(`${API_URL}/api/chat/sala/${pedidoId}`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (!resSala.ok) { setError("No se pudo abrir el chat"); return; }
      const { sala_id } = await resSala.json();
      setSalaId(sala_id);

      // Historial de mensajes
      const resMsgs = await fetch(`${API_URL}/api/chat/sala/${sala_id}/mensajes`, {
        headers: authHeaders(),
      });
      if (resMsgs.ok) {
        const data = await resMsgs.json();
        setMensajes(data.mensajes || []);
      }

      // WebSocket
      const ws = new WebSocket(`${WS_URL}/api/chat/ws/${sala_id}?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.tipo === "mensaje") {
          setMensajes(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
          setTyping(false);
          // Si el mensaje contiene token de descarga, actualizar estado del pedido
          if (data.contenido?.includes("/api/descargas/archivo/")) {
            setPedido(prev => prev ? { ...prev, descarga_habilitada: true } : prev);
            // Extraer el token del mensaje
            const match = data.contenido.match(/\/api\/descargas\/archivo\/([^\s\n]+)/);
            if (match) {
              setPedido(prev => prev ? { ...prev, descarga_token: match[1] } : prev);
            }
          }
        } else if (data.tipo === "typing" && data.remitente_tipo === "vendedor") {
          setTyping(true);
          setTimeout(() => setTyping(false), 3000);
        }
      };

      ws.onerror = () => console.error("WS error en chat digital");

    } catch (err) {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  }, [pedidoId, router]);

  useEffect(() => {
    iniciar();
    return () => wsRef.current?.close();
  }, [iniciar]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, typing]);

  // Poll de descarga si aún no está habilitada (cada 10s)
  useEffect(() => {
    if (!pedido || pedido.descarga_habilitada) return;
    const interval = setInterval(async () => {
      const res = await fetch(`${API_URL}/api/descargas/${pedidoId}/estado`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.descarga_habilitada) {
          setPedido(prev => prev ? {
            ...prev,
            descarga_habilitada: true,
            descarga_token: data.descarga_token,
            estado: "entregado",
          } : prev);
          clearInterval(interval);
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [pedido?.descarga_habilitada, pedidoId]);

  // ── Enviar mensaje ─────────────────────────────────────────────────────────
  const enviar = () => {
    if (!texto.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ tipo: "mensaje", contenido: texto.trim() }));
    setTexto("");
  };

  // ── Subir comprobante ──────────────────────────────────────────────────────
  const subirComprobante = async (file: File) => {
    if (!salaId) return;
    setSubiendoArchivo(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      await fetch(`${API_URL}/api/chat/sala/${salaId}/comprobante`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
    } finally {
      setSubiendoArchivo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Estados de carga y error ───────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
          <p className="text-gray-500 font-semibold text-sm">Abriendo chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-gray-800 mb-1">{error}</p>
          <button onClick={() => router.back()}
            className="mt-4 text-sm text-orange-500 font-semibold hover:text-orange-700 transition">
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const esDigital       = pedido?.es_digital ?? true;
  const descargaLista   = pedido?.descarga_habilitada && pedido?.descarga_token;
  const estadoCfg       = ESTADO_LABEL[pedido?.estado || "pendiente"] || ESTADO_LABEL.pendiente;

  // Ubicación a mostrar según el tipo de entrega elegido en el checkout
  const mostrarUbicacionTienda  = pedido?.tipo_entrega === "tienda" && !!pedido?.vendedor?.google_maps_url;
  const mostrarUbicacionOficina = pedido?.tipo_entrega === "oficina_fenix";

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-2xl mx-auto">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className={`flex-shrink-0 ${esDigital
        ? "bg-gradient-to-r from-violet-700 to-purple-800"
        : "bg-gradient-to-r from-orange-600 to-red-700"
      } shadow-lg`}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => router.push("/fenix/mi-cuenta/mis-pedidos")}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-white text-base">
                {esDigital ? "💾 Compra digital" : "📦 Pedido"} #{pedidoId}
              </p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${estadoCfg.bg} ${estadoCfg.color}`}>
                {estadoCfg.label}
              </span>
            </div>
            <p className="text-white/60 text-xs mt-0.5 truncate">
              {pedido?.items?.[0]?.nombre_producto || "Producto digital"}
              {(pedido?.items?.length || 0) > 1 && ` +${(pedido?.items?.length || 0) - 1} más`}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-white font-black text-base">L{pedido?.total.toFixed(2)}</p>
            {descargaLista
              ? <p className="text-emerald-300 text-[10px] font-bold flex items-center gap-1 justify-end">
                  <Unlock className="w-3 h-3" /> Listo
                </p>
              : <p className="text-white/50 text-[10px] flex items-center gap-1 justify-end">
                  <Lock className="w-3 h-3" /> Pendiente
                </p>
            }
          </div>
        </div>

        {/* Barra de estado del pedido */}
        {pedido && (
          <div className="px-4 pb-3">
            <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
              {descargaLista
                ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                    <p className="text-xs text-emerald-200 font-semibold">
                      Pago verificado · Descarga disponible
                    </p></>
                : <><Clock className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
                    <p className="text-xs text-white/60">
                      Envía tu comprobante · El vendedor verificará y habilitará la descarga
                    </p></>
              }
            </div>
          </div>
        )}
      </div>

      {/* ── BANNER UBICACIÓN — recoger en tienda / oficina Mercado Fénix ─────── */}
      {mostrarUbicacionTienda && (
        <div className="flex-shrink-0 pt-3">
          <BannerUbicacion
            tipo="tienda"
            nombreTienda={pedido?.vendedor?.nombre_tienda}
            mapsUrl={pedido!.vendedor!.google_maps_url as string}
            lat={pedido?.vendedor?.google_maps_lat}
            lng={pedido?.vendedor?.google_maps_lng}
          />
        </div>
      )}
      {mostrarUbicacionOficina && (
        <div className="flex-shrink-0 pt-3">
          <BannerUbicacion
            tipo="oficina_fenix"
            mapsUrl={OFICINA_FENIX_MAPS_URL}
            lat={OFICINA_FENIX_LAT}
            lng={OFICINA_FENIX_LNG}
          />
        </div>
      )}

      {/* ── BANNER DESCARGA LISTA ────────────────────────────────────────────── */}
      {descargaLista && pedido?.descarga_token && (
        <div className="flex-shrink-0 pt-3">
          <BannerDescarga
            token={pedido.descarga_token}
            pedidoId={pedidoId}
            onPoll={iniciar}
          />
        </div>
      )}

      {/* ── BANNER PAGO PENDIENTE ────────────────────────────────────────────── */}
      {!descargaLista && pedido && (
        <div className="flex-shrink-0 pt-3">
          <BannerPendientePago pedido={pedido} />
        </div>
      )}

      {/* ── MENSAJES ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
        {mensajes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="font-bold text-gray-700">Inicia el chat</p>
              <p className="text-gray-400 text-sm mt-1">
                Saluda al vendedor y envía tu comprobante de pago para recibir el archivo.
              </p>
            </div>
          </div>
        ) : (
          mensajes.map(msg => <BurbujaMensaje key={msg.id} msg={msg} />)
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="px-4 flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex gap-1 items-center">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: d + "ms" }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT ───────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 space-y-2.5">

        {/* Botón comprobante */}
        {!descargaLista && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={subiendoArchivo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {subiendoArchivo
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo comprobante...</>
              : <><Upload className="w-4 h-4" /> 📎 Subir comprobante de pago</>}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) subirComprobante(e.target.files[0]); }}
        />

        {/* Textarea + enviar */}
        <div className="flex gap-2 items-end">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ tipo: "typing" }));
              }
            }}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 resize-none border-2 border-gray-200 focus:border-violet-400 rounded-2xl px-4 py-2.5 text-sm outline-none transition-colors max-h-24"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={enviar}
            disabled={!texto.trim()}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:shadow-lg transition-all active:scale-95"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Nota de protección */}
        <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
          <Lock className="w-2.5 h-2.5" />
          Chat seguro · El archivo se entregará tras verificar tu pago
        </p>
      </div>
    </div>
  );
}