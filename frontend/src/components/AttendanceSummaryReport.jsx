import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';

const C = {
  card: '#EEF1F0', border: 'rgba(0,80,60,0.09)', shadow: '0 2px 12px rgba(0,60,45,0.07)',
  primary: '#0F766E', primaryHov: '#14B8A6', textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
};

const AttendanceSummaryReport = ({ records = [] }) => {
  const [periodType, setPeriodType] = useState('weekly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const summary = useMemo(() => {
    if (!records || records.length === 0) return null;
    let filteredRecords = records;
    const today = new Date();
    
    if (periodType === 'weekly') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      filteredRecords = records.filter(r => new Date(r.date) >= weekAgo);
    } else if (periodType === 'monthly') {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      filteredRecords = records.filter(r => new Date(r.date) >= monthAgo);
    } else if (periodType === 'custom' && customStart && customEnd) {
      filteredRecords = records.filter(r => r.date >= customStart && r.date <= customEnd);
    }

    const totalWorkedHours = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.worked_hours) || 0), 0);
    const totalOvertimeHours = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);
    const totalMissingHours = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.missing_hours) || 0), 0);
    const totalLateDays = filteredRecords.filter(r => (r.late_minutes || 0) > 0).length;
    const totalLateMinutes = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.late_minutes) || 0), 0);

    const statusCounts = {
      PRESENT: filteredRecords.filter(r => r.status === 'PRESENT').length,
      LATE: filteredRecords.filter(r => r.status === 'LATE').length,
      ABSENT: filteredRecords.filter(r => r.status === 'ABSENT').length,
      ON_LEAVE: filteredRecords.filter(r => r.status === 'ON_LEAVE').length,
    };

    const totalDays = filteredRecords.length;
    const workedDays = statusCounts.PRESENT + statusCounts.LATE;
    const attendanceRate = totalDays > 0 ? ((workedDays / totalDays) * 100).toFixed(1) : 0;

    const weeklyData = {};
    filteredRecords.forEach(record => {
      if (!record.date) return;
      const date = new Date(record.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      if (!weeklyData[weekKey]) weeklyData[weekKey] = { worked: 0, overtime: 0, missing: 0 };
      if (record.worked_hours != null) weeklyData[weekKey].worked += (parseFloat(record.worked_hours) || 0);
      if (record.overtime_hours != null) weeklyData[weekKey].overtime += (parseFloat(record.overtime_hours) || 0);
      if (record.missing_hours != null) weeklyData[weekKey].missing += (parseFloat(record.missing_hours) || 0);
    });

    const chartData = Object.entries(weeklyData).sort(([a], [b]) => a.localeCompare(b)).slice(-8)
      .map(([week, data]) => ({ week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ...data }));

    return { 
      totalWorkedHours: (typeof totalWorkedHours === 'number' ? totalWorkedHours : 0).toFixed(1), 
      totalOvertimeHours: (typeof totalOvertimeHours === 'number' ? totalOvertimeHours : 0).toFixed(1),
      totalMissingHours: (typeof totalMissingHours === 'number' ? totalMissingHours : 0).toFixed(1), 
      totalLateDays, 
      totalLateMinutes, 
      statusCounts,
      totalDays, 
      workedDays, 
      attendanceRate, 
      chartData 
    };
  }, [records, periodType, customStart, customEnd]);

  const exportPDF = () => {
    if (!summary) return;
    const periodLabel = periodType === 'weekly' ? 'Weekly' : periodType === 'monthly' ? 'Monthly' : 'Custom Range';
    const dateRange = periodType === 'custom' && customStart && customEnd
      ? `${new Date(customStart).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })} to ${new Date(customEnd).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`
      : `Last ${periodType === 'weekly' ? '7' : '30'} days`;

    const maxValue = Math.max(...summary.chartData.map(d => d.worked + d.overtime), 1);
    const bars = summary.chartData.map((d, i) => {
      const x = 20 + i * 55;
      const wh = (d.worked / maxValue) * 140;
      const oh = (d.overtime / maxValue) * 140;
      const mh = (d.missing / maxValue) * 140;
      return `<g><rect x="${x}" y="${160-wh}" width="24" height="${wh}" fill="#0F766E" rx="3"/>
        ${oh>0?`<rect x="${x}" y="${160-wh-oh}" width="24" height="${oh}" fill="#059669" rx="3"/>`:''}
        ${mh>0?`<rect x="${x+26}" y="${160-mh}" width="12" height="${mh}" fill="#DC2626" rx="2" opacity="0.7"/>`:''}
        ${wh>0?`<text x="${x+12}" y="${156-wh}" font-size="9" font-weight="600" fill="#1A2E2B" text-anchor="middle">${d.worked.toFixed(0)}h</text>`:''}
        <text x="${x+12}" y="175" font-size="10" fill="#2E6058" text-anchor="middle">${d.week}</text></g>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Attendance Summary</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:30px 40px;color:#1A2E2B}
    .hdr{border-bottom:3px solid #0F766E;padding-bottom:15px;margin-bottom:25px}h1{color:#0F766E;font-size:26px;margin-bottom:5px;font-weight:700}
    .meta{background:#EEF1F0;padding:12px 15px;border-radius:6px;margin-bottom:25px;border-left:4px solid #0F766E;font-size:12px}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:30px}
    .card{background:#F8FAFA;border:1px solid #E0E5E4;padding:15px;border-radius:8px;text-align:center}
    .val{font-size:28px;font-weight:700;color:#0F766E;margin-bottom:5px}.lbl{font-size:11px;color:#2E6058;text-transform:uppercase}
    .card.g .val{color:#059669}.card.r .val{color:#DC2626}.card.b .val{color:#2563EB}
    .sec{margin-bottom:30px}.tit{font-size:16px;font-weight:700;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #E0E5E4}
    .chart{background:#F8FAFA;padding:20px;border-radius:8px;margin-bottom:25px;border:1px solid #E0E5E4}
    .status{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:#F8FAFA;padding:15px;border-radius:8px}
    .si{text-align:center;padding:10px}.sv{font-size:24px;font-weight:700;margin-bottom:5px}
    .si.p .sv{color:#059669}.si.l .sv{color:#B45309}.si.a .sv{color:#DC2626}.si.o .sv{color:#7C3AED}
    .late{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:15px;
    display:grid;grid-template-columns:repeat(3,1fr);gap:15px;text-align:center}
    .lv{font-size:22px;font-weight:700;color:#B45309;margin-bottom:4px}.ll{font-size:11px;color:#92400E}
    .ftr{margin-top:40px;padding-top:15px;border-top:2px solid #E0E5E4;text-align:center;font-size:11px;color:#2E6058}
    @media print{body{padding:20px}.chart{page-break-inside:avoid}.grid{page-break-inside:avoid}}</style></head><body>
    <div class="hdr"><h1>Attendance Summary Report</h1><div style="font-size:13px;color:#2E6058">${periodLabel} Report</div></div>
    <div class="meta"><strong>Period:</strong> ${dateRange} &nbsp;|&nbsp; <strong>Total Days:</strong> ${summary.totalDays} &nbsp;|&nbsp; 
    <strong>Generated:</strong> ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
    <div class="grid"><div class="card b"><div class="val">${summary.attendanceRate}%</div><div class="lbl">Attendance Rate</div></div>
    <div class="card g"><div class="val">${summary.totalWorkedHours}h</div><div class="lbl">Total Worked</div></div>
    <div class="card g"><div class="val">+${summary.totalOvertimeHours}h</div><div class="lbl">Overtime</div></div>
    <div class="card r"><div class="val">-${summary.totalMissingHours}h</div><div class="lbl">Missing Hours</div></div></div>
    <div class="sec"><div class="tit">Weekly Hours Trend</div><div class="chart">
    <svg width="500" height="190" xmlns="http://www.w3.org/2000/svg">${bars}
    <g transform="translate(20,185)"><rect width="10" height="10" fill="#0F766E"/><text x="15" y="9" font-size="11" fill="#2E6058">Worked</text>
    <rect x="80" width="10" height="10" fill="#059669"/><text x="95" y="9" font-size="11" fill="#2E6058">Overtime</text>
    <rect x="170" width="10" height="10" fill="#DC2626" opacity="0.7"/><text x="185" y="9" font-size="11" fill="#2E6058">Missing</text></g>
    </svg></div></div>
    <div class="sec"><div class="tit">Status Breakdown</div><div class="status">
    <div class="si p"><div class="sv">${summary.statusCounts.PRESENT}</div><div class="lbl">Present</div></div>
    <div class="si l"><div class="sv">${summary.statusCounts.LATE}</div><div class="lbl">Late</div></div>
    <div class="si a"><div class="sv">${summary.statusCounts.ABSENT}</div><div class="lbl">Absent</div></div>
    <div class="si o"><div class="sv">${summary.statusCounts.ON_LEAVE}</div><div class="lbl">On Leave</div></div></div></div>
    ${summary.totalLateDays>0?`<div class="sec"><div class="tit">Late Arrivals</div><div class="late">
    <div><div class="lv">${summary.totalLateDays}</div><div class="ll">Late Days</div></div>
    <div><div class="lv">${summary.totalLateMinutes}</div><div class="ll">Total Minutes</div></div>
    <div><div class="lv">${(summary.totalLateMinutes/summary.totalLateDays).toFixed(0)}</div><div class="ll">Avg Minutes/Day</div></div>
    </div></div>`:''}<div class="ftr"><strong>MESOB HRMS</strong> - Attendance Management System<br>
    This is an automatically generated report.</div></body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  if (!summary) return null;

  return (
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:'20px 24px',boxShadow:C.shadow}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><h3 style={{margin:0,fontSize:'0.95rem',fontWeight:700,color:C.textMain,fontFamily:'Poppins,sans-serif'}}>
          Attendance Summary</h3>
          <p style={{margin:'4px 0 0',fontSize:'0.72rem',color:C.textMuted}}>Export comprehensive report with charts</p></div>
        <button onClick={exportPDF} style={{background:C.primary,color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',
          fontSize:'0.78rem',fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7,transition:'background 0.15s',
          fontFamily:'Poppins,sans-serif'}}
          onMouseEnter={e=>e.currentTarget.style.background=C.primaryHov}
          onMouseLeave={e=>e.currentTarget.style.background=C.primary}>
          <Download size={15}/>Export PDF</button></div>
      <div style={{display:'flex',gap:12,alignItems:'flex-end'}}>
        <div style={{flex:1}}><label style={{display:'block',fontSize:'0.7rem',fontWeight:600,color:C.textSub,marginBottom:6,
          textTransform:'uppercase',letterSpacing:'0.05em'}}>Period</label>
          <select value={periodType} onChange={e=>setPeriodType(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:8,
            border:`1px solid ${C.border}`,background:'#fff',fontSize:'0.8rem',color:C.textMain,cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
            <option value="weekly">Last 7 Days</option><option value="monthly">Last 30 Days</option><option value="custom">Custom Range</option>
          </select></div>
        {periodType==='custom'&&(<><div style={{flex:1}}><label style={{display:'block',fontSize:'0.7rem',fontWeight:600,color:C.textSub,
          marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Start Date</label>
          <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{width:'100%',padding:'8px 12px',
            borderRadius:8,border:`1px solid ${C.border}`,background:'#fff',fontSize:'0.8rem',color:C.textMain,fontFamily:'Poppins,sans-serif'}}/></div>
        <div style={{flex:1}}><label style={{display:'block',fontSize:'0.7rem',fontWeight:600,color:C.textSub,marginBottom:6,
          textTransform:'uppercase',letterSpacing:'0.05em'}}>End Date</label>
          <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={{width:'100%',padding:'8px 12px',
            borderRadius:8,border:`1px solid ${C.border}`,background:'#fff',fontSize:'0.8rem',color:C.textMain,fontFamily:'Poppins,sans-serif'}}/></div></>)}
      </div>
      <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        <div style={{textAlign:'center',padding:'10px',background:'rgba(15,118,110,0.05)',borderRadius:8}}>
          <div style={{fontSize:'1.2rem',fontWeight:700,color:C.primary}}>{summary.attendanceRate}%</div>
          <div style={{fontSize:'0.68rem',color:C.textMuted}}>Rate</div></div>
        <div style={{textAlign:'center',padding:'10px',background:'rgba(5,150,105,0.05)',borderRadius:8}}>
          <div style={{fontSize:'1.2rem',fontWeight:700,color:'#059669'}}>{summary.totalWorkedHours}h</div>
          <div style={{fontSize:'0.68rem',color:C.textMuted}}>Worked</div></div>
        <div style={{textAlign:'center',padding:'10px',background:'rgba(5,150,105,0.05)',borderRadius:8}}>
          <div style={{fontSize:'1.2rem',fontWeight:700,color:'#059669'}}>+{summary.totalOvertimeHours}h</div>
          <div style={{fontSize:'0.68rem',color:C.textMuted}}>Overtime</div></div>
        <div style={{textAlign:'center',padding:'10px',background:'rgba(220,38,38,0.05)',borderRadius:8}}>
          <div style={{fontSize:'1.2rem',fontWeight:700,color:'#DC2626'}}>-{summary.totalMissingHours}h</div>
          <div style={{fontSize:'0.68rem',color:C.textMuted}}>Missing</div></div>
      </div>
    </div>
  );
};

export default AttendanceSummaryReport;
