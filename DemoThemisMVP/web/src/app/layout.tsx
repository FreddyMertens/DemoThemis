import { auth } from '@/auth';
import ClientProviders from '@/providers';
import { SiteChrome } from '@/components/SiteChrome';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'DemoThemis — a general-purpose verified-human court',
  description:
    'Anyone can define a case, fund the juror fees, and receive an on-chain ruling. This MVP demonstrates one public yes/no case.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
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
