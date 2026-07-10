import { auth } from '@/auth';
import ClientProviders from '@/providers';
import { SiteChrome } from '@/components/SiteChrome';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google';
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
  title: 'DemoThemis — a court of verified humans',
  description:
    'A decentralized arbitration court whose jury is gated by on-chain World ID — one verified human, one vote, not one token one vote. Live on World Chain.',
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
          <SiteChrome />
          <div className="site-app-content">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
