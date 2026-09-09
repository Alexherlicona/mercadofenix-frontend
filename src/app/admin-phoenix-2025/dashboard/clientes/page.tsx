// frontend/app/admin-phoenix-2025/dashboard/clientes/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Phone, Mail, MapPin, ShoppingCart, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function headers() { return { Authorization: `Bearer ${localStorage.getItem("access_token")}` }; }

interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string | null;
  departamento: string;
  municipio: string;
  creado_en: string | null;
  pedidos_count: number;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const router = useRouter();

  const cargar = async (q = "") => {
    setLoading(true);
    const url = q ? `${API}/api/admin/clientes?search=${encodeURIComponent(q)}` : `${API}/api/admin/clientes`;
    try {
      const res = await fetch(url, { headers: headers() });
      if (res.status === 401) { router.push("/admin-phoenix-2025"); return; }
      setClientes(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const filtrar = () => cargar(search);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Clientes registrados</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clientes.length} clientes</p>
        </div>
        <button onClick={() => cargar(search)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 transition">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && filtrar()}
            placeholder="Nombre, teléfono o correo..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-white/10 focus:border-orange-500/40 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition" />
        </div>
        <button onClick={filtrar}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-semibold text-white transition">
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-white/5">
          <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Sin clientes registrados</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {["Cliente","Contacto","Ubicación","Pedidos","Registro"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {clientes.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                          {c.nombres?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{c.nombres} {c.apellidos}</p>
                          <p className="text-xs text-gray-500">ID #{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-xs text-gray-300 flex items-center gap-1.5"><Phone className="w-3 h-3 text-green-400" />{c.telefono}</p>
                        {c.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3 text-blue-400" />{c.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                        {c.municipio}, {c.departamento}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full
                        ${c.pedidos_count > 0 ? "bg-orange-500/15 text-orange-400" : "bg-gray-800 text-gray-500"}`}>
                        <ShoppingCart className="w-3 h-3" />{c.pedidos_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500">
                        {c.creado_en ? format(new Date(c.creado_en), "dd/MM/yyyy", { locale: es }) : "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}