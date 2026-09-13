"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Save, X, Sparkles, GripVertical, Upload,
  ImageIcon, DollarSign, Plus, ChevronDown, Zap, CheckCircle2,
  AlertTriangle, Loader2, Package, FileText, Code, BookOpen,
  Music, Video, Archive, Palette, Shield, Star, Tag, Hash,
  Ruler, Weight, Camera, Globe, Clock, Users, Layers,
  Share2, Wifi, WifiOff, Copy, Check, ExternalLink, Radio
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PLATAFORMA_URL = "https://mercadofenix.hn"; // ← cambia a tu dominio

function getToken() { return typeof window !== "undefined" ? localStorage.getItem("vendedor_token") : null; }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

// ── Helpers para compartir ────────────────────────────────────────────────────
function slugify(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function buildProductoURL(vendedor: any, productoId: string) {
  return `${PLATAFORMA_URL}/tienda/${slugify(vendedor.nombre_tienda)}-${slugify(vendedor.municipio)}/producto/${productoId}`;
}
function buildTextoCompartir(producto: any, vendedor: any, url: string) {
  const precio = producto.precio_con_descuento || producto.precio;
  const desc   = producto.porcentaje_descuento > 0 ? ` 🏷️ ¡${producto.porcentaje_descuento}% OFF!` : "";
  return `🔥 ${producto.nombre}${desc}\n\n${producto.descripcion ? producto.descripcion.slice(0, 120) + (producto.descripcion.length > 120 ? "..." : "") : ""}\n\n💰 L${parseFloat(precio).toFixed(2)}\n🏪 ${vendedor.nombre_tienda} · ${vendedor.municipio}\n${producto.tipo === "fisico" ? `📦 Stock: ${producto.stock ?? "consultar"}` : "⬇️ Descarga inmediata"}\n\n👉 ${url}\n\n#MercadoFenix #Honduras`;
}

// ── Optimización de imágenes → WebP ──────────────────────────────────────────
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

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface FotoItem { id: string; file: File; preview: string; originalKB: number; optimizedKB: number; optimizing: boolean; }

// ── Catálogo de categorías con config por tipo ─────────────────────────────
const CATEGORIAS_FISICO = [
  { value: "Ropa y Moda",       icon: "👕", campos: ["condicion","marca","material","tallas","colores","genero","garantia","dimensiones"] },
  { value: "Calzado",           icon: "👟", campos: ["condicion","marca","material","tallas","colores","genero","garantia"] },
  { value: "Electrónica",       icon: "📱", campos: ["condicion","marca","modelo","sku","garantia","dimensiones","peso","voltaje"] },
  { value: "Computación",       icon: "💻", campos: ["condicion","marca","modelo","sku","garantia","dimensiones","peso","especificaciones"] },
  { value: "Celulares",         icon: "📲", campos: ["condicion","marca","modelo","sku","garantia","almacenamiento","colores"] },
  { value: "Accesorios",        icon: "⌚", campos: ["condicion","marca","material","colores","garantia"] },
  { value: "Hogar y Jardín",    icon: "🏠", campos: ["condicion","marca","material","dimensiones","peso","garantia","colores"] },
  { value: "Muebles",           icon: "🪑", campos: ["condicion","marca","material","dimensiones","peso","colores","garantia"] },
  { value: "Juguetes",          icon: "🧸", campos: ["condicion","marca","edad_recomendada","material","garantia"] },
  { value: "Deportes",          icon: "⚽", campos: ["condicion","marca","material","tallas","colores","garantia","dimensiones"] },
  { value: "Salud y Belleza",   icon: "💄", campos: ["condicion","marca","contenido","ingredientes","caducidad"] },
  { value: "Alimentos",         icon: "🍽️", campos: ["contenido","ingredientes","caducidad","peso"] },
  { value: "Otros",             icon: "📦", campos: ["condicion","marca","dimensiones","peso","garantia"] },
];

const CATEGORIAS_DIGITAL = [
  { value: "Proyectos de Programación", icon: "💻", campos: ["lenguajes","frameworks","nivel","version","compatibilidad","soporte","licencia","descargas","preview"] },
  { value: "Diseño y Arte",             icon: "🎨", campos: ["formato","software","version","licencia","resolucion","descargas","preview"] },
  { value: "Templates y Plantillas",    icon: "📐", campos: ["formato","software","version","licencia","descargas","preview"] },
  { value: "Libros y Documentos",       icon: "📚", campos: ["autor","editorial","isbn","paginas","idioma","licencia","descargas","preview"] },
  { value: "Cursos y Educación",        icon: "🎓", campos: ["autor","nivel","duracion","lecciones","idioma","soporte","licencia","descargas","preview"] },
  { value: "Música y Audio",            icon: "🎵", campos: ["formato","duracion","licencia","bpm","genero_musical","descargas","preview"] },
  { value: "Video y Multimedia",        icon: "🎬", campos: ["formato","duracion","resolucion","licencia","descargas","preview"] },
  { value: "Fotografía",               icon: "📷", campos: ["formato","resolucion","licencia","descargas","preview"] },
  { value: "Otros Digital",             icon: "💾", campos: ["formato","version","licencia","descargas","preview"] },
];

const CONDICIONES = [
  { v: "nuevo",           l: "Nuevo",            d: "Sin uso, en empaque original" },
  { v: "como_nuevo",      l: "Como nuevo",        d: "Usado muy poco, sin defectos" },
  { v: "buen_estado",     l: "Buen estado",       d: "Funciona perfecto, uso normal" },
  { v: "aceptable",       l: "Aceptable",         d: "Señales de uso visibles" },
  { v: "reacondicionado", l: "Reacondicionado",   d: "Revisado y reparado profesionalmente" },
];
const LICENCIAS = [
  { v: "personal",      l: "Personal",        d: "Solo uso personal" },
  { v: "comercial",     l: "Comercial",       d: "Proyectos comerciales" },
  { v: "educativa",     l: "Educativa",       d: "Contexto educativo" },
  { v: "ilimitado",     l: "Ilimitado",       d: "Sin restricciones" },
  { v: "codigo_abierto",l: "Código abierto",  d: "Libre redistribución" },
];
const NIVELES   = ["Básico","Intermedio","Avanzado","Experto"];
const COMPAT    = ["Windows","Mac","Linux","Android","iOS","Web"];
const EXTENSIONES_ACEPTADAS = ".zip,.rar,.7z,.tar,.gz,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.odt,.csv,.psd,.ai,.xd,.fig,.sketch,.eps,.svg,.png,.jpg,.jpeg,.webp,.mp4,.mov,.avi,.mp3,.wav,.flac,.m4a,.py,.js,.ts,.html,.css,.json,.xml,.sql,.sh,.ipynb,.epub,.mobi,.apk,.exe,.dmg";

// ── Drag & drop reorder ───────────────────────────────────────────────────────
function useDragSort(items: FotoItem[], setItems: React.Dispatch<React.SetStateAction<FotoItem[]>>) {
  const from = useRef<number|null>(null);
  const over = useRef<number|null>(null);
  const [hov, setHov] = useState<number|null>(null);
  const h = (i: number) => ({
    draggable: true as const,
    onDragStart: () => { from.current = i; },
    onDragEnter: () => { over.current = i; setHov(i); },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragEnd: () => {
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

// ── Componentes UI ────────────────────────────────────────────────────────────
const inp = "w-full px-4 py-3 rounded-xl bg-[#0f0f1e] border border-[#1e1e30] text-white text-sm placeholder-gray-600 focus:border-orange-500/50 focus:bg-[#141428] outline-none transition";
const sel = inp + " appearance-none cursor-pointer";

function Lbl({ t, hint, children }: { t: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t}</p>
      {children}
      {hint && <p className="text-[11px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full border transition relative flex-shrink-0 ${value ? "bg-orange-500 border-orange-500" : "bg-[#1a1a2e] border-[#2a2a3e]"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${value ? "left-5" : "left-0.5"}`} />
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function NuevoProducto() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);

  // ── Paso 1: Identificación ─────────────────────────────────────────────
  const [tipo, setTipo] = useState<"fisico" | "digital">("fisico");
  const [nombre, setNombre] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [descuento, setDescuento] = useState("");
  const [etiquetas, setEtiquetas] = useState("");

  // ── Estado post-publicación (para compartir) ──────────────────────────
  const [vendedor,         setVendedor]         = useState<any>(null);
  const [productoPublicado, setProductoPublicado] = useState<any>(null);
  const [modalCompartir,   setModalCompartir]   = useState(false);
  const [buscando, setBuscando]     = useState(false);
  const [sugs, setSugs]             = useState<any[]>([]);
  const [mostrarSugs, setMostrarSugs] = useState(false);
  const sugTimer = useRef<NodeJS.Timeout | null>(null);

  // Cargar datos del vendedor para construir la URL de compartir
  useEffect(() => {
    axios.get(`${API_URL}/api/vendedor/me`, { headers: authHeaders() })
      .then(r => setVendedor(r.data)).catch(() => {});
  }, []);

  // ── Paso 2: Detalles (dinámico por categoría) ──────────────────────────
  // Físico
  const [condicion, setCondicion]         = useState("nuevo");
  const [marca, setMarca]                 = useState("");
  const [modelo, setModelo]               = useState("");
  const [sku, setSku]                     = useState("");
  const [material, setMaterial]           = useState("");
  const [stock, setStock]                 = useState("1");
  const [stockAlerta, setStockAlerta]     = useState("0");
  const [garantiaMeses, setGarantiaMeses] = useState("0");
  const [descGarantia, setDescGarantia]   = useState("");
  const [pesoGramos, setPesoGramos]       = useState("");
  const [largoCm, setLargoCm]             = useState("");
  const [anchoCm, setAnchoCm]             = useState("");
  const [altoCm, setAltoCm]               = useState("");
  const [variantes, setVariantes]         = useState<{key:string;value:string}[]>([]);
  const [especificaciones, setEspecificaciones] = useState<{key:string;value:string}[]>([]);

  // Digital
  const [archivoDigital,  setArchivoDigital]  = useState<File | null>(null);
  // Portada visual para el producto digital (se guarda como foto)
  const [portadaDigital,  setPortadaDigital]  = useState<File | null>(null);
  const [portadaPreview,  setPortadaPreview]  = useState<string | null>(null);
  const [licencia, setLicencia]           = useState("personal");
  const [version, setVersion]             = useState("");
  const [compatibilidad, setCompatibilidad] = useState<string[]>([]);
  const [lenguajes, setLenguajes]         = useState("");
  const [frameworks, setFrameworks]       = useState("");
  const [nivel, setNivel]                 = useState("");
  const [incluyeSoporte, setIncluyeSoporte] = useState(false);
  const [diasSoporte, setDiasSoporte]     = useState("");
  const [duracion, setDuracion]           = useState("");
  const [numLecciones, setNumLecciones]   = useState("");
  const [numPaginas, setNumPaginas]       = useState("");
  const [autor, setAutor]                 = useState("");
  const [editorial, setEditorial]         = useState("");
  const [isbn, setIsbn]                   = useState("");
  const [maxDescargas, setMaxDescargas]   = useState("");
  const [diasAcceso, setDiasAcceso]       = useState("");
  const [previewUrl, setPreviewUrl]       = useState("");
  const [permiteReventa, setPermiteReventa]   = useState(false);
  const [permiteModificar, setPermiteModificar] = useState(true);
  const [requiereSoftware, setRequiereSoftware] = useState("");
  const [resolucion, setResolucion]       = useState("");
  const [bpm, setBpm]                     = useState("");
  const [generoMusical, setGeneroMusical] = useState("");

  // ── Paso 3: Imágenes / archivo ─────────────────────────────────────────
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const { h: dragH, hov: dragHov } = useDragSort(fotos, setFotos);

  const toast_ = (msg: string, tipo: "ok" | "err") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 4000); };

  // ── Sugerencias debounce ───────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(sugTimer.current!);
    if (nombre.trim().length < 2) { setSugs([]); setMostrarSugs(false); return; }
    sugTimer.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await axios.get(`${API_URL}/api/productos/buscar?q=${encodeURIComponent(nombre)}&limit=5`);
        setSugs(r.data || []); setMostrarSugs(true);
      } catch { setSugs([]); } finally { setBuscando(false); }
    }, 350);
    return () => clearTimeout(sugTimer.current!);
  }, [nombre]);

  const aplicarSug = (s: any) => {
    setNombre(s.nombre); setCategoria(s.categoria); setPrecio(String(s.precio));
    setDescripcion(s.descripcion || ""); setSubtitulo(s.subtitulo || "");
    if (s.tipo) setTipo(s.tipo); if (s.stock) setStock(String(s.stock));
    if (s.marca) setMarca(s.marca); if (s.autor) setAutor(s.autor);
    if (s.nivel_dificultad) setNivel(s.nivel_dificultad);
    setSugs([]); setMostrarSugs(false);
    toast_("Información precargada. Personalízala antes de guardar.", "ok");
  };

  // ── Procesado de imágenes ──────────────────────────────────────────────
  const procesarImagenes = async (files: File[]) => {
    const nuevas: FotoItem[] = files.map(f => ({
      id: Math.random().toString(36).slice(2), file: f, preview: URL.createObjectURL(f),
      originalKB: Math.round(f.size / 1024), optimizedKB: 0, optimizing: true,
    }));
    setFotos(prev => [...prev, ...nuevas]);
    for (const item of nuevas) {
      try {
        const opt = await optimizarImagen(item.file);
        const pv = URL.createObjectURL(opt);
        setFotos(prev => prev.map(f => f.id === item.id
          ? { ...f, file: opt, preview: pv, optimizedKB: Math.round(opt.size / 1024), optimizing: false } : f));
        URL.revokeObjectURL(item.preview);
      } catch {
        setFotos(prev => prev.map(f => f.id === item.id ? { ...f, optimizing: false, optimizedKB: f.originalKB } : f));
      }
    }
  };
  useEffect(() => () => { fotos.forEach(f => URL.revokeObjectURL(f.preview)); }, []);

  // ── Config de campos según categoría seleccionada ──────────────────────
  const catConfig = [...CATEGORIAS_FISICO, ...CATEGORIAS_DIGITAL].find(c => c.value === categoria);
  const campos = catConfig?.campos || [];
  const tiene = (c: string) => campos.includes(c);

  // ── Categorías activas según tipo ──────────────────────────────────────
  const categoriasActivas = tipo === "fisico" ? CATEGORIAS_FISICO : CATEGORIAS_DIGITAL;

  // ── Validación por paso ────────────────────────────────────────────────
  const validar1 = () => nombre.trim().length > 0 && categoria !== "" && precio !== "" && parseFloat(precio) > 0;
  const validar2 = () => true; // detalles son opcionales en general
  const validar3 = () => tipo === "fisico" ? fotos.length > 0 : archivoDigital !== null;

  const irPaso = (n: 1 | 2 | 3) => {
    if (n === 2 && !validar1()) { toast_("Completa nombre, categoría y precio", "err"); return; }
    if (n === 3 && !validar1()) { toast_("Completa los datos básicos primero", "err"); return; }
    setPaso(n);
  };

  // ── Guardar ────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!validar1()) { toast_("Faltan datos obligatorios", "err"); return; }
    if (!validar3()) { toast_(tipo === "fisico" ? "Agrega al menos una foto" : "Selecciona el archivo digital", "err"); return; }
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append("tipo", tipo); fd.append("categoria", categoria);
      fd.append("nombre", nombre.trim()); fd.append("subtitulo", subtitulo);
      fd.append("precio", precio); fd.append("descuento", descuento || "0");
      fd.append("descripcion", descripcion);
      fd.append("etiquetas", JSON.stringify(etiquetas.split(",").map(t => t.trim()).filter(Boolean)));

      if (tipo === "fisico") {
        fd.append("stock", stock || "1"); fd.append("stock_minimo_alerta", stockAlerta || "0");
        fd.append("condicion", condicion); fd.append("marca", marca); fd.append("modelo", modelo);
        fd.append("sku", sku); fd.append("material", material);
        fd.append("garantia_meses", garantiaMeses || "0"); fd.append("descripcion_garantia", descGarantia);
        if (pesoGramos) fd.append("peso_gramos", pesoGramos);
        if (largoCm)    fd.append("largo_cm", largoCm);
        if (anchoCm)    fd.append("ancho_cm", anchoCm);
        if (altoCm)     fd.append("alto_cm", altoCm);
        variantes.filter(v => v.key && v.value).forEach(v => fd.append(v.key, v.value));
        if (especificaciones.length) {
          const specs: any = {};
          especificaciones.filter(e => e.key && e.value).forEach(e => { specs[e.key] = e.value; });
          fd.append("especificaciones", JSON.stringify(specs));
        }
        fotos.forEach(f => fd.append("fotos", f.file));
      } else {
        fd.append("licencia", licencia); fd.append("version", version);
        fd.append("compatibilidad", JSON.stringify(compatibilidad));
        fd.append("lenguajes", JSON.stringify(lenguajes.split(",").map(s => s.trim()).filter(Boolean)));
        fd.append("frameworks", JSON.stringify(frameworks.split(",").map(s => s.trim()).filter(Boolean)));
        fd.append("requiere_software", JSON.stringify(requiereSoftware.split(",").map(s => s.trim()).filter(Boolean)));
        fd.append("nivel_dificultad", nivel);
        fd.append("incluye_soporte", String(incluyeSoporte));
        if (diasSoporte)   fd.append("dias_soporte", diasSoporte);
        if (duracion)      fd.append("duracion_minutos", duracion);
        if (numLecciones)  fd.append("num_lecciones", numLecciones);
        if (numPaginas)    fd.append("num_paginas", numPaginas);
        fd.append("autor", autor); fd.append("editorial", editorial); fd.append("isbn", isbn);
        if (maxDescargas)  fd.append("max_descargas", maxDescargas);
        if (diasAcceso)    fd.append("dias_acceso", diasAcceso);
        fd.append("preview_url", previewUrl);
        fd.append("permite_reventa", String(permiteReventa));
        fd.append("permite_modificar", String(permiteModificar));
        if (resolucion)    fd.append("resolucion", resolucion);
        if (bpm)           fd.append("bpm", bpm);
        if (generoMusical) fd.append("genero_musical", generoMusical);
        if (portadaDigital) fd.append("portada_digital", portadaDigital);
        if (archivoDigital) fd.append("archivo", archivoDigital);
      }

      const res = await axios.post(`${API_URL}/api/vendedor/productos`, fd, { headers: authHeaders() });
      const nuevoId = res.data?.id;
      toast_("¡Producto publicado con éxito!", "ok");

      // Guardar el producto recién creado para el modal de compartir
      if (nuevoId && vendedor) {
        setProductoPublicado({
          id: nuevoId, nombre: nombre.trim(), tipo, categoria,
          descripcion, precio: parseFloat(precio),
          precio_con_descuento: precioFinal ? parseFloat(precioFinal) : null,
          porcentaje_descuento: descuento ? parseFloat(descuento) : 0,
          stock: tipo === "fisico" ? parseInt(stock || "1") : null,
          fotos: fotos.length > 0 ? [{ url: null }] : [],  // fotos aún no tienen URL pública
        });
        setModalCompartir(true);
      } else {
        setTimeout(() => router.push("/vendedor/dashboard/productos"), 1500);
      }
    } catch (err: any) {
      toast_(err.response?.data?.detail || "Error al publicar", "err");
    } finally { setGuardando(false); }
  };

  const precioFinal = precio && descuento && parseFloat(descuento) > 0
    ? (parseFloat(precio) * (1 - parseFloat(descuento) / 100)).toFixed(2) : null;

  // ── Ahorro total de imágenes ───────────────────────────────────────────
  const ahorroTotal = fotos.filter(f => !f.optimizing && f.optimizedKB > 0).reduce((acc, f) => {
    return acc + Math.max(0, f.originalKB - f.optimizedKB);
  }, 0);

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#080810] overflow-x-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold pointer-events-none
          ${toast.tipo === "ok" ? "bg-[#0a1f14] border-emerald-500/40 text-emerald-200" : "bg-[#1f0a0a] border-red-500/40 text-red-200"}`}>
          {toast.tipo === "ok" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header fijo ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#080810]/95 backdrop-blur-xl border-b border-[#1a1a2e]">
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center gap-2 overflow-hidden">
          <button onClick={() => router.push("/vendedor/dashboard/productos")}
            className="p-2 rounded-xl bg-[#0f0f1e] hover:bg-[#141428] text-gray-500 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Pasos */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {([
              { n: 1, label: "Básico" },
              { n: 2, label: "Detalles" },
              { n: 3, label: tipo === "fisico" ? "Fotos" : "Archivo" },
            ] as const).map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`w-4 h-px transition-all sm:w-8 ${paso > i ? "bg-orange-500" : "bg-[#2a2a3e]"}`} />
                )}
                <button onClick={() => irPaso(n)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all sm:px-3 sm:py-1.5 sm:text-xs
                    ${paso === n ? "bg-orange-500 text-black shadow-lg shadow-orange-500/30" :
                      paso > n ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" :
                      "bg-[#1a1a2e] text-gray-500"}`}>
                  {paso > n ? <CheckCircle2 className="w-3 h-3" /> : <span>{n}</span>}
                  {label}
                </button>
              </div>
            ))}
          </div>

          <div className="w-9" /> {/* spacer */}
        </div>
      </div>

      {/* ── Contenido ──────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 overflow-x-hidden">

        {/* ══ PASO 1: Básico ══════════════════════════════════════════════ */}
        {paso === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Información básica</h2>
              <p className="text-sm text-gray-600 mt-1">¿Qué estás vendiendo?</p>
            </div>

            {/* Tipo físico / digital */}
            <div className="grid grid-cols-2 gap-3">
              {(["fisico","digital"] as const).map(t => (
                <button key={t} onClick={() => { setTipo(t); setCategoria(""); }}
                  className={`py-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all font-bold text-sm
                    ${tipo === t
                      ? "border-orange-500 bg-orange-500/8 text-orange-300"
                      : "border-[#1e1e30] bg-[#0f0f1e] text-gray-500 hover:border-[#2a2a3e] hover:text-gray-300"}`}>
                  {t === "fisico"
                    ? <Package className={`w-6 h-6 ${tipo===t?"text-orange-400":"text-gray-600"}`} />
                    : <FileText className={`w-6 h-6 ${tipo===t?"text-orange-400":"text-gray-600"}`} />}
                  {t === "fisico" ? "Producto físico" : "Producto digital"}
                  <span className="text-[11px] font-normal opacity-60">
                    {t === "fisico" ? "Envío al comprador" : "Descarga inmediata"}
                  </span>
                </button>
              ))}
            </div>

            {/* Nombre + sugerencias */}
            <div className="relative">
              <Lbl t="Nombre del producto *">
                <div className="relative">
                  <input value={nombre} onChange={e => setNombre(e.target.value)}
                    onBlur={() => setTimeout(() => setMostrarSugs(false), 200)}
                    onFocus={() => sugs.length > 0 && setMostrarSugs(true)}
                    placeholder="Ej: Camiseta Nike Dri-FIT talla M azul"
                    className={inp + " pr-9"} />
                  {buscando
                    ? <Loader2 className="absolute right-3 top-3.5 w-4 h-4 text-orange-400/60 animate-spin pointer-events-none" />
                    : nombre.length > 1 && <Sparkles className="absolute right-3 top-3.5 w-4 h-4 text-orange-400/30 pointer-events-none" />}
                </div>
              </Lbl>

              {/* Dropdown sugerencias */}
              {mostrarSugs && sugs.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#0f0f1a] border border-[#1e1e30] rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#181828] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs text-gray-500 font-medium">Productos similares — toca para precargar</span>
                  </div>
                  {sugs.map(s => (
                    <button key={s.id} onMouseDown={() => aplicarSug(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#141428] transition text-left group">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-800/80 flex-shrink-0">
                        {s.fotos?.[0]?.url
                          ? <img src={`${API_URL}${s.fotos[0].url}`} className="w-full h-full object-cover" />
                          : <ImageIcon className="w-4 h-4 text-gray-600 m-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{s.nombre}</p>
                        <p className="text-gray-500 text-xs">{s.categoria} · <span className="text-orange-400">L{s.precio}</span></p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 transition flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtítulo */}
            <Lbl t="Subtítulo" hint="Opcional — complementa el nombre en una línea">
              <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)}
                placeholder="Ej: Edición 2025 · Envío gratis en Tegucigalpa"
                className={inp} />
            </Lbl>

            {/* Categoría */}
            <Lbl t="Categoría *">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {categoriasActivas.map(c => (
                  <button key={c.value} onClick={() => setCategoria(c.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left
                      ${categoria === c.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-300"
                        : "border-[#1e1e30] bg-[#0f0f1e] text-gray-500 hover:border-[#2a2a3e] hover:text-gray-300"}`}>
                    <span className="text-base leading-none flex-shrink-0">{c.icon}</span>
                    <span className="truncate">{c.value}</span>
                  </button>
                ))}
              </div>
            </Lbl>

            {/* Precio + descuento */}
            <div className="grid grid-cols-2 gap-4">
              <Lbl t="Precio (L) *">
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-gray-500 text-sm font-bold select-none">L</span>
                  <input type="number" min="0" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)}
                    placeholder="0.00" className={inp + " pl-7"} />
                </div>
              </Lbl>
              <Lbl t="Descuento %">
                <input type="number" min="0" max="100" value={descuento} onChange={e => setDescuento(e.target.value)}
                  placeholder="0" className={inp} />
              </Lbl>
            </div>

            {precioFinal && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                <Tag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-gray-500">Precio final al comprador:</span>
                <span className="font-black text-emerald-400">L{precioFinal}</span>
                <span className="text-xs text-gray-600 line-through ml-auto">L{parseFloat(precio).toFixed(2)}</span>
              </div>
            )}

            {/* Descripción */}
            <Lbl t="Descripción" hint="Sé específico: más detalle = más confianza = más ventas">
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Describe tu producto: características, uso, qué incluye, por qué vale la pena..."
                rows={4} className={inp + " resize-none"} />
            </Lbl>

            {/* Etiquetas */}
            <Lbl t="Etiquetas" hint="Separadas por coma — ayudan a que te encuentren">
              <input value={etiquetas} onChange={e => setEtiquetas(e.target.value)}
                placeholder="ropa, deportiva, nike, running, hombre" className={inp} />
            </Lbl>

            <button onClick={() => irPaso(2)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-900/20">
              Continuar — Detalles del producto <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ══ PASO 2: Detalles (dinámico) ════════════════════════════════ */}
        {paso === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {catConfig?.icon} Detalles de {categoria || "tu producto"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Información específica de esta categoría</p>
            </div>

            {/* ── FÍSICO ────────────────────────────────────────────────── */}
            {tipo === "fisico" && (<>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-4">
                <Lbl t="Stock disponible *">
                  <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
                    placeholder="1" className={inp} />
                </Lbl>
                <Lbl t="Alerta stock mínimo" hint="Aviso cuando quede poco">
                  <input type="number" min="0" value={stockAlerta} onChange={e => setStockAlerta(e.target.value)}
                    placeholder="0" className={inp} />
                </Lbl>
              </div>

              {/* Condición */}
              {tiene("condicion") && (
                <Lbl t="Condición del producto *">
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    {CONDICIONES.map(c => (
                      <label key={c.v}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all
                          ${condicion === c.v ? "border-orange-500 bg-orange-500/8" : "border-[#1c1c2e] bg-[#0c0c18] hover:border-[#252540]"}`}>
                        <input type="radio" name="cond" value={c.v} checked={condicion === c.v} onChange={() => setCondicion(c.v)} className="hidden" />
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition ${condicion === c.v ? "border-orange-500 bg-orange-500" : "border-gray-600"}`} />
                        <div>
                          <p className={`text-sm font-semibold ${condicion === c.v ? "text-orange-300" : "text-gray-300"}`}>{c.l}</p>
                          <p className="text-xs text-gray-600">{c.d}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </Lbl>
              )}

              {/* Marca / Modelo */}
              {(tiene("marca") || tiene("modelo")) && (
                <div className="grid grid-cols-2 gap-4">
                  {tiene("marca") && (
                    <Lbl t="Marca">
                      <input value={marca} onChange={e => setMarca(e.target.value)}
                        placeholder="Nike, Samsung, Sony..." className={inp} />
                    </Lbl>
                  )}
                  {tiene("modelo") && (
                    <Lbl t="Modelo">
                      <input value={modelo} onChange={e => setModelo(e.target.value)}
                        placeholder="Galaxy S24, iPhone 15..." className={inp} />
                    </Lbl>
                  )}
                </div>
              )}

              {/* SKU / Material */}
              <div className="grid grid-cols-2 gap-4">
                {tiene("sku") && (
                  <Lbl t="SKU / Código">
                    <input value={sku} onChange={e => setSku(e.target.value)}
                      placeholder="SKU-001" className={inp} />
                  </Lbl>
                )}
                {tiene("material") && (
                  <Lbl t="Material">
                    <input value={material} onChange={e => setMaterial(e.target.value)}
                      placeholder="Algodón, Cuero, Plástico..." className={inp} />
                  </Lbl>
                )}
              </div>

              {/* Tallas / Colores */}
              {(tiene("tallas") || tiene("colores") || tiene("genero") || tiene("almacenamiento") || tiene("edad_recomendada")) && (
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Variantes disponibles</p>
                  <div className="space-y-2">
                    {tiene("tallas") && (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">Tallas</span>
                        <input defaultValue="" onBlur={e => { if (e.target.value) setVariantes(p => [...p.filter(x=>x.key!=="tallas"), {key:"tallas", value:e.target.value}]); }}
                          placeholder="XS, S, M, L, XL, XXL" className={inp} />
                      </div>
                    )}
                    {tiene("colores") && (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">Colores</span>
                        <input defaultValue="" onBlur={e => { if (e.target.value) setVariantes(p => [...p.filter(x=>x.key!=="colores"), {key:"colores", value:e.target.value}]); }}
                          placeholder="Rojo, Negro, Blanco, Azul" className={inp} />
                      </div>
                    )}
                    {tiene("almacenamiento") && (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">Almacen.</span>
                        <input defaultValue="" onBlur={e => { if (e.target.value) setVariantes(p => [...p.filter(x=>x.key!=="almacenamiento"), {key:"almacenamiento", value:e.target.value}]); }}
                          placeholder="64GB, 128GB, 256GB" className={inp} />
                      </div>
                    )}
                    {tiene("genero") && (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">Género</span>
                        <div className="relative flex-1">
                          <select className={sel} onChange={e => setVariantes(p => [...p.filter(x=>x.key!=="genero"), {key:"genero", value:e.target.value}])}>
                            <option value="">Seleccionar</option>
                            {["Hombre","Mujer","Unisex","Niño","Niña","Bebé"].map(g => <option key={g}>{g}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                    )}
                    {tiene("edad_recomendada") && (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">Edad</span>
                        <input defaultValue="" onBlur={e => { if (e.target.value) setVariantes(p => [...p.filter(x=>x.key!=="edad"), {key:"edad", value:e.target.value}]); }}
                          placeholder="3+ años, 8-12 años..." className={inp} />
                      </div>
                    )}
                  </div>
                  {/* Variantes extra */}
                  {variantes.filter(v => !["tallas","colores","almacenamiento","genero","edad"].includes(v.key)).map((v, i) => (
                    <div key={i} className="flex gap-2 mt-2">
                      <input value={v.key} onChange={e => setVariantes(p => p.map((x,j)=>j===i?{...x,key:e.target.value}:x))}
                        placeholder="Tipo" className={inp + " flex-1"} />
                      <input value={v.value} onChange={e => setVariantes(p => p.map((x,j)=>j===i?{...x,value:e.target.value}:x))}
                        placeholder="Opciones separadas por coma" className={inp + " flex-1"} />
                      <button onClick={() => setVariantes(p => p.filter((_,j)=>j!==i))} className="p-3 text-gray-600 hover:text-red-400 transition">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setVariantes(p => [...p, {key:"",value:""}])}
                    className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 mt-3 transition font-semibold">
                    <Plus className="w-3.5 h-3.5" /> Agregar otra variante
                  </button>
                </div>
              )}

              {/* Dimensiones y peso */}
              {(tiene("dimensiones") || tiene("peso")) && (
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Dimensiones y peso</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {tiene("peso") && (
                      <Lbl t="Peso (g)">
                        <input type="number" min="0" value={pesoGramos} onChange={e => setPesoGramos(e.target.value)} placeholder="0" className={inp} />
                      </Lbl>
                    )}
                    {tiene("dimensiones") && (<>
                      <Lbl t="Largo (cm)"><input type="number" min="0" value={largoCm} onChange={e => setLargoCm(e.target.value)} placeholder="0" className={inp}/></Lbl>
                      <Lbl t="Ancho (cm)"><input type="number" min="0" value={anchoCm} onChange={e => setAnchoCm(e.target.value)} placeholder="0" className={inp}/></Lbl>
                      <Lbl t="Alto (cm)"><input type="number" min="0" value={altoCm}   onChange={e => setAltoCm(e.target.value)}   placeholder="0" className={inp}/></Lbl>
                    </>)}
                  </div>
                </div>
              )}

              {/* Garantía */}
              {tiene("garantia") && (
                <div className="grid grid-cols-2 gap-4">
                  <Lbl t="Meses de garantía">
                    <input type="number" min="0" value={garantiaMeses} onChange={e => setGarantiaMeses(e.target.value)} placeholder="0" className={inp} />
                  </Lbl>
                  <Lbl t="Descripción de garantía">
                    <input value={descGarantia} onChange={e => setDescGarantia(e.target.value)} placeholder="Garantía del fabricante..." className={inp} />
                  </Lbl>
                </div>
              )}

              {/* Especificaciones técnicas */}
              {tiene("especificaciones") && (
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Especificaciones técnicas</p>
                  <div className="space-y-2">
                    {especificaciones.map((e, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={e.key} onChange={ev => setEspecificaciones(p => p.map((x,j)=>j===i?{...x,key:ev.target.value}:x))}
                          placeholder="Ej: RAM" className={inp + " flex-1"} />
                        <input value={e.value} onChange={ev => setEspecificaciones(p => p.map((x,j)=>j===i?{...x,value:ev.target.value}:x))}
                          placeholder="Ej: 16 GB" className={inp + " flex-1"} />
                        <button onClick={() => setEspecificaciones(p => p.filter((_,j)=>j!==i))} className="p-3 text-gray-600 hover:text-red-400 transition">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setEspecificaciones(p => [...p, {key:"",value:""}])}
                    className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 mt-3 transition font-semibold">
                    <Plus className="w-3.5 h-3.5" /> Agregar especificación
                  </button>
                </div>
              )}

              {/* Ingredientes / contenido */}
              {(tiene("ingredientes") || tiene("contenido")) && (
                <Lbl t={tiene("ingredientes") ? "Ingredientes / Composición" : "Contenido del paquete"}>
                  <textarea rows={3} className={inp + " resize-none"}
                    placeholder={tiene("ingredientes") ? "Lista de ingredientes o composición..." : "Descripción del contenido..."}
                    onChange={e => setVariantes(p => [...p.filter(x=>x.key!=="contenido"), {key:"contenido", value:e.target.value}])} />
                </Lbl>
              )}

            </>)}

            {/* ── DIGITAL ───────────────────────────────────────────────── */}
            {tipo === "digital" && (<>

              {/* Libro */}
              {(tiene("autor") || tiene("paginas")) && (
                <div className="grid grid-cols-2 gap-4">
                  {tiene("autor") && <Lbl t="Autor"><input value={autor} onChange={e=>setAutor(e.target.value)} placeholder="Nombre del autor" className={inp}/></Lbl>}
                  {tiene("paginas") && <Lbl t="Páginas"><input type="number" min="1" value={numPaginas} onChange={e=>setNumPaginas(e.target.value)} placeholder="0" className={inp}/></Lbl>}
                  <Lbl t="Editorial"><input value={editorial} onChange={e=>setEditorial(e.target.value)} placeholder="Editorial" className={inp}/></Lbl>
                  <Lbl t="ISBN"><input value={isbn} onChange={e=>setIsbn(e.target.value)} placeholder="978-..." className={inp}/></Lbl>
                </div>
              )}

              {/* Curso / video */}
              {(tiene("duracion") || tiene("lecciones")) && (
                <div className="grid grid-cols-2 gap-4">
                  {tiene("duracion") && <Lbl t="Duración (minutos)"><input type="number" min="0" value={duracion} onChange={e=>setDuracion(e.target.value)} placeholder="60" className={inp}/></Lbl>}
                  {tiene("lecciones") && <Lbl t="Nº de lecciones"><input type="number" min="0" value={numLecciones} onChange={e=>setNumLecciones(e.target.value)} placeholder="0" className={inp}/></Lbl>}
                </div>
              )}

              {/* Código */}
              {tiene("lenguajes") && (
                <div className="space-y-4">
                  <Lbl t="Lenguajes de programación" hint="Separados por coma">
                    <input value={lenguajes} onChange={e=>setLenguajes(e.target.value)} placeholder="Python, JavaScript, TypeScript..." className={inp}/>
                  </Lbl>
                  <Lbl t="Frameworks / Librerías">
                    <input value={frameworks} onChange={e=>setFrameworks(e.target.value)} placeholder="React, FastAPI, Django, Vue..." className={inp}/>
                  </Lbl>
                </div>
              )}

              {/* Diseño */}
              {tiene("software") && (
                <Lbl t="Software requerido" hint="Separado por coma">
                  <input value={requiereSoftware} onChange={e=>setRequiereSoftware(e.target.value)} placeholder="Photoshop CC 2023, Figma, Illustrator..." className={inp}/>
                </Lbl>
              )}

              {/* Resolución */}
              {tiene("resolucion") && (
                <Lbl t="Resolución">
                  <input value={resolucion} onChange={e=>setResolucion(e.target.value)} placeholder="4K, 1920x1080, 300 DPI..." className={inp}/>
                </Lbl>
              )}

              {/* Audio */}
              {tiene("bpm") && (
                <div className="grid grid-cols-2 gap-4">
                  <Lbl t="BPM"><input type="number" min="0" value={bpm} onChange={e=>setBpm(e.target.value)} placeholder="120" className={inp}/></Lbl>
                  <Lbl t="Género musical"><input value={generoMusical} onChange={e=>setGeneroMusical(e.target.value)} placeholder="Reggaeton, Pop, Hip-hop..." className={inp}/></Lbl>
                </div>
              )}

              {/* Nivel */}
              {tiene("nivel") && (
                <Lbl t="Nivel de dificultad">
                  <div className="flex gap-2 flex-wrap">
                    {NIVELES.map(n => (
                      <button key={n} onClick={() => setNivel(nivel === n.toLowerCase() ? "" : n.toLowerCase())}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition
                          ${nivel === n.toLowerCase() ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-[#1c1c2e] text-gray-500 hover:border-[#252540]"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </Lbl>
              )}

              {/* Versión */}
              {tiene("version") && (
                <div className="grid grid-cols-2 gap-4">
                  <Lbl t="Versión"><input value={version} onChange={e=>setVersion(e.target.value)} placeholder="1.0.0" className={inp}/></Lbl>
                  <Lbl t="Formato principal" hint="Se detecta del archivo">
                    <input placeholder="ZIP, PDF, PSD..." readOnly value={archivoDigital?.name.split(".").pop()?.toUpperCase() || ""} className={inp + " opacity-60"} />
                  </Lbl>
                </div>
              )}

              {/* Compatibilidad */}
              {tiene("compatibilidad") && (
                <Lbl t="Compatible con">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COMPAT.map(c => (
                      <button key={c} onClick={() => setCompatibilidad(p => p.includes(c) ? p.filter(x=>x!==c) : [...p,c])}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                          ${compatibilidad.includes(c) ? "border-orange-500 bg-orange-500/10 text-orange-300" : "border-[#1c1c2e] text-gray-500 hover:border-[#252540]"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </Lbl>
              )}

              {/* Licencia */}
              {tiene("licencia") && (
                <Lbl t="Tipo de licencia *">
                  <div className="space-y-2 mt-1">
                    {LICENCIAS.map(l => (
                      <label key={l.v}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition
                          ${licencia === l.v ? "border-orange-500 bg-orange-500/8" : "border-[#1c1c2e] bg-[#0c0c18] hover:border-[#252540]"}`}>
                        <input type="radio" name="lic" value={l.v} checked={licencia===l.v} onChange={()=>setLicencia(l.v)} className="hidden"/>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${licencia===l.v?"border-orange-500 bg-orange-500":"border-gray-600"}`}/>
                        <div>
                          <p className={`text-sm font-semibold ${licencia===l.v?"text-orange-300":"text-gray-300"}`}>{l.l}</p>
                          <p className="text-xs text-gray-600">{l.d}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </Lbl>
              )}

              {/* Descargas / acceso */}
              {tiene("descargas") && (
                <div className="grid grid-cols-2 gap-4">
                  <Lbl t="Descargas máximas" hint="Vacío = ilimitadas">
                    <input type="number" min="1" value={maxDescargas} onChange={e=>setMaxDescargas(e.target.value)} placeholder="Ilimitadas" className={inp}/>
                  </Lbl>
                  <Lbl t="Días de acceso" hint="Vacío = para siempre">
                    <input type="number" min="1" value={diasAcceso} onChange={e=>setDiasAcceso(e.target.value)} placeholder="Para siempre" className={inp}/>
                  </Lbl>
                </div>
              )}

              {/* Soporte */}
              {tiene("soporte") && (
                <div className="space-y-3 p-4 rounded-xl bg-[#0c0c18] border border-[#1c1c2e]">
                  <Toggle value={incluyeSoporte} onChange={setIncluyeSoporte} label="Incluye soporte al comprador" />
                  {incluyeSoporte && (
                    <Lbl t="Días de soporte" hint="Cuántos días responderás preguntas del comprador">
                      <input type="number" min="1" value={diasSoporte} onChange={e=>setDiasSoporte(e.target.value)} placeholder="30" className={inp}/>
                    </Lbl>
                  )}
                  <div className="flex flex-wrap gap-4 pt-1">
                    <Toggle value={permiteReventa} onChange={setPermiteReventa} label="Permite reventa" />
                    <Toggle value={permiteModificar} onChange={setPermiteModificar} label="Permite modificar" />
                  </div>
                </div>
              )}

              {/* Preview URL */}
              {tiene("preview") && (
                <Lbl t="URL de vista previa / demo" hint="Link a YouTube, sitio demo, o muestra gratuita (opcional)">
                  <input value={previewUrl} onChange={e=>setPreviewUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..." className={inp}/>
                </Lbl>
              )}

            </>)}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setPaso(1)}
                className="flex-1 py-4 rounded-2xl bg-[#1a1a2e] hover:bg-[#22223a] text-gray-400 font-bold text-sm transition">
                ← Volver
              </button>
              <button onClick={() => irPaso(3)}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-900/20">
                Continuar — {tipo === "fisico" ? "Fotos" : "Archivo"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══ PASO 3: Fotos / Archivo ══════════════════════════════════════ */}
        {paso === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {tipo === "fisico" ? "Fotos del producto" : "Archivo digital"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {tipo === "fisico"
                  ? "Las fotos se convierten a WebP automáticamente. Arrastra para reordenar."
                  : "El archivo que recibirá el comprador al pagar."}
              </p>
            </div>

            {tipo === "fisico" ? (<>

              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = Array.from(e.dataTransfer.files).filter(x => x.type.startsWith("image/")); if (f.length) procesarImagenes(f); }}
                onClick={() => document.getElementById("foto-inp")?.click()}
                className="border-2 border-dashed border-[#1e1e30] hover:border-orange-500/30 rounded-2xl p-10 text-center cursor-pointer transition-all group bg-[#0f0f1e] hover:bg-[#0f0f1e]">
                <Camera className="w-10 h-10 text-gray-700 group-hover:text-orange-400 mx-auto mb-3 transition" />
                <p className="text-gray-400 font-semibold text-sm">Arrastra imágenes aquí o toca para seleccionar</p>
                <p className="text-gray-700 text-xs mt-1.5">JPG, PNG, WEBP — se optimizan a WebP automáticamente</p>
              </div>
              <input id="foto-inp" type="file" multiple accept="image/*" className="hidden"
                onChange={e => { const f = Array.from(e.target.files || []).filter(x => x.type.startsWith("image/")); if (f.length) procesarImagenes(f); e.target.value = ""; }} />

              {/* Grid de fotos */}
              {fotos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5" /> Arrastra para cambiar el orden
                    </p>
                    {ahorroTotal > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <Zap className="w-3.5 h-3.5" />
                        Ahorraste {ahorroTotal} KB
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {fotos.map((foto, i) => (
                      <div key={foto.id} {...dragH(i)}
                        className={`relative aspect-square rounded-xl overflow-hidden bg-gray-900 cursor-grab active:cursor-grabbing select-none transition-all
                          ${dragHov === i ? "ring-2 ring-orange-500 scale-[1.04]" : ""}
                          ${i === 0 ? "ring-2 ring-yellow-500/50" : ""}`}>
                        <img src={foto.preview} className="w-full h-full object-cover pointer-events-none" />

                        {i === 0 && (
                          <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md pointer-events-none">
                            PRINCIPAL
                          </div>
                        )}

                        {foto.optimizing && (
                          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-1 pointer-events-none">
                            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                            <span className="text-[9px] text-orange-300 font-bold">Optimizando</span>
                          </div>
                        )}

                        {!foto.optimizing && foto.optimizedKB > 0 && foto.optimizedKB < foto.originalKB && (
                          <div className="absolute bottom-1.5 left-1.5 bg-emerald-700/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 pointer-events-none">
                            <Zap className="w-2.5 h-2.5" />
                            -{Math.round((1 - foto.optimizedKB / foto.originalKB) * 100)}%
                          </div>
                        )}

                        <button onClick={() => { URL.revokeObjectURL(foto.preview); setFotos(p => p.filter(x => x.id !== foto.id)); }}
                          className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 p-1.5 rounded-lg transition">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                        <div className="absolute bottom-1.5 right-1.5 bg-black/40 p-0.5 rounded pointer-events-none">
                          <GripVertical className="w-2.5 h-2.5 text-white/40" />
                        </div>
                      </div>
                    ))}

                    <label className="aspect-square rounded-xl border-2 border-dashed border-[#1c1c2e] hover:border-orange-500/20 flex items-center justify-center cursor-pointer hover:bg-[#0f0f1e] transition group">
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={e => { const f = Array.from(e.target.files || []).filter(x => x.type.startsWith("image/")); if (f.length) procesarImagenes(f); e.target.value = ""; }} />
                      <Plus className="w-5 h-5 text-gray-700 group-hover:text-orange-400 transition" />
                    </label>
                  </div>
                </div>
              )}

            </>) : (<>

              {/* ── PORTADA del producto digital ─────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Imagen de portada</p>
                    <p className="text-xs text-gray-600 mt-0.5">Aparecerá en la tarjeta del producto — sin ella la tarjeta queda vacía</p>
                  </div>
                  {portadaDigital && (
                    <button onClick={() => { if (portadaPreview) URL.revokeObjectURL(portadaPreview); setPortadaDigital(null); setPortadaPreview(null); }}
                      className="text-xs text-red-400/60 hover:text-red-400 transition mt-0.5">Quitar</button>
                  )}
                </div>
                <label className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                  ${portadaDigital ? "border-violet-500/40 bg-violet-950/15" : "border-[#1e1e30] hover:border-violet-400/30 bg-[#0f0f1e] hover:bg-[#0f0f1e]"}`}>
                  <input type="file" className="hidden" accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (portadaPreview) URL.revokeObjectURL(portadaPreview);
                      setPortadaDigital(f);
                      setPortadaPreview(URL.createObjectURL(f));
                      e.target.value = "";
                    }} />
                  {portadaDigital && portadaPreview ? (
                    <>
                      <img src={portadaPreview} alt="Portada"
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-violet-500/30" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{portadaDigital.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{(portadaDigital.size / 1024).toFixed(0)} KB · vista previa activa</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-xl bg-[#0f0f1e] border border-[#1e1e30] flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold text-sm">Añadir imagen de portada</p>
                        <p className="text-gray-700 text-xs mt-0.5">JPG, PNG o WebP — representa tu producto</p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* ── ARCHIVO DIGITAL ──────────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-white">
                  Archivo del producto <span className="text-red-400">*</span>
                </p>
                <label className={`flex flex-col items-center justify-center gap-4 w-full py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                  ${archivoDigital ? "border-emerald-500/30 bg-emerald-950/15" : "border-[#1e1e30] hover:border-orange-500/25 bg-[#0f0f1e] hover:bg-[#0f0f1e]"}`}>
                  <input type="file" className="hidden" accept={EXTENSIONES_ACEPTADAS}
                    onChange={e => setArchivoDigital(e.target.files?.[0] || null)} />
                  {archivoDigital ? (<>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{archivoDigital.name}</p>
                      <p className="text-gray-500 text-xs mt-1">{(archivoDigital.size / 1024 / 1024).toFixed(2)} MB · {archivoDigital.name.split(".").pop()?.toUpperCase()}</p>
                    </div>
                    <button onClick={e => { e.preventDefault(); setArchivoDigital(null); }}
                      className="text-xs text-red-400/70 hover:text-red-400 transition">Quitar y cambiar archivo</button>
                  </>) : (<>
                    <div className="w-14 h-14 rounded-2xl bg-[#0f0f1e] border border-[#1e1e30] flex items-center justify-center">
                      <Archive className="w-7 h-7 text-gray-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 font-semibold text-sm">Toca para seleccionar el archivo</p>
                      <p className="text-gray-600 text-xs mt-1.5 max-w-xs">ZIP, PDF, PSD, Figma, MP4, MP3, DOCX,<br/>Python, JS, TypeScript y más de 30 formatos</p>
                    </div>
                  </>)}
                </label>
              </div>

            </>)}

            {/* Resumen antes de publicar */}
            <div className="p-4 rounded-2xl bg-[#0f0f1e] border border-[#1e1e30] space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Resumen</p>
              {[
                ["Nombre",    nombre],
                ["Tipo",      tipo],
                ["Categoría", categoria],
                ["Precio",    precioFinal ? `L${precioFinal} (L${parseFloat(precio).toFixed(2)} - ${descuento}%)` : `L${parseFloat(precio||"0").toFixed(2)}`],
                tipo === "fisico" ? ["Stock", stock] : null,
                tipo === "fisico" && fotos.length > 0 ? ["Fotos", `${fotos.length} imagen${fotos.length>1?"es":""}`] : null,
                archivoDigital ? ["Archivo", archivoDigital.name] : null,
                portadaDigital ? ["Portada", portadaDigital.name] : null,
              ].filter((x): x is [string, string] => Boolean(x)).map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-sm">
                  <span className="text-gray-600">{k}</span>
                  <span className="text-gray-300 font-medium text-right max-w-[60%] truncate">{v as string}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPaso(2)}
                className="flex-1 py-4 rounded-2xl bg-[#1a1a2e] hover:bg-[#22223a] text-gray-400 font-bold text-sm transition">
                ← Volver
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm flex items-center justify-center gap-2 transition-all shadow-2xl shadow-orange-900/25">
                {guardando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</>
                  : <><Save className="w-4 h-4" /> Publicar producto</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal compartir post-publicación ──────────────────────────── */}
      {modalCompartir && productoPublicado && vendedor && (
        <ModalCompartirPost
          producto={productoPublicado}
          vendedor={vendedor}
          onClose={() => router.push("/vendedor/dashboard/productos")}
          onCompartir={() => {}}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ModalCompartirPost — aparece inmediatamente después de publicar
// ════════════════════════════════════════════════════════════════════════════
function ModalCompartirPost({
  producto, vendedor, onClose, onCompartir
}: {
  producto: any; vendedor: any;
  onClose: () => void; onCompartir: () => void;
}) {
  const productoURL = `${PLATAFORMA_URL}/tienda/${slugify(vendedor.nombre_tienda)}-${slugify(vendedor.municipio)}/producto/${producto.id}`;
  const textoBase   = buildTextoCompartir(producto, vendedor, productoURL);

  const [conexiones, setConexiones] = useState<any[]>([]);
  const [selec,      setSelec]      = useState<Set<string>>(new Set(["facebook","instagram"]));
  const [texto,      setTexto]      = useState(textoBase);
  const [copiado,    setCopiado]    = useState(false);
  const [publicando, setPub]        = useState(false);
  const [estados,    setEstados]    = useState<Record<string, {estado: string; post_url?: string}>>({});

  useEffect(() => {
    axios.get(`${API_URL}/api/vendedor/redes-sociales`, { headers: authHeaders() })
      .then(r => {
        setConexiones(r.data || []);
        const conectadas = (r.data || []).filter((c: any) => c.conectada).map((c: any) => c.red);
        if (conectadas.length > 0) setSelec(new Set(conectadas));
      }).catch(() => setConexiones([
        { red: "facebook",  conectada: false },
        { red: "instagram", conectada: false },
      ]));
  }, []);

  const REDES_CFG = {
    facebook:  { nombre: "Facebook",  color: "#1877F2" },
    instagram: { nombre: "Instagram", color: "#E1306C" },
  } as const;

  const compartirNivelA = (red: "facebook" | "instagram") => {
    const enc = encodeURIComponent(productoURL);
    if (red === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc}`, "_blank", "width=600,height=500");
    } else {
      navigator.clipboard.writeText(texto);
      window.open("https://www.instagram.com/", "_blank");
    }
    setEstados(p => ({ ...p, [red]: { estado: "ok" } }));
  };

  const publicarAutomatico = async (red: "facebook" | "instagram") => {
    setEstados(p => ({ ...p, [red]: { estado: "publicando" } }));
    try {
      const res = await axios.post(`${API_URL}/api/vendedor/publicar-red-social`, {
        red, producto_id: producto.id, texto,
        foto_url: null, producto_url: productoURL,
      }, { headers: authHeaders() });
      setEstados(p => ({ ...p, [red]: { estado: "ok", post_url: res.data?.post_url } }));
    } catch (err: any) {
      setEstados(p => ({ ...p, [red]: { estado: "error" } }));
    }
  };

  const publicarTodas = async () => {
    setPub(true);
    for (const red of Array.from(selec) as ("facebook" | "instagram")[]) {
      const cx = conexiones.find(c => c.red === red);
      cx?.conectada ? await publicarAutomatico(red) : compartirNivelA(red);
    }
    setPub(false);
  };

  const todoOk = Array.from(selec).every(r => estados[r]?.estado === "ok");

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0e0e1a] sm:rounded-3xl border border-[#1c1c2e] shadow-2xl overflow-hidden">

        {/* Success header */}
        <div className="px-5 py-5 bg-gradient-to-r from-emerald-950/60 to-[#0e0e1a] border-b border-[#1a1a2e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-black text-base">¡Producto publicado!</h2>
              <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{producto.nombre}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Pregunta compartir */}
          <div>
            <p className="text-white font-bold text-sm">¿Compartir en redes sociales ahora?</p>
            <p className="text-gray-500 text-xs mt-0.5">Llega a más clientes compartiendo tu producto.</p>
          </div>

          {/* Selección de redes */}
          <div className="grid grid-cols-2 gap-2">
            {(["facebook", "instagram"] as const).map(red => {
              const cfg    = REDES_CFG[red];
              const cx     = conexiones.find(c => c.red === red);
              const activa = selec.has(red);
              const est    = estados[red];

              return (
                <button key={red} onClick={() => setSelec(p => { const s = new Set(p); s.has(red) ? s.delete(red) : s.add(red); return s; })}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left
                    ${activa ? `border-[${cfg.color}]/40 bg-[${cfg.color}]/8` : "border-[#1a1a2e] bg-[#0f0f1e]"}
                    ${est?.estado === "ok" ? "border-emerald-500/40 bg-emerald-950/20" : ""}`}>
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition ${activa ? "border-white bg-white" : "border-gray-600"}`}
                    style={activa ? { boxShadow: `0 0 0 2px ${cfg.color}` } : {}} />
                  <div>
                    <p className="text-white text-xs font-bold">{cfg.nombre}</p>
                    <p className="text-gray-600 text-[10px]">{cx?.conectada ? "Auto" : "Manual"}</p>
                  </div>
                  {est?.estado === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-2 top-2" />}
                  {est?.estado === "publicando" && <Loader2 className="w-4 h-4 text-orange-400 animate-spin absolute right-2 top-2" />}
                </button>
              );
            })}
          </div>

          {/* Texto editable compacto */}
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Texto</p>
              <button onClick={() => { navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
                className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition font-semibold">
                {copiado ? <><Check className="w-3 h-3" />Copiado</> : <><Copy className="w-3 h-3" />Copiar</>}
              </button>
            </div>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={5}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f1e] border border-[#1c1c2e] text-gray-300 text-xs leading-relaxed outline-none focus:border-orange-500/40 transition resize-none font-mono" />
          </div>

          {/* Links post-publicación */}
          {Object.values(estados).some(e => e.estado === "ok" && e.post_url) && (
            <div className="space-y-1.5">
              {Object.values(estados).filter(e => e.estado === "ok" && e.post_url).map((e, i) => (
                <a key={i} href={e.post_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500/40 transition">
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 text-xs font-semibold flex-1">Ver publicación</span>
                </a>
              ))}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-[#0f0f1e] hover:bg-[#111124] text-gray-400 font-bold text-sm transition">
              {todoOk ? "Ir a mis productos" : "Ahora no"}
            </button>
            {!todoOk && (
              <button onClick={publicarTodas} disabled={selec.size === 0 || publicando}
                className="flex-[2] py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-40
                  bg-gradient-to-r from-[#1877F2] via-[#9b2f7f] to-[#E1306C] hover:opacity-90 text-white shadow-xl">
                {publicando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Publicando...</>
                  : <><Share2 className="w-4 h-4" />Publicar ({selec.size})</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}