import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DepartmentApi } from '../api/departmentApi';
import { useResponsive } from '../hooks/useResponsive';
import {
  Building2, Plus, Pencil, Trash2, X,
  Users, BarChart2, UserCheck, UserX,
  CalendarDays, TrendingUp, Layers,
  ChevronDown, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useDialog } from '../context/DialogContext';
import { Can } from '../components/Can';
import OrganizationModuleHeader from '../components/ui/OrganizationModuleHeader';

/* ── Shared palette ── */
const C = {
  card:       '#EEF1F0',
  border:     'rgba(0,80,60,0.09)',
  shadow:     '0 2px 12px rgba(0,60,45,0.07)',
  primary:    '#0F766E',
  primaryHov: '#14B8A6',
  textMain:   '#1A2E2B',
  textSub:    '#1E4A42',
  textMuted:  '#2E6058',
  headerBg:   'linear-gradient(135deg,#0c1e1c,#1e3a37)',
};

const TH = {
  padding: '11px 16px', textAlign: 'left', fontSize: '0.68rem',
  color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em',
  fontWeight: 700, background: 'rgba(0,80,60,0.05)',
  borderBottom: `1px solid ${C.border}`, fontFamily: 'Poppins,sans-serif',
};
const TD = {
  padding: '12px 16px', fontSize: '0.8rem', color: C.textMain,
  borderBottom: `1px solid rgba(0,80,60,0.07)`, fontFamily: 'Poppins,sans-serif',
};
const field = {
  width: '100%', padding: '9px 13px', borderRadius: 8,
  border: `1px solid ${C.border}`, background: C.card,
  fontSize: '0.82rem', color: C.textMain, outline: 'none',
  fontFamily: 'Poppins,sans-serif', boxSizing: 'border-box',
};
const lbl = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600,
  color: C.textSub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
};

/* ── Shared atoms ── */
const GreenBtn = ({ children, onClick, disabled, type = 'button', style = {} }) => {
  const baseBg = style.background || (disabled ? '#8AADA6' : C.primary);
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ background: disabled ? '#8AADA6' : C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.78rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'Poppins,sans-serif', transition: 'background 0.15s', ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.primaryHov; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = baseBg; }}
    >{children}</button>
  );
};

const Notice = ({ type, message, onClose }) => message ? (
  <div style={{ padding: '11px 16px', borderRadius: 10, marginBottom: 16, background: type === 'error' ? 'rgba(220,38,38,0.08)' : 'rgba(15,118,110,0.1)', border: `1px solid ${type === 'error' ? 'rgba(220,38,38,0.2)' : 'rgba(15,118,110,0.2)'}`, color: type === 'error' ? '#DC2626' : C.primary, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins,sans-serif' }}>
    <span>{message}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={15} /></button>
  </div>
) : null;

/* ══════════════════════════════════════════
   EDIT DEPT MODAL — for editing only (used in Manage tab)
══════════════════════════════════════════ */
const EditDeptModal = ({ dept, onClose, onSaved, showMsg }) => {
  const [form, setForm] = useState({
    name: dept?.name || '',
    parent_uuid: dept?.parent_uuid || '',
    head_employee_uuid: dept?.head_employee_uuid || '',
  });
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [depts, setAllDepts] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const searchWrapRef = React.useRef(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Close dropdown when clicking outside the search wrapper
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const h = { Authorization: `Bearer ${token}` };
    // Only load employees that belong to THIS department for editing
    const empUrl = dept?.uuid
      ? `/api/employees?status=ACTIVE&department_uuid=${encodeURIComponent(dept.uuid)}&limit=300`
      : '/api/employees?status=ACTIVE&limit=300';
    Promise.all([
      fetch(empUrl, { headers: h }).then(r => r.json()),
      fetch('/api/departments', { headers: h }).then(r => r.json()),
    ]).then(([eRes, dRes]) => {
      setEmployees(eRes?.data || []);
      setAllDepts((dRes?.data || []).filter(d => d.uuid !== dept?.uuid));
    }).catch(() => {});
  }, [dept?.uuid]);

  const filteredEmps = empSearch
    ? employees.filter(e => `${e.first_name} ${e.middle_name || ''} ${e.last_name} ${e.mesob_id}`.toLowerCase().includes(empSearch.toLowerCase()))
    : employees;

  const selectedEmp = employees.find(e => e.uuid === form.head_employee_uuid);

  const selectEmployee = (emp) => {
    set('head_employee_uuid', emp.uuid);
    setEmpSearch('');
    setDropOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {
        name: form.name,
        ...(form.parent_uuid        ? { parent_uuid:        form.parent_uuid        } : { parent_uuid:        null }),
        ...(form.head_employee_uuid ? { head_employee_uuid: form.head_employee_uuid } : { head_employee_uuid: null }),
      };
      await DepartmentApi.update(dept.uuid, body);
      showMsg('success', 'Department updated.');
      onSaved();
    } catch (err) { showMsg('error', err.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textMain }}>Edit Department</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Department Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required style={field}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e  => e.target.style.borderColor = C.border} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Parent Department <span style={{ color: C.textMuted, fontWeight: 400, fontSize: '0.68rem' }}>(optional)</span></label>
            <select value={form.parent_uuid} onChange={e => set('parent_uuid', e.target.value)} style={field}>
              <option value="">Root Department (no parent)</option>
              {depts.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={lbl}>Head Employee <span style={{ color: C.textMuted, fontWeight: 400, fontSize: '0.68rem' }}>(optional)</span></label>

            {/* Selected employee chip */}
            {selectedEmp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '7px 12px', background: 'rgba(15,118,110,0.08)', borderRadius: 8, border: `1px solid ${C.primary}` }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.primary, flex: 1 }}>
                  ✓ {selectedEmp.first_name} {selectedEmp.middle_name} {selectedEmp.last_name} — {selectedEmp.mesob_id}
                </span>
                <button type="button" onClick={() => { set('head_employee_uuid', ''); setEmpSearch(''); setDropOpen(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: '0.7rem', fontWeight: 600, padding: '2px 4px' }}>
                  ✕ Clear
                </button>
              </div>
            )}

            {/* Search input + dropdown — wrapped in ref div for outside-click detection */}
            <div ref={searchWrapRef} style={{ position: 'relative' }}>
              <input
                value={empSearch}
                onChange={e => { setEmpSearch(e.target.value); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)}
                placeholder={selectedEmp ? 'Search to change…' : 'Search employees in this department…'}
                style={{ ...field }}
              />
              {dropOpen && empSearch && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 2 }}>
                  {filteredEmps.length === 0 ? (
                    <div style={{ padding: '10px 14px', fontSize: '0.78rem', color: C.textMuted }}>No employees found.</div>
                  ) : (
                    filteredEmps.slice(0, 20).map(e => (
                      <button
                        key={e.uuid}
                        type="button"
                        onMouseDown={ev => { ev.preventDefault(); selectEmployee(e); }}
                        style={{ width: '100%', padding: '9px 14px', textAlign: 'left', border: 'none', background: form.head_employee_uuid === e.uuid ? 'rgba(15,118,110,0.1)' : 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: C.textMain, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(15,118,110,0.07)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = form.head_employee_uuid === e.uuid ? 'rgba(15,118,110,0.1)' : 'transparent'}
                      >
                        <span style={{ fontWeight: form.head_employee_uuid === e.uuid ? 700 : 400 }}>
                          {e.first_name} {e.middle_name} {e.last_name}
                        </span>
                        <span style={{ color: C.textMuted, fontSize: '0.72rem' }}>{e.mesob_id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSub, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Update'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   OVERVIEW HELPERS
══════════════════════════════════════════ */

/* ── Department card ── */
const DeptCard = ({ dept, posCount }) => {
  const total    = Number(dept.member_count     || 0);
  const male     = Number(dept.male_count       || 0);
  const female   = Number(dept.female_count     || 0);
  const positions= Number(dept.position_count   || posCount || 0);
  const filled   = Number(dept.filled_positions || 0);
  const vacant   = Math.max(0, positions - filled);
  const fillPct  = positions > 0 ? Math.round((filled / positions) * 100) : 0;

  return (
    <div style={{
      background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
      boxShadow: C.shadow, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'box-shadow 0.15s, transform 0.15s', fontFamily: 'Poppins,sans-serif',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,60,45,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={17} color={C.primary} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: C.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</p>
            {dept.head_employee_name
              ? <p style={{ margin: '2px 0 0', fontSize: '0.69rem', color: C.primary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {dept.head_employee_name}</p>
              : <p style={{ margin: '2px 0 0', fontSize: '0.69rem', color: '#9ca3af', fontStyle: 'italic' }}>No head assigned</p>}
          </div>
        </div>
        {dept.parent_name && (
          <span style={{ fontSize: '0.63rem', color: C.textMuted, background: 'rgba(0,80,60,0.06)', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {dept.parent_name}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `rgba(0,80,60,0.07)` }} />

      {/* Employee counts */}
      <div>
        <p style={{ margin: '0 0 7px', fontSize: '0.67rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employees</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'rgba(15,118,110,0.07)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid rgba(15,118,110,0.12)' }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: C.primary }}>{total}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: C.textMuted, fontWeight: 600 }}>Total</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(37,99,235,0.07)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid rgba(37,99,235,0.12)' }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#2563EB' }}>{male}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: '#2563EB', fontWeight: 600 }}>♂ Male</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(219,39,119,0.07)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid rgba(219,39,119,0.12)' }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#BE185D' }}>{female}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: '#BE185D', fontWeight: 600 }}>♀ Female</p>
          </div>
        </div>
      </div>

      {/* Position counts */}
      <div>
        <p style={{ margin: '0 0 7px', fontSize: '0.67rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Positions</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'rgba(15,118,110,0.07)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid rgba(15,118,110,0.12)' }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: C.primary }}>{positions}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: C.primary, fontWeight: 600 }}>Total</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(5,150,105,0.07)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid rgba(5,150,105,0.12)' }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>{filled}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: '#059669', fontWeight: 600 }}>Filled</p>
          </div>
          <div style={{ flex: 1, background: vacant > 0 ? 'rgba(180,83,9,0.07)' : 'rgba(0,80,60,0.04)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: `1px solid ${vacant > 0 ? 'rgba(180,83,9,0.18)' : 'rgba(0,80,60,0.08)'}` }}>
            <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: vacant > 0 ? '#B45309' : '#9ca3af' }}>{vacant}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: vacant > 0 ? '#B45309' : '#9ca3af', fontWeight: 600 }}>Vacant</p>
          </div>
        </div>
      </div>

      {/* Fill rate bar */}
      {positions > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.65rem', color: C.textMuted }}>Fill rate</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: fillPct >= 80 ? '#059669' : fillPct >= 50 ? C.primary : '#D97706' }}>{fillPct}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,80,60,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fillPct}%`, borderRadius: 99, background: fillPct >= 80 ? '#059669' : fillPct >= 50 ? C.primary : '#D97706', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Recursive interactive org-tree node ── */
const OrgNode = ({ node, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 24;

  const total     = Number(node.member_count     || 0);
  const positions = Number(node.position_count   || 0);

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        title={`${node.name}${node.head_employee_name ? ' · ' + node.head_employee_name : ''} · ${total} employees · ${positions} positions`}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px 8px', marginLeft: indent,
          borderRadius: 10, cursor: hasChildren ? 'pointer' : 'default',
          transition: 'background 0.13s',
          borderLeft: depth > 0 ? `3px solid rgba(15,118,110,${0.15 + depth * 0.08})` : 'none',
          marginBottom: 2,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Toggle arrow */}
        <span style={{ width: 18, flexShrink: 0, color: C.textMuted, display: 'flex', alignItems: 'center' }}>
          {hasChildren
            ? (open ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />)
            : <span style={{ width: 14, display: 'inline-block' }} />}
        </span>

        {/* Icon */}
        <div style={{
          width: depth === 0 ? 32 : 26, height: depth === 0 ? 32 : 26,
          borderRadius: depth === 0 ? 9 : 7,
          background: depth === 0 ? 'rgba(15,118,110,0.15)' : `rgba(15,118,110,${0.06 + depth * 0.03})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Building2 size={depth === 0 ? 15 : 12} color={C.primary} />
        </div>

        {/* Name + head */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: depth === 0 ? '0.85rem' : '0.8rem', fontWeight: depth === 0 ? 700 : 500, color: C.textMain }}>
            {node.name}
          </span>
          {node.head_employee_name && (
            <span style={{ marginLeft: 8, fontSize: '0.67rem', color: C.primary, background: 'rgba(15,118,110,0.08)', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>
              {node.head_employee_name}
            </span>
          )}
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMuted, background: 'rgba(0,80,60,0.06)', borderRadius: 99, padding: '2px 8px' }}>
            {total} emp
          </span>
          {positions > 0 && (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: C.primary, background: 'rgba(15,118,110,0.1)', borderRadius: 99, padding: '2px 8px' }}>
              {positions} pos
            </span>
          )}
          {hasChildren && (
            <span style={{ fontSize: '0.63rem', color: C.textMuted, background: 'rgba(0,80,60,0.04)', borderRadius: 99, padding: '2px 7px' }}>
              {node.children.length} sub
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div style={{ borderLeft: `2px solid rgba(15,118,110,0.1)`, marginLeft: indent + 24, marginBottom: 4 }}>
          {node.children.map(child => <OrgNode key={child.uuid} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   VIEW 1 — DEPARTMENTS OVERVIEW
   Department-focused analytics dashboard
══════════════════════════════════════════ */
const DepartmentsOverview = ({ activeTab, onTabChange }) => {
  const { isMobile, isTablet, r } = useResponsive();
  const [depts,       setDepts]       = useState([]);
  const [tree,        setTree]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('authToken');
      const h = { Authorization: `Bearer ${token}` };
      const [flatRes, treeRes] = await Promise.allSettled([
        fetch('/api/departments',           { headers: h }).then(r => r.json()),
        fetch('/api/departments?tree=true', { headers: h }).then(r => r.json()),
      ]);
      if (flatRes.status === 'fulfilled') setDepts(flatRes.value?.data || []);
      else setError('Failed to load department data.');
      if (treeRes.status === 'fulfilled') setTree(treeRes.value?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Derived stats ── */
  const total          = depts.length;
  const withHead       = depts.filter(d => d.head_employee_uuid).length;
  const withoutHead    = total - withHead;
  const totalEmp       = depts.reduce((s, d) => s + Number(d.member_count     || 0), 0);
  const totalPositions = depts.reduce((s, d) => s + Number(d.position_count   || 0), 0);
  const totalFilled    = depts.reduce((s, d) => s + Number(d.filled_positions || 0), 0);
  const totalVacant    = Math.max(0, totalPositions - totalFilled);

  /* recently created */
  const recent = depts.reduce((b, d) => (!b || new Date(d.created_at) > new Date(b.created_at)) ? d : b, null);
  const fmtDate = d => {
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d || '—'; }
  };

  /* search filter for card grid */
  const filteredDepts = search
    ? depts.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.head_employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.parent_name        || '').toLowerCase().includes(search.toLowerCase())
      )
    : depts;

  /* pagination — reset to page 1 whenever search or rowsPerPage changes */
  const totalRecords = filteredDepts.length;
  const totalPages   = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const safePage     = Math.min(page, totalPages);
  const rangeStart   = totalRecords === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const rangeEnd     = Math.min(safePage * rowsPerPage, totalRecords);
  const paginated    = filteredDepts.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // Keep page in bounds when filters change
  useEffect(() => { setPage(1); }, [search, rowsPerPage]);

  /* metric cards — teal/emerald/amber palette matching HRMS branding */
  const metrics = [
    { label: 'Total Departments', value: total,       icon: <Building2 size={24} />, bg: 'linear-gradient(135deg,#0F766E,#14B8A6)', light: 'rgba(15,118,110,0.22)'  },
    { label: 'Heads Assigned',    value: withHead,    icon: <UserCheck size={24} />, bg: 'linear-gradient(135deg,#059669,#34D399)', light: 'rgba(5,150,105,0.20)'   },
    { label: 'No Head Assigned',  value: withoutHead, icon: <UserX     size={24} />, bg: 'linear-gradient(135deg,#B45309,#D97706)', light: 'rgba(180,83,9,0.18)'    },
    { label: 'Total Employees',   value: totalEmp,    icon: <Users     size={24} />, bg: 'linear-gradient(135deg,#0c1e1c,#1e3a37)', light: 'rgba(15,118,110,0.16)'  },
  ];

  const navTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'add', label: 'Add Department' },
    { key: 'manage', label: 'Manage' },
  ];

  const subtitle = loading 
    ? 'Loading…' 
    : `${total} departments · ${totalEmp} employees · ${totalPositions} positions · ${totalVacant} vacant`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Poppins,sans-serif' }}>

      {/* Shared Module Header */}
      <OrganizationModuleHeader
        moduleName="Departments"
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={navTabs}
        subtitle={subtitle}
        action={
          <button onClick={load}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(232,240,238,0.22)', background: 'rgba(232,240,238,0.08)', color: '#E8F0EE', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap' }}>
            ↻ Refresh
          </button>
        }
      />

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.82rem' }}>{error}</div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: r(14,12,10) }}>
        {metrics.map(({ label, value, icon, bg, light }) => (
          <div key={label} style={{ background: bg, borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: `0 6px 20px ${light}` }}>
            <div>
              <p style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{loading ? '…' : value}</p>
              <p style={{ margin: '5px 0 0', fontSize: '0.74rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{label}</p>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)' }}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
        {[
          { label: 'Total Positions',  value: totalPositions, color: C.primary,  bg: 'rgba(15,118,110,0.07)', border: 'rgba(15,118,110,0.15)' },
          { label: 'Filled Positions', value: totalFilled,    color: '#059669',  bg: 'rgba(5,150,105,0.07)',  border: 'rgba(5,150,105,0.15)'  },
          { label: 'Vacant Positions', value: totalVacant,    color: totalVacant > 0 ? '#B45309' : '#9ca3af', bg: totalVacant > 0 ? 'rgba(180,83,9,0.07)' : 'rgba(0,0,0,0.03)', border: totalVacant > 0 ? 'rgba(180,83,9,0.18)' : 'rgba(0,0,0,0.08)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, borderRadius: 12, border: `1px solid ${border}`, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: C.textMuted, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{loading ? '…' : value}</span>
          </div>
        ))}
      </div>

      {/* Recently created */}
      {!loading && recent && (
        <div style={{ background: 'rgba(15,118,110,0.07)', borderRadius: 12, border: '1px solid rgba(15,118,110,0.18)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarDays size={18} color={C.primary} />
          <span style={{ fontSize: '0.78rem', color: C.textMuted }}>Most recently created department:</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.textMain }}>{recent.name}</span>
          <span style={{ fontSize: '0.75rem', color: C.primary, marginLeft: 'auto' }}>{fmtDate(recent.created_at)}</span>
        </div>
      )}

      {/* ── Department cards grid ── */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color={C.primary} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: C.textMain }}>Department Workforce Breakdown</h3>
              <p style={{ margin: '1px 0 0', fontSize: '0.71rem', color: C.textMuted }}>Employees · gender split · position fill rate per department</p>
            </div>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search departments…"
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.78rem', color: C.textMain, background: '#fff', outline: 'none', fontFamily: 'Poppins,sans-serif', width: 200 }}
            onFocus={e => e.target.style.borderColor = C.primary}
            onBlur={e  => e.target.style.borderColor = C.border}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.textMuted, fontSize: '0.85rem' }}>
            <div style={{ width: 32, height: 32, border: `3px solid rgba(15,118,110,0.15)`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'dSpin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes dSpin{to{transform:rotate(360deg)}}`}</style>
            Loading department data…
          </div>
        ) : filteredDepts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.textMuted, fontSize: '0.82rem' }}>
            <Building2 size={36} color="rgba(15,118,110,0.2)" style={{ marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 600, color: C.textMain }}>No departments found.</p>
            {search && <p style={{ margin: '5px 0 0', fontSize: '0.76rem' }}>Try a different search term.</p>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {paginated.map(d => <DeptCard key={d.uuid} dept={d} />)}
          </div>
        )}

        {/* ── Pagination footer ── */}
        {!loading && filteredDepts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>

            {/* Rows-per-page selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', color: C.textMuted, fontFamily: 'Poppins,sans-serif' }}>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={e => setRowsPerPage(Number(e.target.value))}
                style={{ border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem', color: C.textMain, background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}
              >
                {[6, 12, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Range indicator */}
            <span style={{ fontSize: '0.75rem', color: C.textMuted, fontFamily: 'Poppins,sans-serif' }}>
              {rangeStart}–{rangeEnd} of {totalRecords} departments
            </span>

            {/* Prev / page / Next */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{ padding: '5px 14px', borderRadius: 7, border: `1px solid ${C.border}`, background: safePage === 1 ? 'rgba(0,80,60,0.04)' : '#fff', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 600, color: safePage === 1 ? C.textMuted : C.primary, fontFamily: 'Poppins,sans-serif', display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.15s' }}
                onMouseEnter={e => { if (safePage !== 1) e.currentTarget.style.background = 'rgba(15,118,110,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = safePage === 1 ? 'rgba(0,80,60,0.04)' : '#fff'; }}
              >
                ‹ Previous
              </button>

              <span style={{ padding: '5px 14px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'rgba(15,118,110,0.06)', fontSize: '0.75rem', fontWeight: 600, color: C.primary, fontFamily: 'Poppins,sans-serif', minWidth: 90, textAlign: 'center' }}>
                Page {safePage} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{ padding: '5px 14px', borderRadius: 7, border: `1px solid ${C.border}`, background: safePage === totalPages ? 'rgba(0,80,60,0.04)' : '#fff', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 600, color: safePage === totalPages ? C.textMuted : C.primary, fontFamily: 'Poppins,sans-serif', display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.15s' }}
                onMouseEnter={e => { if (safePage !== totalPages) e.currentTarget.style.background = 'rgba(15,118,110,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = safePage === totalPages ? 'rgba(0,80,60,0.04)' : '#fff'; }}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={15} color={C.primary} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: C.textMain }}>Organisational Hierarchy</h3>
            <p style={{ margin: '1px 0 0', fontSize: '0.71rem', color: C.textMuted }}>
              Department parent-child structure · click any row to expand / collapse · hover for tooltip
            </p>
          </div>
        </div>
        <div style={{ padding: '12px 8px 8px', maxHeight: 520, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ color: C.textMuted, fontSize: '0.82rem', textAlign: 'center', padding: '32px 0' }}>Loading…</div>
          ) : tree.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: '0.82rem', textAlign: 'center', padding: '32px 0' }}>
              No department hierarchy has been configured.
            </div>
          ) : (
            tree.map(root => <OrgNode key={root.uuid} node={root} depth={0} />)
          )}
        </div>
      </div>

    </div>
  );
};

/* ══════════════════════════════════════════
   VIEW 2 — DEPARTMENTS MANAGE
══════════════════════════════════════════ */
const DepartmentsManage = ({ activeTab, onTabChange }) => {
  const { isMobile, isTablet } = useResponsive();
  const dialog = useDialog();
  const [depts,    setDepts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [notice,   setNotice]   = useState({ type: '', message: '' });
  const [editDept, setEditDept] = useState(null);
  const [deleting, setDeleting] = useState('');
  const [search,   setSearch]   = useState('');

  const showMsg = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice({ type: '', message: '' }), 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await DepartmentApi.list(); setDepts(r?.data || []); }
    catch (e) { showMsg('error', e.message || 'Failed to load departments.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (uuid) => {
    dialog.showDeleteConfirm(
      'Are you sure you want to delete this department? This action cannot be undone.',
      async () => {
        setDeleting(uuid);
        try {
          await DepartmentApi.delete(uuid);
          showMsg('success', 'Department deleted.');
          load();
        } catch (e) {
          showMsg('error', e.message || 'Failed.');
        } finally {
          setDeleting('');
        }
      },
      {
        title: 'Delete Department',
        confirmText: 'Delete',
      }
    );
  };

  const filtered = search
    ? depts.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.head_employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.parent_name        || '').toLowerCase().includes(search.toLowerCase())
      )
    : depts;

  const navTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'add', label: 'Add Department' },
    { key: 'manage', label: 'Manage' },
  ];

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type: '', message: '' })} />

      {/* Shared Module Header */}
      <OrganizationModuleHeader
        moduleName="Departments"
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={navTabs}
        subtitle={`${depts.length} departments`}
      />

      {/* Search + refresh */}
      <div style={{ display: 'flex', gap: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, head employee, or parent department…"
          style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.82rem', color: C.textMain, background: C.card, outline: 'none', fontFamily: 'Poppins,sans-serif' }}
          onFocus={e => e.target.style.borderColor = C.primary}
          onBlur={e  => e.target.style.borderColor = C.border}
        />
        <button onClick={load}
          style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', color: C.primary, fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Head Employee', 'Parent', 'Created', 'Actions'].map((h, i) => (
                <th key={h} style={{ ...TH, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', padding: 48, color: C.textMuted }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', padding: 48, color: C.textMuted }}>
                {search ? `No departments matching "${search}".` : 'No departments found.'}
              </td></tr>
            ) : filtered.map((d, i) => (
              <tr key={d.uuid || i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,80,60,0.02)' }}>
                <td style={TD}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={15} color={C.primary} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                  </div>
                </td>
                <td style={{ ...TD, color: C.textMuted, fontSize: '0.75rem' }}>
                  {d.head_employee_name
                    ? <span style={{ fontWeight: 600, color: C.textMain }}>{d.head_employee_name}</span>
                    : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No Head Assigned</span>}
                </td>
                <td style={{ ...TD, color: C.textMuted, fontSize: '0.75rem' }}>
                  {d.parent_name
                    ? d.parent_name
                    : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Root Department</span>}
                </td>
                <td style={{ ...TD, color: C.textMuted, fontSize: '0.75rem' }}>{d.created_at?.slice(0, 10) || '—'}</td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <Can action="update" resource="departments">
                      <button onClick={() => setEditDept(d)} title="Edit"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, padding: 5, borderRadius: 6, display: 'flex', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Pencil size={15} />
                      </button>
                    </Can>
                    <Can action="delete" resource="departments">
                      <button onClick={() => handleDelete(d.uuid)} disabled={deleting === d.uuid} title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 5, borderRadius: 6, display: 'flex', opacity: deleting === d.uuid ? 0.5 : 1, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: C.textMuted, margin: 0 }}>
          {filtered.length} department{filtered.length !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}
        </p>
      )}

      {editDept && <EditDeptModal dept={editDept} onClose={() => setEditDept(null)} onSaved={() => { setEditDept(null); load(); }} showMsg={showMsg} />}
    </div>
  );
};

/* ══════════════════════════════════════════
   VIEW 3 — ADD DEPARTMENT
   Quick-add form for new departments
══════════════════════════════════════════ */
const AddDepartmentView = ({ activeTab, onTabChange }) => {
  const { isMobile, isTablet } = useResponsive();
  const [form, setForm] = useState({
    name: '',
    parent_uuid: '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [depts, setAllDepts] = useState([]);
  
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const showMsg = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice({ type: '', message: '' }), 4500);
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const h = { Authorization: `Bearer ${token}` };
    fetch('/api/departments', { headers: h })
      .then(r => r.json())
      .then(dRes => setAllDepts(dRes?.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showMsg('error', 'Department name is required.');
      return;
    }
    
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        ...(form.parent_uuid ? { parent_uuid: form.parent_uuid } : { parent_uuid: null }),
      };
      await DepartmentApi.create(body);
      showMsg('success', `Department "${form.name}" created successfully!`);
      // Reset form
      setForm({ name: '', parent_uuid: '' });
    } catch (err) {
      showMsg('error', err.message || 'Failed to create department.');
    } finally {
      setSaving(false);
    }
  };

  const navTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'add', label: 'Add Department' },
    { key: 'manage', label: 'Manage' },
  ];

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type: '', message: '' })} />

      {/* Shared Module Header */}
      <OrganizationModuleHeader
        moduleName="Departments"
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={navTabs}
        subtitle="Create a new department in your organization"
      />

      {/* Form Card */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Department Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              placeholder="e.g., Human Resources"
              style={field}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Parent Department <span style={{ color: C.textMuted, fontWeight: 400, fontSize: '0.68rem' }}>(optional)</span></label>
            <select value={form.parent_uuid} onChange={e => set('parent_uuid', e.target.value)} style={field}>
              <option value="">Root Department (no parent)</option>
              {depts.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <button
              type="button"
              onClick={() => setForm({ name: '', parent_uuid: '' })}
              style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSub, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}
            >
              Clear Form
            </button>
            <GreenBtn type="submit" disabled={saving}>
              {saving ? 'Creating…' : <><Plus size={15} /> Create Department</>}
            </GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   ROOT — DepartmentsPage (Tabbed Interface)
══════════════════════════════════════════ */
const DepartmentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/departments/add') return 'add';
    if (path === '/departments/manage') return 'manage';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Handle tab change
  const handleTabChange = (tabKey) => {
    const paths = {
      overview: '/departments',
      add: '/departments/add',
      manage: '/departments/manage',
    };
    navigate(paths[tabKey]);
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'add':
        return <AddDepartmentView activeTab={activeTab} onTabChange={handleTabChange} />;
      case 'manage':
        return <DepartmentsManage activeTab={activeTab} onTabChange={handleTabChange} />;
      default:
        return <DepartmentsOverview activeTab={activeTab} onTabChange={handleTabChange} />;
    }
  };

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif' }}>
      {renderContent()}
    </div>
  );
};

export default DepartmentsPage;
