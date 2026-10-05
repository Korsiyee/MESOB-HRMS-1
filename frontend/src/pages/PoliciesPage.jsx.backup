import React, { useState, useEffect, useCallback } from 'react';
import { PolicyApi } from '../api/policyApi';
import { Shield, Pencil, X, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const C = { card:'#EEF1F0', border:'rgba(0,80,60,0.09)', shadow:'0 2px 12px rgba(0,60,45,0.07)', primary:'#0F766E', primaryHov:'#14B8A6', textMain:'#1A2E2B', textSub:'#1E4A42', textMuted:'#2E6058', headerBg:'linear-gradient(135deg,#0c1e1c,#1e3a37)' };
const TH = { padding:'11px 16px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, background:'rgba(0,80,60,0.05)', borderBottom:`1px solid ${C.border}`, fontFamily:'Poppins,sans-serif' };
const TD = { padding:'12px 16px', fontSize:'0.8rem', color:C.textMain, borderBottom:`1px solid rgba(0,80,60,0.07)`, fontFamily:'Poppins,sans-serif' };
const field = { width:'100%', padding:'9px 13px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card, fontSize:'0.82rem', color:C.textMain, outline:'none', fontFamily:'Poppins,sans-serif', boxSizing:'border-box' };
const lbl = { display:'block', fontSize:'0.72rem', fontWeight:600, color:C.textSub, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };

const GreenBtn = ({children,onClick,disabled,type='button',style={}}) => {
  const baseBg = style.background || (disabled ? '#8AADA6' : C.primary);
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background:disabled?'#8AADA6':C.primary, color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:'0.78rem', fontWeight:600, cursor:disabled?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'Poppins,sans-serif', transition:'background 0.15s', ...style }}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background=C.primaryHov;}}
      onMouseLeave={e=>{if(!disabled)e.currentTarget.style.background=baseBg;}}
    >{children}</button>
  );
};

const Notice = ({type,message,onClose}) => message?(
  <div style={{ padding:'11px 16px', borderRadius:10, marginBottom:16, background:type==='error'?'rgba(220,38,38,0.08)':'rgba(15,118,110,0.1)', border:`1px solid ${type==='error'?'rgba(220,38,38,0.2)':'rgba(15,118,110,0.2)'}`, color:type==='error'?'#DC2626':C.primary, fontSize:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'Poppins,sans-serif' }}>
    <span>{message}</span><button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex' }}><X size={15}/></button>
  </div>
):null;

const AddModal = ({onClose, onSaved, showMsg}) => {
  const [form, setForm] = useState({ leaveType:'', baseDays:0, incrementPerYear:0, maxDays:0, eligibilityMonths:0, useBudgetYear:true });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leaveType.trim()) { showMsg('error','Leave type is required.'); return; }
    setSaving(true);
    try {
      await PolicyApi.create({ leaveType:form.leaveType, baseDays:Number(form.baseDays), incrementPerYear:Number(form.incrementPerYear), maxDays:Number(form.maxDays), eligibilityMonths:Number(form.eligibilityMonths), useBudgetYear:Boolean(form.useBudgetYear) });
      showMsg('success','Policy created successfully.'); onSaved();
    } catch(err) { showMsg('error', err.message||'Failed to create policy.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:520, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Add New Policy</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Leave Type *</label>
            <input value={form.leaveType} onChange={e=>set('leaveType',e.target.value)} required style={field} placeholder="e.g. Bereavement, Study" onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {[['Base Days','baseDays'],['Increment/Year','incrementPerYear'],['Max Days','maxDays'],['Eligibility Months','eligibilityMonths']].map(([l,k])=>(
              <div key={k}><label style={lbl}>{l}</label><input type="number" value={form[k]} onChange={e=>set(k,e.target.value)} required style={field} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            ))}
          </div>
          <div style={{ marginBottom:22, display:'flex', alignItems:'center', gap:10 }}>
            <input type="checkbox" id="uby-add" checked={Boolean(form.useBudgetYear)} onChange={e=>set('useBudgetYear',e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }}/>
            <label htmlFor="uby-add" style={{ fontSize:'0.82rem', color:C.textSub, cursor:'pointer' }}>Use Budget Year</label>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving?'Creating…':'Create Policy'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditModal = ({policy, onClose, onSaved, showMsg}) => {
  const [form, setForm] = useState({ baseDays:policy.baseDays, incrementPerYear:policy.incrementPerYear, maxDays:policy.maxDays, eligibilityMonths:policy.eligibilityMonths, useBudgetYear:policy.useBudgetYear });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await PolicyApi.update(policy.leaveType, { baseDays:Number(form.baseDays), incrementPerYear:Number(form.incrementPerYear), maxDays:Number(form.maxDays), eligibilityMonths:Number(form.eligibilityMonths), useBudgetYear:Boolean(form.useBudgetYear) });
      showMsg('success','Policy updated.'); onSaved();
    } catch(err) { showMsg('error', err.message||'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:440, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Edit — {policy.leaveType} Policy</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {[['Base Days','baseDays'],['Increment/Year','incrementPerYear'],['Max Days','maxDays'],['Eligibility Months','eligibilityMonths']].map(([l,k])=>(
              <div key={k}><label style={lbl}>{l}</label><input type="number" value={form[k]} onChange={e=>set(k,e.target.value)} required style={field} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            ))}
          </div>
          <div style={{ marginBottom:22, display:'flex', alignItems:'center', gap:10 }}>
            <input type="checkbox" id="uby" checked={Boolean(form.useBudgetYear)} onChange={e=>set('useBudgetYear',e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }}/>
            <label htmlFor="uby" style={{ fontSize:'0.82rem', color:C.textSub, cursor:'pointer' }}>Use Budget Year</label>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving?'Saving…':'Update Policy'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

const PoliciesPage = () => {
  const [policies, setPolicies] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [notice,   setNotice]   = useState({type:'',message:''});
  const [editPol,  setEditPol]  = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [deleting, setDeleting] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showMsg = (type,message) => { setNotice({type,message}); setTimeout(()=>setNotice({type:'',message:''}),4500); };
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await PolicyApi.list(); setPolicies(r?.data||[]); }
    catch(e) { showMsg('error',e.message||'Failed to load policies.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete);
    try {
      await PolicyApi.delete(confirmDelete);
      showMsg('success','Policy deleted.');
      load();
    } catch(e) { showMsg('error',e.message||'Failed to delete policy.'); }
    finally { setDeleting(''); setConfirmDelete(null); }
  };

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', gap:20 }}>
      <Notice type={notice.type} message={notice.message} onClose={()=>setNotice({type:'',message:''})}/>
      <div style={{ background:C.headerBg, borderRadius:14, padding:'20px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <div><h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>Leave Policies</h1><p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>Configure entitlement rules per leave type</p></div>
        <GreenBtn onClick={()=>setShowAdd(true)} style={{ background:'#E8F0EE', color:C.primary }}><Plus size={15}/> Add Policy</GreenBtn>
      </div>
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['Leave Type','Base Days','Increment/Year','Max Days','Eligibility (months)','Budget Year','Actions'].map((h,i)=><th key={h} style={{ ...TH, textAlign:i===6?'right':'left' }}>{h}</th>)}</tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>Loading…</td></tr>
            :policies.length===0?<tr><td colSpan={7} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>No policies found.</td></tr>
            :policies.map((p,i)=>(
              <tr key={p.leaveType||i} style={{ background:i%2===0?'transparent':'rgba(0,80,60,0.02)' }}>
                <td style={TD}><div style={{ display:'flex', alignItems:'center', gap:10 }}><div style={{ width:32, height:32, borderRadius:8, background:'rgba(15,118,110,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={14} color={C.primary}/></div><span style={{ fontWeight:700 }}>{p.leaveType}</span></div></td>
                <td style={{ ...TD, textAlign:'center' }}>{p.baseDays}</td>
                <td style={{ ...TD, textAlign:'center' }}>{p.incrementPerYear}</td>
                <td style={{ ...TD, textAlign:'center' }}>{p.maxDays}</td>
                <td style={{ ...TD, textAlign:'center' }}>{p.eligibilityMonths}</td>
                <td style={{ ...TD, textAlign:'center' }}><span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.68rem', fontWeight:700, background:p.useBudgetYear?'rgba(15,118,110,0.1)':'rgba(0,80,60,0.06)', color:p.useBudgetYear?C.primary:C.textMuted }}>{p.useBudgetYear?'Yes':'No'}</span></td>
                <td style={{ ...TD, textAlign:'right' }}>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:4 }}>
                    <button onClick={()=>setEditPol(p)} style={{ background:'none', border:'none', cursor:'pointer', color:C.primary, padding:5, borderRadius:6, display:'flex' }}><Pencil size={15}/></button>
                    <button onClick={()=>setConfirmDelete(p.leaveType)} disabled={deleting===p.leaveType} style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:5, borderRadius:6, display:'flex', opacity:deleting===p.leaveType?0.4:1 }}><Trash2 size={15}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);load();}} showMsg={showMsg}/>}
      {editPol && <EditModal policy={editPol} onClose={()=>setEditPol(null)} onSaved={()=>{setEditPol(null);load();}} showMsg={showMsg}/>}
      
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        variant="delete"
        title={`Delete "${confirmDelete}" policy?`}
        description="This action cannot be undone. All leave requests using this policy will be affected."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default PoliciesPage;
