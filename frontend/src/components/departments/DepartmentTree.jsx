import React from 'react';
import './departments.css';

const Node = ({ node, level = 0, onAdd, onEdit, onView, onDelete }) => {
  const code = (node.code || node.short || '').toString().toUpperCase();
  return (
    <div className={`dept-tree-row level-${level % 4}`}>
      <div className="dept-tree-left" style={{ paddingLeft: `${level * 18}px`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="dept-caret">›</div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {code && <div className="dept-tree-code">{code}</div>}
          <div className="dept-tree-title"><span className="dept-building">🏛</span> {node.name}</div>
        </div>
      </div>
      <div className="dept-tree-actions">
        <button className="btn btn-add" onClick={() => onAdd && onAdd(node)}>+ ADD</button>
        <button className="btn btn-edit" onClick={() => onEdit && onEdit(node)}>EDIT</button>
        <button className="btn btn-view" onClick={() => onView && onView(node)}>VIEW</button>
      </div>
    </div>
  );
};

const DepartmentTree = ({ nodes = [], onAdd, onEdit, onView, onDelete }) => {
  const renderNodes = (items, level = 0) => {
    const list = Array.isArray(items) ? items : [];
    return list.map((n) => (
      <div key={n.uuid || n.id}>
        <Node node={n} level={level} onAdd={onAdd} onEdit={onEdit} onView={onView} onDelete={onDelete} />
        {n.children && n.children.length > 0 && renderNodes(n.children, level + 1)}
      </div>
    ));
  };

  return <div className="dept-tree">{renderNodes(nodes)}</div>;
};

export default DepartmentTree;
