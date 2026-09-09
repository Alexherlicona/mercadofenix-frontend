// src/components/ui/header.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MoreVertical, X, MapPin, ChevronDown, SlidersHorizontal } from "lucide-react";
import CartIcon from "./CartIcon";

const HONDURAS_LOCATIONS: Record<string, string[]> = {
  "Francisco Morazán": ["Tegucigalpa", "Comayagüela", "Valle de Ángeles", "Santa Lucía", "Ojojona"],
  "Cortés":            ["San Pedro Sula", "Choloma", "La Lima", "Villanueva", "Puerto Cortés"],
  "Atlántida":         ["La Ceiba", "Tela", "El Progreso", "Olanchito"],
  "Comayagua":         ["Comayagua", "Siguatepeque", "La Trinidad"],
  "Choluteca":         ["Choluteca", "El Triunfo", "Marcovia"],
  "Olancho":           ["Juticalpa", "Catacamas", "San Francisco de la Paz"],
  "Santa Bárbara":     ["Santa Bárbara", "Quimistán", "Trinidad"],
  "Yoro":              ["Yoro", "El Progreso", "Sulaco"],
  "Valle":             ["Nacaome", "San Lorenzo", "Goascorán"],
  "El Paraíso":        ["Yuscarán", "Danlí", "El Paraíso"],
  "Gracias a Dios":    ["Puerto Lempira", "Brus Laguna"],
  "Intibucá":          ["La Esperanza", "Intibucá"],
  "La Paz":            ["La Paz", "Marcala"],
  "Lempira":           ["Gracias", "San Marcos de Ocotepeque"],
  "Ocotepeque":        ["Ocotepeque", "Sinuapa"],
  "Copán":             ["Santa Rosa de Copán", "Copán Ruinas", "La Entrada"],
  "Islas de la Bahía": ["Roatán", "Utila", "Guanaja"],
  "Colón":             ["Trujillo", "Tocoa", "Sonaguera"],
};


export default function Header() {
  const pathname = usePathname();
  const NAV_LINKS = [
    { href: "/fenix",           label: "Inicio"     },
    { href: "/fenix/tiendas",   label: "Tiendas"    },
    { href: "/fenix/productos", label: "Productos"  },
    { href: "/fenix/favoritos", label: "Favoritos"  },
    { href: "/fenix/mi-cuenta", label: "Mi cuenta"  },
  ];

  const router = useRouter();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [query, setQuery]             = useState("");
  const [departamento, setDep]        = useState("");
  const [municipio, setMun]           = useState("");

  const municipios = departamento ? (HONDURAS_LOCATIONS[departamento] ?? []) : [];
  const tieneFiltros = !!(departamento || municipio);

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim())  params.set("q",            query.trim());
    if (departamento)  params.set("departamento",  departamento);
    if (municipio)     params.set("municipio",     municipio);
    if ([...params].length) router.push(`/fenix/productos?${params.toString()}`);
    setFiltrosOpen(false);
  }, [query, departamento, municipio, router]);

  return (
    <>
      {/*
        Header compacto en móvil: SOLO la fila esencial (logo, búsqueda, carrito, menú, filtro ubicación).
        En desktop (lg+): se agrega el nombre de marca y la nav horizontal completa.
        Altura real: ~64px móvil, ~64px desktop (una sola fila) — ya no hay fila 2 siempre visible.
      */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white shadow-md">
        <div className="mf-header-inner py-2.5 lg:py-3">

          {/* ── Fila única: Logo · Búsqueda · Ubicación(icono) · Carrito · Menú/Nav ── */}
          <div className="flex items-center gap-1.5 lg:gap-3">

            {/* Logo */}
            <Link href="/fenix" className="flex-shrink-0">
              <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-sm lg:text-lg text-white shadow">
                MF
              </div>
            </Link>

            {/* Nombre — solo desktop */}
            <span className="hidden lg:block font-black text-xl text-orange-600 flex-shrink-0">
              Mercado Fénix
            </span>

            {/* Búsqueda — ocupa el espacio disponible */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Buscar productos..."
                className="w-full pl-9 pr-3 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition"
              />
            </div>

            {/* Botón filtro ubicación — ícono compacto, abre popover */}
            <button
              onClick={() => setFiltrosOpen(v => !v)}
              className={`relative flex-shrink-0 p-2 lg:px-3 lg:py-2 rounded-xl transition flex items-center gap-1.5
                ${tieneFiltros ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              aria-label="Filtrar por ubicación"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden lg:inline text-xs font-semibold">
                {municipio || departamento || "Ubicación"}
              </span>
              {tieneFiltros && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full lg:hidden" />
              )}
            </button>

            {/* Carrito */}
            <Link href="/fenix/carrito" className="flex items-center px-2.5 lg:px-3 py-2 bg-orange-100 rounded-xl hover:bg-orange-200 transition flex-shrink-0">
              <CartIcon />
            </Link>

            {/* Nav desktop — visible solo en lg+, reemplaza al botón hamburguesa visualmente */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-shrink-0 ml-1">
                {NAV_LINKS.map(({ href, label}) => {
                  const isActive = pathname === href;

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition whitespace-nowrap ${
                        isActive ? "text-orange-500 bg-gray-100" : "text-gray-500"
                      }`}
                    >
                      <span className={`${isActive ? "font-bold" : ""}`}>
                        {label}
                      </span>
                    </Link>
                  );
                })}
            </nav>

            {/* Menú hamburguesa — solo móvil/tablet, en desktop el nav ya está visible arriba */}
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition flex-shrink-0"
              aria-label="Abrir menú"
            >
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* ── Popover de filtros de ubicación — oculto por defecto, no ocupa espacio fijo ── */}
          {filtrosOpen && (
            <div className="absolute right-3 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 top-full mt-2 w-[calc(100%-1.5rem)] sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filtrar por ubicación
                </p>
                <button onClick={() => setFiltrosOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="relative">
                  <select
                    value={departamento}
                    onChange={(e) => { setDep(e.target.value); setMun(""); }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:border-orange-500 outline-none text-sm"
                  >
                    <option value="">Todos los departamentos</option>
                    {Object.keys(HONDURAS_LOCATIONS).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <select
                    value={municipio}
                    onChange={(e) => setMun(e.target.value)}
                    disabled={!departamento}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:border-orange-500 outline-none text-sm disabled:opacity-40"
                  >
                    <option value="">Todos los municipios</option>
                    {municipios.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  {tieneFiltros && (
                    <button
                      onClick={() => { setDep(""); setMun(""); }}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition"
                    >
                      Limpiar
                    </button>
                  )}
                  <button
                    onClick={handleSearch}
                    className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition active:scale-[0.98]"
                  >
                    Aplicar filtro
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Backdrop del popover — cierra al tocar fuera */}
      {filtrosOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setFiltrosOpen(false)} />
      )}

      {/* ── Menú lateral móvil ── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Menú</h2>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
              <MenuLink href="/menu/soporte">Soporte técnico</MenuLink>
              <MenuLink href="/menu/sobre-nosotros">Sobre nosotros</MenuLink>
              <MenuLink href="/menu/contacto">Contáctanos</MenuLink>
              <MenuLink href="/menu/reportes">Reportes y quejas</MenuLink>
            </nav>

            <div className="p-5 border-t border-orange-100 bg-gradient-to-t from-orange-50 to-white">
              <p className="text-center text-sm font-bold text-orange-600">Mercado Fénix v1.0</p>
              <p className="text-center text-xs text-gray-400 mt-0.5">Honduras</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MenuLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="block">
      <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-orange-50 transition group">
        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold text-sm group-hover:bg-orange-200 transition">
          {children[0]}
        </div>
        <span className="font-medium text-gray-700 text-sm group-hover:text-orange-600">{children}</span>
      </div>
    </Link>
  );
}