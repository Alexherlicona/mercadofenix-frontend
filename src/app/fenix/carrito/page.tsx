// src/app/fenix/carrito/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ArrowLeft, Package, ShoppingBag, Loader2, X, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function cartFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  return fetch(`${API_URL}${path}`, { credentials: "include", ...options, headers });
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

interface StockInfo {
  stock: number | null;
  ilimitado: boolean;
  activo: boolean;
  agotado: boolean;
}

// Helper URL imagen
function resolveImg(url: string | null): string {
  if (!url) return "/placeholder.jpg";
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function CarritoPage() {
  const router = useRouter();
  const [items,           setItems]           = useState<CarritoItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [updatingItems,   setUpdatingItems]   = useState<Set<number>>(new Set());
  const [eliminandoItems, setEliminandoItems] = useState<Set<number>>(new Set());
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);
  const [stockMap,        setStockMap]        = useState<Record<string, StockInfo>>({});
  const [stockError,      setStockError]      = useState(false);

  const total = useMemo(
    () => items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),
    [items]
  );
  const totalProductos = useMemo(
    () => items.reduce((s, i) => s + i.cantidad, 0),
    [items]
  );

  const cargarStockReal = useCallback(async (itemsActuales: CarritoItem[]) => {
    const ids = [...new Set(itemsActuales.map(i => i.producto_id))];
    if (!ids.length) return;
    try {
      const res = await cartFetch("/api/public/productos/stock-batch", {
        method: "POST",
        body: JSON.stringify(ids),
      });
      if (!res.ok) { setStockError(true); return; }
      setStockMap(await res.json());
      setStockError(false);
    } catch { setStockError(true); }
  }, []);

  const cargarCarrito = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cartFetch("/api/carrito/mi-carrito");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cargados: CarritoItem[] = data.items || [];
      setItems(cargados);
      await cargarStockReal(cargados);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [cargarStockReal]);

  useEffect(() => { cargarCarrito(); }, [cargarCarrito]);
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === "access_token") cargarCarrito(); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, [cargarCarrito]);

  const stockDisponible = (item: CarritoItem): number | null => {
    const info = stockMap[item.producto_id];
    if (info) return info.ilimitado ? null : (info.stock ?? 0);
    return stockError ? item.cantidad : null;
  };

  const puedeIncrementar = (item: CarritoItem) => {
    if (stockError && !stockMap[item.producto_id]) return false;
    const max = stockDisponible(item);
    return max === null ? true : item.cantidad < max;
  };

  const actualizarCantidad = async (id: number, nuevaCantidad: number) => {
    if (updatingItems.has(id) || nuevaCantidad < 1) return;
    const item = items.find(i => i.id === id);
    if (item) {
      const max = stockDisponible(item);
      if (max !== null && nuevaCantidad > max) {
        nuevaCantidad = max;
        if (nuevaCantidad === item.cantidad) return;
      }
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: nuevaCantidad } : i));
    setUpdatingItems(prev => new Set(prev).add(id));
    try {
      const res = await cartFetch(`/api/carrito/update/${id}`, {
        method: "PUT", body: JSON.stringify({ cantidad: nuevaCantidad }),
      });
      if (!res.ok) await cargarCarrito();
    } catch { await cargarCarrito(); }
    finally { setUpdatingItems(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  };

  const eliminar = async (id: number) => {
    setConfirmEliminar(null);
    setEliminandoItems(prev => new Set(prev).add(id));
    setItems(prev => prev.filter(i => i.id !== id));
    try { await cartFetch(`/api/carrito/remove/${id}`, { method: "DELETE" }); }
    catch { await cargarCarrito(); }
    finally { setEliminandoItems(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  };

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="mf-body-pad min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-orange-600">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="font-bold text-gray-600">Cargando tu carrito...</p>
      </div>
    </div>
  );

  // ── VACÍO ────────────────────────────────────────────────────────────────────
  if (items.length === 0) return (
    <div className="mf-body-pad min-h-screen bg-gray-50">
      <div className="mf-container py-6">
        <Link href="/fenix/productos"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium">Seguir comprando</span>
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

  // ── CON ITEMS ────────────────────────────────────────────────────────────────
  return (
    // pb-[160px] móvil: espacio para pastilla flotante + MobileNav (≈64px + 72px + margen)
    // lg:pb-10: en desktop no hay MobileNav ni barra flotante, el resumen va en sidebar
    <div className="mf-body-pad min-h-screen bg-gray-50 pb-[160px] lg:pb-10">

      {/* Header sticky */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mf-container">
          <div className="flex items-center gap-3 py-4">
            <Link href="/fenix"
              className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="font-black text-xl flex-1 text-gray-900">Mi Carrito</h1>
            <span className="bg-orange-100 text-orange-700 text-sm font-bold px-3 py-1 rounded-full">
              {totalProductos} {totalProductos === 1 ? "producto" : "productos"}
            </span>
          </div>
        </div>
      </div>

      {/* Aviso stock */}
      {stockError && (
        <div className="mf-container pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <Package className="w-4 h-4 flex-shrink-0" />
            No se pudo verificar el stock. La cantidad está limitada temporalmente.
          </div>
        </div>
      )}

      {/* ── Grid desktop: lista | sidebar ──────────────────────────────────── */}
      <div className="mf-container py-5 lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start">

        {/* ── Lista de items ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {items.map(item => {
            const max        = stockDisponible(item);
            const sinStock   = max !== null && max === 0;
            const enLimite   = max !== null && max > 0 && item.cantidad >= max;

            return (
              <div key={item.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex gap-3 transition-opacity
                  ${eliminandoItems.has(item.id) ? "opacity-40 pointer-events-none" : ""}`}>

                {/* Imagen */}
                <div className="w-[72px] h-[72px] lg:w-20 lg:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={resolveImg(item.imagen_principal)}
                    alt={item.nombre_producto}
                    width={80} height={80} unoptimized
                    className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg"; }}
                  />
                </div>

                {/* Info + controles */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                      {item.nombre_producto}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.nombre_tienda}</p>
                    {(item.color || item.talla) && (
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {item.color && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">{item.color}</span>}
                        {item.talla && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">T. {item.talla}</span>}
                      </div>
                    )}
                    {sinStock  && <p className="text-[10px] text-red-500 font-semibold mt-1">Sin stock — elimínalo</p>}
                    {enLimite  && !sinStock && <p className="text-[10px] text-amber-600 font-semibold mt-1">Máx. disponible: {max}</p>}
                  </div>

                  {/* Controles cantidad + eliminar */}
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                        disabled={updatingItems.has(item.id) || item.cantidad <= 1}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-black text-sm">
                        {updatingItems.has(item.id)
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-orange-500" />
                          : item.cantidad}
                      </span>
                      <button
                        onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                        disabled={updatingItems.has(item.id) || !puedeIncrementar(item)}
                        className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => setConfirmEliminar(item.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Precio */}
                <div className="flex-shrink-0 flex flex-col items-end justify-between pl-1">
                  <span className="font-black text-orange-600 text-base">
                    L{(item.precio_unitario * item.cantidad).toFixed(2)}
                  </span>
                  {item.cantidad > 1 && (
                    <span className="text-[10px] text-gray-400">c/u L{item.precio_unitario.toFixed(2)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Sidebar resumen — SOLO DESKTOP ──────────────────────────────── */}
        <div className="hidden lg:block sticky top-20">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-black text-lg text-gray-900">Resumen</h2>

            {/* Items mini */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm gap-2">
                  <span className="text-gray-600 truncate flex-1">{item.nombre_producto}</span>
                  <span className="font-semibold text-gray-800 flex-shrink-0">
                    x{item.cantidad}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal ({totalProductos} prod.)</span>
                <span className="font-semibold">L{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-black text-2xl text-orange-600">L{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/fenix/carrito/checkout")}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              <ShoppingBag className="w-5 h-5" />
              Proceder al pago
            </button>

            <Link href="/fenix/productos"
              className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-orange-600 font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Seguir comprando
            </Link>
          </div>
        </div>

      </div>{/* fin grid */}

      {/* ── Pastilla flotante MÓVIL — se posiciona encima del MobileNav ─────
          MobileNav tiene aprox 64px de alto + safe-area.
          Usamos bottom-[72px] para quedar justo encima de él con 8px de margen. ── */}
      <div className="lg:hidden fixed bottom-[72px] left-4 right-4 z-40">
        <button
          onClick={() => router.push("/fenix/carrito/checkout")}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700
            text-white rounded-2xl shadow-xl shadow-emerald-900/25 active:scale-[0.98] transition-all
            flex items-center px-5 py-3.5 gap-3">
          <ShoppingBag className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="font-black text-base leading-tight">Proceder al pago</p>
            <p className="text-emerald-100 text-xs">{totalProductos} producto{totalProductos !== 1 ? "s" : ""}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-black text-lg leading-tight">L{total.toFixed(2)}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-300 flex-shrink-0" />
        </button>
      </div>

      {/* Modal confirmar eliminar */}
      {confirmEliminar !== null && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
          onClick={() => setConfirmEliminar(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10"
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
              </span>{" "}será eliminado de tu carrito.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminar(null)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmEliminar)}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}