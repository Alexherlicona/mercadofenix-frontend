// components/ui/ProductModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { addToCart } from "@/lib/AddToCart";
import Image from "next/image";
import {
  X, ShoppingCart, Plus, Minus, Heart,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle, CheckCircle2,
  Package, Download, Shield, Clock,
  Layers, Globe, Code, BookOpen,
  Tag, Ruler, Weight, Users, Award, Info,
  ExternalLink, Lock, Hash, FileText, Loader2
} from "lucide-react";
import Link from "next/link";
import { useFavorites } from "@/lib/useFavorites";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Protecciones para productos digitales ────────────────────────────────────
function useDigitalProtection(activo: boolean) {
  useEffect(() => {
    if (!activo) return;

    const bloquear = (e: Event) => e.preventDefault();
    const bloquearTeclado = (e: KeyboardEvent) => {
      // Bloquear F12, Ctrl+U, Ctrl+Shift+I/J/C, Ctrl+S
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.shiftKey && ["i","j","c","I","J","C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "s") ||
        (e.ctrlKey && e.key === "S")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener("contextmenu",  bloquear);
    document.addEventListener("keydown",       bloquearTeclado);
    document.addEventListener("dragstart",     bloquear);
    document.addEventListener("selectstart",   bloquear);

    return () => {
      document.removeEventListener("contextmenu",  bloquear);
      document.removeEventListener("keydown",       bloquearTeclado);
      document.removeEventListener("dragstart",     bloquear);
      document.removeEventListener("selectstart",   bloquear);
    };
  }, [activo]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Badge({ children, color = "orange" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue:   "bg-blue-100 text-blue-700 border-blue-200",
    red:    "bg-red-100 text-red-700 border-red-200",
    amber:  "bg-amber-100 text-amber-700 border-amber-200",
    gray:   "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${colors[color] || colors.orange}`}>
      {children}
    </span>
  );
}

function Spec({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />}
      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 font-medium flex-1">{String(value)}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── Iconos por tipo de archivo ────────────────────────────────────────────────
function IconoArchivo({ ext }: { ext: string }) {
  const clases = "w-4 h-4 flex-shrink-0";
  const mapa: Record<string, string> = {
    py: "text-yellow-500", js: "text-yellow-400", ts: "text-blue-500",
    jsx: "text-cyan-500", tsx: "text-cyan-400", html: "text-orange-500",
    css: "text-blue-400", json: "text-gray-400", xml: "text-orange-400",
    sql: "text-purple-400", sh: "text-green-500", md: "text-gray-300",
    txt: "text-gray-400", pdf: "text-red-500", zip: "text-yellow-600",
    rar: "text-yellow-600", png: "text-pink-400", jpg: "text-pink-400",
    svg: "text-green-400", psd: "text-blue-600", ai: "text-orange-600",
    mp4: "text-red-400", mp3: "text-purple-500", wav: "text-purple-400",
  };
  const color = mapa[ext.toLowerCase()] || "text-gray-400";
  return <FileText className={`${clases} ${color}`} />;
}

// ── Estructura simulada de archivos incluidos ─────────────────────────────────
interface ArchivoPreview { nombre: string; tipo: "carpeta" | "archivo"; ext?: string; contenido?: string; hijos?: ArchivoPreview[]; }

function simularEstructura(producto: any): ArchivoPreview[] {
  const ext  = (producto.archivo_key || "").split(".").pop()?.toLowerCase() || "zip";
  const base = (producto.nombre || "archivo").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase().slice(0, 30);
  const ver  = producto.version || "1.0.0";
  const desc = (producto.descripcion || "").slice(0, 100);
  const lic  = producto.licencia || "personal";
  const cat  = producto.categoria || "";

  // ── Proyectos de programación ──────────────────────────────────────────────
  if (cat === "Proyectos de Programación") {
    const langs   = Array.isArray(producto.lenguajes) ? producto.lenguajes : [];
    const fwks    = Array.isArray(producto.frameworks) ? producto.frameworks : [];
    const isPy    = langs.some((l: string) => /python/i.test(l));
    const isNode  = langs.some((l: string) => /javascript|typescript|node/i.test(l));
    const isReact = fwks.some((f: string) => /react|next/i.test(f));

    const srcHijos: ArchivoPreview[] = [];
    if (isPy) {
      const mainPy = [
        "# " + producto.nombre,
        "# Versión " + ver,
        "",
        "def main():",
        '    print("Iniciando aplicación...")',
        "    # Tu lógica aquí",
        "    pass",
        "",
        'if __name__ == "__main__":',
        "    main()",
      ].join("\n");

      const utilsPy = [
        "# Utilidades del proyecto",
        "",
        "def formatear(valor):",
        "    return str(valor).strip()",
        "",
        "def validar_entrada(dato):",
        "    return dato is not None and len(str(dato)) > 0",
      ].join("\n");

      srcHijos.push(
        { nombre: "main.py",  tipo: "archivo", ext: "py", contenido: mainPy },
        { nombre: "utils.py", tipo: "archivo", ext: "py", contenido: utilsPy },
      );
    } else if (isReact) {
      const appTsx = [
        "import React from 'react';",
        "import { useState } from 'react';",
        "",
        "export default function App() {",
        "  const [count, setCount] = useState(0);",
        "",
        "  return (",
        '    <div className="app">',
        "      <h1>" + producto.nombre + "</h1>",
        "      <button onClick={() => setCount(c => c + 1)}>",
        "        Contador: {count}",
        "      </button>",
        "    </div>",
        "  );",
        "}",
      ].join("\n");

      const indexTsx = [
        "import React from 'react';",
        "import ReactDOM from 'react-dom/client';",
        "import App from './App';",
        "",
        "ReactDOM.createRoot(document.getElementById('root')!).render(",
        "  <React.StrictMode>",
        "    <App />",
        "  </React.StrictMode>",
        ");",
      ].join("\n");

      const stylesCss = [
        ".app {",
        "  font-family: sans-serif;",
        "  max-width: 800px;",
        "  margin: 0 auto;",
        "  padding: 2rem;",
        "}",
        "",
        "button {",
        "  background: #f97316;",
        "  color: white;",
        "  border: none;",
        "  padding: 0.5rem 1.5rem;",
        "  border-radius: 8px;",
        "  cursor: pointer;",
        "}",
      ].join("\n");

      srcHijos.push(
        { nombre: "App.tsx",    tipo: "archivo", ext: "tsx", contenido: appTsx },
        { nombre: "index.tsx",  tipo: "archivo", ext: "tsx", contenido: indexTsx },
        { nombre: "styles.css", tipo: "archivo", ext: "css", contenido: stylesCss },
      );
    } else if (isNode) {
      const indexJs = [
        "// " + producto.nombre + " v" + ver,
        "const express = require('express');",
        "const app = express();",
        "",
        "app.use(express.json());",
        "",
        "app.get('/', (req, res) => {",
        "  res.json({ mensaje: 'API funcionando', version: '" + ver + "' });",
        "});",
        "",
        "const PORT = process.env.PORT || 3000;",
        "app.listen(PORT, () => console.log('Servidor en puerto ' + PORT));",
      ].join("\n");

      const routesJs = [
        "const router = require('express').Router();",
        "",
        "router.get('/items', async (req, res) => {",
        "  try {",
        "    const items = [];",
        "    res.json({ ok: true, data: items });",
        "  } catch (err) {",
        "    res.status(500).json({ ok: false, error: err.message });",
        "  }",
        "});",
        "",
        "module.exports = router;",
      ].join("\n");

      srcHijos.push(
        { nombre: "index.js",  tipo: "archivo", ext: "js", contenido: indexJs },
        { nombre: "routes.js", tipo: "archivo", ext: "js", contenido: routesJs },
      );
    } else {
      srcHijos.push(
        { nombre: "main.js", tipo: "archivo", ext: "js",
          contenido: "// " + producto.nombre + "\nconsole.log('Proyecto iniciado');" },
      );
    }

    const techs   = langs.join(", ") || "Ver documentación";
    const fwkLine = fwks.length ? "\n\nFrameworks: " + fwks.join(", ") : "";
    const instCmd = isPy
      ? "pip install -r requirements.txt\npython main.py"
      : "npm install\nnpm start";
    const licCap  = lic.charAt(0).toUpperCase() + lic.slice(1);

    const readmeContent = [
      "# " + producto.nombre,
      "",
      "> " + desc,
      "",
      "## Versión",
      ver,
      "",
      "## Tecnologías",
      techs + fwkLine,
      "",
      "## Instalación",
      "```bash",
      instCmd,
      "```",
      "",
      "## Licencia",
      licCap,
    ].join("\n");

    const requirementsTxt = [
      "# Dependencias del proyecto",
      "# Generado para " + producto.nombre,
      "requests>=2.28.0",
      "python-dotenv>=0.21.0",
    ].join("\n");

    const packageJson = [
      "{",
      '  "name": "' + base + '",',
      '  "version": "' + ver + '",',
      '  "description": "' + desc.replace(/"/g, "'") + '",',
      '  "scripts": {',
      '    "start": "node index.js",',
      '    "dev": "nodemon index.js"',
      "  },",
      '  "license": "' + lic + '"',
      "}",
    ].join("\n");

    const resultado: ArchivoPreview[] = [
      { nombre: "README.md", tipo: "archivo", ext: "md", contenido: readmeContent },
      { nombre: "src/",      tipo: "carpeta", hijos: srcHijos },
    ];

    if (isPy) {
      resultado.push({ nombre: "requirements.txt", tipo: "archivo", ext: "txt", contenido: requirementsTxt });
    }
    if (isNode || isReact) {
      resultado.push({ nombre: "package.json", tipo: "archivo", ext: "json", contenido: packageJson });
    }
    resultado.push({ nombre: base + "." + ext, tipo: "archivo", ext, contenido: undefined });

    return resultado;
  }

  // ── Libros y documentos ────────────────────────────────────────────────────
  if (cat === "Libros y Documentos") {
    const paginas = producto.num_paginas || "?";
    const autor   = producto.autor || "Autor";
    const isbn    = producto.isbn || "";
    const usoLic  = lic === "personal" ? "uso personal únicamente"
                  : lic === "comercial" ? "uso comercial"
                  : "redistribución libre";

    const portadaContent = [
      "# " + producto.nombre,
      "",
      "**Autor:** " + autor,
      "**Páginas:** " + paginas,
      isbn ? "**ISBN:** " + isbn : "",
      "**Idioma:** " + (producto.idioma || "Español"),
      "",
      "---",
      "",
      "## Descripción",
      "",
      desc,
      "",
      "---",
      "",
      "## Sobre la licencia",
      "",
      "Este documento está bajo licencia **" + lic + "**.",
      "Se permite: " + usoLic + ".",
      "",
      "_Compra el archivo completo para acceder al contenido._",
    ].filter(l => l !== null).join("\n");

    const indiceContent = [
      "# Tabla de Contenidos",
      "",
      "1. Introducción",
      "2. Capítulo 1",
      "3. Capítulo 2",
      "4. ...",
      "",
      "_El contenido completo está disponible en el archivo " + ext.toUpperCase() + " tras la compra._",
    ].join("\n");

    return [
      { nombre: "portada.md",               tipo: "archivo", ext: "md", contenido: portadaContent },
      { nombre: "indice_de_contenido.md",   tipo: "archivo", ext: "md", contenido: indiceContent },
      { nombre: base + "." + ext,           tipo: "archivo", ext,       contenido: undefined },
    ];
  }

  // ── Cursos y educación ─────────────────────────────────────────────────────
  if (cat === "Cursos y Educación") {
    const duracion  = producto.duracion_minutos ? producto.duracion_minutos + " minutos" : "Ver índice";
    const lecciones = producto.num_lecciones || "?";
    const nivel_    = producto.nivel_dificultad || "todos los niveles";
    const soporteLine = producto.incluye_soporte
      ? "- Soporte por " + (producto.dias_soporte || "?") + " días"
      : "";

    const readmeLines = [
      "# " + producto.nombre,
      "",
      "**Nivel:** " + nivel_,
      "**Duración:** " + duracion,
      "**Lecciones:** " + lecciones,
      "**Idioma:** " + (producto.idioma || "Español"),
      "",
      "## ¿Qué aprenderás?",
      "",
      desc,
      "",
      "## Contenido incluido",
      "",
      "- Material teórico",
      "- Ejercicios prácticos",
      "- " + lecciones + " lecciones estructuradas",
      soporteLine,
    ].filter(Boolean).join("\n");

    const leccion1 = [
      "# Lección 1: Introducción",
      "",
      "## Objetivos",
      "- Entender el contexto general",
      "- Preparar el entorno de trabajo",
      "",
      "## Contenido",
      "",
      desc,
      "",
      "_El contenido completo está disponible tras la compra._",
    ].join("\n");

    return [
      { nombre: "README.md", tipo: "archivo", ext: "md", contenido: readmeLines },
      { nombre: "modulo_01/", tipo: "carpeta", hijos: [
        { nombre: "leccion_01_introduccion.md", tipo: "archivo", ext: "md", contenido: leccion1 },
        { nombre: "leccion_02.md", tipo: "archivo", ext: "md",
          contenido: "# Lección 2\n\n_Contenido disponible tras la compra._" },
      ]},
      { nombre: base + "." + ext, tipo: "archivo", ext, contenido: undefined },
    ];
  }

  // ── Diseño y arte / Templates ──────────────────────────────────────────────
  if (cat === "Diseño y Arte" || cat === "Templates y Plantillas") {
    const software    = Array.isArray(producto.requiere_software)
      ? producto.requiere_software.join(", ")
      : (producto.requiere_software || "Ver descripción");
    const res         = producto.resolucion || "";
    const softwareUno = software.split(",")[0] || "el software compatible";
    const resLine     = res ? "- **Resolución:** " + res + "\n" : "";

    const leemeContent = [
      "# " + producto.nombre,
      "",
      "## Descripción",
      desc,
      "",
      "## Especificaciones",
      resLine + "- **Software requerido:** " + software,
      "- **Formato:** " + ext.toUpperCase(),
      "- **Licencia:** " + lic,
      "",
      "## Instrucciones de uso",
      "",
      "1. Descarga el archivo",
      "2. Ábrelo con " + softwareUno,
      "3. Personaliza según tus necesidades",
      "",
      "_Archivo completo disponible tras la compra._",
    ].join("\n");

    const prevContent = [
      "# Vista previa — " + producto.nombre,
      "",
      "Este archivo contiene una vista previa del diseño.",
      "El archivo original con todas las capas editables está incluido en la compra.",
      "",
      "**Formato:** " + ext.toUpperCase(),
      res ? "**Resolución:** " + res : "",
    ].filter(Boolean).join("\n");

    return [
      { nombre: "LEEME.md",       tipo: "archivo", ext: "md", contenido: leemeContent },
      { nombre: "vista_previa.md",tipo: "archivo", ext: "md", contenido: prevContent },
      { nombre: base + "." + ext, tipo: "archivo", ext,       contenido: undefined },
    ];
  }

  // ── Fotografía ─────────────────────────────────────────────────────────────
  if (cat === "Fotografía") {
    const res     = producto.resolucion || "Alta resolución";
    const usoLine = lic === "personal"  ? "✅ Uso personal\n❌ Uso comercial"
                  : lic === "comercial" ? "✅ Uso personal\n✅ Uso comercial"
                  : "✅ Sin restricciones de uso";

    const infoContent = [
      "# " + producto.nombre,
      "",
      "## Detalles técnicos",
      "- **Resolución:** " + res,
      "- **Formato:** " + ext.toUpperCase(),
      "- **Licencia:** " + lic,
      "",
      "## Descripción",
      desc,
      "",
      "## Uso permitido",
      usoLine,
      "",
      "_Archivo completo disponible tras la compra._",
    ].join("\n");

    return [
      { nombre: "INFO.md",        tipo: "archivo", ext: "md", contenido: infoContent },
      { nombre: base + "." + ext, tipo: "archivo", ext,       contenido: undefined },
    ];
  }

  // ── Música y audio ─────────────────────────────────────────────────────────
  if (cat === "Música y Audio") {
    const bpm_    = producto.bpm || "";
    const genero_ = producto.genero_musical || "";
    const dur_    = producto.duracion_minutos ? producto.duracion_minutos + " minutos" : "Ver archivo";
    const usoAudio = lic === "personal"  ? "Solo uso personal / no comercial"
                   : lic === "comercial" ? "Uso comercial permitido"
                   : "Sin restricciones";

    const lines = [
      "# " + producto.nombre,
      "",
      "## Detalles",
      "- **Formato:** " + ext.toUpperCase(),
      bpm_    ? "- **BPM:** " + bpm_        : "",
      genero_ ? "- **Género:** " + genero_  : "",
      "- **Duración:** " + dur_,
      "- **Licencia:** " + lic,
      "",
      "## Descripción",
      desc,
      "",
      "## Licencia de uso",
      usoAudio,
      "",
      "_Audio completo disponible tras la compra._",
    ].filter(l => l !== null).join("\n");

    return [
      { nombre: "INFO.md",        tipo: "archivo", ext: "md", contenido: lines },
      { nombre: base + "." + ext, tipo: "archivo", ext,       contenido: undefined },
    ];
  }

  // ── Video y multimedia ─────────────────────────────────────────────────────
  if (cat === "Video y Multimedia") {
    const res_ = producto.resolucion || "";
    const dur_ = producto.duracion_minutos ? producto.duracion_minutos + " minutos" : "";

    const videoLines = [
      "# " + producto.nombre,
      "",
      "## Especificaciones del video",
      res_ ? "- **Resolución:** " + res_ : "",
      dur_ ? "- **Duración:** " + dur_   : "",
      "- **Formato:** " + ext.toUpperCase(),
      "- **Licencia:** " + lic,
      "",
      "## Descripción",
      desc,
      "",
      "_Video completo disponible tras la compra._",
    ].filter(l => l !== null).join("\n");

    return [
      { nombre: "INFO.md",        tipo: "archivo", ext: "md", contenido: videoLines },
      { nombre: base + "." + ext, tipo: "archivo", ext,       contenido: undefined },
    ];
  }

  // ── Fallback genérico ──────────────────────────────────────────────────────
  const fallbackContent = [
    "# " + producto.nombre,
    "",
    "## Descripción",
    desc,
    "",
    "## Formato",
    ext.toUpperCase(),
    "",
    "## Licencia",
    lic,
    "",
    "## Versión",
    ver,
    "",
    "_Contenido completo disponible tras la compra._",
  ].join("\n");

  return [
    { nombre: "DESCRIPCION.md",   tipo: "archivo", ext: "md", contenido: fallbackContent },
    { nombre: base + "." + ext,   tipo: "archivo", ext,       contenido: undefined },
  ];
}

// ── Visor de un archivo de texto ─────────────────────────────────────────────
function VisorTexto({ nombre, contenido }: { nombre: string; contenido: string }) {
  const lines = contenido.split("\n");
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 text-sm" style={{ userSelect: "none" }}
      onCopy={e => e.preventDefault()} onCut={e => e.preventDefault()}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <IconoArchivo ext={nombre.split(".").pop() || ""} />
          <span className="text-gray-300 text-xs font-mono">{nombre}</span>
        </div>
        <span className="text-gray-500 text-xs flex items-center gap-1">
          <Lock className="w-3 h-3" /> Solo lectura
        </span>
      </div>
      <div className="bg-gray-900 overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="pl-4 pr-3 py-0.5 text-gray-600 text-xs font-mono text-right w-10 select-none border-r border-gray-800">{i+1}</td>
                <td className="pl-4 pr-4 py-0.5 text-gray-300 text-xs font-mono whitespace-pre">
                  {line || "\u00a0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Componente principal de vista previa de archivos ─────────────────────────
// Muestra estructura real del ZIP si está disponible, o estructura simulada
function VistaArchivosDigital({
  producto, previewRuta, setPreviewRuta, previewArchivo, setPreviewArchivo
}: {
  producto: any;
  previewRuta: string[];
  setPreviewRuta: (r: string[]) => void;
  previewArchivo: string | null;
  setPreviewArchivo: (f: string | null) => void;
}) {
  const [zipEstructura, setZipEstructura] = useState<ArchivoPreview[] | null>(null);
  const [zipCargando,   setZipCargando]   = useState(false);
  const [zipError,      setZipError]      = useState<string | null>(null);
  const [zipCargado,    setZipCargado]    = useState(false);

  const esZip = ["zip","rar","7z","tar","gz"].includes(
    (producto.formato_archivo || producto.archivo_key?.split(".").pop() || "").toLowerCase()
  );

  // ── Cargar y descomprimir el ZIP para mostrar su estructura ───────────────
  const cargarZip = async () => {
    if (zipCargado || !producto.archivo_key) return;
    setZipCargando(true);
    setZipError(null);
    try {
      const JSZip = (await import("jszip")).default;
      const url   = API_URL + producto.archivo_key;
      const resp  = await fetch(url);
      if (!resp.ok) throw new Error("No se pudo cargar el archivo");

      const buffer = await resp.arrayBuffer();
      const zip    = await JSZip.loadAsync(buffer);

      // Construir árbol de directorios
      const raiz: ArchivoPreview[] = [];
      const carpetas: Record<string, ArchivoPreview> = {};

      const TEXT_EXTS = new Set(["js","ts","jsx","tsx","py","html","css","json","xml","sql",
        "sh","md","txt","csv","yaml","yml","env","gitignore","toml","ini","cfg","php","rb",
        "java","go","rs","c","cpp","h","hpp","cs","swift","kt","dart","vue","svelte"]);

      // Ordenar: carpetas primero, luego por nombre
      const entries = Object.entries(zip.files).sort(([a],[b]) => {
        const aDir = a.endsWith("/"); const bDir = b.endsWith("/");
        if (aDir !== bDir) return aDir ? -1 : 1;
        return a.localeCompare(b);
      });

      // Límite de archivos a mostrar para no saturar
      let count = 0;
      const MAX_FILES = 80;

      for (const [path, zipFile] of entries) {
        if (count > MAX_FILES) break;
        const partes  = path.split("/").filter(Boolean);
        if (partes.length === 0) continue;

        const ext     = partes[partes.length - 1].split(".").pop()?.toLowerCase() || "";
        const esTexto = TEXT_EXTS.has(ext) && !zipFile.dir;

        // Leer contenido solo para archivos de texto pequeños (< 50 KB)
        let contenido: string | undefined = undefined;
        if (esTexto) {
          try {
            // FIX: zipFile._data es una propiedad PRIVADA interna de JSZip, no parte
            // de su API pública ni de sus tipos — por eso TypeScript no la reconoce
            // y podía ser undefined/cambiar entre versiones de la librería.
            // En su lugar, leemos directamente como string (la API pública soportada)
            // y medimos el tamaño real ya decodificado con Blob, que sí es estable.
            const raw = await zipFile.async("string");
            const size = new Blob([raw]).size;
            if (size < 51200) {
              // Truncar a 300 líneas para no saturar el visor
              const lines = raw.split("\n");
              contenido = lines.slice(0, 300).join("\n")
                + (lines.length > 300 ? "\n\n// ... (archivo truncado a 300 líneas)" : "");
            } else {
              contenido = "// Archivo demasiado grande para mostrar en vista previa\n// Se mostrará completo tras la compra";
            }
          } catch { contenido = "// No se pudo leer el contenido"; }
        }

        // Insertar en árbol
        if (partes.length === 1) {
          // Raíz
          if (zipFile.dir) {
            const carpeta: ArchivoPreview = { nombre: partes[0] + "/", tipo: "carpeta", hijos: [] };
            carpetas[partes[0]] = carpeta;
            raiz.push(carpeta);
          } else {
            raiz.push({ nombre: partes[0], tipo: "archivo", ext, contenido });
            count++;
          }
        } else {
          // Subcarpeta/archivo anidado
          const padreNombre = partes.slice(0, -1).join("/");
          let padre = carpetas[padreNombre];
          if (!padre) {
            // Crear carpetas intermedias si no existen
            let acum = "";
            for (const p of partes.slice(0, -1)) {
              const prev = acum;
              acum = acum ? acum + "/" + p : p;
              if (!carpetas[acum]) {
                const nueva: ArchivoPreview = { nombre: p + "/", tipo: "carpeta", hijos: [] };
                carpetas[acum] = nueva;
                if (prev && carpetas[prev]) {
                  carpetas[prev].hijos = carpetas[prev].hijos || [];
                  carpetas[prev].hijos!.push(nueva);
                } else {
                  raiz.push(nueva);
                }
              }
            }
            padre = carpetas[padreNombre];
          }
          if (padre && !zipFile.dir) {
            padre.hijos = padre.hijos || [];
            padre.hijos.push({ nombre: partes[partes.length - 1], tipo: "archivo", ext, contenido });
            count++;
          }
        }
      }

      setZipEstructura(raiz.length > 0 ? raiz : null);
      setZipCargado(true);
    } catch (err: any) {
      setZipError("No se pudo leer el archivo. Vista previa no disponible.");
      setZipCargado(true);
    } finally {
      setZipCargando(false);
    }
  };

  const estructura = zipEstructura ?? simularEstructura(producto);

  // Navegar por la estructura según la ruta actual
  function getActual(items: ArchivoPreview[], ruta: string[]): ArchivoPreview[] {
    if (ruta.length === 0) return items;
    const carpeta = items.find(x => x.nombre === ruta[0] || x.nombre === ruta[0] + "/");
    if (!carpeta?.hijos) return items;
    return getActual(carpeta.hijos, ruta.slice(1));
  }

  const itemsActuales  = getActual(estructura, previewRuta);
  const archivoAbierto = previewArchivo
    ? itemsActuales.find(x => x.nombre === previewArchivo)
    : null;

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono flex-wrap">
        <button onClick={() => { setPreviewRuta([]); setPreviewArchivo(null); }}
          className="text-orange-500 hover:text-orange-700 font-semibold transition">
          {producto.nombre.slice(0, 18)}
        </button>
        {previewRuta.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            <button onClick={() => { setPreviewRuta(previewRuta.slice(0, i + 1)); setPreviewArchivo(null); }}
              className="text-orange-500 hover:text-orange-700 transition">{seg.replace("/","")}</button>
          </span>
        ))}
        {previewArchivo && <><span className="text-gray-400">/</span><span className="text-gray-300">{previewArchivo}</span></>}
      </div>

      {/* Botón cargar ZIP real */}
      {esZip && !zipCargado && !zipCargando && (
        <button onClick={cargarZip}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all active:scale-[0.98]">
          <Download className="w-4 h-4" />
          Explorar contenido real del ZIP
        </button>
      )}
      {zipCargando && (
        <div className="flex items-center justify-center gap-2 py-3 text-violet-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Leyendo estructura del archivo...
        </div>
      )}
      {zipError && (
        <p className="text-xs text-red-400 text-center py-2">{zipError}</p>
      )}
      {zipCargado && zipEstructura && (
        <div className="flex items-center gap-2 py-1.5 px-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <span className="text-emerald-600 text-xs font-bold">✓ Estructura real del ZIP</span>
          <span className="text-emerald-500 text-xs ml-auto">{zipEstructura.length} elementos en raíz</span>
        </div>
      )}

      {/* Archivo abierto */}
      {archivoAbierto && archivoAbierto.contenido ? (
        <div>
          <button onClick={() => setPreviewArchivo(null)}
            className="mb-2 text-xs text-gray-500 hover:text-orange-500 flex items-center gap-1 transition">
            <ChevronLeft className="w-3.5 h-3.5" /> Volver
          </button>
          <VisorTexto nombre={archivoAbierto.nombre} contenido={archivoAbierto.contenido} />
        </div>
      ) : (
        /* Listado de carpeta */
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-gray-400 font-mono">
              {itemsActuales.length} elemento{itemsActuales.length !== 1 ? "s" : ""}
              {zipEstructura ? " · ZIP real" : " · Vista previa"}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Solo lectura
            </p>
          </div>

          {estructura.length === 0 ? (
            <div className="bg-gray-900 px-4 py-8 text-center">
              <Package className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Vista previa no disponible</p>
            </div>
          ) : (
            <div className="bg-gray-900 divide-y divide-gray-800 max-h-72 overflow-y-auto">
              {previewRuta.length > 0 && (
                <button onClick={() => { setPreviewRuta(previewRuta.slice(0, -1)); setPreviewArchivo(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:bg-gray-800/60 transition text-left">
                  <span className="text-sm">📁</span>
                  <span className="text-sm font-mono text-gray-400">..</span>
                </button>
              )}
              {itemsActuales.map((item, i) => (
                <button key={i}
                  onClick={() => {
                    if (item.tipo === "carpeta") {
                      setPreviewRuta([...previewRuta, item.nombre]);
                      setPreviewArchivo(null);
                    } else if (item.contenido) {
                      setPreviewArchivo(item.nombre);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-800/60 transition text-left
                    ${item.tipo === "carpeta" || item.contenido ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className="text-sm leading-none flex-shrink-0">
                    {item.tipo === "carpeta" ? "📁" : "📄"}
                  </span>
                  <span className="flex-1 flex items-center gap-2 min-w-0">
                    {item.tipo === "archivo" && item.ext && <IconoArchivo ext={item.ext} />}
                    <span className={`text-xs font-mono truncate ${item.tipo === "carpeta" ? "text-blue-400" : "text-gray-300"}`}>
                      {item.nombre}
                    </span>
                  </span>
                  {item.contenido
                    ? <span className="text-[10px] text-violet-400 flex-shrink-0 font-semibold">ver</span>
                    : item.tipo === "archivo" && <Lock className="w-3 h-3 text-gray-700 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nota de protección */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-100">
        <Shield className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-violet-600 leading-relaxed">
          {zipEstructura
            ? "Estás viendo la estructura real del archivo. El contenido visible es de solo lectura. La descarga completa se habilita tras verificar el pago."
            : "Vista previa ilustrativa. El archivo completo se descarga únicamente tras verificar el pago con el vendedor."}
        </p>
      </div>
    </div>
  );
}
// ── Modal de checkout para productos digitales ────────────────────────────────
export function CheckoutDigital({ producto, onClose }: { producto: any; onClose: () => void }) {
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia" | "tigo_money">("transferencia");
  const [nota, setNota]             = useState("");
  const [cargando, setCargando]     = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<{ id: number; chatUrl: string } | null>(null);
  const router = typeof window !== "undefined" ? null : null; // will use window.location

  const precioFinal = Number(producto.precio_con_descuento || producto.precio);

  const pagar = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("access_token")
        || localStorage.getItem("cliente_token")
        || localStorage.getItem("token");
      if (!token) {
        // Redirigir al login del cliente en lugar de alert
        window.location.href = "/fenix/mi-cuenta/login?redirect=" + encodeURIComponent(window.location.pathname);
        return;
      }

      const body = {
        tipo_entrega: "digital",
        metodo_pago:  metodoPago,
        nota_cliente: nota || null,
        items: [{
          producto_id:    producto.id,
          nombre_producto: producto.nombre,
          precio_unitario: precioFinal,
          cantidad:        1,
        }],
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/pedidos/crear`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Error al crear el pedido");
        return;
      }

      const data = await res.json();
      setPedidoCreado({ id: data.pedido_id, chatUrl: `/fenix/pedidos/${data.pedido_id}/chat` });
    } catch { alert("Error de conexión"); }
    finally { setCargando(false); }
  };

  if (pedidoCreado) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">¡Pedido creado!</h2>
          <p className="text-gray-600 text-sm mb-1">Pedido <strong>#{pedidoCreado.id}</strong></p>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Envía tu comprobante de pago en el chat. El vendedor verificará y habilitará tu descarga.
          </p>
          <div className="space-y-3">
            <a href={pedidoCreado.chatUrl}
              className="block w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black rounded-2xl text-sm hover:opacity-90 transition">
              💬 Ir al chat y enviar comprobante
            </a>
            <button onClick={onClose} className="w-full py-3 text-gray-500 text-sm font-medium hover:text-gray-700 transition">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-base">Comprar producto digital</p>
            <p className="text-violet-200 text-xs mt-0.5 truncate max-w-[220px]">{producto.nombre}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumen */}
          <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{producto.nombre}</p>
              <p className="text-xs text-gray-500">Descarga digital · {producto.formato_archivo?.toUpperCase() || "Archivo"}</p>
            </div>
            <p className="text-lg font-black text-orange-600 flex-shrink-0">L{precioFinal.toFixed(2)}</p>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Método de pago</p>
            <div className="space-y-2">
              {([
                { v: "transferencia", label: "Transferencia bancaria", icon: "🏦", desc: "Envía el comprobante por el chat",        recomendado: false },
                { v: "efectivo",      label: "Efectivo",               icon: "💵", desc: "Coordina la entrega con el vendedor",     recomendado: false },
                { v: "tigo_money",    label: "Tigo Money",             icon: "⚡", desc: "Envía al número del vendedor",           recomendado: true  },
              ] as { v: "efectivo" | "transferencia" | "tigo_money"; label: string; icon: string; desc: string; recomendado: boolean }[]).map(m => (
                <label key={m.v}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all ${metodoPago === m.v ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="metodo" value={m.v} checked={metodoPago === m.v} onChange={() => setMetodoPago(m.v)} className="hidden" />
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${metodoPago === m.v ? "border-violet-500 bg-violet-500" : "border-gray-300"}`} />
                  <span className="text-lg leading-none flex-shrink-0">{m.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{m.label}</p>
                      {m.recomendado && <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded-full border border-yellow-200">Recomendado</span>}
                    </div>
                    <p className="text-xs text-gray-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Nota para el vendedor (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2}
              placeholder="Ej: Te escribiré en el chat para coordinar el pago..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 resize-none outline-none focus:border-violet-400 transition" />
          </div>

          {/* Flujo explicado */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-3.5 space-y-1.5">
            <p className="text-xs font-bold text-violet-700 mb-2">¿Cómo funciona?</p>
            {[
              "1. Crea el pedido aquí",
              "2. Ve al chat y envía tu comprobante",
              "3. El vendedor verifica el pago",
              "4. Recibes el enlace de descarga en el chat",
            ].map(s => <p key={s} className="text-xs text-violet-600">{s}</p>)}
          </div>

          <button onClick={pagar} disabled={cargando}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white font-black rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-200">
            {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando pedido...</> : <><ShoppingCart className="w-4 h-4" /> Confirmar pedido — L{precioFinal.toFixed(2)}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductModal({ producto, isOpen, onClose }: any) {
  const [cantidad,      setCantidad]      = useState(1);
  const [color,         setColor]         = useState("");
  const [talla,         setTalla]         = useState("");
  const [imgIndex,      setImgIndex]      = useState(0);
  const [showFeedback,  setShowFeedback]  = useState(false);
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [tabActiva,     setTabActiva]     = useState<"info" | "specs" | "tienda" | "preview">("info");
  const [previewRuta,   setPreviewRuta]   = useState<string[]>([]);
  const [previewArchivo, setPreviewArchivo] = useState<string | null>(null);
  const [checkoutOpen,  setCheckoutOpen]  = useState(false);
  // Stock real consultado por ID directo contra GET /api/public/producto/{id}/stock
  // (routes/public.py — router ya montado y confirmado funcionando en main.py)
  // (backend/routes/producto.py — usa models/producto.py: Producto.stock).
  // null = aún no llegó la respuesta (no bloquear de entrada).
  const [stockApi, setStockApi] = useState<{ stock: number | null; ilimitado: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isFavorite, toggleFavorite, loading: favLoading } = useFavorites();

  const esDigital = producto?.tipo === "digital";
  useDigitalProtection(isOpen && esDigital);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setCantidad(1); setColor(""); setTalla("");
      setImgIndex(0); setTabActiva("info");
      scrollRef.current?.scrollTo(0, 0);
    }
  }, [isOpen, producto?.id]);

  // ── Verificar stock real por ID directo contra el backend ─────────────────
  // No usamos producto.stock recibido por props porque algunos listados
  // (home, categorías, etc.) pueden no incluir ese campo. Esta consulta es
  // por ID exacto — sin ambigüedad de búsqueda por nombre como antes.
  useEffect(() => {
    if (!isOpen || !producto?.id) { setStockApi(null); return; }
    let cancelado = false;
    fetch(`${API_URL}/api/public/producto/${producto.id}/stock`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelado || !data) return;
        setStockApi({ stock: data.stock, ilimitado: data.ilimitado });
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [isOpen, producto?.id]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { lightboxOpen ? setLightboxOpen(false) : onClose(); }};
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, lightboxOpen, onClose]);

  if (!isOpen || !producto) return null;

  // ── Normalizar imágenes ───────────────────────────────────────────────────
  const imgs: string[] = (producto.fotos || []).map((foto: any) => {
    if (typeof foto === "string") return foto.startsWith("http") ? foto : `${API_URL}${foto}`;
    if (foto?.url) return foto.url.startsWith("http") ? foto.url : `${API_URL}${foto.url}`;
    return "/placeholder.jpg";
  }).filter(Boolean);

  // ── Precios ───────────────────────────────────────────────────────────────
  const precioFinal   = Number(producto.precio_oferta ?? producto.precio_con_descuento ?? producto.precio);
  const precioOrig    = Number(producto.precio);
  const tieneDesc     = precioFinal < precioOrig;
  const pctDesc       = producto.porcentaje_descuento || (tieneDesc ? Math.round((1 - precioFinal / precioOrig) * 100) : 0);

  // ── Stock: prioridad a la respuesta del backend (stockApi, por ID exacto).
  //    Si esa consulta aún no responde, caemos a producto.stock por props
  //    como respaldo inmediato — así nunca se ve "0" mientras carga. ──
  const stockFuente: number | null | undefined = esDigital
    ? null
    : (stockApi ? stockApi.stock : producto.stock);
  const stockNum = stockFuente === null || stockFuente === undefined || stockFuente === ("" as any)
    ? null
    : Number(stockFuente);
  const stock = esDigital || (stockApi?.ilimitado)
    ? Infinity
    : (stockNum !== null && !Number.isNaN(stockNum) ? stockNum : 0);
  // Solo se considera "agotado" cuando tenemos un número real de stock = 0,
  // ya sea confirmado por la API o por producto.stock. Nunca por ausencia de dato.
  const agotado     = !esDigital && stockNum !== null && stock === 0;
  const casiAgotado = !esDigital && stock > 0 && stock <= 5 && stock !== Infinity;

  const ahorraste     = tieneDesc ? (precioOrig - precioFinal).toFixed(2) : null;

  const nextImg = () => setImgIndex(i => (i + 1) % imgs.length);
  const prevImg = () => setImgIndex(i => (i - 1 + imgs.length) % imgs.length);

  const handleAddToCart = () => {
    addToCart(producto, cantidad, color || undefined, talla || undefined);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2800);
  };

  // ── Variantes disponibles ─────────────────────────────────────────────────
  const variantes     = producto.variantes || {};
  const coloresDisp   = variantes.colores
    ? (typeof variantes.colores === "string" ? variantes.colores.split(",").map((c: string) => c.trim()) : variantes.colores)
    : [];
  const tallasDisp    = variantes.tallas
    ? (typeof variantes.tallas === "string" ? variantes.tallas.split(",").map((t: string) => t.trim()) : variantes.tallas)
    : [];
  const genero        = variantes.genero || variantes.Género;
  const almacenamiento = variantes.almacenamiento || variantes.Almacenamiento;

  // ── Campos digitales ──────────────────────────────────────────────────────
  const lenguajes     = Array.isArray(producto.lenguajes)  ? producto.lenguajes.join(", ") : producto.lenguajes;
  const frameworks    = Array.isArray(producto.frameworks) ? producto.frameworks.join(", ") : producto.frameworks;
  const compat        = Array.isArray(producto.compatibilidad) ? producto.compatibilidad.join(", ") : producto.compatibilidad;
  const reqSoftware   = Array.isArray(producto.requiere_software) ? producto.requiere_software.join(", ") : producto.requiere_software;
  const etiquetas     = Array.isArray(producto.etiquetas) ? producto.etiquetas : [];

  // ── Tiene specs que mostrar ───────────────────────────────────────────────
  const tieneEspecsFisico = producto.marca || producto.modelo || producto.material ||
    producto.peso_gramos || producto.largo_cm || producto.garantia_meses > 0 || coloresDisp.length || tallasDisp.length;
  const tieneEspecsDigital = lenguajes || frameworks || compat || producto.version ||
    producto.nivel_dificultad || producto.num_paginas || producto.duracion_minutos;

  const tieneSpecs = esDigital ? tieneEspecsDigital : tieneEspecsFisico;

  // ── Slug de tienda ────────────────────────────────────────────────────────
  const slugTienda = producto.slug_tienda ||
    (producto.nombre_tienda && producto.municipio
      ? `${producto.nombre_tienda}-${producto.municipio}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : null);

  // ════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      {lightboxOpen && imgs.length > 0 && (
        <div
          className="fixed inset-0 bg-black/96 z-[100] flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-5 right-5 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full max-w-4xl h-[85vh] px-16" onClick={e => e.stopPropagation()}>
            <Image src={imgs[imgIndex]} alt={producto.nombre} fill className="object-contain" unoptimized quality={95}
              draggable={false} onContextMenu={e => esDigital && e.preventDefault()} />
            {imgs.length > 1 && (
              <>
                <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 p-3.5 bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/30 transition">
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 p-3.5 bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/30 transition">
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {imgs.map((_: string, i: number) => (
                    <button key={i} onClick={() => setImgIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === imgIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
          {esDigital && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 text-white/60 text-xs px-4 py-2 rounded-full">
              <Lock className="w-3 h-3" /> Contenido protegido
            </div>
          )}
        </div>
      )}

      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* ── Panel principal ──────────────────────────────────────────────────
          Móvil: drawer de pantalla completa deslizado desde la derecha (igual que antes).
          Desktop (lg+): modal centrado, ancho fijo amplio, alto limitado con scroll interno,
          en vez del drawer angosto pegado al borde derecho que se veía desproporcionado. ── */}
      <div className="fixed inset-0 z-50 lg:flex lg:items-center lg:justify-center lg:p-6 pointer-events-none">
        <div
          ref={scrollRef}
          className="pointer-events-auto fixed right-0 top-0 h-full w-full max-w-[680px] bg-white
            overflow-y-auto shadow-2xl overscroll-contain
            scrollbar-thin scrollbar-thumb-gray-200
            lg:static lg:h-[764px] lg:max-h-[90vh] lg:max-w-5xl lg:w-full lg:rounded-3xl
            lg:flex lg:flex-col lg:overflow-hidden"
          style={{ scrollBehavior: "smooth" }}
          onContextMenu={e => esDigital && e.preventDefault()}
        >
        {/* ── Header sticky — ocupa todo el ancho del modal en desktop ── */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:flex-shrink-0">
          {/* Botón atrás */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 p-2 hover:bg-gray-100 rounded-xl transition text-gray-600 hover:text-gray-900 flex-shrink-0"
            aria-label="Volver"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold hidden sm:block">Atrás</span>
          </button>

          {/* Categoría + badge digital */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {esDigital && (
              <span className="flex items-center gap-1 bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-200 flex-shrink-0">
                <Lock className="w-2.5 h-2.5" /> DIGITAL
              </span>
            )}
            <p className="text-sm text-gray-400 truncate">{producto.categoria}</p>
          </div>

          {/* Cerrar */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4.5 h-4.5 text-gray-500" />
          </button>
        </div>

        {/* ── Body: galería + contenido. Móvil: flujo normal apilado.
                Desktop: grid de 2 columnas, AMBAS con su propio scroll independiente
                respecto al contenedor (no respecto al body), altura fija del modal. ── */}
        <div className="lg:h-[700px] lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-0 lg:overflow-hidden">

        {/* ── Columna izquierda en desktop: SOLO la galería, sin scroll propio.
                Móvil: bloque normal en el flujo, altura por aspect-ratio fijo.
                Desktop: contenedor con altura ABSOLUTA explícita en estilo inline
                (no Tailwind responsive classes para esta propiedad en particular),
                evitando cualquier ambigüedad entre aspect-[4/3] y aspect-auto que
                causaba que la imagen quedara con altura efectiva de 0px. ── */}
        <div className="lg:flex lg:flex-col lg:h-full lg:border-r lg:border-gray-100 lg:overflow-hidden">
        {/* ── Galería de imágenes ───────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-orange-50/80 to-amber-50/50 lg:flex-1 lg:flex lg:flex-col">
          <div
            className="relative overflow-hidden cursor-zoom-in w-full aspect-[4/3] lg:aspect-auto lg:flex-1"
            style={{ minHeight: 0 }}
            onClick={() => imgs.length > 0 && setLightboxOpen(true)}
          >
            {imgs.length > 0 ? (
              <Image
                src={imgs[imgIndex]}
                alt={producto.nombre}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-6 lg:p-10 transition-transform duration-500 hover:scale-[1.04]"
                unoptimized priority quality={90}
                draggable={false}
                onContextMenu={e => esDigital && e.preventDefault()}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-200">
                <Package className="w-20 h-20 mb-3" />
                <p className="text-sm text-orange-300">Sin imagen disponible</p>
              </div>
            )}

            {/* Flechas */}
            {imgs.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); prevImg(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white hover:scale-110 transition-all z-10">
                  <ChevronLeft className="w-5 h-5 text-gray-800" />
                </button>
                <button onClick={e => { e.stopPropagation(); nextImg(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white hover:scale-110 transition-all z-10">
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                </button>
              </>
            )}

            {/* Favorito — flotando top-right sobre la imagen.
                Tamaño y posición fijos por nosotros (no dependemos del tamaño interno
                de FavoriteButton) para garantizar que sea visible y no quede recortado. */}
            <div
              className="absolute top-3 right-3 z-30 w-10 h-10 flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => toggleFavorite && toggleFavorite(producto.id)}
                disabled={favLoading}
                aria-label={isFavorite && isFavorite(producto.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <Heart className={`w-5 h-5 transition-all ${
                  isFavorite && isFavorite(producto.id) ? "fill-red-500 text-red-500" : "text-gray-400"
                }`} />
              </button>
            </div>

            {/* Badges sobre imagen */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              {pctDesc > 0 && (
                <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
                  -{pctDesc}% OFF
                </span>
              )}
              {casiAgotado && (
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> ¡Solo {stock} quedan!
                </span>
              )}
            </div>

            {/* Indicador zoom */}
            {imgs.length > 0 && (
              <div className="absolute bottom-3 right-3 bg-black/40 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">
                {imgs.length > 1 ? `${imgIndex + 1}/${imgs.length}` : "Toca para ampliar"}
              </div>
            )}

            {/* Watermark en digital */}
            {esDigital && imgs.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white/10 text-5xl font-black rotate-[-30deg] select-none tracking-widest">
                  MERCADO FÉNIX
                </p>
              </div>
            )}
          </div>

          {/* Miniaturas */}
          {imgs.length > 1 && (
            <div className="px-5 py-3 flex gap-2.5 overflow-x-auto scrollbar-none bg-white border-t border-gray-100">
              {imgs.map((img: string, i: number) => (
                <button key={i} onClick={() => setImgIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200
                    ${i === imgIndex ? "border-orange-500 shadow-md shadow-orange-100 scale-105" : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"}`}>
                  <Image src={img} alt="" width={64} height={64} unoptimized className="object-cover w-full h-full"
                    draggable={false} onContextMenu={e => esDigital && e.preventDefault()} />
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
        {/* ↑ los dos </div> de arriba cierran: 1) el wrapper "relative bg-gradient"
               de la galería, 2) la columna izquierda misma (lg:flex lg:flex-col lg:h-full).
               El grid (lg:grid lg:grid-cols-2) permanece abierto para recibir
               la columna derecha como su segundo hijo directo — antes faltaba
               este segundo cierre, por eso la columna derecha quedaba anidada
               DENTRO de la izquierda en vez de al lado. ── */}

        {/* ── Columna derecha en desktop: info + CTA, con su propio scroll
                acotado a la altura real de la columna (no a 90vh de nuevo,
                eso ya lo limita el panel padre — evita doble restricción de altura) ── */}
        <div className="lg:h-full lg:overflow-y-auto lg:flex lg:flex-col">
        {/* ── Contenido ─────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-36 lg:pb-5 lg:flex-1">

          {/* Nombre y precio */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {esDigital && <Badge color="violet"><Download className="w-3 h-3" /> Descarga digital</Badge>}
              {agotado   && <Badge color="gray">Agotado</Badge>}
              {pctDesc>0 && <Badge color="red"><Tag className="w-3 h-3" /> {pctDesc}% descuento</Badge>}
              {etiquetas.slice(0, 3).map((tag: string) => <Badge key={tag} color="orange">{tag}</Badge>)}
            </div>

            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-1">
              {producto.nombre}
            </h1>
            {producto.subtitulo && (
              <p className="text-sm text-gray-500 mb-3">{producto.subtitulo}</p>
            )}

            {/* Precio */}
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-4xl font-black text-orange-600 tracking-tight">
                L{precioFinal.toFixed(2)}
              </span>
              {tieneDesc && (
                <div className="flex flex-col">
                  <span className="text-lg text-gray-400 line-through">L{precioOrig.toFixed(2)}</span>
                  <span className="text-xs text-emerald-600 font-bold">Ahorras L{ahorraste}</span>
                </div>
              )}
            </div>

            {/* Total al pedir más de 1 */}
            {cantidad > 1 && (
              <p className="text-sm text-orange-500 font-semibold mt-1">
                Total: L{(precioFinal * cantidad).toFixed(2)}
              </p>
            )}
          </div>

          {/* ── Tabs ──────────────────────────────────────────────── */}
          <div className="flex border-b border-gray-100 mb-5 -mx-5 px-5 overflow-x-auto scrollbar-none">
            {([
              { id: "info",    label: "Descripción" },
              ...(esDigital ? [{ id: "preview", label: "📂 Vista previa" }] : []),
              ...(tieneSpecs ? [{ id: "specs",   label: esDigital ? "Detalles" : "Especificaciones" }] : []),
              { id: "tienda",  label: "La tienda" },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setTabActiva(tab.id as any)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap
                  ${tabActiva === tab.id
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Descripción ──────────────────────────────────── */}
          {tabActiva === "info" && (
            <div className="space-y-4">
              {producto.descripcion ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line text-[15px]">
                    {producto.descripcion}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">Sin descripción disponible.</p>
              )}

              {/* Digital: info de acceso */}
              {esDigital && (
                <div className="mt-5 rounded-2xl overflow-hidden border border-violet-100">
                  <div className="bg-violet-600 px-4 py-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-200" />
                    <p className="text-white font-bold text-sm">Producto digital protegido</p>
                  </div>
                  <div className="bg-violet-50 px-4 py-4 space-y-2">
                    {[
                      ["Formato",      producto.formato_archivo?.toUpperCase()],
                      ["Tamaño",       formatBytes(producto.tamano_bytes)],
                      ["Licencia",     producto.licencia],
                      ["Descargas",    producto.max_descargas ? `Máx. ${producto.max_descargas}` : "Ilimitadas"],
                      ["Acceso",       producto.dias_acceso ? `${producto.dias_acceso} días` : "Para siempre"],
                      ["Soporte",      producto.incluye_soporte ? `${producto.dias_soporte || "?"} días incluidos` : null],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} className="flex justify-between text-xs">
                        <span className="text-violet-600 font-medium">{k}</span>
                        <span className="text-violet-900 font-semibold">{v}</span>
                      </div>
                    ))}

                    {producto.preview_url && (
                      <a href={producto.preview_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 text-xs text-violet-700 font-semibold hover:text-violet-900 transition">
                        <ExternalLink className="w-3.5 h-3.5" /> Ver vista previa / demo
                      </a>
                    )}
                    <div className="mt-3 pt-3 border-t border-violet-100 flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-violet-500 leading-relaxed">
                        Este archivo está protegido. Recibirás acceso inmediato al completar el pago. No está permitida la redistribución.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Físico: disponibilidad y entrega */}
              {!esDigital && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl p-4 border ${
                    agotado ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
                  }`}>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Disponibilidad</p>
                    <p className={`text-sm font-bold ${
                      agotado ? "text-red-600" : casiAgotado ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {agotado
                        ? "Agotado"
                        : casiAgotado
                          ? "¡Últimas unidades!"
                          : stock !== Infinity
                            ? `Disponible (${stock})`
                            : "Disponible"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Entrega</p>
                    <p className="text-sm font-bold text-gray-700 capitalize">
                      {producto.tipo_entrega || "Consultar"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Especificaciones ──────────────────────────────── */}
          {tabActiva === "specs" && (
            <div className="space-y-1">
              {!esDigital && (
                <>
                  <Spec label="Condición"   value={producto.condicion && producto.condicion.replace("_"," ")} icon={Award} />
                  <Spec label="Marca"        value={producto.marca}    icon={Tag} />
                  <Spec label="Modelo"       value={producto.modelo}   icon={Info} />
                  <Spec label="SKU"          value={producto.sku}      icon={Hash} />
                  <Spec label="Material"     value={producto.material} icon={Layers} />
                  {coloresDisp.length > 0 && (
                    <Spec label="Colores disponibles" value={coloresDisp.join(", ")} icon={Layers} />
                  )}
                  {tallasDisp.length > 0 && (
                    <Spec label="Tallas disponibles"  value={tallasDisp.join(", ")} icon={Ruler} />
                  )}
                  {genero && <Spec label="Género" value={genero} icon={Users} />}
                  {almacenamiento && <Spec label="Almacenamiento" value={almacenamiento} icon={Info} />}
                  <Spec label="Peso"         value={producto.peso_gramos && `${producto.peso_gramos} g`} icon={Weight} />
                  {(producto.largo_cm || producto.ancho_cm || producto.alto_cm) && (
                    <Spec label="Dimensiones"
                      value={[producto.largo_cm, producto.ancho_cm, producto.alto_cm].filter(Boolean).map(v => `${v}cm`).join(" × ")}
                      icon={Ruler} />
                  )}
                  <Spec label="Garantía" value={producto.garantia_meses > 0 ? `${producto.garantia_meses} meses` : null} icon={Shield} />
                  {producto.descripcion_garantia && <Spec label="Sobre garantía" value={producto.descripcion_garantia} icon={Shield} />}
                </>
              )}

              {esDigital && (
                <>
                  <Spec label="Versión"      value={producto.version}           icon={Info} />
                  <Spec label="Formato"      value={producto.formato_archivo?.toUpperCase()} icon={Download} />
                  <Spec label="Tamaño"       value={formatBytes(producto.tamano_bytes)} icon={Weight} />
                  <Spec label="Nivel"        value={producto.nivel_dificultad}  icon={Award} />
                  <Spec label="Lenguajes"    value={lenguajes}                  icon={Code} />
                  <Spec label="Frameworks"   value={frameworks}                 icon={Code} />
                  <Spec label="Compatible"   value={compat}                     icon={Globe} />
                  <Spec label="Requiere"     value={reqSoftware}                icon={Info} />
                  <Spec label="Autor"        value={producto.autor}             icon={Users} />
                  <Spec label="Editorial"    value={producto.editorial}         icon={BookOpen} />
                  <Spec label="ISBN"         value={producto.isbn}              icon={BookOpen} />
                  <Spec label="Páginas"      value={producto.num_paginas}       icon={BookOpen} />
                  <Spec label="Duración"     value={producto.duracion_minutos && `${producto.duracion_minutos} min`} icon={Clock} />
                  <Spec label="Lecciones"    value={producto.num_lecciones}     icon={Users} />
                  <Spec label="Licencia"     value={producto.licencia}          icon={Shield} />
                  <Spec label="Reventa"      value={producto.permite_reventa ? "Permitida" : "No permitida"} icon={Shield} />
                  <Spec label="Modificar"    value={producto.permite_modificar ? "Permitido" : "No permitido"} icon={Shield} />
                  <Spec label="Archivos incluidos" value={producto.num_archivos && `${producto.num_archivos} archivos`} icon={Download} />
                </>
              )}

              {/* Otros pares en variantes */}
              {Object.entries(variantes)
                .filter(([k]) => !["colores","tallas","genero","almacenamiento"].includes(k.toLowerCase()))
                .map(([k, v]) => (
                  <Spec key={k} label={k} value={String(v)} />
                ))}
            </div>
          )}

          {/* ── Tab: La tienda ─────────────────────────────────────── */}
          {tabActiva === "tienda" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50 border border-orange-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white font-black text-xl">
                    {(producto.nombre_tienda || "T")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-base">{producto.nombre_tienda || "Tienda"}</p>
                  {producto.municipio && (
                    <p className="text-sm text-gray-500 mt-0.5">📍 {producto.municipio}{producto.departamento ? `, ${producto.departamento}` : ""}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {producto.tipo_pago && (
                  <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Pago</p>
                    <p className="text-sm font-bold text-gray-700 capitalize">{producto.tipo_pago}</p>
                  </div>
                )}
                {producto.tipo_entrega && (
                  <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Entrega</p>
                    <p className="text-sm font-bold text-gray-700 capitalize">{producto.tipo_entrega}</p>
                  </div>
                )}
              </div>

              {slugTienda && (
                <Link href={`/tienda/${slugTienda}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50 transition">
                  <ExternalLink className="w-4 h-4" /> Ver tienda completa
                </Link>
              )}
            </div>
          )}

          {/* ── Tab: Vista previa de archivos (solo digital) ───────── */}
          {tabActiva === "preview" && esDigital && (
            <VistaArchivosDigital
              producto={producto}
              previewRuta={previewRuta}
              setPreviewRuta={setPreviewRuta}
              previewArchivo={previewArchivo}
              setPreviewArchivo={setPreviewArchivo}
            />
          )}

          {/* ── Variantes seleccionables ──────────────────────────── */}
          {!esDigital && (coloresDisp.length > 0 || tallasDisp.length > 0) && (
            <div className="mt-6 space-y-5 pt-4 border-t border-gray-100">
              {coloresDisp.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2.5">
                    Color <span className="font-normal text-gray-400">{color && `— ${color}`}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coloresDisp.map((c: string) => (
                      <button key={c} onClick={() => setColor(color === c ? "" : c)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all
                          ${color === c ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tallasDisp.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2.5">
                    Talla <span className="font-normal text-gray-400">{talla && `— ${talla}`}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tallasDisp.map((t: string) => (
                      <button key={t} onClick={() => setTalla(talla === t ? "" : t)}
                        className={`min-w-[44px] h-10 px-3 rounded-xl text-sm font-bold border-2 transition-all
                          ${talla === t ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Cantidad ──────────────────────────────────────────── */}
          {!esDigital && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-800">Cantidad</p>
              <div className="flex items-center gap-3">
                <button onClick={() => cantidad > 1 && setCantidad(c => c - 1)}
                  disabled={cantidad <= 1}
                  className="w-9 h-9 rounded-xl border-2 border-gray-200 flex items-center justify-center disabled:opacity-30 hover:border-gray-400 transition">
                  <Minus className="w-4 h-4 text-gray-700" />
                </button>
                <span className="w-10 text-center text-lg font-black text-gray-900">{cantidad}</span>
                <button
                  onClick={() => (stock === Infinity || cantidad < stock) && setCantidad(c => c + 1)}
                  disabled={stock !== Infinity && cantidad >= stock}
                  className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center disabled:opacity-30 hover:bg-orange-600 transition">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── CTA — móvil: fijo abajo, con espacio para no taparse con el MobileNav (h-16 + safe area).
                Desktop: vuelve a quedar dentro del flujo normal de la columna derecha, sin "fixed". ── */}
        <div className="fixed bottom-16 right-0 w-full max-w-[680px] bg-white/95 backdrop-blur-md border-t border-gray-100 px-5 py-4 z-30
          lg:static lg:bottom-auto lg:max-w-none lg:border-t-0 lg:px-0 lg:pt-0 lg:pb-0 lg:bg-transparent lg:backdrop-blur-none">
          <button
            onClick={() => esDigital ? setCheckoutOpen(true) : handleAddToCart()}
            disabled={agotado}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-sm
              ${agotado
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : esDigital
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white hover:shadow-xl hover:shadow-violet-200 active:scale-[0.98]"
                  : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:shadow-xl hover:shadow-orange-200 active:scale-[0.98]"}`}
          >
            {agotado
              ? "Producto agotado"
              : esDigital
                ? <><Download className="w-5 h-5" /> Comprar y descargar — L{precioFinal.toFixed(2)}</>
                : <><ShoppingCart className="w-5 h-5" /> Agregar al carrito</>}
          </button>
        </div>

        {/* Checkout digital */}
        {checkoutOpen && esDigital && (
          <CheckoutDigital
            producto={{ ...producto, precio_con_descuento: precioFinal }}
            onClose={() => setCheckoutOpen(false)}
          />
        )}
        </div>
        {/* ↑ cierra: px-5 pt-5 pb-36 (padding interno del contenido) */}

        </div>
        {/* ↑ cierra: columna derecha desktop — info + CTA (lg:overflow-y-auto...) */}

        </div>
        {/* ↑ cierra: body grid 2 columnas (lg:h-[700px] lg:grid lg:grid-cols-2) */}

      </div>
      {/* ↑ cierra: panel principal (scrollRef, lg:h-[764px]) y el wrapper
             outer flex de centrado en desktop — confirmado por el compilador
             de TypeScript (tsc), no por scripts de conteo aproximados. ── */}

      {/* ── Feedback toast ────────────────────────────────────────────── */}
      {showFeedback && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-bold text-sm">¡Agregado al carrito!</span>
        </div>
      )}
    </>
  );
}

// Agregar en globals.css:
// .scrollbar-none::-webkit-scrollbar { display: none; }
// @keyframes bounce-in { 0%{transform:translateX(-50%) scale(0.8);opacity:0} 50%{transform:translateX(-50%) scale(1.05);} 100%{transform:translateX(-50%) scale(1);opacity:1} }
// .animate-bounce-in { animation: bounce-in 0.35s ease-out; }