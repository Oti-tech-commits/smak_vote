import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import Script from 'next/script';

export const metadata: Metadata = {
  title: {
    default: 'St. Mark’s S.S. Naminya — Prefect Voting',
    template: '%s | St. Mark’s S.S. Naminya'
  },
  description: 'Secure prefect voting and election management for St. Mark’s S.S. Naminya. Desire to Excel.',
  applicationName: 'St. Mark’s Prefect Voting',
  metadataBase: new URL('https://smak-vote.example.com'),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }]
  },
  openGraph: {
    title: 'St. Mark’s S.S. Naminya — Prefect Voting',
    description: 'Secure prefect voting and election management. Desire to Excel.',
    images: ['/logo.png']
  }
};

export const viewport: Viewport = {
  themeColor: '#2c4194'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <Script id="register-sw">{`if ('serviceWorker' in navigator) {window.addEventListener('load', () => {navigator.serviceWorker.register('/sw.js').catch(() => undefined);});}`}</Script>
      </body>
    </html>
  );
}
