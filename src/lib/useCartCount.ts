// src/lib/useCartCount.ts
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useCartCount() {
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/carrito/mi-carrito`, {
        credentials: "include",
        headers,
      });
      if (!res.ok) { setCartCount(0); return; }

      const data = await res.json();
      const total = (data.items || []).reduce(
        (sum: number, item: any) => sum + (item.cantidad || 0), 0
      );
      setCartCount(total);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    fetchCartCount();

    // Escuchar evento de addToCart — actualización inmediata sin refetch
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.total_items === "number") {
        setCartCount(detail.total_items);
      } else {
        fetchCartCount();
      }
    };

    // Refrescar al cambiar sesión (login/logout)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "access_token") fetchCartCount();
    };

    window.addEventListener("cart-updated", handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("cart-updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return cartCount;
}