// Solo verifica que exista token. NUNCA lo elimina (misma regla que mi-cuenta/layout).
// Si está vencido, el 401 del backend en la página de checkout debe mandar al login.
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      setOk(true);
    } else {
      router.replace(`/fenix/mi-cuenta/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  // No mostramos el checkout a invitados ni un instante
  return ok ? <>{children}</> : null;
}