// src/app/fenix/mi-cuenta/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import CartIcon from "@/components/ui/CartIcon";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function ClienteLoginPage() {
    const pathname = usePathname();
    const NAV_LINKS = [
      { href: "/fenix",           label: "Inicio"     },
      { href: "/fenix/tiendas",   label: "Tiendas"    },
      { href: "/fenix/productos", label: "Productos"  },
      { href: "/fenix/favoritos", label: "Favoritos"  },
      { href: "/fenix/mi-cuenta", label: "Mi cuenta"  },
      { href: "/fenix/mi-cuenta/login", label: "Login"  },
    ];
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) router.replace("/fenix/mi-cuenta"); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: telefono.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Teléfono o contraseña incorrectos"); return; }
      localStorage.setItem("access_token", data.access_token);
      if (data.user) {
        localStorage.setItem("cliente_nombre", `${data.user.nombres || ""} ${data.user.apellidos || ""}`.trim());
        localStorage.setItem("cliente_id", String(data.user.id));
      }
      router.push("/fenix/mi-cuenta");
    } catch {
      setError("Sin conexión. Verifica tu internet.");
    } finally { setLoading(false); }
  };

  return (
    <>
          <div className="flex items-center gap-3 pt-3 pb-1">
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-orange-100 border border-orange-100 p-8">

          {/* Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
              <span className="text-white font-black text-lg">MF</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">Bienvenido</h1>
            <p className="text-gray-500 text-sm mt-1">Inicia sesión en tu cuenta</p>
          </div>

          {/* Google */}
          <button
            onClick={() => { window.location.href = `${API}/api/auth/google`; }}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm border border-gray-200 shadow-sm hover:shadow transition-all mb-5"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          {/* Separador */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">o con tu teléfono</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="tel" inputMode="numeric"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="98XXXXXX" required autoComplete="tel"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type={showPass ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-xl text-gray-900 text-sm placeholder-gray-400 outline-none transition"
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading || telefono.length < 8 || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-md shadow-orange-200">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</>
                : <><LogIn className="w-4 h-4" /> Iniciar sesión</>}
            </button>
          </form>

          <div className="text-center mt-5 space-y-1.5">
            <p className="text-gray-400 text-xs">¿No tienes cuenta?</p>
            <button onClick={() => router.push("/fenix/mi-cuenta/registro")}
              className="text-orange-500 text-sm font-bold hover:text-orange-600 transition">
              Crear cuenta gratis
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-5">
          Al continuar aceptas los términos de uso de Mercado Fénix.
        </p>
      </div>
    </div>
    </>
  );
}