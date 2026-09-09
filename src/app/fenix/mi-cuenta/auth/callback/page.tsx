// src/app/fenix/mi-cuenta/auth/callback/page.tsx
// Google redirige aquí después de que el usuario elige su cuenta
// Esta página toma el ?code= de la URL, llama al backend y guarda el token
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import CartIcon from "@/components/ui/CartIcon";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function GoogleCallbackPage() {

  const pathname = usePathname();
  const NAV_LINKS = [
    { href: "/fenix", label: "Inicio" },
    { href: "/fenix/tiendas", label: "Tiendas" },
    { href: "/fenix/productos", label: "Productos" },
    { href: "/fenix/favoritos", label: "Favoritos" },
    { href: "/fenix/mi-cuenta", label: "Mi cuenta" },
  ];
  const router = useRouter();
  const params = useSearchParams();
  const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");
  const [esNuevo, setEsNuevo] = useState(false);
  const ran = useRef(false); // evita doble ejecución en React Strict Mode

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      setEstado("error");
      setMensaje(error === "access_denied"
        ? "Cancelaste el inicio de sesión con Google."
        : "Google no pudo completar el proceso. Intenta de nuevo.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30 s

    // Llamar al backend con el code que Google nos dio
    fetch(`${API}/api/auth/google/callback?code=${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Error al autenticar");
        return data;
      })
      .then(data => {
        // Guardar token igual que el login normal
        localStorage.setItem("access_token", data.access_token);
        if (data.user) {
          const nombre = `${data.user.nombres || ""} ${data.user.apellidos || ""}`.trim();
          localStorage.setItem("cliente_nombre", nombre);
          localStorage.setItem("cliente_id", String(data.user.id));
          if (data.user.avatar_url) {
            localStorage.setItem("cliente_avatar", data.user.avatar_url);
          }
        }
        setEstado("exito");
        setEsNuevo(!!data.user?.es_nuevo);
        clearTimeout(timeoutId);

        // Si es usuario nuevo sin teléfono → pedir que complete perfil
        // Si ya tiene cuenta → ir a mi-cuenta o a donde iba
        const next = new URLSearchParams(window.location.search).get("next") || "/fenix/mi-cuenta";
        setTimeout(() => {
          if (data.user?.es_nuevo) {
            router.replace("/fenix/mi-cuenta/completar-perfil");
          } else {
            router.replace(next);
          }
        }, 1200);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        setEstado("error");
        setMensaje(err.name === "AbortError"
          ? "El servidor tardó demasiado en responder. Intenta de nuevo."
          : err.message || "Error al conectar con el servidor");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="flex items-center gap-3 pt-3 pb-1">
        <h3 className="text-1xl font-black text-gray-900">Productos</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center px-3 py-2 bg-orange-50 rounded-xl border border-orange-100">
            <CartIcon />
          </div>
          {/* Nav desktop — visible solo en lg+, reemplaza al botón hamburguesa visualmente */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-shrink-0 ml-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition whitespace-nowrap ${isActive ? "text-orange-500 bg-gray-100" : "text-gray-500"
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
      </div>
      <div className="text-center space-y-4 max-w-sm w-full">

        {estado === "cargando" && (
          <>
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Verificando tu cuenta</h2>
              <p className="text-gray-500 text-sm mt-1">Conectando con Google...</p>
            </div>
          </>
        )}

        {estado === "exito" && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {esNuevo ? "¡Bienvenido a Mercado Fénix!" : "¡Sesión iniciada!"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {esNuevo ? "Completando tu perfil..." : "Redirigiendo..."}
              </p>
            </div>
          </>
        )}

        {estado === "error" && (
          <>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">No se pudo iniciar sesión</h2>
              <p className="text-gray-400 text-sm mt-1">{mensaje}</p>
            </div>
            <button
              onClick={() => router.push("/fenix/mi-cuenta/login")}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl text-sm transition"
            >
              Volver al inicio de sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
}