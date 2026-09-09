// components/ui/ProductCard.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { addToCart } from "@/lib/AddToCart";
import { ShoppingCart, Package, Download, Star, Zap, Loader2 } from "lucide-react";
import ProductModal from "./ProductModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProductCardProps {
  producto: any;
  oferta?: boolean;
  nuevo?: boolean;
}

function getMainImage(producto: any): string {
  const fotos = producto?.fotos;
  if (!fotos || fotos.length === 0) return "";
  const first = fotos[0];
  if (typeof first === "string") return first.startsWith("http") ? first : `${API_URL}${first}`;
  if (first?.url) return first.url.startsWith("http") ? first.url : `${API_URL}${first.url}`;
  return "";
}

export default function ProductCard({ producto, oferta = false, nuevo = false }: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError]   = useState(false);
  const [added, setAdded]         = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const imgSrc        = getMainImage(producto);
  const sinImagen     = imgError || !imgSrc;
  const esDigital     = producto.tipo === "digital";
  const precioFinal   = producto.precio_oferta ?? producto.precio_con_descuento ?? producto.precio;
  const precioOrig    = producto.precio;
  const tieneDesc     = precioFinal && Number(precioFinal) < Number(precioOrig);
  const pctDesc       = producto.porcentaje_descuento || (tieneDesc ? Math.round((1 - Number(precioFinal) / Number(precioOrig)) * 100) : 0);
  const stockBajo     = !esDigital && producto.stock > 0 && producto.stock <= 3;
  const agotado       = !esDigital && producto.stock === 0;

  const handleCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agotado || agregando) return;

    setAgregando(true);
    setErrorMsg(null);

    // addToCart ahora valida stock real contra el backend ANTES de agregar,
    // y respeta cuántas unidades ya están en el carrito de este mismo producto
    // (ver src/lib/AddToCart.ts) — así el botón no permite pasarse del stock
    // disponible aunque se haga clic varias veces seguidas.
    const resultado = await addToCart(producto, 1, undefined, undefined);

    if (resultado.ok === true) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } else if (resultado.ok === false) {
      setErrorMsg(resultado.mensaje);
      setTimeout(() => setErrorMsg(null), 2800);
    }

    setAgregando(false);
  };

  return (
    <>
      <article
        onClick={() => setModalOpen(true)}
        className="group relative bg-white rounded-[20px] overflow-hidden cursor-pointer select-none
          border border-gray-100/80
          shadow-[0_2px_8px_rgba(0,0,0,0.06)]
          hover:shadow-[0_12px_40px_rgba(234,88,12,0.15)]
          hover:-translate-y-1
          active:scale-[0.97]
          transition-all duration-300 ease-out"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        {/* ── Imagen ─────────────────────────────────────────────────── */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50">

          {sinImagen ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-200">
              <Package className="w-12 h-12 mb-1" />
              <span className="text-[10px] font-medium text-orange-300">Sin imagen</span>
            </div>
          ) : (
            <Image
              src={imgSrc}
              alt={producto.nombre || "Producto"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
              draggable={false}
              onError={() => setImgError(true)}
              onContextMenu={e => e.preventDefault()}
            />
          )}

          {/* Overlay sutil al hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

          {/* ── Badges ─────────────────────────────────── */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {pctDesc > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm leading-tight">
                -{pctDesc}%
              </span>
            )}
            {nuevo && !pctDesc && (
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                NUEVO
              </span>
            )}
            {esDigital && (
              <span className="bg-violet-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                <Download className="w-2.5 h-2.5" /> Digital
              </span>
            )}
          </div>

          {/* Stock bajo */}
          {stockBajo && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
              <div className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full text-center">
                ¡Solo {producto.stock} disponibles!
              </div>
            </div>
          )}
          {agotado && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <span className="bg-gray-800 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                Agotado
              </span>
            </div>
          )}
        </div>

        {/* ── Contenido ─────────────────────────────────────────────── */}
        <div className="p-3">
          {/* Categoría */}
          {producto.categoria && (
            <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide mb-0.5 truncate">
              {producto.categoria}
            </p>
          )}

          {/* Nombre */}
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 min-h-[2.6rem] mb-2">
            {producto.nombre}
          </h3>

          {/* Precio + carrito */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-col leading-none">
              <span className={`text-base font-black ${tieneDesc ? "text-red-600" : "text-orange-600"}`}>
                L{Number(precioFinal).toFixed(2)}
              </span>
              {tieneDesc && (
                <span className="text-[11px] text-gray-400 line-through mt-0.5">
                  L{Number(precioOrig).toFixed(2)}
                </span>
              )}
            </div>

            <button
              onClick={handleCart}
              disabled={agotado || agregando}
              aria-label="Agregar al carrito"
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                shadow-md transition-all duration-200
                active:scale-90
                ${added
                  ? "bg-emerald-500 scale-110"
                  : agotado
                    ? "bg-gray-200 cursor-not-allowed"
                    : agregando
                      ? "bg-orange-300 cursor-wait"
                      : "bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 hover:shadow-orange-200 hover:shadow-lg hover:scale-105"
                }`}
            >
              {added
                ? <span className="text-white text-xs font-black">✓</span>
                : agregando
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <ShoppingCart className="w-4.5 h-4.5 text-white" />
              }
            </button>
          </div>

          {/* Mensaje de error — sin stock o límite alcanzado */}
          {errorMsg && (
            <div className="mt-2 bg-red-50 border border-red-100 rounded-xl px-2.5 py-1.5">
              <p className="text-[10px] text-red-600 font-semibold leading-tight">{errorMsg}</p>
            </div>
          )}

          {/* Tienda */}
          {producto.nombre_tienda && (
            <p className="text-[10px] text-gray-400 mt-1.5 truncate">🏪 {producto.nombre_tienda}</p>
          )}
        </div>

        {/* Borde inferior de acento al hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-400
          scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </article>

      <ProductModal
        producto={producto}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}