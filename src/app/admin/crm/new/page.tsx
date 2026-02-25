'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '@/components/admin/AdminShell';
import {
  leadApi, customerApi, adminApi,
  type Lead, type LeadStatus, type LeadSource,
  type CreateLeadData, type Salesperson,
  type VehicleSearchResult, type Customer, type AdminVehicle,
} from '@/lib/api';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';

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

// ─── Vehicle Browse Modal ──────────────────────────────────────────────────────
// Shows ONLY available vehicles — once a vehicle is sold (won), it disappears from here automatically.
function VehicleBrowseModal({ onPick, onClose, isDark }: {
  onPick:(v:VehicleSearchResult)=>void; onClose:()=>void; isDark:boolean;
}) {
  const t = tok(isDark);
  const [vehicles,   setVehicles]   = useState<AdminVehicle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [makes,      setMakes]      = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 80);
    // Only fetch available vehicles — won/sold vehicles won't appear here
    adminApi.listVehicles({ status:'available', limit:100 })
      .then(res => { setVehicles(res.vehicles); setMakes([...new Set(res.vehicles.map(v=>v.make))].sort()); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return (!q || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) ||
      v.stock_id.toLowerCase().includes(q) || String(v.year).includes(q) ||
      (v.color||'').toLowerCase().includes(q)) && (!filterMake || v.make === filterMake);
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'48px 20px', overflowY:'auto' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:t.card, borderRadius:16, border:`1px solid ${t.border}`, width:'100%', maxWidth:960, boxShadow:t.shadowMd, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background: isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.015)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:t.amberBg, border:`1px solid ${t.amberBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚗</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:t.text }}>Browse Available Vehicles</div>
              <div style={{ fontSize:12, color:t.muted, marginTop:1 }}>
                {loading ? 'Loading…' : `${filtered.length} vehicle${filtered.length!==1?'s':''} available`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:`1px solid ${t.border}`, borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:600, color:t.muted, cursor:'pointer' }}>✕ Close</button>
        </div>

        {/* Filters */}
        <div style={{ padding:'12px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', gap:10, background:t.cardInner }}>
          <div style={{ flex:1, position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:t.muted, fontSize:13, pointerEvents:'none' }}>🔍</span>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search make, model, stock ID, colour, year…"
              style={{ width:'100%', background:t.input, border:`1px solid ${t.border}`, borderRadius:8, padding:'8px 12px 8px 34px', fontSize:13, color:t.inputText, outline:'none', boxSizing:'border-box' }} />
          </div>
          <select value={filterMake} onChange={e=>setFilterMake(e.target.value)}
            style={{ background:t.input, border:`1px solid ${t.border}`, borderRadius:8, padding:'8px 32px 8px 12px', fontSize:13, color:t.inputText, outline:'none', minWidth:140, cursor:'pointer', appearance:'none',
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b8aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }}>
            <option value="">All Makes</option>
            {makes.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div style={{ padding:24, maxHeight:520, overflowY:'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:t.muted, fontSize:13 }}>Loading inventory…</div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:60, color:t.muted, fontSize:13 }}>No vehicles match your search.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:12 }}>
              {filtered.map(v=>(
                <div key={v.id}
                  onClick={()=>{ onPick({ id:v.id, stock_id:v.stock_id, make:v.make, model:v.model, year:v.year, asking_price:v.asking_price, status:v.status, main_image_url:v.main_image_url }); onClose(); }}
                  style={{ background:t.cardInner, border:`1px solid ${t.border}`, borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.borderColor=t.amber; el.style.transform='translateY(-2px)'; el.style.boxShadow=`0 8px 24px rgba(245,158,11,0.15)`; }}
                  onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.borderColor=t.border; el.style.transform='translateY(0)'; el.style.boxShadow='none'; }}>
                  <div style={{ height:120, background:isDark?'#0a1120':'#dce5f0', position:'relative', overflow:'hidden' }}>
                    {v.main_image_url
                      ? <img src={v.main_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, color:t.muted }}>🚗</div>}
                    <div style={{ position:'absolute', top:7, left:7, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', borderRadius:5, padding:'2px 7px', fontSize:10, fontWeight:700, color:'#fff' }}>
                      {COND_LABEL[v.condition]??v.condition}
                    </div>
                  </div>
                  <div style={{ padding:'10px 12px' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:t.text, marginBottom:2 }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ fontSize:11, color:t.muted, marginBottom:8 }}>
                      {v.stock_id}{v.color?` · ${v.color}`:''}
                      {v.transmission?` · ${TX_LABEL[v.transmission]??v.transmission}`:''}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontSize:14, fontWeight:800, color:t.amber }}>{formatPrice(v.asking_price)}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:t.accent, background:t.accentBg, border:`1px solid ${t.accentBorder}`, borderRadius:5, padding:'2px 7px' }}>Available</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add New Lead Form (inline, collapsible) ───────────────────────────────────
function AddLeadForm({ isDark, onCreated }: { isDark:boolean; onCreated:(id:string)=>void }) {
  const router       = useRouter();
  const { employee } = useAuth();
  const t = tok(isDark);

  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [showBrowse,   setShowBrowse]   = useState(false);

  // Vehicle search
  const [vehicleQuery,     setVehicleQuery]     = useState('');
  const [vehicleResults,   setVehicleResults]   = useState<VehicleSearchResult[]>([]);
  const [vehicleSearching, setVehicleSearching] = useState(false);
  const [selectedVehicle,  setSelectedVehicle]  = useState<VehicleSearchResult|null>(null);
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const vehicleTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const searchBoxRef  = useRef<HTMLDivElement>(null);

  // Customer search
  const [customerQuery,     setCustomerQuery]     = useState('');
  const [customerResults,   setCustomerResults]   = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer,  setSelectedCustomer]  = useState<Customer|null>(null);
  const customerTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [form, setForm] = useState<CreateLeadData>({
    customer_id:'', customer_name:'', customer_phone:'',
    interested_vehicle_id:'', interested_vehicle_desc:'',
    source:'walk_in', assigned_to:'',
    next_followup_date:'', next_followup_note:'',
  });

  const F: React.CSSProperties = { width:'100%', background:t.input, border:`1px solid ${t.border}`, borderRadius:8, padding:'9px 12px', fontSize:13, color:t.inputText, outline:'none', boxSizing:'border-box' };

  useEffect(()=>{
    leadApi.getSalespersons().then(setSalespersons).catch(()=>{});
    // Pre-fill customer from query param (e.g. coming from customers page)
    const preId = new URLSearchParams(window.location.search).get('customer_id');
    if (preId) customerApi.get(preId).then(c=>{
      setSelectedCustomer(c);
      setForm(f=>({...f, customer_id:c.id, customer_name:c.full_name, customer_phone:c.phone_primary}));
    }).catch(()=>{});
  }, []);

  useEffect(()=>{
    if (employee?.role==='salesperson') setForm(f=>({...f, assigned_to:employee.id}));
  }, [employee]);

  // Close vehicle dropdown on outside click
  useEffect(()=>{
    const fn=(e:MouseEvent)=>{ if(searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener('mousedown', fn);
    return ()=>document.removeEventListener('mousedown', fn);
  }, []);

  // Debounced vehicle search — only searches available vehicles
  useEffect(()=>{
    if (!vehicleQuery || vehicleQuery.length<2) { setVehicleResults([]); setDropdownOpen(false); return; }
    if (vehicleTimer.current) clearTimeout(vehicleTimer.current);
    vehicleTimer.current = setTimeout(async()=>{
      setVehicleSearching(true);
      try { const res=await leadApi.searchVehicles(vehicleQuery); setVehicleResults(res); setDropdownOpen(res.length>0); }
      catch{} finally{ setVehicleSearching(false); }
    }, 350);
    return ()=>{ if(vehicleTimer.current) clearTimeout(vehicleTimer.current); };
  }, [vehicleQuery]);

  // Debounced customer search
  useEffect(()=>{
    if (!customerQuery || customerQuery.length<2) { setCustomerResults([]); return; }
    if (customerTimer.current) clearTimeout(customerTimer.current);
    customerTimer.current = setTimeout(async()=>{
      setCustomerSearching(true);
      try { const res=await customerApi.list({search:customerQuery, limit:8}); setCustomerResults(res.customers); }
      catch{} finally{ setCustomerSearching(false); }
    }, 400);
    return ()=>{ if(customerTimer.current) clearTimeout(customerTimer.current); };
  }, [customerQuery]);

  function setF(key:keyof CreateLeadData, value:string){ setForm(f=>({...f,[key]:value})); }

  function pickVehicle(v:VehicleSearchResult){
    setSelectedVehicle(v); setVehicleResults([]); setVehicleQuery(''); setDropdownOpen(false);
    setForm(f=>({...f, interested_vehicle_id:v.id, interested_vehicle_desc:`${v.year} ${v.make} ${v.model} (${v.stock_id})`}));
  }
  function clearVehicle(){ setSelectedVehicle(null); setVehicleQuery(''); setForm(f=>({...f, interested_vehicle_id:'', interested_vehicle_desc:''})); }
  function pickCustomer(c:Customer){
    setSelectedCustomer(c); setCustomerResults([]); setCustomerQuery('');
    setForm(f=>({...f, customer_id:c.id, customer_name:c.full_name, customer_phone:c.phone_primary}));
  }
  function clearCustomer(){ setSelectedCustomer(null); setForm(f=>({...f, customer_id:'', customer_name:'', customer_phone:''})); }

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Customer name is required'); return; }
    if (!form.customer_phone.trim()){ setError('Customer phone is required'); return; }
    if (!form.assigned_to)          { setError('Salesperson is required');    return; }
    setSaving(true); setError('');
    try {
      const lead = await leadApi.create({
        ...form,
        customer_id:             form.customer_id||undefined,
        interested_vehicle_id:   form.interested_vehicle_id||undefined,
        interested_vehicle_desc: form.interested_vehicle_desc||undefined,
        next_followup_date:      form.next_followup_date||undefined,
        next_followup_note:      form.next_followup_note||undefined,
      });
      router.push(`/admin/crm/${lead.id}`);
    } catch(err){ setError(String(err)); setSaving(false); }
  }

  const assignedPerson = salespersons.find(s=>s.id===form.assigned_to);

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'11px 16px', marginBottom:16, fontSize:13, color:'#ef4444' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Two-column layout: form fields left, summary right */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>

        {/* ── LEFT: form fields ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Section: Customer */}
          <div style={{ background:t.cardInner, border:`1px solid ${t.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'11px 16px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:8, background:isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.015)' }}>
              <span style={{ fontSize:14 }}>👤</span>
              <span style={{ fontSize:12, fontWeight:700, color:t.text }}>Customer</span>
            </div>
            <div style={{ padding:16 }}>
              {/* Customer search */}
              {!selectedCustomer ? (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Search existing customer — optional</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:t.muted, fontSize:13, pointerEvents:'none' }}>🔍</span>
                    <input value={customerQuery} onChange={e=>setCustomerQuery(e.target.value)} placeholder="Type name or phone…" style={{...F, paddingLeft:32}} />
                    {customerSearching && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:11, color:t.muted }}>…</span>}
                    {customerResults.length>0 && (
                      <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:50, background:t.drop, border:`1px solid ${t.border}`, borderRadius:10, maxHeight:200, overflowY:'auto', boxShadow:t.shadowMd }}>
                        {customerResults.map(cu=>(
                          <div key={cu.id} onClick={()=>pickCustomer(cu)}
                            style={{ padding:'9px 14px', cursor:'pointer', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:9 }}
                            onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)'}
                            onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                            <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#8b5cf6', fontWeight:700, flexShrink:0 }}>
                              {cu.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:t.text }}>{cu.full_name}</div>
                              <div style={{ fontSize:11, color:t.muted }}>{cu.phone_primary} · {cu.customer_code}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, margin:'12px 0' }}>
                    <div style={{ flex:1, height:1, background:t.border }} />
                    <span style={{ fontSize:10, color:t.muted, fontWeight:600 }}>OR ENTER MANUALLY</span>
                    <div style={{ flex:1, height:1, background:t.border }} />
                  </div>
                </div>
              ) : (
                <div style={{ background:t.accentBg, border:`1px solid ${t.accentBorder}`, borderRadius:9, padding:'10px 13px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#8b5cf6', fontWeight:800, flexShrink:0 }}>
                    {selectedCustomer.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:t.accent }}>{selectedCustomer.full_name} <span style={{ fontSize:10, fontWeight:700, color:t.accent, background:t.accentBg, border:`1px solid ${t.accentBorder}`, borderRadius:4, padding:'1px 5px', marginLeft:4 }}>Linked</span></div>
                    <div style={{ fontSize:11, color:t.muted }}>{selectedCustomer.phone_primary} · {selectedCustomer.customer_code}</div>
                  </div>
                  <button type="button" onClick={clearCustomer} style={{ background:'none', border:`1px solid ${t.border}`, borderRadius:6, padding:'3px 9px', fontSize:11, color:t.muted, cursor:'pointer' }}>Unlink</button>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Full Name <span style={{ color:t.danger }}>*</span></div>
                  <input value={form.customer_name} onChange={e=>setF('customer_name',e.target.value)} placeholder="e.g. Nimal Perera" style={F} disabled={!!selectedCustomer} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Phone <span style={{ color:t.danger }}>*</span></div>
                  <input value={form.customer_phone} onChange={e=>setF('customer_phone',e.target.value)} placeholder="+94 77 000 0000" style={F} disabled={!!selectedCustomer} />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Vehicle Interest */}
          <div style={{ background:t.cardInner, border:`1px solid ${t.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'11px 16px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.015)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:14 }}>🚗</span>
                <span style={{ fontSize:12, fontWeight:700, color:t.text }}>Vehicle Interest</span>
                <span style={{ fontSize:10, color:t.muted, fontStyle:'italic' }}>— only available vehicles shown</span>
              </div>
              {!selectedVehicle && (
                <button type="button" onClick={()=>setShowBrowse(true)}
                  style={{ display:'flex', alignItems:'center', gap:5, background:t.amberBg, border:`1px solid ${t.amberBorder}`, borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:700, color:t.amber, cursor:'pointer' }}>
                  📋 Browse All
                </button>
              )}
            </div>
            <div style={{ padding:16 }}>
              {selectedVehicle ? (
                <div style={{ background:t.amberBg, border:`1px solid ${t.amberBorder}`, borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                  <div style={{ display:'flex' }}>
                    <div style={{ width:110, flexShrink:0, background:isDark?'#060d18':'#d5e0ee' }}>
                      {selectedVehicle.main_image_url
                        ? <img src={selectedVehicle.main_image_url} alt="" style={{ width:'100%', height:'100%', minHeight:80, objectFit:'cover', display:'block' }} />
                        : <div style={{ width:'100%', minHeight:80, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, color:t.muted }}>🚗</div>}
                    </div>
                    <div style={{ flex:1, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800, color:t.amber, marginBottom:2 }}>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</div>
                        <div style={{ fontSize:11, color:t.muted, marginBottom:6 }}>Stock: {selectedVehicle.stock_id}</div>
                        <div style={{ fontSize:16, fontWeight:900, color:t.text }}>{formatPrice(selectedVehicle.asking_price)}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:t.accent, background:t.accentBg, border:`1px solid ${t.accentBorder}`, borderRadius:5, padding:'2px 8px' }}>✓ Linked</span>
                        <button type="button" onClick={clearVehicle} style={{ background:'none', border:`1px solid ${t.border}`, borderRadius:6, padding:'3px 9px', fontSize:11, color:t.muted, cursor:'pointer' }}>✕ Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom:12 }} ref={searchBoxRef}>
                  <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Quick search — make, model, stock ID</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:t.muted, fontSize:13, pointerEvents:'none' }}>🔍</span>
                    <input value={vehicleQuery} onChange={e=>setVehicleQuery(e.target.value)} onFocus={()=>vehicleResults.length>0&&setDropdownOpen(true)}
                      placeholder="Toyota, Aqua, STK-001…" style={{...F, paddingLeft:32}} />
                    {vehicleSearching && <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:11, color:t.muted }}>…</span>}
                    {dropdownOpen && vehicleResults.length>0 && (
                      <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:50, background:t.drop, border:`1px solid ${t.border}`, borderRadius:10, maxHeight:260, overflowY:'auto', boxShadow:t.shadowMd }}>
                        {vehicleResults.map(v=>(
                          <div key={v.id} onClick={()=>pickVehicle(v)}
                            style={{ display:'flex', alignItems:'center', gap:11, padding:'9px 13px', cursor:'pointer', borderBottom:`1px solid ${t.border}` }}
                            onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)'}
                            onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                            <div style={{ width:50, height:36, flexShrink:0, borderRadius:6, overflow:'hidden', background:isDark?'#0a1120':'#d5e0ee', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {v.main_image_url ? <img src={v.main_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:16 }}>🚗</span>}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:t.text }}>{v.year} {v.make} {v.model}</div>
                              <div style={{ fontSize:11, color:t.muted }}>
                                {v.stock_id}
                                <span style={{ marginLeft:5, padding:'1px 5px', borderRadius:4, fontSize:10, fontWeight:700, background:t.accentBg, color:t.accent }}>available</span>
                              </div>
                            </div>
                            <div style={{ fontSize:13, fontWeight:800, color:t.amber, flexShrink:0 }}>{formatPrice(v.asking_price)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {selectedVehicle ? 'Additional notes / requirements' : 'Or describe what they want'} — <span style={{ fontWeight:400, textTransform:'none', color:t.muted }}>optional</span>
                </div>
                <input value={form.interested_vehicle_desc} onChange={e=>setF('interested_vehicle_desc',e.target.value)}
                  placeholder={selectedVehicle?'Colour preference, extras…':'e.g. Toyota Aqua 2020, white, hybrid…'} style={F} />
              </div>
            </div>
          </div>

          {/* Section: Lead Details */}
          <div style={{ background:t.cardInner, border:`1px solid ${t.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'11px 16px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:8, background:isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.015)' }}>
              <span style={{ fontSize:14 }}>📋</span>
              <span style={{ fontSize:12, fontWeight:700, color:t.text }}>Lead Details</span>
            </div>
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
              {/* Source pills */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Source <span style={{ color:t.danger }}>*</span></div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {Object.entries(SRC_LABEL).map(([val, lbl])=>{
                    const active = form.source===val;
                    return (
                      <button key={val} type="button" onClick={()=>setF('source',val)}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:20, fontSize:12, fontWeight:active?700:500,
                          border:`1px solid ${active?t.accentBorder:t.border}`, background:active?t.accentBg:t.input,
                          color:active?t.accent:t.muted, cursor:'pointer', transition:'all 0.12s' }}>
                        <span>{SRC_ICON[val]}</span>{lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Assign To <span style={{ color:t.danger }}>*</span></div>
                  <select value={form.assigned_to} onChange={e=>setF('assigned_to',e.target.value)}
                    style={{...F, cursor:'pointer', appearance:'none',
                      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b8aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:32}}>
                    <option value="">— Select salesperson —</option>
                    {salespersons.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Next Follow-up Date</div>
                  <input type="date" value={form.next_followup_date} onChange={e=>setF('next_followup_date',e.target.value)} style={F} />
                </div>
                <div style={{ gridColumn:'1 / -1' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:t.label, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Follow-up Note — <span style={{ fontWeight:400, textTransform:'none', color:t.muted }}>optional</span></div>
                  <input value={form.next_followup_note} onChange={e=>setF('next_followup_note',e.target.value)} placeholder="What to discuss, customer preferences…" style={F} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: live summary + submit ── */}
        <div style={{ position:'sticky', top:16 }}>
          <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, overflow:'hidden', boxShadow:t.shadow }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${t.border}`, background:isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.015)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:t.label, letterSpacing:'0.07em', textTransform:'uppercase' }}>Summary</div>
            </div>
            <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
              {/* Customer */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:t.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Customer</div>
                {form.customer_name ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#8b5cf6', fontWeight:700, flexShrink:0 }}>
                      {form.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:t.text }}>{form.customer_name}</div>
                      <div style={{ fontSize:11, color:t.muted }}>{form.customer_phone||'—'}</div>
                    </div>
                  </div>
                ) : <div style={{ fontSize:11, color:t.muted, fontStyle:'italic' }}>Not set</div>}
              </div>
              <div style={{ height:1, background:t.border }} />
              {/* Vehicle */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:t.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Vehicle</div>
                {selectedVehicle ? (
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <div style={{ width:38, height:28, borderRadius:5, overflow:'hidden', background:isDark?'#0a1120':'#d5e0ee', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                      {selectedVehicle.main_image_url ? <img src={selectedVehicle.main_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '🚗'}
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:t.amber }}>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</div>
                      <div style={{ fontSize:10, color:t.muted }}>{formatPrice(selectedVehicle.asking_price)}</div>
                    </div>
                  </div>
                ) : form.interested_vehicle_desc ? (
                  <div style={{ fontSize:12, color:t.text }}>{form.interested_vehicle_desc}</div>
                ) : <div style={{ fontSize:11, color:t.muted, fontStyle:'italic' }}>Not specified</div>}
              </div>
              <div style={{ height:1, background:t.border }} />
              {/* Details */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:t.muted }}>Source</span>
                  <span style={{ fontWeight:600, color:t.text }}>{SRC_ICON[form.source]} {SRC_LABEL[form.source]}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:t.muted }}>Assigned</span>
                  <span style={{ fontWeight:600, color:assignedPerson?t.text:t.muted }}>{assignedPerson?assignedPerson.full_name:'—'}</span>
                </div>
                {form.next_followup_date && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:t.muted }}>Follow-up</span>
                    <span style={{ fontWeight:600, color:t.text }}>{fmtDate(form.next_followup_date)}</span>
                  </div>
                )}
              </div>
              <div style={{ height:1, background:t.border }} />
              {/* Readiness checks */}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {[
                  { ok:!!form.customer_name.trim(),  label:'Customer name'     },
                  { ok:!!form.customer_phone.trim(), label:'Phone number'      },
                  { ok:!!form.assigned_to,           label:'Salesperson'       },
                  { ok:!!(selectedVehicle||form.interested_vehicle_desc), label:'Vehicle interest' },
                ].map(item=>(
                  <div key={item.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                    <span style={{ width:15, height:15, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800,
                      background:item.ok?t.accentBg:t.cardInner, border:`1px solid ${item.ok?t.accentBorder:t.border}`, color:item.ok?t.accent:t.muted }}>
                      {item.ok?'✓':'·'}
                    </span>
                    <span style={{ color:item.ok?t.text:t.muted }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Submit */}
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${t.border}`, background:isDark?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.01)' }}>
              <button type="submit" disabled={saving}
                style={{ width:'100%', background:saving?'#0a4a35':'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', borderRadius:9,
                  padding:'10px 16px', fontSize:13, fontWeight:800, cursor:saving?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  boxShadow:saving?'none':'0 4px 14px rgba(16,185,129,0.3)', transition:'all 0.15s' }}
                onMouseEnter={e=>{ if(!saving)(e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)'; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform='translateY(0)'; }}>
                {saving ? '⏳ Creating…' : '✦ Create Lead'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showBrowse && <VehicleBrowseModal onPick={pickVehicle} onClose={()=>setShowBrowse(false)} isDark={isDark} />}
    </form>
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
            {/* Column header */}
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
                  {/* Customer */}
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{ width:29, height:29, borderRadius:'50%', background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#8b5cf6', flexShrink:0 }}>
                      {lead.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:t.text }}>{lead.customer_name}</div>
                      <div style={{ fontSize:11, color:t.muted }}>{lead.customer_phone}</div>
                    </div>
                  </div>
                  {/* Vehicle */}
                  <div style={{ fontSize:12, color:t.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
                    {lead.interested_vehicle_desc || <span style={{ color:t.muted, fontStyle:'italic' }}>Not specified</span>}
                  </div>
                  {/* Source */}
                  <div style={{ fontSize:11, color:t.muted }}>{SRC_ICON[lead.source]} {SRC_LABEL[lead.source]??lead.source}</div>
                  {/* Status */}
                  <div><StatusBadge status={lead.status} /></div>
                  {/* Follow-up */}
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
                  {/* Assigned */}
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
  const [formOpen,    setFormOpen]    = useState(true);
  const [refreshKey,  setRefreshKey]  = useState(0);

  return (
    <div style={{ padding:'24px 28px 56px', background:t.pageBg, minHeight:'100%' }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:t.text, margin:'0 0 3px', letterSpacing:'-0.4px' }}>CRM Pipeline</h1>
          <p style={{ fontSize:13, color:t.muted, margin:0 }}>Add new leads and manage your existing pipeline.</p>
        </div>
      </div>

      {/* ── Add New Lead (collapsible) ── */}
      <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden', boxShadow:t.shadow, marginBottom:24 }}>
        {/* Toggle header */}
        <button
          onClick={()=>setFormOpen(o=>!o)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer',
            borderBottom: formOpen ? `1px solid ${t.border}` : 'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:t.accentBg, border:`1px solid ${t.accentBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>➕</div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:14, fontWeight:800, color:t.text }}>Add New Lead</div>
              <div style={{ fontSize:11, color:t.muted }}>Fill in customer details, vehicle interest and assign a salesperson</div>
            </div>
          </div>
          <span style={{ fontSize:12, color:t.muted, fontWeight:700, transform:formOpen?'rotate(180deg)':'none', transition:'transform 0.2s', display:'block' }}>▼</span>
        </button>

        {/* Form body */}
        {formOpen && (
          <div style={{ padding:20 }}>
            <AddLeadForm isDark={isDark} onCreated={(id)=>{ setFormOpen(false); setRefreshKey(k=>k+1); }} />
          </div>
        )}
      </div>

      {/* ── Existing Leads ── */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:t.label, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:12 }}>Existing Leads</div>
        <LeadsList isDark={isDark} refreshKey={refreshKey} />
      </div>
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