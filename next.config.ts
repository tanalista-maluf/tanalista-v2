import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    // Padrão do Next.js é 1MB — abaixo do limite de 5MB (capa de evento) e
    // 2MB (avatar/logo) que o próprio código já valida. Sem isso, qualquer
    // arquivo acima de 1MB é rejeitado pelo framework antes da Server Action
    // rodar, e cai num 500 genérico em vez da mensagem amigável de tamanho.
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
