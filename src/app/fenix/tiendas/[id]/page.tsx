// src/app/fenix/tiendas/[id]/page.tsx   (SIN "use client")
import type { Metadata } from "next";
import TiendaClient from "./TiendaClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function fotoSocial(url: string | undefined, id: string) {
  if (url && url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url
      .replace("/upload/", "/upload/f_jpg,q_auto:good,c_pad,b_white,w_1080,h_1080/")
      .replace(/\.(webp|png|jpe?g|gif|avif)$/i, ".jpg");
  }
  return `${API_URL}/api/public/producto/${id}/foto-social.jpg`;
}

export async function generateMetadata(
  { params, searchParams }: { params: any; searchParams: any }
): Promise<Metadata> {
  const { id } = await params;
  const { producto: productoId } = await searchParams;
  if (!productoId) return {};

  try {
    const res = await fetch(`${API_URL}/api/public/tienda/${id}`, { next: { revalidate: 60 } });
    const data = await res.json();
    const p = data.productos?.find((x: any) => String(x.id) === String(productoId));
    if (!p) return {};

    const precio = Number(p.precio_oferta ?? p.precio_con_descuento ?? p.precio).toFixed(2);
    const f = p.fotos?.[0];
    const imagen = fotoSocial(typeof f === "string" ? f : f?.url, p.id);
    const titulo = `${p.nombre} · L${precio}`;
    const desc = (p.descripcion || "").slice(0, 150);

    return {
      title: titulo,
      description: desc,
      openGraph: { title: titulo, description: desc, type: "website", images: [{ url: imagen, width: 1080, height: 1080 }] },
      twitter: { card: "summary_large_image", title: titulo, description: desc, images: [imagen] },
    };
  } catch {
    return {};
  }
}

export default function Page() {
  return <TiendaClient />;
}