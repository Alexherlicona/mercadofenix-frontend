// app/layout.tsx
import MobileNav from "@/components/ui/MobileNav";

export const metadata = {
  title: "Mercado Fénix",
  description: "El marketplace de Honduras",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-screen bg-gray-50">
        {/*
          mf-body-pad: padding-bottom en móvil para la nav fija,
          se elimina automáticamente en desktop (ver globals.css)
        */}
        <div className="mf-body-pad">
          {children}
          {/*
            MobileNav: barra inferior, SOLO visible en móvil/tablet (lg:hidden dentro del componente).
            En desktop no se renderiza nada en su lugar porque cada sección
            (Header de /fenix, sidebar de /vendedor y /admin) ya trae su propia navegación.
          */}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}