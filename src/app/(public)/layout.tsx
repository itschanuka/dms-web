import type { Metadata } from 'next';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import { DEALERSHIP } from '@/lib/constants';

export const metadata: Metadata = {
  title: {
    default: `${DEALERSHIP.name} — ${DEALERSHIP.tagline}`,
    template: `%s | ${DEALERSHIP.name}`,
  },
  description: `Browse our quality selection of used, reconditioned, and brand new vehicles. ${DEALERSHIP.tagline}.`,
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07090f' }}>
      <PublicHeader />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
