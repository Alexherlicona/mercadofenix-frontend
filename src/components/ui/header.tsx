// src/components/ui/header.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, X, MoreVertical } from "lucide-react";
import CartIcon from "./CartIcon";

const HONDURAS_LOCATIONS: Record<string, string[]> = {
  "Francisco Morazán": ["Tegucigalda", "Comayagüela", "Valle de Ángeles", "Santa Lucía", "Ojojona"],
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

const NAV_LINKS = [
  { href: "/fenix",           label: "Inicio"    },
  { href: "/fenix/tiendas",   label: "Tiendas"   },
  { href: "/fenix/productos", label: "Productos" },
  { href: "/fenix/favoritos", label: "Favoritos" },
  { href: "/fenix/mi-cuenta", label: "Mi cuenta" },
];

export default function Header() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [query,       setQuery]       = useState("");
  const [focused,     setFocused]     = useState(false);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (q) router.push(`/fenix/productos?q=${encodeURIComponent(q)}`);
  }, [query, router]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="mf-header-inner py-2.5 lg:py-3">
          <div className="flex items-center gap-2 lg:gap-4">

            {/* ── Nombre marca — móvil: compacto, desktop: completo ───────── */}
            <Link href="/fenix" className="flex-shrink-0 group">
              <span className="text-lg lg:text-xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent whitespace-nowrap">
                <span className="lg:hidden">MF</span>
                <span className="hidden lg:inline">Mercado Fénix</span>
              </span>
            </Link>

            {/* ── Buscador expandido ───────────────────────────────────────── */}
            <div className={`flex-1 relative transition-all duration-200 ${focused ? "lg:flex-[1.4]" : ""}`}>
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${focused ? "text-orange-500" : "text-gray-400"}`} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Buscar productos, tiendas..."
                className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200
                  ${focused
                    ? "bg-white border-2 border-orange-400 shadow-md shadow-orange-100"
                    : "bg-gray-100 border-2 border-transparent hover:bg-gray-50 hover:border-gray-200"}`}
              />
              {query && (
                <button onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ── Carrito ──────────────────────────────────────────────────── */}
            <Link href="/fenix/carrito"
              className="flex-shrink-0 relative p-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-all hover:shadow-sm active:scale-95">
              <CartIcon />
            </Link>

            {/* ── Nav desktop ──────────────────────────────────────────────── */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname === href ||
                  (href !== "/fenix" && pathname.startsWith(href));
                return (
                  <Link key={href} href={href}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap
                      ${isActive
                        ? "text-orange-600 bg-orange-50 font-bold"
                        : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* ── Hamburguesa móvil ─────────────────────────────────────────── */}
            <button onClick={() => setMenuOpen(true)}
              className="lg:hidden flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 transition active:scale-95"
              aria-label="Abrir menú">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

          </div>
        </div>
      </header>

      {/* ── Menú lateral móvil ───────────────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col">

            {/* Header del menú */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-lg font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Mercado Fénix
              </span>
              <button onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Nav principal */}
            <nav className="p-3 space-y-0.5">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname === href ||
                  (href !== "/fenix" && pathname.startsWith(href));
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition
                      ${isActive
                        ? "bg-orange-50 text-orange-600 font-bold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-orange-600"}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-orange-500" : "bg-gray-200"}`} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Separador */}
            <div className="mx-4 border-t border-gray-100 my-1" />

            {/* Links extra */}
            <nav className="p-3 space-y-0.5 flex-1">
              {[
                { href: "/menu/soporte",        label: "Soporte técnico"   },
                { href: "/menu/sobre-nosotros", label: "Sobre nosotros"    },
                { href: "/menu/contacto",       label: "Contáctanos"       },
                { href: "/menu/reportes",       label: "Reportes y quejas" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition">
                  <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-5 border-t border-orange-50 bg-gradient-to-t from-orange-50/60 to-white">
              <p className="text-center text-xs font-bold text-orange-400">Mercado Fénix · Honduras</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}