'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi,
  type Lead, type LeadStatus, type LeadSource, type Salesperson,
} from '@/lib/api';
import { useTheme } from '@/lib/theme';

// ─── Status / Source config ────────────────────────────────────────────────────
const STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string; border: string }> = {
  new:         { label: 'New',         color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.32)' },
  contacted:   { label: 'Contacted',   color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.32)'  },
  interested:  { label: 'Interested',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.32)'  },
  test_drive:  { label: 'Test Drive',  color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.32)' },
  negotiation: { label: 'Negotiation', color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.32)' },
  won:         { label: 'Won',         color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.32)'  },
  lost:        { label: 'Lost',        color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.28)' },
};
const STATUSES: LeadStatus[] = ['new','contacted','interested','test_drive','negotiation','won','lost'];

const SRC_CFG: Record<LeadSource, { label: string; icon: string }> = {
  walk_in:  { label: 'Walk-in',  icon: '🚶' },
  call:     { label: 'Call',     icon: '📞' },
  website:  { label: 'Website',  icon: '🌐' },
  facebook: { label: 'Facebook', icon: '📘' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  referral: { label: 'Referral', icon: '🤝' },
  other:    { label: 'Other',    icon: '📌' },
};

// ─── Theme tokens — EXACT match to AdminShell ──────────────────────────────────
function tok(isDark: boolean) {
  return {
    // surfaces — same as AdminShell
    page:      isDark ? '#141c2e' : '#dde6f0',
    card:      isDark ? '#1c2538' : '#cdd8ea',
    cardInner: isDark ? '#111827' : '#c8d6e8',
    border:    isDark ? '#263550' : '#aec2d6',
    hoverRow:  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    shadow:    isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
    // text — same as AdminShell
    text:      isDark ? '#e8f0fc' : '#0f1e32',
    muted:     isDark ? '#5a7295' : '#4a6278',
    // input fields
    input:     isDark ? '#0e1729' : '#c0cedf',
    inputText: isDark ? '#d4e2f4' : '#0f1e32',
    // accents
    accent:    '#10b981',
    accentBg:  'rgba(16,185,129,0.1)',
    accentBdr: 'rgba(16,185,129,0.3)',
    danger:    '#ef4444',
    warn:      '#f59e0b',
    warnBg:    'rgba(245,158,11,0.1)',
    warnBdr:   'rgba(245,158,11,0.3)',
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function isOverdue(date: string | null, status: LeadStatus) {
  if (!date || status === 'won' || status === 'lost') return false;
  return new Date(date) < new Date(new Date().toDateString());
}
function isDueToday(date: string | null, status: LeadStatus) {
  if (!date || status === 'won' || status === 'lost') return false;
  return new Date(date).toDateString() === new Date().toDateString();
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function inRange(d: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  return d >= start && d <= end;
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#0ea5e9','#f97316'];
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%',
      background: color + '22', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color, flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LeadStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
      fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

// ─── Date Range Calendar ───────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface DateRange { start: Date | null; end: Date | null }

function Calendar({ isDark, range, onChange, onClose }: {
  isDark: boolean;
  range: DateRange;
  onChange: (r: DateRange) => void;
  onClose: () => void;
}) {
  const t = tok(isDark);
  const today = new Date();

  // Two-month view: left = viewMonth, right = viewMonth+1
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [hovered,   setHovered]   = useState<Date | null>(null);
  const [picking,   setPicking]   = useState<'start' | 'end'>('start'); // which end user is picking

  // Reset picking state when range is cleared
  useEffect(() => {
    if (!range.start && !range.end) setPicking('start');
  }, [range.start, range.end]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(d: Date) {
    if (picking === 'start') {
      onChange({ start: d, end: null });
      setPicking('end');
    } else {
      if (range.start && d < range.start) {
        // Clicked before start → swap: new start = clicked, end = old start
        onChange({ start: d, end: range.start });
      } else {
        onChange({ start: range.start, end: d });
      }
      setPicking('start');
    }
  }

  // Quick preset buttons
  const PRESETS: { label: string; get: () => DateRange }[] = [
    { label: 'Today',       get: () => { const d = new Date(today); d.setHours(0,0,0,0); return { start: d, end: new Date(d) }; }},
    { label: 'Yesterday',   get: () => { const d = new Date(today); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); return { start: new Date(d), end: new Date(d) }; }},
    { label: 'This week',   get: () => { const s = new Date(today); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return { start: s, end: new Date() }; }},
    { label: 'Last 7 days', get: () => { const s = new Date(today); s.setDate(s.getDate()-6); s.setHours(0,0,0,0); return { start: s, end: new Date() }; }},
    { label: 'This month',  get: () => { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { start: s, end: new Date() }; }},
    { label: 'Last 30 days',get: () => { const s = new Date(today); s.setDate(s.getDate()-29); s.setHours(0,0,0,0); return { start: s, end: new Date() }; }},
    { label: 'Last 3 months',get:() => { const s = new Date(today); s.setMonth(s.getMonth()-3); return { start: s, end: new Date() }; }},
    { label: 'This year',   get: () => { return { start: new Date(today.getFullYear(), 0, 1), end: new Date() }; }},
  ];

  // Render a single month grid
  function renderMonth(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    // pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: t.text, textAlign: 'center', marginBottom: 10 }}>
          {MONTHS[month]} {year}
        </div>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700,
              color: t.muted, padding: '3px 0' }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px 0' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const isToday    = isSameDay(day, today);
            const isStart    = range.start ? isSameDay(day, range.start) : false;
            const isEnd      = range.end   ? isSameDay(day, range.end)   : false;
            const isEdge     = isStart || isEnd;
            const isHovEnd   = !range.end && range.start && hovered
                                 ? (day <= hovered && day >= range.start) || (day >= hovered && day <= range.start)
                                 : false;
            const inFull     = inRange(day, range.start, range.end);
            const inHov      = isHovEnd;
            const highlighted = inFull || inHov;

            return (
              <div key={i}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'relative', textAlign: 'center', cursor: 'pointer',
                  padding: '4px 0', fontSize: 12, fontWeight: isEdge ? 800 : 400,
                  color: isEdge ? '#fff' : isToday ? t.accent : highlighted ? t.text : t.text,
                  background: isEdge
                    ? t.accent
                    : highlighted
                      ? t.accentBg
                      : 'transparent',
                  borderRadius: isEdge
                    ? '6px'
                    : highlighted
                      ? (isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : '0')
                      : '6px',
                  transition: 'all 0.1s',
                  outline: isToday && !isEdge ? `1.5px solid ${t.accentBdr}` : 'none',
                  outlineOffset: '-1px',
                  zIndex: isEdge ? 1 : 0,
                }}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Second month
  const [m2, y2] = viewMonth === 11 ? [0, viewYear + 1] : [viewMonth + 1, viewYear];

  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
      background: isDark ? '#1a2540' : '#d8e4f2',
      border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadow,
      display: 'flex', overflow: 'hidden', minWidth: 560 }}>

      {/* ── Presets sidebar ── */}
      <div style={{ width: 140, flexShrink: 0, borderRight: `1px solid ${t.border}`,
        padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: '0.07em',
          textTransform: 'uppercase', padding: '0 6px', marginBottom: 6 }}>Quick Select</div>
        {PRESETS.map(p => {
          // check if this preset is currently active
          const pr = p.get();
          const active = range.start && range.end &&
            toISO(range.start) === toISO(pr.start!) &&
            toISO(range.end) === toISO(pr.end!);
          return (
            <button key={p.label}
              onClick={() => { onChange(p.get()); setPicking('start'); }}
              style={{ textAlign: 'left', padding: '6px 9px', borderRadius: 7, fontSize: 12,
                fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer',
                background: active ? t.accentBg : 'transparent',
                color: active ? t.accent : t.text, transition: 'all 0.1s' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = t.hoverRow; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── Calendar months ── */}
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Nav row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: `1px solid ${t.border}`,
            borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: t.muted, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* picking indicator */}
            <span style={{ fontSize: 11, color: t.muted }}>
              {picking === 'start'
                ? (range.start ? `Changing start: ${fmtShort(toISO(range.start))}` : 'Click start date')
                : `Click end date`}
            </span>
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: `1px solid ${t.border}`,
            borderRadius: 7, width: 28, height: 28, cursor: 'pointer', color: t.muted, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>

        {/* Two months side by side */}
        <div style={{ display: 'flex', gap: 20 }}>
          {renderMonth(viewYear, viewMonth)}
          <div style={{ width: 1, background: t.border, flexShrink: 0 }} />
          {renderMonth(y2, m2)}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: t.muted }}>
            {range.start && range.end
              ? `${fmtDate(toISO(range.start))} → ${fmtDate(toISO(range.end))}`
              : range.start
                ? `From ${fmtDate(toISO(range.start))} — select end date`
                : 'No date range selected'}
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => { onChange({ start: null, end: null }); setPicking('start'); }}
              style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: `1px solid ${t.border}`, background: 'none', color: t.muted, cursor: 'pointer' }}>
              Clear
            </button>
            <button onClick={onClose}
              style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                border: 'none', background: t.accent, color: '#fff', cursor: 'pointer' }}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Date Range Trigger Button ─────────────────────────────────────────────────
function DateRangeFilter({ isDark, range, onChange }: {
  isDark: boolean;
  range: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const t = tok(isDark);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const hasRange = range.start && range.end;
  const label = hasRange
    ? `${fmtShort(toISO(range.start!))} → ${fmtShort(toISO(range.end!))}`
    : range.start
      ? `From ${fmtShort(toISO(range.start))}`
      : 'Date Range';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          background: hasRange ? t.accentBg : t.input,
          border: `1px solid ${hasRange ? t.accentBdr : t.border}`,
          borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: hasRange ? 700 : 400,
          color: hasRange ? t.accent : t.inputText, cursor: 'pointer',
          transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
        <span>📅</span>
        {label}
        {hasRange && (
          <span onClick={e => { e.stopPropagation(); onChange({ start: null, end: null }); }}
            style={{ marginLeft: 2, opacity: 0.7, fontSize: 11 }}>✕</span>
        )}
        {!hasRange && <span style={{ fontSize: 10, color: t.muted, marginLeft: 1 }}>▾</span>}
      </button>

      {open && (
        <Calendar isDark={isDark} range={range} onChange={onChange} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

// ─── Leads Table ───────────────────────────────────────────────────────────────
function LeadsTable({ leads, salespersons, isDark }: {
  leads: Lead[]; salespersons: Salesperson[]; isDark: boolean;
}) {
  const t = tok(isDark);

  if (leads.length === 0) return (
    <div style={{ padding: '64px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 38, marginBottom: 12 }}>🔍</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 6 }}>No leads found</div>
      <div style={{ fontSize: 13, color: t.muted }}>Try adjusting your filters or add a new lead.</div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.3fr 1.5fr 1.2fr',
        padding: '8px 20px', borderBottom: `1px solid ${t.border}`,
        fontSize: 10, fontWeight: 700, color: t.muted,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)' }}>
        <div>Customer</div>
        <div>Vehicle Interest</div>
        <div>Source</div>
        <div>Status</div>
        <div>Follow-up</div>
        <div>Assigned</div>
      </div>

      {leads.map((lead, i) => {
        const sp      = salespersons.find(s => s.id === lead.assigned_to);
        const overdue = isOverdue(lead.next_followup_date, lead.status);
        const today   = isDueToday(lead.next_followup_date, lead.status);
        const fDate   = fmtDate(lead.next_followup_date);

        return (
          <Link key={lead.id} href={`/admin/crm/${lead.id}`}
            style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1fr 1.3fr 1.5fr 1.2fr',
              padding: '13px 20px', borderBottom: `1px solid ${t.border}`,
              textDecoration: 'none', alignItems: 'center', transition: 'background 0.1s',
              background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>

            {/* Customer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Avatar name={lead.customer_name} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.customer_name}
                </div>
                <div style={{ fontSize: 11, color: t.muted }}>{lead.customer_phone}</div>
              </div>
            </div>

            {/* Vehicle */}
            <div style={{ minWidth: 0, paddingRight: 8 }}>
              {lead.interested_vehicle_desc ? (
                <div style={{ fontSize: 12, color: t.text, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🚗 {lead.interested_vehicle_desc}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>Not specified</span>
              )}
            </div>

            {/* Source */}
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                color: t.muted,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${t.border}`, borderRadius: 6, padding: '2px 7px' }}>
                {SRC_CFG[lead.source]?.icon} {SRC_CFG[lead.source]?.label ?? lead.source}
              </span>
            </div>

            {/* Status */}
            <div><StatusBadge status={lead.status} /></div>

            {/* Follow-up */}
            <div>
              {fDate ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                  fontWeight: 600,
                  color: overdue ? '#ef4444' : today ? '#f59e0b' : t.muted,
                  background: overdue ? 'rgba(239,68,68,0.09)' : today ? 'rgba(245,158,11,0.09)' : 'transparent',
                  border: `1px solid ${overdue ? 'rgba(239,68,68,0.25)' : today ? 'rgba(245,158,11,0.25)' : 'transparent'}`,
                  borderRadius: 6, padding: overdue || today ? '2px 7px' : '0' }}>
                  {overdue && '⚠️ '}{today && '📅 '}{fDate}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: t.muted }}>—</span>
              )}
            </div>

            {/* Assigned */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {sp ? (
                <>
                  <Avatar name={sp.full_name} size={24} />
                  <span style={{ fontSize: 12, color: t.text, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sp.full_name.split(' ')[0]}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: t.muted, fontStyle: 'italic' }}>Unassigned</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub, onClick, isDark }: {
  label: string; value: number | string; color: string; sub?: string;
  onClick?: () => void; isDark: boolean;
}) {
  const t = tok(isDark);
  return (
    <div onClick={onClick} style={{
      background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
      padding: '14px 18px', flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default',
      borderLeft: `3px solid ${color}`, transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { if (onClick) { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = `0 6px 20px rgba(0,0,0,0.2)`; } }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
function CrmPageInner() {
  const { isDark } = useTheme();
  const t = tok(isDark);

  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [page,         setPage]         = useState(1);
  const limit = 25;

  // Filters
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('');
  const [filterSource, setFilterSource] = useState<LeadSource | ''>('');
  const [filterSP,     setFilterSP]     = useState('');
  const [overdueOnly,  setOverdueOnly]  = useState(false);
  const [dateRange,    setDateRange]    = useState<DateRange>({ start: null, end: null });

  // Stats
  const [stats, setStats] = useState({ total: 0, overdue: 0, dueToday: 0, won: 0 });

  const totalPages = Math.ceil(totalCount / limit);

  const inputStyle: React.CSSProperties = {
    background: t.input, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: '7px 11px', fontSize: 12, color: t.inputText, outline: 'none',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235a7295' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28,
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page, limit,
        status:       filterStatus  || undefined,
        source:       filterSource  || undefined,
        assigned_to:  filterSP      || undefined,
        search:       search        || undefined,
        overdue_only: overdueOnly   || undefined,
      };
      // Date range — pass as created_from / created_to if your API supports it
      if (dateRange.start) params.created_from = toISO(dateRange.start);
      if (dateRange.end)   params.created_to   = toISO(dateRange.end);

      const res = await leadApi.list(params as Parameters<typeof leadApi.list>[0]);
      setLeads(res.leads);
      setTotalCount(res.pagination.total ?? 0);
    } catch { setLeads([]); } finally { setLoading(false); }
  }, [page, filterStatus, filterSource, filterSP, search, overdueOnly, dateRange]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    leadApi.getSalespersons().then(setSalespersons).catch(() => {});
    Promise.all([
      leadApi.list({ limit: 1 }),
      leadApi.getOverdue(),
      leadApi.getDueToday(),
      leadApi.list({ status: 'won', limit: 1 }),
    ]).then(([all, ov, dt, won]) => setStats({
      total:    all.pagination.total ?? 0,
      overdue:  ov.length,
      dueToday: dt.length,
      won:      won.pagination.total ?? 0,
    })).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [filterStatus, filterSource, filterSP, search, overdueOnly, dateRange]);

  const hasFilters = search || filterStatus || filterSource || filterSP || overdueOnly || dateRange.start;

  function clearAll() {
    setSearch(''); setFilterStatus(''); setFilterSource(''); setFilterSP('');
    setOverdueOnly(false); setDateRange({ start: null, end: null });
  }

  return (
    <div style={{ background: t.page, minHeight: '100%', padding: '26px 28px 60px',
      fontFamily: "'Geist', 'DM Sans', ui-sans-serif, system-ui, sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: t.text, margin: 0, letterSpacing: '-0.4px' }}>
            CRM Pipeline
          </h1>
          <p style={{ fontSize: 13, color: t.muted, margin: '4px 0 0' }}>
            Track leads, follow-ups and close deals.
          </p>
        </div>
        <Link href="/admin/crm/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
            background: t.accent, color: '#fff', border: 'none', borderRadius: 9,
            padding: '9px 18px', fontSize: 13, fontWeight: 800, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(16,185,129,0.35)', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; }}>
          + New Lead
        </Link>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total Leads"         value={stats.total}    color="#818cf8" isDark={isDark} />
        <StatCard label="Overdue Follow-ups"  value={stats.overdue}  color="#ef4444" isDark={isDark}
          sub={stats.overdue > 0 ? 'Click to filter' : undefined}
          onClick={stats.overdue > 0 ? () => setOverdueOnly(true) : undefined} />
        <StatCard label="Due Today"           value={stats.dueToday} color="#f59e0b" isDark={isDark} />
        <StatCard label="Won"                 value={stats.won}      color="#34d399" isDark={isDark} />
      </div>

      {/* ── Overdue banner ─────────────────────────────────────────────── */}
      {stats.overdue > 0 && !overdueOnly && (
        <button onClick={() => setOverdueOnly(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 10, padding: '11px 18px', marginBottom: 16,
            cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
              {stats.overdue} overdue follow-up{stats.overdue !== 1 ? 's' : ''} need attention
            </span>
            <span style={{ fontSize: 12, color: t.muted, marginLeft: 8 }}>Click to filter</span>
          </div>
          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>View →</span>
        </button>
      )}

      {/* ── Main card ─────────────────────────────────────────────────── */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
        overflow: 'visible', boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.08)' }}>

        {/* Status pills */}
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          borderRadius: '14px 14px 0 0' }}>
          {(['', ...STATUSES] as (LeadStatus | '')[]).map(s => {
            const active = filterStatus === s;
            const cfg    = s ? STATUS_CFG[s] : null;
            return (
              <button key={s || 'all'}
                onClick={() => setFilterStatus(active ? '' : s as LeadStatus)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.12s',
                  border: `1px solid ${active ? (cfg ? cfg.border : t.accentBdr) : t.border}`,
                  background: active ? (cfg ? cfg.bg : t.accentBg) : 'transparent',
                  color: active ? (cfg ? cfg.color : t.accent) : t.muted }}>
                {cfg && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%',
                    background: active ? cfg.color : t.muted, flexShrink: 0 }} />
                )}
                {s ? STATUS_CFG[s as LeadStatus].label : 'All'}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: t.muted, pointerEvents: 'none' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, vehicle…"
              style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
          </div>

          {/* Source */}
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as LeadSource | '')}
            style={{ ...selectStyle, minWidth: 120 }}>
            <option value="">All Sources</option>
            {Object.entries(SRC_CFG).map(([v, c]) => (
              <option key={v} value={v}>{c.icon} {c.label}</option>
            ))}
          </select>

          {/* Salesperson */}
          <select value={filterSP} onChange={e => setFilterSP(e.target.value)}
            style={{ ...selectStyle, minWidth: 140 }}>
            <option value="">All Salespersons</option>
            {salespersons.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>

          {/* Date Range Picker */}
          <DateRangeFilter isDark={isDark} range={dateRange} onChange={setDateRange} />

          {/* Overdue chip */}
          {overdueOnly && (
            <button onClick={() => setOverdueOnly(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 700,
                color: '#ef4444', cursor: 'pointer' }}>
              ⚠️ Overdue ✕
            </button>
          )}

          {/* Clear all */}
          {hasFilters && (
            <button onClick={clearAll}
              style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: 8,
                padding: '6px 11px', fontSize: 12, color: t.muted, cursor: 'pointer' }}>
              Clear all
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: t.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {loading ? '…' : `${totalCount} lead${totalCount !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
          {loading ? (
            <div style={{ padding: '52px 32px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', gap: 6, marginBottom: 12 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent,
                    animation: 'crmPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.18}s`, opacity: 0.7 }} />
                ))}
              </div>
              <div style={{ fontSize: 13, color: t.muted }}>Loading leads…</div>
            </div>
          ) : (
            <LeadsTable leads={leads} salespersons={salespersons} isDark={isDark} />
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.02)',
            borderRadius: '0 0 14px 14px' }}>
            <div style={{ fontSize: 12, color: t.muted }}>
              Page {page} of {totalPages} · {totalCount} total
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${t.border}`, background: t.input,
                  color: page === 1 ? t.muted : t.text,
                  cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12,
                      fontWeight: p === page ? 800 : 400,
                      border: `1px solid ${p === page ? t.accent : t.border}`,
                      background: p === page ? t.accent : t.input,
                      color: p === page ? '#fff' : t.text,
                      cursor: 'pointer', minWidth: 32 }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${t.border}`, background: t.input,
                  color: page === totalPages ? t.muted : t.text,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes crmPulse {
          0%,100% { transform: scale(0.7); opacity: 0.4; }
          50%      { transform: scale(1.1); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

export default function CrmPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div style={{ padding: 40, color: '#5a7295', fontSize: 13 }}>Loading…</div>}>
        <CrmPageInner />
      </Suspense>
    </AdminShell>
  );
}