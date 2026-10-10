const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Pasa el carrito de invitado (cookie) al usuario recién autenticado. Nunca lanza errores. */
export async function fusionarCarrito(): Promise<void> {
  const token = localStorage.getItem("access_token");
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/carrito/merge`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      window.dispatchEvent(
        new CustomEvent("cart-updated", { detail: { total_items: data.total_items } })
      );
    } else {
      console.warn("merge carrito:", res.status);
    }
  } catch (err) {
    console.warn("merge carrito falló:", err);
  }
}