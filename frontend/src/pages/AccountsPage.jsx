import React, { useState, useEffect, useCallback } from "react";
import { AccountApi } from "../api/accountApi";
import { Users, UserPlus, Shield, UserX, UserCheck, Key, X, Eye, EyeOff } from "lucide-react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

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
const inputStyle = { width:'100%', padding:'9px 13px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card, fontSize:'0.82rem', color:C.textMain, outline:'none', fontFamily:'Poppins,sans-serif', boxSizing:'border-box' };
const labelStyle = { display:'block', fontSize:'0.72rem', fontWeight:600, color:C.textSub, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };

const GreenBtn = ({ children, onClick, type='button', disabled, style={} }) => {
  const baseBg = style.background || (disabled ? '#8AADA6' : C.primary);
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background:disabled?'#8AADA6':C.primary, color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:'0.78rem', fontWeight:600, cursor:disabled?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'Poppins,sans-serif', transition:'background 0.15s', ...style }}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background=C.primaryHov;}}
      onMouseLeave={e=>{if(!disabled)e.currentTarget.style.background=baseBg;}}
    >{children}</button>
  );
};

const Notice = ({ type, message, onClose }) => message ? (
  <div style={{ padding:'11px 16px', borderRadius:10, marginBottom:16, background:type==='error'?'rgba(220,38,38,0.08)':'rgba(15,118,110,0.1)', border:`1px solid ${type==='error'?'rgba(220,38,38,0.2)':'rgba(15,118,110,0.2)'}`, color:type==='error'?'#DC2626':C.primary, fontSize:'0.8rem', fontWeight:500, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'Poppins,sans-serif' }}>
    <span>{message}</span>
    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex' }}><X size={15}/></button>
  </div>
) : null;

const ROLES = ['EMPLOYEE','HR_OFFICER','HR_ADMIN','DEPARTMENT_HEAD','SUPER_ADMIN'];

/* ── Reset Password Modal ── */
const ResetPasswordModal = ({ account, onClose, showMsg }) => {
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = async () => {
    if (!newPwd.trim()) { showMsg('error','New password is required.'); return; }
    if (newPwd.length < 8) { showMsg('error','Password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { showMsg('error','Passwords do not match.'); return; }
    setSaving(true);
    try {
      await AccountApi.resetPassword(account.uuid, newPwd);
      setResetDone(true);
    } catch(e) { showMsg('error', e.message||'Failed to reset password.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:420, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.cardBorder}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h2 style={{ margin:0, fontSize:'1.05rem', fontWeight:700, color:C.textMain }}>Reset Password</h2>
            <p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:C.textMuted }}>
              For: <strong>{account.employee_name || account.username}</strong> (@{account.username})
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>

        {resetDone ? (
          <div>
            <div style={{ padding:'16px', borderRadius:10, background:'rgba(15,118,110,0.08)', border:`1px solid rgba(15,118,110,0.2)`, marginBottom:20 }}>
              <p style={{ margin:0, fontSize:'0.85rem', color:C.primary, fontWeight:600 }}>✓ Password reset successfully!</p>
              <p style={{ margin:'8px 0 0', fontSize:'0.8rem', color:C.textSub }}>
                The new password has been set. Please share it securely with the user.
              </p>
              <div style={{ marginTop:12, padding:'10px 14px', background:'#fff', borderRadius:8, border:`1px solid ${C.border}`, fontFamily:'monospace', fontSize:'0.9rem', fontWeight:700, color:C.textMain, letterSpacing:1 }}>
                {newPwd}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <GreenBtn onClick={onClose}>Done</GreenBtn>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={labelStyle}>New Password *</label>
              <div style={{ position:'relative' }}>
                <input type={showNew?'text':'password'} value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Min 8 characters" style={{ ...inputStyle, paddingRight:38 }}
                  onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
                <button type="button" onClick={()=>setShowNew(v=>!v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex', padding:0 }}>
                  {showNew ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confirm Password *</label>
              <div style={{ position:'relative' }}>
                <input type={showConfirm?'text':'password'} value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} placeholder="Repeat new password" style={{ ...inputStyle, paddingRight:38 }}
                  onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
                <button type="button" onClick={()=>setShowConfirm(v=>!v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex', padding:0 }}>
                  {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {confirmPwd && newPwd !== confirmPwd && (
                <p style={{ margin:'4px 0 0', fontSize:'0.7rem', color:'#dc2626' }}>Passwords do not match</p>
              )}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
              <GreenBtn onClick={handleReset} disabled={saving || !newPwd || newPwd !== confirmPwd}>
                {saving ? 'Resetting…' : 'Reset Password'}
              </GreenBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Create Account Modal ── */
const CreateAccountModal = ({ onClose, onCreated, showMsg, existingAccounts = [] }) => {
  const [mesobSearch, setMesobSearch]     = useState('');
  const [empResults,  setEmpResults]      = useState([]);
  const [searching,   setSearching]       = useState(false);
  const [dropOpen,    setDropOpen]        = useState(false);
  const [selectedEmp, setSelectedEmp]     = useState(null);
  const [username,    setUsername]        = useState('');
  const [password,    setPassword]        = useState('');
  const [showPwd,     setShowPwd]         = useState(false);
  const [role,        setRole]            = useState('EMPLOYEE');
  const [saving,      setSaving]          = useState(false);
  const dropRef = React.useRef(null);

  /* close dropdown on outside click */
  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* search employees by mesob_id as user types */
  useEffect(() => {
    if (!mesobSearch.trim()) { setEmpResults([]); return; }
    setSearching(true);
    const token = localStorage.getItem('authToken');
    const timer = setTimeout(() => {
      fetch(`/api/employees?search=${encodeURIComponent(mesobSearch.trim())}&status=ACTIVE&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(payload => {
          const list = payload?.data || [];
          setEmpResults(list);
          setDropOpen(list.length > 0);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [mesobSearch]);

  /* when employee selected — auto-fill username and role */
  const handleSelectEmp = (emp) => {
    setSelectedEmp(emp);
    setMesobSearch(emp.mesob_id);
    setDropOpen(false);

    // Ethiopian naming: first_name = Abel, middle_name = Kebede (father's name)
    // Username format: abelkebede@mesob.et
    const first  = (emp.first_name  || '').toLowerCase().replace(/\s+/g, '');
    const father = (emp.middle_name || emp.last_name || '').toLowerCase().replace(/\s+/g, '');
    setUsername(`${first}${father}@mesob.et`);

    // Auto-fill role: look up from existing accounts by employee_uuid
    const existingAcc = existingAccounts.find(a => a.employee_uuid === emp.uuid);
    setRole(existingAcc?.role || 'EMPLOYEE');
  };

  /* password validation rules */
  const pwdRules = [
    { label: 'At least 12 characters',          met: password.length >= 12 },
    { label: 'At least one uppercase letter',    met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter',    met: /[a-z]/.test(password) },
    { label: 'At least one number',              met: /[0-9]/.test(password) },
    { label: 'At least one symbol (!@#$…)',      met: /[^A-Za-z0-9]/.test(password) },
  ];
  const pwdOk = pwdRules.every(r => r.met);

  const pwdStrength = () => {
    if (!password) return null;
    const score = pwdRules.filter(r => r.met).length;
    if (score <= 1) return { label:'Weak',   color:'#DC2626', w:'20%'  };
    if (score === 2) return { label:'Fair',   color:'#D97706', w:'40%'  };
    if (score === 3) return { label:'Good',   color:'#0F766E', w:'65%'  };
    if (score === 4) return { label:'Almost', color:'#059669', w:'85%'  };
    return              { label:'Strong', color:'#059669', w:'100%' };
  };
  const strength = pwdStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmp) { showMsg('error', 'Please select an employee by Mesob ID.'); return; }
    if (!pwdOk) { showMsg('error', 'Password must be at least 12 characters with uppercase, number, and symbol.'); return; }
    setSaving(true);
    try {
      await AccountApi.createAccount({ employee_uuid: selectedEmp.uuid, username, password, role });
      showMsg('success', 'Account created successfully.');
      onCreated();
    } catch(err) { showMsg('error', err.message || 'Failed to create account.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:480, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.cardBorder}`, maxHeight:'92vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ margin:0, fontSize:'1.05rem', fontWeight:700, color:C.textMain }}>Create User Account</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Mesob ID search ── */}
          <div style={{ marginBottom:14, position:'relative' }} ref={dropRef}>
            <label style={labelStyle}>Employee Mesob ID *</label>
            <div style={{ position:'relative' }}>
              <input
                value={mesobSearch}
                onChange={e => { setMesobSearch(e.target.value); setSelectedEmp(null); }}
                placeholder="Type Mesob ID (e.g. mes-001)"
                required
                style={{ ...inputStyle, paddingRight: searching ? 36 : 12 }}
                onFocus={e => { e.target.style.borderColor = C.primary; if (empResults.length) setDropOpen(true); }}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
              {searching && (
                <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:'0.7rem', color:C.textMuted }}>…</span>
              )}
            </div>
            {/* selected badge */}
            {selectedEmp && (
              <div style={{ marginTop:6, padding:'7px 12px', borderRadius:8, background:'rgba(15,118,110,0.08)', border:`1px solid ${C.primary}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <span style={{ fontSize:'0.8rem', fontWeight:700, color:C.primary }}>{selectedEmp.mesob_id}</span>
                  <span style={{ fontSize:'0.75rem', color:C.textMain, marginLeft:8 }}>
                    {[selectedEmp.first_name, selectedEmp.middle_name, selectedEmp.last_name].filter(Boolean).join(' ')}
                  </span>
                </div>
                <button type="button" onClick={() => { setSelectedEmp(null); setMesobSearch(''); setUsername(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, fontSize:'0.7rem', fontWeight:600 }}>✕</button>
              </div>
            )}
            {/* dropdown results */}
            {dropOpen && empResults.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9999, background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', maxHeight:220, overflowY:'auto', marginTop:2 }}>
                {empResults.map(emp => (
                  <button key={emp.uuid} type="button"
                    onMouseDown={() => handleSelectEmp(emp)}
                    style={{ width:'100%', padding:'9px 14px', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.8rem', color:C.textMain }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight:700, color:C.primary, marginRight:10 }}>{emp.mesob_id}</span>
                    <span style={{ flex:1, color:C.textMain }}>{[emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ')}</span>
                  </button>
                ))}
              </div>
            )}
            {dropOpen && empResults.length === 0 && !searching && mesobSearch && (
              <p style={{ margin:'4px 0 0', fontSize:'0.72rem', color:C.textMuted }}>No active employees found for "{mesobSearch}"</p>
            )}
          </div>

          {/* ── Username ── */}
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Username *</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. abelkebede@mesob.et"
              required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e  => e.target.style.borderColor = C.border}
            />
          </div>

          {/* ── Password ── */}
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Initial Password *</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 12 chars, uppercase, number, symbol"
                required
                style={{ ...inputStyle, paddingRight:38 }}
                onFocus={e => e.target.style.borderColor = C.primary}
                onBlur={e  => e.target.style.borderColor = C.border}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex', padding:0 }}>
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {/* strength bar */}
            {password && strength && (
              <div style={{ marginTop:6 }}>
                <div style={{ height:4, borderRadius:99, background:'rgba(0,0,0,0.08)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:strength.w, background:strength.color, borderRadius:99, transition:'width 0.3s' }}/>
                </div>
                <span style={{ fontSize:'0.65rem', color:strength.color, fontWeight:600 }}>{strength.label}</span>
              </div>
            )}
            {/* live validation checklist */}
            {password && (
              <div style={{ marginTop:8, padding:'10px 14px', background:'rgba(0,0,0,0.03)', borderRadius:8, border:`1px solid ${C.border}` }}>
                {pwdRules.map(rule => (
                  <div key={rule.label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, lineHeight:1 }}>
                    <span style={{ fontSize:'0.75rem', fontWeight:700, color: rule.met ? '#059669' : '#DC2626', flexShrink:0 }}>
                      {rule.met ? '✓' : '✗'}
                    </span>
                    <span style={{ fontSize:'0.72rem', color: rule.met ? '#059669' : '#DC2626', textDecoration: rule.met ? 'line-through' : 'none', opacity: rule.met ? 0.7 : 1 }}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Role ── */}
          <div style={{ marginBottom:22 }}>
            <label style={labelStyle}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
            </select>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving || !selectedEmp || !pwdOk}>
              {saving ? 'Creating…' : 'Create Account'}
            </GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type:'', message:'' });
  const [showCreate, setShowCreate] = useState(false);
  const [resetAccount, setResetAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const showMsg = (type, message) => { setNotice({ type, message }); setTimeout(()=>setNotice({type:'',message:''}),5000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const r = await AccountApi.listAccounts(); 
      setAccounts(Array.isArray(r?.data) ? r.data : []); 
    }
    catch(e) { 
      console.error('Failed to load accounts:', e);
      showMsg('error', e.message||'Failed to load accounts.'); 
      setAccounts([]);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    const newStatus = confirmToggle.is_active ? 'INACTIVE' : 'ACTIVE';
    try {
      await AccountApi.changeStatus(confirmToggle.uuid, newStatus);
      showMsg('success', `Account ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
      load();
    } catch(e) { showMsg('error', e.message||'Failed to update status.'); }
    finally { setConfirmToggle(null); }
  };

  const toggleStatus = (acc) => {
    setConfirmToggle(acc);
  };

  const handleCreate = async () => {
    // handled by CreateAccountModal
  };

  const roleColor = (role) => {
    const m = { SUPER_ADMIN:['rgba(124,58,237,0.1)','#7C3AED'], HR_ADMIN:['rgba(245,158,11,0.1)','#B45309'], HR_OFFICER:['rgba(37,99,235,0.1)','#1D4ED8'], DEPARTMENT_HEAD:['rgba(15,118,110,0.1)',C.primary], EMPLOYEE:['rgba(0,80,60,0.07)',C.textMuted] };
    return m[role] || m.EMPLOYEE;
  };

  return (
    <div style={{ fontFamily:'Poppins,sans-serif' }}>
      <Notice type={notice.type} message={notice.message} onClose={()=>setNotice({type:'',message:''})} />

      {/* Header */}
      <div style={{ background:C.headerBg, borderRadius:14, padding:'20px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22, boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>User Accounts</h1>
          <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>Manage system access, roles and security</p>
        </div>
        <GreenBtn onClick={()=>setShowCreate(true)} style={{ background:'#E8F0EE', color:C.primary }}>
          <UserPlus size={15}/> Create Account
        </GreenBtn>
      </div>

      {/* Table */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.cardBorder}`, boxShadow:C.shadow, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Full Name / Mesob ID','Role','Status','Last Login','Actions'].map((h,i)=>(
                <th key={h} style={{ ...TH, textAlign:i===4?'right':'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>Loading accounts…</td></tr>
            ) : accounts.length===0 ? (
              <tr><td colSpan={5} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>No user accounts found.</td></tr>
            ) : accounts.map((acc,i) => {
              const [rbg, rc] = roleColor(acc.role);
              return (
                <tr key={acc.uuid} style={{ background:i%2===0?'transparent':'rgba(0,80,60,0.02)' }}>
                  <td style={TD}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#14B8A6,#0F766E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, color:'white', flexShrink:0 }}>
                        {(acc.employee_name||acc.username||'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:'0.82rem', fontWeight:600, color:C.textMain }}>
                          {acc.employee_name || 'Unknown Employee'}
                        </div>
                        {acc.mesob_id && (
                          <div style={{ fontSize:'0.7rem', color:C.primary, fontWeight:600 }}>{acc.mesob_id}</div>
                        )}
                        <div style={{ fontSize:'0.72rem', color:C.textMuted }}>@{acc.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={TD}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:rbg, color:rc, fontSize:'0.68rem', fontWeight:700 }}>
                      <Shield size={11}/> {acc.role}
                    </span>
                  </td>
                  <td style={TD}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, color:acc.is_active?'#059669':'#DC2626', fontSize:'0.78rem', fontWeight:600 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:acc.is_active?'#059669':'#DC2626' }}/>
                      {acc.is_active?'ACTIVE':'INACTIVE'}
                    </div>
                  </td>
                  <td style={{ ...TD, color:C.textMuted }}>{acc.last_login?new Date(acc.last_login).toLocaleString():'Never'}</td>
                  <td style={{ ...TD, textAlign:'right' }}>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:4 }}>
                      {/* Activate / Deactivate */}
                      <button
                        onClick={()=>toggleStatus(acc)}
                        title={acc.is_active?'Deactivate':'Activate'}
                        style={{ background:'none', border:'none', cursor:'pointer', color:acc.is_active?'#DC2626':C.primary, padding:6, borderRadius:6, display:'flex' }}>
                        {acc.is_active ? <UserX size={16}/> : <UserCheck size={16}/>}
                      </button>
                      {/* Reset Password */}
                      <button
                        onClick={()=>setResetAccount(acc)}
                        title="Reset Password"
                        style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, padding:6, borderRadius:6, display:'flex' }}>
                        <Key size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Account Modal */}
      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
          showMsg={showMsg}
          existingAccounts={accounts}
        />
      )}

      {/* Reset Password Modal */}
      {resetAccount && (
        <ResetPasswordModal
          account={resetAccount}
          onClose={() => setResetAccount(null)}
          showMsg={showMsg}
        />
      )}
      
      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={handleToggleStatus}
        variant="warning"
        title={`${confirmToggle?.is_active ? 'Deactivate' : 'Activate'} account?`}
        description={`Are you sure you want to ${confirmToggle?.is_active ? 'deactivate' : 'activate'} the account for @${confirmToggle?.username}?`}
        confirmText={confirmToggle?.is_active ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
      />
    </div>
  );
};

export default AccountsPage;
