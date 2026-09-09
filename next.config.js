// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/productos/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/uploads/productos/**',
      },
      // Si en producción usas otro dominio, agrégalo aquí
      // {
      //   protocol: 'https',
      //   hostname: 'tu-dominio.com',
      //   pathname: '/uploads/**',
      // },
    ],
  },
};

module.exports = nextConfig;