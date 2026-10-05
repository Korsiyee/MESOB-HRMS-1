import React, { useState, useEffect } from "react";
import { AuthApi } from "../api/authApi";
import { User, Lock, Save, KeyRound, X } from "lucide-react";
import Avatar from "../components/common/Avatar";

const C = {
  card:'#EEF1F0', cardBorder:'rgba(0,80,60,0.09)',
  shadow:'0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary:'#0F766E', primaryHov:'#14B8A6',
  textMain:'#1A2E2B', textSub:'#1E4A42', textMuted:'#2E6058',
  border:'rgba(0,80,60,0.12)',
  headerBg:'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const fieldStyle = { width:'100%', padding:'10px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card, fontSize:'0.82rem', color:C.textMain, outline:'none', fontFamily:'Poppins,sans-serif', boxSizing:'border-box', transition:'border 0.2s' };
const labelStyle = { display:'block', fontSize:'0.72rem', fontWeight:600, color:C.textSub, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' };

const Notice = ({ type, message, onClose }) => message ? (
  <div style={{ padding:'11px 16px', borderRadius:10, marginBottom:16, background:type==='error'?'rgba(220,38,38,0.08)':'rgba(15,118,110,0.1)', border:`1px solid ${type==='error'?'rgba(220,38,38,0.2)':'rgba(15,118,110,0.2)'}`, color:type==='error'?'#DC2626':C.primary, fontSize:'0.8rem', fontWeight:500, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'Poppins,sans-serif' }}>
    <span>{message}</span>
    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex' }}><X size={15}/></button>
  </div>
) : null;

const MyAccountPage = () => {
  const [user, setUser] = useState(AuthApi.getStoredUser());
  const [empInfo, setEmpInfo] = useState(null);
  const [passwords, setPasswords] = useState({ current:'', newPwd:'', confirm:'' });
  const [notice, setNotice] = useState({ type:'', message:'' });
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  /* Fetch fresh user data on mount */
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await AuthApi.getCurrentUser();
        if (response.data) {
          localStorage.setItem('user', JSON.stringify(response.data));
          setUser(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
        setUser(AuthApi.getStoredUser());
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentUser();
  }, []);

  /* Fetch employee record to get mesob_id + full name */
  useEffect(() => {
    if (!user?.employee_uuid) return;
    const token = localStorage.getItem('authToken');
    fetch(`/api/employees/${encodeURIComponent(user.employee_uuid)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(payload => { if (payload?.data) setEmpInfo(payload.data); })
      .catch(() => {});
  }, [user?.employee_uuid]);

  const showMsg = (type, message) => { setNotice({ type, message }); setTimeout(()=>setNotice({type:'',message:''}),4500); };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.newPwd !== passwords.confirm) { showMsg('error','New passwords do not match.'); return; }
    if (passwords.newPwd.length < 8) { showMsg('error','Password must be at least 8 characters.'); return; }
    setUpdating(true);
    try {
      await AuthApi.changePassword(passwords.current, passwords.newPwd);
      showMsg('success','Password updated successfully.');
      setPasswords({ current:'', newPwd:'', confirm:'' });
      try {
        const response = await AuthApi.getCurrentUser();
        if (response.data) { localStorage.setItem('user', JSON.stringify(response.data)); setUser(response.data); }
      } catch { /* ignore refresh error */ }
    } catch(err) { showMsg('error', err.message||'Failed to update password.'); }
    finally { setUpdating(false); }
  };

  /* Build display values — full name from employee record */
  const fullName = empInfo
    ? [empInfo.first_name, empInfo.middle_name, empInfo.last_name].filter(Boolean).join(' ')
    : (user?.full_name || user?.username || 'Admin');
  const mesobId = empInfo?.mesob_id || user?.mesob_id || '—';

  // Dynamic role color based on role string (no hardcoded map)
  const roleColor = (role) => {
    if (!role) return ['rgba(0,80,60,0.08)', C.textMuted];
    const normalized = role.toLowerCase();
    if (normalized.includes('super') || normalized.includes('admin')) {
      return ['rgba(124,58,237,0.15)', '#7C3AED'];
    }
    if (normalized.includes('hr')) {
      return ['rgba(245,158,11,0.12)', '#B45309'];
    }
    if (normalized.includes('head') || normalized.includes('manager')) {
      return ['rgba(15,118,110,0.12)', C.primary];
    }
    return ['rgba(0,80,60,0.08)', C.textMuted];
  };
  const [rbg, rc] = roleColor(user?.role);

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', maxWidth:860, margin:'0 auto' }}>
      <Notice type={notice.type} message={notice.message} onClose={()=>setNotice({type:'',message:''})} />

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.textMuted, fontSize:'0.9rem' }}>
          Loading profile...
        </div>
      ) : (
        <>
          {/* Profile banner */}
          <div style={{ background:C.headerBg, borderRadius:14, padding:'28px 32px', marginBottom:24, boxShadow:'0 4px 20px rgba(0,0,0,0.18)', display:'flex', alignItems:'center', gap:24, position:'relative', overflow:'hidden' }}>
            <Avatar
              imageUrl={user?.profile_photo_url}
              name={fullName}
              size={72}
              borderColor="rgba(52,211,153,0.6)"
              borderWidth="3px"
              style={{ boxShadow: '0 0 20px rgba(52,211,153,0.4)', zIndex: 1 }}
            />
            <div style={{ zIndex:1 }}>
              <h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>{fullName}</h1>
              {mesobId && mesobId !== '—' && (
                <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'#14B8A6', fontWeight:600 }}>{mesobId}</p>
              )}
              <p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>System Account Information</p>
              <span style={{ display:'inline-block', marginTop:8, padding:'3px 12px', borderRadius:99, background:'rgba(255,255,255,0.12)', color:'#E8F0EE', fontSize:'0.7rem', fontWeight:700, letterSpacing:0.5 }}>
                {(user?.role||'EMPLOYEE').replace(/_/g,' ')}
              </span>
            </div>
            <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:20 }}>

            {/* Profile details card */}
            <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.cardBorder}`, boxShadow:C.shadow, padding:24, height:'fit-content' }}>
              <h3 style={{ margin:'0 0 20px', fontSize:'0.9rem', fontWeight:700, color:C.textMain, display:'flex', alignItems:'center', gap:8 }}>
                <User size={16} color={C.primary}/> Profile Details
              </h3>
              {[
                { label:'Username',  value:`@${user?.username||'N/A'}` },
                { label:'Full Name', value: fullName },
                { label:'Mesob ID',  value: mesobId },
                { label:'Email',     value: user?.email||'N/A' },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{ marginBottom:i===arr.length-1?0:18 }}>
                  <label style={labelStyle}>{label}</label>
                  <div style={{ fontSize:'0.82rem', fontWeight:500, color:C.textMain }}>{value}</div>
                </div>
              ))}
              <div style={{ marginTop:18 }}>
                <label style={labelStyle}>Role</label>
                <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:99, background:rbg, color:rc, fontSize:'0.72rem', fontWeight:700 }}>
                  {(user?.role||'EMPLOYEE').replace(/_/g,' ')}
                </span>
              </div>
            </div>

            {/* Change password card */}
            <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.cardBorder}`, boxShadow:C.shadow, padding:24 }}>
              <h3 style={{ margin:'0 0 20px', fontSize:'0.9rem', fontWeight:700, color:C.textMain, display:'flex', alignItems:'center', gap:8 }}>
                <Lock size={16} color={C.primary}/> Change Password
              </h3>
              <form onSubmit={handlePasswordUpdate}>
                <div style={{ marginBottom:14 }}>
                  <label style={labelStyle}>Current Password</label>
                  <input type="password" value={passwords.current} onChange={e=>setPasswords(p=>({...p,current:e.target.value}))} required style={fieldStyle}
                    onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:22 }}>
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <input type="password" value={passwords.newPwd} onChange={e=>setPasswords(p=>({...p,newPwd:e.target.value}))} required style={fieldStyle}
                      onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <input type="password" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))} required style={fieldStyle}
                      onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                </div>
                <button type="submit" disabled={updating} style={{ padding:'10px 22px', borderRadius:8, background:updating?'#8AADA6':C.primary, color:'#fff', border:'none', fontWeight:600, fontSize:'0.78rem', cursor:updating?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:8, fontFamily:'Poppins,sans-serif', transition:'background 0.15s' }}
                  onMouseEnter={e=>{ if(!updating) e.currentTarget.style.background=C.primaryHov; }}
                  onMouseLeave={e=>{ if(!updating) e.currentTarget.style.background=C.primary; }}>
                  {updating?'Updating…':<><Save size={15}/> Update Password</>}
                </button>
              </form>

              <div style={{ marginTop:24, padding:'12px 16px', background:'rgba(245,158,11,0.08)', borderRadius:10, border:'1px solid rgba(245,158,11,0.2)', display:'flex', gap:10 }}>
                <KeyRound size={18} color='#B45309' style={{ flexShrink:0, marginTop:1 }}/>
                <p style={{ margin:0, fontSize:'0.75rem', color:'#92400E', lineHeight:1.6 }}>
                  <strong>Security Tip:</strong> Use a strong, unique password with at least 12 characters including uppercase letters, numbers and symbols.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MyAccountPage;
