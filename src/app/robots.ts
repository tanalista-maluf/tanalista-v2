import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tanalista.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/e/'],
        disallow: [
          '/api/',
          '/home',
          '/eventos/',
          '/grupos/',
          '/carteira',
          '/financeiro',
          '/configuracoes',
          '/notificacoes',
          '/perfil',
          '/admin/',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
