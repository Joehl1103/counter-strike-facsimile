import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://dustline-tactical-fps.rp7v8sz9bx.chatgpt.site'),
  title: 'Dustline — Tactical FPS',
  description: 'An original browser-based old-school tactical first-person shooter.',
  openGraph: {
    title: 'Dustline — Tactical FPS',
    description: 'Clear the compound, stop the plant, and defuse under pressure in an original old-school browser FPS.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Dustline Tactical FPS desert compound' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dustline — Tactical FPS',
    description: 'An original old-school tactical FPS, playable in your browser.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
