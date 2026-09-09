// app/mi-cuenta/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User, Package, Flag, LogOut, ChevronRight } from "lucide-react";
import Header from "@/components/ui/header";
import CartIcon from "@/components/ui/CartIcon";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MiCuentaPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.log("No token found in localStorage");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
      });

      console.log("Response status for /me:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("User data from /me:", data);
        setUser(data);
        setIsLoggedIn(true);
      } else {
        console.error("Invalid token or expired. Status:", res.status);
        localStorage.removeItem("access_token");
      }
    } catch (err) {
      console.error("Error fetching /me:", err);
      localStorage.removeItem("access_token");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("access_token");
    setIsLoggedIn(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16 lg:pt-[68px]">
        <div className="text-2xl font-bold text-orange-600 animate-pulse">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 lg:pt-[84px] pb-32 lg:pb-12">
      <Header />
      {/* Header móvil: barra fija propia con back + título + carrito.
          En desktop: se oculta porque el Header global (con su nav) ya cubre esa función;
          en su lugar se muestra un título simple dentro del flujo normal de la página. */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-white shadow-sm z-30 pt-safe">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            
          </div>
        </div>
      </div>

      {/* Título desktop — dentro del flujo, dos columnas con sidebar */}
      <div className="hidden lg:block mf-container">
        <h1 className="text-3xl font-black text-gray-900 mb-6">Mi cuenta</h1>
      </div>

      {/* Contenido principal — móvil: columna única px-4. Desktop: contenedor centrado, grid 2 columnas */}
      <div className="px-4 lg:px-0 mf-container">
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-8 lg:items-start">

        {/* No logueado */}
        {!isLoggedIn ? (
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center lg:max-w-md lg:mx-auto lg:col-span-2">
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-8 flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-4">
              Inicia sesión o regístrate
            </h2>
            <p className="text-gray-600 mb-10 max-w-sm mx-auto">
              Para ver tus pedidos, favoritos, reportar tiendas y gestionar tu perfil
            </p>
            <div className="space-y-4">
              <Link
                href="/fenix/mi-cuenta/login"
                className="block w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl transition"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/fenix/mi-cuenta/registro"
                className="block w-full bg-gray-100 text-gray-800 py-5 rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl transition"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Perfil rápido — móvil: arriba de todo. Desktop: columna izquierda, queda fija (sticky) */}
            <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 lg:mb-0 lg:sticky lg:top-24">
              <div className="flex items-center gap-5 lg:flex-col lg:items-start lg:gap-3">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg">
                  {user.nombres?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 lg:w-full">
                  <h2 className="text-2xl font-black text-gray-900">
                    {user.nombres} {user.apellidos}
                  </h2>
                  <p className="text-gray-600">{user.telefono}</p>
                  {user.email && <p className="text-sm text-gray-500 mt-1">{user.email}</p>}
                </div>
              </div>
            </div>

            {/* Menú de opciones personales — móvil: columna única debajo del perfil.
                Desktop: columna derecha, junto al perfil sticky */}
            <div className="space-y-3 lg:space-y-3">
              <Link
                href="/fenix/mi-cuenta/perfil"
                className="flex items-center justify-between bg-white rounded-3xl shadow-lg p-5 hover:shadow-xl transition"
              >
                <div className="flex items-center gap-4">
                  <User className="w-8 h-8 text-blue-600" />
                  <span className="font-bold text-gray-900">Mi perfil</span>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </Link>

              <Link
                href="/fenix/mi-cuenta/mis-pedidos"
                className="flex items-center justify-between bg-white rounded-3xl shadow-lg p-5 hover:shadow-xl transition"
              >
                <div className="flex items-center gap-4">
                  <Package className="w-8 h-8 text-orange-600" />
                  <span className="font-bold text-gray-900">Mis pedidos</span>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </Link>

              <Link
                href="/fenix/mi-cuenta/reportar-tienda"
                className="flex items-center justify-between bg-white rounded-3xl shadow-lg p-5 hover:shadow-xl transition"
              >
                <div className="flex items-center gap-4">
                  <Flag className="w-8 h-8 text-red-600" />
                  <span className="font-bold text-gray-900">Reportar tienda</span>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between bg-red-100 rounded-3xl p-5 hover:bg-red-200 transition"
              >
                <div className="flex items-center gap-4">
                  <LogOut className="w-8 h-8 text-red-600" />
                  <span className="font-bold text-red-600">Cerrar sesión</span>
                </div>
                <ChevronRight className="w-6 h-6 text-red-400" />
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}