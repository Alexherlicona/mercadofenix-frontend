// app/mi-cuenta/perfil/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User, Phone, MapPin, Save, AlertCircle, CheckCircle, LogOut, Mail } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({
    telefono: "",
    direccion_exacta: "",
  });
  const [originalTelefono, setOriginalTelefono] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [telefonoCambiado, setTelefonoCambiado] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/mi-cuenta/login";
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("No autenticado");
      const data = await res.json();
      setUser(data);
      setOriginalTelefono(data.telefono || "");
      setForm({
        telefono: data.telefono || "",
        direccion_exacta: data.direccion_exacta || "",
      });
    } catch (err) {
      setError("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setTelefonoCambiado(false);
    setSaving(true);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Sesión expirada");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al guardar");
      }

      // Detectar si cambió el teléfono
      if (form.telefono !== originalTelefono) {
        setTelefonoCambiado(true);
        setSuccess("¡Teléfono actualizado! Deberás iniciar sesión nuevamente.");

        // Cerrar sesión y redirigir después de 4 segundos
        localStorage.removeItem("access_token");
        setTimeout(() => {
          window.location.href = "/fenix/mi-cuenta/login";
        }, 4000);
      } else {
        setSuccess("¡Datos actualizados correctamente!");
        setTimeout(() => setSuccess(""), 3000);
        cargarPerfil(); // Recargar datos
      }
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-2xl font-bold text-orange-600 animate-pulse">
          Cargando perfil...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <p className="text-xl text-gray-600">No se pudo cargar el perfil</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/fenix/mi-cuenta" className="p-3 bg-white rounded-full shadow-lg">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Mi Perfil</h1>
        </div>

        {/* Avatar y nombre */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 text-center">
          <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-5xl font-black shadow-2xl mx-auto mb-4">
            {user.nombres?.[0]?.toUpperCase() || "U"}
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            {user.nombres} {user.apellidos}
          </h2>
          <p className="text-gray-600 mt-2">{user.telefono}</p>
          {user.email && <p className="text-sm text-gray-500 mt-1">{user.email}</p>}
        </div>

        {/* Información personal - solo lectura */}
        <div className="bg-gray-50 rounded-3xl p-6 mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Nombre completo</p>
              <p className="font-bold text-gray-900">{user.nombres} {user.apellidos}</p>
            </div>
          </div>

          {user.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-bold text-gray-900">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Ubicación</p>
              <p className="font-bold text-gray-900">
                {user.municipio}, {user.departamento}
              </p>
            </div>
          </div>
        </div>

        {/* Campos editables */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h3 className="text-xl font-black mb-6">Editar información de contacto</h3>

          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          {(success && !telefonoCambiado) && (
            <div className="bg-green-100 text-green-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-bold">{success}</p>
            </div>
          )}

          {telefonoCambiado && (
            <div className="bg-orange-100 text-orange-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-3">
              <LogOut className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold">Has cambiado tu número de teléfono</p>
                <p className="text-sm">Deberás iniciar sesión nuevamente con tu misma contraseña usando el nuevo número.</p>
                <p className="text-sm mt-2">Redirigiendo al login en 4 segundos...</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Teléfono editable */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-600" />
                <input
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  placeholder="Ej: 99751480"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-100 border border-gray-300 focus:border-orange-600 outline-none"
                />
              </div>
            </div>

            {/* Dirección editable */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Dirección exacta
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-5 w-5 h-5 text-orange-600" />
                <textarea
                  name="direccion_exacta"
                  value={form.direccion_exacta}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Calle, casa, colonia, referencias..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-100 border border-gray-300 focus:border-orange-600 outline-none resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || telefonoCambiado}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:shadow-2xl transition disabled:opacity-70 flex items-center justify-center gap-3"
            >
              <Save className="w-6 h-6" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}