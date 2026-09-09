// components/ui/CartIcon.tsx
"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartCount } from "@/lib/useCartCount";

export default function CartIcon() {
  const count = useCartCount();

  return (
    <Link href="/fenix/carrito" className="">
      <ShoppingCart className="w-6 h-6 text-gray-700" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}