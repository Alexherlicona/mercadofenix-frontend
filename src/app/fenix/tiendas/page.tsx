// src/app/fenix/tiendas/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Store, Star, Filter, Package, X } from "lucide-react";
import MobileNav from "@/components/ui/MobileNav";
import CartIcon from "@/components/ui/CartIcon";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Tienda {
  slug: string;          // identificador público (nombre-municipio)
  logo_url?: string;
  nombre_tienda: string;
  departamento?: string;
  ciudad?: string;
  tipo_pago?: string[];
  tipo_entrega?: string[];
  rating: number;
  num_productos: number;
}

const DEPARTAMENTOS = [
  "Atlántida", "Colón", "Comayagua", "Copán", "Cortés", "Choluteca",
  "El Paraíso", "Francisco Morazán", "Gracias a Dios", "Intibucá",
  "Islas de la Bahía", "La Paz", "Lempira", "Ocotepeque", "Olancho",
  "Santa Bárbara", "Valle", "Yoro",
];

export default function TiendasPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltros, setShowFiltros] = useState(false);

  const [filtroDepartamento, setFiltroDepartamento] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [filtroEntrega, setFiltroEntrega] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/tiendas`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTiendas(Array.isArray(data) ? data : data.tiendas || []);
      } catch {
        setTiendas([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const tiendasFiltradas = useMemo(() => {
    return tiendas.filter((tienda) => {
      const matchDep = filtroDepartamento
        ? (tienda.departamento || "").toLowerCase() === filtroDepartamento.toLowerCase()
        : true;

      const pagos = Array.isArray(tienda.tipo_pago) ? tienda.tipo_pago : [];
      const matchPago = filtroPago ? pagos.includes(filtroPago) : true;

      // ✅ BUG corregido: el filtro de entrega ahora usa tipo_entrega, no tipo_pago
      const entregas = Array.isArray(tienda.tipo_entrega) ? tienda.tipo_entrega : [];
      const matchEntrega = filtroEntrega ? entregas.includes(filtroEntrega) : true;

      return matchDep && matchPago && matchEntrega;
    });
  }, [tiendas, filtroDepartamento, filtroPago, filtroEntrega]);

  const getIniciales = (nombre: string) => {
    if (!nombre) return "T";
    return nombre.trim().split(" ").map(p => p[0]?.toUpperCase() || "").slice(0, 2).join("");
  };

  const numFiltrosActivos =
    Number(!!filtroDepartamento) + Number(!!filtroPago) + Number(!!filtroEntrega);

  const limpiarFiltros = () => {
    setFiltroDepartamento("");
    setFiltroPago("");
    setFiltroEntrega("");
  };

  if (loading) {
    return (
      <div className="mf-body-pad min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl font-bold text-orange-600 animate-pulse">Cargando tiendas...</div>
      </div>
    );
  }

  return (
    <div className="mf-body-pad min-h-screen bg-gray-50 pb-10">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100">
        <div className="mf-container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Link href="/fenix/productos" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>
              <h1 className="text-xl font-black text-gray-900">Tiendas</h1>
              <span className="text-sm text-gray-400">({tiendasFiltradas.length})</span>
              <div className="flex items-center px-3 py-2 bg-orange-100 rounded-xl hover:bg-orange-200 transition cursor-pointer flex-shrink-0">
                <Link href="/fenix/carrito"
                   >
                  <CartIcon />
                </Link>
              </div>
            </div>

            <button
              onClick={() => setShowFiltros(!showFiltros)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                showFiltros || numFiltrosActivos > 0
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {numFiltrosActivos > 0 && (
                <span className="bg-white text-orange-600 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {numFiltrosActivos}
                </span>
              )}
            </button>
          </div>

          {/* Panel de filtros */}
          {showFiltros && (
            <div className="pb-4 border-t border-gray-100 pt-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={filtroDepartamento}
                  onChange={(e) => setFiltroDepartamento(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm border-2 border-gray-200 focus:border-orange-400 outline-none transition-colors"
                >
                  <option value="">Todos los departamentos</option>
                  {DEPARTAMENTOS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </select>

                <select
                  value={filtroPago}
                  onChange={(e) => setFiltroPago(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm border-2 border-gray-200 focus:border-orange-400 outline-none transition-colors"
                >
                  <option value="">Cualquier pago</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </select>

                <select
                  value={filtroEntrega}
                  onChange={(e) => setFiltroEntrega(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 rounded-xl text-sm border-2 border-gray-200 focus:border-orange-400 outline-none transition-colors"
                >
                  <option value="">Cualquier entrega</option>
                  <option value="domicilio">A domicilio</option>
                  <option value="tienda">En tienda</option>
                </select>
              </div>

              {numFiltrosActivos > 0 && (
                <button
                  onClick={limpiarFiltros}
                  className="mt-3 inline-flex items-center gap-1 text-orange-600 font-bold text-sm hover:text-orange-700"
                >
                  <X className="w-4 h-4" /> Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lista de tiendas */}
      <div className="mf-container py-5">
        {tiendasFiltradas.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-5">
              <Store className="w-12 h-12 text-orange-300" />
            </div>
            <p className="text-gray-600 font-semibold">
              {numFiltrosActivos > 0
                ? "No hay tiendas que coincidan con los filtros"
                : "No hay tiendas disponibles aún"}
            </p>
            {numFiltrosActivos > 0 && (
              <button onClick={limpiarFiltros} className="mt-4 text-orange-600 font-bold text-sm">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiendasFiltradas.map((tienda) => (
              // ✅ URL usa el dni (id) — identificador único, sin colisiones de nombre
              <Link
                key={tienda.slug}
                href={`/fenix/tiendas/${tienda.slug}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4 hover:shadow-lg hover:border-orange-200 transition-all"
              >
                {/* Logo */}
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 flex-shrink-0 flex items-center justify-center text-white text-xl font-black shadow">
                  {tienda.logo_url ? (
                    <Image
                      src={tienda.logo_url?.startsWith("http") ? tienda.logo_url: `${API_URL}${tienda.logo_url}`}
                      alt={tienda.nombre_tienda}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getIniciales(tienda.nombre_tienda)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate text-gray-900">{tienda.nombre_tienda}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <span className="truncate">
                      {tienda.ciudad && `${tienda.ciudad}, `}{tienda.departamento}
                    </span>
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold">{tienda.num_productos}</span>
                      <span className="text-gray-400">productos</span>
                    </span>
                    {tienda.rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                        <span className="font-bold">{tienda.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
     
    </div>
  );
}