// src/app/fenix/mi-cuenta/mis-pedidos/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, MessageCircle, ChevronDown, ChevronUp,
  Truck, Store, Building2, Banknote, CreditCard, Clock,
  CheckCircle2, XCircle, AlertCircle, Upload, Send,
  ImageIcon, Loader2, RefreshCw, Receipt, X, Trash2,
  Download, Unlock, Lock, Zap
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL = (API_URL).replace("http", "ws");

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Pedido {
  id: number;
  estado: string;
  tipo_entrega: string;
  metodo_pago: string;
  subtotal: number;
  costo_envio: number;
  total: number;
  items_count: number;
  fecha_pedido: string;
  fecha_entrega_estimada: string | null;
  fecha_entrega_real: string | null;
  es_digital: boolean;
  descarga_habilitada: boolean;
  descarga_token: string | null;
}

interface PedidoDetalle extends Pedido {
  items: {
    id: number;
    nombre_producto: string;
    precio_unitario: number;
    cantidad: number;
    subtotal: number;
    color: string | null;
    talla: string | null;
  }[];
  direccion: any;
  nota_cliente: string | null;
  nota_vendedor: string | null;
}

interface Mensaje {
  id: number;
  sala_id: number;
  remitente_tipo: "cliente" | "vendedor";
  remitente_id: string;
  contenido: string;
  es_comprobante: boolean;
  archivo_url: string | null;
  enviado_en: string;
}

// ─── HELPERS VISUALES ────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; paso: number }> = {
  pendiente:       { label: "Pendiente",       color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   icon: Clock,         paso: 1 },
  confirmado:      { label: "Confirmado",      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     icon: CheckCircle2,  paso: 2 },
  en_preparacion:  { label: "En preparación",  color: "text-purple-700",  bg: "bg-purple-50 border-purple-200", icon: Package,       paso: 3 },
  en_camino:       { label: "En camino",       color: "text-cyan-700",    bg: "bg-cyan-50 border-cyan-200",     icon: Truck,         paso: 4 },
  entregado:       { label: "Entregado",       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",icon: CheckCircle2, paso: 5 },
  cancelado:       { label: "Cancelado",       color: "text-red-700",     bg: "bg-red-50 border-red-200",       icon: XCircle,       paso: 0 },
};

const PASOS = ["Pendiente", "Confirmado", "En preparación", "En camino", "Entregado"];

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── COMPONENTE CHAT ─────────────────────────────────────────────────────────
function ChatModal({ pedidoId, onClose }: { pedidoId: number; onClose: () => void }) {
  const [salaId, setSalaId] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [typing, setTyping] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Abrir sala y cargar historial
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("access_token");
      try {
        // Crear/obtener sala
        const resSala = await fetch(`${API_URL}/api/chat/sala/${pedidoId}`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
        });
        if (!resSala.ok) throw new Error("No se pudo abrir el chat");
        const dataSala = await resSala.json();
        setSalaId(dataSala.sala_id);

        // Historial
        const resMsgs = await fetch(`${API_URL}/api/chat/sala/${dataSala.sala_id}/mensajes`, {
          headers: authHeaders(),
        });
        if (resMsgs.ok) {
          const data = await resMsgs.json();
          setMensajes(data.mensajes || []);
        }

        // Conectar WebSocket
        const ws = new WebSocket(`${WS_URL}/api/chat/ws/${dataSala.sala_id}?token=${token}`);
        wsRef.current = ws;

        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (data.tipo === "mensaje") {
            setMensajes(prev => {
              // Evitar duplicados
              if (prev.find(m => m.id === data.id)) return prev;
              return [...prev, data];
            });
            setTyping(false);
          } else if (data.tipo === "typing" && data.remitente_tipo === "vendedor") {
            setTyping(true);
            setTimeout(() => setTyping(false), 3000);
          }
        };

        ws.onerror = () => console.error("WS error");
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    init();
    return () => {
      wsRef.current?.close();
    };
  }, [pedidoId]);

  // Scroll al fondo al llegar mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, typing]);

  const enviar = () => {
    if (!texto.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setEnviando(true);
    wsRef.current.send(JSON.stringify({ tipo: "mensaje", contenido: texto.trim() }));
    setTexto("");
    setEnviando(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
    // Notificar "escribiendo"
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ tipo: "typing" }));
    }
  };

  const subirComprobante = async (file: File) => {
    if (!salaId) return;
    setSubiendoArchivo(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      const res = await fetch(`${API_URL}/api/chat/sala/${salaId}/comprobante`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error("Error al subir comprobante");
      // El WS va a recibir el mensaje automáticamente via broadcast
    } catch (err) {
      console.error(err);
    } finally {
      setSubiendoArchivo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg h-[85vh] sm:h-[600px] bg-white sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden">

        {/* Header del chat */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-sm">Chat con el vendedor</p>
            <p className="text-orange-100 text-xs">Pedido #{pedidoId}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {cargando ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">Inicia la conversación</p>
              <p className="text-gray-400 text-sm mt-1">El vendedor responderá pronto</p>
            </div>
          ) : (
            mensajes.map((msg) => {
              const esMio = msg.remitente_tipo === "cliente";
              return (
                <div key={msg.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] ${esMio
                    ? "bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl rounded-tr-sm"
                    : "bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100"
                  } px-4 py-2.5`}>

                    {/* Comprobante */}
                    {msg.es_comprobante && msg.archivo_url && (
                      <div className="mb-2">
                        <div className={`flex items-center gap-2 mb-2 text-xs font-semibold ${esMio ? "text-orange-100" : "text-orange-600"}`}>
                          <Receipt className="w-3.5 h-3.5" />
                          Comprobante de pago
                        </div>
                        <a href={`${API_URL}${msg.archivo_url}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`${API_URL}${msg.archivo_url}`}
                            alt="Comprobante"
                            className="w-full rounded-lg max-h-40 object-cover border border-white/30 hover:opacity-90 transition"
                          />
                        </a>
                      </div>
                    )}

                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.contenido}</p>
                    <p className={`text-xs mt-1 ${esMio ? "text-orange-200" : "text-gray-400"} text-right`}>
                      {formatHora(msg.enviado_en)}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* Indicador de "escribiendo" */}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <div key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
          {/* Botón comprobante */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoArchivo}
              className="flex items-center gap-1.5 text-xs text-orange-600 font-semibold bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {subiendoArchivo
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />}
              {subiendoArchivo ? "Subiendo..." : "Enviar comprobante"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) subirComprobante(e.target.files[0]); }}
            />
          </div>

          <div className="flex gap-2">
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="flex-1 resize-none border-2 border-gray-200 focus:border-orange-400 rounded-2xl px-4 py-2.5 text-sm outline-none transition-colors max-h-24"
              style={{ minHeight: "42px" }}
            />
            <button
              onClick={enviar}
              disabled={!texto.trim() || enviando}
              className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 self-end disabled:opacity-40 hover:shadow-lg transition-all active:scale-95"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE TARJETA DE PEDIDO ─────────────────────────────────────────────
function PedidoCard({
  pedido,
  onAbrirChat,
  onBorrar,
}: {
  pedido: Pedido;
  onAbrirChat: (id: number) => void;
  onBorrar: (id: number) => void;
}) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const [detalle, setDetalle] = useState<PedidoDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cfg = ESTADO_CONFIG[pedido.estado] || ESTADO_CONFIG.pendiente;
  const EstadoIcon = cfg.icon;
  const esCancelado  = pedido.estado === "cancelado";
  const esDigital    = pedido.es_digital;
  const descargaLista = esDigital && pedido.descarga_habilitada && pedido.descarga_token;
  const pasoActual   = cfg.paso;

  const cargarDetalle = async () => {
    if (detalle) return;
    setCargandoDetalle(true);
    try {
      const res = await fetch(`${API_URL}/api/pedidos/${pedido.id}`, {
        headers: authHeaders(),
      });
      if (res.ok) setDetalle(await res.json());
    } finally {
      setCargandoDetalle(false);
    }
  };

  const toggleExpandido = () => {
    if (!expandido) cargarDetalle();
    setExpandido(!expandido);
  };

  return (
    <div className={`bg-white rounded-3xl border-2 overflow-hidden transition-all lg:h-fit ${
      esCancelado ? "border-red-100 opacity-75" : "border-gray-100 hover:border-orange-200"
    } shadow-sm`}>

      {/* ── CABECERA ── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-gray-900 text-lg">Pedido #{pedido.id}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                <EstadoIcon className="w-3.5 h-3.5" />
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{formatFecha(pedido.fecha_pedido)}</p>
          </div>
          <span className="font-black text-xl text-orange-600 flex-shrink-0">
            L{pedido.total.toFixed(2)}
          </span>
        </div>

        {/* Info rápida */}
        <div className="flex gap-4 text-xs text-gray-500 mb-3 flex-wrap">
          <span className="flex items-center gap-1">
            {pedido.tipo_entrega === "domicilio" ? <Truck className="w-3.5 h-3.5" /> :
             pedido.tipo_entrega === "tienda" ? <Store className="w-3.5 h-3.5" /> :
             <Building2 className="w-3.5 h-3.5" />}
            {pedido.tipo_entrega === "domicilio" ? "A domicilio" :
             pedido.tipo_entrega === "tienda" ? "En tienda" : "Oficina Fénix"}
          </span>
          <span className="flex items-center gap-1">
            {pedido.metodo_pago === "efectivo"
              ? <Banknote className="w-3.5 h-3.5" />
              : <CreditCard className="w-3.5 h-3.5" />}
            {pedido.metodo_pago === "efectivo" ? "Efectivo" : "Transferencia"}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {pedido.items_count} {pedido.items_count === 1 ? "producto" : "productos"}
          </span>
        </div>

        {/* ── BARRA DE PROGRESO ── */}
        {!esCancelado && (
          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              {PASOS.map((paso, i) => (
                <div key={paso} className="flex flex-col items-center" style={{ width: `${100 / PASOS.length}%` }}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i + 1 < pasoActual ? "bg-orange-500 text-white" :
                    i + 1 === pasoActual ? "bg-orange-500 text-white ring-4 ring-orange-100" :
                    "bg-gray-200 text-gray-400"
                  }`}>
                    {i + 1 < pasoActual ? "✓" : i + 1}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(0, ((pasoActual - 1) / (PASOS.length - 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              {PASOS.map((paso, i) => (
                <p key={paso} className={`text-center leading-tight transition-colors ${
                  i + 1 <= pasoActual ? "text-orange-600 font-semibold" : "text-gray-400"
                }`} style={{ width: `${100 / PASOS.length}%`, fontSize: "9px" }}>
                  {paso}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── ALERTAS CONTEXTUALES ── */}
        {pedido.metodo_pago === "transferencia" && pedido.estado === "pendiente" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">¡Envía tu comprobante de pago!</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Tu pedido se confirmará cuando el vendedor verifique tu transferencia.
                Usa el chat para enviar el comprobante.
              </p>
            </div>
          </div>
        )}

        {pedido.estado === "en_camino" && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3 flex gap-2 mb-3">
            <Truck className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-cyan-800">
              ¡Tu pedido está en camino! Mantente atento a tu teléfono.
            </p>
          </div>
        )}

        {pedido.estado === "entregado" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-emerald-800">
              ¡Pedido entregado! Esperamos que hayas quedado satisfecho.
            </p>
          </div>
        )}

        {/* ── BOTONES ── */}
        <div className="flex gap-2">
          {esDigital ? (
            /* Botón chat dedicado para digitales */
            <button
              onClick={() => router.push(`/fenix/pedidos/${pedido.id}/chat`)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold shadow hover:shadow-md transition-all active:scale-[0.98] text-white
                ${descargaLista
                  ? "bg-gradient-to-r from-emerald-600 to-green-600"
                  : "bg-gradient-to-r from-violet-600 to-purple-700"}`}
            >
              {descargaLista
                ? <><Download className="w-4 h-4" /> Descargar archivo</>
                : <><MessageCircle className="w-4 h-4" /> Ir al chat y pagar</>}
            </button>
          ) : (
            /* Botón chat modal para pedidos físicos */
            <button
              onClick={() => onAbrirChat(pedido.id)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white py-2.5 rounded-2xl text-sm font-bold shadow hover:shadow-md transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              Chat con vendedor
            </button>
          )}
          <button
            onClick={toggleExpandido}
            className="px-4 py-2.5 border-2 border-gray-200 hover:border-orange-300 rounded-2xl text-sm font-bold text-gray-700 flex items-center gap-1 transition-colors"
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Detalles
          </button>
        </div>

        {/* Botón borrar — solo si entregado o cancelado */}
        {(pedido.estado === "entregado" || pedido.estado === "cancelado") && (
          <button
            onClick={() => onBorrar(pedido.id)}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar del historial
          </button>
        )}
      </div>

      {/* ── DETALLE EXPANDIDO ── */}
      {expandido && (
        <div className="border-t-2 border-gray-50 bg-gray-50 p-4 space-y-3">
          {cargandoDetalle ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : detalle ? (
            <>
              {/* Productos */}
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Productos</p>
                <div className="space-y-2">
                  {detalle.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.nombre_producto}</p>
                        <p className="text-xs text-gray-400">
                          x{item.cantidad}
                          {item.color && ` · ${item.color}`}
                          {item.talla && ` · Talla ${item.talla}`}
                        </p>
                      </div>
                      <p className="text-sm font-black text-orange-600 flex-shrink-0 ml-2">
                        L{Number(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose de costos */}
              <div className="bg-white rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>L{detalle.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Envío</span>
                  <span className={detalle.costo_envio === 0 ? "text-emerald-600 font-semibold" : ""}>
                    {detalle.costo_envio === 0 ? "Gratis" : `L${detalle.costo_envio.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between font-black pt-1 border-t border-gray-100">
                  <span className="text-sm">Total</span>
                  <span className="text-orange-600">L{detalle.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Notas */}
              {detalle.nota_vendedor && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">Nota del vendedor</p>
                  <p className="text-xs text-blue-600">{detalle.nota_vendedor}</p>
                </div>
              )}
              {detalle.nota_cliente && (
                <div className="bg-gray-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-600 mb-1">Tu nota</p>
                  <p className="text-xs text-gray-500">{detalle.nota_cliente}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">No se pudo cargar el detalle</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function MisPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatPedidoId, setChatPedidoId] = useState<number | null>(null);
  const [confirmBorrarId, setConfirmBorrarId] = useState<number | null>(null);

  const borrarPedido = async (pedidoId: number) => {
    setConfirmBorrarId(null);
    try {
      const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/cliente`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) setPedidos(prev => prev.filter(p => p.id !== pedidoId));
    } catch { /* silencioso */ }
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pedidos/mis-pedidos`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPedidos(data.pedidos || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const pedidosActivos = pedidos.filter(p => p.estado !== "cancelado" && p.estado !== "entregado");
  const pedidosHistorial = pedidos.filter(p => p.estado === "cancelado" || p.estado === "entregado");

  return (
    <div className="mf-body-pad min-h-screen bg-gray-50 pb-10">

      {/* Chat modal */}
      {chatPedidoId !== null && (
        <ChatModal pedidoId={chatPedidoId} onClose={() => setChatPedidoId(null)} />
      )}

      {/* Header — móvil: igual de siempre. Desktop: un poco más de aire vertical
          y el título se alinea con el ancho máximo del contenido de abajo. */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mf-container lg:max-w-5xl">
          <div className="flex items-center gap-3 py-4 lg:py-5">
            <Link href="/fenix/mi-cuenta" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="font-black text-xl lg:text-2xl flex-1 text-gray-900">Mis Pedidos</h1>
            <button onClick={cargar} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido — móvil: ancho completo con padding normal (mf-container).
          Desktop: ancho máximo centrado (5xl ≈ 1024px) para que las tarjetas
          no se estiren a todo el monitor — eso era lo que se veía "pésimo". */}
      <div className="mf-container lg:max-w-5xl py-5">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-orange-500">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="font-bold text-gray-600">Cargando tus pedidos...</p>
          </div>

        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mb-6">
              <Package className="w-12 h-12 text-orange-300" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">No tienes pedidos aún</h2>
            <p className="text-gray-500 mb-8 max-w-xs">¡Explora los productos de nuestras tiendas y haz tu primera compra!</p>
            <Link href="/fenix/productos"
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95">
              Ver productos
            </Link>
          </div>

        ) : (
          <div className="space-y-6">

            {/* Pedidos activos — móvil: columna única (space-y-4, igual que siempre).
                Desktop: grid de 2 columnas para aprovechar el ancho disponible
                en vez de tarjetas angostas estiradas a todo lo ancho. */}
            {pedidosActivos.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                  En curso · {pedidosActivos.length}
                </h2>
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
                  {pedidosActivos.map(p => (
                    <PedidoCard key={p.id} pedido={p} onAbrirChat={setChatPedidoId} onBorrar={setConfirmBorrarId} />
                  ))}
                </div>
              </section>
            )}

            {/* Historial — mismo patrón: columna única en móvil, grid 2 col en desktop */}
            {pedidosHistorial.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                  Historial · {pedidosHistorial.length}
                </h2>
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
                  {pedidosHistorial.map(p => (
                    <PedidoCard key={p.id} pedido={p} onAbrirChat={setChatPedidoId} onBorrar={setConfirmBorrarId} />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      {/* Modal confirmar borrado */}
      {confirmBorrarId !== null && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center sm:items-center"
          onClick={() => setConfirmBorrarId(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-black text-lg text-gray-900 text-center mb-2">¿Eliminar pedido?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Este pedido desaparecerá de tu historial. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBorrarId(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => borrarPedido(confirmBorrarId)}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}