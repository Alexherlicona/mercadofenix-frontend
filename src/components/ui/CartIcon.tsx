// src/components/ui/CartIcon.tsx
"use client";

import { ShoppingCart } from "lucide-react";
import { useCartCount } from "@/lib/useCartCount";

// CartIcon solo exporta el icono + badge — el <Link> lo pone el padre (header, etc.)
export default function CartIcon() {
  const count = useCartCount();

  return (
    // relative aquí para que el badge absolute se ancle a este contenedor
    <span className="relative inline-flex items-center justify-center">
      <ShoppingCart className="w-5 h-5 text-orange-600" />
      {count > 0 && (
        <span className="absolute -top-2.5 -right-2.5 min-w-[18px] h-[18px] px-1
          bg-red-500 text-white text-[10px] font-black rounded-full
          flex items-center justify-center leading-none shadow-sm">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}