import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DMS — Dealership Management System',
  description: 'Internal dealership management system',
  robots: { index: false, follow: false }, // Never index the admin system
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
