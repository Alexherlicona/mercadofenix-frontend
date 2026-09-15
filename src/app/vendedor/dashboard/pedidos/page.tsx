// src/app/vendedor/dashboard/pedidos/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, MessageCircle, Send, X, Upload, CheckCircle2,
  Loader2, RefreshCw, Receipt, ArrowLeft, MapPin, Phone,
  Banknote, CreditCard, Truck, Store, Building2,
  Package, ChevronDown, ChevronUp, Clock, Info, Trash2,
  Download, Lock, Unlock, FileText, Zap, AlertCircle
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000";

// ── FIX: WebSocket() exige esquema ws:// o wss://, nunca http:// o https://.
// Antes se usaba WS_URL tal cual (http://... o https://...), lo que hacía
// que `new WebSocket(...)` lanzara un SyntaxError inmediato y la conexión
// jamás llegara a abrirse — por eso el botón de enviar no hacía nada.
function buildWsUrl(path: string) {
  const wsBase = WS_URL.replace(/^http/, "ws"); // http->ws, https->wss
  return `${wsBase}${path}`;
}

function vendedorHeaders(): HeadersInit {
  const token = localStorage.getItem("vendedor_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Sala {
  sala_id: number;
  pedido_id: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  pedido_estado: string;
  pedido_total: number;
  es_digital: boolean;
  no_leidos: number;
  ultimo_mensaje: string | null;
  ultimo_mensaje_en: string | null;
}

// Un "cliente agrupado" tiene varios pedidos
interface ClienteConPedidos {
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  salas: Sala[];
  total_no_leidos: number;
}

interface Mensaje {
  id: number;
  remitente_tipo: "cliente" | "vendedor";
  contenido: string;
  es_comprobante: boolean;
  archivo_url: string | null;
  enviado_en: string;
}

interface DetallePedido {
  id: number;
  estado: string;
  tipo_entrega: string;
  metodo_pago: string;
  subtotal: number;
  costo_envio: number;
  total: number;
  es_digital: boolean;
  descarga_habilitada: boolean;
  descarga_token: string | null;
  items: { id: number; nombre_producto: string; precio_unitario: number; cantidad: number; subtotal: number; color: string | null; talla: string | null }[];
  cliente: { nombres: string; apellidos: string; telefono: string; email: string | null } | null;
  direccion_guardada: { nombre: string; departamento: string; municipio: string; direccion_exacta: string; referencia: string | null; telefono: string | null } | null;
  direccion_alternativa: string | null;
  nota_cliente: string | null;
  nota_vendedor: string | null;
  fecha_pedido: string;
  fecha_confirmacion: string | null;
  fecha_entrega_estimada: string | null;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pendiente:      { label: "Pendiente",      color: "text-amber-700",   bg: "bg-amber-100",   dot: "bg-amber-500"   },
  confirmado:     { label: "Confirmado",     color: "text-blue-700",    bg: "bg-blue-100",    dot: "bg-blue-500"    },
  en_preparacion: { label: "En preparación", color: "text-purple-700",  bg: "bg-purple-100",  dot: "bg-purple-500"  },
  en_camino:      { label: "En camino",      color: "text-cyan-700",    bg: "bg-cyan-100",    dot: "bg-cyan-500"    },
  entregado:      { label: "Entregado",      color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
  cancelado:      { label: "Cancelado",      color: "text-red-700",     bg: "bg-red-100",     dot: "bg-red-500"     },
};

// Para pedidos físicos
const ESTADOS_SIGUIENTES_FISICO: Record<string, { estado: string; label: string; color: string }> = {
  pendiente:      { estado: "confirmado",     label: "Confirmar pedido",    color: "from-blue-600 to-blue-700"      },
  confirmado:     { estado: "en_preparacion", label: "Iniciar preparación", color: "from-purple-600 to-purple-700"  },
  en_preparacion: { estado: "en_camino",      label: "Marcar en camino",    color: "from-cyan-600 to-cyan-700"      },
  en_camino:      { estado: "entregado",      label: "Confirmar entregado", color: "from-emerald-600 to-emerald-700"},
};

const MSG_ESTADO: Record<string, string> = {
  confirmado:     "✅ ¡Tu pedido ha sido confirmado! Estamos preparando tu orden.",
  en_preparacion: "📦 Tu pedido está en preparación. Te avisamos cuando salga.",
  en_camino:      "🚚 ¡Tu pedido ya está en camino! Prepárate para recibirlo.",
  entregado:      "🎉 Pedido marcado como entregado. ¡Gracias por tu compra!",
};

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
}
function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── PANEL INFO DEL PEDIDO ────────────────────────────────────────────────────
function PanelInfoPedido({ detalle, cargando }: { detalle: DetallePedido | null; cargando: boolean }) {
  const [expandido, setExpandido] = useState(true);

  if (cargando) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );
  if (!detalle) return null;

  const cfg = ESTADO_CONFIG[detalle.estado] || ESTADO_CONFIG.pendiente;
  const dir = detalle.direccion_guardada;

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-white">Información del pedido</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          {detalle.es_digital && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-1">
              <Download className="w-2.5 h-2.5" /> Digital
            </span>
          )}
        </div>
        {expandido ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expandido && (
        <div className="px-4 pb-4 space-y-3">

          {/* Cliente */}
          {detalle.cliente && (
            <div className="bg-gray-800/60 rounded-2xl p-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-black text-white flex-shrink-0">
                  {detalle.cliente.nombres.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{detalle.cliente.nombres} {detalle.cliente.apellidos}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{detalle.cliente.telefono}</p>
                  {detalle.cliente.email && <p className="text-xs text-gray-500">{detalle.cliente.email}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Entrega y pago */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Entrega</p>
              <div className="flex items-center gap-1.5">
                {detalle.es_digital
                  ? <Download className="w-3.5 h-3.5 text-violet-400" />
                  : detalle.tipo_entrega === "domicilio"
                  ? <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  : <Store className="w-3.5 h-3.5 text-blue-400" />}
                <p className="text-xs font-bold text-white">
                  {detalle.es_digital ? "Descarga digital" : detalle.tipo_entrega === "domicilio" ? "A domicilio" : "En tienda"}
                </p>
              </div>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Pago</p>
              <div className="flex items-center gap-1.5">
                {detalle.metodo_pago === "efectivo"
                  ? <Banknote className="w-3.5 h-3.5 text-green-400" />
                  : detalle.metodo_pago === "tigo_money"
                  ? <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  : <CreditCard className="w-3.5 h-3.5 text-blue-400" />}
                <p className="text-xs font-bold text-white capitalize">{detalle.metodo_pago.replace("_", " ")}</p>
              </div>
            </div>
          </div>

          {/* Dirección (solo físico) */}
          {!detalle.es_digital && detalle.tipo_entrega === "domicilio" && (
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Dirección de entrega
              </p>
              {dir ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-orange-400">{dir.nombre}</p>
                  <p className="text-xs text-white">{dir.departamento}, {dir.municipio}</p>
                  <p className="text-xs text-gray-300">{dir.direccion_exacta}</p>
                  {dir.referencia && <p className="text-xs text-gray-400 italic">Ref: {dir.referencia}</p>}
                  {dir.telefono && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {dir.telefono}</p>}
                </div>
              ) : (
                <p className="text-xs text-gray-300">{detalle.direccion_alternativa || "No especificada"}</p>
              )}
            </div>
          )}

          {/* Estado descarga (digital) */}
          {detalle.es_digital && (
            <div className={`rounded-xl p-3 border ${detalle.descarga_habilitada ? "bg-emerald-900/20 border-emerald-500/30" : "bg-amber-900/20 border-amber-500/30"}`}>
              <p className="text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {detalle.descarga_habilitada
                  ? <><Unlock className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Descarga habilitada</span></>
                  : <><Lock className="w-3 h-3 text-amber-400" /><span className="text-amber-400">Descarga pendiente</span></>}
              </p>
              <p className="text-xs text-gray-400">
                {detalle.descarga_habilitada
                  ? "El cliente ya puede descargar el archivo."
                  : "Verifica el comprobante de pago y luego autoriza la descarga."}
              </p>
            </div>
          )}

          {/* Productos */}
          <div className="bg-gray-800/60 rounded-xl p-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> Productos ({detalle.items.length})
            </p>
            <div className="space-y-2">
              {detalle.items.map(item => (
                <div key={item.id} className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white line-clamp-1">{item.nombre_producto}</p>
                    <p className="text-xs text-gray-500">
                      x{item.cantidad}{item.color && <span> · {item.color}</span>}{item.talla && <span> · T.{item.talla}</span>}
                    </p>
                  </div>
                  <p className="text-xs font-black text-orange-400 flex-shrink-0">L{item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between">
              <span className="text-xs text-gray-400">Total</span>
              <span className="text-sm font-black text-orange-400">L{detalle.total.toFixed(2)}</span>
            </div>
          </div>

          {detalle.nota_cliente && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-400 mb-1">Nota del cliente</p>
              <p className="text-xs text-amber-200">{detalle.nota_cliente}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-gray-500">
            <Clock className="w-3 h-3" />
            <p className="text-xs">Pedido el {formatFecha(detalle.fecha_pedido)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function ChatVendedor({ sala, onClose, onMensajeLeido }: {
  sala: Sala;
  onClose: () => void;
  onMensajeLeido: (salaId: number) => void;
}) {
  const [mensajes, setMensajes]             = useState<Mensaje[]>([]);
  const [detallePedido, setDetallePedido]   = useState<DetallePedido | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(true);
  const [texto, setTexto]                   = useState("");
  const [cargando, setCargando]             = useState(true);
  const [typing, setTyping]                 = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [habilitandoDescarga, setHabilitandoDescarga] = useState(false);
  const [estadoActual, setEstadoActual]     = useState(sala.pedido_estado);
  const [descargaHabilitada, setDescargaHabilitada] = useState(false);
  const [wsListo, setWsListo]               = useState(false);
  const [enviando, setEnviando]             = useState(false);
  const wsRef    = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("vendedor_token");
      const [, resMsgs, resDetalle] = await Promise.allSettled([
        fetch(`${API_URL}/api/chat/sala/vendedor/${sala.pedido_id}`, {
          method: "POST",
          headers: { ...vendedorHeaders(), "Content-Type": "application/json" },
        }),
        fetch(`${API_URL}/api/chat/sala/vendedor/${sala.sala_id}/mensajes`, {
          headers: vendedorHeaders(),
        }),
        fetch(`${API_URL}/api/pedidos/vendedor/detalle/${sala.pedido_id}`, {
          headers: vendedorHeaders(),
        }),
      ]);

      if (resMsgs.status === "fulfilled" && resMsgs.value.ok) {
        const data = await resMsgs.value.json();
        setMensajes(data.mensajes || []);
        onMensajeLeido(sala.sala_id);
      }

      if (resDetalle.status === "fulfilled" && resDetalle.value.ok) {
        const d = await resDetalle.value.json();
        setDetallePedido(d);
        setDescargaHabilitada(d.descarga_habilitada || false);
      }
      setCargandoDetalle(false);
      setCargando(false);

      // FIX: construir la URL con esquema ws/wss (nunca http/https) usando buildWsUrl.
      // Además, envolver en try/catch: si por cualquier razón el WS no puede
      // crearse (URL mal formada, red bloqueada, etc.), el chat sigue
      // funcionando vía el fallback HTTP en enviar().
      try {
        const ws = new WebSocket(buildWsUrl(`/api/chat/ws/${sala.sala_id}?token=${token}`));
        wsRef.current = ws;
        ws.onopen = () => setWsListo(true);
        ws.onclose = () => setWsListo(false);
        ws.onerror = () => setWsListo(false);
        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (data.tipo === "mensaje") {
            setMensajes(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
            setTyping(false);
            onMensajeLeido(sala.sala_id);
          } else if (data.tipo === "typing" && data.remitente_tipo === "cliente") {
            setTyping(true);
            setTimeout(() => setTyping(false), 3000);
          }
        };
      } catch (err) {
        console.error("No se pudo abrir el WebSocket, se usará HTTP como respaldo:", err);
        setWsListo(false);
      }
    };
    init();
    return () => wsRef.current?.close();
  }, [sala.sala_id, sala.pedido_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, typing]);

  // FIX: antes "enviar" dependía 100% del WebSocket y no hacía nada si no
  // estaba OPEN (el bug reportado). Ahora usa el mismo patrón de fallback
  // por HTTP que ya tenía habilitarDescarga, contra el endpoint que ya
  // existe en el backend: POST /api/chat/sala/vendedor/{sala_id}/mensaje
  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;

    setEnviando(true);
    setTexto("");

    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ tipo: "mensaje", contenido }));
        // El propio servidor hace broadcast de vuelta a esta sala (incluido
        // este cliente), así que no lo agregamos aquí para evitar duplicados.
      } else {
        // WS no disponible — respaldo por HTTP
        const res = await fetch(`${API_URL}/api/chat/sala/vendedor/${sala.sala_id}/mensaje`, {
          method: "POST",
          headers: { ...vendedorHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ contenido }),
        });
        if (res.ok) {
          const data = await res.json();
          setMensajes(prev => prev.find(m => m.id === data.mensaje.id) ? prev : [...prev, data.mensaje]);
        } else {
          throw new Error("No se pudo enviar el mensaje");
        }
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      // Restaurar el texto para que el vendedor no lo pierda
      setTexto(contenido);
    } finally {
      setEnviando(false);
    }
  };

  const subirArchivo = async (file: File) => {
    setSubiendoArchivo(true);
    const formData = new FormData();
    formData.append("archivo", file);
    try {
      await fetch(`${API_URL}/api/chat/sala/${sala.sala_id}/comprobante`, {
        method: "POST", headers: vendedorHeaders(), body: formData,
      });
    } finally { setSubiendoArchivo(false); }
  };

  const avanzarEstado = async () => {
    const sig = ESTADOS_SIGUIENTES_FISICO[estadoActual];
    if (!sig) return;
    setActualizandoEstado(true);
    try {
      const res = await fetch(`${API_URL}/api/pedidos/${sala.pedido_id}/estado`, {
        method: "PUT",
        headers: { ...vendedorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ estado: sig.estado }),
      });
      if (res.ok) {
        setEstadoActual(sig.estado);
        setDetallePedido(prev => prev ? { ...prev, estado: sig.estado } : prev);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ tipo: "mensaje", contenido: MSG_ESTADO[sig.estado] }));
        } else {
          // Fallback HTTP si el WS no está listo
          try {
            const resMsj = await fetch(`${API_URL}/api/chat/sala/vendedor/${sala.sala_id}/mensaje`, {
              method: "POST",
              headers: { ...vendedorHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify({ contenido: MSG_ESTADO[sig.estado] }),
            });
            if (resMsj.ok) {
              const msgData = await resMsj.json();
              setMensajes(prev => [...prev, msgData.mensaje]);
            }
          } catch {}
        }
      }
    } finally { setActualizandoEstado(false); }
  };

  // ── HABILITAR DESCARGA DIGITAL ───────────────────────────────────────────
  const habilitarDescarga = async () => {
    setHabilitandoDescarga(true);
    try {
      const res = await fetch(`${API_URL}/api/descargas/${sala.pedido_id}/habilitar`, {
        method: "POST",
        headers: vendedorHeaders(),
      });
      if (!res.ok) { alert("Error al habilitar descarga"); return; }
      const data = await res.json();

      setDescargaHabilitada(true);
      setEstadoActual("entregado");
      setDetallePedido(prev => prev ? { ...prev, descarga_habilitada: true, estado: "entregado" } : prev);

      // Construir mensaje con el enlace de descarga
      const linkDescarga = `${API_URL}${data.descarga_url}`;
      const mensaje = data.ya_habilitado
        ? `🔗 Tu enlace de descarga (ya estaba activo):\n${linkDescarga}`
        : `✅ ¡Pago verificado! Tu archivo está listo para descargar:\n${linkDescarga}\n\nHaz clic en el enlace para obtener tu archivo. 🎉`;

      // Intentar por WebSocket primero
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ tipo: "mensaje", contenido: mensaje }));
      } else {
        // Fallback HTTP — el WS puede estar en CONNECTING o cerrado
        try {
          const resMsj = await fetch(`${API_URL}/api/chat/sala/vendedor/${sala.sala_id}/mensaje`, {
            method: "POST",
            headers: { ...vendedorHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ contenido: mensaje }),
          });
          if (resMsj.ok) {
            const msgData = await resMsj.json();
            setMensajes(prev => [...prev, msgData.mensaje]);
          }
        } catch {
          // Si falla HTTP también, agregar localmente para que el vendedor lo vea
          setMensajes(prev => [...prev, {
            id: Date.now(),
            remitente_tipo: "vendedor",
            contenido: mensaje,
            es_comprobante: false,
            archivo_url: null,
            enviado_en: new Date().toISOString(),
          }]);
        }
      }
    } finally { setHabilitandoDescarga(false); }
  };

  const cfg = ESTADO_CONFIG[estadoActual] || ESTADO_CONFIG.pendiente;
  const sig = ESTADOS_SIGUIENTES_FISICO[estadoActual];
  const esDigital = detallePedido?.es_digital || false;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg h-[95vh] sm:h-[700px] flex flex-col bg-gray-900 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10">

        {/* HEADER */}
        <div className={`p-4 flex-shrink-0 ${esDigital ? "bg-gradient-to-r from-violet-700 to-purple-800" : "bg-gradient-to-r from-orange-600 to-red-700"}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-white text-lg flex-shrink-0">
              {sala.cliente_nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white truncate">{sala.cliente_nombre}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-xs ${esDigital ? "text-violet-200" : "text-orange-200"}`}>Pedido #{sala.pedido_id}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                {esDigital && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-200 text-violet-800 flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5" /> Digital
                  </span>
                )}
                {/* Indicador de conexión — útil para diagnosticar si el WS cae */}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${wsListo ? "bg-emerald-500/20 text-emerald-100" : "bg-white/15 text-white/60"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${wsListo ? "bg-emerald-300" : "bg-white/40"}`} />
                  {wsListo ? "En vivo" : "Modo básico"}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white flex-shrink-0 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Botones de acción según tipo de pedido */}
          <div className="mt-3 space-y-2">
            {/* Pedido digital: botón autorizar descarga */}
            {esDigital && !descargaHabilitada && (
              <button
                onClick={habilitarDescarga}
                disabled={habilitandoDescarga}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 text-white text-sm font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
              >
                {habilitandoDescarga
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Habilitando...</>
                  : <><Unlock className="w-4 h-4" /> ✅ Pago verificado — Autorizar descarga</>}
              </button>
            )}

            {/* Descarga ya habilitada */}
            {esDigital && descargaHabilitada && (
              <div className="w-full bg-emerald-900/40 border border-emerald-500/40 rounded-xl py-2.5 px-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-300 font-semibold">Descarga habilitada — enlace enviado al cliente</p>
              </div>
            )}

            {/* Pedido físico: botón avanzar estado */}
            {!esDigital && sig && (
              <button
                onClick={avanzarEstado}
                disabled={actualizandoEstado}
                className={`w-full bg-gradient-to-r ${sig.color} text-white text-sm font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow`}
              >
                {actualizandoEstado
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                {sig.label}
              </button>
            )}
          </div>
        </div>

        {/* INFO DEL PEDIDO */}
        <div className="flex-shrink-0 overflow-y-auto max-h-[40%] bg-gray-900">
          <PanelInfoPedido detalle={detallePedido} cargando={cargandoDetalle} />
        </div>

        {/* MENSAJES */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-950 min-h-0">
          {cargando ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-10 h-10 text-gray-700 mb-2" />
              <p className="text-gray-500 font-semibold text-sm">Sin mensajes aún</p>
              <p className="text-gray-600 text-xs mt-1">Saluda a tu cliente para empezar</p>
            </div>
          ) : (
            mensajes.map(msg => {
              const esMio      = msg.remitente_tipo === "vendedor";
              const esEnlace   = msg.contenido.includes("/api/descargas/archivo/");
              return (
                <div key={msg.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] px-3.5 py-2 rounded-2xl ${
                    esMio
                      ? esDigital
                        ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm"
                        : "bg-gradient-to-br from-orange-600 to-red-600 text-white rounded-tr-sm"
                      : "bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700"
                  }`}>
                    {msg.es_comprobante && msg.archivo_url && (
                      <div className="mb-2">
                        <p className="text-xs font-bold text-orange-300 mb-1 flex items-center gap-1">
                          <Receipt className="w-3 h-3" /> Comprobante
                        </p>
                        <a href={`${API_URL}${msg.archivo_url}`} target="_blank" rel="noopener noreferrer">
                          <img src={`${API_URL}${msg.archivo_url}`} alt="Comprobante"
                            className="w-full rounded-lg max-h-36 object-cover hover:opacity-90 transition border border-white/20" />
                        </a>
                      </div>
                    )}
                    {/* Enlace de descarga — renderizado especial */}
                    {esEnlace ? (
                      <div className="space-y-1.5">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.contenido.split("\n").map((line, i) => {
                            if (line.startsWith("http") || line.includes("/api/descargas/")) {
                              const url = line.startsWith("http") ? line : `${API_URL}${line}`;
                              return (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition rounded-xl px-3 py-2 mt-1 text-sm font-bold">
                                  <Download className="w-4 h-4 flex-shrink-0" />
                                  Descargar archivo
                                </a>
                              );
                            }
                            return <span key={i}>{line}{i < msg.contenido.split("\n").length - 1 ? "\n" : ""}</span>;
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.contenido}</p>
                    )}
                    <p className={`text-xs mt-0.5 text-right ${esMio ? "text-white/50" : "text-gray-500"}`}>
                      {formatHora(msg.enviado_en)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="p-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => fileRef.current?.click()} disabled={subiendoArchivo}
              className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50">
              {subiendoArchivo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {subiendoArchivo ? "Subiendo..." : "Adjuntar"}
            </button>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => { if (e.target.files?.[0]) subirArchivo(e.target.files[0]); }} />
          </div>
          <div className="flex gap-2">
            <textarea value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="flex-1 resize-none bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors max-h-20"
            />
            <button onClick={enviar} disabled={!texto.trim() || enviando}
              className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 self-end disabled:opacity-40 hover:shadow-lg transition-all active:scale-95">
              {enviando ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function VendedorPedidosPage() {
  const router = useRouter();
  const [salas,           setSalas]           = useState<Sala[]>([]);
  const [cargando,        setCargando]         = useState(true);
  const [salaActiva,      setSalaActiva]       = useState<Sala | null>(null);
  const [confirmBorrarId, setConfirmBorrarId]  = useState<number | null>(null);
  const [tabEstado,       setTabEstado]        = useState<string>("activos");
  const [clienteAbierto,  setClienteAbierto]   = useState<number | null>(null);

  // ── Archivar (persistente en BD) ───────────────────────────────────────────
  const archivarPedido = async (pedidoId: number) => {
    setConfirmBorrarId(null);
    // Optimistic: quitar de la lista inmediatamente
    setSalas(prev => prev.filter(s => s.pedido_id !== pedidoId));
    try {
      await fetch(`${API_URL}/api/chat/vendedor/pedidos/${pedidoId}`, {
        method: "DELETE", headers: vendedorHeaders(),
      });
      // No re-fetch — el servidor ya lo marcó como archivado
      // El next poll (15s) tampoco lo traerá porque el backend lo filtra
    } catch {
      // Si falla, recargar para restaurar el estado real
      cargarSalas();
    }
  };

  const cargarSalas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/vendedor/salas`, { headers: vendedorHeaders() });
      if (res.ok) setSalas((await res.json()).salas || []);
    } finally { setCargando(false); }
  }, []);

  useEffect(() => {
    cargarSalas();
    const interval = setInterval(cargarSalas, 15000);
    return () => clearInterval(interval);
  }, [cargarSalas]);

  const marcarLeido = (salaId: number) => {
    setSalas(prev => prev.map(s => s.sala_id === salaId ? { ...s, no_leidos: 0 } : s));
  };

  const totalNoLeidos = salas.reduce((s, sala) => s + sala.no_leidos, 0);

  // ── Clasificar pedidos ─────────────────────────────────────────────────────
  const ACTIVOS   = ["pendiente","confirmado","en_preparacion","en_camino"];
  const CERRADOS  = ["entregado","cancelado"];

  const salasActivas  = salas.filter(s => ACTIVOS.includes(s.pedido_estado));
  const salasCerradas = salas.filter(s => CERRADOS.includes(s.pedido_estado));

  const salasVista = tabEstado === "activos" ? salasActivas : salasCerradas;

  // ── Agrupar por cliente ────────────────────────────────────────────────────
  const clientesAgrupados: ClienteConPedidos[] = [];
  const seen: Record<number, ClienteConPedidos> = {};
  for (const s of salasVista) {
    if (!seen[s.cliente_id]) {
      const grupo: ClienteConPedidos = {
        cliente_id:      s.cliente_id,
        cliente_nombre:  s.cliente_nombre,
        cliente_telefono: s.cliente_telefono,
        salas:            [],
        total_no_leidos:  0,
      };
      seen[s.cliente_id] = grupo;
      clientesAgrupados.push(grupo);
    }
    seen[s.cliente_id].salas.push(s);
    seen[s.cliente_id].total_no_leidos += s.no_leidos;
  }
  // Ordenar: con no leídos primero, luego por último mensaje
  clientesAgrupados.sort((a, b) => {
    if (a.total_no_leidos !== b.total_no_leidos) return b.total_no_leidos - a.total_no_leidos;
    const aTime = a.salas[0]?.ultimo_mensaje_en || "";
    const bTime = b.salas[0]?.ultimo_mensaje_en || "";
    return bTime.localeCompare(aTime);
  });

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {salaActiva && (
        <ChatVendedor
          sala={salaActiva}
          onClose={() => { setSalaActiva(null); cargarSalas(); }}
          onMensajeLeido={marcarLeido}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a12]/95 backdrop-blur-sm border-b border-white/[0.06] px-4 py-3.5 flex items-center gap-3">
        <button onClick={() => router.push("/vendedor/dashboard")}
          className="p-2 rounded-xl hover:bg-white/[0.05] transition text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black text-white">Pedidos y Mensajes</h1>
          <p className="text-xs text-gray-500">
            {clientesAgrupados.length} cliente{clientesAgrupados.length !== 1 ? "s" : ""}
            {totalNoLeidos > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {totalNoLeidos} sin leer
              </span>
            )}
          </p>
        </div>
        <button onClick={cargarSalas} className="p-2 rounded-xl hover:bg-white/[0.05] transition text-gray-500">
          <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] px-4">
        {[
          { id: "activos",  label: "Activos",   count: salasActivas.length  },
          { id: "cerrados", label: "Historial",  count: salasCerradas.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setTabEstado(tab.id); setClienteAbierto(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px
              ${tabEstado === tab.id ? "border-orange-500 text-orange-400" : "border-transparent text-gray-600 hover:text-gray-300"}`}>
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full
                ${tabEstado === tab.id ? "bg-orange-500/20 text-orange-400" : "bg-white/[0.05] text-gray-500"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista agrupada por cliente */}
      <div className="p-4 space-y-2 max-w-2xl pb-10">
        {cargando ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : clientesAgrupados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-lg font-black text-white mb-1">
              {tabEstado === "activos" ? "Sin pedidos activos" : "Sin historial"}
            </h2>
            <p className="text-gray-500 text-sm max-w-xs">
              {tabEstado === "activos"
                ? "Cuando tus clientes compren aparecerán aquí."
                : "Los pedidos entregados y cancelados aparecen aquí."}
            </p>
          </div>
        ) : (
          clientesAgrupados.map(cliente => {
            const estaAbierto = clienteAbierto === cliente.cliente_id;
            const tieneMsgs   = cliente.total_no_leidos > 0;
            return (
              <div key={cliente.cliente_id}
                className={`rounded-2xl border overflow-hidden transition-all
                  ${tieneMsgs ? "border-orange-500/40 bg-orange-500/[0.04]" : "border-white/[0.07] bg-[#0f0f1a]"}`}>

                {/* Cabecera del cliente — siempre visible */}
                <button onClick={() => setClienteAbierto(estaAbierto ? null : cliente.cliente_id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-base shadow">
                      {cliente.cliente_nombre.charAt(0).toUpperCase()}
                    </div>
                    {tieneMsgs && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow">
                        {cliente.total_no_leidos > 9 ? "9+" : cliente.total_no_leidos}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${tieneMsgs ? "text-white" : "text-gray-200"}`}>
                      {cliente.cliente_nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {cliente.salas.length} pedido{cliente.salas.length !== 1 ? "s" : ""}
                      {tieneMsgs && <span className="text-orange-400 font-semibold"> · {cliente.total_no_leidos} sin leer</span>}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${estaAbierto ? "rotate-180" : ""}`} />
                </button>

                {/* Pedidos del cliente — expandibles */}
                {estaAbierto && (
                  <div className="border-t border-white/[0.05] divide-y divide-white/[0.03]">
                    {cliente.salas.map(sala => {
                      const cfg = ESTADO_CONFIG[sala.pedido_estado] || ESTADO_CONFIG.pendiente;
                      const msgsNuevos = sala.no_leidos > 0;
                      return (
                        <div key={sala.sala_id}>
                          <button onClick={() => setSalaActiva(sala)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-all">
                            {/* Ícono tipo */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm
                              ${sala.es_digital ? "bg-violet-500/15" : "bg-orange-500/15"}`}>
                              {sala.es_digital ? "💾" : "📦"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-300">#{sala.pedido_id}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-xs text-orange-400 font-semibold">L{sala.pedido_total.toFixed(2)}</span>
                              </div>
                              {sala.ultimo_mensaje && (
                                <p className={`text-xs mt-0.5 truncate ${msgsNuevos ? "text-gray-300 font-semibold" : "text-gray-600"}`}>
                                  {sala.ultimo_mensaje}
                                </p>
                              )}
                            </div>
                            {msgsNuevos && (
                              <span className="w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center flex-shrink-0">
                                {sala.no_leidos}
                              </span>
                            )}
                            <MessageCircle className={`w-4 h-4 flex-shrink-0 ${msgsNuevos ? "text-orange-400" : "text-gray-700"}`} />
                          </button>

                          {/* Botón archivar — solo para entregados/cancelados */}
                          {(sala.pedido_estado === "entregado" || sala.pedido_estado === "cancelado") && (
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmBorrarId(sala.pedido_id); }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-gray-700 hover:text-red-400 hover:bg-red-500/5 transition-colors">
                              <Trash2 className="w-3 h-3" /> Archivar del historial
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal confirmar archivar */}
      {confirmBorrarId !== null && (
        <div className="fixed inset-0 bg-black/70 z-[90] flex items-end justify-center sm:items-center"
          onClick={() => setConfirmBorrarId(null)}>
          <div className="bg-[#111120] border border-white/[0.08] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="font-black text-base text-white text-center mb-1.5">¿Archivar pedido?</h3>
            <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
              Se ocultará de tu historial. El pedido sigue en el sistema para registros internos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBorrarId(null)}
                className="flex-1 py-3 rounded-2xl bg-[#1a1a2e] font-semibold text-gray-400 hover:bg-[#222236] transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={() => archivarPedido(confirmBorrarId)}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors text-sm">
                Archivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}