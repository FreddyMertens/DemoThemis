import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DemoThemis Live Demo MVP',
    short_name: 'DemoThemis',
    start_url: '/app',
    display: 'standalone',
    background_color: '#f6f3f2',
    theme_color: '#f6f3f2',
    icons: [
      {
        src: '/assets/brand/demothemis/mark-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/brand/demothemis/mark-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
