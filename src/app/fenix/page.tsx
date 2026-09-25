// app/fenix/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Star, Zap, ChevronRight,
  ArrowRight, Search, TrendingUp, Flame
} from "lucide-react";
import Header from "@/components/ui/header";
import ProductCard from "@/components/ui/ProductCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getData() {
  try {
    const [r1, r2, r3] = await Promise.all([
      fetch(`${API_URL}/api/public/destacados`, { cache: "no-store" }),
      fetch(`${API_URL}/api/public/ofertas`,    { cache: "no-store" }),
      fetch(`${API_URL}/api/public/nuevos`,     { cache: "no-store" }),
    ]);
    return {
      destacados: r1.ok ? await r1.json() : [],
      ofertas:    r2.ok ? await r2.json() : [],
      nuevos:     r3.ok ? await r3.json() : [],
    };
  } catch {
    return { destacados: [], ofertas: [], nuevos: [] };
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-[20px] overflow-hidden bg-white border border-gray-100">
      <div className="aspect-square bg-gradient-to-br from-orange-50 to-amber-50 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded-full w-1/3 animate-pulse" />
        <div className="h-3.5 bg-gray-200 rounded-full w-full animate-pulse" />
        <div className="h-3.5 bg-gray-100 rounded-full w-4/5 animate-pulse" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 bg-orange-100 rounded-full w-1/3 animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-orange-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Hero Banner ───────────────────────────────────────────────────────────────
function HeroBanner({ onSearch }: { onSearch: (q: string) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <div className="relative overflow-hidden rounded-3xl mb-8"
      style={{ background: "linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #9a3412 100%)" }}>

      {/* Formas decorativas */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8  w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-yellow-400/10" />

      <div className="relative px-6 py-8 lg:px-10 lg:py-12">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow">
              <span className="text-orange-600 font-black text-sm">MF</span>
            </div>
            <span className="text-white/80 text-sm font-medium">Mercado Fénix · Honduras</span>
          </div>

          <h1 className="text-3xl lg:text-5xl font-black text-white leading-tight mb-3"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            Todo lo que<br/>
            <span className="text-yellow-300">necesitas</span><br/>
            en un lugar
          </h1>

          <p className="text-white/70 text-sm lg:text-base mb-6 max-w-sm">
            Productos de tiendas locales hondureñas. Compra con confianza.
          </p>

          {/* Barra de búsqueda */}
          <div className="flex gap-2 max-w-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && router.push(`/fenix/productos?q=${encodeURIComponent(query)}`)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white text-gray-900 text-sm placeholder-gray-400 outline-none shadow-lg"
              />
            </div>
            <button
              onClick={() => router.push(`/fenix/productos?q=${encodeURIComponent(query)}`)}
              className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-2xl shadow-lg transition-all active:scale-95">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sección de productos ──────────────────────────────────────────────────────
function Section({
  title, subtitle, icon, products, badge, emptyMsg, loading, accentColor = "orange", href
}: {
  title: string; subtitle?: string; icon?: React.ReactNode;
  products: any[]; badge?: "oferta" | "nuevo"; emptyMsg?: string;
  loading?: boolean; accentColor?: "orange" | "red" | "emerald"; href?: string;
}) {
  const router = useRouter();
  const accent = {
    orange:  "text-orange-600",
    red:     "text-red-600",
    emerald: "text-emerald-600",
  }[accentColor];

  return (
    <section className="mb-10">
      {/* Encabezado */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {icon}
            <h2 className={`text-xl font-black ${accent} tracking-tight`}>{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-gray-400 pl-0.5">{subtitle}</p>}
        </div>
        {href && (
          <button onClick={() => router.push(href)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 font-semibold transition">
            Ver todo <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-10 text-center">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">{emptyMsg ?? "Sin productos disponibles"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p: any) => (
            <ProductCard
              key={p.id}
              producto={p}
              oferta={badge === "oferta"}
              nuevo={badge === "nuevo"}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Categorías rápidas ────────────────────────────────────────────────────────
const QUICK_CATS = [
  { label: "Ropa",        emoji: "👕", q: "Ropa y Moda" },
  { label: "Electrónica", emoji: "📱", q: "Electrónica" },
  { label: "Calzado",     emoji: "👟", q: "Calzado" },
  { label: "Hogar",       emoji: "🏠", q: "Hogar y Jardín" },
  { label: "Digital",     emoji: "💾", q: "digital" },
  { label: "Deportes",    emoji: "⚽", q: "Deportes" },
  { label: "Belleza",     emoji: "💄", q: "Salud y Belleza" },
  { label: "Juguetes",    emoji: "🧸", q: "Juguetes" },
];

// ════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const router = useRouter();
  const [data, setData]     = useState<{ destacados: any[]; ofertas: any[]; nuevos: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData().then(d => { setData(d); setLoading(false); });
  }, []);

  return (
    <>
      <Header />
      <main className="mf-container pt-16 lg:pt-[68px] pb-6 min-h-screen bg-gray-50/60">

        {/* Hero */}
        <HeroBanner onSearch={q => router.push(`/fenix/productos?q=${encodeURIComponent(q)}`)} />

        {/* Categorías rápidas */}
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Explorar por categoría</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_CATS.map(cat => (
              <button key={cat.q}
                onClick={() => router.push(`/fenix/productos?categoria=${encodeURIComponent(cat.q)}`)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all group">
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-[11px] font-semibold text-gray-600 group-hover:text-orange-600 transition-colors whitespace-nowrap">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ofertas (primera, más impactante) */}
        {(loading || (data?.ofertas?.length ?? 0) > 0) && (
          <Section
            title="Ofertas Relámpago"
            subtitle="Precios increíbles por tiempo limitado"
            icon={<Zap className="w-5 h-5 text-red-500 animate-pulse" />}
            products={data?.ofertas ?? []}
            badge="oferta"
            emptyMsg="Sin ofertas activas"
            loading={loading}
            accentColor="red"
            href="/fenix/productos?tipo=oferta"
          />
        )}

        {/* Nuevos */}
        <Section
          title="Recién Llegados"
          subtitle="Lo más nuevo en el mercado"
          icon={<span className="text-lg">🆕</span>}
          products={data?.nuevos ?? []}
          badge="nuevo"
          emptyMsg="Pronto habrá productos nuevos"
          loading={loading}
          accentColor="emerald"
          href="/fenix/productos?tipo=nuevo"
        />

        {/* Destacados */}
        <Section
          title="Productos Destacados"
          subtitle="Seleccionados especialmente para ti"
          icon={<Star className="w-5 h-5 text-orange-500" />}
          products={data?.destacados ?? []}
          emptyMsg="Sin destacados por ahora"
          loading={loading}
          accentColor="orange"
          href="/fenix/productos"
        />

        {/* Banner CTA inferior */}
        {!loading && (
          <div className="mt-4 rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1f2937, #374151)" }}>
            <div className="px-6 py-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-black text-xl mb-1">¿Tienes algo que vender?</p>
                <p className="text-gray-400 text-sm">Crea tu tienda gratis y llega a miles de compradores en Honduras.</p>
              </div>
              <button onClick={() => router.push("/vendedor/registro")}
                className="flex-shrink-0 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm px-5 py-3 rounded-2xl transition-all shadow-lg hover:shadow-orange-900/30 active:scale-95 whitespace-nowrap">
                Vender ya →
              </button>
            </div>
          </div>
        )}

      </main>
    </>
  );
}