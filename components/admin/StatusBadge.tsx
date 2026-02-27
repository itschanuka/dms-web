interface Props {
  status: string;
  size?: 'sm' | 'md';
}

const CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  draft:       { label: 'Draft',       bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  available:   { label: 'Available',   bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  reserved:    { label: 'Reserved',    bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  sold:        { label: 'Sold',        bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  written_off: { label: 'Written Off', bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = CONFIG[status] ?? { label: status, bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' };
  return (
    <span style={{
      background:   cfg.bg,
      color:        cfg.color,
      fontSize:     size === 'sm' ? 10 : 12,
      fontWeight:   700,
      padding:      size === 'sm' ? '2px 7px' : '3px 10px',
      borderRadius: 20,
      letterSpacing: '0.04em',
      whiteSpace:   'nowrap',
      display:      'inline-block',
    }}>
      {cfg.label}
    </span>
  );
}
