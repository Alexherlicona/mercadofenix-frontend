"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, Search, Edit, Trash2, X, Save,
  Plus, ImageIcon, AlertTriangle, CheckCircle2, Loader2,
  GripVertical, Zap, Upload, Tag, DollarSign,
  Shield, ChevronDown, FileText, Share2, Wifi, WifiOff,
  ExternalLink, Copy, Check, Globe, Radio
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PLATAFORMA_URL = "https://mercadofenix.vercel.app/"; // ← cambia a tu dominio

function getToken() { return typeof window !== "undefined" ? localStorage.getItem("vendedor_token") : null; }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

// ── Optimización imágenes ─────────────────────────────────────────────────────
async function optimizarImagen(file: File, maxW = 1200, quality = 0.82): Promise<File> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        }, "image/webp", quality);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Helpers de URL ────────────────────────────────────────────────────────────
function slugify(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function buildProductoURL(vendedor: any, productoId: string) {
  return `${PLATAFORMA_URL}/tienda/${slugify(vendedor.nombre_tienda)}-${slugify(vendedor.municipio)}/producto/${productoId}`;
}
function buildTexto(producto: any, vendedor: any, url: string) {
  const precio = producto.precio_con_descuento || producto.precio;
  const desc = producto.porcentaje_descuento > 0 ? ` 🏷️ ¡${producto.porcentaje_descuento}% OFF!` : "";
  return `🔥 ${producto.nombre}${desc}\n\n${producto.descripcion ? producto.descripcion.slice(0, 120) + (producto.descripcion.length > 120 ? "..." : "") : ""}\n\n💰 L${parseFloat(precio).toFixed(2)}\n🏪 ${vendedor.nombre_tienda} · ${vendedor.municipio}\n${producto.tipo === "fisico" ? `📦 Stock: ${producto.stock ?? "consultar"}` : "⬇️ Descarga inmediata"}\n\n👉 ${url}\n\n#MercadoFenix #Honduras`;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface FotoExistente { id: number; url: string; orden: number; }
interface FotoNueva { uid: string; file: File; preview: string; originalKB: number; optimizedKB: number; optimizing: boolean; }
interface Producto {
  id: string; tipo: string; nombre: string; categoria: string;
  precio: number; porcentaje_descuento: number; descripcion: string;
  stock: number | null; activo: boolean; fotos: FotoExistente[];
  subtitulo?: string; etiquetas?: string[]; idioma?: string;
  condicion?: string; marca?: string; modelo?: string; sku?: string;
  material?: string; peso_gramos?: number; largo_cm?: number;
  ancho_cm?: number; alto_cm?: number; garantia_meses?: number;
  descripcion_garantia?: string; stock_minimo_alerta?: number; variantes?: any;
  licencia?: string; version?: string; compatibilidad?: string[];
  lenguajes?: string[]; frameworks?: string[]; nivel_dificultad?: string;
  incluye_soporte?: boolean; dias_soporte?: number; duracion_minutos?: number;
  num_lecciones?: number; num_paginas?: number; autor?: string;
  editorial?: string; isbn?: string; max_descargas?: number;
  dias_acceso?: number; preview_url?: string; permite_reventa?: boolean;
  permite_modificar?: boolean; requiere_software?: string[];
  resolucion?: string; formato_archivo?: string; tamano_bytes?: number;
  archivo_key?: string; precio_con_descuento?: number;
}
interface RedConexion { red: "facebook"|"instagram"; conectada: boolean; nombre_pagina?: string; page_id?: string; ig_user_id?: string; }

// ── Config campos por categoría ───────────────────────────────────────────────
const CAMPOS_CATEGORIA: Record<string, string[]> = {
  "Ropa y Moda":       ["condicion","marca","material","tallas","colores","genero","garantia","dimensiones"],
  "Calzado":           ["condicion","marca","material","tallas","colores","genero","garantia"],
  "Electrónica":       ["condicion","marca","modelo","sku","garantia","dimensiones","peso","especificaciones"],
  "Computación":       ["condicion","marca","modelo","sku","garantia","dimensiones","peso","especificaciones"],
  "Celulares":         ["condicion","marca","modelo","sku","garantia","almacenamiento","colores"],
  "Accesorios":        ["condicion","marca","material","colores","garantia"],
  "Hogar y Jardín":    ["condicion","marca","material","dimensiones","peso","garantia","colores"],
  "Muebles":           ["condicion","marca","material","dimensiones","peso","colores","garantia"],
  "Juguetes":          ["condicion","marca","edad_recomendada","material","garantia"],
  "Deportes":          ["condicion","marca","material","tallas","colores","garantia","dimensiones"],
  "Salud y Belleza":   ["condicion","marca","contenido","ingredientes","caducidad"],
  "Alimentos":         ["contenido","ingredientes","caducidad","peso"],
  "Proyectos de Programación": ["lenguajes","frameworks","nivel","version","compatibilidad","soporte","licencia","descargas","preview"],
  "Diseño y Arte":     ["formato","software","version","licencia","resolucion","descargas","preview"],
  "Templates y Plantillas": ["formato","software","version","licencia","descargas","preview"],
  "Libros y Documentos": ["autor","editorial","isbn","paginas","idioma","licencia","descargas","preview"],
  "Cursos y Educación": ["autor","nivel","duracion","lecciones","idioma","soporte","licencia","descargas","preview"],
  "Música y Audio":    ["formato","duracion","licencia","bpm","genero_musical","descargas","preview"],
  "Video y Multimedia": ["formato","duracion","resolucion","licencia","descargas","preview"],
  "Fotografía":        ["formato","resolucion","licencia","descargas","preview"],
};
const CONDICIONES = [
  { v:"nuevo",l:"Nuevo" },{ v:"como_nuevo",l:"Como nuevo" },
  { v:"buen_estado",l:"Buen estado" },{ v:"aceptable",l:"Aceptable" },
  { v:"reacondicionado",l:"Reacondicionado" },
];
const LICENCIAS = [
  { v:"personal",l:"Personal" },{ v:"comercial",l:"Comercial" },
  { v:"educativa",l:"Educativa" },{ v:"ilimitado",l:"Ilimitado" },
  { v:"codigo_abierto",l:"Código abierto" },
];
const NIVELES = ["basico","intermedio","avanzado","experto"];
const COMPAT  = ["Windows","Mac","Linux","Android","iOS","Web"];
const CATEGORIAS_FISICO  = ["Ropa y Moda","Calzado","Electrónica","Computación","Celulares","Accesorios","Hogar y Jardín","Muebles","Juguetes","Deportes","Salud y Belleza","Alimentos","Otros"];
const CATEGORIAS_DIGITAL = ["Proyectos de Programación","Diseño y Arte","Templates y Plantillas","Libros y Documentos","Cursos y Educación","Música y Audio","Video y Multimedia","Fotografía","Otros Digital"];

// ── Drag & drop ───────────────────────────────────────────────────────────────
function useDragSort<T>(items: T[], setItems: React.Dispatch<React.SetStateAction<T[]>>) {
  const from = useRef<number|null>(null);
  const over = useRef<number|null>(null);
  const [hov, setHov] = useState<number|null>(null);
  const h = (i: number) => ({
    draggable: true as const,
    onDragStart: () => { from.current = i; },
    onDragEnter: () => { over.current = i; setHov(i); },
    onDragOver:  (e: React.DragEvent) => e.preventDefault(),
    onDragEnd:   () => {
      if (from.current !== null && over.current !== null && from.current !== over.current) {
        setItems(prev => {
          const a = [...prev]; const [m] = a.splice(from.current!, 1); a.splice(over.current!, 0, m); return a;
        });
      }
      from.current = null; over.current = null; setHov(null);
    },
  });
  return { h, hov };
}

// ── UI atoms ──────────────────────────────────────────────────────────────────
const inp = "w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:border-orange-500/50 focus:bg-white/8 outline-none transition";
const sel = inp + " appearance-none cursor-pointer";

function F({ t, hint, children }: { t: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t}</p>
      {children}
      {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
  );
}
function Tog({ v, onChange, label }: { v: boolean; onChange: (x: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div onClick={() => onChange(!v)} className={`w-9 h-5 rounded-full border transition-all relative flex-shrink-0 ${v ? "bg-orange-500 border-orange-500" : "bg-white/8 border-white/15"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${v ? "left-[18px]" : "left-0.5"}`} />
      </div>
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );
}

// ── Modal Compartir ───────────────────────────────────────────────────────────
function ModalCompartir({ producto, vendedor, onClose }: { producto: Producto; vendedor: any; onClose: () => void }) {
  const [conexiones, setConexiones] = useState<RedConexion[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [selec, setSelec]             = useState<Set<string>>(new Set());
  const productoURL = buildProductoURL(vendedor, producto.id);
  const [texto, setTexto]     = useState(buildTexto(producto, vendedor, productoURL));
  const [copiado, setCopiado] = useState(false);
  const [estados, setEstados] = useState<Record<string, {estado:"idle"|"publicando"|"ok"|"error"; post_url?: string; msg?: string}>>({});
  const [publicando, setPub]  = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/vendedor/redes-sociales`, { headers: authHeaders() })
      .then(r => {
        setConexiones(r.data || []);
        const conectadas = (r.data || []).filter((x: RedConexion) => x.conectada).map((x: RedConexion) => x.red);
        setSelec(new Set(conectadas.length ? conectadas : ["facebook","instagram"]));
      })
      .catch(() => {
        setConexiones([{ red: "facebook", conectada: false }, { red: "instagram", conectada: false }]);
        setSelec(new Set(["facebook","instagram"]));
      })
      .finally(() => setCargando(false));
  }, []);

  const REDES = {
    facebook:  { nombre: "Facebook",  color: "#1877F2", icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    instagram: { nombre: "Instagram", color: "#E1306C", icon: <svg viewBox="0 0 24 24" className="w-5 h-5"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
  };

  const compartirNivelA = (red: "facebook"|"instagram") => {
    if (red === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productoURL)}&quote=${encodeURIComponent(texto)}`, "_blank", "width=600,height=500");
    } else {
      navigator.clipboard.writeText(texto);
      window.open("https://www.instagram.com/", "_blank");
    }
    setEstados(p => ({ ...p, [red]: { estado: "ok", msg: "Abierto en nueva ventana" } }));
  };

  const publicarNivelB = async (red: "facebook"|"instagram") => {
    setEstados(p => ({ ...p, [red]: { estado: "publicando" } }));
    try {
      const fotoUrl = producto.fotos?.[0]?.url ? `${API_URL}${producto.fotos[0].url}` : null;
      const res = await axios.post(`${API_URL}/api/vendedor/publicar-red-social`,
        { red, producto_id: producto.id, texto, foto_url: fotoUrl, producto_url: productoURL },
        { headers: authHeaders() }
      );
      setEstados(p => ({ ...p, [red]: { estado: "ok", post_url: res.data?.post_url, msg: "Publicado" } }));
    } catch (e: any) {
      setEstados(p => ({ ...p, [red]: { estado: "error", msg: e.response?.data?.detail || "Error" } }));
    }
  };

  const publicarTodas = async () => {
    if (!selec.size) return;
    setPub(true);
    for (const red of Array.from(selec) as ("facebook"|"instagram")[]) {
      const cx = conexiones.find(c => c.red === red);
      cx?.conectada ? await publicarNivelB(red) : compartirNivelA(red);
    }
    setPub(false);
  };

  const todasOk = selec.size > 0 && Array.from(selec).every(r => estados[r]?.estado === "ok");

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0e0e1a] sm:rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1877F2]/20 to-[#E1306C]/20 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-base">Publicar en redes</h2>
            <p className="text-gray-500 text-xs truncate">{producto.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition"><X className="w-4 h-4"/></button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">

            {/* Preview del producto */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                {producto.fotos?.[0]?.url
                  ? <img src={producto.fotos[0].url.startsWith("http") ? producto.fotos[0].url : `${API_URL}${producto.fotos[0].url}`} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-600"/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{producto.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-orange-400 text-xs font-black">L{parseFloat(String(producto.precio_con_descuento || producto.precio)).toFixed(2)}</span>
                  {producto.porcentaje_descuento > 0 && <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{producto.porcentaje_descuento}%</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white/5 px-2 py-1.5 rounded-lg">
                <Globe className="w-3 h-3 text-gray-600"/>
                <span className="text-[10px] text-gray-600 font-mono">/{producto.id.slice(0,6)}</span>
              </div>
            </div>

            {/* Selección de redes */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">¿Dónde publicar?</p>
              {cargando ? (
                <div className="grid grid-cols-2 gap-3">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse"/>)}</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(["facebook","instagram"] as const).map(red => {
                    const r   = REDES[red];
                    const cx  = conexiones.find(c => c.red === red);
                    const on  = selec.has(red);
                    const est = estados[red];
                    return (
                      <button key={red} onClick={() => setSelec(p => { const s = new Set(p); s.has(red) ? s.delete(red) : s.add(red); return s; })}
                        className={`relative flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left
                          ${on && !est ? `border-[${r.color}]/40 bg-[${r.color}]/8` : ""}
                          ${!on ? "border-white/[0.07] bg-white/[0.03] hover:border-white/[0.12]" : ""}
                          ${est?.estado==="ok"   ? "border-emerald-500/40 bg-emerald-950/20" : ""}
                          ${est?.estado==="error" ? "border-red-500/30 bg-red-950/15" : ""}`}>
                        <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${on ? "border-white bg-white" : "border-white/20"}`}>
                          {on && <div className="w-2 h-2 rounded-full" style={{ background: r.color }}/>}
                        </div>
                        {r.icon}
                        <div>
                          <p className="text-white text-sm font-bold">{r.nombre}</p>
                          {cx?.conectada
                            ? <div className="flex items-center gap-1"><Wifi className="w-2.5 h-2.5 text-emerald-400"/><p className="text-[10px] text-emerald-400 truncate max-w-[90px]">{cx.nombre_pagina || "Conectado"}</p></div>
                            : <div className="flex items-center gap-1"><WifiOff className="w-2.5 h-2.5 text-gray-600"/><p className="text-[10px] text-gray-600">Sin conectar</p></div>}
                        </div>
                        {est?.estado === "publicando" && <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{color:r.color}}/></div>}
                        {est?.estado === "ok"         && <div className="absolute inset-0 rounded-2xl bg-emerald-950/60 flex flex-col items-center justify-center gap-1"><CheckCircle2 className="w-5 h-5 text-emerald-400"/><p className="text-[10px] text-emerald-400 font-bold">Publicado</p></div>}
                        {est?.estado === "error"      && <div className="absolute inset-0 rounded-2xl bg-red-950/60 flex flex-col items-center justify-center gap-1 p-3"><AlertTriangle className="w-4 h-4 text-red-400"/><p className="text-[10px] text-red-400 font-bold text-center">{est.msg}</p></div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {!cargando && (
                <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  {conexiones.some(c => c.conectada)
                    ? <><Zap className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5"/><p className="text-[11px] text-gray-500">Las redes <span className="text-white font-semibold">conectadas</span> se publican automáticamente. Las demás abren una ventana.</p></>
                    : <><Radio className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5"/><p className="text-[11px] text-gray-500">Se abrirá Facebook/Instagram con el contenido listo. <button onClick={() => window.open("/vendedor/dashboard/redes-sociales","_blank")} className="text-orange-400 underline">Conectar para automatizar →</button></p></>}
                </div>
              )}
            </div>

            {/* Texto editable */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Texto de publicación</p>
                <div className="flex gap-3">
                  <button onClick={() => setTexto(buildTexto(producto, vendedor, productoURL))} className="text-[10px] text-gray-600 hover:text-gray-400 transition">Restablecer</button>
                  <button onClick={() => { navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(()=>setCopiado(false),2000); }}
                    className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-semibold transition">
                    {copiado ? <><Check className="w-3 h-3"/>Copiado</> : <><Copy className="w-3 h-3"/>Copiar</>}
                  </button>
                </div>
              </div>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={7}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 text-xs leading-relaxed font-mono focus:border-orange-500/40 outline-none resize-none transition"/>
              <div className="flex justify-between mt-1">
                <p className="text-[10px] text-gray-600">El link lleva al producto en Mercado Fénix</p>
                <p className={`text-[10px] ${texto.length > 2000 ? "text-red-400" : "text-gray-600"}`}>{texto.length}/2000</p>
              </div>
            </div>

            {/* Links a posts publicados */}
            {Object.values(estados).some(e => e.estado === "ok" && e.post_url) && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Ver publicaciones</p>
                {Object.values(estados).filter(e => e.estado === "ok" && e.post_url).map((e,i) => (
                  <a key={i} href={e.post_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500/40 transition">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0"/>
                    <p className="text-emerald-300 text-sm font-semibold flex-1">Ver publicación</p>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-500"/>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-white/[0.06] space-y-3 bg-[#0e0e1a]">
          {todasOk && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
              <p className="text-emerald-300 text-sm font-semibold">¡Publicado en todas las redes seleccionadas!</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/8 text-gray-400 font-bold text-sm transition">Cerrar</button>
            <button onClick={publicarTodas} disabled={!selec.size || publicando || todasOk}
              className="flex-[2] py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#1877F2] via-[#9b2f7f] to-[#E1306C] hover:opacity-90 text-white shadow-xl">
              {publicando ? <><Loader2 className="w-4 h-4 animate-spin"/>Publicando...</> : <><Share2 className="w-4 h-4"/>Publicar{selec.size > 0 ? ` (${selec.size})` : ""}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function MisProductos() {
  const router = useRouter();
  const [productos,  setProductos]  = useState<Producto[]>([]);
  const [vendedor,   setVendedor]   = useState<any>(null);
  const [cargando,   setCargando]   = useState(true);
  const [filtro,     setFiltro]     = useState("");
  const [editando,   setEditando]   = useState<Producto|null>(null);
  const [compartiendo, setCompartiendo] = useState<Producto|null>(null);
  const [guardando,  setGuardando]  = useState(false);
  const [toast,      setToast]      = useState<{msg:string;tipo:"ok"|"err"}|null>(null);
  const [tab,        setTab]        = useState<"basico"|"detalles"|"fotos">("basico");

  // Form estados
  const [form,         setForm]         = useState<any>({});
  const [compatEdit,   setCompatEdit]   = useState<string[]>([]);
  const [variantesEdit,setVariantesEdit]= useState<{key:string;value:string}[]>([]);
  const [fotosExistentes, setFotosExistentes] = useState<FotoExistente[]>([]);
  const [fotosAEliminar,  setFotosAEliminar]  = useState<Set<number>>(new Set());
  const [fotasNuevas,     setFotasNuevas]     = useState<FotoNueva[]>([]);

  const dragExist = useDragSort(fotosExistentes, setFotosExistentes);
  const dragNueva = useDragSort(fotasNuevas,     setFotasNuevas);

  const showToast = (msg:string,tipo:"ok"|"err") => { setToast({msg,tipo}); setTimeout(()=>setToast(null),3500); };

  const cargar = useCallback(async () => {
    if (!getToken()) { router.push("/vendedor"); return; }
    try {
      const [pRes, vRes] = await Promise.all([
        axios.get(`${API_URL}/api/vendedor/mis-productos`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/vendedor/me`,            { headers: authHeaders() }),
      ]);
      setProductos(pRes.data || []);
      setVendedor(vRes.data);
    } catch (e: any) {
      if (e.response?.status === 401) router.push("/vendedor");
    } finally { setCargando(false); }
  }, [router]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => () => { fotasNuevas.forEach(f => URL.revokeObjectURL(f.preview)); }, [fotasNuevas]);

  const eliminar = async (id:string, nombre:string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/vendedor/productos/${id}`, { headers: authHeaders() });
      showToast("Producto eliminado", "ok");
      setProductos(p => p.filter(x => x.id !== id));
    } catch { showToast("Error al eliminar", "err"); }
  };

  const abrirEditar = async (prod: Producto) => {
    try {
      const res = await axios.get(`${API_URL}/api/vendedor/productos/${prod.id}`, { headers: authHeaders() });
      const p: any = res.data;
      setEditando(p); setTab("basico");
      setForm({
        nombre: p.nombre||"", subtitulo: p.subtitulo||"", categoria: p.categoria||"",
        descripcion: p.descripcion||"", precio: String(p.precio||""),
        descuento: String(p.porcentaje_descuento||0), idioma: p.idioma||"Español",
        etiquetas: (p.etiquetas||[]).join(", "),
        stock: String(p.stock??1), stock_minimo_alerta: String(p.stock_minimo_alerta??0),
        condicion: p.condicion||"nuevo", marca: p.marca||"", modelo: p.modelo||"",
        sku: p.sku||"", material: p.material||"", peso_gramos: String(p.peso_gramos||""),
        largo_cm: String(p.largo_cm||""), ancho_cm: String(p.ancho_cm||""), alto_cm: String(p.alto_cm||""),
        garantia_meses: String(p.garantia_meses??0), descripcion_garantia: p.descripcion_garantia||"",
        licencia: p.licencia||"personal", version: p.version||"", nivel_dificultad: p.nivel_dificultad||"",
        incluye_soporte: p.incluye_soporte||false, dias_soporte: String(p.dias_soporte||""),
        duracion_minutos: String(p.duracion_minutos||""), num_lecciones: String(p.num_lecciones||""),
        num_paginas: String(p.num_paginas||""), autor: p.autor||"", editorial: p.editorial||"",
        isbn: p.isbn||"", max_descargas: String(p.max_descargas||""), dias_acceso: String(p.dias_acceso||""),
        preview_url: p.preview_url||"", permite_reventa: p.permite_reventa||false,
        permite_modificar: p.permite_modificar!==false, resolucion: p.resolucion||"",
        lenguajes_str: (p.lenguajes||[]).join(", "), frameworks_str: (p.frameworks||[]).join(", "),
        software_str: (p.requiere_software||[]).join(", "),
      });
      setCompatEdit(p.compatibilidad||[]);
      setVariantesEdit(Object.entries(p.variantes||{}).map(([key,value])=>({key,value:String(value)})));
      setFotosExistentes([...(p.fotos||[])]);
      setFotosAEliminar(new Set());
      setFotasNuevas([]);
    } catch { showToast("Error al cargar el producto", "err"); }
  };

  const procesarNuevas = async (files: File[]) => {
    const items: FotoNueva[] = files.map(f => ({
      uid: Math.random().toString(36).slice(2), file: f,
      preview: URL.createObjectURL(f), originalKB: Math.round(f.size/1024), optimizedKB: 0, optimizing: true,
    }));
    setFotasNuevas(prev => [...prev, ...items]);
    for (const item of items) {
      try {
        const opt = await optimizarImagen(item.file);
        const pv = URL.createObjectURL(opt);
        setFotasNuevas(prev => prev.map(f => f.uid===item.uid ? {...f,file:opt,preview:pv,optimizedKB:Math.round(opt.size/1024),optimizing:false} : f));
        URL.revokeObjectURL(item.preview);
      } catch { setFotasNuevas(prev => prev.map(f => f.uid===item.uid ? {...f,optimizing:false,optimizedKB:f.originalKB} : f)); }
    }
  };

  const campos = CAMPOS_CATEGORIA[form.categoria] || [];
  const tiene  = (c: string) => campos.includes(c);

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.append("nombre",      form.nombre);
    fd.append("subtitulo",   form.subtitulo||"");
    fd.append("categoria",   form.categoria);
    fd.append("descripcion", form.descripcion||"");
    fd.append("precio",      form.precio);
    fd.append("descuento",   form.descuento||"0");
    fd.append("idioma",      form.idioma||"Español");
    fd.append("etiquetas", JSON.stringify((form.etiquetas||"").split(",").map((t:string)=>t.trim()).filter(Boolean)));

    if (editando.tipo === "fisico") {
      fd.append("stock",                form.stock||"1");
      fd.append("stock_minimo_alerta",  form.stock_minimo_alerta||"0");
      fd.append("condicion",            form.condicion||"nuevo");
      fd.append("marca",                form.marca||"");
      fd.append("modelo",               form.modelo||"");
      fd.append("sku",                  form.sku||"");
      fd.append("material",             form.material||"");
      fd.append("garantia_meses",       form.garantia_meses||"0");
      fd.append("descripcion_garantia", form.descripcion_garantia||"");
      if (form.peso_gramos) fd.append("peso_gramos", form.peso_gramos);
      if (form.largo_cm)    fd.append("largo_cm",    form.largo_cm);
      if (form.ancho_cm)    fd.append("ancho_cm",    form.ancho_cm);
      if (form.alto_cm)     fd.append("alto_cm",     form.alto_cm);
      variantesEdit.filter(v=>v.key&&v.value).forEach(v => fd.append(v.key, v.value));
    } else {
      fd.append("licencia",          form.licencia||"personal");
      fd.append("version",           form.version||"");
      fd.append("nivel_dificultad",  form.nivel_dificultad||"");
      fd.append("incluye_soporte",   String(form.incluye_soporte||false));
      fd.append("permite_reventa",   String(form.permite_reventa||false));
      fd.append("permite_modificar", String(form.permite_modificar!==false));
      fd.append("preview_url",       form.preview_url||"");
      fd.append("resolucion",        form.resolucion||"");
      fd.append("compatibilidad",    JSON.stringify(compatEdit));
      fd.append("lenguajes",  JSON.stringify((form.lenguajes_str||"").split(",").map((s:string)=>s.trim()).filter(Boolean)));
      fd.append("frameworks", JSON.stringify((form.frameworks_str||"").split(",").map((s:string)=>s.trim()).filter(Boolean)));
      fd.append("requiere_software", JSON.stringify((form.software_str||"").split(",").map((s:string)=>s.trim()).filter(Boolean)));
      if (form.dias_soporte)    fd.append("dias_soporte",    form.dias_soporte);
      if (form.duracion_minutos) fd.append("duracion_minutos", form.duracion_minutos);
      if (form.num_lecciones)   fd.append("num_lecciones",   form.num_lecciones);
      if (form.num_paginas)     fd.append("num_paginas",     form.num_paginas);
      if (form.autor)           fd.append("autor",           form.autor);
      if (form.editorial)       fd.append("editorial",       form.editorial);
      if (form.isbn)            fd.append("isbn",            form.isbn);
      if (form.max_descargas)   fd.append("max_descargas",   form.max_descargas);
      if (form.dias_acceso)     fd.append("dias_acceso",     form.dias_acceso);
    }

    fotosAEliminar.forEach(id => fd.append("eliminar_fotos", String(id)));
    fotosExistentes.filter(f => !fotosAEliminar.has(f.id)).forEach(f => fd.append("orden_fotos", String(f.id)));
    fotasNuevas.forEach(f => fd.append("fotos", f.file));

    try {
      await axios.put(`${API_URL}/api/vendedor/productos/${editando.id}`, fd, { headers: authHeaders() });
      showToast("¡Producto actualizado!", "ok");
      setEditando(null);
      cargar();
    } catch { showToast("Error al guardar", "err"); }
    finally { setGuardando(false); }
  };

  const filtrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(filtro.toLowerCase())
  );

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-[#080810]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin"/>
        <p className="text-orange-300 text-sm font-bold animate-pulse">Cargando productos...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080810] pb-24">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold pointer-events-none
          ${toast.tipo==="ok" ? "bg-[#0a1f14] border-emerald-500/40 text-emerald-200" : "bg-[#1f0a0a] border-red-500/40 text-red-200"}`}>
          {toast.tipo==="ok" ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <AlertTriangle className="w-4 h-4 text-red-400"/>}
          {toast.msg}
        </div>
      )}

      <button onClick={() => router.push("/vendedor/dashboard")}
        className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur p-2.5 rounded-xl hover:bg-orange-600/80 transition shadow-xl border border-white/8">
        <ArrowLeft className="w-5 h-5 text-white"/>
      </button>

      <div className="max-w-4xl mx-auto px-4 pt-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pt-2">
          <div>
            <h1 className="text-2xl font-black text-white">Mis Productos</h1>
            <p className="text-gray-600 text-xs mt-0.5">{productos.length} producto{productos.length!==1?"s":""} publicados</p>
          </div>
          <button onClick={() => router.push("/vendedor/dashboard/productos/nuevo")}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-lg shadow-orange-900/30 hover:scale-[1.02] active:scale-95">
            <Plus className="w-4 h-4"/> Nuevo producto
          </button>
        </div>

        {/* Buscador */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4"/>
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar por nombre o categoría..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder-gray-600 focus:border-orange-500/40 outline-none transition"/>
          {filtro && <button onClick={() => setFiltro("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"><X className="w-3.5 h-3.5"/></button>}
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Package className="w-14 h-14 text-gray-800"/>
            <p className="text-gray-500 font-semibold text-sm">{filtro ? "Sin resultados" : "Aún no tienes productos"}</p>
            {!filtro && <button onClick={() => router.push("/vendedor/dashboard/productos/nuevo")}
              className="mt-1 bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition">
              Publica tu primer producto
            </button>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map(p => {
              const fotoUrl = p.fotos?.[0]?.url ? `${API_URL}${p.fotos[0].url}` : null;
              const pFinal  = p.porcentaje_descuento > 0 ? (p.precio*(1-p.porcentaje_descuento/100)).toFixed(2) : null;
              return (
                <div key={p.id} className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-3 transition-all">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-800/80 flex-shrink-0">
                    {fotoUrl ? <img src={fotoUrl} alt={p.nombre} className="w-full h-full object-cover" onError={e=>(e.currentTarget.style.display="none")}/>
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-700"/></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.nombre}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] bg-orange-900/40 text-orange-300 px-2 py-0.5 rounded-full">{p.categoria}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.tipo==="fisico"?"bg-blue-900/40 text-blue-300":"bg-purple-900/40 text-purple-300"}`}>{p.tipo}</span>
                      {p.tipo==="fisico" && <span className={`text-[10px] px-2 py-0.5 rounded-full ${(p.stock??0)>0?"bg-green-900/40 text-green-400":"bg-red-900/40 text-red-400"}`}>Stock: {p.stock??0}</span>}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block flex-shrink-0">
                    {pFinal ? <><p className="text-gray-600 line-through text-xs">L{p.precio.toFixed(2)}</p><p className="text-red-400 font-black">L{pFinal}</p></>
                      : <p className="text-green-400 font-black">L{p.precio.toFixed(2)}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {/* Compartir */}
                    <button onClick={() => setCompartiendo(p)}
                      className="p-2.5 rounded-xl bg-gradient-to-br from-[#1877F2]/15 to-[#E1306C]/15 hover:from-[#1877F2]/30 hover:to-[#E1306C]/30 text-white/60 hover:text-white transition"
                      title="Compartir en redes sociales">
                      <Share2 className="w-4 h-4"/>
                    </button>
                    {/* Editar */}
                    <button onClick={() => abrirEditar(p)} className="p-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white transition"><Edit className="w-4 h-4"/></button>
                    {/* Eliminar */}
                    <button onClick={() => eliminar(p.id, p.nombre)} className="p-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white transition"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL COMPARTIR ─────────────────────────────────────────────────── */}
      {compartiendo && vendedor && (
        <ModalCompartir producto={compartiendo} vendedor={vendedor} onClose={() => setCompartiendo(null)} />
      )}

      {/* ── MODAL EDICIÓN ────────────────────────────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-stretch justify-center overflow-hidden">
          <div className="w-full max-w-2xl bg-[#0c0c14] flex flex-col h-full border-x border-white/[0.06]">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Editando</p>
                <h2 className="text-base font-black text-white truncate">{editando.nombre}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={guardar} disabled={guardando}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
                  {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
                <button onClick={() => setEditando(null)} className="p-2 rounded-xl bg-white/5 hover:bg-red-600/40 text-gray-400 hover:text-white transition">
                  <X className="w-4 h-4"/>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.07] flex-shrink-0 bg-white/[0.02]">
              {([
                {id:"basico",   label:"Básico",   icon:Tag},
                {id:"detalles", label:editando.tipo==="fisico"?"Físico":"Digital", icon:editando.tipo==="fisico"?Package:FileText},
                {id:"fotos",    label:editando.tipo==="fisico"?"Fotos":"Archivo",  icon:ImageIcon},
              ] as const).map(({id,label,icon:Icon}) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2
                    ${tab===id ? "border-orange-500 text-orange-400 bg-orange-500/5" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                  <Icon className="w-3.5 h-3.5"/>{label}
                </button>
              ))}
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">

                {/* ── TAB BÁSICO ──────────────────────────────────────────── */}
                {tab==="basico" && (<>
                  <F t="Nombre *"><input value={form.nombre||""} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Nombre" className={inp}/></F>
                  <F t="Subtítulo"><input value={form.subtitulo||""} onChange={e=>setForm({...form,subtitulo:e.target.value})} placeholder="Complementa el nombre" className={inp}/></F>
                  <F t="Categoría">
                    <div className="relative">
                      <select value={form.categoria||""} onChange={e=>setForm({...form,categoria:e.target.value})} className={sel}>
                        <option value="">Seleccionar</option>
                        <optgroup label="── Físico ──">{CATEGORIAS_FISICO.map(c=><option key={c}>{c}</option>)}</optgroup>
                        <optgroup label="── Digital ──">{CATEGORIAS_DIGITAL.map(c=><option key={c}>{c}</option>)}</optgroup>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none"/>
                    </div>
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F t="Precio (L) *">
                      <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500 text-xs font-bold">L</span>
                        <input type="number" min="0" step="0.01" value={form.precio||""} onChange={e=>setForm({...form,precio:e.target.value})} placeholder="0.00" className={inp+" pl-6"}/>
                      </div>
                    </F>
                    <F t="Descuento %"><input type="number" min="0" max="100" value={form.descuento||""} onChange={e=>setForm({...form,descuento:e.target.value})} placeholder="0" className={inp}/></F>
                  </div>
                  {form.precio && form.descuento && parseFloat(form.descuento)>0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                      <Tag className="w-3.5 h-3.5 text-emerald-400"/>
                      <span className="text-xs text-gray-500">Precio final:</span>
                      <span className="font-black text-emerald-400">L{(parseFloat(form.precio)*(1-parseFloat(form.descuento)/100)).toFixed(2)}</span>
                    </div>
                  )}
                  <F t="Descripción"><textarea value={form.descripcion||""} onChange={e=>setForm({...form,descripcion:e.target.value})} rows={3} placeholder="Describe el producto..." className={inp+" resize-none"}/></F>
                  <div className="grid grid-cols-2 gap-3">
                    <F t="Idioma">
                      <div className="relative">
                        <select value={form.idioma||"Español"} onChange={e=>setForm({...form,idioma:e.target.value})} className={sel}>
                          {["Español","Inglés","Portugués","Francés","Otro"].map(i=><option key={i}>{i}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none"/>
                      </div>
                    </F>
                    <F t="Etiquetas" hint="Separadas por coma"><input value={form.etiquetas||""} onChange={e=>setForm({...form,etiquetas:e.target.value})} placeholder="ropa, nike..." className={inp}/></F>
                  </div>
                </>)}

                {/* ── TAB DETALLES ─────────────────────────────────────────── */}
                {tab==="detalles" && (<>
                  {editando.tipo==="fisico" && (<>
                    <div className="grid grid-cols-2 gap-3">
                      <F t="Stock *"><input type="number" min="0" value={form.stock||""} onChange={e=>setForm({...form,stock:e.target.value})} placeholder="1" className={inp}/></F>
                      <F t="Alerta mínimo"><input type="number" min="0" value={form.stock_minimo_alerta||""} onChange={e=>setForm({...form,stock_minimo_alerta:e.target.value})} placeholder="0" className={inp}/></F>
                    </div>
                    {tiene("condicion") && (
                      <F t="Condición">
                        <div className="relative">
                          <select value={form.condicion||"nuevo"} onChange={e=>setForm({...form,condicion:e.target.value})} className={sel}>
                            {CONDICIONES.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none"/>
                        </div>
                      </F>
                    )}
                    {(tiene("marca")||tiene("modelo")) && (
                      <div className="grid grid-cols-2 gap-3">
                        {tiene("marca") && <F t="Marca"><input value={form.marca||""} onChange={e=>setForm({...form,marca:e.target.value})} placeholder="Nike..." className={inp}/></F>}
                        {tiene("modelo") && <F t="Modelo"><input value={form.modelo||""} onChange={e=>setForm({...form,modelo:e.target.value})} placeholder="Air Max..." className={inp}/></F>}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {tiene("sku")     && <F t="SKU"><input value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="SKU-001" className={inp}/></F>}
                      {tiene("material")&& <F t="Material"><input value={form.material||""} onChange={e=>setForm({...form,material:e.target.value})} placeholder="Algodón..." className={inp}/></F>}
                    </div>
                    {/* Variantes */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Variantes</p>
                      <div className="space-y-2">
                        {variantesEdit.map((v,i) => (
                          <div key={i} className="flex gap-2">
                            <input value={v.key} onChange={e=>setVariantesEdit(p=>p.map((x,j)=>j===i?{...x,key:e.target.value}:x))} placeholder="Tipo" className={inp+" flex-1"}/>
                            <input value={v.value} onChange={e=>setVariantesEdit(p=>p.map((x,j)=>j===i?{...x,value:e.target.value}:x))} placeholder="Valores" className={inp+" flex-1"}/>
                            <button onClick={()=>setVariantesEdit(p=>p.filter((_,j)=>j!==i))} className="p-2.5 text-gray-600 hover:text-red-400 transition"><X className="w-3.5 h-3.5"/></button>
                          </div>
                        ))}
                      </div>
                      <button onClick={()=>setVariantesEdit(p=>[...p,{key:"",value:""}])} className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 mt-2 transition font-semibold">
                        <Plus className="w-3.5 h-3.5"/> Agregar variante
                      </button>
                    </div>
                    {(tiene("dimensiones")||tiene("peso")) && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Dimensiones y peso</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {tiene("peso") && <F t="Peso (g)"><input type="number" min="0" value={form.peso_gramos||""} onChange={e=>setForm({...form,peso_gramos:e.target.value})} placeholder="0" className={inp}/></F>}
                          {tiene("dimensiones") && (<>
                            <F t="Largo (cm)"><input type="number" min="0" value={form.largo_cm||""} onChange={e=>setForm({...form,largo_cm:e.target.value})} placeholder="0" className={inp}/></F>
                            <F t="Ancho (cm)"><input type="number" min="0" value={form.ancho_cm||""} onChange={e=>setForm({...form,ancho_cm:e.target.value})} placeholder="0" className={inp}/></F>
                            <F t="Alto (cm)"><input type="number" min="0" value={form.alto_cm||""} onChange={e=>setForm({...form,alto_cm:e.target.value})} placeholder="0" className={inp}/></F>
                          </>)}
                        </div>
                      </div>
                    )}
                    {tiene("garantia") && (
                      <div className="grid grid-cols-2 gap-3">
                        <F t="Meses garantía"><input type="number" min="0" value={form.garantia_meses||""} onChange={e=>setForm({...form,garantia_meses:e.target.value})} placeholder="0" className={inp}/></F>
                        <F t="Desc. garantía"><input value={form.descripcion_garantia||""} onChange={e=>setForm({...form,descripcion_garantia:e.target.value})} placeholder="Del fabricante..." className={inp}/></F>
                      </div>
                    )}
                  </>)}

                  {editando.tipo==="digital" && (<>
                    {(tiene("autor")||tiene("paginas")) && (
                      <div className="grid grid-cols-2 gap-3">
                        <F t="Autor"><input value={form.autor||""} onChange={e=>setForm({...form,autor:e.target.value})} placeholder="Nombre" className={inp}/></F>
                        <F t="Editorial"><input value={form.editorial||""} onChange={e=>setForm({...form,editorial:e.target.value})} placeholder="Editorial" className={inp}/></F>
                        <F t="ISBN"><input value={form.isbn||""} onChange={e=>setForm({...form,isbn:e.target.value})} placeholder="978-..." className={inp}/></F>
                        {tiene("paginas") && <F t="Páginas"><input type="number" min="1" value={form.num_paginas||""} onChange={e=>setForm({...form,num_paginas:e.target.value})} placeholder="0" className={inp}/></F>}
                      </div>
                    )}
                    {(tiene("duracion")||tiene("lecciones")) && (
                      <div className="grid grid-cols-2 gap-3">
                        {tiene("duracion")  && <F t="Duración (min)"><input type="number" min="0" value={form.duracion_minutos||""} onChange={e=>setForm({...form,duracion_minutos:e.target.value})} placeholder="60" className={inp}/></F>}
                        {tiene("lecciones") && <F t="Nº lecciones"><input type="number" min="0" value={form.num_lecciones||""} onChange={e=>setForm({...form,num_lecciones:e.target.value})} placeholder="0" className={inp}/></F>}
                      </div>
                    )}
                    {tiene("lenguajes") && (<>
                      <F t="Lenguajes" hint="Separados por coma"><input value={form.lenguajes_str||""} onChange={e=>setForm({...form,lenguajes_str:e.target.value})} placeholder="Python, JS..." className={inp}/></F>
                      <F t="Frameworks"><input value={form.frameworks_str||""} onChange={e=>setForm({...form,frameworks_str:e.target.value})} placeholder="React, FastAPI..." className={inp}/></F>
                    </>)}
                    {tiene("software") && <F t="Software requerido" hint="Separado por coma"><input value={form.software_str||""} onChange={e=>setForm({...form,software_str:e.target.value})} placeholder="Photoshop, Figma..." className={inp}/></F>}
                    {tiene("resolucion") && <F t="Resolución"><input value={form.resolucion||""} onChange={e=>setForm({...form,resolucion:e.target.value})} placeholder="4K, 300 DPI..." className={inp}/></F>}
                    <div className="grid grid-cols-2 gap-3">
                      {tiene("version") && <F t="Versión"><input value={form.version||""} onChange={e=>setForm({...form,version:e.target.value})} placeholder="1.0.0" className={inp}/></F>}
                      {tiene("nivel") && (
                        <F t="Nivel">
                          <div className="relative">
                            <select value={form.nivel_dificultad||""} onChange={e=>setForm({...form,nivel_dificultad:e.target.value})} className={sel}>
                              <option value="">N/A</option>
                              {NIVELES.map(n=><option key={n} value={n}>{n.charAt(0).toUpperCase()+n.slice(1)}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none"/>
                          </div>
                        </F>
                      )}
                    </div>
                    {tiene("compatibilidad") && (
                      <F t="Compatible con">
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {COMPAT.map(c => (
                            <button key={c} onClick={()=>setCompatEdit(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])}
                              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${compatEdit.includes(c)?"border-orange-500 bg-orange-500/10 text-orange-300":"border-white/10 text-gray-500 hover:border-white/20"}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </F>
                    )}
                    {tiene("licencia") && (
                      <F t="Licencia">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {LICENCIAS.map(l => (
                            <button key={l.v} onClick={()=>setForm({...form,licencia:l.v})}
                              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition text-left ${form.licencia===l.v?"border-orange-500 bg-orange-500/10 text-orange-300":"border-white/8 text-gray-500 hover:border-white/15"}`}>
                              {l.l}
                            </button>
                          ))}
                        </div>
                      </F>
                    )}
                    {tiene("descargas") && (
                      <div className="grid grid-cols-2 gap-3">
                        <F t="Máx. descargas" hint="Vacío = ∞"><input type="number" min="1" value={form.max_descargas||""} onChange={e=>setForm({...form,max_descargas:e.target.value})} placeholder="∞" className={inp}/></F>
                        <F t="Días de acceso" hint="Vacío = ∞"><input type="number" min="1" value={form.dias_acceso||""} onChange={e=>setForm({...form,dias_acceso:e.target.value})} placeholder="∞" className={inp}/></F>
                      </div>
                    )}
                    {tiene("soporte") && (
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 space-y-3">
                        <Tog v={form.incluye_soporte||false} onChange={v=>setForm({...form,incluye_soporte:v})} label="Incluye soporte al comprador"/>
                        {form.incluye_soporte && <F t="Días de soporte"><input type="number" min="1" value={form.dias_soporte||""} onChange={e=>setForm({...form,dias_soporte:e.target.value})} placeholder="30" className={inp}/></F>}
                        <Tog v={form.permite_reventa||false} onChange={v=>setForm({...form,permite_reventa:v})} label="Permite reventa"/>
                        <Tog v={form.permite_modificar!==false} onChange={v=>setForm({...form,permite_modificar:v})} label="Permite modificar"/>
                      </div>
                    )}
                    {tiene("preview") && <F t="URL de preview / demo"><input value={form.preview_url||""} onChange={e=>setForm({...form,preview_url:e.target.value})} placeholder="https://youtube.com/..." className={inp}/></F>}
                  </>)}
                </>)}

                {/* ── TAB FOTOS ────────────────────────────────────────────── */}
                {tab==="fotos" && (<>
                  {editando.tipo==="fisico" ? (<>
                    {fotosExistentes.length>0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <GripVertical className="w-3 h-3"/> Arrastra para reordenar · X para eliminar
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {fotosExistentes.map((foto,i) => {
                            const marc = fotosAEliminar.has(foto.id);
                            return (
                              <div key={foto.id} {...dragExist.h(i)}
                                className={`relative aspect-square rounded-xl overflow-hidden bg-gray-800/80 cursor-grab active:cursor-grabbing select-none transition-all
                                  ${dragExist.hov===i?"ring-2 ring-orange-500 scale-[1.04]":""}
                                  ${i===0&&!marc?"ring-2 ring-yellow-500/50":""}`}>
                                <img src={`${API_URL}${foto.url.startsWith("http") ? foto.url : foto.url}`} alt="" className={`w-full h-full object-cover pointer-events-none transition ${marc?"opacity-20 grayscale":""}`}/>
                                {i===0&&!marc && <div className="absolute top-1 left-1 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md pointer-events-none">PRINCIPAL</div>}
                                <button onClick={()=>setFotosAEliminar(prev=>{const s=new Set(prev);s.has(foto.id)?s.delete(foto.id):s.add(foto.id);return s;})}
                                  className={`absolute top-1 right-1 p-1.5 rounded-lg transition shadow-lg ${marc?"bg-green-600 hover:bg-green-500":"bg-black/60 hover:bg-red-600"}`}>
                                  {marc?<CheckCircle2 className="w-3 h-3 text-white"/>:<X className="w-3 h-3 text-white"/>}
                                </button>
                                {marc && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="bg-black/70 text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full">ELIMINAR</span></div>}
                                <div className="absolute bottom-1 right-1 bg-black/40 p-0.5 rounded pointer-events-none"><GripVertical className="w-2.5 h-2.5 text-white/40"/></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {fotasNuevas.length>0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fotos nuevas (arrastra para ordenar)</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {fotasNuevas.map((foto,i) => (
                            <div key={foto.uid} {...dragNueva.h(i)}
                              className={`relative aspect-square rounded-xl overflow-hidden bg-gray-800/80 cursor-grab active:cursor-grabbing select-none transition-all ${dragNueva.hov===i?"ring-2 ring-orange-500 scale-[1.04]":""}`}>
                              <img src={foto.preview} alt="" className="w-full h-full object-cover pointer-events-none"/>
                              {foto.optimizing && <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-1 pointer-events-none"><Loader2 className="w-4 h-4 text-orange-400 animate-spin"/><span className="text-[8px] text-orange-300 font-bold">Optimizando</span></div>}
                              {!foto.optimizing && foto.optimizedKB>0 && foto.optimizedKB<foto.originalKB && <div className="absolute bottom-1 left-1 bg-emerald-700/90 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 pointer-events-none"><Zap className="w-2 h-2"/>-{Math.round((1-foto.optimizedKB/foto.originalKB)*100)}%</div>}
                              <div className="absolute top-1 left-1 bg-emerald-700/80 text-[8px] font-black text-white px-1.5 py-0.5 rounded-md pointer-events-none">NUEVA</div>
                              <button onClick={()=>{URL.revokeObjectURL(foto.preview);setFotasNuevas(p=>p.filter(x=>x.uid!==foto.uid));}} className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 p-1.5 rounded-lg transition"><X className="w-3 h-3 text-white"/></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-dashed border-white/10 hover:border-orange-500/30 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition group">
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e=>{const f=Array.from(e.target.files||[]).filter(x=>x.type.startsWith("image/"));if(f.length)procesarNuevas(f);e.target.value="";}}/>
                      <Upload className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition"/>
                      <span className="text-sm text-gray-500 group-hover:text-gray-300 transition">Agregar más fotos</span>
                      <span className="text-xs text-gray-700 ml-auto">→ WebP optimizado</span>
                    </label>
                    {(fotosAEliminar.size>0||fotasNuevas.length>0) && (
                      <div className="px-3 py-2.5 rounded-xl bg-orange-950/30 border border-orange-500/20 text-xs space-y-1">
                        {fotosAEliminar.size>0 && <p className="text-red-400">• {fotosAEliminar.size} foto{fotosAEliminar.size>1?"s":""} se eliminarán</p>}
                        {fotasNuevas.length>0 && <p className="text-emerald-400">• {fotasNuevas.length} foto{fotasNuevas.length>1?"s nuevas":" nueva"} se agregarán</p>}
                      </div>
                    )}
                  </>) : (
                    <div className="space-y-4">
                      {editando.archivo_key && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/8">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-orange-400"/>
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">Archivo actual</p>
                            <p className="text-gray-500 text-xs">{editando.formato_archivo?.toUpperCase()||"Archivo"}{editando.tamano_bytes ? ` · ${(editando.tamano_bytes/1024/1024).toFixed(2)} MB` : ""}</p>
                          </div>
                        </div>
                      )}
                      <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/8">
                        <p className="text-xs text-gray-500">Para reemplazar el archivo, elimina el producto y vuelve a crearlo con el archivo actualizado.</p>
                      </div>
                    </div>
                  )}
                </>)}
              </div>
            </div>

            {/* Footer guardar */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-white/[0.07] bg-white/[0.02]">
              <button onClick={guardar} disabled={guardando}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-2 transition shadow-xl shadow-orange-900/20">
                {guardando ? <><Loader2 className="w-4 h-4 animate-spin"/>Guardando...</> : <><Save className="w-4 h-4"/>Guardar cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}