// src/app/fenix/mi-cuenta/layout.tsx
// Layout para el área de cuenta del cliente
// REGLA CRÍTICA: NUNCA eliminar el token aquí. Solo verificar existencia.
// La verificación de validez la hace cada página individualmente.
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Rutas dentro de /fenix/mi-cuenta que NO requieren login
const RUTAS_PUBLICAS = [
  "/fenix/mi-cuenta/login",
  "/fenix/mi-cuenta/registro",
  "/fenix/mi-cuenta/recuperar",
];

export default function MiCuentaLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si es ruta pública, no hacer nada
    if (RUTAS_PUBLICAS.some(r => pathname.startsWith(r))) return;

    // Solo verificar que el token EXISTE en localStorage
    // NO hacer fetch al backend aquí — eso puede fallar por red y borrar el token innecesariamente
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace(`/fenix/mi-cuenta/login?next=${encodeURIComponent(pathname)}`);
    }
    // Si el token existe pero está expirado, el backend devolverá 401
    // y la página individual se encargará de redirigir al login
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renderizar siempre — sin spinners que retrasen el render
  // Las páginas individuales manejan su propio estado de carga
  return <>{children}</>;
}