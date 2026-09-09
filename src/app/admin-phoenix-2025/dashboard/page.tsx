// frontend/app/admin-phoenix-2025/dashboard/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Users, UserCheck, DollarSign, BarChart3,
  AlertCircle, Settings, Menu, X, LogOut,
  Home, ShoppingBag, Package, Bell
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MENU = [
  { title: "Dashboard",            icon: Home,        href: "/admin-phoenix-2025/dashboard" },
  { title: "Solicitudes",          icon: UserCheck,   href: "/admin-phoenix-2025/dashboard/solicitudes", badge: "pendientes" },
  { title: "Vendedores",           icon: Users,       href: "/admin-phoenix-2025/dashboard/vendedores" },
  { title: "Clientes",             icon: ShoppingBag, href: "/admin-phoenix-2025/dashboard/clientes" },
  { title: "Productos",            icon: Package,     href: "/admin-phoenix-2025/dashboard/productos" },
  { title: "Pagos",                icon: DollarSign,  href: "/admin-phoenix-2025/dashboard/pagos" },
  { title: "Estadísticas",         icon: BarChart3,   href: "/admin-phoenix-2025/dashboard/estadisticas" },
  { title: "Reportes y Quejas",    icon: AlertCircle, href: "/admin-phoenix-2025/dashboard/reportes" },
];

function adminHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open,       setOpen]       = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const router   = useRouter();
  const pathname = usePathname();

  // Cargar count de solicitudes pendientes para el badge
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/admin-phoenix-2025"); return; }
    fetch(`${API}/api/admin/solicitudes-pendientes`, { headers: adminHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setPendientes(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/admin-phoenix-2025");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">

      {/* ── Backdrop mobile ─────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950
        border-r border-orange-900/30
        transition-transform duration-300 lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-orange-900/30">
          <div>
            <h1 className="text-lg font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent tracking-tight">
              MERCADO FÉNIX
            </h1>
            <p className="text-[10px] text-orange-500/60 font-semibold uppercase tracking-widest mt-0.5">
              Panel Admin
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-gray-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {MENU.map(item => {
            const Icon    = item.icon;
            const activo  = pathname === item.href || (item.href !== "/admin-phoenix-2025/dashboard" && pathname.startsWith(item.href));
            const badge   = item.badge === "pendientes" ? pendientes : 0;
            return (
              <button key={item.href}
                onClick={() => { router.push(item.href); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${activo
                    ? "bg-orange-600/20 text-orange-300 border border-orange-600/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${activo ? "text-orange-400" : ""}`} />
                <span className="flex-1 text-left">{item.title}</span>
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-orange-900/20">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-all">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-orange-900/20 px-4 py-3 flex items-center gap-4">
          <button onClick={() => setOpen(true)} className="lg:hidden text-orange-500 hover:text-orange-400 transition">
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="flex-1 text-base font-bold text-white capitalize">
            {MENU.find(m => pathname.startsWith(m.href) && m.href !== "/admin-phoenix-2025/dashboard")?.title
              || "Dashboard"}
          </h2>
          {pendientes > 0 && (
            <button onClick={() => router.push("/admin-phoenix-2025/dashboard/solicitudes")}
              className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition rounded-xl px-3 py-1.5">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-xs font-bold">{pendientes} pendiente{pendientes !== 1 ? "s" : ""}</span>
            </button>
          )}
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-black">
            A
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}