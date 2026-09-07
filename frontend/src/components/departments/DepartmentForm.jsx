import React, { useState } from 'react';
import './departments.css';
import { createDepartment } from '../../services/departmentService';

const DepartmentForm = ({ initial = {}, departments = [], employees = [], onCancel, onSaved }) => {
  const [name, setName] = useState(initial.name || '');
  const [code, setCode] = useState(initial.code || '');
  const [parent, setParent] = useState(initial.parent_uuid || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { name, code, parent_uuid: parent || null };
      await createDepartment(payload);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{initial.name ? 'Edit Department' : 'Create Department'}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="form-row">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Department name" />
        </div>

        <div className="form-row">
          <label>Code</label>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Short code" />
        </div>

        <div className="form-row">
          <label>Parent Department</label>
          <select value={parent} onChange={e => setParent(e.target.value)}>
            <option value="">None</option>
            {departments.map(d => (
              <option key={d.uuid || d.id} value={d.uuid || d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

        <div className="form-actions">
          <button className="btn btn-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn btn-save" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentForm;
