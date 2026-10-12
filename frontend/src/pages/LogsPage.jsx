import React, { useState, useEffect, useCallback } from "react";
import { LogApi } from "../api/logApi";
import { useAuth } from "../context/AuthContext";
import { ScrollText, Activity, User, Calendar, Search, X, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";

const C = {
  card:'#EEF1F0', cardBorder:'rgba(0,80,60,0.09)',
  shadow:'0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary:'#0F766E', primaryHov:'#14B8A6',
  textMain:'#1A2E2B', textSub:'#1E4A42', textMuted:'#2E6058',
  border:'rgba(0,80,60,0.12)',
  headerBg:'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};
const TH = { padding:'11px 18px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, background:'rgba(0,80,60,0.05)', borderBottom:`1px solid ${C.border}`, fontFamily:'Poppins,sans-serif' };
const TD = { padding:'13px 18px', fontSize:'0.8rem', color:C.textMain, borderBottom:`1px solid rgba(0,80,60,0.07)`, fontFamily:'Poppins,sans-serif' };
const fieldStyle = { width:'100%', padding:'9px 13px 9px 34px', borderRadius:8, border:`1px solid ${C.border}`, background:'#fff', fontSize:'0.8rem', color:C.textMain, outline:'none', fontFamily:'Poppins,sans-serif', boxSizing:'border-box' };
const labelStyle = { display:'block', fontSize:'0.68rem', fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 };

/* colour-map for the full set of audit actions */
const ACTION_META = {
  /* Auth */
  AUTH_LOGIN_SUCCESS:           { bg:'rgba(124,58,237,0.10)', color:'#7C3AED' },
  AUTH_LOGIN_FAILED:            { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  AUTH_LOGOUT:                  { bg:'rgba(100,116,139,0.10)',color:'#475569' },
  AUTH_PASSWORD_CHANGE:         { bg:'rgba(15,118,110,0.10)', color:'#0F766E' },
  AUTH_PASSWORD_CHANGE_FAILED:  { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  /* Employee */
  EMPLOYEE_CREATE:              { bg:'rgba(15,118,110,0.10)', color:'#0F766E' },
  EMPLOYEE_UPDATE:              { bg:'rgba(37,99,235,0.10)',  color:'#1D4ED8' },
  EMPLOYEE_DELETE:              { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  EMPLOYEE_STATUS_CHANGE:       { bg:'rgba(245,158,11,0.10)', color:'#B45309' },
  /* Department */
  DEPARTMENT_CREATE:            { bg:'rgba(15,118,110,0.10)', color:'#0F766E' },
  DEPARTMENT_UPDATE:            { bg:'rgba(37,99,235,0.10)',  color:'#1D4ED8' },
  DEPARTMENT_DELETE:            { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  /* Leave */
  LEAVE_REQUEST_CREATE:         { bg:'rgba(245,158,11,0.10)', color:'#B45309' },
  LEAVE_REQUEST_APPROVE:        { bg:'rgba(5,150,105,0.10)',  color:'#059669' },
  LEAVE_REQUEST_REJECT:         { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  LEAVE_REQUEST_CANCEL:         { bg:'rgba(100,116,139,0.10)',color:'#475569' },
  /* Account / User */
  CREATE_USER_ACCOUNT:          { bg:'rgba(15,118,110,0.10)', color:'#0F766E' },
  ACTIVATE_USER_ACCOUNT:        { bg:'rgba(5,150,105,0.10)',  color:'#059669' },
  DEACTIVATE_USER_ACCOUNT:      { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  CHANGE_USER_ROLE:             { bg:'rgba(37,99,235,0.10)',  color:'#1D4ED8' },
  RESET_USER_PASSWORD:          { bg:'rgba(245,158,11,0.10)', color:'#B45309' },
  /* Letters */
  LETTER_REQUEST_SUBMIT:        { bg:'rgba(99,102,241,0.10)', color:'#4F46E5' },
  LETTER_REQUEST_APPROVE:       { bg:'rgba(5,150,105,0.10)',  color:'#059669' },
  LETTER_REQUEST_REJECT:        { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  /* Attendance */
  ATTENDANCE_CLOCK_IN:          { bg:'rgba(15,118,110,0.10)', color:'#0F766E' },
  ATTENDANCE_CLOCK_OUT:         { bg:'rgba(37,99,235,0.10)',  color:'#1D4ED8' },
  ATTENDANCE_MANUAL_ENTRY:      { bg:'rgba(245,158,11,0.10)', color:'#B45309' },
  /* Generic fallback groups */
  CREATE:  { bg:'rgba(15,118,110,0.10)', color:'#0F766E' },
  UPDATE:  { bg:'rgba(37,99,235,0.10)',  color:'#1D4ED8' },
  DELETE:  { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  APPROVE: { bg:'rgba(5,150,105,0.10)',  color:'#059669' },
  REJECT:  { bg:'rgba(220,38,38,0.09)',  color:'#DC2626' },
  LOGIN:   { bg:'rgba(124,58,237,0.10)', color:'#7C3AED' },
};

const getActionMeta = (action = '') => {
  // Handle null/undefined action
  if (!action || typeof action !== 'string') {
    return { bg:'rgba(0,80,60,0.07)', color:C.textMuted };
  }
  if (ACTION_META[action]) return ACTION_META[action];
  const key = Object.keys(ACTION_META).find(k => action.includes(k));
  return key ? ACTION_META[key] : { bg:'rgba(0,80,60,0.07)', color:C.textMuted };
};

const LogsPage = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || (typeof user?.role === 'string' ? user?.role : null);
  const isSuperAdmin = roleCode === 'SUPER_ADMIN' || user?.role?.name === 'SUPER_ADMIN';

  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [actionTypes, setActionTypes] = useState([]);
  const [filters,     setFilters]     = useState({ action:'', search:'' });
  const [applied,     setApplied]     = useState({ action:'', search:'' });
  const [page,        setPage]        = useState(1);
  const [meta,        setMeta]        = useState({ total:0, totalPages:1 });
  const [selected,    setSelected]    = useState(null);

  /* fetch distinct action types from backend */
  useEffect(() => {
    LogApi.getActions()
      .then(payload => { if (Array.isArray(payload?.data)) setActionTypes(payload.data); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await LogApi.listLogs({ ...applied, page, pageSize: 50 });
      setLogs(Array.isArray(r?.data?.logs) ? r.data.logs : []);
      setMeta({ total: r?.data?.pagination?.total || 0, totalPages: r?.data?.pagination?.totalPages || 1 });
    } catch(e) {
      setError(e.message || 'Failed to load audit logs.');
      setLogs([]);
    } finally { setLoading(false); }
  }, [applied, page]);

  useEffect(() => {
    if (isSuperAdmin) {
      load();
    }
  }, [load, isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'Poppins,sans-serif' }}>
        <p style={{ fontSize: '1.1rem', color: '#DC2626', fontWeight: 600 }}>Access Denied</p>
        <p style={{ fontSize: '0.9rem', color: '#64748B' }}>Only Super Admin has access to Audit Logs.</p>
      </div>
    );
  }
  useEffect(() => { setPage(1); }, [applied]);

  const handleApply = () => { setApplied({ ...filters }); };
  const handleClear = () => { setFilters({ action:'', search:'' }); setApplied({ action:'', search:'' }); };

  /* Auto-apply search as user types (300ms debounce) */
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied(p => ({ ...p, search: filters.search }));
    }, 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  const hasFilters = applied.action || applied.search;

  return (
    <div style={{ fontFamily:'Poppins,sans-serif' }}>

      {/* Header */}
      <div style={{ background:C.headerBg, borderRadius:14, padding:'20px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22, boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>Audit Logs</h1>
          <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>
            Monitor system activities, changes and access records
          </p>
        </div>
        <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#E8F0EE' }}>
          <ScrollText size={22}/>
        </div>
      </div>

      {error && (
        <div style={{ padding:'11px 16px', borderRadius:10, marginBottom:16, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', color:'#DC2626', fontSize:'0.8rem' }}>
          {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.cardBorder}`, boxShadow:C.shadow, padding:'16px 20px', marginBottom:20 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'flex-end' }}>

          {/* Action type dropdown — populated from DB, filters immediately on change */}
          <div style={{ flex:1, minWidth:200 }}>
            <label style={labelStyle}>Action Type</label>
            <div style={{ position:'relative' }}>
              <Activity size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.textMuted, pointerEvents:'none' }}/>
              <select
                value={filters.action}
                onChange={e => {
                  const val = e.target.value;
                  setFilters(p => ({ ...p, action: val }));
                  setApplied(p => ({ ...p, action: val }));
                }}
                style={{ ...fieldStyle, cursor:'pointer', appearance:'none' }}
                onFocus={e => e.target.style.borderColor = C.primary}
                onBlur={e  => e.target.style.borderColor = C.border}
              >
                <option value="">All Actions</option>
                {actionTypes.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Free-text search */}
          <div style={{ flex:2, minWidth:240 }}>
            <label style={labelStyle}>Search</label>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.textMuted, pointerEvents:'none' }}/>
              <input
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleApply(); }}
                placeholder="Search by username, entity, action…"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = C.primary}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
              {filters.search && (
                <button type="button" onClick={() => setFilters(p => ({ ...p, search:'' }))}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.textMuted, padding:0, display:'flex' }}>
                  <X size={13}/>
                </button>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleApply}
              style={{ height:38, padding:'0 20px', borderRadius:8, border:'none', background:C.primary, color:'#fff', fontWeight:600, fontSize:'0.78rem', cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:'Poppins,sans-serif', transition:'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.primaryHov}
              onMouseLeave={e => e.currentTarget.style.background = C.primary}>
              <Search size={14}/> Search
            </button>
            {hasFilters && (
              <button onClick={handleClear}
                style={{ height:38, padding:'0 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'Poppins,sans-serif' }}>
                <X size={13}/> Clear
              </button>
            )}
            <button onClick={load}
              style={{ height:38, width:38, borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>

        {/* Active filter tags */}
        {hasFilters && (
          <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
            {applied.action && (
              <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'3px 10px', borderRadius:99, background:getActionMeta(applied.action).bg, color:getActionMeta(applied.action).color, display:'inline-flex', alignItems:'center', gap:5 }}>
                {applied.action}
                <button type="button" onClick={() => { setFilters(p=>({...p,action:''})); setApplied(p=>({...p,action:''})); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', padding:0, display:'flex', lineHeight:1 }}>×</button>
              </span>
            )}            {applied.search && (
              <span style={{ fontSize:'0.7rem', fontWeight:600, padding:'3px 10px', borderRadius:99, background:'rgba(0,80,60,0.07)', color:C.textSub, display:'inline-flex', alignItems:'center', gap:5 }}>
                "{applied.search}"
                <button type="button" onClick={() => { setFilters(p=>({...p,search:''})); setApplied(p=>({...p,search:''})); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', padding:0, display:'flex', lineHeight:1 }}>×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.cardBorder}`, boxShadow:C.shadow, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Timestamp','Action','Actor','Entity Type','Target',''].map((h,i)=>(
              <th key={i} style={{ ...TH, textAlign:i===5?'right':'left' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>Fetching audit trails…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>
                {hasFilters ? 'No logs match your filters.' : 'No logs found.'}
              </td></tr>
            ) : logs.map((log, i) => {
              const { bg, color } = getActionMeta(log.action);
              return (
                <tr key={log.uuid}
                  style={{ background:i%2===0?'transparent':'rgba(0,80,60,0.02)', cursor:'pointer' }}
                  onClick={() => setSelected(log)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,80,60,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = i%2===0?'transparent':'rgba(0,80,60,0.02)'}
                >
                  <td style={{ ...TD, color:C.textMuted, whiteSpace:'nowrap', fontSize:'0.75rem' }}>
                    {new Date(log.created_at || log.createdAt).toLocaleString()}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize:'0.68rem', fontWeight:800, padding:'3px 9px', borderRadius:6, background:bg, color, letterSpacing:'0.02em' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ ...TD, fontWeight:600 }}>
                    {log.actor_name || log.actor_username || 'System'}
                    {log.actor_mesob_id && (
                      <div style={{ fontSize:'0.68rem', color:C.primary, fontWeight:600 }}>{log.actor_mesob_id}</div>
                    )}
                  </td>
                  <td style={{ ...TD, color:C.textSub }}>{log.entity_type || '—'}</td>
                  <td style={{ ...TD, color:C.textMuted, fontFamily:'monospace', fontSize:'0.72rem' }}>
                    {log.entity_uuid ? (log.entity_uuid.length > 18 ? log.entity_uuid.slice(0,16)+'…' : log.entity_uuid) : '—'}
                  </td>
                  <td style={{ ...TD, textAlign:'right' }}><ChevronRight size={16} color={C.textMuted}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {meta.totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'16px 0' }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
            style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontSize:'0.78rem', fontWeight:600, cursor:page<=1?'not-allowed':'pointer', opacity:page<=1?0.5:1, display:'flex', alignItems:'center', gap:5, fontFamily:'Poppins,sans-serif' }}>
            <ChevronLeft size={14}/> Prev
          </button>
          <span style={{ fontSize:'0.78rem', color:C.textMuted }}>
            Page {page} of {meta.totalPages} ({meta.total.toLocaleString()} total)
          </span>
          <button onClick={() => setPage(p => Math.min(meta.totalPages, p+1))} disabled={page >= meta.totalPages}
            style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontSize:'0.78rem', fontWeight:600, cursor:page>=meta.totalPages?'not-allowed':'pointer', opacity:page>=meta.totalPages?0.5:1, display:'flex', alignItems:'center', gap:5, fontFamily:'Poppins,sans-serif' }}>
            Next <ChevronRight size={14}/>
          </button>
        </div>
      )}

      {/* ── Detail panel ── */}
      {selected && (
        <div style={{ position:'fixed', top:0, right:0, bottom:0, width:440, background:C.card, boxShadow:'-6px 0 32px rgba(0,0,0,0.15)', zIndex:1100, padding:28, overflowY:'auto', borderLeft:`1px solid ${C.cardBorder}`, fontFamily:'Poppins,sans-serif' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
            <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Event Details</h2>
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
          </div>

          {/* Action badge */}
          <div style={{ marginBottom:20 }}>
            {(() => { const { bg, color } = getActionMeta(selected.action); return (
              <span style={{ fontSize:'0.75rem', fontWeight:800, padding:'5px 14px', borderRadius:8, background:bg, color, letterSpacing:'0.03em' }}>
                {selected.action}
              </span>
            ); })()}
          </div>

          {[
            { label:'Event ID',  value: selected.uuid },
            { label:'Timestamp', value: new Date(selected.created_at || selected.createdAt).toLocaleString() },
            { label:'Actor',     value: [selected.actor_name || selected.actor_username || 'System', selected.actor_mesob_id, selected.ip_address ? `IP: ${selected.ip_address}` : null].filter(Boolean).join(' · ') },
            { label:'Entity',    value: `${selected.entity_type || '—'}: ${selected.entity_uuid || '—'}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ marginBottom:16 }}>
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:'0.82rem', color:C.textMain, wordBreak:'break-all' }}>{value}</div>
            </div>
          ))}

          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:'0.68rem', fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Changes / Metadata</div>
            <pre style={{ background:'rgba(0,80,60,0.05)', padding:14, borderRadius:10, border:`1px solid ${C.border}`, fontSize:'0.72rem', fontFamily:'monospace', overflowX:'auto', color:C.textMain, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
              {JSON.stringify(selected.diff || selected.diff_json || selected.metadata || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
