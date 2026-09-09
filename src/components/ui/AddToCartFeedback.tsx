// components/ui/AddToCartFeedback.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, ShoppingCart } from "lucide-react";

interface AddToCartFeedbackProps {
  producto: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToCartFeedback({ producto, isOpen, onClose }: AddToCartFeedbackProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Mensaje toast de 2 segundos
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !producto) return null;

  const imagen = producto.fotos?.[0]?.url 
    ? `${API_URL}${producto.fotos[0].url}` 
    : "/placeholder.jpg";

  return (
    <>
      {/* Toast superior - 2 segundos */}
      <div className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="bg-green-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-8 h-8" />
          <span className="font-bold">¡Agregado al carrito!</span>
        </div>
      </div>

      {/* Modal inferior para móvil */}
      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="bg-white rounded-t-3xl shadow-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100">
              <Image
                src={imagen}
                alt={producto.nombre}
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">Agregado al carrito</p>
              <h3 className="font-bold text-gray-900">{producto.nombre}</h3>
              <p className="text-orange-600 font-black">
                L{(producto.precio_oferta || producto.precio).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onClose}
              className="py-4 bg-gray-100 text-gray-800 rounded-2xl font-bold hover:bg-gray-200 transition"
            >
              Seguir comprando
            </button>
            <Link
              href="/carrito"
              onClick={onClose}
              className="py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Ir al carrito
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}