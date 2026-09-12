// src/app/vendedor/dashboard/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Store, Package, BarChart3, User, LogOut, Plus,
  Menu, X, ShoppingBag, MessageCircle, Zap, Home,
  ChevronRight
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MENU = [
  { title: "Inicio",           icon: Home,          href: "/vendedor/dashboard" },
  { title: "Pedidos",          icon: ShoppingBag,   href: "/vendedor/dashboard/pedidos" },
  { title: "Mis productos",    icon: Package,       href: "/vendedor/dashboard/productos" },
  { title: "Nuevo producto",   icon: Plus,          href: "/vendedor/dashboard/productos/nuevo" },
  { title: "Estadísticas",     icon: BarChart3,     href: "/vendedor/dashboard/estadisticas" },
  { title: "Mi perfil",        icon: User,          href: "/vendedor/dashboard/perfil" },
  { title: "Sugerencias",      icon: MessageCircle, href: "/vendedor/dashboard/sugerencias" },
];

const PLAN_COLOR: Record<string, string> = {
  prueba:  "text-emerald-400 bg-emerald-400/10",
  basico:  "text-blue-400   bg-blue-400/10",
  pro:     "text-purple-400 bg-purple-400/10",
  premium: "text-amber-400  bg-amber-400/10",
};
const PLAN_ICON: Record<string, string> = {
  prueba: "🎁", basico: "⚡", pro: "🚀", premium: "👑",
};

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const [open,     setOpen]     = useState(false);
  const [vendedor, setVendedor] = useState<any>(null);
  const [noLeidos, setNoLeidos] = useState(0);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("vendedor_token");
    if (!token) { router.replace("/vendedor"); return; }
    fetch(`${API_URL}/api/vendedor/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setVendedor(d); else { localStorage.removeItem("vendedor_token"); router.replace("/vendedor"); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      const token = localStorage.getItem("vendedor_token");
      if (!token) return;
      const r = await fetch(`${API_URL}/api/chat/vendedor/salas`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (r?.ok) {
        const d = await r.json();
        setNoLeidos((d.salas || []).reduce((s: number, x: any) => s + (x.no_leidos || 0), 0));
      }
    };
    fetchChats();
    const t = setInterval(fetchChats, 20000);
    return () => clearInterval(t);
  }, []);

  const logout = () => {
    localStorage.removeItem("vendedor_token");
    router.push("/vendedor");
  };

  const plan      = vendedor?.plan || "prueba";
  const planColor = PLAN_COLOR[plan] || PLAN_COLOR.basico;
  const planIcon  = PLAN_ICON[plan]  || "⚡";

  return (
    <div className="min-h-screen bg-[#0a0a12] flex">

      {/* ── Backdrop mobile ──────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col
        bg-[#0f0f1a] border-r border-white/[0.06]
        transition-transform duration-300 lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <p className="text-sm font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent tracking-tight">
              MERCADO FÉNIX
            </p>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">Panel vendedor</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-gray-600 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Perfil compacto */}
        {vendedor && (
          <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {vendedor.logo_url
                  ? <img src={vendedor.logo_url?.startsWith("http") ? vendedor.logo_url: `${API_URL}${vendedor.logo_url}`} className="w-full h-full object-cover" />
                  : <Store className="w-4 h-4 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{vendedor.nombre_tienda}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${planColor}`}>
                  {planIcon} {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav con scroll */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {MENU.map(item => {
            const Icon    = item.icon;
            const activo  = pathname === item.href || (item.href !== "/vendedor/dashboard" && pathname.startsWith(item.href));
            const badge   = item.href === "/vendedor/dashboard/pedidos" ? noLeidos : 0;
            return (
              <button key={item.href}
                onClick={() => { router.push(item.href); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all
                  ${activo
                    ? "bg-orange-500/15 text-orange-300 border border-orange-500/20"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"}`}>
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${activo ? "text-orange-400" : ""}`} />
                <span className="flex-1 text-left">{item.title}</span>
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {activo && <ChevronRight className="w-3 h-3 text-orange-500/40 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-white/[0.06] flex-shrink-0">
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">

        {/* Top bar móvil */}
        <header className="sticky top-0 z-30 bg-[#0a0a12]/95 backdrop-blur-sm border-b border-white/[0.06] px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-orange-400">
            <Menu className="w-5 h-5" />
          </button>
          <p className="flex-1 text-sm font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            MERCADO FÉNIX
          </p>
          {noLeidos > 0 && (
            <button onClick={() => router.push("/vendedor/dashboard/pedidos")}
              className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-400 text-[10px] font-bold">{noLeidos} nuevo{noLeidos > 1 ? "s" : ""}</span>
            </button>
          )}
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}