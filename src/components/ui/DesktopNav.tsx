// src/components/ui/DesktopNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, Search, ShoppingBag, User, Store,
  Heart, Bell, Menu, LogIn
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/fenix",                          label: "Inicio",      icon: Home },
  { href: "/fenix/buscar",                   label: "Buscar",      icon: Search },
  { href: "/fenix/mi-cuenta/mis-pedidos",    label: "Mis pedidos", icon: ShoppingBag },
  { href: "/fenix/mi-cuenta/favoritos",      label: "Favoritos",   icon: Heart },
];

export default function DesktopNav() {
  const pathname = usePathname();
  const router    = useRouter();
  const [logueado, setLogueado] = useState(false);
  const [nombre,   setNombre]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setLogueado(!!token);
    setNombre(localStorage.getItem("cliente_nombre") || "");
  }, [pathname]);

  // No mostrar el nav de escritorio en rutas que ya tienen su propio Header:
  // - /vendedor, /admin-phoenix-2025 → tienen sidebar propio
  // - /fenix → tiene su propio <Header /> (con buscador, logo, etc.)
  // DesktopNav solo se usa en páginas "sueltas" que no traen su propio header
  // (soporte, contacto, sobre-nosotros, reportar-tienda, etc.)
  if (
    pathname.startsWith("/vendedor") ||
    pathname.startsWith("/admin-phoenix-2025") ||
    pathname.startsWith("/fenix")
  ) {
    return null;
  }

  const activo = (href: string) =>
    href === "/fenix" ? pathname === "/fenix" : pathname.startsWith(href);

  return (
    <header className="mf-desktop-nav hidden lg:block sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="mf-header-inner flex items-center h-16 gap-8">

        {/* Logo */}
        <Link href="/fenix" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">MF</span>
          </div>
          <span className="font-black text-gray-900 text-lg tracking-tight">
            Mercado <span className="text-orange-500">Fénix</span>
          </span>
        </Link>

        {/* Buscador central */}
        <div className="flex-1 max-w-xl">
          <button
            onClick={() => router.push("/fenix/buscar")}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 transition text-left"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            Buscar productos, tiendas...
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex items-center gap-1 flex-shrink-0">
          {NAV_ITEMS.slice(0, 1).concat(NAV_ITEMS.slice(2)).map(item => {
            const Icon = item.icon;
            const act  = activo(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all
                  ${act ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                <Icon className={`w-4 h-4 ${act ? "text-orange-500" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Divisor */}
        <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

        {/* Vendedor + Cuenta */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/vendedor"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            <Store className="w-4 h-4" />
            Vender
          </Link>

          {logueado ? (
            <Link href="/fenix/mi-cuenta"
              className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl hover:bg-gray-50 transition">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {nombre ? nombre.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <span className="text-sm font-semibold text-gray-800 max-w-[120px] truncate">
                {nombre || "Mi cuenta"}
              </span>
            </Link>
          ) : (
            <Link href="/fenix/mi-cuenta/login"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-xl transition shadow-sm">
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}