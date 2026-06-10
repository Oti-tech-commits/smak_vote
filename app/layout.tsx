import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'St. Mark’s Prefect Voting',
  description: 'Secure school prefect voting and election management for St. Mark’s Secondary School.',
  metadataBase: new URL('https://smak-vote.example.com')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={inter.className}>
        <SiteHeader />
        <main>{children}</main>
        <Script id="register-sw">{`if ('serviceWorker' in navigator) {window.addEventListener('load', () => {navigator.serviceWorker.register('/sw.js').catch(() => undefined);});}`}</Script>
      </body>
    </html>
  );
}
