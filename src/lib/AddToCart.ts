// src/lib/AddToCart.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export type AddToCartResultado =
  | { ok: true; total_items: number }
  | { ok: false; razon: "sin_stock" | "limite_stock" | "error_red" | "error_servidor"; mensaje: string; disponibles?: number };

/**
 * Verifica el stock real de un producto contra el backend.
 * GET /api/public/producto/{id}/stock — ver routes/public.py
 */
async function consultarStock(productoId: string): Promise<{ stock: number | null; ilimitado: boolean } | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/producto/${productoId}/stock`);
    if (!res.ok) return null;
    const data = await res.json();
    return { stock: data.stock, ilimitado: data.ilimitado };
  } catch {
    return null;
  }
}

/**
 * Cuántas unidades de este producto ya están en el carrito del usuario
 * (sumando todas las variantes color/talla, ya que el stock es por producto, no por variante).
 */
async function cantidadEnCarrito(productoId: string): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/api/carrito/mi-carrito`, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const items: any[] = data.items || [];
    return items
      .filter(i => String(i.producto_id) === String(productoId))
      .reduce((sum, i) => sum + (i.cantidad || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Agrega un producto al carrito, validando stock real ANTES de enviar la petición.
 * Esto evita que el botón "+" del ProductCard, o clics repetidos, permitan
 * agregar más unidades de las que realmente hay en inventario.
 *
 * Devuelve un resultado tipado para que el componente que llama pueda
 * mostrar feedback específico (toast de "sin stock", "solo quedan N", etc.)
 * en vez de fallar en silencio como antes.
 */
export async function addToCart(
  producto: any,
  cantidad: number = 1,
  color?: string,
  talla?: string
): Promise<AddToCartResultado> {
  const productoId = producto.id;

  // ── Productos digitales: sin límite de stock, se permite directo ──────────
  const esDigital = producto.tipo === "digital";

  if (!esDigital) {
    // ── Validar stock real contra el backend ANTES de agregar ───────────────
    const infoStock = await consultarStock(productoId);

    if (infoStock && !infoStock.ilimitado) {
      const stockReal = infoStock.stock ?? 0;

      if (stockReal <= 0) {
        return { ok: false, razon: "sin_stock", mensaje: "Este producto está agotado.", disponibles: 0 };
      }

      // Cuánto ya tiene el usuario en el carrito de este mismo producto
      const yaEnCarrito = await cantidadEnCarrito(productoId);
      const espacioDisponible = stockReal - yaEnCarrito;

      if (espacioDisponible <= 0) {
        return {
          ok: false,
          razon: "limite_stock",
          mensaje: `Ya tienes en tu carrito todo el stock disponible (${stockReal}).`,
          disponibles: 0,
        };
      }

      if (cantidad > espacioDisponible) {
        // Recortar a lo máximo posible en vez de rechazar todo de golpe
        cantidad = espacioDisponible;
      }
    }
    // Si infoStock es null (no se pudo verificar — endpoint caído, red, etc.)
    // dejamos pasar 1 unidad como antes, sin bloquear la compra por completo;
    // el backend de /api/carrito/add debería revalidar de todas formas.
  }

  try {
    const res = await fetch(`${API_URL}/api/carrito/add`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: JSON.stringify({
        producto_id: producto.id,
        nombre: producto.nombre,
        nombre_tienda: producto.nombre_tienda || producto.vendedor || "Tienda",
        precio: producto.precio_oferta ?? producto.precio,
        imagen: producto.fotos?.[0]?.url || null,
        color: color || null,
        talla: talla || null,
        cantidad,
      }),
    });

    if (!res.ok) {
      // El backend también puede rechazar por stock (doble verificación del lado servidor)
      let mensaje = "No se pudo agregar el producto al carrito.";
      try {
        const err = await res.json();
        if (err?.detail) mensaje = String(err.detail);
      } catch { /* respuesta no era JSON */ }
      return { ok: false, razon: "error_servidor", mensaje };
    }

    const data = await res.json();
    window.dispatchEvent(new CustomEvent("cart-updated", {
      detail: { total_items: data.total_items }
    }));

    return { ok: true, total_items: data.total_items };
  } catch (error) {
    console.error("Error de red al agregar al carrito:", error);
    return { ok: false, razon: "error_red", mensaje: "Sin conexión. Verifica tu internet." };
  }
}