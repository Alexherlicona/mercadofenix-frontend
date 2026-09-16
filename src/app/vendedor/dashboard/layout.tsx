// src/app/vendedor/dashboard/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Store, Package, BarChart3, User, LogOut, Plus,
  Menu, X, ShoppingBag, MessageCircle, Zap, Home,
  ChevronRight, Sun, Moon
} from "lucide-react";
import { ThemeProvider, useTheme } from "./ThemeContext";

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
  prueba:  "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10",
  basico:  "text-blue-600 dark:text-blue-400   bg-blue-100 dark:bg-blue-400/10",
  pro:     "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-400/10",
  premium: "text-amber-600 dark:text-amber-400  bg-amber-100 dark:bg-amber-400/10",
};
const PLAN_ICON: Record<string, string> = {
  prueba: "🎁", basico: "⚡", pro: "🚀", premium: "👑",
};

// ── Botón para alternar tema — reutilizable, úsalo igual en futuras páginas ──
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      className={`flex items-center gap-2 rounded-xl font-medium transition-all
        ${compact ? "p-2" : "px-3.5 py-3 w-full text-sm"}
        text-gray-500 hover:text-gray-900 hover:bg-gray-100
        dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-white/[0.04]`}
    >
      {theme === "light" ? <Moon className="w-4.5 h-4.5 flex-shrink-0" /> : <Sun className="w-4.5 h-4.5 flex-shrink-0" />}
      {!compact && <span className="flex-1 text-left">{theme === "light" ? "Tema oscuro" : "Tema claro"}</span>}
    </button>
  );
}

function VendedorLayoutInner({ children }: { children: React.ReactNode }) {
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
    // overflow-x-hidden aquí contiene cualquier desbordamiento del sidebar
    // "fixed" + transform en móvil, que en algunos navegadores (Safari iOS,
    // WebViews Android) puede seguir agregando ancho al documento aunque
    // el sidebar esté visualmente fuera de pantalla.
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a12] flex overflow-x-hidden transition-colors">

      {/* ── Backdrop mobile ──────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {/* Ancho ampliado: w-72 en móvil (antes w-60), w-64 desde lg+ para no robar
          demasiado espacio al contenido en desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 flex flex-col
        bg-white dark:bg-[#0f0f1a] border-r border-gray-200 dark:border-white/[0.06]
        transition-transform duration-300 lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200 dark:border-white/[0.06] flex-shrink-0">
          <div>
            <p className="text-base sm:text-lg font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent tracking-tight">
              MERCADO FÉNIX
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-600 uppercase tracking-widest mt-0.5">Panel vendedor</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-900 dark:text-gray-600 dark:hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perfil compacto */}
        {vendedor && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {vendedor.logo_url
                  ? <img src={vendedor.logo_url?.startsWith("http") ? vendedor.logo_url: `${API_URL}${vendedor.logo_url}`} className="w-full h-full object-cover" />
                  : <Store className="w-5 h-5 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{vendedor.nombre_tienda}</p>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${planColor}`}>
                  {planIcon} {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav con scroll */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {MENU.map(item => {
            const Icon    = item.icon;
            const activo  = pathname === item.href || (item.href !== "/vendedor/dashboard" && pathname.startsWith(item.href));
            const badge   = item.href === "/vendedor/dashboard/pedidos" ? noLeidos : 0;
            return (
              <button key={item.href}
                onClick={() => { router.push(item.href); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all
                  ${activo
                    ? "bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/20"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-white/[0.04]"}`}>
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${activo ? "text-orange-500 dark:text-orange-400" : ""}`} />
                <span className="flex-1 text-left">{item.title}</span>
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {activo && <ChevronRight className="w-3.5 h-3.5 text-orange-400/60 dark:text-orange-500/40 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Tema + Logout */}
        <div className="p-2.5 border-t border-gray-200 dark:border-white/[0.06] flex-shrink-0 space-y-1">
          <ThemeToggle />
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-600 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-all">
            <LogOut className="w-4.5 h-4.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      {/* w-full asegura que este contenedor nunca dependa del ancho "sobrante"
          que el navegador calcule si el sidebar fixed llegara a contar en el layout.
          ml ajustado a lg:ml-64 para coincidir con el nuevo ancho del sidebar en desktop */}
      <div className="flex-1 w-full min-w-0 lg:ml-64 flex flex-col min-h-screen">

        {/* Top bar móvil */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0a0a12]/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/[0.06] px-4 py-3.5 flex items-center gap-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-orange-500 dark:text-orange-400">
            <Menu className="w-6 h-6" />
          </button>
          <p className="flex-1 text-base font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            MERCADO FÉNIX
          </p>
          <ThemeToggle compact />
          {noLeidos > 0 && (
            <button onClick={() => router.push("/vendedor/dashboard/pedidos")}
              className="flex items-center gap-1.5 bg-red-50 border border-red-200 dark:bg-red-500/15 dark:border-red-500/20 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-600 dark:text-red-400 text-xs font-bold">{noLeidos} nuevo{noLeidos > 1 ? "s" : ""}</span>
            </button>
          )}
        </header>

        <main className="flex-1 w-full min-w-0 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <VendedorLayoutInner>{children}</VendedorLayoutInner>
    </ThemeProvider>
  );
}