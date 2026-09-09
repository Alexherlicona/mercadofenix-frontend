// frontend/app/admin-phoenix-2025/dashboard/solicitudes/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle, XCircle, Clock, Store, Phone, MapPin,
  IdCard, FileText, Eye, Loader2, RefreshCw, Mail,
  ExternalLink, ShieldCheck, AlertTriangle
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function headers() {
  const t = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${t}` };
}

interface Solicitud {
  dni: string;
  nombreTienda: string;
  propietario: string;
  telefono: string;
  email: string | null;
  departamento: string;
  municipio: string;
  rtn: string;
  documento_url: string | null;
  logo: string | null;
  google_maps_url: string | null;
  latitud: number | null;
  longitud: number | null;
  fechaRegistro: string;
}

// ── Modal para ver documento de identidad ────────────────────────────────────
function ModalDocumento({ url, onClose }: { url: string; onClose: () => void }) {
  const esPdf = url.toLowerCase().endsWith(".pdf");
  const src   = url.startsWith("http") ? url : `${API}${url}`;
  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="relative max-w-2xl w-full bg-gray-900 rounded-3xl overflow-hidden border border-white/10"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <p className="font-bold text-white text-sm flex items-center gap-2">
            <IdCard className="w-4 h-4 text-orange-400" /> Documento de identidad
          </p>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none">×</button>
        </div>
        <div className="p-4">
          {esPdf
            ? <iframe src={src} className="w-full h-[70vh] rounded-xl" title="Documento" />
            : <img src={src} alt="Documento" className="w-full rounded-xl max-h-[70vh] object-contain"
                onContextMenu={e => e.preventDefault()} draggable={false} />}
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <p className="text-xs text-gray-500">Solo visible para administradores. No compartir.</p>
        </div>
      </div>
    </div>
  );
}

export default function SolicitudesPendientes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [procesando,  setProcesando]  = useState<string | null>(null);
  const [docModal,    setDocModal]    = useState<string | null>(null);
  const router = useRouter();

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/solicitudes-pendientes`, { headers: headers() });
      if (res.status === 401) { router.push("/admin-phoenix-2025"); return; }
      setSolicitudes(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const aprobar = async (dni: string, nombre: string) => {
    if (!confirm(`¿Aprobar la tienda "${nombre}"?\n\nSe activará con 1 mes gratis.`)) return;
    setProcesando(dni);
    try {
      const res = await fetch(`${API}/api/admin/aprobar-vendedor`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      });
      const data = await res.json();
      alert(data.msg || "Tienda aprobada");
      cargar();
    } catch { alert("Error al aprobar"); }
    finally { setProcesando(null); }
  };

  const rechazar = async (dni: string) => {
    const motivo = prompt("Motivo del rechazo (obligatorio):");
    if (!motivo?.trim()) return;
    setProcesando(dni);
    try {
      await fetch(`${API}/api/admin/rechazar-vendedor`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ dni, motivo }),
      });
      cargar();
    } finally { setProcesando(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-orange-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Cargando solicitudes...</p>
      </div>
    </div>
  );

  return (
    <>
      {docModal && <ModalDocumento url={docModal} onClose={() => setDocModal(null)} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Solicitudes pendientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {solicitudes.length} tienda{solicitudes.length !== 1 ? "s" : ""} esperando aprobación
            </p>
          </div>
          <button onClick={cargar}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 transition">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-3 bg-blue-950/40 border border-blue-500/20 rounded-2xl px-5 py-3.5">
          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/80 leading-relaxed">
            Revisa el documento de identidad de cada solicitante antes de aprobar. Al aprobar se activa la tienda con 1 mes de prueba gratis.
          </p>
        </div>

        {solicitudes.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-3xl border border-white/5">
            <CheckCircle className="w-14 h-14 text-emerald-500/40 mx-auto mb-4" />
            <p className="text-lg font-bold text-emerald-400">¡Todo al día!</p>
            <p className="text-gray-500 text-sm mt-2">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {solicitudes.map(s => (
              <div key={s.dni} className="bg-gray-900 border border-white/5 rounded-2xl p-5 space-y-4 hover:border-orange-500/20 transition">

                {/* Cabecera */}
                <div className="flex items-start gap-3">
                  {s.logo
                    ? <img src={s.logo.startsWith("http") ? s.logo : `${API}${s.logo}`} alt="logo"
                        className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-white/10" />
                    : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-white" />
                      </div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{s.nombreTienda}</p>
                    <p className="text-xs text-gray-400">{s.propietario}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full mt-1">
                      <Clock className="w-2.5 h-2.5" /> Pendiente
                    </span>
                  </div>
                </div>

                {/* Datos */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <IdCard className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    <span>DNI: <strong className="text-gray-200">{s.dni}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <FileText className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    <span>RTN: <strong className="text-gray-200">{s.rtn}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Phone className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span>{s.telefono}</span>
                  </div>
                  {s.email && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    <span>{s.municipio}, {s.departamento}</span>
                  </div>
                  {s.google_maps_url && (
                    <a href={s.google_maps_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition">
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      Ver en Google Maps
                    </a>
                  )}
                  <p className="text-gray-600 text-[10px] mt-1">
                    Solicitado el {s.fechaRegistro ? format(new Date(s.fechaRegistro), "dd 'de' MMMM, yyyy", { locale: es }) : "N/A"}
                  </p>
                </div>

                {/* Documento */}
                <div>
                  {s.documento_url ? (
                    <button onClick={() => setDocModal(s.documento_url!)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-blue-900/30 border border-blue-500/30 hover:bg-blue-900/50 rounded-xl text-xs font-bold text-blue-300 transition">
                      <Eye className="w-3.5 h-3.5" /> Ver documento de identidad
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 py-2 bg-amber-900/20 border border-amber-500/20 rounded-xl px-3">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-300">Sin documento — revisar manualmente</p>
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => aprobar(s.dni, s.nombreTienda)}
                    disabled={procesando === s.dni}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition">
                    {procesando === s.dni ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Aprobar + 1 mes
                  </button>
                  <button onClick={() => rechazar(s.dni)}
                    disabled={procesando === s.dni}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition">
                    <XCircle className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}