"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Store, Upload, CheckCircle, MapPin, Phone, Mail, Lock,
  AlertCircle, Eye, EyeOff, IdCard, Link, Info, X, Loader2, Check
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEPARTAMENTOS = [
  { nombre: "Atlántida",         municipios: ["La Ceiba","Tela","Jutiapa","Arizona","El Porvenir","Esparta","La Masica","San Francisco"] },
  { nombre: "Colón",             municipios: ["Trujillo","Tocoa","Sabá","Sonaguera","Balfate","Iriona","Limón","Santa Fe","Santa Rosa de Aguán","Bonito Oriental"] },
  { nombre: "Comayagua",         municipios: ["Comayagua","Siguatepeque","La Libertad","Ajuterique","El Rosario","Esquías","Taulabé","Villa de San Antonio"] },
  { nombre: "Copán",             municipios: ["Santa Rosa de Copán","La Entrada","Dulce Nombre","Nueva Arcadia","Copán Ruinas","Florida","La Jigua"] },
  { nombre: "Cortés",            municipios: ["San Pedro Sula","Puerto Cortés","Choloma","La Lima","Villanueva","Omoa","Pimienta","Potrerillos","Santa Cruz de Yojoa"] },
  { nombre: "Choluteca",         municipios: ["Choluteca","Pespire","San Marcos de Colón","El Corpus","Concepción de María","Morolica","Santa Ana de Yusguare"] },
  { nombre: "El Paraíso",        municipios: ["Yuscarán","Danlí","El Paraíso","Teupasenti","Jacaleapa","Morocelí","Texiguat","San Lucas"] },
  { nombre: "Francisco Morazán", municipios: ["Tegucigalpa","Comayagüela","Sabana Grande","Santa Lucía","Valle de Ángeles","San Juan de Flores","Ojojona","Lepaterique"] },
  { nombre: "Gracias a Dios",    municipios: ["Puerto Lempira","Brus Laguna","Juan Francisco Bulnes","Ramón Villeda Morales"] },
  { nombre: "Intibucá",          municipios: ["La Esperanza","Jesús de Otoro","Yamaranguila","San Marcos de la Sierra","Santa Lucía"] },
  { nombre: "Islas de la Bahía", municipios: ["Roatán","Guanaja","José Santos Guardiola","Utila"] },
  { nombre: "La Paz",            municipios: ["La Paz","Marcala","Cabañas","Cane","Chinacla","San José"] },
  { nombre: "Lempira",           municipios: ["Gracias","Erandique","La Campa","Las Flores","Mapulaca","Talgua","Valladolid"] },
  { nombre: "Ocotepeque",        municipios: ["Ocotepeque","Sinuapa","San Marcos","Concepción","La Encarnación"] },
  { nombre: "Olancho",           municipios: ["Juticalpa","Catacamas","Campamento","Dulce Nombre de Culmí","Salamá","San Esteban"] },
  { nombre: "Santa Bárbara",     municipios: ["Santa Bárbara","Trinidad","Arada","Las Vegas","Quimistán","San Luis","Petoa"] },
  { nombre: "Valle",             municipios: ["Nacaome","San Lorenzo","Amapala","Aramecina","Caridad","Goascorán","Langue"] },
  { nombre: "Yoro",              municipios: ["Yoro","Olanchito","El Progreso","Morazán","El Negrito","Santa Rita","Jocón","Sulaco"] },
];

const getErrorMessage = (err: any): string => {
  if (!err.response) return "Sin conexión a internet";
  const data = err.response.data;
  if (typeof data === "string") return data;
  if (data?.detail && typeof data.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map((e: any) => e.msg || "").join(". ");
  return "Error al registrar";
};

// ── Códigos temporales de DNI/RTN ─────────────────────────────────────────────
// Por ahora no le pedimos estos documentos al vendedor: se autogenera un
// código numérico (13 dígitos para DNI, 14 para RTN) para no romper el
// backend, que todavía espera estos campos. El día que se quiera pedirlos
// de nuevo, basta con poner MOSTRAR_DNI_RTN en true.
const MOSTRAR_DNI_RTN = false;
function generarCodigoNumerico(largo: number) {
  let s = "";
  for (let i = 0; i < largo; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// ── Verificación de documento de identidad ────────────────────────────────────
// Oculta y opcional por ahora — se deja todo el código listo (estado, input,
// validación) para reactivarla en el futuro con solo poner esto en true.
const MOSTRAR_VERIFICACION_DOCUMENTO = false;

// ── Indicador de fortaleza de contraseña ─────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 12,
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Muy débil", "Débil", "Regular", "Fuerte", "Muy fuerte"];
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500", "bg-emerald-400"];
  const textColors = ["", "text-red-600", "text-orange-600", "text-yellow-600", "text-emerald-600", "text-emerald-600"];
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? colors[score] : "bg-gray-200"}`} />
        ))}
      </div>
      <p className={`text-xs font-semibold ${textColors[score]}`}>
        {labels[score]}
        {score < 3 && " — agrega mayúsculas, números o símbolos"}
      </p>
    </div>
  );
}

// ── Campo de formulario estilizado ────────────────────────────────────────────
function Campo({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500">*</span>}
        {hint && (
          <span className="group relative">
            <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
            <span className="absolute left-0 bottom-5 w-52 bg-gray-900 text-white/90 text-xs rounded-xl px-3 py-2 shadow-lg z-20
              opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {hint}
            </span>
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// ── Indicador de pasos ────────────────────────────────────────────────────────
function PasoIndicador({ actual }: { actual: number }) {
  const pasos = ["Datos personales", "Ubicación", "Servicios"];
  return (
    <div className="flex items-center mb-8">
      {pasos.map((p, i) => {
        const n = i + 1;
        const activo = actual === n;
        const completado = actual > n;
        return (
          <div key={p} className={`flex items-center ${i < pasos.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${completado ? "bg-emerald-500 text-white" : activo ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                {completado ? <Check className="w-4 h-4" /> : n}
              </div>
              <span className={`text-[10px] font-semibold text-center whitespace-nowrap
                ${activo ? "text-orange-600" : completado ? "text-emerald-600" : "text-gray-400"}`}>{p}</span>
            </div>
            {i < pasos.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${actual > n ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inp = "w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-orange-500 transition-all";

// ════════════════════════════════════════════════════════════════════════════
export default function RegistroVendedor() {
  const [form, setForm] = useState({
    dni: "", rtn: "", propietario: "", nombre_tienda: "",
    telefono: "", email: "",
    departamento: "", municipio: "", direccion_exacta: "",
    tipo_pago: "", tipo_entrega: "", password: "",
    latitud: "", longitud: "", google_maps_url: "",
  });
  const [logo,       setLogo]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [documento,  setDocumento]  = useState<File | null>(null);
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [mapsError,  setMapsError]  = useState("");
  const [step,       setStep]       = useState(1);
  const router = useRouter();
  const docInputRef = useRef<HTMLInputElement>(null);

  // Autogenerar DNI/RTN mientras no se le pidan al vendedor
  useEffect(() => {
    setForm(p => ({ ...p, dni: generarCodigoNumerico(13), rtn: generarCodigoNumerico(14) }));
  }, []);

  const municipios = DEPARTAMENTOS.find(d => d.nombre === form.departamento)?.municipios || [];
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Extraer coordenadas de un link de Google Maps ─────────────────────────
  const parsearMapsUrl = (url: string) => {
    setMapsError("");
    setForm(p => ({ ...p, google_maps_url: url }));
    if (!url) return;

    // Formato: @lat,lng o /@lat,lng o ?q=lat,lng
    const patrones = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /\?q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /place\/.+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const regex of patrones) {
      const m = url.match(regex);
      if (m) {
        setForm(p => ({ ...p, latitud: m[1], longitud: m[2], google_maps_url: url }));
        return;
      }
    }
    if (url.startsWith("http")) {
      setMapsError("No se pudo extraer las coordenadas. Asegúrate de copiar el link completo de Google Maps con @lat,lng.");
    }
  };

  // ── Validación por paso ────────────────────────────────────────────────────
  const validarPaso = (n: number) => {
    if (n === 1) {
      if (!form.propietario || !form.nombre_tienda || form.telefono.length < 8 || !form.email) {
        setError("Completa todos los campos obligatorios de datos personales.");
        return false;
      }
    }
    if (n === 2) {
      if (!form.departamento || !form.municipio || !form.direccion_exacta) {
        setError("Completa la ubicación de tu tienda.");
        return false;
      }
    }
    if (MOSTRAR_VERIFICACION_DOCUMENTO && n === 3 && !documento) {
      setError("Debes subir una foto de tu documento de identidad (DNI o pasaporte).");
      return false;
    }
    return true;
  };

  const siguiente = () => {
    if (!validarPaso(step)) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setError("");
    setStep(s => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const atras = () => {
    setError("");
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Mientras estemos en un paso intermedio, "enviar" (Enter) solo avanza
    if (step < 3) { siguiente(); return; }
    if (!validarPaso(3)) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }

    setLoading(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (documento) fd.append("documento_identidad", documento);
    if (logo) fd.append("logo", logo);

    try {
      await axios.post(`${API_URL}/api/vendedor/register`, fd);
      setSuccess(true);
      setTimeout(() => router.push("/vendedor"), 4000);
    } catch (err: any) {
      setError(getErrorMessage(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">¡Solicitud enviada!</h2>
          <p className="text-gray-500 leading-relaxed text-sm">
            Recibimos tu registro. El administrador revisará tu información y aprobará tu tienda.
            Te notificaremos cuando esté activa.
          </p>
          <p className="text-orange-600 text-xs mt-5 font-semibold animate-pulse">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 p-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-purple-600">
            REGISTRA TU TIENDA
          </h1>
          <p className="text-gray-500 mt-2 text-base">Mercado Fénix Honduras</p>
        </div>

        <PasoIndicador actual={step} />

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Error global */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              {error}
            </div>
          )}

          {/* ══════════════════════════ PASO 1 — DATOS PERSONALES ══════════════════════════ */}
          {step === 1 && (<>

            {/* LOGO (opcional) */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <p className="text-sm font-bold text-gray-900 mb-4">Logo de la tienda <span className="text-gray-400 font-normal">(opcional)</span></p>
              <div className="flex items-center gap-5">
                <label className="cursor-pointer group flex-shrink-0">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setLogo(f); setLogoPreview(URL.createObjectURL(f)); }
                    }} />
                  {logoPreview ? (
                    <div className="relative w-20 h-20">
                      <img src={logoPreview} alt="Logo" className="w-20 h-20 object-cover rounded-2xl border-2 border-orange-400" />
                      <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl flex flex-col items-center justify-center gap-1 transition group-hover:bg-orange-50">
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-orange-500 transition" />
                      <span className="text-[10px] text-gray-500 font-semibold">Logo</span>
                    </div>
                  )}
                </label>
                <p className="text-xs text-gray-500 leading-relaxed">Sube el logo de tu tienda. Aparecerá en tus productos y en el perfil de tu tienda.</p>
              </div>
            </div>

            {/* Documento de identidad — oculto y opcional por ahora */}
            {MOSTRAR_VERIFICACION_DOCUMENTO && (
              <div className="bg-white border-2 border-dashed border-amber-300 rounded-3xl p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <IdCard className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">Foto del documento de identidad</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      DNI, pasaporte o carné de residencia. Solo el administrador podrá ver este documento.
                    </p>
                  </div>
                </div>

                {documento ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-semibold truncate">{documento.name}</p>
                      <p className="text-xs text-emerald-600">{(documento.size / 1024).toFixed(0)} KB · Documento cargado</p>
                    </div>
                    <button type="button" onClick={() => setDocumento(null)}
                      className="text-gray-400 hover:text-red-500 transition flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer w-full px-4 py-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl transition group">
                    <input ref={docInputRef} type="file" accept="image/*,.pdf" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) setDocumento(e.target.files[0]); }} />
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Upload className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-700">Seleccionar documento</p>
                      <p className="text-xs text-amber-600/80">JPG, PNG, WEBP o PDF · Máx. 10 MB</p>
                    </div>
                  </label>
                )}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 shadow-sm">
              <p className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Datos personales y de la tienda</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* DNI y RTN — ocultos y autogenerados por ahora */}
                {MOSTRAR_DNI_RTN && (<>
                  <Campo label="DNI" required hint="13 dígitos sin guiones">
                    <input required maxLength={13} placeholder="0801XXXXXXXXXXXX" value={form.dni}
                      onChange={e => setForm(p => ({ ...p, dni: e.target.value.replace(/\D/g, "").slice(0, 13) }))}
                      className={inp} />
                  </Campo>

                  <Campo label="RTN" required hint="14 dígitos (Registro Tributario Nacional)">
                    <input required maxLength={14} placeholder="08010100XXXXXX" value={form.rtn}
                      onChange={e => setForm(p => ({ ...p, rtn: e.target.value.replace(/\D/g, "").slice(0, 14) }))}
                      className={inp} />
                  </Campo>
                </>)}

                <Campo label="Nombre del propietario" required>
                  <input required placeholder="Juan Carlos García" value={form.propietario} onChange={set("propietario")} className={inp} />
                </Campo>

                <Campo label="Nombre de la tienda" required>
                  <input required placeholder="Tienda El Fénix" value={form.nombre_tienda} onChange={set("nombre_tienda")} className={inp} />
                </Campo>

                <Campo label="Teléfono" required hint="8 dígitos, sin guiones ni espacios">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                    <input required maxLength={8} placeholder="98XXXXXX" value={form.telefono}
                      onChange={e => setForm(p => ({ ...p, telefono: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                      className={inp + " pl-10"} />
                  </div>
                </Campo>

                <Campo label="Correo electrónico" required hint="Se usará para iniciar sesión también">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                    <input required type="email" placeholder="correo@gmail.com" value={form.email} onChange={set("email")}
                      className={inp + " pl-10"} />
                  </div>
                </Campo>
              </div>
            </div>
          </>)}

          {/* ══════════════════════════ PASO 2 — UBICACIÓN ══════════════════════════ */}
          {step === 2 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 shadow-sm">
              <p className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" /> Ubicación de la tienda
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Departamento" required>
                  <select required value={form.departamento}
                    onChange={e => setForm(p => ({ ...p, departamento: e.target.value, municipio: "" }))}
                    className={inp + " appearance-none"}>
                    <option value="">Seleccionar...</option>
                    {DEPARTAMENTOS.map(d => <option key={d.nombre} value={d.nombre}>{d.nombre}</option>)}
                  </select>
                </Campo>

                <Campo label="Municipio" required>
                  <select required value={form.municipio} onChange={set("municipio")} disabled={!form.departamento}
                    className={inp + " appearance-none disabled:opacity-50"}>
                    <option value="">{form.departamento ? "Seleccionar..." : "Elige departamento primero"}</option>
                    {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Campo>
              </div>

              <Campo label="Dirección exacta" required hint="Colonia, calle, número, referencia">
                <textarea required rows={2} placeholder="Col. Kennedy, calle principal, frente al parque..." value={form.direccion_exacta}
                  onChange={set("direccion_exacta")}
                  className={inp + " resize-none"} />
              </Campo>

              {/* Google Maps */}
              <Campo label="Ubicación en Google Maps" hint="Pega el link de tu tienda en Google Maps para que los clientes puedan encontrarte">
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                  <input type="url" placeholder="https://maps.google.com/..." value={form.google_maps_url}
                    onChange={e => parsearMapsUrl(e.target.value)}
                    className={inp + " pl-10"} />
                </div>
                {mapsError && <p className="text-xs text-amber-600 mt-1">{mapsError}</p>}
                {form.latitud && form.longitud && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Coordenadas detectadas: {parseFloat(form.latitud).toFixed(5)}, {parseFloat(form.longitud).toFixed(5)}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Abre Google Maps → busca tu tienda → clic en "Compartir" → copia el link. Las coordenadas se extraen automáticamente.
                </p>
              </Campo>
            </div>
          )}

          {/* ══════════════════════════ PASO 3 — SERVICIOS ══════════════════════════ */}
          {step === 3 && (<>
            <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 shadow-sm">
              <p className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Servicios que ofreces</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Métodos de pago que aceptas" required>
                  <select required value={form.tipo_pago} onChange={set("tipo_pago")} className={inp + " appearance-none"}>
                    <option value="">Seleccionar...</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="tigo">Tigo Money</option>
                    <option value="efectivo,transferencia">Efectivo y transferencia</option>
                    <option value="efectivo,transferencia,tigo">Todos los métodos</option>
                  </select>
                </Campo>
                <Campo label="Tipo de entrega" required>
                  <select required value={form.tipo_entrega} onChange={set("tipo_entrega")} className={inp + " appearance-none"}>
                    <option value="">Seleccionar...</option>
                    <option value="domicilio">Entrega a domicilio</option>
                    <option value="tienda">Recoger en tienda</option>
                    <option value="ambos">Ambos servicios</option>
                  </select>
                </Campo>
              </div>
            </div>

            {/* CONTRASEÑA */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-3 shadow-sm">
              <p className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-500" /> Contraseña
              </p>
              <Campo label="Contraseña de acceso" required hint="Mínimo 8 caracteres. Usa mayúsculas, números y símbolos.">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                  <input required type={showPass ? "text" : "password"} placeholder="Contraseña segura"
                    value={form.password} onChange={set("password")}
                    className={inp + " pl-10 pr-12"} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={form.password} />
              </Campo>
            </div>

            {/* AVISO LEGAL */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3.5">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Al registrarte aceptas los términos de uso de Mercado Fénix. Tu información personal es confidencial
                y no será compartida con terceros.
              </p>
            </div>
          </>)}

          {/* ── Navegación entre pasos ─────────────────────────────────────── */}
          <div className="flex gap-3">
            {step > 1 && (
              <button type="button" onClick={atras}
                className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-600 font-bold py-4 rounded-2xl transition-all">
                ← Atrás
              </button>
            )}

            {step < 3 ? (
              <button type="button" onClick={siguiente}
                className="flex-[2] bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500
                  text-black font-black text-base py-4 rounded-2xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]">
                Siguiente →
              </button>
            ) : (
              <button type="submit" disabled={loading}
                className="flex-[2] bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500
                  text-black font-black text-base py-4 rounded-2xl shadow-lg
                  flex items-center justify-center gap-3
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:scale-[1.01] active:scale-[0.99] transition-all">
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando solicitud...</>
                  : <><Store className="w-5 h-5" /> Registrar mi tienda</>}
              </button>
            )}
          </div>

          <div className="text-center">
            <button type="button" onClick={() => router.push("/vendedor")}
              className="text-gray-400 text-sm hover:text-gray-600 transition">
              ← Ya tengo cuenta, iniciar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}