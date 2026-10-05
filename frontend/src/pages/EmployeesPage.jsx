import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Download, Search, MoreVertical,
  Eye, Pencil, UserX, UserCheck, ChevronLeft, ChevronRight, FileText,
} from "lucide-react";
import { EmployeeApi } from "../api/employeeApi";
import { LevelApi } from "../api/levelApi";
import { ShiftApi } from "../api/shiftApi";
import PrettyDatePicker from "../components/PrettyDatePicker";
import { useResponsive } from "../hooks/useResponsive";
import ConfirmDialog from "../components/ui/ConfirmDialog";

import { Can } from "../components/Can";
/* ── Palette ── */
const C = {
  page: "#C5CECC",
  card: "#EEF1F0",
  cardBorder: "rgba(0,80,60,0.09)",
  shadow: "0 2px 12px rgba(0,60,45,0.07)",
  primary: "#0F766E",
  primaryHov: "#14B8A6",
  textMain: "#1A2E2B",
  textSub: "#1E4A42",
  textMuted: "#2E6058",
  border: "rgba(0,80,60,0.12)",
  headerBg: "linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)",
};

/* ── Shared atoms ── */
const GreenBtn = ({ children, onClick, disabled, style = {} }) => {
  const baseBg = style.background || (disabled ? "#8AADA6" : C.primary);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#8AADA6" : C.primary,
        color: "#fff", border: "none", borderRadius: 8,
        padding: "9px 18px", fontSize: "0.78rem", fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 6,
        fontFamily: "Poppins, sans-serif", transition: "background 0.15s",
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.primaryHov; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = baseBg; }}
    >{children}</button>
  );
};

const OutlineBtn = ({ children, onClick, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      background: "transparent", color: C.primary,
      border: `1.5px solid ${C.primary}`, borderRadius: 8,
      padding: "8px 16px", fontSize: "0.78rem", fontWeight: 600,
      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      fontFamily: "Poppins, sans-serif", transition: "all 0.15s",
      ...style,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = "rgba(15,118,110,0.08)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
  >{children}</button>
);

const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE:     { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    INACTIVE:   { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    TERMINATED: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  };
  const s = map[status] || { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" };
  return (
    <span style={{
      display: "inline-flex", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status || "—"}
    </span>
  );
};

const Modal = ({ open, onClose, title, subtitle, children, maxWidth = 520 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 60, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card, borderRadius: 12, width: "100%",
          maxWidth, maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.textMain }}>{title}</h3>
            {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12, color: C.textMuted }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 6, padding: "4px 12px", fontSize: 12,
              cursor: "pointer", color: C.textMain,
            }}
          >Close</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
};

const fieldStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "9px 12px", fontSize: "0.82rem", color: C.textMain,
  background: C.card, outline: "none", fontFamily: "Poppins, sans-serif",
  boxSizing: "border-box",
};
const labelStyle = {
  fontSize: "0.72rem", fontWeight: 600, color: C.textSub,
  display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em",
};

/* ── Full Add/Edit Employee Modal ── */
const EmployeeFormModal = ({ employee, onClose, onSaved, departments, positions, levels }) => {
  const isEdit = !!employee?.uuid;
  const { r } = useResponsive();
  const [form, setForm] = useState({
    title: employee?.title || "Mr",
    first_name: employee?.first_name || "",
    middle_name: employee?.middle_name || "",
    last_name: employee?.last_name || "",
    mother_name: employee?.mother_name || "",
    gender: employee?.gender || "MALE",
    date_of_birth: employee?.date_of_birth?.slice(0,10) || "",
    nationality: employee?.nationality || "Ethiopian",
    hire_date: employee?.hire_date?.slice(0,10) || "",
    tin_number: employee?.tin_number || "",
    bank_name: employee?.bank_name || "",
    bank_account_number: employee?.bank_account_number || "",
    department_uuid: employee?.department_uuid || "",
    position_uuid: employee?.position_uuid || "",
    level_uuid: employee?.level_uuid || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await EmployeeApi.update(employee.uuid, form);
      } else {
        await EmployeeApi.create(form);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || `Failed to ${isEdit ? 'update' : 'create'} employee.`);
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Employee" : "Add Employee"} maxWidth={900}>
      {error && (
        <div style={{
          padding: "9px 14px", borderRadius: 7, marginBottom: 14,
          background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: 13,
        }}>{error}</div>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Row 1: Title and Gender */}
        <div style={{ display: "grid", gridTemplateColumns: r("1fr 1fr","1fr 1fr","1fr"), gap: 14 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <select value={form.title} onChange={e => set("title", e.target.value)} style={fieldStyle}>
              {["Mr", "Mrs", "Ms", "Dr", "Prof", "Ato", "W/ro", "W/t"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <select value={form.gender} onChange={e => set("gender", e.target.value)} style={fieldStyle}>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
            </select>
          </div>
        </div>

        {/* Row 2: First Name and Middle Name */}
        <div style={{ display: "grid", gridTemplateColumns: r("1fr 1fr","1fr 1fr","1fr"), gap: 14 }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input required value={form.first_name} onChange={e => set("first_name", e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Middle Name *</label>
            <input required value={form.middle_name} onChange={e => set("middle_name", e.target.value)} style={fieldStyle} />
          </div>
        </div>

        {/* Row 3: Last Name and Mother Name */}
        <div style={{ display: "grid", gridTemplateColumns: r("1fr 1fr","1fr 1fr","1fr"), gap: 14 }}>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input required value={form.last_name} onChange={e => set("last_name", e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Mother Name *</label>
            <input required value={form.mother_name} onChange={e => set("mother_name", e.target.value)} style={fieldStyle} />
          </div>
        </div>

        {/* Row 4: Date of Birth and Hire Date */}
        <div style={{ display: "grid", gridTemplateColumns: r("1fr 1fr","1fr 1fr","1fr"), gap: 14 }}>
          <div>
            <label style={labelStyle}>Date of Birth *</label>
            <PrettyDatePicker value={form.date_of_birth} onChange={v => set("date_of_birth", v)}/>
          </div>
          <div>
            <label style={labelStyle}>Hire Date *</label>
            <PrettyDatePicker value={form.hire_date} onChange={v => set("hire_date", v)}/>
          </div>
        </div>

        {/* Row 5: Nationality and TIN Number */}
        <div style={{ display: "grid", gridTemplateColumns: r("1fr 1fr","1fr 1fr","1fr"), gap: 14 }}>
          <div>
            <label style={labelStyle}>Nationality</label>
            <input value={form.nationality} onChange={e => set("nationality", e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>TIN Number</label>
            <input value={form.tin_number} onChange={e => set("tin_number", e.target.value)} style={fieldStyle} />
          </div>
        </div>

        {/* Row 6: Bank Name and Bank Account */}
        <div style={{ display: "grid", gridTemplateColumns: r("1fr 1fr","1fr 1fr","1fr"), gap: 14 }}>
          <div>
            <label style={labelStyle}>Bank Name</label>
            <input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bank Account</label>
            <input value={form.bank_account_number} onChange={e => set("bank_account_number", e.target.value)} style={fieldStyle} />
          </div>
        </div>

        {/* Row 7: Department, Position, and Level */}
        <div style={{ display: "grid", gridTemplateColumns: r("1fr 1fr 1fr","1fr 1fr","1fr"), gap: 14 }}>
          <div>
            <label style={labelStyle}>Department</label>
            <select value={form.department_uuid} onChange={e => set("department_uuid", e.target.value)} style={fieldStyle}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Position</label>
            <select value={form.position_uuid} onChange={e => set("position_uuid", e.target.value)} style={fieldStyle}>
              <option value="">Select Position</option>
              {positions.map(p => <option key={p.uuid} value={p.uuid}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Level</label>
            <select value={form.level_uuid} onChange={e => set("level_uuid", e.target.value)} style={fieldStyle}>
              <option value="">Select Level</option>
              {levels.map(l => <option key={l.uuid} value={l.uuid}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <OutlineBtn onClick={onClose} type="button">CANCEL</OutlineBtn>
          <GreenBtn type="submit" disabled={saving}>
            {saving ? "SAVING..." : isEdit ? "SAVE CHANGES" : "CREATE EMPLOYEE"}
          </GreenBtn>
        </div>
      </form>
    </Modal>
  );
};

/* ── Action Buttons (icon-only with tooltips) ── */
const ActionButtons = ({ employee, onView, onEdit, onStatusChange }) => {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {/* View button - always visible for those who can view the list */}
      <button
        onClick={onView}
        title="View Details"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 6,
          background: "rgba(15,118,110,0.08)", border: "none",
          cursor: "pointer", color: C.primary, transition: "all 0.15s",
        }}
        onMouseEnter={e => { 
          e.currentTarget.style.background = "rgba(15,118,110,0.15)";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={e => { 
          e.currentTarget.style.background = "rgba(15,118,110,0.08)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Eye size={14} />
      </button>
      
      {/* Edit button - only visible with update permission */}
      <Can action="update" resource="employees">
        <button
          onClick={onEdit}
          title="Edit Employee"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 6,
            background: "rgba(59,130,246,0.08)", border: "none",
            cursor: "pointer", color: "#2563eb", transition: "all 0.15s",
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.background = "rgba(59,130,246,0.15)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.background = "rgba(59,130,246,0.08)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Pencil size={14} />
        </button>
      </Can>
      
      {/* Status change button - only visible with update permission */}
      <Can action="update" resource="employees">
        <button
          onClick={onStatusChange}
          title={employee.status === "ACTIVE" ? "Deactivate Employee" : "Activate Employee"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 6,
            background: employee.status === "ACTIVE" ? "rgba(220,38,38,0.08)" : "rgba(34,197,94,0.08)",
            border: "none", cursor: "pointer",
            color: employee.status === "ACTIVE" ? "#dc2626" : "#16a34a",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = employee.status === "ACTIVE" 
              ? "rgba(220,38,38,0.15)" 
              : "rgba(34,197,94,0.15)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = employee.status === "ACTIVE" 
              ? "rgba(220,38,38,0.08)" 
              : "rgba(34,197,94,0.08)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {employee.status === "ACTIVE" ? <UserX size={14} /> : <UserCheck size={14} />}
        </button>
      </Can>
    </div>
  );
};

/* ── Export to CSV ── */
function exportToCSV(employees, filters) {
  const headers = ["Mesob ID", "Name", "Department", "Position", "Level", "Gender", "Join Date", "Status"];
  const rows = employees.map(e => [
    e.mesob_id || "",
    `${e.first_name} ${e.middle_name} ${e.last_name}`.trim(),
    e.department_name || "",
    e.position_title || "",
    e.level_name || "",
    e.gender || "",
    e.hire_date ? new Date(e.hire_date).toLocaleDateString() : "",
    e.status || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `employees_${timestamp}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ── Export to PDF ── */
function exportToPDF(employees, filters) {
  const htmlContent = `
    <html>
      <head>
        <title>Employee Records</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
          h1 { color: #0F766E; font-size: 24px; margin-bottom: 10px; }
          .summary { background: #EEF1F0; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
          .summary p { margin: 5px 0; font-size: 13px; color: #1E4A42; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #0F766E; color: white; padding: 8px; text-align: left; font-weight: 600; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #888; }
        </style>
      </head>
      <body>
        <h1>Employee Records Report</h1>
        <div class="summary">
          <p><strong>Total Employees:</strong> ${employees.length}</p>
          <p><strong>Status:</strong> ${filters.status || 'All'}</p>
          ${filters.departmentName ? `<p><strong>Department:</strong> ${filters.departmentName}</p>` : ''}
          ${filters.positionName ? `<p><strong>Position:</strong> ${filters.positionName}</p>` : ''}
          ${filters.shiftName ? `<p><strong>Shift:</strong> ${filters.shiftName}</p>` : ''}
          ${filters.gender && filters.gender !== 'ALL' ? `<p><strong>Gender:</strong> ${filters.gender}</p>` : ''}
          ${filters.search ? `<p><strong>Search:</strong> ${filters.search}</p>` : ''}
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Mesob ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Gender</th>
              <th>Join Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(e => `
              <tr>
                <td>${e.mesob_id || '—'}</td>
                <td>${`${e.first_name || ''} ${e.middle_name || ''} ${e.last_name || ''}`.trim() || '—'}</td>
                <td>${e.department_name || '—'}</td>
                <td>${e.position_title || '—'}</td>
                <td>${e.gender ? (e.gender === 'MALE' ? 'Male' : 'Female') : '—'}</td>
                <td>${e.hire_date ? new Date(e.hire_date).toLocaleDateString() : '—'}</td>
                <td>${e.status || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>MESOB HRMS - Employee Management System</p>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/* ── Searchable Department Dropdown ── */
const SearchableDepartmentDropdown = ({ departments, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const filtered = departments.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const selectedDept = departments.find(d => d.uuid === selected);
  
  return (
    <div style={{ position: "relative", minWidth: 200 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...fieldStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{selected === "ALL" ? "All Departments" : (selectedDept?.name || "All Departments")}</span>
        <span style={{ fontSize: 10 }}>▼</span>
      </button>
      
      {open && (
        <>
          <div 
            onClick={() => setOpen(false)} 
            style={{ position: "fixed", inset: 0, zIndex: 10 }} 
          />
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            zIndex: 20,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            border: `1px solid ${C.border}`,
            maxHeight: 300,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>
              <input
                type="text"
                placeholder="Search departments..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: "0.8rem",
                  outline: "none",
                }}
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div style={{ overflowY: "auto", maxHeight: 250 }}>
              <button
                onClick={() => { onSelect("ALL"); setOpen(false); setSearch(""); }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background: selected === "ALL" ? "rgba(15,118,110,0.08)" : "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: selected === "ALL" ? 600 : 500,
                  color: selected === "ALL" ? C.primary : C.textMain,
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { 
                  if (selected !== "ALL") e.currentTarget.style.background = "rgba(0,80,60,0.04)"; 
                }}
                onMouseLeave={e => { 
                  if (selected !== "ALL") e.currentTarget.style.background = "none"; 
                }}
              >
                All Departments
              </button>
              {filtered.map(dept => (
                <button
                  key={dept.uuid}
                  onClick={() => { onSelect(dept.uuid); setOpen(false); setSearch(""); }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    background: selected === dept.uuid ? "rgba(15,118,110,0.08)" : "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: selected === dept.uuid ? 600 : 500,
                    color: selected === dept.uuid ? C.primary : C.textMain,
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { 
                    if (selected !== dept.uuid) e.currentTarget.style.background = "rgba(0,80,60,0.04)"; 
                  }}
                  onMouseLeave={e => { 
                    if (selected !== dept.uuid) e.currentTarget.style.background = "none"; 
                  }}
                >
                  {dept.name}
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ 
                  padding: "20px", 
                  textAlign: "center", 
                  color: C.textMuted, 
                  fontSize: "0.8rem" 
                }}>
                  No departments found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ═════════════════════════════════════════
   MAIN — EmployeesPage
═════════════════════════════════════════ */
const EmployeesPage = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet, r } = useResponsive();
  const [activeTab, setActiveTab] = useState("ACTIVE"); // ACTIVE | INACTIVE
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editEmployee, setEditEmployee] = useState(null);
  const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        status: activeTab === "ACTIVE" ? "ACTIVE" : "INACTIVE,TERMINATED",
        page,
        pageSize: PAGE_SIZE,
      };
      if (search) params.search = search;
      if (deptFilter !== "ALL") params.department_uuid = deptFilter;
      const res = await EmployeeApi.list(params);
      setEmployees(res?.data || []);
      setTotal(res?.meta?.total || 0);
    } catch (e) {
      setError(e.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, deptFilter]);

  const loadDepts = useCallback(async () => {
    try {
      const res = await EmployeeApi.listDepartments();
      setDepartments(res?.data || []);
    } catch { /* non-critical */ }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const res = await EmployeeApi.listPositions();
      setPositions(res?.data || []);
    } catch { /* non-critical */ }
  }, []);

  const loadLevels = useCallback(async () => {
    try {
      const res = await LevelApi.list();
      setLevels(res?.data || []);
    } catch { /* non-critical */ }
  }, []);

  const loadShifts = useCallback(async () => {
    try {
      const res = await ShiftApi.list();
      setShifts(res?.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadDepts(); loadPositions(); loadLevels(); loadShifts(); }, [loadDepts, loadPositions, loadLevels, loadShifts]);
  useEffect(() => { setPage(1); }, [activeTab, search, deptFilter, positionFilter, shiftFilter]);
  useEffect(() => { load(); }, [load]);

  // Update positions dropdown when department filter changes
  useEffect(() => {
    if (deptFilter !== "ALL") {
      const filtered = positions.filter(p => p.department_uuid === deptFilter);
      setFilteredPositions(filtered);
      // Reset position filter if it doesn't belong to selected department
      if (positionFilter !== "ALL" && !filtered.find(p => p.uuid === positionFilter)) {
        setPositionFilter("ALL");
      }
    } else {
      setFilteredPositions(positions);
    }
  }, [deptFilter, positions, positionFilter]);

  const handleStatusChange = async (emp) => {
    const newStatus = emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await EmployeeApi.updateStatus(emp.uuid, newStatus);
      load();
    } catch (e) {
      setErrorDialog({ open: true, message: e.message || "Failed to update status." });
    }
  };

  // Fetch ALL records for export (not just current page)
  const fetchAllForExport = async () => {
    try {
      const params = {
        status: activeTab === "ACTIVE" ? "ACTIVE" : "INACTIVE,TERMINATED",
        page: 1,
        pageSize: 10000, // Large number to get all records
      };
      if (search) params.search = search;
      if (deptFilter !== "ALL") params.department_uuid = deptFilter;
      const res = await EmployeeApi.list(params);
      let allEmployees = res?.data || [];
      
      // Apply client-side filters
      if (genderFilter !== "ALL") {
        allEmployees = allEmployees.filter(e => e.gender === genderFilter);
      }
      if (positionFilter !== "ALL") {
        allEmployees = allEmployees.filter(e => e.position_uuid === positionFilter);
      }
      if (shiftFilter !== "ALL") {
        allEmployees = allEmployees.filter(e => e.shift_uuid === shiftFilter);
      }
      
      return allEmployees;
    } catch (e) {
      setErrorDialog({ open: true, message: e.message || "Failed to fetch data for export." });
      return [];
    }
  };

  const handleExportCSV = async () => {
    if (total === 0) {
      setErrorDialog({ open: true, message: "No records to export." });
      return;
    }
    const allEmployees = await fetchAllForExport();
    if (allEmployees.length === 0) {
      setErrorDialog({ open: true, message: "No records to export." });
      return;
    }
    const selectedDept = departments.find(d => d.uuid === deptFilter);
    const selectedPos = filteredPositions.find(p => p.uuid === positionFilter);
    const selectedShift = shifts.find(s => s.uuid === shiftFilter);
    exportToCSV(allEmployees, {
      status: activeTab,
      departmentName: selectedDept?.name || "",
      positionName: selectedPos?.title || "",
      shiftName: selectedShift?.name || "",
      gender: genderFilter,
      search: search,
    });
  };

  const handleExportPDF = async () => {
    if (total === 0) {
      setErrorDialog({ open: true, message: "No records to export." });
      return;
    }
    const allEmployees = await fetchAllForExport();
    if (allEmployees.length === 0) {
      setErrorDialog({ open: true, message: "No records to export." });
      return;
    }
    const selectedDept = departments.find(d => d.uuid === deptFilter);
    const selectedPos = filteredPositions.find(p => p.uuid === positionFilter);
    const selectedShift = shifts.find(s => s.uuid === shiftFilter);
    exportToPDF(allEmployees, {
      status: activeTab,
      departmentName: selectedDept?.name || "",
      positionName: selectedPos?.title || "",
      shiftName: selectedShift?.name || "",
      gender: genderFilter,
      search: search,
    });
  };

  /* Apply client-side gender, position, and shift filters */
  let filtered = employees;
  
  if (genderFilter !== "ALL") {
    filtered = filtered.filter(e => e.gender === genderFilter);
  }
  
  if (positionFilter !== "ALL") {
    filtered = filtered.filter(e => e.position_uuid === positionFilter);
  }
  
  if (shiftFilter !== "ALL") {
    filtered = filtered.filter(e => e.shift_uuid === shiftFilter);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" }) : "—";

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Page Header ── */}
      <div style={{
        background: C.headerBg, borderRadius: 14,
        padding: r("20px 24px", "16px 20px", "14px 16px"),
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#E8F0EE" }}>
            Employee Management
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "rgba(232,240,238,0.6)" }}>
            Manage Employees Record
          </p>
        </div>
      </div>

      {/* ── Active / Former tabs ── */}
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.cardBorder}`,
        boxShadow: C.shadow, marginBottom: 16, overflow: "hidden",
      }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {[
            { key: "ACTIVE", icon: <Users size={14} />, label: "ACTIVE EMPLOYEES", count: activeTab === "ACTIVE" ? total : null },
            { key: "INACTIVE", icon: <UserX size={14} />, label: "FORMER EMPLOYEES", count: activeTab !== "ACTIVE" ? total : null },
          ].map(({ key, icon, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "14px 20px", border: "none", background: "none",
                cursor: "pointer", fontSize: "0.8rem", fontWeight: 700,
                color: activeTab === key ? C.primary : C.textMuted,
                borderBottom: activeTab === key ? `2.5px solid ${C.primary}` : "2.5px solid transparent",
                transition: "all 0.15s", fontFamily: "Poppins, sans-serif",
              }}
            >
              {icon} {label}
              {count !== null && (
                <span style={{
                  background: activeTab === key ? C.primary : "rgba(0,80,60,0.12)",
                  color: activeTab === key ? "#fff" : C.textMuted,
                  borderRadius: 99, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700,
                }}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Export + Search/Filter ── */}
        <div style={{ padding: "12px 16px 0" }}>
          {/* Filters and Export Row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : 200 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or Mesob ID..."
                style={{ ...fieldStyle, paddingLeft: 32 }}
              />
            </div>
            <SearchableDepartmentDropdown
              departments={departments}
              selected={deptFilter}
              onSelect={setDeptFilter}
            />
            <select
              value={positionFilter}
              onChange={e => setPositionFilter(e.target.value)}
              style={{ ...fieldStyle, width: 160 }}
              disabled={deptFilter !== "ALL" && filteredPositions.length === 0}
            >
              <option value="ALL">All Positions</option>
              {filteredPositions.map(p => <option key={p.uuid} value={p.uuid}>{p.title}</option>)}
            </select>
            <select
              value={shiftFilter}
              onChange={e => setShiftFilter(e.target.value)}
              style={{ ...fieldStyle, width: 130 }}
            >
              <option value="ALL">All Shifts</option>
              {shifts.map(s => <option key={s.uuid} value={s.uuid}>{s.name}</option>)}
            </select>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
              style={{ ...fieldStyle, width: 130 }}
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          {/* Summary and Export Section */}
          <div style={{
            background: "linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(20,184,166,0.12) 100%)",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Showing Results
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: C.textSub, fontWeight: 500 }}>
                {filtered.length} of {total} employees
                {deptFilter !== "ALL" && ` • ${departments.find(d => d.uuid === deptFilter)?.name || ""}`}
                {positionFilter !== "ALL" && ` • ${filteredPositions.find(p => p.uuid === positionFilter)?.title || ""}`}
                {shiftFilter !== "ALL" && ` • ${shifts.find(s => s.uuid === shiftFilter)?.name || ""}`}
                {genderFilter !== "ALL" && ` • ${genderFilter === "MALE" ? "Male" : "Female"}`}
                {search && ` • Search: "${search}"`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Can action="export" resource="employees">
                <button
                  onClick={handleExportCSV}
                  disabled={total === 0}
                  style={{
                    background: "#fff",
                    color: C.primary,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: total === 0 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "Poppins, sans-serif",
                    opacity: total === 0 ? 0.5 : 1,
                  }}
                >
                  <Download size={14} /> CSV
                </button>
              </Can>
              <Can action="export" resource="employees">
                <button
                  onClick={handleExportPDF}
                  disabled={total === 0}
                  style={{
                    background: "#fff",
                    color: C.primary,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: total === 0 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "Poppins, sans-serif",
                    opacity: total === 0 ? 0.5 : 1,
                  }}
                >
                  <FileText size={14} /> PDF
                </button>
              </Can>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        {error && (
          <div style={{ padding: "12px 16px", color: "#b91c1c", fontSize: 13, background: "#fef2f2" }}>
            {error}
          </div>
        )}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1e3a37" }}>
                {["Mesob ID", "Employee Name", "Department", "Position", "Level", "Gender", "Join Date", "Status", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "11px 14px", textAlign: "left", fontSize: "0.72rem",
                    fontWeight: 700, color: "#E8F0EE", textTransform: "uppercase",
                    letterSpacing: "0.05em", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>No employees found.</td></tr>
              ) : filtered.map((emp, i) => (
                <tr
                  key={emp.uuid}
                  style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(15,118,110,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"; }}
                >
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub, fontWeight: 500 }}>
                    {emp.mesob_id || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.textMain, fontWeight: 500 }}>
                    {`${emp.first_name || ""} ${emp.middle_name || ""} ${emp.last_name || ""}`.trim() || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub }}>{emp.department_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub }}>{emp.position_title || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub }}>{emp.level_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub }}>{emp.gender ? (emp.gender === "MALE" ? "Male" : "Female") : "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub }}>{fmtDate(emp.hire_date)}</td>
                  <td style={{ padding: "12px 14px" }}><StatusBadge status={emp.status} /></td>
                  <td style={{ padding: "12px 14px" }}>
                    <ActionButtons
                      employee={emp}
                      onView={() => navigate(`/employees/${emp.uuid}`)}
                      onEdit={() => setEditEmployee(emp)}
                      onStatusChange={() => handleStatusChange(emp)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 12, padding: "14px 20px", borderTop: `1px solid ${C.border}`,
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
                background: page === 1 ? "rgba(0,80,60,0.04)" : C.card,
                cursor: page === 1 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub,
              }}
            ><ChevronLeft size={14} /></button>
            <span style={{ fontSize: "0.75rem", color: C.textSub }}>
              Page {page} of {totalPages} ({total} total)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
                background: page === totalPages ? "rgba(0,80,60,0.04)" : C.card,
                cursor: page === totalPages ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub,
              }}
            ><ChevronRight size={14} /></button>
          </div>
        )}
      </div>

      {/* ── Full Edit Modal ── */}
      {editEmployee && (
        <EmployeeFormModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSaved={load}
          departments={departments}
          positions={positions}
          levels={levels}
        />
      )}

      {/* Error Dialog */}
      <ConfirmDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ open: false, message: "" })}
        onConfirm={() => setErrorDialog({ open: false, message: "" })}
        variant="warning"
        title="Operation Failed"
        description={errorDialog.message}
        confirmText="OK"
        hideCancel={true}
      />
    </div>
  );
};

export default EmployeesPage;
