import React, { useState, useEffect, useCallback } from 'react';
import { ShiftApi } from '../api/shiftApi';
import { EmployeeApi } from '../api/employeeApi';
import { Layers, Plus, Pencil, Trash2, X, Users, Calendar, AlertTriangle, CheckCircle, Clock, Briefcase, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Can } from '../components/Can';

const C = { card:'#EEF1F0', border:'rgba(0,80,60,0.09)', shadow:'0 2px 12px rgba(0,60,45,0.07)', primary:'#0F766E', primaryHov:'#14B8A6', textMain:'#1A2E2B', textSub:'#1E4A42', textMuted:'#2E6058', headerBg:'linear-gradient(135deg,#0c1e1c,#1e3a37)' };
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

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const ShiftModal = ({shift, onClose, onSaved, showMsg}) => {
  const editing = !!shift?.uuid;
  const [form, setForm] = useState({
    name: shift?.name||'',
    start_time: shift?.start_time||'08:00',
    end_time: shift?.end_time||'17:00',
    working_days: shift?.working_days_json||['Monday','Tuesday','Wednesday','Thursday','Friday'],
    grace_period_minutes: shift?.grace_period_minutes !== undefined ? shift.grace_period_minutes : 15,
    break_duration_minutes: shift?.break_duration_minutes !== undefined ? shift.break_duration_minutes : 30,
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleDay = (d) => setForm(p=>({ ...p, working_days: p.working_days.includes(d) ? p.working_days.filter(x=>x!==d) : [...p.working_days,d] }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = { 
        name:form.name, 
        start_time:form.start_time, 
        end_time:form.end_time, 
        working_days_json:form.working_days,
        grace_period_minutes: parseInt(form.grace_period_minutes),
        break_duration_minutes: parseInt(form.break_duration_minutes),
      };
      if (editing) { await ShiftApi.update(shift.uuid, body); showMsg('success','Shift updated.'); }
      else { await ShiftApi.create(body); showMsg('success','Shift created.'); }
      onSaved();
    } catch(err) { showMsg('error', err.message||'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:520, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}`, maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>{editing?'Edit Shift':'Add Shift'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}><label style={lbl}>Shift Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} required style={field} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div><label style={lbl}>Start Time *</label><input type="time" value={form.start_time} onChange={e=>set('start_time',e.target.value)} required style={field} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <div><label style={lbl}>End Time *</label><input type="time" value={form.end_time} onChange={e=>set('end_time',e.target.value)} required style={field} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Grace Period (Minutes) *</label>
              <input 
                type="number" 
                min="0" 
                max="120" 
                value={form.grace_period_minutes} 
                onChange={e=>set('grace_period_minutes',e.target.value)} 
                required 
                style={field} 
                onFocus={e=>e.target.style.borderColor=C.primary} 
                onBlur={e=>e.target.style.borderColor=C.border}
              />
              <p style={{ margin:'4px 0 0', fontSize:'0.68rem', color:C.textMuted }}>Late threshold</p>
            </div>
            <div>
              <label style={lbl}>Break Duration (Minutes) *</label>
              <input 
                type="number" 
                min="0" 
                max="240" 
                value={form.break_duration_minutes} 
                onChange={e=>set('break_duration_minutes',e.target.value)} 
                required 
                style={field} 
                onFocus={e=>e.target.style.borderColor=C.primary} 
                onBlur={e=>e.target.style.borderColor=C.border}
              />
              <p style={{ margin:'4px 0 0', fontSize:'0.68rem', color:C.textMuted }}>Auto-deducted</p>
            </div>
          </div>
          <div style={{ marginBottom:22 }}>
            <label style={lbl}>Working Days</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:4 }}>
              {DAYS.map(d=>(
                <button key={d} type="button" onClick={()=>toggleDay(d)} style={{ padding:'5px 12px', borderRadius:99, border:`1.5px solid ${form.working_days.includes(d)?C.primary:'rgba(0,80,60,0.2)'}`, background:form.working_days.includes(d)?'rgba(15,118,110,0.1)':'transparent', color:form.working_days.includes(d)?C.primary:C.textMuted, fontSize:'0.72rem', fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>{d.slice(0,3)}</button>
              ))}
            </div>
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

// Employee Assignment Modal
const AssignShiftModal = ({ onClose, onSaved, showMsg, shifts }) => {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    shift_uuid: '',
    employee_uuid: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const empRes = await EmployeeApi.list();
        setEmployees(empRes?.data || []);
      } catch(e) {
        showMsg('error', e.message);
      }
    }
    load();
  }, [showMsg]);

  const filteredEmployees = employees.filter(e => 
    !searchTerm || 
    `${e.first_name} ${e.last_name} ${e.mesob_id}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        employee_uuid: form.employee_uuid,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
      };
      const result = await ShiftApi.assign(form.shift_uuid, body);
      
      let msg = 'Shift assigned successfully.';
      if (result.data?.warning) {
        msg += ` Warning: ${result.data.warning.message}`;
      }
      showMsg('success', msg);
      onSaved();
    } catch(err) {
      showMsg('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:500, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}`, maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Assign Shift to Employee</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Shift *</label>
            <select value={form.shift_uuid} onChange={e=>setForm({...form,shift_uuid:e.target.value})} required style={field}>
              <option value="">Select shift...</option>
              {shifts.map(s=><option key={s.uuid} value={s.uuid}>{s.name} ({s.start_time} - {s.end_time})</option>)}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Employee *</label>
            <input type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} style={{...field, marginBottom:8}} />
            <select value={form.employee_uuid} onChange={e=>setForm({...form,employee_uuid:e.target.value})} required style={{...field, maxHeight:200}}>
              <option value="">Select employee...</option>
              {filteredEmployees.map(e=><option key={e.uuid} value={e.uuid}>{e.mesob_id} - {e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div><label style={lbl}>Effective From *</label><input type="date" value={form.effective_from} onChange={e=>setForm({...form,effective_from:e.target.value})} required style={field} /></div>
            <div><label style={lbl}>Effective To</label><input type="date" value={form.effective_to} onChange={e=>setForm({...form,effective_to:e.target.value})} style={field} /></div>
          </div>
          <p style={{ fontSize:'0.7rem', color:C.textMuted, marginBottom:14 }}>Leave "Effective To" empty for ongoing assignment</p>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving?'Assigning...':'Assign Shift'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

// Position Assignment Modal
const AssignShiftToPositionModal = ({ onClose, onSaved, showMsg, shifts }) => {
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState({
    position_uuid: '',
    shift_uuid: '',
    effective_from: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const posRes = await EmployeeApi.listPositions();
        setPositions(posRes?.data || []);
      } catch(e) {
        showMsg('error', e.message);
      }
    }
    load();
  }, [showMsg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`http://localhost:5000/api/positions/${form.position_uuid}/assign-shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          shift_uuid: form.shift_uuid,
          effective_from: form.effective_from
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to assign');
      
      setResult(data.data);
      showMsg('success', `Shift assigned to position! ${data.data.assigned} employees updated, ${data.data.skipped} skipped.`);
      setTimeout(() => {
        onSaved();
      }, 2000);
    } catch(err) {
      showMsg('error', err.message);
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:500, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}`, maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Assign Shift to Position</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        
        {!result ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Position *</label>
              <select value={form.position_uuid} onChange={e=>setForm({...form,position_uuid:e.target.value})} required style={field}>
                <option value="">Select position...</option>
                {positions.map(p=><option key={p.uuid} value={p.uuid}>{p.title} ({p.total_employees} employees)</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Shift *</label>
              <select value={form.shift_uuid} onChange={e=>setForm({...form,shift_uuid:e.target.value})} required style={field}>
                <option value="">Select shift...</option>
                {shifts.map(s=><option key={s.uuid} value={s.uuid}>{s.name} ({s.start_time} - {s.end_time})</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Effective From *</label>
              <input type="date" value={form.effective_from} onChange={e=>setForm({...form,effective_from:e.target.value})} required style={field} />
            </div>
            <div style={{ padding:12, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:8, marginBottom:14 }}>
              <p style={{ fontSize:'0.72rem', color:'#92400E', margin:0 }}>
                This will assign the shift to all employees in this position. Employees with direct assignments will not be affected.
              </p>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
              <GreenBtn type="submit" disabled={saving}>{saving?'Assigning...':'Assign to Position'}</GreenBtn>
            </div>
          </form>
        ) : (
          <div style={{ textAlign:'center', padding:20 }}>
            <CheckCircle size={48} color="#10B981" style={{ margin:'0 auto 16px' }} />
            <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:700, color:C.textMain }}>Assignment Complete!</h3>
            <div style={{ marginTop:20, padding:16, background:'rgba(15,118,110,0.08)', borderRadius:10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, fontSize:'0.8rem' }}>
                <div>
                  <p style={{ margin:0, color:C.textMuted, fontWeight:600 }}>Total Employees</p>
                  <p style={{ margin:'4px 0 0', fontSize:'1.2rem', fontWeight:700, color:C.textMain }}>{result.total_employees}</p>
                </div>
                <div>
                  <p style={{ margin:0, color:C.textMuted, fontWeight:600 }}>Assigned</p>
                  <p style={{ margin:'4px 0 0', fontSize:'1.2rem', fontWeight:700, color:'#10B981' }}>{result.assigned}</p>
                </div>
                <div>
                  <p style={{ margin:0, color:C.textMuted, fontWeight:600 }}>Skipped</p>
                  <p style={{ margin:'4px 0 0', fontSize:'1.2rem', fontWeight:700, color:'#F59E0B' }}>{result.skipped}</p>
                </div>
                <div>
                  <p style={{ margin:0, color:C.textMuted, fontWeight:600 }}>Errors</p>
                  <p style={{ margin:'4px 0 0', fontSize:'1.2rem', fontWeight:700, color:'#DC2626' }}>{result.errors}</p>
                </div>
              </div>
            </div>
            <GreenBtn onClick={onClose} style={{ marginTop:20 }}>Close</GreenBtn>
          </div>
        )}
      </div>
    </div>
  );
};

const ShiftsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('definitions');
  const [shifts,  setShifts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice,  setNotice]  = useState({type:'',message:''});
  const [editShift,setEditShift]=useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting,setDeleting]= useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewingShift, setViewingShift] = useState(null);
  const [shiftEmployees, setShiftEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showAssignEmployee, setShowAssignEmployee] = useState(false);
  const [showAssignPosition, setShowAssignPosition] = useState(false);
  const [gaps, setGaps] = useState([]);
  const [positions, setPositions] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState({});

  // Determine active tab based on route
  useEffect(() => {
    if (location.pathname === '/shifts/assignments') {
      setActiveTab('assignments');
    } else {
      setActiveTab('definitions');
    }
  }, [location.pathname]);

  const showMsg = (type,message) => { setNotice({type,message}); setTimeout(()=>setNotice({type:'',message:''}),4500); };
  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const r = await ShiftApi.list(); 
      setShifts(r?.data||[]);
      
      // Load additional data for assignments tab
      if (activeTab === 'assignments') {
        const [gapRes, posRes] = await Promise.all([
          ShiftApi.detectGaps().catch(() => ({data:[]})),
          EmployeeApi.listPositions().catch(() => ({data:[]}))
        ]);
        setGaps(gapRes?.data || []);
        setPositions(posRes?.data || []);
        
        // Load employees for each shift
        const empMap = {};
        for (const shift of (r?.data || [])) {
          try {
            const empRes = await ShiftApi.getEmployees(shift.uuid);
            empMap[shift.uuid] = empRes?.data || [];
          } catch(e) {
            empMap[shift.uuid] = [];
          }
        }
        setShiftAssignments(empMap);
      }
    }
    catch(e) { showMsg('error',e.message||'Failed.'); }
    finally { setLoading(false); }
  },[activeTab]);
  useEffect(()=>{ load(); },[load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete);
    try { 
      await ShiftApi.delete(confirmDelete); 
      showMsg('success','Shift deleted.'); 
      load(); 
    }
    catch(e) { showMsg('error',e.message||'Failed.'); }
    finally { 
      setDeleting(''); 
      setConfirmDelete(null);
    }
  };

  const viewShiftEmployees = async (shift) => {
    setViewingShift(shift);
    setLoadingEmployees(true);
    try {
      const res = await ShiftApi.getEmployees(shift.uuid);
      setShiftEmployees(res?.data || []);
    } catch(e) {
      showMsg('error', e.message);
      setShiftEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const renderDefinitionsTab = () => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {loading ? <div style={{ gridColumn:'1/-1', textAlign:'center', padding:48, color:C.textMuted, fontSize:'0.82rem' }}>Loading…</div>
        : shifts.length===0 ? <div style={{ gridColumn:'1/-1', textAlign:'center', padding:48, color:C.textMuted, fontSize:'0.82rem' }}>No shifts found.</div>
        : shifts.map((s,i)=>{
          const days = Array.isArray(s.working_days_json) ? s.working_days_json : (typeof s.working_days_json==='string'?JSON.parse(s.working_days_json||'[]'):[]);
          return (
            <div key={s.uuid||i} style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, padding:20, display:'flex', flexDirection:'column', gap:12, cursor:'pointer', transition:'box-shadow 0.2s' }}
              onClick={()=>viewShiftEmployees(s)}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 20px rgba(0,60,45,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(15,118,110,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}><Layers size={18} color={C.primary}/></div>
                <div style={{ display:'flex', gap:4 }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>setEditShift(s)} style={{ background:'none', border:'none', cursor:'pointer', color:C.primary, padding:4, borderRadius:6, display:'flex' }}><Pencil size={14}/></button>
                  <button onClick={()=>setConfirmDelete(s.uuid)} disabled={deleting===s.uuid} style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:4, borderRadius:6, display:'flex', opacity:deleting===s.uuid?0.5:1 }}><Trash2 size={14}/></button>
                </div>
              </div>
              <div>
                <p style={{ margin:0, fontSize:'0.9rem', fontWeight:700, color:C.textMain }}>{s.name}</p>
                <p style={{ margin:'4px 0 0', fontSize:'0.78rem', color:C.textSub }}>{s.start_time} — {s.end_time}</p>
                {/* Grace Period & Break Duration */}
                <div style={{ marginTop:6, display:'flex', gap:8, fontSize:'0.7rem', color:C.textMuted }}>
                  <span style={{ background:'rgba(15,118,110,0.08)', padding:'2px 8px', borderRadius:4, fontWeight:600 }}>
                    Grace: {s.grace_period_minutes !== undefined ? `${s.grace_period_minutes}min` : '—'}
                  </span>
                  <span style={{ background:'rgba(15,118,110,0.08)', padding:'2px 8px', borderRadius:4, fontWeight:600 }}>
                    Break: {s.break_duration_minutes !== undefined ? `${s.break_duration_minutes}min` : '—'}
                  </span>
                </div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {days.map(d=><span key={d} style={{ padding:'2px 8px', borderRadius:99, background:'rgba(15,118,110,0.1)', color:C.primary, fontSize:'0.65rem', fontWeight:700 }}>{d.slice(0,3)}</span>)}
              </div>
            </div>
          );
        })}
    </div>
  );

  const renderAssignmentsTab = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Action Buttons */}
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <GreenBtn onClick={()=>setShowAssignPosition(true)} style={{ background:'rgba(15,118,110,0.15)', color:C.primary, border:`1.5px solid ${C.primary}` }}>
          <Briefcase size={15}/> Assign by Position
        </GreenBtn>
        <GreenBtn onClick={()=>setShowAssignEmployee(true)}>
          <Calendar size={15}/> Assign to Employee
        </GreenBtn>
      </div>

      {/* Coverage Gaps Section */}
      {gaps.length > 0 && (
        <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:700, color:C.textMain }}>
              Coverage Gaps Detected ({gaps.length})
            </h3>
          </div>
          <div style={{ padding:12, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, marginBottom:16 }}>
            <p style={{ fontSize:'0.75rem', color:'#92400E', margin:0 }}>
              Total: {gaps.reduce((sum,g)=>sum+g.gap_days,0)} days without shift coverage
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {gaps.slice(0,5).map((gap,i) => (
              <div key={i} style={{ padding:14, background:'rgba(0,0,0,0.02)', borderRadius:8, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <p style={{ margin:0, fontSize:'0.82rem', fontWeight:600, color:C.textMain }}>{gap.employee_name}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.7rem', color:C.textMuted }}>ID: {gap.mesob_id}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ margin:0, fontSize:'0.85rem', fontWeight:700, color:'#DC2626' }}>{gap.gap_days} days</p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.7rem', color:C.textMuted }}>
                  <span>{gap.previous_shift_name} (until {gap.gap_start})</span>
                  <span>→</span>
                  <span>{gap.next_shift_name} (from {gap.gap_end})</span>
                </div>
              </div>
            ))}
            {gaps.length > 5 && (
              <p style={{ fontSize:'0.75rem', color:C.textMuted, textAlign:'center', margin:'8px 0 0' }}>
                ... and {gaps.length - 5} more gaps
              </p>
            )}
          </div>
        </div>
      )}

      {/* Assignments by Shift */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <Clock size={20} color={C.primary} />
          <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:700, color:C.textMain }}>Assignments by Shift</h3>
        </div>
        {shifts.length === 0 ? (
          <p style={{ fontSize:'0.8rem', color:C.textMuted, textAlign:'center', padding:20 }}>No shifts found.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {shifts.map(shift => {
              const empList = shiftAssignments[shift.uuid] || [];
              return (
                <div key={shift.uuid} style={{ padding:16, background:'rgba(15,118,110,0.03)', borderRadius:10, border:`1px solid rgba(15,118,110,0.15)` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div>
                      <p style={{ margin:0, fontSize:'0.88rem', fontWeight:700, color:C.textMain }}>{shift.name}</p>
                      <p style={{ margin:'2px 0 0', fontSize:'0.72rem', color:C.textSub }}>{shift.start_time} — {shift.end_time}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(15,118,110,0.15)', padding:'4px 12px', borderRadius:99 }}>
                      <Users size={13} color={C.primary} />
                      <span style={{ fontSize:'0.72rem', fontWeight:700, color:C.primary }}>{empList.length}</span>
                    </div>
                  </div>
                  {empList.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                      {empList.slice(0,6).map(emp => (
                        <div key={emp.uuid} style={{ padding:8, background:C.card, borderRadius:6, border:`1px solid ${C.border}` }}>
                          <p style={{ margin:0, fontSize:'0.75rem', fontWeight:600, color:C.textMain }}>{emp.first_name} {emp.last_name}</p>
                          <p style={{ margin:'2px 0 0', fontSize:'0.68rem', color:C.textMuted }}>{emp.mesob_id}</p>
                        </div>
                      ))}
                      {empList.length > 6 && (
                        <div style={{ padding:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:C.textMuted }}>
                          +{empList.length - 6} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignments by Position */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <Briefcase size={20} color={C.primary} />
          <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:700, color:C.textMain }}>Position Default Shifts</h3>
        </div>
        {positions.length === 0 ? (
          <p style={{ fontSize:'0.8rem', color:C.textMuted, textAlign:'center', padding:20 }}>No positions found.</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {positions.map(position => (
              <div key={position.uuid} style={{ padding:14, background:'rgba(15,118,110,0.03)', borderRadius:10, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <p style={{ margin:0, fontSize:'0.82rem', fontWeight:700, color:C.textMain }}>{position.title}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.7rem', color:C.textMuted }}>{position.department_name || 'No Dept'}</p>
                  </div>
                  <div style={{ background:'rgba(15,118,110,0.1)', padding:'2px 8px', borderRadius:99 }}>
                    <span style={{ fontSize:'0.68rem', fontWeight:700, color:C.primary }}>{position.total_employees} emp</span>
                  </div>
                </div>
                {position.default_shift_name ? (
                  <div style={{ padding:8, background:C.card, borderRadius:6, marginTop:8 }}>
                    <p style={{ margin:0, fontSize:'0.75rem', fontWeight:600, color:C.primary }}>{position.default_shift_name}</p>
                  </div>
                ) : (
                  <div style={{ padding:8, background:'rgba(245,158,11,0.08)', borderRadius:6, marginTop:8 }}>
                    <p style={{ margin:0, fontSize:'0.7rem', color:'#92400E', fontStyle:'italic' }}>No default shift</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', gap:20 }}>
      <Notice type={notice.type} message={notice.message} onClose={()=>setNotice({type:'',message:''})}/>
      <div style={{ background:C.headerBg, borderRadius:14, padding:'20px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <div><h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>Shifts</h1><p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>{shifts.length} shift definitions</p></div>
        <Can action="create" resource="shifts">
          <GreenBtn onClick={()=>setShowAdd(true)} style={{ background:'#E8F0EE', color:C.primary }}><Plus size={15}/> Add Shift</GreenBtn>
        </Can>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, borderBottom:`2px solid ${C.border}` }}>
        <button onClick={()=>{setActiveTab('definitions');navigate('/shifts');}} style={{ padding:'10px 20px', background:'none', border:'none', borderBottom:`3px solid ${activeTab==='definitions'?C.primary:'transparent'}`, color:activeTab==='definitions'?C.primary:C.textMuted, fontWeight:600, fontSize:'0.82rem', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Layers size={16} />
            <span>Overview</span>
          </div>
        </button>
        <button onClick={()=>{setActiveTab('assignments');navigate('/shifts/assignments');if(activeTab!=='assignments')load();}} style={{ padding:'10px 20px', background:'none', border:'none', borderBottom:`3px solid ${activeTab==='assignments'?C.primary:'transparent'}`, color:activeTab==='assignments'?C.primary:C.textMuted, fontWeight:600, fontSize:'0.82rem', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'all 0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Users size={16} />
            <span>Manage Assignments</span>
            {gaps.length > 0 && activeTab !== 'assignments' && <span style={{ background:'#DC2626', color:'white', padding:'2px 6px', borderRadius:99, fontSize:'0.65rem' }}>{gaps.length}</span>}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:C.textMuted, fontSize:'0.82rem' }}>Loading…</div>
      ) : (
        <>
          {activeTab === 'definitions' && renderDefinitionsTab()}
          {activeTab === 'assignments' && renderAssignmentsTab()}
        </>
      )}

      {/* Modals */}
      {showAdd   && <ShiftModal shift={null}     onClose={()=>setShowAdd(false)}   onSaved={()=>{setShowAdd(false);load();}}   showMsg={showMsg}/>}
      {editShift && <ShiftModal shift={editShift} onClose={()=>setEditShift(null)} onSaved={()=>{setEditShift(null);load();}} showMsg={showMsg}/>}
      {showAssignEmployee && <AssignShiftModal onClose={()=>setShowAssignEmployee(false)} onSaved={()=>{setShowAssignEmployee(false);load();}} showMsg={showMsg} shifts={shifts}/>}
      {showAssignPosition && <AssignShiftToPositionModal onClose={()=>setShowAssignPosition(false)} onSaved={()=>{setShowAssignPosition(false);load();}} showMsg={showMsg} shifts={shifts}/>}
      
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        variant="delete"
        title="Delete this shift?"
        description="This action will permanently delete this shift definition."
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Employee List Modal */}
      {viewingShift && (
        <div onClick={()=>setViewingShift(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:600, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}`, maxHeight:'80vh', overflow:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>{viewingShift.name}</h2>
                <p style={{ margin:'4px 0 0', fontSize:'0.75rem', color:C.textSub }}>{viewingShift.start_time} — {viewingShift.end_time}</p>
              </div>
              <button onClick={()=>setViewingShift(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
            </div>
            {loadingEmployees ? (
              <div style={{ textAlign:'center', padding:32, color:C.textMuted }}>Loading employees...</div>
            ) : shiftEmployees.length === 0 ? (
              <div style={{ textAlign:'center', padding:32, color:C.textMuted }}>No employees assigned to this shift</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {shiftEmployees.map(emp => (
                  <div key={emp.uuid} style={{ padding:12, background:'rgba(15,118,110,0.05)', borderRadius:10, border:`1px solid rgba(15,118,110,0.1)` }}>
                    <p style={{ margin:0, fontSize:'0.85rem', fontWeight:600, color:C.textMain }}>{emp.first_name} {emp.middle_name} {emp.last_name}</p>
                    <p style={{ margin:'4px 0 0', fontSize:'0.72rem', color:C.textMuted }}>ID: {emp.mesob_id}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.72rem', color:C.textSub }}>From: {emp.effective_from} {emp.effective_to ? `to ${emp.effective_to}` : '(ongoing)'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftsPage;
