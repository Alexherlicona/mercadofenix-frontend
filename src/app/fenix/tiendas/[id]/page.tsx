// src/app/fenix/tiendas/[id]/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Store, Package, Phone, Truck, Banknote,
  CreditCard, Search, Loader2, ShoppingBag, Eye
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TiendaInfo {
  slug: string;
  nombre_tienda: string;
  propietario: string;
  logo_url: string | null;
  departamento: string;
  municipio: string;
  direccion_exacta: string;
  telefono: string;
  tipo_pago: string[];
  tipo_entrega: string[];
  visitas_totales: number;
  num_productos: number;
}

export default function TiendaIndividualPage() {
  const params = useParams();
  const slug = params?.id as string;  // la carpeta es [id] pero contiene el slug

  const [tienda, setTienda] = useState<TiendaInfo | null>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/tienda/${slug}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTienda(data.tienda);
        setProductos(data.productos || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (slug) cargar();
  }, [slug]);

  // Categorías únicas de los productos
  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach(p => p.categoria && set.add(p.categoria));
    return ["todas", ...Array.from(set)];
  }, [productos]);

  // Productos filtrados por búsqueda y categoría
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchCategoria = categoriaActiva === "todas" || p.categoria === categoriaActiva;
      const matchBusqueda = busqueda
        ? p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        : true;
      return matchCategoria && matchBusqueda;
    });
  }, [productos, busqueda, categoriaActiva]);

  const getIniciales = (nombre: string) => {
    if (!nombre) return "T";
    return nombre.trim().split(" ").map(p => p[0]?.toUpperCase() || "").slice(0, 2).join("");
  };

  // ─── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-orange-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-bold">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  // ─── ERROR / NO EXISTE ───────────────────────────────────────────────────────
  if (error || !tienda) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50">
        <div className="mf-container py-6">
          <Link href="/fenix/tiendas" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver a tiendas</span>
          </Link>
          <div className="text-center py-24">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-gray-800 mb-2">Tienda no encontrada</h1>
            <p className="text-gray-500">Esta tienda no existe o ya no está disponible.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── TIENDA ──────────────────────────────────────────────────────────────────
  return (
    <div className="mf-body-pad min-h-screen bg-gray-50 pb-10">

      {/* Botón volver */}
      <div className="mf-container pt-4">
        <Link href="/fenix/tiendas" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Todas las tiendas</span>
        </Link>
      </div>

      {/* ── BANNER DE LA TIENDA ── */}
      <div className="mf-container pt-4">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl p-6 md:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Logo */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-white/20 border-4 border-white/40 flex-shrink-0 flex items-center justify-center text-white text-3xl font-black shadow-xl">
              {tienda.logo_url ? (
                <Image
                  src={tienda.logo_url?.startsWith("http") ? tienda.logo_url: `${API_URL}${tienda.logo_url}`}
                  alt={tienda.nombre_tienda}
                  width={112}
                  height={112}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getIniciales(tienda.nombre_tienda)}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-white">{tienda.nombre_tienda}</h1>
              <p className="text-orange-100 text-sm mt-0.5">{tienda.propietario}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-3 text-sm text-orange-50">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {tienda.municipio}, {tienda.departamento}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {tienda.num_productos} productos
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {tienda.visitas_totales} visitas
                </span>
              </div>

              {/* Chips de pago y entrega */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {(Array.isArray(tienda.tipo_entrega) ? tienda.tipo_entrega : []).map(t => (
                  <span key={t} className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    <Truck className="w-3 h-3" />
                    {t === "domicilio" ? "A domicilio" : t === "tienda" ? "En tienda" : t}
                  </span>
                ))}
                {(Array.isArray(tienda.tipo_pago) ? tienda.tipo_pago : []).map(p => (
                  <span key={p} className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {p === "efectivo" ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                    {p === "efectivo" ? "Efectivo" : p === "transferencia" ? "Transferencia" : p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BÚSQUEDA Y CATEGORÍAS ── */}
      <div className="mf-container pt-5">
        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Buscar en ${tienda.nombre_tienda}...`}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border-2 border-gray-200 focus:border-orange-400 outline-none text-sm transition-colors"
          />
        </div>

        {/* Filtro de categorías */}
        {categorias.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                  categoriaActiva === cat
                    ? "bg-orange-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
                }`}
              >
                {cat === "todas" ? "Todos" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── GRID DE PRODUCTOS ── */}
      <div className="mf-container pt-2">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-orange-300" />
            </div>
            <p className="text-gray-600 font-semibold">
              {busqueda || categoriaActiva !== "todas"
                ? "No hay productos que coincidan"
                : "Esta tienda aún no tiene productos"}
            </p>
          </div>
        ) : (
          <div className="mf-product-grid">
            {productosFiltrados.map(producto => (
              <ProductCard
                key={producto.id}
                producto={producto}
                oferta={!!producto.precio_oferta}
                nuevo={producto.es_nuevo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}