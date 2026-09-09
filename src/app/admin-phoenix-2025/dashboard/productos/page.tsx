// frontend/app/admin-phoenix-2025/dashboard/productos/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Eye, Star, ToggleLeft, ToggleRight, Loader2, RefreshCw, Download, Lock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function headers() { return { Authorization: `Bearer ${localStorage.getItem("access_token")}` }; }

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  tipo: string;
  precio: number;
  stock: number | null;
  activo: boolean;
  destacado: boolean;
  ventas: number;
  vistas: number;
  creado_en: string | null;
  vendedor: string;
  foto: string | null;
}

export default function ProductosAdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search,    setSearch]    = useState("");
  const [tipo,      setTipo]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState<string | null>(null);
  const router = useRouter();

  const cargar = async () => {
    setLoading(true);
    let url = `${API}/api/admin/productos?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (tipo)   url += `tipo=${tipo}&`;
    try {
      const res = await fetch(url, { headers: headers() });
      if (res.status === 401) { router.push("/admin-phoenix-2025"); return; }
      setProductos(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [tipo]);

  const toggleActivo = async (id: string) => {
    setToggling(id + "_activo");
    try {
      const res = await fetch(`${API}/api/admin/productos/${id}/toggle`, { method: "PUT", headers: headers() });
      const data = await res.json();
      setProductos(p => p.map(x => x.id === id ? { ...x, activo: data.activo } : x));
    } finally { setToggling(null); }
  };

  const toggleDestacado = async (id: string) => {
    setToggling(id + "_dest");
    try {
      const res = await fetch(`${API}/api/admin/productos/${id}/destacado`, { method: "PUT", headers: headers() });
      const data = await res.json();
      setProductos(p => p.map(x => x.id === id ? { ...x, destacado: data.destacado } : x));
    } finally { setToggling(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{productos.length} productos</p>
        </div>
        <button onClick={cargar}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 transition">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && cargar()}
            placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-white/10 focus:border-orange-500/40 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition" />
        </div>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="px-4 py-2.5 bg-gray-900 border border-white/10 focus:border-orange-500/40 rounded-xl text-sm text-gray-300 outline-none appearance-none transition">
          <option value="">Todos los tipos</option>
          <option value="fisico">Físicos</option>
          <option value="digital">Digitales</option>
        </select>
        <button onClick={cargar}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-semibold text-white transition">
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>
      ) : (
        <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {["Producto","Tipo","Precio","Ventas/Vistas","Tienda","Activo","Destacado"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {productos.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.foto
                          ? <img src={p.foto.startsWith("http") ? p.foto : `${API}${p.foto}`} alt=""
                              className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-white/10"
                              onContextMenu={e => e.preventDefault()} />
                          : <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-gray-600" />
                            </div>}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate max-w-[160px]">{p.nombre}</p>
                          <p className="text-xs text-gray-500">{p.categoria}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.tipo === "digital" ? "bg-violet-500/15 text-violet-400" : "bg-orange-500/15 text-orange-400"}`}>
                        {p.tipo === "digital" ? <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Digital</span> : "Físico"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white">L{p.precio.toFixed(2)}</p>
                      {p.stock !== null && <p className="text-xs text-gray-500">Stock: {p.stock}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-400">
                        <span className="text-orange-400 font-bold">{p.ventas}</span> ventas
                        · <span className="text-blue-400 font-bold">{p.vistas}</span> vistas
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-400 max-w-[120px] truncate">{p.vendedor}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActivo(p.id)}
                        disabled={toggling === p.id + "_activo"}
                        className="transition hover:scale-110 active:scale-95">
                        {toggling === p.id + "_activo"
                          ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                          : p.activo
                            ? <ToggleRight className="w-6 h-6 text-emerald-400" />
                            : <ToggleLeft className="w-6 h-6 text-gray-600" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleDestacado(p.id)}
                        disabled={toggling === p.id + "_dest"}
                        className="transition hover:scale-110 active:scale-95">
                        {toggling === p.id + "_dest"
                          ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                          : <Star className={`w-5 h-5 ${p.destacado ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {productos.length === 0 && !loading && (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Sin productos registrados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}