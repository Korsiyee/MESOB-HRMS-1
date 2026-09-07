import React, { useEffect, useState, useMemo } from 'react';
import { listDepartments } from '../../services/departmentService';
import DepartmentCard from '../../components/departments/DepartmentCard';
import DepartmentForm from '../../components/departments/DepartmentForm';
import { listDepartments as fetchDepartments } from '../../services/departmentService';
import '../../components/departments/departments.css';
import { useNavigate } from 'react-router-dom';

const DepartmentsOverview = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchList = async () => {
      setLoading(true);
      try {
        const res = await listDepartments();
        if (!mounted) return;
        const data = Array.isArray(res) ? res : (res.data || []);
        setDepartments(data || []);
      } catch (e) {
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchList();
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => {
    const deps = Array.isArray(departments) ? departments : [];
    const deptCount = deps.length;
    let positions = 0; let male = 0; let female = 0;
    for (const d of deps) {
      const t = Number(d.total_positions || d.positions_count || d.total || 0) || 0;
      positions += t;
      male += Number(d.male_count || d.male || 0) || 0;
      female += Number(d.female_count || d.female || 0) || 0;
    }
    return { deptCount, positions, male, female };
  }, [departments]);

  const pageCount = Math.max(1, Math.ceil((departments.length || 0) / rowsPerPage));
  const visible = useMemo(() => {
    if (loading) return [];
    const start = (page - 1) * rowsPerPage;
    return (departments || []).slice(start, start + rowsPerPage);
  }, [departments, page, rowsPerPage, loading]);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h2>Departments Dashboard</h2>
        <div className="page-actions">
          <button className="create-dept-btn" onClick={() => setShowForm(true)}>
            <span className="create-dept-icon">🏢</span>
            <span className="create-dept-text">CREATE DEPARTMENT</span>
          </button>
        </div>
      </div>

      <div className="dept-grid">
        {loading ? <div>Loading...</div> : visible.map(d => (
          <DepartmentCard key={d.uuid || d.id} dept={d} onRefresh={async () => {
            setLoading(true);
            try {
              const res = await fetchDepartments();
              const data = Array.isArray(res) ? res : (res.data || []);
              setDepartments(data || []);
            } finally { setLoading(false); }
          }} />
        ))}
      </div>

      <div className="dept-pagination">
        <div>
          <label>Rows per page</label>
          <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>

        <div style={{ marginLeft: 12 }}>
          {departments.length === 0 ? '0 items' : `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, departments.length)} of ${departments.length}`}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={() => setPage(1)} disabled={page === 1}>{'|<'}</button>
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>{'<'}</button>
          <div>Page {page} of {pageCount}</div>
          <button className="btn" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}>{'>'}</button>
          <button className="btn" onClick={() => setPage(pageCount)} disabled={page === pageCount}>{'>|'}</button>
        </div>
      </div>

      <div style={{ marginTop: 18 }} className="dept-summary">
        <div className="summary-card summary-departments">
          <div>
            <div className="num">{totals.deptCount}</div>
            <div>Departments</div>
          </div>
        </div>

        <div className="summary-card summary-positions">
          <div>
            <div className="num">{totals.positions}</div>
            <div>Total Positions</div>
          </div>
        </div>

        <div className="summary-card summary-males">
          <div>
            <div className="num">{totals.male}</div>
            <div>Male Employees</div>
          </div>
        </div>

        <div className="summary-card summary-females">
          <div>
            <div className="num">{totals.female}</div>
            <div>Female Employees</div>
          </div>
        </div>
      </div>

      {showForm && (
        <DepartmentForm
          initial={{}}
          departments={departments}
          employees={[]}
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            setLoading(true);
            try {
              const res = await fetchDepartments();
              const data = Array.isArray(res) ? res : (res.data || []);
              setDepartments(data || []);
            } finally { setLoading(false); }
          }}
        />
      )}

    </div>
  );
};

export default DepartmentsOverview;
