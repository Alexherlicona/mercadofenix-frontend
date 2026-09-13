// src/app/vendedor/dashboard/perfil/page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Camera, Save, LogOut, ArrowLeft,
  Phone, Mail, MapPin, Truck, CreditCard,
  Lock, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, Map, User, Building2, ChevronRight
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function hdr() { return { Authorization: `Bearer ${localStorage.getItem("vendedor_token") || ""}` }; }

const inp = "w-full px-4 py-3 bg-[#0f0f1e] border border-[#1e1e30] focus:border-orange-500/50 focus:bg-[#141428] rounded-2xl text-white text-sm placeholder-gray-600 outline-none transition";
const inpRO = "w-full px-4 py-3 bg-[#0a0a14] border border-[#141420] rounded-2xl text-gray-500 text-sm cursor-not-allowed select-none";

const METODOS_PAGO = ["Efectivo", "Transferencia bancaria", "Tigo Money", "Todos los métodos"];
const METODOS_ENTREGA = ["Delivery propio", "Recogida en tienda", "Envío por encomienda", "Delivery + Recogida"];

function Campo({ label, children, hint, locked }: {
  label: string; children: React.ReactNode; hint?: string; locked?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
        {locked && (
          <span className="flex items-center gap-1 text-[10px] text-gray-700 bg-[#0f0f1e] border border-[#1a1a2e] px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> No editable
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
    </div>
  );
}

export default function MiPerfilPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [vendedor,  setVendedor]  = useState<any>(null);
  const [preview,   setPreview]   = useState("");
  const [logo,      setLogo]      = useState<File | null>(null);
  const [form,      setForm]      = useState({
    nombre_tienda:    "",
    propietario:      "",
    telefono:         "",
    municipio:        "",
    direccion_exacta: "",
    email:            "",
    google_maps_url:  "",
    tipo_pago:        "",
    tipo_entrega:     "",
  });
  const [guardando, setGuardando] = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const tk = localStorage.getItem("vendedor_token");
    if (!tk) { router.replace("/vendedor"); return; }
    fetch(`${API}/api/vendedor/me`, { headers: hdr() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { router.replace("/vendedor"); return; }
        setVendedor(d);
        setForm({
          nombre_tienda:    d.nombre_tienda    || "",
          propietario:      d.propietario      || "",
          telefono:         d.telefono         || "",
          municipio:        d.municipio        || "",
          direccion_exacta: d.direccion_exacta || "",
          email:            d.email            || "",
          google_maps_url:  d.google_maps_url  || "",
          tipo_pago:        d.tipo_pago        || "",
          tipo_entrega:     d.tipo_entrega     || "",
        });
        if (d.logo_url) setPreview(`${API}${d.logo_url}`);
      });
  }, []);

  const mostrarToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, String(v)); });
      if (logo) fd.append("logo", logo);

      const res = await fetch(`${API}/api/vendedor/perfil`, {
        method: "PUT", headers: hdr(), body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al guardar");
      mostrarToast("Perfil actualizado correctamente", true);
      setLogo(null);
    } catch (e: any) {
      mostrarToast(e.message || "Error al guardar", false);
    } finally {
      setGuardando(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("vendedor_token");
    router.push("/vendedor");
  };

  if (!vendedor) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto pb-10 space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold border
          ${toast.ok ? "bg-[#0a1f14] border-emerald-500/30 text-emerald-300" : "bg-[#1f0a0a] border-red-500/30 text-red-300"}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/vendedor/dashboard")}
          className="p-2 rounded-xl hover:bg-[#1a1a2e] transition text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-black text-white">Mi perfil</h1>
          <p className="text-xs text-gray-600">Actualiza los datos de tu tienda</p>
        </div>
      </div>

      <form onSubmit={guardar} className="space-y-5">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-5 bg-[#0f0f1a] border border-[#1a1a2e] rounded-3xl p-5">
          <div className="relative flex-shrink-0 cursor-pointer group" onClick={() => fileRef.current?.click()}>
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center shadow-lg">
              {preview
                ? <img src={preview.startsWith("http") ? preview : `${API}${preview}`} className="w-full h-full object-cover" />
                : <Store className="w-8 h-8 text-white" />}
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="w-6 h-6 text-white" />
            </div>
            {logo && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-[#0f0f1a]" />
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setLogo(f); setPreview(URL.createObjectURL(f)); }
              }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-base truncate">{vendedor.nombre_tienda}</p>
            <p className="text-gray-500 text-xs mt-0.5">{vendedor.departamento}, {vendedor.municipio}</p>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="mt-2 text-xs text-orange-400 font-semibold hover:text-orange-300 transition flex items-center gap-1">
              <Camera className="w-3 h-3" /> Cambiar logo
            </button>
          </div>
        </div>

        {/* ── Datos bloqueados (solo lectura) ───────────────────────────── */}
        <div className="bg-[#0a0a14] border border-[#141420] rounded-3xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Datos de identidad — no editables
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo label="DNI" locked>
              <div className={inpRO}>{vendedor.dni}</div>
            </Campo>
            <Campo label="RTN" locked>
              <div className={inpRO}>{vendedor.rtn || "No registrado"}</div>
            </Campo>
          </div>
          <Campo label="Departamento" locked>
            <div className={inpRO}>{vendedor.departamento}</div>
          </Campo>
          <p className="text-[10px] text-gray-700 leading-relaxed">
            Estos datos fueron verificados al registrarte. Para cambiarlos contacta al soporte.
          </p>
        </div>

        {/* ── Datos editables ────────────────────────────────────────────── */}
        <div className="bg-[#0f0f1a] border border-[#1a1a2e] rounded-3xl p-5 space-y-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Información de la tienda</p>

          <Campo label="Nombre de la tienda">
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <input value={form.nombre_tienda} onChange={e => setForm(p => ({...p, nombre_tienda: e.target.value}))}
                required placeholder="Nombre de tu tienda"
                className={inp + " pl-10"} />
            </div>
          </Campo>

          <Campo label="Nombre del propietario">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <input value={form.propietario} onChange={e => setForm(p => ({...p, propietario: e.target.value}))}
                required placeholder="Tu nombre completo"
                className={inp + " pl-10"} />
            </div>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Teléfono">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input value={form.telefono}
                  onChange={e => setForm(p => ({...p, telefono: e.target.value.replace(/\D/g,"").slice(0,8)}))}
                  required placeholder="9XXXXXXX" maxLength={8}
                  className={inp + " pl-10"} />
              </div>
            </Campo>
            <Campo label="Correo electrónico">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                  type="email" placeholder="correo@..."
                  className={inp + " pl-10"} />
              </div>
            </Campo>
          </div>

          <Campo label="Municipio">
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <input value={form.municipio} onChange={e => setForm(p => ({...p, municipio: e.target.value}))}
                required placeholder="Municipio"
                className={inp + " pl-10"} />
            </div>
          </Campo>

          <Campo label="Dirección exacta">
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <input value={form.direccion_exacta} onChange={e => setForm(p => ({...p, direccion_exacta: e.target.value}))}
                required placeholder="Colonia, calle, casa..."
                className={inp + " pl-10"} />
            </div>
          </Campo>
        </div>

        {/* ── Ubicación Google Maps ──────────────────────────────────────── */}
        <div className="bg-[#0f0f1a] border border-[#1a1a2e] rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ubicación en Google Maps</p>
            {form.google_maps_url && (
              <a href={form.google_maps_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition">
                <ExternalLink className="w-3 h-3" /> Ver mapa
              </a>
            )}
          </div>

          <Campo label="Enlace de Google Maps"
            hint="Abre Google Maps → busca tu tienda → comparte → copia el enlace corto (https://maps.app.goo.gl/...)">
            <div className="relative">
              <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <input value={form.google_maps_url} onChange={e => setForm(p => ({...p, google_maps_url: e.target.value}))}
                placeholder="https://maps.app.goo.gl/..."
                className={inp + " pl-10"} />
            </div>
          </Campo>

          {/* Guía visual compacta */}
          <div className="bg-blue-950/30 border border-blue-500/15 rounded-2xl p-3.5 space-y-2">
            <p className="text-xs font-bold text-blue-400">¿Cómo obtener tu enlace?</p>
            {[
              "Abre Google Maps en tu teléfono",
              "Busca tu tienda o ubícala en el mapa",
              'Toca "Compartir" → "Copiar enlace"',
              "Pega el enlace aquí",
            ].map((paso, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-xs text-blue-300/70">{paso}</p>
              </div>
            ))}
          </div>

          {/* Preview mini si tiene URL */}
          {form.google_maps_url && (
            <a href={form.google_maps_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-emerald-900/20 border border-emerald-500/20 rounded-2xl hover:border-emerald-500/40 transition group">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-300">Ubicación configurada</p>
                <p className="text-[10px] text-emerald-700 truncate">{form.google_maps_url}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-400 transition" />
            </a>
          )}
        </div>

        {/* ── Métodos de pago y entrega ──────────────────────────────────── */}
        <div className="bg-[#0f0f1a] border border-[#1a1a2e] rounded-3xl p-5 space-y-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Métodos aceptados</p>

          <Campo label="Método de pago">
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <select value={form.tipo_pago} onChange={e => setForm(p => ({...p, tipo_pago: e.target.value}))}
                className={inp + " pl-10 appearance-none"}>
                <option value="">Seleccionar...</option>
                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none rotate-90" />
            </div>
          </Campo>

          <Campo label="Método de entrega">
            <div className="relative">
              <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <select value={form.tipo_entrega} onChange={e => setForm(p => ({...p, tipo_entrega: e.target.value}))}
                className={inp + " pl-10 appearance-none"}>
                <option value="">Seleccionar...</option>
                {METODOS_ENTREGA.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none rotate-90" />
            </div>
          </Campo>
        </div>

        {/* ── Botones ────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <button type="submit" disabled={guardando}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-white font-black rounded-2xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-orange-900/20">
            {guardando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> Guardar cambios</>}
          </button>

          <button type="button" onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#0f0f1a] border border-[#1a1a2e] hover:border-red-500/30 hover:text-red-400 text-gray-500 font-semibold rounded-2xl text-sm transition-all">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}