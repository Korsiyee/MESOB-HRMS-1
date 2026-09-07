import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Pencil, Trash2, X, Users, Banknote, TrendingUp,
  Calendar, History, ChevronDown, ChevronUp, Award
} from 'lucide-react';
import { LevelApi } from '../api/levelApi';
import { useDialog } from '../context/DialogContext';

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

const styles = {
  field: {
    width: '100%', padding: '9px 13px', borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.card,
    fontSize: '0.82rem', color: C.textMain, outline: 'none',
    fontFamily: 'Poppins,sans-serif', boxSizing: 'border-box',
  },
  lbl: {
    display: 'block', fontSize: '0.72rem', fontWeight: 600,
    color: C.textSub, marginBottom: 5, textTransform: 'uppercase', 
    letterSpacing: '0.05em',
  },
};

/* ── Shared Atoms ── */
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

const PageHeader = ({ title, subtitle, action }) => (
  <div style={{ background: C.headerBg, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
    <div>
      <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#E8F0EE', fontFamily: 'Poppins,sans-serif' }}>{title}</h1>
      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(232,240,238,0.6)', fontFamily: 'Poppins,sans-serif' }}>{subtitle}</p>
    </div>
    {action}
  </div>
);

/* ══════════════════════════════════════════
   LEVEL CARD
══════════════════════════════════════════ */
const LevelCard = ({ level, onEdit, onDelete, onCreateVersion, onViewDetails }) => {
  const empCount = Number(level.employee_count || 0);
  const baseSalary = level.current_base_salary ? Number(level.current_base_salary).toLocaleString() : '—';

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'box-shadow 0.15s, transform 0.15s', fontFamily: 'Poppins,sans-serif' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,60,45,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={17} color={C.primary} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>{level.name}</h3>
            {level.description && <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: C.textMuted }}>{level.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onEdit(level)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          ><Pencil size={14} color={C.primary} /></button>
          <button onClick={() => onDelete(level)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          ><Trash2 size={14} color='#DC2626' /></button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: C.textMuted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Employees</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: C.textMain, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} color={C.primary} />
            {empCount}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: C.textMuted, fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Base Salary</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: C.textMain, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Banknote size={16} color={C.primary} />
            {baseSalary} Br
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => onViewDetails(level)} style={{ flex: 1, padding: '7px 12px', background: 'rgba(15,118,110,0.08)', border: `1px solid ${C.primary}`, borderRadius: 8, color: C.primary, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.08)'; }}
        ><History size={13} /> History</button>
        <button onClick={() => onCreateVersion(level)} style={{ flex: 1, padding: '7px 12px', background: C.primary, border: 'none', borderRadius: 8, color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = C.primaryHov}
          onMouseLeave={e => e.currentTarget.style.background = C.primary}
        ><TrendingUp size={13} /> New Version</button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   LEVEL MODAL (Create/Edit)
══════════════════════════════════════════ */
const LevelModal = ({ level, onClose, onSaved, showMsg }) => {
  const editing = !!level?.uuid;
  const [form, setForm] = useState({
    name: level?.name || '',
    description: level?.description || '',
    sort_order: level?.sort_order || 0,
    base_salary: level?.current_base_salary || '',
    is_active: level?.is_active !== false,
    allowances: [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Allowance management
  const addAllowance = () => {
    set('allowances', [...form.allowances, {
      allowance_name: '',
      allowance_type: 'TRANSPORT',
      amount: '',
      is_taxable: false,
    }]);
  };

  const updateAllowance = (index, field, value) => {
    const updated = [...form.allowances];
    updated[index] = { ...updated[index], [field]: value };
    set('allowances', updated);
  };

  const removeAllowance = (index) => {
    set('allowances', form.allowances.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sort_order: Number(form.sort_order),
        is_active: form.is_active,
      };
      
      // Only include base_salary and allowances if creating
      if (!editing) {
        if (form.base_salary) {
          body.base_salary = Number(form.base_salary);
        }
        if (form.allowances.length > 0) {
          body.allowances = form.allowances.map(a => ({
            allowance_name: a.allowance_name.trim(),
            allowance_type: a.allowance_type,
            amount: Number(a.amount),
            is_taxable: a.is_taxable,
          }));
        }
      }

      if (editing) {
        await LevelApi.update(level.uuid, body);
        showMsg('success', 'Level updated successfully.');
      } else {
        await LevelApi.create(body);
        showMsg('success', 'Level created successfully.');
      }
      onSaved();
    } catch (err) {
      showMsg('error', err.response?.data?.message || err.message || 'Failed to save level.');
    } finally {
      setSaving(false);
    }
  };

  const ALLOWANCE_TYPES = ['TRANSPORT', 'HOUSING', 'RESPONSIBILITY', 'MEAL', 'COMMUNICATION', 'OTHER'];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 620, padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textMain }}>{editing ? 'Edit Level' : 'Add Level'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.lbl}>Level Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required style={styles.field} placeholder="e.g., Level 13" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.lbl}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...styles.field, minHeight: 70, resize: 'vertical' }} placeholder="Brief description..." />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.lbl}>Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} style={styles.field} />
          </div>
          {!editing && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={styles.lbl}>Initial Base Salary (Br) <span style={{ color: C.textMuted, fontWeight: 400, fontSize: '0.68rem' }}>(optional)</span></label>
                <input type="number" step="0.01" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} style={styles.field} placeholder="0.00" />
              </div>

              {/* Allowances Section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={styles.lbl}>Allowances <span style={{ color: C.textMuted, fontWeight: 400, fontSize: '0.68rem' }}>(optional)</span></label>
                  <button type="button" onClick={addAllowance} style={{ background: 'rgba(15,118,110,0.1)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '0.72rem', fontWeight: 600, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={14} /> Add Allowance
                  </button>
                </div>
                {form.allowances.length === 0 ? (
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 8, fontSize: '0.75rem', color: C.textMuted, textAlign: 'center', border: `1px dashed ${C.border}` }}>
                    No allowances added yet. Click "Add Allowance" to create one.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {form.allowances.map((allowance, index) => (
                      <div key={index} style={{ padding: '12px', background: 'rgba(15,118,110,0.03)', borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ ...styles.lbl, fontSize: '0.68rem' }}>Allowance Name</label>
                            <input value={allowance.allowance_name} onChange={e => updateAllowance(index, 'allowance_name', e.target.value)} style={{ ...styles.field, fontSize: '0.75rem', padding: '8px 10px' }} placeholder="e.g., Transport" />
                          </div>
                          <div>
                            <label style={{ ...styles.lbl, fontSize: '0.68rem' }}>Type</label>
                            <select value={allowance.allowance_type} onChange={e => updateAllowance(index, 'allowance_type', e.target.value)} style={{ ...styles.field, fontSize: '0.75rem', padding: '8px 10px' }}>
                              {ALLOWANCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
                          <div>
                            <label style={{ ...styles.lbl, fontSize: '0.68rem' }}>Amount (Br)</label>
                            <input type="number" step="0.01" value={allowance.amount} onChange={e => updateAllowance(index, 'amount', e.target.value)} style={{ ...styles.field, fontSize: '0.75rem', padding: '8px 10px' }} placeholder="0.00" />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8 }}>
                            <input type="checkbox" id={`tax-${index}`} checked={allowance.is_taxable} onChange={e => updateAllowance(index, 'is_taxable', e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                            <label htmlFor={`tax-${index}`} style={{ fontSize: '0.7rem', fontWeight: 500, color: C.textSub, cursor: 'pointer', whiteSpace: 'nowrap' }}>Taxable</label>
                          </div>
                          <button type="button" onClick={() => removeAllowance(index)} style={{ background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={14} color="#DC2626" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {editing && (
            <div style={{ padding: '12px', background: 'rgba(15,118,110,0.08)', borderRadius: 8, marginBottom: 16, fontSize: '0.75rem', color: C.textSub }}>
              <strong>Note:</strong> To update salary or allowances, use "New Version" from the level card after saving.
            </div>
          )}
          <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="is_active" style={{ fontSize: '0.78rem', fontWeight: 600, color: C.textSub, cursor: 'pointer' }}>Active</label>
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
   VERSION MODAL (Create Salary Revision)
══════════════════════════════════════════ */
const VersionModal = ({ level, onClose, onSaved, showMsg }) => {
  const [form, setForm] = useState({
    base_salary: '',
    effective_from: '',
    notes: '',
    allowances: [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Allowance management
  const addAllowance = () => {
    set('allowances', [...form.allowances, {
      allowance_name: '',
      allowance_type: 'TRANSPORT',
      amount: '',
      is_taxable: false,
    }]);
  };

  const updateAllowance = (index, field, value) => {
    const updated = [...form.allowances];
    updated[index] = { ...updated[index], [field]: value };
    set('allowances', updated);
  };

  const removeAllowance = (index) => {
    set('allowances', form.allowances.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        base_salary: Number(form.base_salary),
        effective_from: form.effective_from,
        notes: form.notes.trim() || undefined,
      };
      
      if (form.allowances.length > 0) {
        payload.allowances = form.allowances.map(a => ({
          allowance_name: a.allowance_name.trim(),
          allowance_type: a.allowance_type,
          amount: Number(a.amount),
          is_taxable: a.is_taxable,
        }));
      }
      
      await LevelApi.createVersion(level.uuid, payload);
      showMsg('success', 'Salary revision created successfully.');
      onSaved();
    } catch (err) {
      showMsg('error', err.response?.data?.message || err.message || 'Failed to create version.');
    } finally {
      setSaving(false);
    }
  };

  const ALLOWANCE_TYPES = ['TRANSPORT', 'HOUSING', 'RESPONSIBILITY', 'MEAL', 'COMMUNICATION', 'OTHER'];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 620, padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textMain }}>Create Salary Revision</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(15,118,110,0.08)', borderRadius: 8, border: `1px solid ${C.primary}` }}>
          <div style={{ fontSize: '0.7rem', color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>Level</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.primary }}>{level.name}</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.lbl}>New Base Salary (Br) *</label>
            <input type="number" step="0.01" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} required style={styles.field} placeholder="0.00" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.lbl}>Effective From *</label>
            <input type="date" value={form.effective_from} onChange={e => set('effective_from', e.target.value)} required style={styles.field} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...styles.field, minHeight: 70, resize: 'vertical' }} placeholder="Reason for revision..." />
          </div>

          {/* Allowances Section */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={styles.lbl}>Allowances <span style={{ color: C.textMuted, fontWeight: 400, fontSize: '0.68rem' }}>(optional)</span></label>
              <button type="button" onClick={addAllowance} style={{ background: 'rgba(15,118,110,0.1)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '0.72rem', fontWeight: 600, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={14} /> Add Allowance
              </button>
            </div>
            {form.allowances.length === 0 ? (
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 8, fontSize: '0.75rem', color: C.textMuted, textAlign: 'center', border: `1px dashed ${C.border}` }}>
                No allowances added yet. Click "Add Allowance" to create one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {form.allowances.map((allowance, index) => (
                  <div key={index} style={{ padding: '12px', background: 'rgba(15,118,110,0.03)', borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ ...styles.lbl, fontSize: '0.68rem' }}>Allowance Name</label>
                        <input value={allowance.allowance_name} onChange={e => updateAllowance(index, 'allowance_name', e.target.value)} style={{ ...styles.field, fontSize: '0.75rem', padding: '8px 10px' }} placeholder="e.g., Transport" />
                      </div>
                      <div>
                        <label style={{ ...styles.lbl, fontSize: '0.68rem' }}>Type</label>
                        <select value={allowance.allowance_type} onChange={e => updateAllowance(index, 'allowance_type', e.target.value)} style={{ ...styles.field, fontSize: '0.75rem', padding: '8px 10px' }}>
                          {ALLOWANCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
                      <div>
                        <label style={{ ...styles.lbl, fontSize: '0.68rem' }}>Amount (Br)</label>
                        <input type="number" step="0.01" value={allowance.amount} onChange={e => updateAllowance(index, 'amount', e.target.value)} style={{ ...styles.field, fontSize: '0.75rem', padding: '8px 10px' }} placeholder="0.00" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8 }}>
                        <input type="checkbox" id={`tax-ver-${index}`} checked={allowance.is_taxable} onChange={e => updateAllowance(index, 'is_taxable', e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                        <label htmlFor={`tax-ver-${index}`} style={{ fontSize: '0.7rem', fontWeight: 500, color: C.textSub, cursor: 'pointer', whiteSpace: 'nowrap' }}>Taxable</label>
                      </div>
                      <button type="button" onClick={() => removeAllowance(index)} style={{ background: 'rgba(220,38,38,0.1)', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={14} color="#DC2626" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSub, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Cancel</button>
            <GreenBtn type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Version'}</GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   LEVEL DETAILS MODAL (Version History)
══════════════════════════════════════════ */
const LevelDetailsModal = ({ level, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState(null);

  useEffect(() => {
    if (level?.uuid) {
      LevelApi.get(level.uuid, { includeVersions: true, includeEmployees: true })
        .then(res => {
          setDetails(res.data);
          // Auto-expand current version
          const current = res.data.versions?.find(v => v.is_current);
          if (current) setExpandedVersion(current.uuid);
        })
        .catch(err => console.error('Failed to load level details:', err))
        .finally(() => setLoading(false));
    }
  }, [level?.uuid]);

  if (loading) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, padding: 40, boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '0.85rem', color: C.textMuted }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!details) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: `1px solid ${C.border}` }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: C.card, zIndex: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>{details.name}</h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: C.textMuted }}>{details.description || 'No description'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}><X size={20} /></button>
        </div>

        {/* Stats */}
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: C.textMuted, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Employees</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: C.textMain }}>{details.employee_count || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: C.textMuted, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Versions</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: C.textMain }}>{details.versions?.length || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: C.textMuted, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Status</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: details.is_active ? C.primary : '#DC2626', padding: '4px 10px', background: details.is_active ? 'rgba(15,118,110,0.1)' : 'rgba(220,38,38,0.1)', borderRadius: 6, display: 'inline-block' }}>
              {details.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Version History */}
        <div style={{ padding: '20px 28px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, color: C.textMain, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} color={C.primary} />
            Version History
          </h3>
          {!details.versions || details.versions.length === 0 ? (
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 8, fontSize: '0.78rem', color: C.textMuted, textAlign: 'center' }}>
              No versions yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {details.versions.map(version => (
                <div key={version.uuid} style={{ border: `1px solid ${version.is_current ? C.primary : C.border}`, borderRadius: 10, overflow: 'hidden', background: version.is_current ? 'rgba(15,118,110,0.03)' : 'transparent' }}>
                  {/* Version Header */}
                  <div onClick={() => setExpandedVersion(expandedVersion === version.uuid ? null : version.uuid)} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.primary, background: 'rgba(15,118,110,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                        v{version.version_number}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.textMain }}>
                          {Number(version.base_salary).toLocaleString()} Br
                          {version.is_current && <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 600, color: C.primary }}>● Current</span>}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: C.textMuted, marginTop: 2 }}>
                          {new Date(version.effective_from).toLocaleDateString()} 
                          {version.effective_to && ` - ${new Date(version.effective_to).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    {expandedVersion === version.uuid ? <ChevronUp size={16} color={C.textMuted} /> : <ChevronDown size={16} color={C.textMuted} />}
                  </div>

                  {/* Version Details (Expanded) */}
                  {expandedVersion === version.uuid && (
                    <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.01)' }}>
                      {version.notes && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>NOTES</div>
                          <div style={{ fontSize: '0.78rem', color: C.textSub }}>{version.notes}</div>
                        </div>
                      )}
                      {version.allowances && version.allowances.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>ALLOWANCES</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {version.allowances.map(allowance => (
                              <div key={allowance.uuid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: C.card, borderRadius: 6, border: `1px solid ${C.border}` }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: C.textMain }}>{allowance.allowance_name}</div>
                                  <div style={{ fontSize: '0.68rem', color: C.textMuted }}>{allowance.allowance_type}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.primary }}>{Number(allowance.amount).toLocaleString()} Br</div>
                                  <div style={{ fontSize: '0.68rem', color: allowance.is_taxable ? '#DC2626' : C.primary }}>{allowance.is_taxable ? 'Taxable' : 'Non-taxable'}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {version.created_by_name && (
                        <div style={{ marginTop: 12, fontSize: '0.68rem', color: C.textMuted }}>
                          Created by {version.created_by_name} on {new Date(version.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const LevelsPage = () => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [msgType, setMsgType] = useState('');
  const [msgText, setMsgText] = useState('');
  const { showDialog } = useDialog();

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const res = await LevelApi.list({ includeCurrentVersion: true });
      setLevels(res.data || []);
    } catch (err) {
      showMsg('error', 'Failed to load levels.');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMsgType(type);
    setMsgText(text);
  };

  const handleCreateLevel = () => {
    setEditingLevel(null);
    setShowLevelModal(true);
  };

  const handleEditLevel = (level) => {
    setEditingLevel(level);
    setShowLevelModal(true);
  };

  const handleDeleteLevel = async (level) => {
    if (level.employee_count > 0) {
      showDialog({
        title: 'Cannot Delete Level',
        message: `This level is assigned to ${level.employee_count} employee(s). Please reassign them before deleting.`,
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {},
      });
      return;
    }

    showDialog({
      title: 'Delete Level',
      message: `Are you sure you want to delete "${level.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await LevelApi.delete(level.uuid);
          showMsg('success', 'Level deleted successfully.');
          fetchLevels();
        } catch (err) {
          showMsg('error', err.response?.data?.message || 'Failed to delete level.');
        }
      },
    });
  };

  const handleCreateVersion = (level) => {
    setEditingLevel(level);
    setShowVersionModal(true);
  };

  const handleViewDetails = (level) => {
    setEditingLevel(level);
    setShowDetailsModal(true);
  };

  const handleModalSaved = () => {
    setShowLevelModal(false);
    setShowVersionModal(false);
    setShowDetailsModal(false);
    setEditingLevel(null);
    fetchLevels();
  };

  // Calculate stats
  const totalLevels = levels.length;
  const activeLevels = levels.filter(l => l.is_active).length;
  const totalEmployees = levels.reduce((sum, l) => sum + Number(l.employee_count || 0), 0);

  return (
    <div style={{ padding: '24px 32px', background: C.page, minHeight: '100vh', fontFamily: 'Poppins,sans-serif' }}>
      <PageHeader
        title="Organizational Levels"
        subtitle="Manage organizational levels and compensation structures"
        action={
          <GreenBtn onClick={handleCreateLevel}>
            <Plus size={16} /> Add Level
          </GreenBtn>
        }
      />

      <Notice type={msgType} message={msgText} onClose={() => setMsgText('')} />

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: '18px 20px', border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow }}>
          <div style={{ fontSize: '0.7rem', color: C.textMuted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Levels</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.textMain }}>{totalLevels}</div>
        </div>
        <div style={{ background: C.card, borderRadius: 14, padding: '18px 20px', border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow }}>
          <div style={{ fontSize: '0.7rem', color: C.textMuted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Active Levels</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.primary }}>{activeLevels}</div>
        </div>
        <div style={{ background: C.card, borderRadius: 14, padding: '18px 20px', border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow }}>
          <div style={{ fontSize: '0.7rem', color: C.textMuted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Employees</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.textMain }}>{totalEmployees}</div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: '0.85rem', color: C.textMuted }}>
          Loading levels...
        </div>
      )}

      {/* Empty State */}
      {!loading && levels.length === 0 && (
        <div style={{ background: C.card, borderRadius: 14, padding: '60px 40px', textAlign: 'center', border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow }}>
          <Layers size={48} color={C.textMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: C.textMain }}>No Levels Yet</h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: C.textMuted }}>Create your first organizational level to get started.</p>
          <GreenBtn onClick={handleCreateLevel}>
            <Plus size={16} /> Add Level
          </GreenBtn>
        </div>
      )}

      {/* Levels Grid */}
      {!loading && levels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {levels.map(level => (
            <LevelCard
              key={level.uuid}
              level={level}
              onEdit={handleEditLevel}
              onDelete={handleDeleteLevel}
              onCreateVersion={handleCreateVersion}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showLevelModal && (
        <LevelModal
          level={editingLevel}
          onClose={() => { setShowLevelModal(false); setEditingLevel(null); }}
          onSaved={handleModalSaved}
          showMsg={showMsg}
        />
      )}

      {showVersionModal && editingLevel && (
        <VersionModal
          level={editingLevel}
          onClose={() => { setShowVersionModal(false); setEditingLevel(null); }}
          onSaved={handleModalSaved}
          showMsg={showMsg}
        />
      )}

      {showDetailsModal && editingLevel && (
        <LevelDetailsModal
          level={editingLevel}
          onClose={() => { setShowDetailsModal(false); setEditingLevel(null); }}
        />
      )}
    </div>
  );
};

export default LevelsPage;
