import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, Edit, Eye, UserCheck, UserX, Mail, Phone,
  Briefcase, Building2, Shield, Loader,
} from "lucide-react";
import { EmployeeApi } from "../api/employeeApi";
import { useResponsive } from "../hooks/useResponsive";
import { Can } from "../components/Can";
import ConfirmDialog from "../components/ui/ConfirmDialog";

/* ── Color Palette ── */
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
};

/* ── Status Badge ── */
const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE: { bg: "#dcfce7", color: "#166534", border: "#86efac", text: "Active" },
    INACTIVE: { bg: "#fef9c3", color: "#854d0e", border: "#fde047", text: "Inactive" },
    TERMINATED: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", text: "Terminated" },
  };
  const s = map[status] || { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db", text: status || "Unknown" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ fontSize: 8 }}>●</span> {s.text}
    </span>
  );
};

const EmployeeAvatar = ({ employee, size = 80 }) => {
  const [imgError, setImgError] = useState(false);
  const photoSrc = !imgError && (employee?.profile_photo_url || (employee?.uuid ? `/api/employees/${employee.uuid}/photo` : null));
  const initials = `${employee?.first_name?.[0] || ""}${employee?.last_name?.[0] || ""}`.toUpperCase() || "—";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        overflow: "hidden",
        border: "3px solid #fff",
        boxShadow: "0 4px 14px rgba(15,118,110,0.2)",
        background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {photoSrc ? (
        <img
          src={photoSrc}
          alt={`${employee?.first_name || ""} ${employee?.last_name || ""}`}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <span
          style={{
            color: "#fff",
            fontSize: size * 0.35,
            fontWeight: 700,
            letterSpacing: 1,
            userSelect: "none",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

export default function EmployeeProfilePage() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  
  const [departments, setDepartments] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, employee: null, action: "" });

  // Load all employees and options on mount
  useEffect(() => {
    loadEmployees();
    loadOptions();
  }, []);

  // Filter employees whenever search/filters change
  useEffect(() => {
    filterEmployees();
  }, [employees, searchQuery, statusFilter, departmentFilter]);

  const loadEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await EmployeeApi.list({
        pageSize: 1000,
        status: "ACTIVE,INACTIVE,TERMINATED",
      });
      setEmployees(response?.data || []);
    } catch (err) {
      setError(err.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const depts = await EmployeeApi.listDepartments();
      setDepartments(depts?.data || []);
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((emp) => {
        const fullName = `${emp.first_name} ${emp.middle_name} ${emp.last_name}`.toLowerCase();
        const mesobId = (emp.mesob_id || "").toLowerCase();
        const email = (emp.addresses?.[0]?.email || "").toLowerCase();
        const department = (emp.department_name || "").toLowerCase();
        const position = (emp.position_title || "").toLowerCase();
        
        return (
          fullName.includes(query) ||
          mesobId.includes(query) ||
          email.includes(query) ||
          department.includes(query) ||
          position.includes(query)
        );
      });
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((emp) => emp.status === statusFilter);
    }

    if (departmentFilter !== "ALL") {
      filtered = filtered.filter((emp) => emp.department_uuid === departmentFilter);
    }

    setFilteredEmployees(filtered);
  };

  const handleView = (employee) => {
    // Navigate to existing EmployeeDetailPage (same as Employee List)
    navigate(`/employees/${employee.uuid}`);
  };

  const handleEdit = (employee) => {
    // Navigate to existing EmployeeDetailPage in edit mode (same as Employee List)
    navigate(`/employees/${employee.uuid}?mode=edit`);
  };

  const handleStatusChange = (employee) => {
    const newStatus = employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setConfirmDialog({
      open: true,
      employee,
      action: newStatus,
    });
  };

  const confirmStatusChange = async () => {
    const { employee, action } = confirmDialog;
    setConfirmDialog({ open: false, employee: null, action: "" });
    setError("");
    
    try {
      await EmployeeApi.updateStatus(employee.uuid, action);
      await loadEmployees();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.page,
        padding: isMobile ? "16px" : isTablet ? "20px" : "32px",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)', 
        borderRadius: 14, 
        padding: isMobile ? '16px 20px' : '20px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 20, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 700, color: '#E8F0EE' }}>
            Employee Profile
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(232,240,238,0.6)' }}>
            View and manage all employee profiles
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          padding: isMobile ? 16 : 20,
          marginBottom: 24,
          boxShadow: C.shadow,
          border: `1px solid ${C.cardBorder}`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "2fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: C.textMuted,
              }}
            />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 14px 10px 44px",
                fontSize: "0.88rem",
                color: C.textMain,
                background: "#fff",
                outline: "none",
                fontFamily: "Poppins, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: "100%",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: "0.88rem",
              color: C.textMain,
              background: "#fff",
              outline: "none",
              fontFamily: "Poppins, sans-serif",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{
              width: "100%",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: "0.88rem",
              color: C.textMain,
              background: "#fff",
              outline: "none",
              fontFamily: "Poppins, sans-serif",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.uuid} value={dept.uuid}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 16, fontSize: 13, color: C.textMuted, fontWeight: 600 }}>
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            marginBottom: 24,
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
          <Loader size={40} style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ marginTop: 16, fontSize: 14 }}>Loading employees...</p>
        </div>
      )}

      {!loading && filteredEmployees.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isTablet
              ? "repeat(2, 1fr)"
              : "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {filteredEmployees.map((employee) => {
            const isActive = employee.status === "ACTIVE";
            
            return (
              <div
                key={employee.uuid}
                style={{
                  background: C.card,
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: C.shadow,
                  border: `1px solid ${C.cardBorder}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,60,45,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = C.shadow;
                }}
              >
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <EmployeeAvatar employee={employee} size={84} />
                </div>

                <div style={{ textAlign: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.textMain }}>
                    {employee.first_name} {employee.middle_name} {employee.last_name}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted, fontWeight: 600 }}>
                    {employee.mesob_id || "No ID"}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
                    <Briefcase size={14} style={{ color: C.primary, flexShrink: 0 }} />
                    <span>{employee.position_title || "No Position"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
                    <Building2 size={14} style={{ color: C.primary, flexShrink: 0 }} />
                    <span>{employee.department_name || "No Department"}</span>
                  </div>
                  {employee.level_name && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
                      <Shield size={14} style={{ color: C.primary, flexShrink: 0 }} />
                      <span>{employee.level_name}</span>
                    </div>
                  )}
                </div>

                {(employee.addresses?.[0]?.email || employee.addresses?.[0]?.phone_primary) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                    {employee.addresses?.[0]?.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textMuted }}>
                        <Mail size={12} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {employee.addresses[0].email}
                        </span>
                      </div>
                    )}
                    {employee.addresses?.[0]?.phone_primary && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textMuted }}>
                        <Phone size={12} style={{ flexShrink: 0 }} />
                        <span>{employee.addresses[0].phone_primary}</span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
                  <StatusBadge status={employee.status} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
                  <button
                    onClick={() => handleView(employee)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: 8,
                      border: `1.5px solid ${C.primary}`,
                      background: "transparent",
                      color: C.primary,
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(15,118,110,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Eye size={14} />
                    View
                  </button>

                  <Can action="update" resource="employees">
                    <button
                      onClick={() => handleEdit(employee)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 8,
                        border: "none",
                        background: C.primary,
                        color: "#fff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.primaryHov;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = C.primary;
                      }}
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  </Can>

                  <Can action="update" resource="employees">
                    <button
                      onClick={() => handleStatusChange(employee)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 8,
                        border: isActive ? "1.5px solid #94a3b8" : "1.5px solid #16a34a",
                        background: isActive ? "#f1f5f9" : "#dcfce7",
                        color: isActive ? "#64748b" : "#166534",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isActive ? "#e2e8f0" : "#bbf7d0";
                        e.currentTarget.style.borderColor = isActive ? "#64748b" : "#15803d";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isActive ? "#f1f5f9" : "#dcfce7";
                        e.currentTarget.style.borderColor = isActive ? "#94a3b8" : "#16a34a";
                      }}
                    >
                      {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                  </Can>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredEmployees.length === 0 && (
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            padding: 60,
            textAlign: "center",
            boxShadow: C.shadow,
            border: `1px solid ${C.cardBorder}`,
          }}
        >
          <Users size={64} style={{ color: C.textMuted, opacity: 0.3 }} />
          <h3 style={{ margin: "16px 0 8px", fontSize: 18, fontWeight: 600, color: C.textMain }}>
            No Employees Found
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: C.textMuted }}>
            {searchQuery || statusFilter !== "ALL" || departmentFilter !== "ALL"
              ? "Try adjusting your search or filters"
              : "No employees have been registered yet"}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.action === "ACTIVE" ? "Activate Employee" : "Deactivate Employee"}
        message={`Are you sure you want to ${confirmDialog.action === "ACTIVE" ? "activate" : "deactivate"} this employee?`}
        onConfirm={confirmStatusChange}
        onCancel={() => setConfirmDialog({ open: false, employee: null, action: "" })}
        confirmText={confirmDialog.action === "ACTIVE" ? "Activate" : "Deactivate"}
        confirmColor={confirmDialog.action === "ACTIVE" ? "#16a34a" : "#dc2626"}
      />
    </div>
  );
}
