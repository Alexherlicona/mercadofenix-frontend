// src/app/fenix/mi-cuenta/auth/callback/page.tsx
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function GoogleCallbackContent() {
  const router = useRouter();
  const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");
  const [esNuevo, setEsNuevo] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
  if (ran.current) return;
  ran.current = true;

  const search = new URLSearchParams(window.location.search);
  const code  = search.get("code");
  const error = search.get("error");
  const next  = search.get("next") || "/fenix/mi-cuenta";

  if (error) {
    setEstado("error");
    setMensaje(error === "access_denied"
      ? "Cancelaste el inicio de sesión con Google."
      : "Google no pudo completar el proceso. Intenta de nuevo.");
    return;
  }

  if (!code) {
    // Sin code pero con sesión ya guardada: no es un error, seguimos
    if (localStorage.getItem("access_token")) {
      router.replace(next);
      return;
    }
    setEstado("error");
    setMensaje("Google no pudo completar el proceso. Intenta de nuevo.");
    return;
  }

  // Un code de Google solo se puede usar una vez: evita doble petición
  if (sessionStorage.getItem("google_code_used") === code) return;
  sessionStorage.setItem("google_code_used", code);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    fetch(`${API}/api/auth/google/callback?code=${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Error al autenticar");
        return data;
      })
      .then(data => {
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

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}