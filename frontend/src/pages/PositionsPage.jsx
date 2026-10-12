import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase, Building2, Users, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, History,
  Plus, Pencil, Trash2, X, Calendar, Award,
} from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';
import { useDialog } from '../context/DialogContext';
import { apiRequest } from '../utils/apiClient';
import { Can } from '../components/Can';
import OrganizationModuleHeader from '../components/ui/OrganizationModuleHeader';

/* ── Palette ── */
const C = {
  page:       '#C5CECC',
  card:       '#EEF1F0',
  cardBorder: 'rgba(0,80,60,0.09)',
  shadow:     '0 2px 12px rgba(0,60,45,0.07)',
  primary:    '#0F766E',
  primaryHov: '#14B8A6',
  textMain:   '#1A2E2B',
  textSub:    '#1E4A42',
  textMuted:  '#2E6058',
  border:     'rgba(0,80,60,0.12)',
  headerBg:   'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const PositionApi = {
  list:    ()           => apiRequest('/positions'),
  getOne:  (uuid)       => apiRequest(`/positions/${encodeURIComponent(uuid)}`),
  create:  (body)       => apiRequest('/positions', { method: 'POST', body: JSON.stringify(body) }),
  update:  (uuid, body) => apiRequest(`/positions/${encodeURIComponent(uuid)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:  (uuid)       => apiRequest(`/positions/${encodeURIComponent(uuid)}`, { method: 'DELETE' }),
};

const DeptApi = {
  list: () => apiRequest('/departments'),
};

/* ── Shared atoms ── */
const GreenBtn = ({ children, onClick, disabled, type = 'button', style = {} }) => (
  <button type={type} onClick={onClick} disabled={disabled}
    style={{ background: disabled ? '#8AADA6' : C.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.78rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'Poppins,sans-serif', transition: 'background 0.15s', ...style }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.primaryHov; }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = (disabled ? '#8AADA6' : C.primary); }}
  >{children}</button>
);

const Notice = ({ type, message, onClose }) => message ? (
  <div style={{ padding: '11px 16px', borderRadius: 10, marginBottom: 16, background: type === 'error' ? 'rgba(220,38,38,0.08)' : 'rgba(15,118,110,0.1)', border: `1px solid ${type === 'error' ? 'rgba(220,38,38,0.2)' : 'rgba(15,118,110,0.2)'}`, color: type === 'error' ? '#DC2626' : C.primary, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins,sans-serif' }}>
    <span>{message}</span>
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={15} /></button>
  </div>
) : null;

const PageHeader = ({ title, subtitle }) => (
  <div style={{ background: C.headerBg, borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
    <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#E8F0EE', fontFamily: 'Poppins,sans-serif' }}>{title}</h1>
    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(232,240,238,0.6)', fontFamily: 'Poppins,sans-serif' }}>{subtitle}</p>
  </div>
);

/* ══════════════════════════════════════════
   POSITION CARD (for Overview)
══════════════════════════════════════════ */
const PositionCard = ({ pos }) => (
  <div style={{
    background: C.card, borderRadius: 12, border: `1px solid ${C.cardBorder}`,
    boxShadow: C.shadow, padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 8,
    transition: 'transform 0.15s, box-shadow 0.15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,60,45,0.13)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = C.shadow; }}
  >
    {/* Top row */}
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: 'rgba(15,118,110,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Briefcase size={16} color={C.primary} />
      </div>
      <span style={{
        background: 'rgba(15,118,110,0.12)', color: C.primary,
        border: '1px solid rgba(15,118,110,0.25)',
        borderRadius: 99, padding: '2px 9px', fontSize: '0.65rem', fontWeight: 700,
      }}>
        Active
      </span>
    </div>

    {/* Name */}
    <div>
      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: C.textMain }}>{pos.title}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
        <Building2 size={11} color={C.textMuted} />
        <span style={{ fontSize: '0.72rem', color: C.textMuted }}>{pos.department_name || '—'}</span>
      </div>
    </div>

    {/* Total */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <Users size={12} color={C.textSub} />
      <span style={{ fontSize: '0.72rem', color: C.textSub, fontWeight: 600 }}>{pos.total_employees || 0} Total</span>
    </div>

    {/* Footer — gender pills */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <span style={{
        background: 'rgba(15,118,110,0.1)', color: C.primary,
        border: '1px solid rgba(15,118,110,0.22)',
        borderRadius: 99, padding: '2px 9px', fontSize: '0.65rem', fontWeight: 700,
      }}>
        ♂ {pos.male_count || 0}M
      </span>
      <span style={{
        background: 'rgba(5,150,105,0.1)', color: '#059669',
        border: '1px solid rgba(5,150,105,0.22)',
        borderRadius: 99, padding: '2px 9px', fontSize: '0.65rem', fontWeight: 700,
      }}>
        ♀ {pos.female_count || 0}F
      </span>
    </div>
  </div>
);

/* ══════════════════════════════════════════
   POSITION ROW WITH INLINE EXPANDABLE DETAILS (for Management)
══════════════════════════════════════════ */
const PositionRow = ({ pos, expanded, onToggle, onEdit, onDelete }) => {
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');

  useEffect(() => {
    if (expanded && !details) {
      setLoadingDetails(true);
      PositionApi.getOne(pos.uuid)
        .then(r => setDetails(r?.data || null))
        .catch(() => {})
        .finally(() => setLoadingDetails(false));
    }
  }, [expanded, pos.uuid, details]);

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return d; }
  };

  const vacant = details ? Math.max(0, 1 - (details.total_employees || 0)) : 0;

  return (
    <>
      {/* Main row */}
      <tr style={{ background: 'rgba(0,80,60,0.02)', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
        onClick={onToggle}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,80,60,0.02)'}
      >
        <td style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {expanded ? <ChevronUp size={16} color={C.primary} /> : <ChevronDown size={16} color={C.textMuted} />}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={15} color={C.primary} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.textMain }}>{pos.title}</div>
            <div style={{ fontSize: '0.7rem', color: C.textMuted, marginTop: 1 }}>{pos.department_name || '—'}</div>
          </div>
        </td>
        <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: C.textSub }}>{pos.grade || '—'}</td>
        <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: C.textMain }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'rgba(15,118,110,0.1)', color: C.primary, border: '1px solid rgba(15,118,110,0.22)', borderRadius: 99, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
              {pos.total_employees || 0} Total
            </span>
          </div>
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <Can action="update" resource="positions">
              <button onClick={() => onEdit(pos)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Pencil size={15} color={C.primary} />
              </button>
            </Can>
            <Can action="delete" resource="positions">
              <button onClick={() => onDelete(pos)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Trash2 size={15} color="#DC2626" />
              </button>
            </Can>
          </div>
        </td>
      </tr>

      {/* Expanded details */}
      {expanded && (
        <tr>
          <td colSpan={4} style={{ padding: 0, background: '#fff', borderBottom: `2px solid ${C.border}` }}>
            <div style={{ padding: '20px 24px', borderLeft: `4px solid ${C.primary}` }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.textMuted, fontSize: '0.82rem' }}>Loading details...</div>
              ) : details ? (
                <>
                  {/* Tab navigation */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                    {[['overview', 'Overview'], ['employees', `Employees (${details.total_employees || 0})`], ['history', 'History']].map(([key, label]) => (
                      <button key={key} onClick={() => setDetailTab(key)}
                        style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: detailTab === key ? 700 : 500, color: detailTab === key ? C.primary : C.textMuted, borderBottom: detailTab === key ? `2.5px solid ${C.primary}` : '2.5px solid transparent', fontFamily: 'Poppins,sans-serif', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div style={{ fontFamily: 'Poppins,sans-serif' }}>
                    {/* Overview Tab */}
                    {detailTab === 'overview' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: C.textMuted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Position Information</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.75rem', color: C.textMuted, minWidth: 100 }}>Position ID:</span>
                              <span style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 500 }}>{details.uuid}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.75rem', color: C.textMuted, minWidth: 100 }}>Title:</span>
                              <span style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 600 }}>{details.title}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.75rem', color: C.textMuted, minWidth: 100 }}>Department:</span>
                              <span style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 500 }}>{details.department_name || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.75rem', color: C.textMuted, minWidth: 100 }}>Grade:</span>
                              <span style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 500 }}>{details.grade || 'Not specified'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.75rem', color: C.textMuted, minWidth: 100 }}>Created:</span>
                              <span style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 500 }}>{fmtDate(details.created_at)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.75rem', color: C.textMuted, minWidth: 100 }}>Last Updated:</span>
                              <span style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 500 }}>{fmtDate(details.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: C.textMuted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Statistics</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                              { label: 'Total Employees', value: details.total_employees || 0, color: C.primary, bg: 'rgba(15,118,110,0.08)' },
                              { label: 'Male', value: details.male_count || 0, color: C.primary, bg: 'rgba(15,118,110,0.06)' },
                              { label: 'Female', value: details.female_count || 0, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
                              { label: 'Vacant', value: vacant, color: vacant > 0 ? '#B45309' : '#6b7280', bg: vacant > 0 ? 'rgba(180,83,9,0.08)' : '#f9fafb' },
                            ].map(({ label, value, color, bg }) => (
                              <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 600, color, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Employees Tab */}
                    {detailTab === 'employees' && (
                      <div>
                        {!details.employees?.length ? (
                          <div style={{ textAlign: 'center', padding: '32px 0', color: C.textMuted, fontSize: '0.82rem' }}>No employees assigned to this position.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {details.employees.map((e, i) => (
                              <div key={e.uuid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: i % 2 === 0 ? '#f9fafb' : '#fff', borderRadius: 8, border: `1px solid ${C.border}` }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.headerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>
                                    {e.first_name?.[0]}{e.last_name?.[0]}
                                  </span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.textMain }}>{e.title} {e.first_name} {e.last_name}</div>
                                  <div style={{ fontSize: '0.72rem', color: C.textMuted, marginTop: 1 }}>{e.mesob_id} · {e.department_name}</div>
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: C.primary, background: 'rgba(15,118,110,0.1)', border: '1px solid rgba(15,118,110,0.22)', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>ACTIVE</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* History Tab */}
                    {detailTab === 'history' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Position Created', date: fmtDate(details.created_at), desc: `Position "${details.title}" was created in ${details.department_name}.`, icon: '➕' },
                          { label: 'Last Modified', date: fmtDate(details.updated_at), desc: 'Position details were last updated.', icon: '✏️' },
                        ].map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: `1px solid ${C.border}` }}>
                            <span style={{ fontSize: '1.2rem', flexShrink: 0, paddingTop: 2 }}>{item.icon}</span>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.textMain }}>{item.label}</div>
                              <div style={{ fontSize: '0.72rem', color: C.textMuted, marginTop: 2 }}>{item.date}</div>
                              <div style={{ fontSize: '0.78rem', color: C.textSub, marginTop: 4 }}>{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#DC2626', fontSize: '0.82rem' }}>Failed to load details.</div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

/* ══════════════════════════════════════════
   POSITION MODAL (Create/Edit)
══════════════════════════════════════════ */
const PositionModal = ({ position, deptList, onClose, onSaved, showMsg }) => {
  const editing = !!position?.uuid;
  const [form, setForm] = useState({
    title: position?.title || '',
    department_uuid: position?.department_uuid || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.department_uuid) return;
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        department_uuid: form.department_uuid,
      };
      if (editing) {
        await PositionApi.update(position.uuid, body);
        showMsg('success', 'Position updated successfully.');
      } else {
        await PositionApi.create(body);
        showMsg('success', 'Position created successfully.');
      }
      onSaved();
    } catch (err) {
      showMsg('error', err.message || 'Failed to save position.');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 8, border: `1px solid ${C.border}`,
    background: C.card, fontSize: '0.82rem', color: C.textMain, outline: 'none',
    fontFamily: 'Poppins,sans-serif', boxSizing: 'border-box',
  };
  const lbl = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: C.textSub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textMain }}>{editing ? 'Edit Position' : 'Create Position'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Department *</label>
            <select value={form.department_uuid} onChange={e => set('department_uuid', e.target.value)} required style={{ ...fieldStyle, cursor: 'pointer' }}>
              <option value="">Select Department</option>
              {deptList.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={lbl}>Position Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required style={fieldStyle} placeholder="Position Title" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSub, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   POSITIONS OVERVIEW (Cards View)
══════════════════════════════════════════ */
const PositionsOverview = ({ activeTab, onTabChange }) => {
  const { isMobile, isTablet, r } = useResponsive();
  const [positions, setPositions] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [pRes, dRes] = await Promise.allSettled([PositionApi.list(), DeptApi.list()]);
      if (pRes.status === 'fulfilled') setPositions(pRes.value?.data || []);
      else setError('Failed to load positions.');
      if (dRes.status === 'fulfilled') setDepts(dRes.value?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter
  const filtered = positions.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.department_name || '').toLowerCase().includes(search.toLowerCase()) || (p.grade || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || p.department_uuid === deptFilter;
    return matchSearch && matchDept;
  });

  const totalPositions = filtered.length;
  const totalDepts = depts.length;
  const totalEmployees = filtered.reduce((s, p) => s + (p.total_employees || 0), 0);
  const totalPages = Math.max(1, Math.ceil(totalPositions / rowsPerPage));
  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalPositions);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => { setPage(1); }, [search, deptFilter]);

  const metricCards = [
    { label: 'Total Positions', value: totalPositions, icon: <Briefcase size={22} />, bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', light: 'rgba(15,118,110,0.15)' },
    { label: 'Departments', value: totalDepts, icon: <Building2 size={22} />, bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', light: 'rgba(15,118,110,0.15)' },
    { label: 'Assigned Employees', value: totalEmployees, icon: <Users size={22} />, bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)', light: 'rgba(15,118,110,0.15)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Poppins, sans-serif' }}>
      {/* Shared Module Header */}
      <OrganizationModuleHeader
        moduleName="Positions"
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'add', label: 'Add Position' },
          { key: 'manage', label: 'Manage' },
        ]}
        subtitle={loading ? 'Loading…' : `${totalPositions} positions · ${totalEmployees} employees assigned across ${totalDepts} departments`}
        action={
          <button onClick={load} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(232,240,238,0.22)', background: 'rgba(232,240,238,0.08)', color: '#E8F0EE', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>↻ Refresh</button>
        }
      />

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.82rem' }}>{error}</div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: r(14, 12, 10) }}>
        {metricCards.map(({ label, value, icon, bg, light }) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: `0 4px 16px ${light}` }}>
            <div>
              <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{loading ? '…' : value}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{label}</p>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Search + dept filter */}
      <div style={{ display: 'flex', gap: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, department, grade…"
          style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.82rem', color: C.textMain, background: C.card, outline: 'none', fontFamily: 'Poppins,sans-serif' }} />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          style={{ minWidth: 200, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.82rem', color: C.textMain, background: C.card, outline: 'none', fontFamily: 'Poppins,sans-serif' }}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
        </select>
        <button onClick={load} style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', color: C.primary, fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}>↻ Refresh</button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.textMuted, fontSize: '0.82rem' }}>Loading positions…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.textMuted, fontSize: '0.82rem' }}>No positions found{search ? ` matching "${search}"` : ''}.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {paginated.map(pos => (
            <PositionCard key={pos.uuid} pos={pos} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: C.textMuted }}>Rows per page</span>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', color: C.textMain, background: C.card, outline: 'none', cursor: 'pointer' }}>
              {[6, 12, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <span style={{ fontSize: '0.75rem', color: C.textMuted }}>{start}–{end} of {totalPositions}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: page === 1 ? 'rgba(0,80,60,0.04)' : C.card, cursor: page === 1 ? 'not-allowed' : 'pointer', color: C.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.75rem', color: C.textSub, padding: '0 8px' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: page === totalPages ? 'rgba(0,80,60,0.04)' : C.card, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: C.textSub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '0.8rem', color: C.textMuted, margin: 0 }}>
        {totalPositions} positions · {totalEmployees} employees assigned across {totalDepts} departments
      </p>
    </div>
  );
};

/* ══════════════════════════════════════════
   POSITIONS MANAGEMENT PAGE WITH TABS
══════════════════════════════════════════ */
const PositionsManagementPage = ({ activeTab, onTabChange }) => {
  const { isMobile, isTablet, r } = useResponsive();
  const dialog = useDialog();
  const [positions, setPositions] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  const showMsg = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice({ type: '', message: '' }), 4500);
  };

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.allSettled([PositionApi.list(), DeptApi.list()]);
      if (pRes.status === 'fulfilled') setPositions(pRes.value?.data || []);
      if (dRes.status === 'fulfilled') setDeptList(dRes.value?.data || []);
    } catch (e) {
      showMsg('error', 'Failed to load positions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPositions(); }, [loadPositions]);

  const handleToggleExpand = (uuid) => {
    setExpandedRow(expandedRow === uuid ? null : uuid);
  };

  const handleEdit = (pos) => {
    setEditingPosition(pos);
    setShowModal(true);
  };

  const handleDelete = (pos) => {
    dialog.showDeleteConfirm(
      `Are you sure you want to delete position "${pos.title}"? This action cannot be undone.`,
      async () => {
        try {
          await PositionApi.delete(pos.uuid);
          showMsg('success', 'Position deleted successfully.');
          loadPositions();
        } catch (e) {
          showMsg('error', e.message || 'Failed to delete position.');
        }
      },
      { title: 'Delete Position', confirmText: 'Delete' }
    );
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPosition(null);
  };

  const handleModalSave = () => {
    handleModalClose();
    loadPositions();
  };

  // Filter positions
  const filteredPositions = positions.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.department_name || '').toLowerCase().includes(search.toLowerCase()) || (p.grade || '').toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || p.department_uuid === deptFilter;
    return matchSearch && matchDept;
  });

  const totalPositions = filteredPositions.length;
  const totalEmployees = filteredPositions.reduce((s, p) => s + (p.total_employees || 0), 0);

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif' }}>
      <OrganizationModuleHeader
        moduleName="Positions"
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'add', label: 'Add Position' },
          { key: 'manage', label: 'Manage' },
        ]}
        subtitle={`Manage all positions across departments`}
      />

      {notice.message && <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type: '', message: '' })} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: r(14, 12, 10) }}>
          {[
            { label: 'Total Positions', value: totalPositions, icon: <Briefcase size={20} />, bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' },
            { label: 'Departments', value: deptList.length, icon: <Building2 size={20} />, bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' },
            { label: 'Total Employees', value: totalEmployees, icon: <Users size={20} />, bg: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(15,118,110,0.15)' }}>
              <div>
                <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{loading ? '…' : value}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{label}</p>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)' }}>{icon}</div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, department…"
            style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.82rem', color: C.textMain, background: C.card, outline: 'none', fontFamily: 'Poppins,sans-serif' }} />
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{ minWidth: 200, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.82rem', color: C.textMain, background: C.card, outline: 'none', fontFamily: 'Poppins,sans-serif', cursor: 'pointer' }}>
            <option value="">All Departments</option>
            {deptList.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
          </select>
          <Can action="create" resource="positions">
            <GreenBtn onClick={() => { setEditingPosition(null); setShowModal(true); }}>
              <Plus size={14} /> Add Position
            </GreenBtn>
          </Can>
        </div>

        {/* Positions Table */}
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: C.textMuted, fontSize: '0.82rem' }}>Loading positions…</div>
          ) : filteredPositions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: C.textMuted, fontSize: '0.82rem' }}>No positions found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,80,60,0.05)', borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Position</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Grade</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Employees</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.7rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map(pos => (
                  <PositionRow 
                    key={pos.uuid} 
                    pos={pos} 
                    expanded={expandedRow === pos.uuid}
                    onToggle={() => handleToggleExpand(pos.uuid)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Position Modal */}
      {showModal && (
        <PositionModal
          position={editingPosition}
          deptList={deptList}
          onClose={handleModalClose}
          onSaved={handleModalSave}
          showMsg={showMsg}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   ADD POSITION VIEW (Quick Add Form)
══════════════════════════════════════════ */
const AddPositionView = ({ activeTab, onTabChange }) => {
  const [form, setForm] = useState({ title: '', department_uuid: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [deptList, setDeptList] = useState([]);

  const showMsg = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice({ type: '', message: '' }), 4500);
  };

  useEffect(() => {
    DeptApi.list()
      .then(r => setDeptList(r?.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.department_uuid) {
      showMsg('error', 'Position title and department are required.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        department_uuid: form.department_uuid,
      };
      await PositionApi.create(body);
      showMsg('success', `Position "${form.title}" created successfully!`);
      // Reset form
      setForm({ title: '', department_uuid: '' });
    } catch (err) {
      showMsg('error', err.message || 'Failed to create position.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type: '', message: '' })} />

      {/* Shared Module Header */}
      <OrganizationModuleHeader
        moduleName="Positions"
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'add', label: 'Add Position' },
          { key: 'manage', label: 'Manage' },
        ]}
        subtitle="Create a new position within a department"
      />

      {/* Form Card */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: 28 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: C.textSub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Department *
            </label>
            <select
              value={form.department_uuid}
              onChange={e => setForm(p => ({ ...p, department_uuid: e.target.value }))}
              required
              style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, fontSize: '0.82rem', color: C.textMain, outline: 'none', fontFamily: 'Poppins,sans-serif', cursor: 'pointer' }}
            >
              <option value="">Select Department</option>
              {deptList.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: C.textSub, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Position Title *
            </label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              required
              placeholder="e.g., Senior Developer, HR Manager"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, fontSize: '0.82rem', color: C.textMain, outline: 'none', fontFamily: 'Poppins,sans-serif' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <button
              type="button"
              onClick={() => setForm({ title: '', department_uuid: '' })}
              style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSub, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}
            >
              Clear Form
            </button>
            <GreenBtn type="submit" disabled={saving}>
              {saving ? 'Creating…' : <><Plus size={15} /> Create Position</>}
            </GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN POSITIONS PAGE (Tabbed Interface with URL-based navigation)
══════════════════════════════════════════ */
const PositionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/positions/add') return 'add';
    if (path === '/positions/manage') return 'manage';
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
      overview: '/positions',
      add: '/positions/add',
      manage: '/positions/manage',
    };
    navigate(paths[tabKey]);
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'add':
        return <AddPositionView activeTab={activeTab} onTabChange={handleTabChange} />;
      case 'manage':
        return <PositionsManagementPage activeTab={activeTab} onTabChange={handleTabChange} />;
      default:
        return <PositionsOverview activeTab={activeTab} onTabChange={handleTabChange} />;
    }
  };

  return (
    <div style={{ fontFamily: 'Poppins,sans-serif' }}>
      {renderContent()}
    </div>
  );
};

export default PositionsPage;
