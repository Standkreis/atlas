import localFont from 'next/font/local'

// Shared by both root layouts; emitted as hashed assets and included in the worker's offline manifest.
export const titillium = localFont({
  src: [
    { path: './fonts/TitilliumWeb-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/TitilliumWeb-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/TitilliumWeb-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/TitilliumWeb-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-titillium',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
})
