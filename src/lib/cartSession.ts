/** ID de carrito de invitado: vive en localStorage y se envía en el header X-Cart-Session. */
export function getCartSessionId(): string {
  let id = localStorage.getItem("cart_session");
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem("cart_session", id);
  }
  return id;
}