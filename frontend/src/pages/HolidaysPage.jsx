import React, { useState, useEffect, useCallback } from 'react';
import { HolidayApi } from '../api/holidayApi';
import { Palmtree, Plus, Pencil, Trash2, X, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import PrettyDatePicker from '../components/PrettyDatePicker';
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

const TYPE_COLORS = {
  PUBLIC:    ['rgba(15,118,110,0.1)','#0F766E'],
  NATIONAL:  ['rgba(15,118,110,0.1)','#0F766E'],
  RELIGIOUS: ['rgba(245,158,11,0.1)','#B45309'],
  SPECIAL:   ['rgba(37,99,235,0.1)','#1D4ED8'],
  ETHIOPIAN: ['rgba(124,58,237,0.1)','#7C3AED'],
  GREGORIAN: ['rgba(5,150,105,0.1)','#059669'],
};

const TYPES = ['PUBLIC','NATIONAL','RELIGIOUS','SPECIAL','ETHIOPIAN','GREGORIAN'];

const HolidayModal = ({holiday, onClose, onSaved, showMsg}) => {
  const editing = !!holiday?.uuid;
  const [form, setForm] = useState({
    date: holiday?.gregorianDate||holiday?.holidayDate||holiday?.date||'',
    name: holiday?.name||holiday?.holidayName||'',
    type: holiday?.type||holiday?.calendarType||'PUBLIC',
    calendarYear: holiday?.calendarYear||'',
    isActive: holiday?.is_active!==false && holiday?.is_active!==0,
    description: holiday?.description||'',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) {
        await HolidayApi.update(holiday.uuid, { name:form.name, type:form.type, calendarYear:form.calendarYear, isActive:form.isActive, description:form.description });
        showMsg('success','Holiday updated.');
      } else {
        await HolidayApi.create({ date:form.date, name:form.name, type:form.type, calendarYear:form.calendarYear, isActive:form.isActive, description:form.description });
        showMsg('success','Holiday created.');
      }
      onSaved();
    } catch(err) { showMsg('error', err.message||'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:460, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}`, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>{editing?'Edit Holiday':'Add Holiday'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          {!editing && <div style={{ marginBottom:14 }}><label style={lbl}>Date *</label><PrettyDatePicker value={form.date} onChange={v=>set('date',v)}/></div>}
          <div style={{ marginBottom:14 }}><label style={lbl}>Holiday Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} required style={field} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div><label style={lbl}>Type *</label><select value={form.type} onChange={e=>set('type',e.target.value)} style={{ ...field, cursor:'pointer' }}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={lbl}>Calendar Year</label><input value={form.calendarYear} onChange={e=>set('calendarYear',e.target.value)} placeholder="e.g. 2018" style={field} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
          </div>
          <div style={{ marginBottom:14 }}><label style={lbl}>Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} style={{ ...field, resize:'vertical' }} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
          <div style={{ marginBottom:22, display:'flex', alignItems:'center', gap:10 }}>
            <input type="checkbox" id="hactive" checked={form.isActive} onChange={e=>set('isActive',e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }}/>
            <label htmlFor="hactive" style={{ fontSize:'0.82rem', color:C.textSub, cursor:'pointer' }}>Active</label>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving?'Saving…':editing?'Update':'Create'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

const HolidaysPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [notice,   setNotice]   = useState({type:'',message:''});
  const [year,     setYear]     = useState(String(new Date().getFullYear()));
  const [typeF,    setTypeF]    = useState('');
  const [editHol,  setEditHol]  = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [deleting, setDeleting] = useState('');
  const [syncing,  setSyncing]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showMsg = (type,message) => { setNotice({type,message}); setTimeout(()=>setNotice({type:'',message:''}),4500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await HolidayApi.getByYear(year||new Date().getFullYear()); setHolidays(r?.data||[]); }
    catch(e) { showMsg('error',e.message||'Failed to load holidays.'); }
    finally { setLoading(false); }
  },[year]);

  useEffect(()=>{ load(); },[load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete);
    try { await HolidayApi.delete(confirmDelete); showMsg('success','Holiday deleted.'); load(); }
    catch(e) { showMsg('error',e.message||'Failed.'); }
    finally { setDeleting(''); setConfirmDelete(null); }
  };

  const handleToggle = async (h) => {
    const date = h.gregorianDate||h.holidayDate||h.date;
    const currentActive = h.is_active!==false && h.is_active!==0;
    const next = !currentActive;
    try { await HolidayApi.toggleStatus(date, next); showMsg('success',`Holiday ${next?'activated':'deactivated'}.`); load(); }
    catch(e) { showMsg('error',e.message||'Failed.'); }
  };

  const handleSync = async () => {
    const ethYear = Number(year) - 7;
    setSyncing(true);
    try { await HolidayApi.sync(ethYear); showMsg('success',`Holidays synced for Ethiopian year ${ethYear}.`); load(); }
    catch(e) { showMsg('error',e.message||'Sync failed.'); }
    finally { setSyncing(false); }
  };

  const filtered = typeF ? holidays.filter(h=>(h.calendarType||h.type||'').toUpperCase()===typeF) : holidays;

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', gap:20 }}>
      <Notice type={notice.type} message={notice.message} onClose={()=>setNotice({type:'',message:''})}/>

      {/* Header */}
      <div style={{ background:C.headerBg, borderRadius:14, padding:'20px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <div><h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>Day off</h1><p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>{filtered.length} holidays for {year}</p></div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleSync} disabled={syncing} style={{ background:'rgba(255,255,255,0.12)', color:'#E8F0EE', border:'1px solid rgba(255,255,255,0.25)', borderRadius:8, padding:'9px 16px', fontSize:'0.78rem', fontWeight:600, cursor:syncing?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'Poppins,sans-serif' }}>
            <RefreshCw size={14} style={{ animation:syncing?'spin 1s linear infinite':'none' }}/> {syncing?'Syncing…':'Sync Ethiopian'}
          </button>
          <GreenBtn onClick={()=>setShowAdd(true)} style={{ background:'#E8F0EE', color:C.primary }}><Plus size={15}/> Add Holiday</GreenBtn>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, padding:'14px 20px', display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
        <div style={{ minWidth:120 }}>
          <label style={lbl}>Year</label>
          <input value={year} onChange={e=>setYear(e.target.value)} placeholder="2026" style={{ ...field, width:120 }} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div style={{ minWidth:160 }}>
          <label style={lbl}>Type</label>
          <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{ ...field, cursor:'pointer', width:160 }}>
            <option value="">All Types</option>
            {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['Date','Name','Type','Calendar Year','Status','Actions'].map((h,i)=><th key={h} style={{ ...TH, textAlign:i===5?'right':'left' }}>{h}</th>)}</tr></thead>
          <tbody>
            {loading?<tr><td colSpan={6} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>Loading…</td></tr>
            :filtered.length===0?<tr><td colSpan={6} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>No holidays found for {year}.</td></tr>
            :filtered.map((h,i)=>{
              const type = (h.calendarType||h.type||'PUBLIC').toUpperCase();
              const [tbg,tc] = TYPE_COLORS[type]||TYPE_COLORS.PUBLIC;
              const active = h.is_active!==false && h.is_active!==0;
              const date = h.gregorianDate||h.holidayDate||h.date||'';
              return (
                <tr key={h.uuid||i} style={{ background:i%2===0?'transparent':'rgba(0,80,60,0.02)' }}>
                  <td style={{ ...TD, fontWeight:600, color:C.textSub }}>{date}</td>
                  <td style={TD}>{h.name||h.holidayName||'—'}</td>
                  <td style={TD}><span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.68rem', fontWeight:700, background:tbg, color:tc }}>{type}</span></td>
                  <td style={{ ...TD, color:C.textMuted }}>{h.calendarYear||'—'}</td>
                  <td style={TD}>
                    <button onClick={()=>handleToggle(h)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:active?'#059669':'#DC2626', fontSize:'0.78rem', fontWeight:600, fontFamily:'Poppins,sans-serif', padding:0 }}>
                      {active?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}
                      {active?'Active':'Inactive'}
                    </button>
                  </td>
                  <td style={{ ...TD, textAlign:'right' }}>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:4 }}>
                      <button onClick={()=>setEditHol(h)} style={{ background:'none', border:'none', cursor:'pointer', color:C.primary, padding:5, borderRadius:6, display:'flex' }}><Pencil size={15}/></button>
                      <button onClick={()=>setConfirmDelete(h.uuid)} disabled={deleting===h.uuid||!h.uuid} style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:5, borderRadius:6, display:'flex', opacity:deleting===h.uuid||!h.uuid?0.4:1 }}><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && <HolidayModal holiday={null}   onClose={()=>setShowAdd(false)}  onSaved={()=>{setShowAdd(false);load();}}  showMsg={showMsg}/>}
      {editHol && <HolidayModal holiday={editHol} onClose={()=>setEditHol(null)} onSaved={()=>{setEditHol(null);load();}} showMsg={showMsg}/>}
      
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        variant="delete"
        title="Delete this holiday?"
        description="This action will permanently delete this holiday definition."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default HolidaysPage;
