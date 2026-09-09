// src/app/fenix/mi-cuenta/registro/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Lock, Mail, MapPin, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const HONDURAS_LOCATIONS: Record<string, string[]> = {
  "Francisco Morazán": ["Tegucigalpa", "Comayagüela", "Valle de Ángeles", "Santa Lucía", "Ojojona"],
  "Cortés": ["San Pedro Sula", "Choloma", "La Lima", "Villanueva", "Puerto Cortés"],
  "Atlántida": ["La Ceiba", "Tela", "El Progreso", "Jutiapa"],
  "Comayagua": ["Comayagua", "Siguatepeque", "La Trinidad"],
  "Santa Bárbara": ["Santa Bárbara", "San Marcos", "Quimistán"],
  "Copán": ["Santa Rosa de Copán", "La Entrada", "Copán Ruinas"],
  "Olancho": ["Juticalpa", "Catacamas", "San Francisco de la Paz"],
  "Choluteca": ["Choluteca", "El Triunfo", "Pespire"],
  "El Paraíso": ["Danlí", "Yuscarán", "El Paraíso"],
  "Yoro": ["Yoro", "El Progreso", "Morazán"],
  "Colón": ["Trujillo", "Tocoa", "Sonaguera"],
  "Ocotepeque": ["Ocotepeque", "Sensenti", "La Labor"],
  "Lempira": ["Gracias", "Erandique", "Lepaera"],
  "Intibucá": ["La Esperanza", "Intibucá", "Yamaranguila"],
  "La Paz": ["La Paz", "Marcala", "Santa Elena"],
  "Valle": ["Nacaome", "San Lorenzo", "Amapala"],
  "Islas de la Bahía": ["Roatán", "Utila", "Guanaja"],
  "Gracias a Dios": ["Puerto Lempira", "Brus Laguna"],
};

function parseApiError(data: any): string {
  if (!data) return "Error desconocido";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((e: any) => {
        const campo = e.loc?.slice(1).join(" → ") || "campo";
        return `${campo}: ${e.msg}`;
      })
      .join(" | ");
  }
  return "Error al procesar la solicitud";
}

export default function RegistroPage() {
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    telefono: "",
    password: "",
    email: "",
    departamento: "",
    municipio: "",
    direccion_exacta: "",
  });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const lista = HONDURAS_LOCATIONS[form.departamento] || [];
    setMunicipios(lista);
    setForm(prev => ({ ...prev, municipio: lista[0] || "" }));
  }, [form.departamento]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.telefono.length !== 8) {
      setError("El teléfono debe tener exactamente 8 dígitos");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    // Construir payload con exactamente los campos que el schema espera
    const payload: Record<string, string> = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono,
      password: form.password,
    };
    if (form.email.trim())           payload.email = form.email.trim();
    if (form.departamento)           payload.departamento = form.departamento;
    if (form.municipio)              payload.municipio = form.municipio;
    if (form.direccion_exacta.trim()) payload.direccion_exacta = form.direccion_exacta.trim();

    try {
      const res = await fetch(`${API_URL}/api/auth/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // parseApiError convierte los arrays de validación Pydantic a texto legible
        throw new Error(parseApiError(data));
      }

      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      setSuccess(true);
      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("redirect") || "/fenix/mi-cuenta";
      }, 1800);

    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-14 h-14 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">¡Cuenta creada!</h2>
          <p className="text-gray-500">Iniciando sesión automáticamente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mf-body-pad min-h-screen bg-gray-50 pb-10">
      <div className="mf-container py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/fenix/mi-cuenta" className="p-3 bg-white rounded-full shadow hover:shadow-md transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Crear cuenta</h1>
            <p className="text-sm text-gray-500">¡Es gratis y toma 1 minuto!</p>
          </div>
        </div>

        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-6">
          <form onSubmit={handleRegistro} className="space-y-4">

            {/* Nombres y apellidos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombres *</label>
                <input
                  name="nombres" type="text" placeholder="Juan"
                  value={form.nombres} onChange={handleChange} required
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Apellidos *</label>
                <input
                  name="apellidos" type="text" placeholder="Pérez"
                  value={form.apellidos} onChange={handleChange} required
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Teléfono * <span className="font-normal text-gray-400">(será tu usuario para iniciar sesión)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                <input
                  name="telefono" type="tel" placeholder="99751480"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${form.telefono.length === 8 ? "text-green-500" : "text-gray-400"}`}>
                  {form.telefono.length}/8
                </span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Email <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="email" type="email" placeholder="tucorreo@gmail.com"
                  value={form.email} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Contraseña * <span className="font-normal text-gray-400">(mínimo 6 caracteres)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                <input
                  name="password" type={mostrarPassword ? "text" : "password"} placeholder="••••••••"
                  value={form.password} onChange={handleChange} required minLength={6}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors"
                />
                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Separador ubicación */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Ubicación <span className="font-normal">(opcional)</span>
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Departamento */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Departamento</label>
              <select name="departamento" value={form.departamento} onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors">
                <option value="">Selecciona tu departamento</option>
                {Object.keys(HONDURAS_LOCATIONS).map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            {/* Municipio */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ciudad / Municipio</label>
              <select name="municipio" value={form.municipio} onChange={handleChange}
                disabled={!form.departamento}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm disabled:opacity-50 transition-colors">
                <option value="">Selecciona tu ciudad</option>
                {municipios.map(mun => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
              </select>
            </div>

            {/* Dirección */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Dirección exacta <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                name="direccion_exacta" type="text" placeholder="Col. Kennedy, casa #123..."
                value={form.direccion_exacta} onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-orange-500 outline-none text-sm transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 active:scale-[0.98]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Creando cuenta...
                </span>
              ) : "Crear mi cuenta"}
            </button>

            <p className="text-center text-sm text-gray-500 pt-1">
              ¿Ya tienes cuenta?{" "}
              <Link href="/fenix/mi-cuenta/login" className="text-orange-600 font-bold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}