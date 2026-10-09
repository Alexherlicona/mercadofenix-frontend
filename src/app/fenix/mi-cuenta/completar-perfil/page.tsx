// src/app/fenix/mi-cuenta/completar-perfil/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MapPin, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { HONDURAS_LOCATIONS } from "@/lib/honduras";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const LOGIN = "/fenix/mi-cuenta/login";

const inputCls =
  "w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors";

export default function CompletarPerfilPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    telefono: "",
    departamento: "",
    municipio: "",
    direccion_exacta: "",
  });

  const municipios = HONDURAS_LOCATIONS[form.departamento] || [];

  const destino = () =>
    new URLSearchParams(window.location.search).get("next") || "/fenix/mi-cuenta";

  // Cargar datos actuales para rellenar lo que ya exista
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace(LOGIN);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) {
          localStorage.removeItem("access_token");
          router.replace(LOGIN);
          return;
        }
        if (!r.ok) throw new Error();
        const u = await r.json();
        setEmail(u.email || "");
        setForm({
          nombres: u.nombres || "",
          apellidos: u.apellidos || "",
          telefono: u.telefono || "",
          departamento: u.departamento || "",
          municipio: u.municipio || "",
          direccion_exacta: u.direccion_exacta || "",
        });
      })
      .catch(() => setError("No se pudieron cargar tus datos. Puedes llenarlos manualmente."))
      .finally(() => setCargando(false));
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDepartamento = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Al cambiar de departamento se limpia el municipio
    setForm((prev) => ({ ...prev, departamento: e.target.value, municipio: "" }));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.telefono && form.telefono.length !== 8) {
      setError("El teléfono debe tener exactamente 8 dígitos");
      return;
    }

    // Solo enviamos lo que tiene valor
    const payload: Record<string, string> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((k) => {
      const v = form[k].trim();
      if (v) payload[k] = v;
    });

    if (Object.keys(payload).length === 0) {
      setError("Completa al menos un campo o usa «Omitir por ahora».");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace(LOGIN);
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        router.replace(LOGIN);
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "No se pudo guardar el perfil"
        );
      }

      if (data.user) {
        localStorage.setItem(
          "cliente_nombre",
          `${data.user.nombres || ""} ${data.user.apellidos || ""}`.trim()
        );
      }
      setGuardado(true);
      setTimeout(() => router.replace(destino()), 1200);
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (guardado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-14 h-14 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">¡Perfil actualizado!</h2>
          <p className="text-gray-500">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10 pt-6 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Termina de configurar tu cuenta</h1>
          <p className="text-sm text-gray-500 mt-1">
            Estos datos nos ayudan a procesar y entregar tus pedidos.
            {email && <span className="block mt-1 text-gray-400">Sesión: {email}</span>}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <form onSubmit={handleGuardar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombres</label>
                <input name="nombres" value={form.nombres} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Apellidos</label>
                <input name="apellidos" value={form.apellidos} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Teléfono{" "}
                <span className="font-normal text-gray-400">(también te servirá para iniciar sesión)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                <input
                  name="telefono"
                  type="tel"
                  placeholder="99751480"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, telefono: e.target.value.replace(/\D/g, "").slice(0, 8) }))
                  }
                  className={`${inputCls} pl-10 pr-12`}
                />
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                    form.telefono.length === 8 ? "text-green-500" : "text-gray-400"
                  }`}
                >
                  {form.telefono.length}/8
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Ubicación
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Departamento</label>
              <select name="departamento" value={form.departamento} onChange={handleDepartamento} className={inputCls}>
                <option value="">Selecciona tu departamento</option>
                {Object.keys(HONDURAS_LOCATIONS).map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ciudad / Municipio</label>
              <select
                name="municipio"
                value={form.municipio}
                onChange={handleChange}
                disabled={!form.departamento}
                className={`${inputCls} disabled:opacity-50`}
              >
                <option value="">Selecciona tu ciudad</option>
                {municipios.map((mun) => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Dirección exacta</label>
              <input
                name="direccion_exacta"
                placeholder="Col. Kennedy, casa #123..."
                value={form.direccion_exacta}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 active:scale-[0.98]"
            >
              {guardando ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                </span>
              ) : (
                "Guardar"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.replace(destino())}
              className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
            >
              Omitir por ahora
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}