import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EEE Batch Pulse',
    short_name: 'EEE Pulse',
    description: 'Live timetable, smart attendance tracker, and community chat for EEE Section EX',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF6FA',
    theme_color: '#FF4F9A',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
