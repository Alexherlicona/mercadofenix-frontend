// app/fenix/productos/page.tsx
"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ui/ProductCard";
import MobileNav from "@/components/ui/MobileNav";
import { usePathname } from "next/navigation";
import CartIcon from "@/components/ui/CartIcon";
import {
  ArrowLeft, Search, X, SlidersHorizontal, Package,
  ChevronDown, CheckCircle2, Loader2, Filter, Sparkles
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORIAS_ALL = [
  "Ropa y Moda","Calzado","Electrónica","Computación","Celulares",
  "Accesorios","Hogar y Jardín","Muebles","Juguetes","Deportes",
  "Salud y Belleza","Alimentos","Proyectos de Programación","Diseño y Arte",
  "Libros y Documentos","Cursos y Educación","Música y Audio",
  "Video y Multimedia","Fotografía","Otros",
];

const DEPARTAMENTOS = [
  "Francisco Morazán","Cortés","Atlántida","Santa Bárbara","Comayagua",
  "Olancho","El Paraíso","Yoro","Choluteca","Valle","La Paz","Copán",
  "Lempira","Intibucá","Gracias a Dios","Colón","Ocotepeque","Islas de la Bahía",
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-[20px] overflow-hidden bg-white border border-gray-100">
      <div className="aspect-square bg-gradient-to-br from-orange-50 to-amber-50 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-2 bg-gray-100 rounded-full w-1/3 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded-full w-full animate-pulse" />
        <div className="h-3 bg-gray-100 rounded-full w-4/5 animate-pulse" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 bg-orange-100 rounded-full w-1/3 animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-orange-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Chip de filtro activo ─────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-orange-200">
      {label}
      <button onClick={onRemove} className="hover:text-red-600 transition">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Contenido real de la página. Usa useSearchParams, por eso debe ir
// envuelto en <Suspense> desde el export default de abajo.
function ProductosContent() {
    const pathname = usePathname();
    const NAV_LINKS = [
      { href: "/fenix",           label: "Inicio"     },
      { href: "/fenix/tiendas",   label: "Tiendas"    },
      { href: "/fenix/productos", label: "Productos"  },
      { href: "/fenix/favoritos", label: "Favoritos"  },
      { href: "/fenix/mi-cuenta", label: "Mi cuenta"  },
    ];
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [productos,   setProductos]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState(searchParams.get("q") || "");
  const [categoria,   setCategoria]   = useState(searchParams.get("categoria") || "");
  const [depto,       setDepto]       = useState("");
  const [tipo,        setTipo]        = useState<"" | "fisico" | "digital">(""); // físico o digital
  const [soloOfertas, setSoloOfertas] = useState(searchParams.get("tipo") === "oferta");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef    = useRef<HTMLInputElement>(null);

  // Cargar productos
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/public/productos`);
      const data = await res.json();
      setProductos(data.productos || data || []);
    } catch {
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Filtrado en cliente
  const filtrados = productos.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !q ||
      p.nombre?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.nombre_tienda?.toLowerCase().includes(q) ||
      p.categoria?.toLowerCase().includes(q);
    const matchCat   = !categoria || p.categoria === categoria;
    const matchDepto = !depto     || p.departamento === depto;
    const matchTipo  = !tipo      || p.tipo === tipo;
    const matchOfer  = !soloOfertas || (p.precio_con_descuento && Number(p.precio_con_descuento) < Number(p.precio));
    return matchQ && matchCat && matchDepto && matchTipo && matchOfer;
  });

  const hayFiltros = !!(query || categoria || depto || tipo || soloOfertas);
  const activeFiltersCount = [categoria, depto, tipo, soloOfertas].filter(Boolean).length;

  const limpiarFiltros = () => {
    setCategoria(""); setDepto(""); setTipo(""); setSoloOfertas(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header fijo ─────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-40 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">

          {/* Fila 1: Volver + título + carrito */}
          <div className="flex items-center gap-3 pt-3 pb-1">
            <h3 className="text-1xl font-black text-gray-900">Productos</h3>
                        {/* Barra de búsqueda */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar productos"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition"
              />
              {query && (
                <button onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`relative p-2 rounded-xl border transition ${filtersOpen || activeFiltersCount > 0 ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"}`}>
                <Filter className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <div className="flex items-center px-3 py-2 bg-orange-50 rounded-xl border border-orange-100">
                <Link href="/fenix/carrito"
                  className="flex-shrink-0 relative p-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-all hover:shadow-sm active:scale-95">
                  <CartIcon />
                </Link>
              </div>
                          {/* Nav desktop — visible solo en lg+, reemplaza al botón hamburguesa visualmente */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-shrink-0 ml-1">
                {NAV_LINKS.map(({ href, label}) => {
                  const isActive = pathname === href;

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition whitespace-nowrap ${
                        isActive ? "text-orange-500 bg-gray-100" : "text-gray-500"
                      }`}
                    >
                      <span className={`${isActive ? "font-bold" : ""}`}>
                        {label}
                      </span>
                    </Link>
                  );
                })}
            </nav>
            </div>
          </div>



          {/* Panel de filtros expandible */}
          {filtersOpen && (
            <div className="pb-4 border-t border-gray-100 pt-3 space-y-3">
              {/* Tipo y oferta */}
              <div className="flex flex-wrap gap-2">
                {(["fisico", "digital"] as const).map(t => (
                  <button key={t} onClick={() => setTipo(tipo === t ? "" : t)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all
                      ${tipo === t ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"}`}>
                    {t === "fisico" ? "📦 Físico" : "💾 Digital"}
                  </button>
                ))}
                <button onClick={() => setSoloOfertas(!soloOfertas)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5
                    ${soloOfertas ? "bg-red-500 border-red-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-red-300"}`}>
                  🏷️ Solo ofertas
                  {soloOfertas && <CheckCircle2 className="w-3 h-3" />}
                </button>
                {hayFiltros && (
                  <button onClick={limpiarFiltros}
                    className="px-3.5 py-2 rounded-full text-xs font-bold border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Chips de filtros activos (cuando el panel está cerrado) */}
          {!filtersOpen && (categoria || depto || tipo || soloOfertas) && (
            <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-none">
              {categoria   && <FilterChip label={categoria} onRemove={() => setCategoria("")} />}
              {depto       && <FilterChip label={depto}     onRemove={() => setDepto("")} />}
              {tipo        && <FilterChip label={tipo === "fisico" ? "📦 Físico" : "💾 Digital"} onRemove={() => setTipo("")} />}
              {soloOfertas && <FilterChip label="🏷️ Ofertas" onRemove={() => setSoloOfertas(false)} />}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────────────────────── */}
      <div className="pt-[130px] pb-32 px-4 max-w-6xl mx-auto">

        {/* Contador de resultados */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {filtrados.length === 0
                ? "Sin resultados"
                : <><span className="font-bold text-gray-800">{filtrados.length}</span> producto{filtrados.length !== 1 ? "s" : ""}{query ? ` para "${query}"` : ""}</>}
            </p>
            {hayFiltros && filtrados.length > 0 && (
              <button onClick={limpiarFiltros} className="text-xs text-orange-500 hover:text-orange-700 font-semibold transition">
                Limpiar todo
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center">
              <Package className="w-10 h-10 text-orange-300" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800 mb-1">Sin resultados</p>
              <p className="text-sm text-gray-400">
                {query ? `No encontramos nada para "${query}"` : "No hay productos con estos filtros"}
              </p>
            </div>
            {hayFiltros && (
              <button onClick={() => { setQuery(""); limpiarFiltros(); }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-2xl transition">
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtrados.map((p: any) => (
              <ProductCard
                key={p.id}
                producto={p}
                oferta={soloOfertas || (p.precio_con_descuento && Number(p.precio_con_descuento) < Number(p.precio))}
                nuevo={false}
              />
            ))}
          </div>
        )}
      </div>

      
    </div>
  );
}

// ── Export por defecto: envuelve el contenido en Suspense ────────────────────
// Esto es necesario porque useSearchParams() requiere un límite de Suspense
// para que Next.js pueda prerenderizar la página sin fallar el build.
export default function ProductosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      }
    >
      <ProductosContent />
    </Suspense>
  );
}