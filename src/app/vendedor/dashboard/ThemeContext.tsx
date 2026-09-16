// src/app/vendedor/dashboard/ThemeContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/*
  ── CONVENCIÓN DE COLORES PARA EL DASHBOARD DE VENDEDOR ──────────────────────
  Al convertir cada página nueva a este sistema de temas, usa este mapeo
  (claro por defecto, sin prefijo → oscuro con "dark:"):

    Fondo de página        bg-gray-50                dark:bg-[#0a0a12]
    Fondo de sidebar/topbar bg-white                  dark:bg-[#0f0f1a] / dark:bg-[#0a0a12]
    Fondo de tarjetas       bg-white                  dark:bg-[#111120]
    Borde de tarjetas       border-gray-200           dark:border-white/[0.07]
    Borde sutil (divisor)   border-gray-100           dark:border-white/[0.05]
    Texto principal         text-gray-900             dark:text-white
    Texto secundario        text-gray-500             dark:text-gray-500 (igual)
    Texto tenue/labels      text-gray-400             dark:text-gray-600
    Hover de fila/botón     hover:bg-gray-100         dark:hover:bg-white/[0.04]
    Acento activo (naranja) bg-orange-50 text-orange-600   dark:bg-orange-500/15 dark:text-orange-300

  Los colores de acento (naranja, gradientes de plan, badges de estado) casi
  siempre se ven bien en ambos temas tal cual — normalmente no hace falta
  darles variante dark:, solo los fondos/textos neutros de arriba.
*/

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "vendedor_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Claro por defecto, como pediste. Si el vendedor ya eligió oscuro antes
  // en este navegador, se respeta esa elección.
  const [theme, setTheme] = useState<Theme>("light");
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (guardado === "dark" || guardado === "light") setTheme(guardado);
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (hidratado) localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, hidratado]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* La clase "dark" se aplica aquí, en un contenedor que envuelve todo
          el dashboard de vendedor — no en <html> — así el tema queda
          aislado a esta sección y no afecta el resto del sitio (Fenix, etc). */}
      <div className={theme === "dark" ? "dark" : ""}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}