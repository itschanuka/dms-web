'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi,
  type Lead, type LeadStatus,
  type Salesperson,
} from '@/lib/api';
import { useTheme } from '@/lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:         { label: 'New',         color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  contacted:   { label: 'Contacted',   color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  interested:  { label: 'Interested',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  test_drive:  { label: 'Test Drive',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  negotiation: { label: 'Negotiation', color: '#ec4899', bg: 'rgba(236,72,153,0.1)'  },
  won:         { label: 'Won',         color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  lost:        { label: 'Lost',        color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};
const STATUSES: LeadStatus[] = ['new','contacted','interested','test_drive','negotiation','won','lost'];

const SRC_LABEL: Record<string, string> = {
  walk_in:'Walk-in', call:'Call', website:'Website',
  facebook:'Facebook', whatsapp:'WhatsApp', referral:'Referral', other:'Other',
};
const SRC_ICON: Record<string, string> = {
  walk_in:'🚶', call:'📞', website:'🌐',
  facebook:'📘', whatsapp:'💬', referral:'🤝', other:'📌',
};
const COND_LABEL: Record<string, string> = { used:'Used', reconditioned:'Recon', brand_new:'New' };
const TX_LABEL:   Record<string, string> = { manual:'MT', automatic:'AT', cvt:'CVT' };

// ─── Theme tokens ─────────────────────────────────────────────────────────────
function tok(isDark: boolean) {
  return {
    pageBg:       isDark ? '#0d1321' : '#e8eef6',
    card:         isDark ? '#111827' : '#ffffff',
    cardInner:    isDark ? '#0d1321' : '#f4f7fb',
    border:       isDark ? '#1e2d45' : '#c8d6e8',
    text:         isDark ? '#e2eaf8' : '#0f1e32',
    muted:        isDark ? '#4a6278' : '#5a7a95',
    label:        isDark ? '#6b8aaa' : '#4e6880',
    input:        isDark ? '#070d18' : '#eef2f8',
    inputText:    isDark ? '#d4e0f4' : '#1a2e42',
    drop:         isDark ? '#0f1c2e' : '#f0f5fb',
    accent:       '#10b981',
    accentBg:     isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
    accentBorder: 'rgba(16,185,129,0.25)',
    amber:        '#f59e0b',
    amberBg:      isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
    amberBorder:  'rgba(245,158,11,0.28)',
    danger:       '#ef4444',
    shadow:       isDark ? '0 4px 24px rgba(0,0,0,0.45)' : '0 2px 16px rgba(0,0,0,0.10)',
    shadowMd:     isDark ? '0 12px 40px rgba(0,0,0,0.55)' : '0 8px 32px rgba(0,0,0,0.14)',
    row:          isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    rowHov:       isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)',
  };
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function isOverdue(date: string | null, status: LeadStatus) {
  if (!date || status === 'won' || status === 'lost') return false;
  return new Date(date) < new Date(new Date().toDateString());
}
function isDueToday(date: string | null, status: LeadStatus) {
  if (!date || status === 'won' || status === 'lost') return false;
  return new Date(date).toDateString() === new Date().toDateString();
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LeadStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700,
      color:c.color, background:c.bg, border:`1px solid ${c.color}30`, borderRadius:20, padding:'3px 9px' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.color, flexShrink:0 }} />
      {c.label}
    </span>
  );
}

// ─── Leads List ────────────────────────────────────────────────────────────────
function LeadsList({ isDark, refreshKey }: { isDark:boolean; refreshKey:number }) {
  const t = tok(isDark);
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [page,         setPage]         = useState(1);
  const [stats,        setStats]        = useState({ overdue:0, dueToday:0 });
  const limit = 20;

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterSP,     setFilterSP]     = useState('');
  const [overdueOnly,  setOverdueOnly]  = useState(false);

  const F: React.CSSProperties = { background:t.input, border:`1px solid ${t.border}`, borderRadius:8, padding:'7px 11px', fontSize:12, color:t.inputText, outline:'none' };

  const loadLeads = useCallback(async()=>{
    setLoading(true);
    try {
      const res = await leadApi.list({ page, limit, status:filterStatus||undefined, source:filterSource||undefined, assigned_to:filterSP||undefined, search:search||undefined, overdue_only:overdueOnly||undefined });
      setLeads(res.leads);
      setTotalCount(res.pagination.total??0);
    } catch { setLeads([]); } finally { setLoading(false); }
  }, [page, filterStatus, filterSource, filterSP, search, overdueOnly, refreshKey]);

  useEffect(()=>{ loadLeads(); }, [loadLeads]);

  useEffect(()=>{
    leadApi.getSalespersons().then(setSalespersons).catch(()=>{});
    Promise.all([leadApi.getOverdue(), leadApi.getDueToday()])
      .then(([ov,dt])=>setStats({overdue:ov.length, dueToday:dt.length}))
      .catch(()=>{});
  }, [refreshKey]);

  useEffect(()=>{ setPage(1); }, [filterStatus, filterSource, filterSP, search, overdueOnly]);

  const totalPages = Math.ceil(totalCount/limit);

  return (
    <div>
      {/* Alert cards */}
      {(stats.overdue>0 || stats.dueToday>0) && (
        <div style={{ display:'flex', gap:12, marginBottom:14 }}>
          {stats.overdue>0 && (
            <button onClick={()=>setOverdueOnly(true)}
              style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 16px', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#ef4444' }}>{stats.overdue} Overdue Follow-up{stats.overdue!==1?'s':''}</div>
                <div style={{ fontSize:11, color:t.muted }}>Click to filter</div>
              </div>
            </button>
          )}
          {stats.dueToday>0 && (
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'10px 16px' }}>
              <span style={{ fontSize:18 }}>📅</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{stats.dueToday} Due Today</div>
                <div style={{ fontSize:11, color:t.muted }}>Follow-ups scheduled for today</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status pills */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:12 }}>
        {(['', ...STATUSES] as (LeadStatus|'')[]).map(s=>{
          const active = filterStatus===(s as string);
          const cfg = s ? STATUS_CFG[s] : null;
          return (
            <button key={s||'all'} onClick={()=>setFilterStatus(active?'':(s as string))}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 13px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                border:`1px solid ${active?(cfg?cfg.color+'60':'#10b981'):t.border}`,
                background:active?(cfg?cfg.bg:'rgba(16,185,129,0.1)'):t.input,
                color:active?(cfg?cfg.color:'#10b981'):t.muted }}>
              {cfg && <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color }} />}
              {s ? STATUS_CFG[s].label : 'All Leads'}
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow }}>
        {/* Toolbar */}
        <div style={{ padding:'12px 18px', borderBottom:`1px solid ${t.border}`, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', background:isDark?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.01)' }}>
          <div style={{ flex:1, minWidth:180, position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:t.muted, fontSize:13, pointerEvents:'none' }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, vehicle…"
              style={{...F, width:'100%', paddingLeft:32, boxSizing:'border-box'}} />
          </div>
          <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} style={{...F, minWidth:130}}>
            <option value="">All Sources</option>
            {Object.entries(SRC_LABEL).map(([v,l])=><option key={v} value={v}>{SRC_ICON[v]} {l}</option>)}
          </select>
          <select value={filterSP} onChange={e=>setFilterSP(e.target.value)} style={{...F, minWidth:145}}>
            <option value="">All Salespersons</option>
            {salespersons.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          {overdueOnly && (
            <button onClick={()=>setOverdueOnly(false)}
              style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'6px 11px', fontSize:12, fontWeight:700, color:'#ef4444', cursor:'pointer' }}>
              ⚠️ Overdue Only ✕
            </button>
          )}
          {(search||filterStatus||filterSource||filterSP||overdueOnly) && (
            <button onClick={()=>{ setSearch(''); setFilterStatus(''); setFilterSource(''); setFilterSP(''); setOverdueOnly(false); }}
              style={{ background:'none', border:`1px solid ${t.border}`, borderRadius:8, padding:'6px 11px', fontSize:12, color:t.muted, cursor:'pointer' }}>
              Clear all
            </button>
          )}
          <div style={{ marginLeft:'auto', fontSize:12, color:t.muted }}>{totalCount} lead{totalCount!==1?'s':''}</div>
        </div>

        {/* Table body */}
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:t.muted, fontSize:13 }}>Loading leads…</div>
        ) : leads.length===0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:700, color:t.text, marginBottom:5 }}>No leads found</div>
            <div style={{ fontSize:13, color:t.muted }}>
              {search||filterStatus||filterSource||filterSP||overdueOnly ? 'Try adjusting your filters.' : 'Add your first lead using the form above.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 110px 100px 120px 110px', padding:'8px 18px', borderBottom:`1px solid ${t.border}`,
              fontSize:10, fontWeight:700, color:t.label, letterSpacing:'0.07em', textTransform:'uppercase',
              background:isDark?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.02)' }}>
              <div>Customer</div><div>Vehicle Interest</div><div>Source</div><div>Status</div><div>Follow-up</div><div>Assigned To</div>
            </div>
            {leads.map(lead=>{
              const sp      = salespersons.find(s=>s.id===lead.assigned_to);
              const overdue = isOverdue(lead.next_followup_date, lead.status);
              const today   = isDueToday(lead.next_followup_date, lead.status);
              return (
                <Link key={lead.id} href={`/admin/crm/${lead.id}`}
                  style={{ display:'grid', gridTemplateColumns:'1fr 1fr 110px 100px 120px 110px',
                    padding:'11px 18px', borderBottom:`1px solid ${t.border}`, textDecoration:'none',
                    background:t.row, transition:'background 0.12s', alignItems:'center' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.background=t.rowHov}
                  onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.background=t.row}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{ width:29, height:29, borderRadius:'50%', background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#8b5cf6', flexShrink:0 }}>
                      {lead.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:t.text }}>{lead.customer_name}</div>
                      <div style={{ fontSize:11, color:t.muted }}>{lead.customer_phone}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:t.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
                    {lead.interested_vehicle_desc || <span style={{ color:t.muted, fontStyle:'italic' }}>Not specified</span>}
                  </div>
                  <div style={{ fontSize:11, color:t.muted }}>{SRC_ICON[lead.source]} {SRC_LABEL[lead.source]??lead.source}</div>
                  <div><StatusBadge status={lead.status} /></div>
                  <div>
                    {lead.next_followup_date ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
                        color:overdue?'#ef4444':today?'#f59e0b':t.muted,
                        background:overdue?'rgba(239,68,68,0.08)':today?'rgba(245,158,11,0.08)':'transparent',
                        border:`1px solid ${overdue?'rgba(239,68,68,0.2)':today?'rgba(245,158,11,0.2)':'transparent'}`,
                        borderRadius:6, padding:overdue||today?'2px 6px':'0' }}>
                        {overdue&&'⚠️ '}{today&&'📅 '}{fmtDate(lead.next_followup_date)}
                      </span>
                    ) : <span style={{ fontSize:11, color:t.muted }}>—</span>}
                  </div>
                  <div style={{ fontSize:12, color:t.text, fontWeight:500 }}>
                    {sp ? sp.full_name.split(' ')[0] : <span style={{ color:t.muted, fontStyle:'italic' }}>Unassigned</span>}
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {/* Pagination */}
        {totalPages>1 && (
          <div style={{ padding:'12px 18px', borderTop:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:isDark?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.01)' }}>
            <div style={{ fontSize:12, color:t.muted }}>Page {page} of {totalPages}</div>
            <div style={{ display:'flex', gap:5 }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{ background:t.input, border:`1px solid ${t.border}`, borderRadius:7, padding:'5px 11px', fontSize:12, color:page===1?t.muted:t.text, cursor:page===1?'not-allowed':'pointer' }}>← Prev</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const p=Math.max(1,Math.min(page-2,totalPages-4))+i;
                return <button key={p} onClick={()=>setPage(p)}
                  style={{ background:p===page?'#10b981':t.input, border:`1px solid ${p===page?'#10b981':t.border}`, borderRadius:7, padding:'5px 10px', fontSize:12, fontWeight:p===page?700:400, color:p===page?'#fff':t.text, cursor:'pointer', minWidth:30 }}>{p}</button>;
              })}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ background:t.input, border:`1px solid ${t.border}`, borderRadius:7, padding:'5px 11px', fontSize:12, color:page===totalPages?t.muted:t.text, cursor:page===totalPages?'not-allowed':'pointer' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function CrmPageInner() {
  const { isDark } = useTheme();
  const t = tok(isDark);

  return (
    <div style={{ padding:'24px 28px 56px', background:t.pageBg, minHeight:'100%' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:24, fontWeight:900, color:t.text, margin:'0 0 3px', letterSpacing:'-0.4px' }}>CRM Pipeline</h1>
        <p style={{ fontSize:13, color:t.muted, margin:0 }}>View and manage your existing lead pipeline.</p>
      </div>

      {/* ── Leads list ── */}
      <LeadsList isDark={isDark} refreshKey={0} />

    </div>
  );
}

export default function CrmPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div style={{ padding:40, color:'#4a6278', fontSize:13 }}>Loading…</div>}>
        <CrmPageInner />
      </Suspense>
    </AdminShell>
  );
}