import React, { useEffect, useState } from 'react';
import './departments.css';
import { getDepartment } from '../../services/departmentService';

const DepartmentDetail = ({ uuid, onClose }) => {
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!uuid) return;
    setLoading(true);
    getDepartment(uuid)
      .then((res) => { if (!mounted) return; setDept(res || res.data || res); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [uuid]);

  if (!uuid) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Department Details</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {loading ? <div>Loading...</div> : (
          <div>
            <div style={{ marginBottom: 8 }}><strong>{dept?.name}</strong></div>
            <div style={{ color: '#6b7280', marginBottom: 6 }}>{dept?.short || dept?.code}</div>
            <div style={{ marginBottom: 6 }}>Positions: {dept?.total_positions || dept?.positions_count || dept?.total || 0}</div>
            <div style={{ marginBottom: 6 }}>Employees: {dept?.employee_count || dept?.employees_count || 0}</div>
            {dept?.description && <div style={{ marginTop: 8 }}>{dept.description}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentDetail;
