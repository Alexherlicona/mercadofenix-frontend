// src/app/fenix/carrito/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ArrowLeft, Package, ShoppingBag, Loader2, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper centralizado — siempre incluye token si existe
function cartFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  return fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
}

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

// Info de stock real obtenida del backend (models/producto.py: stock = Column(Integer, default=1))
interface StockInfo {
  stock: number | null;   // null = digital / ilimitado
  ilimitado: boolean;
  activo: boolean;
  agotado: boolean;
}

export default function CarritoPage() {
  const router = useRouter();
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [eliminandoItems, setEliminandoItems] = useState<Set<number>>(new Set());
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);
  // Mapa producto_id -> stock real, traído del backend al cargar el carrito
  const [stockMap, setStockMap] = useState<Record<string, StockInfo>>({});
  // true si /api/public/productos/stock-batch falló (404, 500, red) — se muestra aviso
  // y por seguridad se limita la cantidad máxima a 1 mientras no se pueda verificar.
  const [stockError, setStockError] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0),
    [items]
  );
  const totalProductos = useMemo(
    () => items.reduce((sum, i) => sum + i.cantidad, 0),
    [items]
  );

  const cargarCarrito = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cartFetch("/api/carrito/mi-carrito");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const itemsCargados: CarritoItem[] = data.items || [];
      setItems(itemsCargados);
      await cargarStockReal(itemsCargados);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Trae el stock REAL desde el backend (models/producto.py → Producto.stock)
  //    usando el endpoint batch, en vez de confiar en cualquier valor de stock
  //    que pudiera venir cacheado en el item del carrito. Esto es lo que permite
  //    bloquear correctamente el botón "+" cuando ya no hay más unidades. ──
  const cargarStockReal = useCallback(async (itemsActuales: CarritoItem[]) => {
    const ids = [...new Set(itemsActuales.map(i => i.producto_id))];
    if (ids.length === 0) return;
    try {
      const res = await cartFetch("/api/public/productos/stock-batch", {
        method: "POST",
        body: JSON.stringify(ids),
      });
      if (!res.ok) {
        // Visible en consola para diagnosticar rápido si el endpoint no está montado
        // (404), si dio error de servidor (500), etc. — antes esto fallaba en silencio
        // y el carrito se quedaba sin límite de stock para siempre.
        console.error(`[Carrito] /api/public/productos/stock-batch respondió ${res.status}. Verifica el patch en routes/public.py.`);
        setStockError(true);
        return;
      }
      const data: Record<string, StockInfo> = await res.json();
      setStockMap(data);
      setStockError(false);
    } catch (err) {
      console.error("[Carrito] Error de red al consultar stock-batch:", err);
      setStockError(true);
    }
  }, []);

  useEffect(() => { cargarCarrito(); }, [cargarCarrito]);

  // También refrescar si el usuario acaba de iniciar sesión en esta pestaña
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "access_token") cargarCarrito();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [cargarCarrito]);

  // Devuelve el stock disponible para un item del carrito.
  // null = digital/ilimitado (sin tope) O aún cargando (primeros instantes).
  // number = unidades reales confirmadas por el backend.
  const stockDisponible = (item: CarritoItem): number | null => {
    const info = stockMap[item.producto_id];
    if (info) {
      if (info.ilimitado) return null;
      return info.stock ?? 0;
    }
    // No hay info todavía: si ya sabemos que la consulta FALLÓ (stockError),
    // somos conservadores (máximo 1) en vez de permitir incrementar sin límite.
    // Si aún está en camino (ni llegó ni falló), no bloqueamos por un instante.
    return stockError ? item.cantidad : null;
  };

  const puedeIncrementar = (item: CarritoItem): boolean => {
    if (stockError && !stockMap[item.producto_id]) return false; // conservador ante fallo confirmado
    const max = stockDisponible(item);
    if (max === null) return true; // ilimitado o aún verificando
    return item.cantidad < max;
  };

  const actualizarCantidad = async (id: number, nuevaCantidad: number) => {
    if (updatingItems.has(id)) return;
    if (nuevaCantidad < 1) return;

    const item = items.find(i => i.id === id);
    if (item) {
      const max = stockDisponible(item);
      // Tope duro: nunca permitir más cantidad que el stock real disponible
      if (max !== null && nuevaCantidad > max) {
        nuevaCantidad = max;
        if (nuevaCantidad === item.cantidad) return; // ya está en el máximo, no hacer nada
      }
    }

    // Optimista: actualiza UI de inmediato
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: nuevaCantidad } : i));
    setUpdatingItems(prev => new Set(prev).add(id));

    try {
      const res = await cartFetch(`/api/carrito/update/${id}`, {
        method: "PUT",
        body: JSON.stringify({ cantidad: nuevaCantidad }),
      });
      if (!res.ok) await cargarCarrito(); // revertir si falla
    } catch {
      await cargarCarrito();
    } finally {
      setUpdatingItems(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const eliminar = async (id: number) => {
    setConfirmEliminar(null);
    setEliminandoItems(prev => new Set(prev).add(id));
    setItems(prev => prev.filter(i => i.id !== id)); // optimista

    try {
      await cartFetch(`/api/carrito/remove/${id}`, { method: "DELETE" });
    } catch {
      await cargarCarrito();
    } finally {
      setEliminandoItems(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  // ─── LOADING ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-orange-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-bold">Cargando tu carrito...</p>
        </div>
      </div>
    );
  }

  // ─── VACÍO ──────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50">
        <div className="mf-container py-6">
          <Link href="/fenix/productos" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Seguir comprando</span>
          </Link>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-28 h-28 rounded-full bg-orange-50 flex items-center justify-center mb-6">
              <Package className="w-14 h-14 text-orange-300" />
            </div>
            <h1 className="text-3xl font-black text-gray-800 mb-3">Tu carrito está vacío</h1>
            <p className="text-gray-500 mb-8 max-w-xs">Explora nuestros productos y agrega lo que más te guste</p>
            <Link href="/fenix/productos"
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95">
              Ver productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── CON ITEMS ───────────────────────────────────────────────────────────────
  return (
    <div className="mf-body-pad min-h-screen bg-gray-50 pb-40 lg:pb-10">

      {/* Header sticky */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mf-container">
          <div className="flex items-center gap-3 py-4">
            <Link href="/fenix" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="font-black text-xl flex-1 text-gray-900">Mi Carrito</h1>
            <span className="bg-orange-100 text-orange-700 text-sm font-bold px-3 py-1 rounded-full">
              {totalProductos} {totalProductos === 1 ? "producto" : "productos"}
            </span>
          </div>
        </div>
      </div>

      {/* Aviso visible si no se pudo verificar el stock real */}
      {stockError && (
        <div className="mf-container pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <Package className="w-4 h-4 flex-shrink-0" />
            No se pudo verificar el stock disponible en este momento. Por seguridad limitamos la cantidad a 1 por producto hasta confirmar.
          </div>
        </div>
      )}

      {/* Contenido — móvil: columna única apilada (igual que siempre).
          Desktop: grid de 2 columnas estilo Amazon/MercadoLibre — lista a la
          izquierda, resumen de compra fijo (sticky) a la derecha. */}
      <div className="mf-container py-5 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">

      {/* Lista */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4 transition-opacity ${
              eliminandoItems.has(item.id) ? "opacity-40 pointer-events-none" : ""
            }`}>

            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={item.imagen_principal ? `${API_URL}${item.imagen_principal}` : "/placeholder.jpg"}
                alt={item.nombre_producto} width={96} height={96} unoptimized
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg"; }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{item.nombre_producto}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{item.nombre_tienda}</p>

              {(item.color || item.talla) && (
                <div className="flex gap-2 mt-1 flex-wrap">
                  {item.color && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{item.color}</span>}
                  {item.talla && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Talla {item.talla}</span>}
                </div>
              )}

              {/* Aviso de stock — solo si ya se cargó el stock real y quedan pocas unidades o ninguna */}
              {(() => {
                const max = stockDisponible(item);
                if (max === null) return null;
                if (max === 0) {
                  return (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Sin stock disponible — elimínalo o ajusta la cantidad
                    </p>
                  );
                }
                if (item.cantidad >= max) {
                  return (
                    <p className="text-xs text-amber-600 font-semibold mt-1">
                      Máximo disponible: {max} unidad{max !== 1 ? "es" : ""}
                    </p>
                  );
                }
                return null;
              })()}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                    disabled={updatingItems.has(item.id) || item.cantidad <= 1}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 transition-colors">
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-8 text-center font-black text-base">
                    {updatingItems.has(item.id)
                      ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-orange-500" />
                      : item.cantidad}
                  </span>

                  <button
                    onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                    disabled={updatingItems.has(item.id) || !puedeIncrementar(item)}
                    title={!puedeIncrementar(item) ? "No hay más stock disponible" : undefined}
                    className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button onClick={() => setConfirmEliminar(item.id)}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-right flex-shrink-0 flex flex-col justify-center">
              <span className="font-black text-orange-600 text-base">
                L{(item.precio_unitario * item.cantidad).toFixed(2)}
              </span>
              {item.cantidad > 1 && (
                <span className="text-xs text-gray-400 mt-0.5">c/u L{item.precio_unitario.toFixed(2)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* ↑ cierra columna de lista (.space-y-3) */}

      {/* ── Resumen de compra ──────────────────────────────────────────────
          Móvil: barra fija al fondo de toda la pantalla (igual que siempre).
          Desktop: tarjeta normal dentro de la segunda columna del grid,
          con "sticky" para que se quede visible al hacer scroll por la lista. ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl
        lg:static lg:border lg:border-gray-100 lg:rounded-2xl lg:shadow-sm lg:sticky lg:top-20 lg:mt-0">
        <div className="px-4 py-4 mx-auto max-w-[var(--content-max-width)] lg:max-w-none lg:px-5 lg:py-5">
          <h2 className="hidden lg:block font-black text-lg text-gray-900 mb-4">Resumen de compra</h2>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-500">Subtotal ({totalProductos} productos)</span>
            <span className="text-sm font-semibold text-gray-700">L{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-4 lg:pb-4 lg:border-b lg:border-gray-100">
            <span className="text-base font-bold text-gray-900">Total a pagar</span>
            <span className="text-2xl font-black text-orange-600">L{total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => router.push("/fenix/carrito/checkout")}
            disabled={items.length === 0}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
            <ShoppingBag className="w-6 h-6" />
            Proceder al Pago — L{total.toFixed(2)}
          </button>
          <Link href="/fenix/productos"
            className="hidden lg:flex items-center justify-center gap-2 mt-3 text-sm text-gray-500 hover:text-orange-600 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Seguir comprando
          </Link>
        </div>
      </div>
      </div>
      {/* ↑ cierra grid de 2 columnas (lista + resumen) */}

      {/* Modal confirmar eliminar */}
      {confirmEliminar !== null && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
          onClick={() => setConfirmEliminar(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-black text-xl text-gray-900">¿Eliminar producto?</h3>
              <button onClick={() => setConfirmEliminar(null)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              <span className="font-semibold">
                {items.find(i => i.id === confirmEliminar)?.nombre_producto}
              </span> será eliminado de tu carrito.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminar(null)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmEliminar)}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}