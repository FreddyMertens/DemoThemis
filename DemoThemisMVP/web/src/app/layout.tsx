import { auth } from '@/auth';
import ClientProviders from '@/providers';
import { SiteChrome } from '@/components/SiteChrome';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';

const sans = Inter({
  variable: '--font-app-sans',
  subsets: ['latin'],
  display: 'swap',
});

const serif = Newsreader({
  variable: '--font-app-serif',
  subsets: ['latin'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  variable: '--font-app-mono',
  subsets: ['latin'],
  display: 'swap',
});

const title = 'DemoThemis — a general-purpose verified-human court';
const description =
  'Anyone can define a case, fund the juror fees, and receive an on-chain ruling. This MVP demonstrates one public yes/no case.';

export const metadata: Metadata = {
  metadataBase: new URL('https://demothemis.netlify.app'),
  title,
  description,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/assets/brand/demothemis/mark-32.png?v=20260721-dt2', type: 'image/png', sizes: '32x32' },
      { url: '/assets/brand/demothemis/mark-192.png?v=20260721-dt2', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/assets/brand/demothemis/mark-180.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'DemoThemis',
    title,
    description,
    images: [{ url: '/assets/brand/social/mvp-1200x630.jpg', width: 1200, height: 630, alt: 'DemoThemis Live Demo MVP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/assets/brand/social/mvp-1200x630.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#f6f3f2',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" data-page-brand="demothemis">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
        <ClientProviders session={session}>
          <a className="site-skip-link" href="#main-content">
            Skip to content
          </a>
          <Suspense fallback={null}>
            <SiteChrome />
          </Suspense>
          <div className="site-app-content">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
