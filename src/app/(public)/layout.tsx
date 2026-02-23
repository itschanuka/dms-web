import type { Metadata } from 'next';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import { DEALERSHIP } from '@/lib/constants';

export const metadata: Metadata = {
  title: {
    default:  `${DEALERSHIP.name} — ${DEALERSHIP.tagline}`,
    template: `%s | ${DEALERSHIP.name}`,
  },
  description: `Browse our quality selection of used, reconditioned, and brand new vehicles. ${DEALERSHIP.tagline}.`,
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <style>{`
        /* Default dark theme variables */
        :root, [data-theme='dark'] {
          --page-bg:    #04060c;
          --text:       #e8eef8;
          --text-muted: #4a6080;
          --border:     rgba(255,255,255,0.07);
          --card-bg:    rgba(255,255,255,0.025);
        }
        [data-theme='light'] {
          --page-bg:    #f8faff;
          --text:       #0f1923;
          --text-muted: #607090;
          --border:     rgba(0,0,0,0.08);
          --card-bg:    rgba(0,0,0,0.025);
        }
        html, body {
          margin: 0;
          padding: 0;
        }
        body {
          background: var(--page-bg);
          color: var(--text);
          transition: background 0.3s ease, color 0.3s ease;
        }
        /* Smooth scrolling */
        html { scroll-behavior: smooth; }
        /* Selection color */
        ::selection {
          background: rgba(29,78,216,0.3);
          color: #fff;
        }
      `}</style>
      <PublicHeader />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}