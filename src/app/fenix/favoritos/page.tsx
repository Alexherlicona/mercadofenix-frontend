// app/favoritos/page.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Package, Heart, Trash2, Search } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { usePathname } from "next/navigation";
import MobileNav from "@/components/ui/MobileNav";
import CartIcon from "@/components/ui/CartIcon";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FavoritosPage() {
  const pathname = usePathname();
  const NAV_LINKS = [
    { href: "/fenix",           label: "Inicio"     },
    { href: "/fenix/tiendas",   label: "Tiendas"    },
    { href: "/fenix/productos", label: "Productos"  },
    { href: "/fenix/favoritos", label: "Favoritos"  },
    { href: "/fenix/mi-cuenta", label: "Mi cuenta"  },
  ];
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarFavoritos();
  }, []);

  const cargarFavoritos = async () => {
  try {
    const token = localStorage.getItem('access_token') || '';
    console.log("Token enviado:", token ? "presente" : "ausente");

    const res = await fetch(`${API_URL}/api/favoritos/`, {  // nota la barra final para evitar redirect
      credentials: "include", // opcional si usas solo Bearer
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("Status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("Error del servidor:", errText);
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    setFavoritos(data.favoritos || []);
  } catch (err) {
    console.error("Error cargando favoritos:", err);
    setFavoritos([]);
  } finally {
    setLoading(false);
  }
};

  const eliminarFavorito = async (productoId: string) => {
  try {
    const token = localStorage.getItem('access_token') || '';
    await fetch(`${API_URL}/api/favoritos/remove/${productoId}`, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    cargarFavoritos();
  } catch (err) {
    console.error("Error eliminando favorito:", err);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-2xl font-bold text-orange-600 animate-pulse">
          Cargando tus favoritos...
        </div>
      </div>
    );
  }

  if (favoritos.length === 0) {
    function handleSearch(): void {
      throw new Error("Function not implemented.");
    }

    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-3 pt-3 pb-1">
          <h3 className="text-1xl font-black text-gray-900">Favoritos</h3>
            {/* Búsqueda — ocupa el espacio disponible */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full pl-9 pr-3 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition"
              />
            </div>
            <div className="flex items-center px-3 py-2 bg-orange-50 rounded-xl border border-orange-100">
              <CartIcon />
            </div>
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
            
        </div>

        <div className="text-center py-20">
          <Heart className="w-32 h-32 text-gray-300 mx-auto mb-8" />
          <h2 className="text-3xl font-black text-gray-800 mb-4">
            No tienes productos favoritos
          </h2>
          <p className="text-gray-600 mb-8">
            Explora productos y toca el corazón para guardarlos aquí
          </p>
          <Link
            href="/fenix/productos"
            className="inline-block bg-orange-600 text-white px-10 py-5 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition"
          >
            Explorar productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      {/* Header fijo con búsqueda y filtros */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-lg z-40 pt-safe">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/fenix/productos" className="p-2 bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-black flex-1">Favoritos</h1>
            <div className="flex items-center px-3 py-2 bg-orange-100 rounded-xl hover:bg-orange-200 transition cursor-pointer flex-shrink-0">
              <CartIcon />
            </div>
          </div>
          
        </div>
      </div>

      {/* Contenido principal */}
      <div className="px-4">

        {/* Grid de productos favoritos */}
        <div className="grid grid-cols-2 gap-4">
          {favoritos.map((producto) => (
            <div key={producto.id} className="relative">
              {/* Botón eliminar favorito */}
              <button
                onClick={() => eliminarFavorito(producto.id)}
                className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur rounded-full p-2 shadow-lg hover:bg-red-100 transition"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>

              {/* Reutilizamos ProductCard para mantener el diseño consistente */}
              <ProductCard producto={producto} />
            </div>
          ))}
        </div>

        {/* Mensaje adicional */}
        <div className="text-center mt-12 text-gray-600">
          <p className="text-sm">
            Toca el corazón ❤️ en cualquier producto para guardarlo aquí
          </p>
        </div>
      </div>
    </div>
  );
}