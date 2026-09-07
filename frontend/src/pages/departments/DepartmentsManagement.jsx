import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import DepartmentTree from '../../components/departments/DepartmentTree';
import '../../components/departments/departments.css';

const DepartmentsManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    dashboardService.getDepartments()
      .then((res) => {
        if (!mounted) return;
        const data = Array.isArray(res) ? res : (res.data || []);
        setDepartments(data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <div className="page-wrap">
      <div className="page-header big">
        <div>
          <h2>Departments Management</h2>
          <div className="subtitle">Create and manage Departments</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary">+ CREATE DEPARTMENTS</button>
          <button className="btn btn-outline">ALL RECORDS</button>
        </div>
      </div>

      <div className="tab-bar-wrap">
        <div className="tab-bar">
          <button className="tab-button">+ CREATE DEPARTMENTS</button>
          <button className="tab-button active">📁 ALL DEPARTMENTS</button>
        </div>
      </div>

      <div className="box">
        <h3>All Departments List</h3>
        <div style={{ marginBottom: 12 }}>
          <select style={{ padding: '10px 12px', minWidth: 220 }}>
            <option value="">Select departments</option>
          </select>
        </div>

        <div style={{ marginBottom: 8, color: '#6B7280' }}>
          <strong>Hierarchy View</strong>
        </div>

        {loading ? <div>Loading...</div> : (
          <DepartmentTree nodes={departments} />
        )}
      </div>
    </div>
  );
};

export default DepartmentsManagement;
