// src/app/fenix/mi-cuenta/reportar-tienda/page.tsx
"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, Store, Package, Wrench, HelpCircle,
  Upload, X, CheckCircle2, ChevronLeft, Loader2,
  AlertCircle, Camera
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Tipos de reporte ──────────────────────────────────────────────────────────
const TIPOS = [
  {
    v: "tienda",
    label: "Tienda / Vendedor",
    icon: Store,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    desc: "Comportamiento inapropiado, estafa, vendedor no responde",
  },
  {
    v: "producto",
    label: "Producto",
    icon: Package,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    desc: "Producto de mala calidad, no coincide con la descripción",
  },
  {
    v: "servicio",
    label: "Servicio / Entrega",
    icon: Wrench,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    desc: "Problemas con la entrega, mal servicio al cliente",
  },
  {
    v: "otro",
    label: "Otro",
    icon: HelpCircle,
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/30",
    desc: "Cualquier otro tipo de problema",
  },
] as const;

const PRIORIDADES = [
  { v: "baja",    label: "Baja",    color: "text-gray-400",   desc: "Inconveniente menor" },
  { v: "normal",  label: "Normal",  color: "text-blue-400",   desc: "Problema que afecta la experiencia" },
  { v: "alta",    label: "Alta",    color: "text-amber-400",  desc: "Problema serio, perdí dinero" },
  { v: "urgente", label: "Urgente", color: "text-red-400",    desc: "Posible estafa o fraude" },
] as const;

// ── Campo de texto estilizado ─────────────────────────────────────────────────
function Campo({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-black flex items-center gap-1">
        {label}{required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const inp = "w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm text-gray-900 placeholder-gray-400 outline-none bg-white border-2: bg-gray-100 border-2 border-gray-200 hover:bg-gra-50 hover:border-orange-400";

// ════════════════════════════════════════════════════════════════════════════
// Contenido real de la página. Usa useSearchParams, por eso debe ir
// envuelto en <Suspense> desde el export default de abajo.
function ReportarTiendaContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [paso,        setPaso]        = useState<1 | 2 | 3>(1);
  const [tipo,        setTipo]        = useState<string>(params.get("tipo") || "");
  const [prioridad,   setPrioridad]   = useState("normal");
  const [vendedorDni, setVendedorDni] = useState(params.get("vendedor") || "");
  const [vendedorNom, setVendedorNom] = useState(params.get("tienda")   || "");
  const [titulo,      setTitulo]      = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nombre,      setNombre]      = useState("");
  const [email,       setEmail]       = useState("");
  const [evidencia,   setEvidencia]   = useState<File | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [enviando,    setEnviando]    = useState(false);
  const [exito,       setExito]       = useState(false);
  const [error,       setError]       = useState("");

  // Prellenar con datos del cliente logueado si aplica
  useEffect(() => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("cliente_token");
    if (!token) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setNombre(`${data.nombres || ""} ${data.apellidos || ""}`.trim());
        setEmail(data.email || "");
      })
      .catch(() => {});
  }, []);

  const seleccionarEvidencia = (f: File) => {
    setEvidencia(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const enviar = async () => {
    if (!tipo || !titulo.trim() || descripcion.trim().length < 20) {
      setError("Completa todos los campos obligatorios (descripción mínimo 20 caracteres)");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("tipo_reporte", tipo);
      fd.append("titulo",       titulo.trim());
      fd.append("descripcion",  descripcion.trim());
      fd.append("prioridad",    prioridad);
      if (vendedorDni) fd.append("vendedor_dni", vendedorDni);
      if (nombre)      fd.append("nombre",       nombre);
      if (email)       fd.append("email",        email);
      if (evidencia)   fd.append("evidencia",    evidencia);

      const token = localStorage.getItem("access_token") || localStorage.getItem("cliente_token") || "";
      const res = await fetch(`${API}/api/reportes`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Error al enviar");
      }
      setExito(true);
    } catch (e: any) {
      setError(e.message || "Error al enviar el reporte");
    } finally {
      setEnviando(false);
    }
  };

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (exito) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Reporte enviado</h2>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed">
            Nuestro equipo revisará tu reporte y tomará las medidas necesarias.
            Te contactaremos si necesitamos más información.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => router.push("/fenix")}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-2xl text-sm transition hover:opacity-90">
            Volver al inicio
          </button>
          <button onClick={() => { setExito(false); setPaso(1); setTipo(""); setTitulo(""); setDescripcion(""); setEvidencia(null); setPreview(null); }}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-2xl text-sm transition">
            Enviar otro reporte
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-black pb-10">

      {/* Header */}
      <div className="sticky top-0 bg-white backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => paso > 1 ? setPaso(p => (p - 1) as any) : router.back()}
            className="p-2 rounded-xl hover:bg-white/5 transition">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-white text-base">Reportar un problema</h1>
            <p className="text-xs text-gray-500">Paso {paso} de 3</p>
          </div>
          {/* Barra de progreso */}
          <div className="flex gap-1">
            {[1,2,3].map(p => (
              <div key={p} className={`h-1.5 rounded-full transition-all ${p <= paso ? "bg-orange-500 w-8" : "bg-gray-700 w-4"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-6">

        {/* ── PASO 1: Tipo de reporte ──────────────────────────────────── */}
        {paso === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-orange-500">¿Qué quieres reportar?</h2>
              <p className="text-sm text-gray-500 mt-1">Selecciona la categoría que mejor describe tu problema.</p>
            </div>

            <div className="space-y-2.5">
              {TIPOS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.v} onClick={() => setTipo(t.v)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all
                      ${tipo === t.v ? t.bg : "bg-gray-50 border-gray-200 hover:border-orange-500"}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                      ${tipo === t.v ? t.bg : "bg-gray-50"}`}>
                      <Icon className={`w-5 h-5 ${tipo === t.v ? t.color : "text-orange-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${tipo === t.v ? "text-black" : "text-orange-500"}`}>{t.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                    </div>
                    {tipo === t.v && (
                      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${t.color}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-orange-500">Nivel de urgencia</p>
              <div className="grid grid-cols-2 gap-2">
                {PRIORIDADES.map(p => (
                  <button key={p.v} onClick={() => setPrioridad(p.v)}
                    className={`px-3 py-2.5 rounded-xl border-2 text-left transition-all
                      ${prioridad === p.v ? "border-current bg-white/5" : "border-gray-200 hover:border-orange-500"}`}
                    style={prioridad === p.v ? { borderColor: p.color.replace("text-","").replace("-400","") === "red" ? "#f87171" : p.color.includes("amber") ? "#fbbf24" : p.color.includes("blue") ? "#60a5fa" : "#9ca3af" } : {}}>
                    <p className={`text-xs font-bold ${prioridad === p.v ? p.color : "text-orange-500"}`}>{p.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { if (!tipo) { setError("Selecciona un tipo de reporte"); return; } setError(""); setPaso(2); }}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98]">
              Continuar →
            </button>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </div>
        )}

        {/* ── PASO 2: Detalles ─────────────────────────────────────────── */}
        {paso === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-orange-500">Cuéntanos qué pasó</h2>
              <p className="text-sm text-gray-500 mt-1">Sé específico para que podamos ayudarte mejor.</p>
            </div>

            {/* Tienda */}
            {(tipo === "tienda" || tipo === "producto" || tipo === "servicio") && (
              <Campo label="Nombre de la tienda" hint="Escribe el nombre del vendedor o tienda involucrada">
                <input value={vendedorNom} onChange={e => setVendedorNom(e.target.value)}
                  placeholder="Ej: Tienda El Fénix"
                  className={inp} />
              </Campo>
            )}

            <Campo label="Título del reporte" required hint="Un resumen corto del problema">
              <input value={titulo} onChange={e => setTitulo(e.target.value)}
                maxLength={200}
                placeholder="Ej: El vendedor no entregó mi pedido y no responde"
                className={inp} />
              <p className="text-[10px] text-gray-600 text-right">{titulo.length}/200</p>
            </Campo>

            <Campo label="Descripción detallada" required hint="Mínimo 20 caracteres. Incluye fechas, montos y cualquier detalle relevante.">
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                rows={5} placeholder="Describe el problema con el mayor detalle posible..."
                className={inp + " resize-none"} />
              <p className={`text-[10px] text-right ${descripcion.length < 20 ? "text-red-400" : "text-gray-600"}`}>
                {descripcion.length} caracteres {descripcion.length < 20 ? `(mínimo 20)` : "✓"}
              </p>
            </Campo>

            {/* Evidencia */}
            <Campo label="Evidencia" hint="Foto, captura de pantalla o video (opcional pero ayuda)">
              <div
                onClick={() => fileRef.current?.click()}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                  ${evidencia ? "border-emerald-500/40 bg-emerald-900/10" : "border-white/10 hover:border-orange-800/25 bg-orange-400"}`}>
                <input ref={fileRef} type="file" className="hidden"
                  accept="image/*,video/*,.pdf"
                  onChange={e => { if (e.target.files?.[0]) seleccionarEvidencia(e.target.files[0]); }} />
                {evidencia ? (
                  <>
                    {preview && evidencia.type.startsWith("image/") ? (
                      <img src={preview} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-white/10" />
                    ) : (
                      <Camera className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-black truncate">{evidencia.name}</p>
                      <p className="text-xs text-emerald-400">{(evidencia.size / 1024).toFixed(0)} KB · cargado</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setEvidencia(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-white flex-shrink-0" />
                    <div>
                      <p className="text-sm text-white font-semibold">Subir evidencia</p>
                      <p className="text-xs text-black">Imagen, video o PDF</p>
                    </div>
                  </>
                )}
              </div>
            </Campo>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setPaso(1)}
                className="px-5 py-3.5 bg-gray-500 hover:bg-gray-700 text-white font-semibold rounded-2xl text-sm transition">
                ← Atrás
              </button>
              <button onClick={() => {
                if (!titulo.trim() || descripcion.trim().length < 20) {
                  setError("Completa el título y la descripción (mínimo 20 caracteres)");
                  return;
                }
                setError("");
                setPaso(3);
              }}
                className="flex-1 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98]">
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Confirmación y envío ─────────────────────────────── */}
        {paso === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-orange-500">Revisa y envía</h2>
              <p className="text-sm text-gray-500 mt-1">Confirma tus datos de contacto (opcional).</p>
            </div>

            {/* Resumen */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resumen del reporte</p>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20 flex-shrink-0">Tipo</span>
                  <span className="text-orange-400 font-semibold">{TIPOS.find(t => t.v === tipo)?.label}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20 flex-shrink-0">Urgencia</span>
                  <span className="text-orange-400 font-semibold">{PRIORIDADES.find(p => p.v === prioridad)?.label}</span>
                </div>
                {vendedorNom && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-20 flex-shrink-0">Tienda</span>
                    <span className="text-orange-400 font-semibold">{vendedorNom}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20 flex-shrink-0">Título</span>
                  <span className="text-orange-400">{titulo}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-20 flex-shrink-0">Descripción</span>
                  <span className="text-orange-400 text-xs leading-relaxed line-clamp-3">{descripcion}</span>
                </div>
                {evidencia && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-20 flex-shrink-0">Evidencia</span>
                    <span className="text-emerald-400 text-xs">{evidencia.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Datos contacto */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tus datos (opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Nombre">
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" className={inp} />
                </Campo>
                <Campo label="Correo">
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="correo@..." className={inp} />
                </Campo>
              </div>
              <p className="text-xs text-gray-600">Si los proporcionas, podemos notificarte el resultado de la investigación.</p>
            </div>

            {/* Nota de privacidad */}
            <div className="flex items-start gap-2.5 bg-white border border-blue-500/15 rounded-2xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700/80 leading-relaxed">
                Tu reporte será revisado por el equipo de Mercado Fénix. Tomamos los reportes en serio y actuaremos según nuestras políticas. Tu información es confidencial.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-100/20 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setPaso(2)}
                className="px-5 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-2xl text-sm transition">
                ← Atrás
              </button>
              <button onClick={enviar} disabled={enviando}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98]">
                {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><AlertTriangle className="w-4 h-4" /> Enviar reporte</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Export por defecto: envuelve el contenido en Suspense ────────────────────
// Esto es necesario porque useSearchParams() requiere un límite de Suspense
// para que Next.js pueda prerenderizar la página sin fallar el build.
export default function ReportarTiendaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      }
    >
      <ReportarTiendaContent />
    </Suspense>
  );
}