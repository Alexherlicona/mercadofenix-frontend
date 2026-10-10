/** Solo acepta rutas internas ("/algo"). Cualquier otra cosa devuelve el fallback. */
export function safeNext(value: string | null | undefined, fallback = "/fenix/mi-cuenta"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}