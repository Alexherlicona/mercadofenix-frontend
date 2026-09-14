// src/app/fenix/carrito/checkout/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Truck, Store, Building2,
  Banknote, CreditCard, ChevronRight, ChevronDown,
  CheckCircle2, Loader2, AlertCircle, Plus, X,
  ShoppingBag, User, Lock, Phone, Package
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Helper URL imágenes ───────────────────────────────────────────────────────
// Evita el bug de armar "${API_URL}undefined" cuando no hay imagen_principal.
function imgUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

// ─── TIPOS ─────────────────────────────────────────────────────────────────────
interface CarritoItem {
  id: number;
  producto_id: string;
  nombre_producto: string;
  nombre_tienda: string;
  imagen_principal: string | null;
  cantidad: number;
  precio_unitario: number;
  color: string | null;
  talla: string | null;
}

interface Direccion {
  id: number;
  nombre_direccion: string;
  departamento: string;
  municipio: string;
  direccion_exacta: string;
  referencia: string | null;
  telefono_contacto: string | null;
  es_principal: boolean;
}

interface ClienteInfo {
  id: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string | null;
  departamento: string | null;
  municipio: string | null;
  direccion_exacta: string | null;
}

type TipoEntrega = "domicilio" | "tienda" | "oficina_fenix";
type MetodoPago = "efectivo" | "transferencia" | "";

const HONDURAS_LOCATIONS: Record<string, string[]> = {
  "Francisco Morazán": ["Tegucigalpa", "Comayagüela", "Valle de Ángeles", "Santa Lucía", "Ojojona"],
  "Cortés": ["San Pedro Sula", "Choloma", "La Lima", "El Progreso", "Villanueva", "Puerto Cortés"],
  "Atlántida": ["La Ceiba", "Tela", "El Progreso", "Jutiapa"],
  "Comayagua": ["Comayagua", "Siguatepeque", "La Trinidad"],
  "Santa Bárbara": ["Santa Bárbara", "San Marcos", "Quimistán"],
  "Copán": ["Santa Rosa de Copán", "La Entrada", "Copán Ruinas"],
  "Olancho": ["Juticalpa", "Catacamas", "San Francisco de la Paz"],
  "Choluteca": ["Choluteca", "El Triunfo", "Danlí"],
  "El Paraíso": ["Danlí", "Yuscarán", "El Paraíso"],
  "Yoro": ["Yoro", "El Progreso", "Morazán"],
  "Colón": ["Trujillo", "Tocoa", "Sonaguera"],
  "Ocotepeque": ["Ocotepeque", "Sensenti", "La Labor"],
  "Lempira": ["Gracias", "La Esperanza", "Erandique"],
  "Intibucá": ["La Esperanza", "Intibucá", "Yamaranguila"],
  "La Paz": ["La Paz", "Marcala", "Santa Elena"],
  "Valle": ["Nacaome", "San Lorenzo", "Amapala"],
  "Islas de la Bahía": ["Roatán", "Utila", "Guanaja"],
  "Gracias a Dios": ["Puerto Lempira", "Brus Laguna"],
};

// ─── CONSTANTES VISUALES ────────────────────────────────────────────────────────
const ENTREGA_OPCIONES = [
  {
    id: "domicilio" as TipoEntrega,
    icon: Truck,
    titulo: "A domicilio",
    desc: "Enviamos a tu dirección",
    costo: 50,
    color: "emerald",
  },
  {
    id: "tienda" as TipoEntrega,
    icon: Store,
    titulo: "Recoger en tienda",
    desc: "Recoge con el vendedor",
    costo: 0,
    color: "blue",
  },
  {
    id: "oficina_fenix" as TipoEntrega,
    icon: Building2,
    titulo: "Oficina Fénix",
    desc: "Pasa por nuestra oficina",
    costo: 0,
    color: "orange",
  },
];

const PAGO_OPCIONES = [
  {
    id: "efectivo" as MetodoPago,
    icon: Banknote,
    titulo: "Efectivo",
    desc: "Paga al recibir tu pedido",
    color: "green",
  },
  {
    id: "transferencia" as MetodoPago,
    icon: CreditCard,
    titulo: "Transferencia bancaria",
    desc: "Banco Atlántida · BAC · Banpais",
    color: "blue",
  },
];

// ─── COMPONENTE STEP INDICATOR ──────────────────────────────────────────────────
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < step ? "bg-orange-500 flex-1" : i === step ? "bg-orange-300 flex-1" : "bg-gray-200 w-6"
          }`}
        />
      ))}
    </div>
  );
}

// ── Miniatura de producto con fallback visual si no hay imagen ────────────────
function ProductoThumb({ src, alt, size = 48 }: { src: string | null; alt: string; size?: number }) {
  const [fallo, setFallo] = useState(false);
  if (!src || fallo) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"
      >
        <Package className="w-1/2 h-1/2 text-gray-300" />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size }} className="rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        unoptimized
        onError={() => setFallo(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();

  // Estado global
  const [paso, setPaso] = useState<1 | 2 | 3>(1); // 1=entrega, 2=pago, 3=resumen
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedidoCreado, setPedidoCreado] = useState<number | null>(null);
  const [numPedidos, setNumPedidos] = useState<number>(1);

  // Selecciones del checkout
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("domicilio");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("");
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<number | null>(null);
  const [direccionAlternativa, setDireccionAlternativa] = useState("");
  const [usarNuevaDireccion, setUsarNuevaDireccion] = useState(false);
  const [notaCliente, setNotaCliente] = useState("");

  // Formulario nueva dirección
  const [nuevaDirForm, setNuevaDirForm] = useState({
    nombre_direccion: "Casa",
    departamento: "",
    municipio: "",
    direccion_exacta: "",
    referencia: "",
    telefono_contacto: "",
    guardar: true,
  });
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<string[]>([]);

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0),
    [items]
  );
  const costoEnvio = useMemo(
    () => ENTREGA_OPCIONES.find((o) => o.id === tipoEntrega)?.costo ?? 0,
    [tipoEntrega]
  );
  const total = subtotal + costoEnvio;

  // ── Carga inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("access_token");

        // Cargar carrito — token obligatorio para encontrar el carrito del usuario autenticado
        const resCarrito = await fetch(`${API_URL}/api/carrito/mi-carrito`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resCarrito.ok) {
          const dataCarrito = await resCarrito.json();
          const itemsCargados = dataCarrito.items || [];
          if (itemsCargados.length === 0) {
            router.replace("/fenix/carrito");
            return;
          }
          setItems(itemsCargados);
        }

        // Cargar cliente si está autenticado
        if (token) {
          const resCliente = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resCliente.ok) {
            const dataCliente = await resCliente.json();
            setCliente(dataCliente);

            // Cargar direcciones guardadas
            const resDirs = await fetch(`${API_URL}/api/direcciones/`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resDirs.ok) {
              const dataDirs = await resDirs.json();
              const dirs: Direccion[] = dataDirs.direcciones || [];
              setDirecciones(dirs);
              // Pre-seleccionar la principal
              const principal = dirs.find((d) => d.es_principal);
              if (principal) setDireccionSeleccionada(principal.id);
              else if (dirs.length > 0) setDireccionSeleccionada(dirs[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error en init checkout:", err);
      } finally {
        setLoadingInicial(false);
      }
    };
    init();
  }, [router]);

  // Actualizar municipios cuando cambia departamento
  useEffect(() => {
    const municipios = HONDURAS_LOCATIONS[nuevaDirForm.departamento] || [];
    setMunicipiosDisponibles(municipios);
    setNuevaDirForm((prev) => ({ ...prev, municipio: municipios[0] || "" }));
  }, [nuevaDirForm.departamento]);

  // ── Validaciones por paso ───────────────────────────────────────────────────
  const paso1Valido = useMemo(() => {
    if (tipoEntrega !== "domicilio") return true;
    if (!usarNuevaDireccion && direccionSeleccionada) return true;
    if (usarNuevaDireccion && nuevaDirForm.departamento && nuevaDirForm.municipio && nuevaDirForm.direccion_exacta) return true;
    if (direcciones.length === 0 && nuevaDirForm.departamento && nuevaDirForm.municipio && nuevaDirForm.direccion_exacta) return true;
    return false;
  }, [tipoEntrega, usarNuevaDireccion, direccionSeleccionada, nuevaDirForm, direcciones.length]);

  const paso2Valido = metodoPago !== "";

  // ── Crear pedido ────────────────────────────────────────────────────────────
  const crearPedido = async () => {
    if (!cliente) return;
    setProcesando(true);
    setError(null);

    const token = localStorage.getItem("access_token");

    try {
      // Guardar nueva dirección si aplica
      let dirIdFinal: number | null = direccionSeleccionada;
      let dirAltFinal: string | null = null;

      if (tipoEntrega === "domicilio" && (usarNuevaDireccion || direcciones.length === 0)) {
        if (nuevaDirForm.guardar) {
          // Guardar en la cuenta del cliente
          const resSave = await fetch(`${API_URL}/api/direcciones/crear`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              nombre_direccion: nuevaDirForm.nombre_direccion,
              departamento: nuevaDirForm.departamento,
              municipio: nuevaDirForm.municipio,
              direccion_exacta: nuevaDirForm.direccion_exacta,
              referencia: nuevaDirForm.referencia || null,
              telefono_contacto: nuevaDirForm.telefono_contacto || null,
              es_principal: false,
            }),
          });
          if (resSave.ok) {
            const dataSave = await resSave.json();
            dirIdFinal = dataSave.id;
          }
        } else {
          // Dirección one-time
          dirAltFinal = `${nuevaDirForm.departamento}, ${nuevaDirForm.municipio} — ${nuevaDirForm.direccion_exacta}`;
        }
      } else if (tipoEntrega !== "domicilio") {
        dirAltFinal =
          tipoEntrega === "tienda" ? "Retiro en tienda del vendedor" : "Oficina Mercado Fénix";
      }

      // Construir items del pedido desde el carrito
      const itemsPedido = items.map((item) => ({
        producto_id: item.producto_id,
        nombre_producto: item.nombre_producto,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        color: item.color || null,
        talla: item.talla || null,
      }));

      const body = {
        direccion_id: dirIdFinal,
        direccion_alternativa: dirAltFinal,
        items: itemsPedido,
        tipo_entrega: tipoEntrega,
        metodo_pago: metodoPago,
        nota_cliente: notaCliente || null,
      };

      const res = await fetch(`${API_URL}/api/pedidos/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al crear el pedido");
      }

      const data = await res.json();
      setPedidoCreado(data.pedido_id);
      setNumPedidos(data.num_pedidos || 1);

      // Vaciar carrito tras confirmar el pedido
      try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        await fetch(`${API_URL}/api/carrito/vaciar`, {
          method: "POST",
          credentials: "include",
          headers,
        });
        // Notificar al ícono del header para que muestre 0
        window.dispatchEvent(new CustomEvent("cart-updated", { detail: { total_items: 0 } }));
      } catch {
        // Si falla el vaciado no interrumpir — el pedido ya se creó
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado");
    } finally {
      setProcesando(false);
    }
  };

  // ─── LOADING INICIAL ─────────────────────────────────────────────────────────
  if (loadingInicial) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-orange-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-bold">Preparando tu pedido...</p>
        </div>
      </div>
    );
  }

  // ─── PEDIDO CREADO CON ÉXITO ─────────────────────────────────────────────────
  if (pedidoCreado) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Ícono de éxito animado */}
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-fade-in">
            <CheckCircle2 className="w-14 h-14 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">¡Pedido realizado!</h1>
          <p className="text-gray-600 mb-2">
            {numPedidos > 1 ? (
              <>Se crearon <span className="font-bold text-orange-600">{numPedidos} pedidos</span> (uno por cada tienda) y fueron registrados exitosamente.</>
            ) : (
              <>Tu pedido <span className="font-bold text-orange-600">#{pedidoCreado}</span> fue registrado exitosamente.</>
            )}
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {metodoPago === "efectivo"
              ? "Prepara el efectivo al momento de recibir tu pedido."
              : "Realiza la transferencia y envía tu comprobante al vendedor."}
          </p>

          {/* Resumen rápido */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 text-left">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">Total pagado</span>
              <span className="font-black text-xl text-orange-600">L{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">Método de pago</span>
              <span className="text-sm font-semibold capitalize">{metodoPago}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Entrega</span>
              <span className="text-sm font-semibold">
                {tipoEntrega === "domicilio" ? "A domicilio" : tipoEntrega === "tienda" ? "En tienda" : "Oficina Fénix"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/fenix/mi-cuenta/mis-pedidos"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg text-center transition-colors"
            >
              Ver mis pedidos
            </Link>
            <Link
              href="/fenix/productos"
              className="w-full border-2 border-gray-200 hover:border-gray-300 text-gray-700 py-4 rounded-2xl font-bold text-lg text-center transition-colors"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── USUARIO NO AUTENTICADO ──────────────────────────────────────────────────
  if (!cliente) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50">
        <div className="mf-container py-6">
          <Link href="/fenix/carrito" className="inline-flex items-center gap-2 text-gray-500 hover:text-orange-600 mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver al carrito</span>
          </Link>

          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-orange-400" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-3">Inicia sesión para continuar</h1>
            <p className="text-gray-500 mb-8">
              Necesitas una cuenta en Mercado Fénix para realizar tu compra. ¡Es rápido y gratuito!
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href={`/fenix/mi-cuenta/login?redirect=/fenix/carrito/checkout`}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg text-center transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href={`/fenix/mi-cuenta/registro?redirect=/fenix/carrito/checkout`}
                className="w-full border-2 border-orange-200 hover:border-orange-400 text-orange-600 py-4 rounded-2xl font-bold text-lg text-center transition-colors"
              >
                Crear cuenta nueva
              </Link>
            </div>

            <p className="text-xs text-gray-400 mt-6">
              Tus productos en el carrito se mantendrán guardados
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHECKOUT PRINCIPAL ──────────────────────────────────────────────────────
  return (
    // pb-44 (antes pb-36): deja espacio suficiente para que el último elemento
    // no quede tapado por CTA + navbar apilados en móvil
    <div className="mf-body-pad min-h-screen bg-gray-50 pb-44 lg:pb-10">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mf-container py-3.5 sm:py-4">
          <div className="lg:max-w-5xl lg:mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => paso > 1 ? setPaso((paso - 1) as 1 | 2 | 3) : router.back()} className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="font-black text-base sm:text-lg text-gray-900 leading-none">Checkout</h1>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Paso {paso} de 3 —{" "}
                  {paso === 1 ? "Entrega" : paso === 2 ? "Método de pago" : "Confirmar pedido"}
                </p>
              </div>
              <span className="font-black text-orange-600 text-base sm:text-lg lg:hidden flex-shrink-0">L{total.toFixed(2)}</span>
            </div>
            <StepIndicator step={paso} total={3} />
          </div>
        </div>
      </div>

      <div className="mf-container py-5">
        <div className="lg:max-w-5xl lg:mx-auto lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">

        {/* ══════════════════════════════════════════
            PASO 1 — MÉTODO DE ENTREGA + DIRECCIÓN
        ══════════════════════════════════════════ */}
        {/* ── LEFT COLUMN: pasos ─────────────────────────────────────────── */}
        <div>

        {paso === 1 && (
          <div className="space-y-5 animate-fade-in">

            {/* Saludo al cliente */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Comprando como</p>
                <p className="font-bold text-gray-900 truncate">{cliente.nombres} {cliente.apellidos}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" /> {cliente.telefono}
                </p>
              </div>
            </div>

            {/* Opciones de entrega */}
            <div>
              <h2 className="font-black text-gray-900 text-base sm:text-lg mb-3">¿Cómo quieres recibir tu pedido?</h2>
              <div className="space-y-2.5">
                {ENTREGA_OPCIONES.map((op) => {
                  const Icon = op.icon;
                  const activa = tipoEntrega === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() => setTipoEntrega(op.id)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                        activa
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          activa ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold ${activa ? "text-orange-700" : "text-gray-900"}`}>
                            {op.titulo}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{op.desc}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {op.costo > 0 ? (
                            <span className="text-sm font-bold text-gray-700">+L{op.costo}</span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Gratis</span>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-1 ${
                          activa ? "border-orange-500" : "border-gray-300"
                        }`}>
                          {activa && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bloque de dirección — solo si domicilio */}
            {tipoEntrega === "domicilio" && (
              <div className="space-y-3">
                <h2 className="font-black text-gray-900 text-base sm:text-lg">¿A dónde te lo enviamos?</h2>

                {/* Direcciones guardadas */}
                {direcciones.length > 0 && !usarNuevaDireccion && (
                  <div className="space-y-2">
                    {direcciones.map((dir) => (
                      <button
                        key={dir.id}
                        onClick={() => setDireccionSeleccionada(dir.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                          direccionSeleccionada === dir.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${direccionSeleccionada === dir.id ? "text-orange-500" : "text-gray-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm ${direccionSeleccionada === dir.id ? "text-orange-700" : "text-gray-900"}`}>
                                {dir.nombre_direccion}
                              </span>
                              {dir.es_principal && (
                                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Principal</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 truncate">{dir.departamento}, {dir.municipio}</p>
                            <p className="text-xs text-gray-500 truncate">{dir.direccion_exacta}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            direccionSeleccionada === dir.id ? "border-orange-500" : "border-gray-300"
                          }`}>
                            {direccionSeleccionada === dir.id && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => { setUsarNuevaDireccion(true); setDireccionSeleccionada(null); }}
                      className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-orange-400 active:scale-[0.99] rounded-2xl text-gray-600 hover:text-orange-600 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Usar otra dirección
                    </button>
                  </div>
                )}

                {/* Formulario nueva dirección */}
                {(usarNuevaDireccion || direcciones.length === 0) && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                    {usarNuevaDireccion && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-gray-900">Nueva dirección</span>
                        <button onClick={() => { setUsarNuevaDireccion(false); setDireccionSeleccionada(direcciones[0]?.id ?? null); }} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Nombre de la dirección */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre de la dirección</label>
                      <div className="flex gap-2 flex-wrap">
                        {["Casa", "Trabajo", "Otro"].map((nombre) => (
                          <button
                            key={nombre}
                            onClick={() => setNuevaDirForm(p => ({ ...p, nombre_direccion: nombre }))}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                              nuevaDirForm.nombre_direccion === nombre
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {nombre}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Departamento */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Departamento *</label>
                      <select
                        value={nuevaDirForm.departamento}
                        onChange={(e) => setNuevaDirForm(p => ({ ...p, departamento: e.target.value }))}
                        className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-3 py-2.5 text-sm outline-none bg-white transition-colors"
                      >
                        <option value="">Selecciona departamento</option>
                        {Object.keys(HONDURAS_LOCATIONS).map((dep) => (
                          <option key={dep} value={dep}>{dep}</option>
                        ))}
                      </select>
                    </div>

                    {/* Municipio */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Ciudad / Municipio *</label>
                      <select
                        value={nuevaDirForm.municipio}
                        onChange={(e) => setNuevaDirForm(p => ({ ...p, municipio: e.target.value }))}
                        disabled={!nuevaDirForm.departamento}
                        className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-3 py-2.5 text-sm outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                      >
                        <option value="">Selecciona municipio</option>
                        {municipiosDisponibles.map((mun) => (
                          <option key={mun} value={mun}>{mun}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dirección exacta */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Dirección exacta *</label>
                      <input
                        type="text"
                        placeholder="Colonia, calle, número de casa..."
                        value={nuevaDirForm.direccion_exacta}
                        onChange={(e) => setNuevaDirForm(p => ({ ...p, direccion_exacta: e.target.value }))}
                        className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                      />
                    </div>

                    {/* Referencia */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Referencia <span className="font-normal text-gray-400">(opcional)</span></label>
                      <input
                        type="text"
                        placeholder="Frente al parque, casa azul..."
                        value={nuevaDirForm.referencia}
                        onChange={(e) => setNuevaDirForm(p => ({ ...p, referencia: e.target.value }))}
                        className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                      />
                    </div>

                    {/* Teléfono de contacto */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Teléfono de contacto <span className="font-normal text-gray-400">(opcional)</span></label>
                      <input
                        type="tel"
                        placeholder="9999-9999"
                        value={nuevaDirForm.telefono_contacto}
                        onChange={(e) => setNuevaDirForm(p => ({ ...p, telefono_contacto: e.target.value }))}
                        className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                      />
                    </div>

                    {/* Guardar dirección */}
                    <button
                      onClick={() => setNuevaDirForm(p => ({ ...p, guardar: !p.guardar }))}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        nuevaDirForm.guardar ? "bg-orange-500 border-orange-500" : "border-gray-300"
                      }`}>
                        {nuevaDirForm.guardar && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      Guardar esta dirección en mi cuenta
                    </button>
                  </div>
                )}

                {/* Info de entrega a domicilio */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    El costo de envío varía según la tienda y tu ubicación. El vendedor confirmará el costo final al aceptar tu pedido.
                  </p>
                </div>
              </div>
            )}

            {/* Info para retiro en tienda / oficina fénix */}
            {tipoEntrega === "tienda" && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">Retiro en tienda</p>
                <p className="text-xs text-blue-700">
                  El vendedor te contactará por teléfono para coordinar la entrega. Asegúrate de que tu número esté actualizado en tu perfil.
                </p>
              </div>
            )}
            {tipoEntrega === "oficina_fenix" && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-orange-800 mb-1">Oficina Mercado Fénix</p>
                <p className="text-xs text-orange-700">
                  Tu pedido llegará a nuestra oficina y te notificaremos cuando esté listo para recoger. Dirección: Col. Palmira, Tegucigalpa.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            PASO 2 — MÉTODO DE PAGO
        ══════════════════════════════════════════ */}
        {paso === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="font-black text-gray-900 text-base sm:text-lg">¿Cómo vas a pagar?</h2>

            <div className="space-y-3">
              {PAGO_OPCIONES.map((op) => {
                const Icon = op.icon;
                const activa = metodoPago === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => setMetodoPago(op.id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                      activa ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        activa ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold ${activa ? "text-orange-700" : "text-gray-900"}`}>
                          {op.titulo}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{op.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        activa ? "border-orange-500" : "border-gray-300"
                      }`}>
                        {activa && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                      </div>
                    </div>

                    {/* Detalle expandible */}
                    {activa && op.id === "transferencia" && (
                      <div className="mt-4 pt-4 border-t border-orange-200 space-y-2">
                        <p className="text-xs font-semibold text-orange-700 mb-2">Datos bancarios del vendedor:</p>
                        <div className="bg-white rounded-xl p-3 text-xs text-gray-700 space-y-1">
                          <p>• El vendedor te enviará sus datos de cuenta al confirmar el pedido.</p>
                          <p>• Deberás enviar tu comprobante de pago por WhatsApp o mensaje.</p>
                          <p>• Tu pedido se confirmará al verificar el pago.</p>
                        </div>
                      </div>
                    )}
                    {activa && op.id === "efectivo" && (
                      <div className="mt-4 pt-4 border-t border-orange-200">
                        <div className="bg-white rounded-xl p-3 text-xs text-gray-700 space-y-1">
                          <p>• Prepara el monto exacto: <span className="font-bold text-orange-600">L{total.toFixed(2)}</span></p>
                          <p>• El pago se realiza al momento de recibir tu pedido.</p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Próximamente tarjetas */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-500 text-sm">Tarjeta de crédito / débito</p>
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">Próximamente</span>
                </div>
              </div>
            </div>

            {/* Nota del cliente */}
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Nota para el vendedor <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Instrucciones especiales, horarios de entrega preferidos..."
                value={notaCliente}
                onChange={(e) => setNotaCliente(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-2xl px-4 py-3 text-sm outline-none resize-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            PASO 3 — RESUMEN Y CONFIRMAR
        ══════════════════════════════════════════ */}
        {paso === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-black text-gray-900 text-base sm:text-lg">Revisa tu pedido</h2>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <p className="font-bold text-sm text-gray-900">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 items-center">
                    {/* Miniatura con URL normalizada + fallback si falla la carga */}
                    <ProductoThumb src={imgUrl(item.imagen_principal)} alt={item.nombre_producto} size={52} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.nombre_producto}</p>
                      <p className="text-xs text-gray-500">
                        x{item.cantidad}
                        {item.color && ` · ${item.color}`}
                        {item.talla && ` · Talla ${item.talla}`}
                      </p>
                    </div>
                    <p className="font-black text-orange-600 text-sm flex-shrink-0">
                      L{(item.precio_unitario * item.cantidad).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detalles del pedido */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {/* Entrega */}
              <div className="p-4 flex items-start gap-3">
                {tipoEntrega === "domicilio" ? <Truck className="w-4 h-4 text-gray-400 mt-0.5" /> : tipoEntrega === "tienda" ? <Store className="w-4 h-4 text-gray-400 mt-0.5" /> : <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Entrega</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {tipoEntrega === "domicilio" ? "A domicilio" : tipoEntrega === "tienda" ? "Retiro en tienda" : "Oficina Mercado Fénix"}
                  </p>
                  {tipoEntrega === "domicilio" && (() => {
                    const dir = direcciones.find(d => d.id === direccionSeleccionada);
                    return dir ? (
                      <p className="text-xs text-gray-500 truncate">{dir.nombre_direccion} — {dir.municipio}, {dir.departamento}</p>
                    ) : nuevaDirForm.direccion_exacta ? (
                      <p className="text-xs text-gray-500 truncate">{nuevaDirForm.municipio}, {nuevaDirForm.departamento}</p>
                    ) : null;
                  })()}
                </div>
              </div>
              {/* Pago */}
              <div className="p-4 flex items-center gap-3">
                <Banknote className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Método de pago</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{metodoPago}</p>
                </div>
              </div>
              {/* Nota */}
              {notaCliente && (
                <div className="p-4 flex items-start gap-3">
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Nota al vendedor</p>
                    <p className="text-sm text-gray-700">{notaCliente}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Desglose de costos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">L{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Costo de envío</span>
                <span className={costoEnvio === 0 ? "text-emerald-600 font-semibold" : "font-semibold"}>
                  {costoEnvio === 0 ? "Gratis" : `L${costoEnvio.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-xl text-orange-600">L{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        </div>{/* fin LEFT COLUMN */}

        {/* ── RIGHT COLUMN: resumen del pedido (solo desktop) ─────────────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">

            {/* Resumen de productos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <p className="font-bold text-sm text-gray-900">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </p>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 px-5 py-3 items-center">
                    <ProductoThumb src={imgUrl(item.imagen_principal)} alt={item.nombre_producto} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.nombre_producto}</p>
                      <p className="text-xs text-gray-500">
                        x{item.cantidad}
                        {item.color && ` · ${item.color}`}
                        {item.talla && ` · T. ${item.talla}`}
                      </p>
                    </div>
                    <p className="font-bold text-orange-600 text-sm flex-shrink-0">
                      L{(item.precio_unitario * item.cantidad).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose de costos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">L{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío</span>
                <span className={costoEnvio === 0 ? "text-emerald-600 font-semibold" : "font-semibold"}>
                  {costoEnvio === 0 ? "Gratis" : `L${costoEnvio.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-2xl text-orange-600">L{total.toFixed(2)}</span>
              </div>
            </div>

            {/* CTA desktop */}
            {paso < 3 ? (
              <button
                onClick={() => setPaso((paso + 1) as 1 | 2 | 3)}
                disabled={paso === 1 ? !paso1Valido : paso === 2 ? !paso2Valido : false}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={crearPedido}
                disabled={procesando}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {procesando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    Confirmar pedido
                  </>
                )}
              </button>
            )}

            {/* Info del cliente */}
            {cliente && (
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Comprando como</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{cliente.nombres} {cliente.apellidos}</p>
                </div>
              </div>
            )}

          </div>
        </div>{/* fin RIGHT COLUMN */}

      </div>{/* fin grid */}
      </div>{/* fin mf-container */}

      {/* ── BARRA INFERIOR FIJA — solo móvil ────────────────────────────────────── */}
      {/*
        FIX: antes esta barra usaba "bottom-0", exactamente la misma posición
        que el MobileNav global (Hogar/Tiendas/Productos/Favoritos/Ya), así que
        el nav quedaba pintado encima y tapaba el botón.

        "bottom-16" la sube 64px (altura típica de una bottom-nav de 5 íconos).
        Si tu MobileNav mide distinto, ajusta este valor para que calce exacto
        justo arriba del nav — lo ideal es que ambos compartan una sola
        constante de altura en el proyecto para no tener que sincronizarlo a mano.
      */}
      <div
        className="fixed bottom-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mf-container py-3.5">
          {paso < 3 ? (
            <button
              onClick={() => setPaso((paso + 1) as 1 | 2 | 3)}
              disabled={paso === 1 ? !paso1Valido : paso === 2 ? !paso2Valido : false}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-orange-900/10"
            >
              Continuar
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={crearPedido}
              disabled={procesando}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10 transition-all active:scale-[0.98]"
            >
              {procesando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  Confirmar pedido — L{total.toFixed(2)}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}