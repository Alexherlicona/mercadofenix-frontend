"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Store, Phone, Lock, LogIn, Mail, AlertCircle, Eye, EyeOff, Clock } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getErrorMessage = (err: any): string => {
  if (!err.response) return "Sin conexión. Revisa tu internet.";
  const { status, data } = err.response;
  if (status === 429) return data?.detail || "Demasiados intentos. Espera 15 minutos.";
  if (status === 403) return data?.detail || "Tu cuenta no está activa.";
  if (status === 401) return data?.detail || "Credenciales incorrectas.";
  if (typeof data === "string") return data;
  if (data?.detail) return typeof data.detail === "string" ? data.detail : "Error en los datos";
  return "Error al iniciar sesión";
};

// ── Determinar si el identifier parece email o teléfono ──────────────────────
function esEmail(valor: string): boolean {
  return valor.includes("@");
}

export default function VendedorLogin() {
  const [identifier, setIdentifier] = useState("");  // teléfono o email
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [bloqueado,  setBloqueado]  = useState(false);
  const [segundos,   setSegundos]   = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router   = useRouter();

  // Si ya está logueado → ir al dashboard
  useEffect(() => {
    if (localStorage.getItem("vendedor_token")) router.push("/vendedor/dashboard");
  }, [router]);

  // Cuenta regresiva cuando está bloqueado
  useEffect(() => {
    if (!bloqueado || segundos <= 0) return;
    timerRef.current = setTimeout(() => {
      setSegundos(s => {
        if (s <= 1) { setBloqueado(false); setError(""); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [bloqueado, segundos]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueado) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    // Enviar como identifier genérico — el backend acepta teléfono o email
    formData.append("identifier", identifier.trim());
    formData.append("password", password);

    try {
      const res = await axios.post(`${API_URL}/api/vendedor/login`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      localStorage.setItem("vendedor_token", res.data.access_token);
      router.push("/vendedor/dashboard");
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      // Si es 429, iniciar cuenta regresiva de 15 min
      if (err.response?.status === 429) {
        setBloqueado(true);
        const retryAfter = parseInt(err.response.headers?.["retry-after"] || "900");
        setSegundos(retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTiempo = (s: number) => {
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return `${m}:${seg.toString().padStart(2, "0")}`;
  };

  const esCorreo = esEmail(identifier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-700 via-red-700 to-purple-900 flex items-center justify-center p-6">
      <div className="bg-black/50 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 w-full max-w-md border border-orange-500/30">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-5">
            <Store className="w-14 h-14 text-black" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            MERCADO FÉNIX
          </h1>
          <p className="text-orange-200 mt-2 text-lg">Panel del Vendedor</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Identifier — teléfono o email */}
          <div className="space-y-1.5">
            <label className="text-orange-300 text-xs font-semibold uppercase tracking-wide">
              Teléfono o correo electrónico
            </label>
            <div className="relative">
              {esCorreo
                ? <Mail  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />
                : <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />}
              <input
                type={esCorreo ? "email" : "text"}
                placeholder="Ej: 99887766  o  correo@gmail.com"
                value={identifier}
                onChange={e => setIdentifier(
                  !esCorreo
                    ? e.target.value.replace(/[^0-9@._\-a-zA-Z]/g, "")
                    : e.target.value
                )}
                required
                autoComplete="username"
                disabled={bloqueado}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/15 border-2 border-white/25 text-white placeholder-white/50 text-base
                  focus:outline-none focus:border-yellow-400 transition-all disabled:opacity-50"
              />
            </div>
            <p className="text-white/40 text-xs pl-1">
              {esCorreo ? "📧 Iniciando con correo electrónico" : "📱 Iniciando con teléfono"}
            </p>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label className="text-orange-300 text-xs font-semibold uppercase tracking-wide">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={bloqueado}
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/15 border-2 border-white/25 text-white placeholder-white/50 text-base
                  focus:outline-none focus:border-yellow-400 transition-all disabled:opacity-50"
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition">
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-semibold
              ${bloqueado
                ? "bg-red-950/80 border-red-500 text-red-200"
                : "bg-red-900/70 border-red-500/60 text-white"}`}>
              {bloqueado
                ? <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />}
              <div>
                <p>{error}</p>
                {bloqueado && segundos > 0 && (
                  <p className="text-red-300 text-xs mt-1 font-mono">
                    Desbloqueado en: {formatTiempo(segundos)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || bloqueado}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500
              text-black font-bold text-lg py-4 rounded-2xl shadow-xl
              flex items-center justify-center gap-3
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <LogIn className="w-6 h-6" />
            {loading ? "Entrando..." : bloqueado ? `Bloqueado (${formatTiempo(segundos)})` : "Ingresar a mi tienda"}
          </button>
        </form>

        {/* Info de seguridad */}
        <div className="mt-6 flex items-start gap-2 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-white/40 text-xs leading-relaxed">
            Por seguridad, después de 5 intentos fallidos tu cuenta se bloquea 15 minutos automáticamente.
          </p>
        </div>

        {/* Registro */}
        <div className="text-center mt-6">
          <p className="text-orange-200 text-sm mb-2">¿Primera vez en Mercado Fénix?</p>
          <button onClick={() => router.push("/vendedor/registro")}
            className="text-yellow-400 text-base font-bold underline hover:text-yellow-300 transition">
            Registra tu tienda aquí
          </button>
        </div>
      </div>
    </div>
  );
}