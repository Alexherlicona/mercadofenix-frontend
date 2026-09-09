// app/manifest.ts
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mercado Fénix',
    short_name: 'Fénix',
    description: 'La nueva forma de comprar y vender en Honduras',
    start_url: '/fenix',
    display: 'standalone',           // ← Esto es lo que oculta la barra del navegador
    background_color: '#ffffff',
    theme_color: '#ea580c',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      // Icono maskable (para Android 12+ con forma redonda/cuadrada automática)
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',           // ← Aquí SÍ funciona porque está separado
      },
    ],
  }
}