"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { fusionarCarrito } from "@/lib/FusionarCarrito";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Nivel de módulo: un code de Google solo se puede canjear UNA vez.
// Esto evita la doble petición de React StrictMode.
const pendientes = new Map<string, Promise<any>>();

function canjearCode(code: string) {
  if (!pendientes.has(code)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    const p = fetch(`${API}/api/auth/google/callback?code=${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.detail || "Error al autenticar");
        return data;
      })
      .then(async (data) => {
        // Una sola vez por code: guardar sesión y pasar el carrito de invitado al usuario
        localStorage.setItem("access_token", data.access_token);
        if (data.user) {
          localStorage.setItem(
            "cliente_nombre",
            `${data.user.nombres || ""} ${data.user.apellidos || ""}`.trim()
          );
          localStorage.setItem("cliente_id", String(data.user.id));
          if (data.user.avatar_url) localStorage.setItem("cliente_avatar", data.user.avatar_url);
        }
        await fusionarCarrito();
        return data;
      })
      .catch((err) => {
        if (err.name === "AbortError") throw new Error("TIMEOUT");
        throw err;
      })
      .finally(() => clearTimeout(timer));

    pendientes.set(code, p);
  }
  return pendientes.get(code)!;
}

function GoogleCallbackContent() {
  const router = useRouter();
  const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    const error = search.get("error");
    const next = search.get("next") || sessionStorage.getItem("login_next") || "/fenix/mi-cuenta";

    if (error) {
      setEstado("error");
      setMensaje(
        error === "access_denied"
          ? "Cancelaste el inicio de sesión con Google."
          : "Google no pudo completar el proceso. Intenta de nuevo."
      );
      return;
    }

    if (!code) {
      if (localStorage.getItem("access_token")) router.replace(next);
      else {
        setEstado("error");
        setMensaje("Google no pudo completar el proceso. Intenta de nuevo.");
      }
      return;
    }

    let vivo = true;
    canjearCode(code)
      .then(() => {
        if (!vivo) return;
        sessionStorage.removeItem("login_next");
        setEstado("exito");
        setTimeout(() => router.replace(next), 1000);
      })
      .catch((err) => {
        console.error("Callback Google falló:", err);
        if (!vivo) return;
        setEstado("error");
        setMensaje(
          err.message === "TIMEOUT"
            ? "El servidor tardó demasiado en responder. Intenta de nuevo."
            : err.message || "Error al conectar con el servidor"
        );
      });

    return () => {
      vivo = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center space-y-5 max-w-sm w-full">
        {estado === "cargando" && (
          <>
            <div className="relative w-20 h-20 mx-auto">
              <span className="absolute inset-0 rounded-full bg-orange-200 animate-ping opacity-60" />
              <div className="relative w-20 h-20 rounded-full bg-orange-50 border-2 border-orange-100 flex items-center justify-center">
                <Loader2 className="w-9 h-9 text-orange-600 animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Iniciando sesión</h2>
              <p className="text-gray-500 text-sm mt-1 flex items-center justify-center gap-1">
                Conectando con Google
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" />
                </span>
              </p>
            </div>
          </>
        )}

        {estado === "exito" && (
          <>
            <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">¡Sesión iniciada!</h2>
              <p className="text-gray-500 text-sm mt-1">Redirigiendo...</p>
            </div>
          </>
        )}

        {estado === "error" && (
          <>
            <div className="w-20 h-20 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">No se pudo iniciar sesión</h2>
              <p className="text-gray-600 text-sm mt-1">{mensaje}</p>
            </div>
            <button
              onClick={() => router.push("/fenix/mi-cuenta/login")}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-2xl text-sm shadow-lg hover:shadow-xl transition"
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}