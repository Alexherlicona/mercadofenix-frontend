// frontend/app/admin-phoenix-2025/dashboard/estadisticas/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, RefreshCw, TrendingUp, DollarSign, Package } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import * as XLSX from "xlsx";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function headers() { return { Authorization: `Bearer ${localStorage.getItem("access_token")}` }; }

const COLORES = ["#f97316","#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#84cc16"];

export default function EstadisticasPage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/estadisticas`, { headers: headers() });
      if (res.status === 401) { router.push("/admin-phoenix-2025"); return; }
      setData(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const exportarExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.ventas_mensuales || []), "Ventas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.categorias || []),      "Categorías");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.metodos_pago || []),    "Métodos pago");
    XLSX.writeFile(wb, `estadisticas_fenix_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
    </div>
  );

  const d = data || {};

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Estadísticas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Datos reales de la plataforma</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 transition">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={exportarExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-sm text-white font-semibold transition">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Ingresos totales",    value: `L${(d.ingresos_total || 0).toLocaleString("es-HN",{minimumFractionDigits:2})}`, color: "text-emerald-400", icon: DollarSign },
          { label: "Ingresos este mes",   value: `L${(d.ingresos_mes   || 0).toLocaleString("es-HN",{minimumFractionDigits:2})}`, color: "text-orange-400",  icon: TrendingUp },
          { label: "Categorías activas",  value: d.categorias?.length || 0, color: "text-purple-400", icon: Package },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-gray-900 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <Icon className={`w-8 h-8 ${k.color} flex-shrink-0`} />
              <div>
                <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                <p className="text-xs text-gray-500">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pedidos mensuales */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-4">Pedidos mensuales (últimos 6 meses)</p>
          {d.ventas_mensuales?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={d.ventas_mensuales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="mes" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background:"#111827",border:"1px solid #374151",borderRadius:12,fontSize:12 }} />
                <Line type="monotone" dataKey="pedidos" stroke="#f97316" strokeWidth={2.5} dot={{ fill:"#f97316",r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-8">Sin pedidos registrados</p>}
        </div>

        {/* Métodos de pago */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-4">Métodos de pago en pedidos</p>
          {d.metodos_pago?.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={d.metodos_pago} cx="50%" cy="50%" outerRadius={75} dataKey="total" nameKey="metodo">
                    {d.metodos_pago.map((_: any, i: number) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:"#111827",border:"1px solid #374151",borderRadius:12,fontSize:12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {d.metodos_pago.map((m: any, i: number) => (
                  <div key={m.metodo} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORES[i%COLORES.length] }} />
                    <span className="text-xs text-gray-400 flex-1 capitalize">{m.metodo}</span>
                    <span className="text-xs font-bold text-white">{m.total}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-gray-600 text-sm text-center py-8">Sin pedidos registrados</p>}
        </div>

        {/* Categorías de productos */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5 lg:col-span-2">
          <p className="text-sm font-bold text-white mb-4">Productos por categoría</p>
          {d.categorias?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.categorias} layout="vertical" barSize={16}>
                <XAxis type="number" tick={{ fill:"#9ca3af",fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fill:"#9ca3af",fontSize:11 }} axisLine={false} tickLine={false} width={140} />
                <Tooltip contentStyle={{ background:"#111827",border:"1px solid #374151",borderRadius:12,fontSize:12 }} />
                <Bar dataKey="total" radius={[0,6,6,0]}>
                  {d.categorias.map((_: any, i: number) => <Cell key={i} fill={COLORES[i%COLORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-8">Sin productos registrados</p>}
        </div>

        {/* Planes activos */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-4">Planes activos</p>
          {d.planes?.length > 0 ? (
            <div className="space-y-3">
              {d.planes.map((p: any, i: number) => (
                <div key={p.plan} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORES[i] }} />
                  <span className="text-sm text-gray-400 flex-1 capitalize">{p.plan}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100,(p.total/(d.planes[0]?.total||1))*100)}%`, background: COLORES[i] }} />
                  </div>
                  <span className="text-sm font-bold text-white w-8 text-right">{p.total}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-600 text-sm text-center py-8">Sin vendedores activos</p>}
        </div>
      </div>
    </div>
  );
}