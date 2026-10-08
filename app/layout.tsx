import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/instrument-sans';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'ReviewRankr Admin', template: '%s · ReviewRankr Admin' },
  description: 'Manage every ReviewRankr account: access, plans, prices, bills and payments.',
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#111C33', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
