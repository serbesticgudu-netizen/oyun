import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Theia Kabilesi',
    short_name: 'Theia',
    description: 'Theia Kabilesi Enerji Portalı ve Geçit Haritası',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#a855f7', // Senin fuchsia rengin
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}