"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Store, Phone, Lock, LogIn, Mail, AlertCircle, Eye, EyeOff, Clock,
  Info, X, ShieldCheck, Sparkles, HelpCircle, Crown
} from "lucide-react";

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

// ── Contenido de los paneles de información ───────────────────────────────────
type ClaveInfo = "plataforma" | "acceso" | "seguridad" | "planes";

const INFO_CONTENIDO: Record<ClaveInfo, {
  icono: any; titulo: string; parrafos: string[]; lista?: string[];
}> = {
  plataforma: {
    icono: Sparkles,
    titulo: "¿Qué es Mercado Fénix?",
    parrafos: [
      "Mercado Fénix es la plataforma que te da tu propia tienda en línea, con un link único que puedes compartir en WhatsApp, Facebook e Instagram.",
      "Desde tu panel de vendedor puedes publicar productos físicos o digitales, recibir pedidos, chatear con tus clientes y ver estadísticas de tus ventas — todo en un solo lugar.",
    ],
  },
  acceso: {
    icono: HelpCircle,
    titulo: "¿Cómo inicio sesión?",
    parrafos: [
      "Puedes ingresar con el número de teléfono o el correo electrónico que usaste al registrar tu tienda — el sistema detecta automáticamente cuál escribiste.",
      "Si no recuerdas cuál usaste, prueba primero con tu número de teléfono, ya que es el dato más común al registrarse.",
    ],
  },
  seguridad: {
    icono: ShieldCheck,
    titulo: "Seguridad de tu cuenta",
    parrafos: [
      "Tu contraseña se guarda cifrada y nunca es visible, ni siquiera para nuestro equipo de soporte.",
      "Por tu seguridad, después de 5 intentos fallidos la cuenta se bloquea automáticamente durante 15 minutos.",
    ],
    lista: [
      "Nunca compartimos tu información con terceros.",
      "Toda la conexión viaja cifrada (HTTPS).",
      "Puedes cambiar tu contraseña en cualquier momento desde tu perfil.",
    ],
  },
  planes: {
    icono: Crown,
    titulo: "Planes para tu tienda",
    parrafos: [
      "Al registrarte comienzas con un plan de prueba gratuito para que conozcas la plataforma sin compromiso.",
      "Luego puedes elegir el plan que mejor se ajuste al tamaño de tu negocio: Básico, Pro o Premium, cada uno con más productos, estadísticas y herramientas de promoción.",
    ],
  },
};

// ── Botón pequeño de información ───────────────────────────────────────────────
function BotonInfo({ clave, onOpen, className = "" }: { clave: ClaveInfo; onOpen: (c: ClaveInfo) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(clave)}
      aria-label="Más información"
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition flex-shrink-0 ${className}`}
    >
      <Info className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Panel modal de información ─────────────────────────────────────────────────
function PanelInfo({ clave, onClose }: { clave: ClaveInfo; onClose: () => void }) {
  const data = INFO_CONTENIDO[clave];
  const Icono = data.icono;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-white sm:rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Icono className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-black text-base leading-tight">{data.titulo}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition p-1 -mt-1 -mr-1">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-3">
          {data.parrafos.map((p, i) => (
            <p key={i} className="text-gray-600 text-sm leading-relaxed">{p}</p>
          ))}
          {data.lista && (
            <ul className="space-y-2 pt-1">
              {data.lista.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-600 text-sm leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 font-semibold text-sm transition">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendedorLogin() {
  const [identifier, setIdentifier] = useState("");  // teléfono o email
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [bloqueado,  setBloqueado]  = useState(false);
  const [segundos,   setSegundos]   = useState(0);
  const [panelInfo,  setPanelInfo]  = useState<ClaveInfo | null>(null);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-6 relative overflow-hidden">

      {/* Resplandores decorativos suaves — mantienen el guiño de marca sin abrumar */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-orange-200/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[24rem] h-[24rem] bg-amber-200/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-orange-900/5 p-10 w-full max-w-md border border-orange-100">

        {/* Icono de información general — esquina superior derecha */}
        <BotonInfo clave="plataforma" onOpen={setPanelInfo}
          className="absolute top-5 right-5 w-8 h-8 bg-gray-50 border border-gray-200" />

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center shadow-xl shadow-orange-900/20 mb-5">
            <Store className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
            MERCADO FÉNIX
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Panel del Vendedor</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Identifier — teléfono o email */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                Teléfono o correo electrónico
              </label>
              <BotonInfo clave="acceso" onOpen={setPanelInfo} />
            </div>
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
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 text-base
                  focus:outline-none focus:border-orange-400 focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
            <p className="text-gray-400 text-xs pl-1">
              {esCorreo ? "📧 Iniciando con correo electrónico" : "📱 Iniciando con teléfono"}
            </p>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
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
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 text-base
                  focus:outline-none focus:border-orange-400 focus:bg-white transition-all disabled:opacity-50"
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition">
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-semibold
              ${bloqueado
                ? "bg-red-100 border-red-300 text-red-800"
                : "bg-red-50 border-red-200 text-red-700"}`}>
              {bloqueado
                ? <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />}
              <div>
                <p>{error}</p>
                {bloqueado && segundos > 0 && (
                  <p className="text-red-600 text-xs mt-1 font-mono">
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
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500
              text-white font-bold text-lg py-4 rounded-2xl shadow-xl shadow-orange-900/20
              flex items-center justify-center gap-3
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <LogIn className="w-6 h-6" />
            {loading ? "Entrando..." : bloqueado ? `Bloqueado (${formatTiempo(segundos)})` : "Ingresar a mi tienda"}
          </button>
        </form>

        {/* Info de seguridad — ahora también abre el panel completo */}
        <button type="button" onClick={() => setPanelInfo("seguridad")}
          className="w-full mt-6 flex items-start gap-2 bg-orange-50 hover:bg-orange-100 rounded-2xl px-4 py-3 border border-orange-100 transition text-left">
          <ShieldCheck className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-gray-500 text-xs leading-relaxed flex-1">
            Por seguridad, después de 5 intentos fallidos tu cuenta se bloquea 15 minutos automáticamente.
          </p>
          <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
        </button>

        {/* Registro */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm mb-2 inline-flex items-center gap-1.5">
            ¿Primera vez en Mercado Fénix?
            <BotonInfo clave="planes" onOpen={setPanelInfo} />
          </p>
          <button onClick={() => router.push("/vendedor/registro")}
            className="block mx-auto text-orange-600 text-base font-bold underline hover:text-orange-700 transition">
            Registra tu tienda aquí
          </button>
        </div>
      </div>

      {/* Panel de información activo */}
      {panelInfo && <PanelInfo clave={panelInfo} onClose={() => setPanelInfo(null)} />}
    </div>
  );
}