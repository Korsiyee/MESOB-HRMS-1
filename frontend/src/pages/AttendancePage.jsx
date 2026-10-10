import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AttendanceApi } from '../api/attendanceApi';
import { EmployeeApi } from '../api/employeeApi';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { RefreshCw, Pencil, Trash2, Search, X, CheckCircle, Scan, Download, FileText, UserCheck } from 'lucide-react';
import PrettyDatePicker from '../components/PrettyDatePicker';
import { useDialog } from '../context/DialogContext';
import FaceRecognitionAttendance from '../components/FaceRecognitionAttendance';
import AttendanceSummaryReport from '../components/AttendanceSummaryReport';

/* ── Palette ── */
const C = {
  card: '#EEF1F0', border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', primaryHov: '#14B8A6',
  textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const TH = { padding:'11px 16px', textAlign:'left', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, background:'rgba(0,80,60,0.05)', borderBottom:`1px solid ${C.border}`, fontFamily:'Poppins,sans-serif' };
const TD = { padding:'12px 16px', fontSize:'0.8rem', color:C.textMain, borderBottom:`1px solid rgba(0,80,60,0.07)`, fontFamily:'Poppins,sans-serif' };

const fieldStyle = { width:'100%', padding:'9px 13px', borderRadius:8, border:`1px solid ${C.border}`, background:C.card, fontSize:'0.82rem', color:C.textMain, outline:'none', fontFamily:'Poppins,sans-serif', boxSizing:'border-box', transition:'border 0.2s' };
const labelStyle = { display:'block', fontSize:'0.72rem', fontWeight:600, color:C.textSub, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' };

const GreenBtn = ({ children, onClick, disabled, style={} }) => {
  const baseBg = style.background || (disabled ? '#8AADA6' : C.primary);
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:disabled?'#8AADA6':C.primary, color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontSize:'0.78rem', fontWeight:600, cursor:disabled?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:7, fontFamily:'Poppins,sans-serif', transition:'background 0.15s', ...style }}
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

const STATUS_STYLES = {
  PRESENT:  { bg:'rgba(5,150,105,0.1)',  color:'#059669' },
  ABSENT:   { bg:'rgba(220,38,38,0.08)', color:'#DC2626' },
  LATE:     { bg:'rgba(245,158,11,0.1)', color:'#B45309' },
  ON_LEAVE: { bg:'rgba(124,58,237,0.1)', color:'#7C3AED' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.ABSENT;
  return <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.68rem', fontWeight:700, background:s.bg, color:s.color }}>{status}</span>;
};

const STATUSES = ['PRESENT','ABSENT','LATE','ON_LEAVE'];

/* ── Export Utilities ── */
const exportToCSV = (records) => {
  // Defensive check - ensure records is an array
  if (!Array.isArray(records) || records.length === 0) {
    console.error('exportToCSV: Invalid or empty records array');
    return;
  }
  
  const headers = [
    "Date", "Employee Name", "Mesob ID", "Department", "Position", "Status", "Shift", 
    "Check In", "Check Out", "Worked Hours", "Overtime", "Missing Hours", "Late Minutes"
  ];
  const rows = records.map(r => [
    r?.date || '',
    r?.full_name || '',
    r?.mesob_id || '',
    r?.department || '',
    r?.position_title || '',
    r?.status || '',
    r?.shift_name || '',
    r?.check_in ? new Date(r.check_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '',
    r?.check_out ? new Date(r.check_out).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '',
    r?.worked_hours !== null && r?.worked_hours !== undefined ? `${r.worked_hours}h` : '',
    r?.overtime_hours !== null && r?.overtime_hours !== undefined ? `${r.overtime_hours}h` : '',
    r?.missing_hours !== null && r?.missing_hours !== undefined ? `${r.missing_hours}h` : '',
    r?.late_minutes !== null && r?.late_minutes !== undefined ? `${r.late_minutes}min` : '',
  ]);
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_records_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToPDF = (records, filters) => {
  // Defensive check - ensure records is an array
  if (!Array.isArray(records) || records.length === 0) {
    console.error('exportToPDF: Invalid or empty records array');
    return;
  }
  
  // Create a simple HTML table for PDF generation
  const htmlContent = `
    <html>
      <head>
        <title>Attendance Records</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
          h1 { color: #0F766E; font-size: 24px; margin-bottom: 10px; }
          .summary { background: #EEF1F0; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
          .summary p { margin: 5px 0; font-size: 13px; color: #1E4A42; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #0F766E; color: white; padding: 8px; text-align: left; font-weight: 600; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #888; }
        </style>
      </head>
      <body>
        <h1>Attendance Records Report</h1>
        <div class="summary">
          <p><strong>Total Records:</strong> ${records.length}</p>
          <p><strong>Date Range:</strong> ${filters.startDate || 'All'} to ${filters.endDate || 'All'}</p>
          ${filters.departmentName ? `<p><strong>Department:</strong> ${filters.departmentName}</p>` : ''}
          ${filters.positionName ? `<p><strong>Position:</strong> ${filters.positionName}</p>` : ''}
          ${filters.status ? `<p><strong>Status:</strong> ${filters.status}</p>` : ''}
          ${filters.search ? `<p><strong>Search:</strong> ${filters.search}</p>` : ''}
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Mesob ID</th>
              <th>Department</th>
              <th>Position</th>
              <th>Status</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Worked</th>
              <th>Overtime</th>
              <th>Missing</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${r.date || ''}</td>
                <td>${r.full_name || ''}</td>
                <td>${r.mesob_id || ''}</td>
                <td>${r.department || ''}</td>
                <td>${r.position_title || ''}</td>
                <td>${r.status || ''}</td>
                <td>${r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : ''}</td>
                <td>${r.check_out ? new Date(r.check_out).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : ''}</td>
                <td>${r.worked_hours !== null && r.worked_hours !== undefined ? r.worked_hours + 'h' : '-'}</td>
                <td>${r.overtime_hours !== null && r.overtime_hours !== undefined && r.overtime_hours > 0 ? r.overtime_hours + 'h' : '-'}</td>
                <td>${r.missing_hours !== null && r.missing_hours !== undefined && r.missing_hours > 0 ? r.missing_hours + 'h' : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>MESOB HRMS - Attendance Management System</p>
        </div>
      </body>
    </html>
  `;

  // Open print dialog
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

/* ── Punch Method Selection Modal ── */
const PunchMethodModal = ({ onClose, onSelectMethod }) => {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:400, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Choose Punch Method</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        <p style={{ margin:'0 0 20px', fontSize:'0.8rem', color:C.textSub }}>Select how you'd like to record attendance:</p>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <button onClick={()=>onSelectMethod('face')} 
            style={{ background:C.primary, color:'#fff', border:'none', borderRadius:10, padding:'16px 20px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:12, fontFamily:'Poppins,sans-serif', transition:'background 0.15s', justifyContent:'center' }}
            onMouseEnter={e=>e.currentTarget.style.background=C.primaryHov}
            onMouseLeave={e=>e.currentTarget.style.background=C.primary}>
            <Scan size={20}/> Face Recognition
          </button>
          <button onClick={()=>onSelectMethod('manual')} 
            style={{ background:'#fff', color:C.primary, border:`2px solid ${C.primary}`, borderRadius:10, padding:'16px 20px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:12, fontFamily:'Poppins,sans-serif', transition:'all 0.15s', justifyContent:'center' }}
            onMouseEnter={e=>{e.currentTarget.style.background=C.primary;e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color=C.primary;}}>
            <CheckCircle size={20}/> Manual Check-In/Out
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Manual Log Attendance Modal with Employee Search ── */
const LogModal = ({ onClose, onSaved, showMsg }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [type, setType] = useState('CHECK_IN');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Search for employees as user types
  useEffect(() => {
    const searchEmployees = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        const res = await EmployeeApi.searchForAttendance(searchQuery.trim());
        setSearchResults(res?.data || []);
      } catch(err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(searchEmployees, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Check attendance status when employee is selected
  useEffect(() => {
    const checkStatus = async () => {
      if (!selectedEmployee?.uuid) {
        setStatus(null);
        return;
      }
      
      setChecking(true);
      try {
        const res = await AttendanceApi.getTodayStatus(selectedEmployee.uuid);
        setStatus(res);
        
        // Auto-select appropriate type based on status
        if (res.can_check_in && !res.can_check_out) {
          setType('CHECK_IN');
        } else if (!res.can_check_in && res.can_check_out) {
          setType('CHECK_OUT');
        }
      } catch(err) {
        console.error('Status check failed:', err);
        setStatus(null);
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [selectedEmployee]);

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedEmployee(null);
    setStatus(null);
    setType('CHECK_IN');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      showMsg('error', 'Please select an employee first.');
      return;
    }
    
    setSaving(true);
    try {
      await AttendanceApi.logAttendance({
        employee_uuid: selectedEmployee.uuid,
        type,
      });
      showMsg('success','Attendance logged successfully.');
      onSaved();
    } catch(err) { 
      showMsg('error', err.message||'Failed to log attendance.'); 
    }
    finally { setSaving(false); }
  };

  const canSubmit = !saving && !checking && selectedEmployee;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:500, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Manual Check-In/Out</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Employee Search/Selection */}
          {!selectedEmployee ? (
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Search Employee *</label>
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.textMuted, pointerEvents:'none' }}/>
                <input 
                  value={searchQuery} 
                  onChange={e=>setSearchQuery(e.target.value)} 
                  placeholder="Search by name or Mesob ID..." 
                  style={{ ...fieldStyle, paddingLeft:34 }}
                  onFocus={e=>e.target.style.borderColor=C.primary} 
                  onBlur={e=>setTimeout(()=>e.target.style.borderColor=C.border, 200)}
                  autoFocus
                />
              </div>
              
              {/* Search Results Dropdown */}
              {(searching || searchResults.length > 0) && (
                <div style={{ 
                  marginTop:6, 
                  maxHeight:280, 
                  overflowY:'auto', 
                  border:`1px solid ${C.border}`, 
                  borderRadius:8, 
                  background:'#fff',
                  boxShadow:'0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {searching && (
                    <div style={{ padding:12, textAlign:'center', fontSize:'0.75rem', color:C.textMuted }}>
                      Searching...
                    </div>
                  )}
                  {!searching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                    <div style={{ padding:12, textAlign:'center', fontSize:'0.75rem', color:C.textMuted }}>
                      No employees found
                    </div>
                  )}
                  {searchResults.map(emp => (
                    <div 
                      key={emp.uuid}
                      onClick={() => handleSelectEmployee(emp)}
                      style={{ 
                        padding:10, 
                        display:'flex', 
                        alignItems:'center', 
                        gap:12, 
                        cursor:'pointer',
                        borderBottom:`1px solid ${C.border}`,
                        transition:'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Employee Photo */}
                      <div style={{ 
                        width:44, 
                        height:44, 
                        borderRadius:'50%', 
                        background:emp.photoUrl ? `url(${emp.photoUrl})` : C.primary,
                        backgroundSize:'cover',
                        backgroundPosition:'center',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        color:'#fff',
                        fontSize:'0.9rem',
                        fontWeight:700,
                        flexShrink:0
                      }}>
                        {!emp.photoUrl && (emp.firstName?.[0] || '?')}
                      </div>
                      
                      {/* Employee Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'0.82rem', fontWeight:600, color:C.textMain, marginBottom:2 }}>
                          {emp.fullName}
                        </div>
                        <div style={{ fontSize:'0.7rem', color:C.textMuted, display:'flex', alignItems:'center', gap:8 }}>
                          <span>ID: {emp.mesobId}</span>
                          {emp.departmentName && (
                            <>
                              <span>•</span>
                              <span>{emp.departmentName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                <p style={{ margin:'6px 0 0', fontSize:'0.7rem', color:C.textMuted }}>
                  Type at least 2 characters to search
                </p>
              )}
            </div>
          ) : (
            /* Selected Employee Display */
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Selected Employee</label>
              <div style={{ 
                padding:12, 
                border:`2px solid ${C.primary}`, 
                borderRadius:10, 
                background:'rgba(15,118,110,0.05)',
                display:'flex',
                alignItems:'center',
                gap:12
              }}>
                {/* Employee Photo */}
                <div style={{ 
                  width:52, 
                  height:52, 
                  borderRadius:'50%', 
                  background:selectedEmployee.photoUrl ? `url(${selectedEmployee.photoUrl})` : C.primary,
                  backgroundSize:'cover',
                  backgroundPosition:'center',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  color:'#fff',
                  fontSize:'1.1rem',
                  fontWeight:700,
                  flexShrink:0
                }}>
                  {!selectedEmployee.photoUrl && (selectedEmployee.firstName?.[0] || '?')}
                </div>
                
                {/* Employee Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.88rem', fontWeight:700, color:C.textMain, marginBottom:3 }}>
                    {selectedEmployee.fullName}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:C.textSub, marginBottom:2 }}>
                    Mesob ID: {selectedEmployee.mesobId}
                  </div>
                  {selectedEmployee.departmentName && (
                    <div style={{ fontSize:'0.7rem', color:C.textMuted }}>
                      {selectedEmployee.departmentName}
                    </div>
                  )}
                </div>
                
                {/* Clear Button */}
                <button 
                  type="button"
                  onClick={handleClearSelection}
                  style={{ 
                    background:'transparent', 
                    border:'none', 
                    cursor:'pointer', 
                    color:C.textMuted,
                    padding:6,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    borderRadius:6,
                    transition:'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Change employee"
                >
                  <X size={18}/>
                </button>
              </div>
            </div>
          )}
          
          {/* Status Display */}
          {checking && (
            <div style={{ marginBottom:14, padding:10, background:'rgba(15,118,110,0.05)', border:`1px solid ${C.border}`, borderRadius:8, textAlign:'center' }}>
              <p style={{ margin:0, fontSize:'0.75rem', color:C.textMuted }}>Checking attendance status...</p>
            </div>
          )}
          
          {!checking && status && selectedEmployee && (
            <div style={{ marginBottom:14, padding:12, background:status.can_check_in||status.can_check_out?'rgba(15,118,110,0.08)':'rgba(245,158,11,0.08)', border:`1px solid ${status.can_check_in||status.can_check_out?'rgba(15,118,110,0.2)':'rgba(245,158,11,0.3)'}`, borderRadius:8 }}>
              <p style={{ margin:0, fontSize:'0.75rem', color:status.can_check_in||status.can_check_out?C.primary:'#92400E', fontWeight:600 }}>
                {status.message}
              </p>
              {status.check_in_time && (
                <p style={{ margin:'4px 0 0', fontSize:'0.7rem', color:C.textMuted }}>
                  Checked in: {new Date(status.check_in_time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                </p>
              )}
              {status.check_out_time && (
                <p style={{ margin:'4px 0 0', fontSize:'0.7rem', color:C.textMuted }}>
                  Checked out: {new Date(status.check_out_time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                </p>
              )}
            </div>
          )}
          
          {/* Type Selection */}
          {selectedEmployee && (
            <div style={{ marginBottom:22 }}>
              <label style={labelStyle}>Type *</label>
              <select value={type} onChange={e=>setType(e.target.value)} style={{ ...fieldStyle, cursor:'pointer' }}>
                <option value="CHECK_IN">CHECK IN</option>
                <option value="CHECK_OUT">CHECK OUT</option>
              </select>
            </div>
          )}
          
          {/* Action Buttons */}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={!canSubmit}>{saving?'Logging…':'Log Attendance'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Correct Modal ── */
const CorrectModal = ({ record, onClose, onSaved, showMsg }) => {
  const [status, setStatus] = useState(record?.status || 'PRESENT');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await AttendanceApi.correctAttendance(record.uuid, status);
      showMsg('success','Attendance corrected.');
      onSaved();
    } catch(err) { showMsg('error', err.message||'Failed to correct.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:C.card, borderRadius:14, width:'100%', maxWidth:380, padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>Correct Attendance</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}><X size={18}/></button>
        </div>
        <p style={{ margin:'0 0 16px', fontSize:'0.8rem', color:C.textSub }}>
          Employee: <strong>{record?.full_name || record?.employee_uuid}</strong> — {record?.date}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:22 }}>
            <label style={labelStyle}>New Status *</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{ ...fieldStyle, cursor:'pointer' }}>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving?'Saving…':'Save Correction'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const AttendancePage = () => {
  const { user } = useAuth();
  const dialog = useDialog();
  const canManageAll = usePermission('attendance', 'manage_all');
  const employeeUuid = user?.employee_uuid;

  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [notice,      setNotice]      = useState({ type:'', message:'' });
  const [filters,     setFilters]     = useState({ search:'', departmentUuid:'', positionUuid:'', status:'', startDate:'', endDate:'', page:1, pageSize:20 });
  const [meta,        setMeta]        = useState({ total:0, totalPages:1 });
  const [showPunchMethod, setShowPunchMethod] = useState(false);
  const [showLog,     setShowLog]     = useState(false);
  const [showFaceRec, setShowFaceRec] = useState(false);
  const [correctRec,  setCorrectRec]  = useState(null);
  const [deleting,    setDeleting]    = useState('');

  // Dropdowns for filters
  const [departments, setDepartments] = useState([]);
  const [positions,   setPositions]   = useState([]);
  const [allPositions, setAllPositions] = useState([]);

  const showMsg = (type, message) => { setNotice({ type, message }); setTimeout(()=>setNotice({type:'',message:''}),4500); };

  // Load departments and positions
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [deptRes, posRes] = await Promise.all([
          EmployeeApi.listDepartments(),
          EmployeeApi.listPositions()
        ]);
        // Defensive checks to ensure arrays
        const depts = Array.isArray(deptRes?.data) ? deptRes.data : [];
        const poss = Array.isArray(posRes?.data) ? posRes.data : [];
        setDepartments(depts);
        setAllPositions(poss);
      } catch(e) { 
        console.error('Failed to load filter options:', e);
        // Ensure state is set to empty arrays even on error
        setDepartments([]);
        setAllPositions([]);
      }
    };
    loadFilters();
  }, []);

  // Update positions when department changes
  useEffect(() => {
    // Ensure allPositions is always an array before filtering
    const positionsArray = Array.isArray(allPositions) ? allPositions : [];
    
    if (filters.departmentUuid) {
      const filtered = positionsArray.filter(p => p?.department_uuid === filters.departmentUuid);
      setPositions(filtered);
      // Reset position if it doesn't belong to selected department
      if (filters.positionUuid && !filtered.find(p => p?.uuid === filters.positionUuid)) {
        setFilters(prev => ({ ...prev, positionUuid: '' }));
      }
    } else {
      setPositions(positionsArray);
    }
  }, [filters.departmentUuid, allPositions, filters.positionUuid]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: filters.search,
        departmentUuid: filters.departmentUuid,
        positionUuid: filters.positionUuid,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: filters.page,
        pageSize: filters.pageSize,
      };
      const res = canManageAll
        ? await AttendanceApi.getAllAttendance(params)
        : await AttendanceApi.getEmployeeAttendance(employeeUuid, params);
      
      // Defensive checks for array data
      const records = Array.isArray(res?.data) ? res.data : [];
      setRecords(records);
      
      // Handle both meta and pagination response formats
      const total = res?.meta?.total || res?.pagination?.total || 0;
      const totalPages = res?.meta?.totalPages || res?.pagination?.totalPages || 1;
      setMeta({ total, totalPages });
    } catch(e) { 
      console.error('Attendance load error:', e);
      showMsg('error', e.message || 'Failed to load attendance records.');
      // Ensure records is always an array to prevent crashes
      setRecords([]);
      setMeta({ total: 0, totalPages: 1 });
    }
    finally { setLoading(false); }
  }, [filters.search, filters.departmentUuid, filters.positionUuid, filters.status, filters.startDate, filters.endDate, filters.page, filters.pageSize, canManageAll, employeeUuid]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (uuid) => {
    dialog.showDeleteConfirm(
      'Delete this attendance record? This cannot be undone.',
      async () => {
        setDeleting(uuid);
        try {
          await AttendanceApi.deleteAttendance(uuid);
          showMsg('success', 'Record deleted.');
          load();
        } catch (e) {
          showMsg('error', e.message || 'Failed to delete.');
        } finally {
          setDeleting('');
        }
      },
      {
        title: 'Delete Attendance Record',
        confirmText: 'Delete',
      }
    );
  };

  // Fetch ALL records for export (not just current page)
  const fetchAllForExport = async () => {
    try {
      const params = {
        search: filters.search,
        departmentUuid: filters.departmentUuid,
        positionUuid: filters.positionUuid,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: 1,
        pageSize: 10000, // Large number to get all records
      };
      const res = canManageAll
        ? await AttendanceApi.getAllAttendance(params)
        : await AttendanceApi.getEmployeeAttendance(employeeUuid, params);
      // Defensive check - ensure we return an array
      return Array.isArray(res?.data) ? res.data : [];
    } catch(e) {
      console.error('Export fetch error:', e);
      showMsg('error', e.message || 'Failed to fetch data for export.');
      return [];
    }
  };

  const handleExportCSV = async () => {
    if (meta.total === 0) {
      showMsg('error', 'No records to export.');
      return;
    }
    const allRecords = await fetchAllForExport();
    if (allRecords.length === 0) {
      showMsg('error', 'No records to export.');
      return;
    }
    exportToCSV(allRecords);
    showMsg('success', `Exported ${allRecords.length} records to CSV.`);
  };

  const handleExportPDF = async () => {
    if (meta.total === 0) {
      showMsg('error', 'No records to export.');
      return;
    }
    const allRecords = await fetchAllForExport();
    if (allRecords.length === 0) {
      showMsg('error', 'No records to export.');
      return;
    }
    const selectedDept = departments.find(d => d.uuid === filters.departmentUuid);
    const selectedPos = positions.find(p => p.uuid === filters.positionUuid);
    exportToPDF(allRecords, {
      ...filters,
      departmentName: selectedDept?.name || '',
      positionName: selectedPos?.title || '',
    });
    showMsg('success', 'Opening PDF export...');
  };

  const handlePunchMethodSelect = (method) => {
    setShowPunchMethod(false);
    if (method === 'face') {
      setShowFaceRec(true);
    } else if (method === 'manual') {
      setShowLog(true);
    }
  };

  const getActiveFilterSummary = () => {
    const parts = [];
    if (filters.startDate || filters.endDate) {
      parts.push(`Date: ${filters.startDate || 'All'} to ${filters.endDate || 'All'}`);
    }
    if (filters.departmentUuid) {
      const dept = departments.find(d => d.uuid === filters.departmentUuid);
      if (dept) parts.push(`Department: ${dept.name}`);
    }
    if (filters.positionUuid) {
      const pos = positions.find(p => p.uuid === filters.positionUuid);
      if (pos) parts.push(`Position: ${pos.title}`);
    }
    if (filters.status) {
      parts.push(`Status: ${filters.status}`);
    }
    if (filters.search) {
      parts.push(`Search: "${filters.search}"`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Showing all records';
  };

  const today = new Date().toISOString().slice(0,10);

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', gap:20 }}>
      <Notice type={notice.type} message={notice.message} onClose={()=>setNotice({type:'',message:''})} />

      {/* Header */}
      <div style={{ background:C.headerBg, borderRadius:14, padding:'20px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>Attendance Management</h1>
          <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>Log, view and correct employee attendance records</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>setShowPunchMethod(true)} style={{ background:'#E8F0EE', color:C.primary, border:'none', borderRadius:8, padding:'10px 20px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, fontFamily:'Poppins,sans-serif', transition:'all 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#E8F0EE';}}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <Scan size={16}/>
              <CheckCircle size={16}/>
            </div>
            Punch
          </button>
        </div>
      </div>

      {/* Summary Report */}
      {records.length > 0 && <AttendanceSummaryReport records={records} />}

      {/* Comprehensive Filters */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, padding:'16px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:12 }}>
          {/* Search by Mesob ID or Name */}
          <div>
            <label style={labelStyle}>Search Employee</label>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.textMuted }}/>
              <input value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value,page:1}))} placeholder="Mesob ID or Name…"
                style={{ ...fieldStyle, paddingLeft:32 }}
                onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label style={labelStyle}>Department</label>
            <select value={filters.departmentUuid} onChange={e=>setFilters(p=>({...p,departmentUuid:e.target.value,page:1}))} style={{ ...fieldStyle, cursor:'pointer' }}>
              <option value="">All Departments</option>
              {departments.map(d=><option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>

          {/* Position Filter */}
          <div>
            <label style={labelStyle}>Position</label>
            <select value={filters.positionUuid} onChange={e=>setFilters(p=>({...p,positionUuid:e.target.value,page:1}))} style={{ ...fieldStyle, cursor:'pointer' }} disabled={!filters.departmentUuid && positions.length === 0}>
              <option value="">All Positions</option>
              {positions.map(pos=><option key={pos.uuid} value={pos.uuid}>{pos.title}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={labelStyle}>Attendance Status</label>
            <select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value,page:1}))} style={{ ...fieldStyle, cursor:'pointer' }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <PrettyDatePicker value={filters.startDate} onChange={v=>setFilters(p=>({...p,startDate:v,page:1}))}/>
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <PrettyDatePicker value={filters.endDate} onChange={v=>setFilters(p=>({...p,endDate:v,page:1}))}/>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', alignItems:'center', paddingTop:8, borderTop:`1px solid ${C.border}` }}>
          <button onClick={()=>setFilters({search:'', departmentUuid:'', positionUuid:'', status:'', startDate:'', endDate:'', page:1, pageSize:20})} 
            style={{ padding:'7px 14px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
            Clear Filters
          </button>
          <GreenBtn onClick={load}><RefreshCw size={14}/> Refresh</GreenBtn>
        </div>
      </div>

      {/* Summary Section */}
      <div style={{ background:'linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(20,184,166,0.12) 100%)', borderRadius:14, border:`1px solid ${C.border}`, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ margin:0, fontSize:'0.72rem', fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>Current Dataset Summary</p>
          <p style={{ margin:'4px 0 0', fontSize:'0.88rem', color:C.textSub, fontWeight:500 }}>{getActiveFilterSummary()}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'center', padding:'0 16px', borderRight:`1px solid ${C.border}` }}>
            <p style={{ margin:0, fontSize:'1.3rem', fontWeight:700, color:C.primary }}>{meta.total.toLocaleString()}</p>
            <p style={{ margin:'2px 0 0', fontSize:'0.68rem', color:C.textMuted, textTransform:'uppercase' }}>Total Records</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleExportCSV} disabled={meta.total===0} style={{ background:'#fff', color:C.primary, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 14px', fontSize:'0.76rem', fontWeight:600, cursor:meta.total===0?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:6, fontFamily:'Poppins,sans-serif', opacity:meta.total===0?0.5:1 }}>
              <Download size={14}/> CSV
            </button>
            <button onClick={handleExportPDF} disabled={meta.total===0} style={{ background:'#fff', color:C.primary, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 14px', fontSize:'0.76rem', fontWeight:600, cursor:meta.total===0?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:6, fontFamily:'Poppins,sans-serif', opacity:meta.total===0?0.5:1 }}>
              <FileText size={14}/> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:C.shadow, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'0.8rem', fontWeight:600, color:C.textSub }}>{meta.total.toLocaleString()} total records</span>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setFilters(p=>({...p,page:Math.max(1,p.page-1)}))} disabled={filters.page<=1}
              style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontSize:'0.75rem', cursor:filters.page<=1?'not-allowed':'pointer', opacity:filters.page<=1?0.5:1 }}>← Prev</button>
            <span style={{ padding:'5px 12px', fontSize:'0.75rem', color:C.textMuted }}>Page {filters.page} of {meta.totalPages}</span>
            <button onClick={()=>setFilters(p=>({...p,page:Math.min(meta.totalPages,p.page+1)}))} disabled={filters.page>=meta.totalPages}
              style={{ padding:'5px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.textSub, fontSize:'0.75rem', cursor:filters.page>=meta.totalPages?'not-allowed':'pointer', opacity:filters.page>=meta.totalPages?0.5:1 }}>Next →</button>
          </div>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Date','Employee','Mesob ID','Status','Shift','Check In','Check Out','Worked','Overtime','Missing','Late','Actions'].map((h,i)=>(
              <th key={h} style={{ ...TH, textAlign:i===11?'right':'left' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>Loading records…</td></tr>
            ) : records.length===0 ? (
              <tr><td colSpan={12} style={{ ...TD, textAlign:'center', padding:48, color:C.textMuted }}>No attendance records found.</td></tr>
            ) : records.map((r,i) => (
              <tr key={r.uuid||i} style={{ background:i%2===0?'transparent':'rgba(0,80,60,0.02)' }}>
                <td style={{ ...TD, color:C.textSub, fontWeight:600, fontSize:'0.75rem' }}>
                  {new Date(r.date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
                </td>
                <td style={TD}>
                  <div>
                    <p style={{ margin:0, fontWeight:600, fontSize:'0.78rem', color:C.textMain }}>{r.full_name||r.employee_name||'—'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.68rem', color:C.textMuted }}>{r.department||'—'}</p>
                  </div>
                </td>
                <td style={{ ...TD, color:C.textMuted, fontSize:'0.72rem' }}>{r.mesob_id||'—'}</td>
                <td style={TD}><StatusBadge status={r.status}/></td>
                <td style={{ ...TD, color:C.textMuted, fontSize:'0.72rem' }}>{r.shift_name||'—'}</td>
                <td style={{ ...TD, color:C.textSub, fontSize:'0.72rem' }}>{r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                <td style={{ ...TD, color:C.textSub, fontSize:'0.72rem' }}>{r.check_out ? new Date(r.check_out).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                <td style={{ ...TD, fontSize:'0.72rem', fontWeight:600, color: r.worked_hours !== null && r.worked_hours !== undefined ? C.textMain : C.textMuted }}>
                  {r.worked_hours !== null && r.worked_hours !== undefined ? `${r.worked_hours}h` : '—'}
                </td>
                <td style={{ ...TD, fontSize:'0.72rem', fontWeight:600 }}>
                  {r.overtime_hours !== null && r.overtime_hours !== undefined && r.overtime_hours > 0 ? (
                    <span style={{ color:'#059669', background:'rgba(5,150,105,0.1)', padding:'2px 8px', borderRadius:4, display:'inline-block' }}>
                      +{r.overtime_hours}h
                    </span>
                  ) : <span style={{ color:C.textMuted }}>—</span>}
                </td>
                <td style={{ ...TD, fontSize:'0.72rem', fontWeight:600 }}>
                  {r.missing_hours !== null && r.missing_hours !== undefined && r.missing_hours > 0 ? (
                    <span style={{ color:'#DC2626', background:'rgba(220,38,38,0.08)', padding:'2px 8px', borderRadius:4, display:'inline-block' }}>
                      -{r.missing_hours}h
                    </span>
                  ) : <span style={{ color:C.textMuted }}>—</span>}
                </td>
                <td style={{ ...TD, fontSize:'0.72rem', fontWeight:600 }}>
                  {r.late_minutes !== null && r.late_minutes !== undefined && r.late_minutes > 0 ? (
                    <span style={{ color:'#B45309', background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:4, display:'inline-block' }}>
                      {r.late_minutes}min
                    </span>
                  ) : <span style={{ color:C.textMuted }}>—</span>}
                </td>
                <td style={{ ...TD, textAlign:'right' }}>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:4 }}>
                    <button onClick={()=>setCorrectRec(r)} title="Correct" style={{ background:'none', border:'none', cursor:'pointer', color:C.primary, padding:5, borderRadius:6, display:'flex' }}>
                      <Pencil size={15}/>
                    </button>
                    <button onClick={()=>handleDelete(r.uuid)} disabled={deleting===r.uuid} title="Delete" style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', padding:5, borderRadius:6, display:'flex', opacity:deleting===r.uuid?0.5:1 }}>
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showPunchMethod && <PunchMethodModal onClose={()=>setShowPunchMethod(false)} onSelectMethod={handlePunchMethodSelect}/>}
      {showLog    && <LogModal    onClose={()=>setShowLog(false)}    onSaved={()=>{setShowLog(false);load();}}    showMsg={showMsg}/>}
      {correctRec && <CorrectModal record={correctRec} onClose={()=>setCorrectRec(null)} onSaved={()=>{setCorrectRec(null);load();}} showMsg={showMsg}/>}
      {showFaceRec && <FaceRecognitionAttendance onClose={()=>setShowFaceRec(false)} onSuccess={(data)=>{showMsg('success',`Attendance recorded for ${data.employee.firstName} ${data.employee.lastName}`);load();}} />}
    </div>
  );
};

export default AttendancePage;
