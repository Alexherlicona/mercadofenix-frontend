// src/components/ui/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Package, Heart, User } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/fenix",           label: "Hogar",      icon: Home    },
    { href: "/fenix/tiendas",   label: "Tiendas",    icon: Store   },
    { href: "/fenix/productos", label: "Productos",  icon: Package },
    { href: "/fenix/favoritos", label: "Favoritos",  icon: Heart   },
    { href: "/fenix/mi-cuenta", label: "Yo",         icon: User    },
  ];

  return (
    // lg:hidden — esta barra SOLO existe en móvil/tablet.
    // En desktop el Header ya trae su propia nav horizontal arriba.
    <nav className="mf-mobile-nav lg:hidden fixed bottom-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200">
      <div className="flex w-full justify-around items-center h-16 px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive ? "text-orange-500" : "text-gray-500"
              }`}
            >
              <div
                className={`relative p-2 rounded-xl transition-all ${
                  isActive ? "bg-orange-50" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-sm" : ""}`} />
              </div>
              <span className={`text-[10px] font-medium leading-tight ${isActive ? "font-bold" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}