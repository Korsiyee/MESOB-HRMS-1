import React from 'react';
import './departments.css';

const DepartmentCard = ({ dept, onView }) => {
  const total = dept.total_positions || dept.positions_count || dept.total || 0;
  const male = dept.male_count || dept.male || 0;
  const female = dept.female_count || dept.female || 0;
  return (
    <div className="dept-card">
      <div className="dept-card-header">
        <div className="dept-icon">🏢</div>
        <div className="dept-name">{dept.name}</div>
        <div className="status-badge">Active</div>
      </div>
      <div className="dept-card-body">
        <div className="dept-meta">{total} Total</div>
      </div>
      <div className="dept-card-footer">
        <div className="gender-badges">
          <div className="badge badge-male">{male}M</div>
          <div className="badge badge-female">{female}F</div>
        </div>
        <div className="dept-actions">
          <button className="btn btn-outline btn-sm" onClick={() => onView && onView(dept)}>View</button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentCard;
 
