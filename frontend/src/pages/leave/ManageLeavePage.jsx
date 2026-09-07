import React, { useState, useEffect, useCallback } from "react";
import { LeaveApi } from "../../api/leaveApi";
import StatusBadge from "../../components/StatusBadge";
import LeaveRequestDetailCard from "../../components/LeaveRequestDetailCard";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Eye } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useResponsive } from "../../hooks/useResponsive";

const LEAVE_TYPES = ["Annual", "Sick", "Maternity", "Paternity", "Emergency", "Unpaid"];
const STATUSES = ["PENDING_DEPARTMENT", "PENDING_HR", "APPROVED", "REJECTED_DEPARTMENT", "REJECTED_HR", "REJECTED", "CANCELLED"];

/* ── Palette ── */
const C = {
  card: '#EEF1F0',
  border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const S = {
  field: {
    width: "100%",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "9px 13px",
    fontSize: '0.82rem',
    fontFamily: "Poppins, sans-serif",
    color: C.textMain,
    outline: "none",
    background: C.card,
    boxSizing: 'border-box',
    transition: 'border 0.2s',
  },
  label: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: C.textSub,
    marginBottom: 5,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontFamily: "Poppins, sans-serif",
  },
  th: {
    padding: "11px 16px",
    textAlign: "left",
    fontSize: '0.68rem',
    fontWeight: 700,
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: `1px solid ${C.border}`,
    background: 'rgba(0,80,60,0.05)',
    fontFamily: "Poppins, sans-serif",
  },
  td: {
    padding: "12px 16px",
    fontSize: '0.8rem',
    color: C.textMain,
    borderBottom: `1px solid rgba(0,80,60,0.07)`,
    fontFamily: "Poppins, sans-serif",
  },
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return d;
  }
};

const resolveBudgetYear = (row) => {
  if (row?.budgetYear) return row.budgetYear;
  const s = row?.startDate || "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    let y = Number(m[1]) - 8;
    if (Number(m[2]) > 9 || (Number(m[2]) === 9 && Number(m[3]) >= 11)) y++;
    return String(y);
  }
  return "";
};

const getDayType = (row) => {
  const p = String(row?.dayPattern || "").toUpperCase();
  if (p === "FULL_DAY") return "Full Day";
  if (p === "HALF_DAY") return "Half Day";
  if (p === "MIXED") return "Mixed";
  const d = Number(row?.total_days);
  if (!isFinite(d) || d <= 0) return "—";
  return Number.isInteger(d) ? "Full Day" : "Half Day";
};

const GreenBtn = ({ children, onClick, disabled, type = "button", style = {} }) => {
  const baseBg = style.background || (disabled ? '#8AADA6' : C.primary);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#8AADA6' : C.primary,
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '9px 18px',
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'Poppins, sans-serif',
        transition: 'background 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = C.primaryHov;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = baseBg;
      }}
    >
      {children}
    </button>
  );
};

const PillBtn = ({ children, onClick, disabled, color = C.primary }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: C.card,
      color,
      border: `1.5px solid ${color}`,
      borderRadius: 20,
      padding: '6px 16px',
      fontSize: '0.72rem',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'Poppins, sans-serif',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = color;
        e.currentTarget.style.color = '#fff';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.background = C.card;
        e.currentTarget.style.color = color;
      }
    }}
  >
    {children}
  </button>
);

const Modal = ({ open, onClose, title, subtitle, children, maxWidth = 600 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.card,
          borderRadius: 14,
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'Poppins, sans-serif',
                color: C.textMain,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: '0.75rem',
                  color: C.textMuted,
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: C.textMain,
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
};

const ManageLeavePage = () => {
  const { user } = useAuth();
  const { isMobile, isTablet, r } = useResponsive();
  const userRole = user?.role || "";
  const userUuid = user?.uuid || "";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reqWindow, setReqWindow] = useState("ACTIVE");
  const [budgetYear, setBudgetYear] = useState("ALL");
  const [statusF, setStatusF] = useState("ALL");
  const [typeF, setTypeF] = useState("ALL");
  const [empF, setEmpF] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState("");
  const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
  const [rejectDialog, setRejectDialog] = useState({ open: false, uuid: null, reason: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await LeaveApi.getAdminRequests();
      setRequests((res?.data || []).map((r) => ({ ...r, _budgetYear: resolveBudgetYear(r) })));
    } catch {
      try {
        const r2 = await LeaveApi.getPendingRequests();
        setRequests((r2?.data || []).map((r) => ({ ...r, _budgetYear: resolveBudgetYear(r) })));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const budgetYears = [...new Set(requests.map((r) => r._budgetYear).filter(Boolean))].sort(
    (a, b) => Number(b) - Number(a)
  );

  const filtered = requests.filter((r) => {
    const isHR = ["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(userRole);
    const activeStatuses = isHR
      ? ["PENDING_HR"]
      : ["PENDING_DEPARTMENT"];
    const active = activeStatuses.includes(r.status);
    if (reqWindow === "ACTIVE" && !active) return false;
    if (reqWindow === "PAST" && active) return false;
    if (budgetYear !== "ALL" && r._budgetYear !== budgetYear) return false;
    if (statusF !== "ALL" && r.status !== statusF) return false;
    if (typeF !== "ALL" && r.leaveType !== typeF) return false;
    if (empF) {
      const n = (r.full_name || r.employee_name || r.employee_uuid || "").toLowerCase();
      if (!n.includes(empF.toLowerCase())) return false;
    }
    return true;
  });

  const onApprove = async (uuid) => {
    setDecisionLoading(uuid);
    try {
      await LeaveApi.decideRequest({ uuid, decision: "APPROVE", department_head_id: userUuid });
      load();
    } catch (e) {
      setErrorDialog({ open: true, message: e.message || "Failed to approve" });
    } finally {
      setDecisionLoading("");
    }
  };

  const onReject = async (uuid) => {
    setRejectDialog({ open: true, uuid, reason: "" });
  };

  const confirmReject = async () => {
    if (!rejectDialog.reason.trim()) {
      setErrorDialog({ open: true, message: "Rejection reason is required." });
      return;
    }
    setDecisionLoading(rejectDialog.uuid);
    try {
      await LeaveApi.decideRequest({
        uuid: rejectDialog.uuid,
        decision: "REJECT",
        department_head_id: userUuid,
        rejectionReason: rejectDialog.reason,
      });
      setRejectDialog({ open: false, uuid: null, reason: "" });
      load();
    } catch (e) {
      setErrorDialog({ open: true, message: e.message || "Failed to reject" });
    } finally {
      setDecisionLoading("");
    }
  };

  const canDecide = (s) => {
    const isHR = ["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(userRole);
    if (isHR) return s === "PENDING_HR";
    // Department head
    return s === "PENDING_DEPARTMENT";
  };

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          background: C.headerBg,
          borderRadius: 14,
          padding: '20px 26px',
          marginBottom: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}
      >
        <h1
          style={{
            color: '#E8F0EE',
            fontSize: '1.2rem',
            fontWeight: 700,
            margin: 0,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Leave Management
        </h1>
        <p
          style={{
            color: 'rgba(232,240,238,0.6)',
            fontSize: '0.75rem',
            margin: '3px 0 0',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Manage employee leave requests and policies
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <label style={S.label}>Request Set</label>
          <select value={reqWindow} onChange={(e) => setReqWindow(e.target.value)} style={S.field}>
            <option value="ACTIVE">Active Requests</option>
            <option value="PAST">Past Requests</option>
            <option value="ALL">All Requests</option>
          </select>
        </div>
        <div>
          <label style={S.label}>Budget Year</label>
          <select value={budgetYear} onChange={(e) => setBudgetYear(e.target.value)} style={S.field}>
            <option value="ALL">All</option>
            {budgetYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Status</label>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} style={S.field}>
            <option value="ALL">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Leave Type</label>
          <select value={typeF} onChange={(e) => setTypeF(e.target.value)} style={S.field}>
            <option value="ALL">All</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Employee</label>
          <input
            value={empF}
            onChange={(e) => setEmpF(e.target.value)}
            placeholder="Filter by employee name or ID"
            style={S.field}
          />
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: C.card,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          boxShadow: C.shadow,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                "Employee",
                "Budget Year",
                "Type",
                "Days",
                "Day Type",
                "Range",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} style={S.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ ...S.td, textAlign: "center", color: "#6B7280", padding: 48 }}
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ ...S.td, textAlign: "center", color: "#6B7280", padding: 48 }}
                >
                  No requests found.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={row.uuid || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>
                    {row.full_name || row.employee_name || row.employee_uuid || "—"}
                  </td>
                  <td style={S.td}>{row._budgetYear || "—"}</td>
                  <td style={S.td}>{row.leaveType || "—"}</td>
                  <td style={S.td}>{row.total_days ?? row.numberOfDays ?? "—"}</td>
                  <td style={S.td}>{getDayType(row)}</td>
                  <td style={S.td}>
                    {fmtDate(row.startDate)} – {fmtDate(row.endDate)}
                  </td>
                  <td style={S.td}>
                    <StatusBadge status={row.status} />
                  </td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <PillBtn onClick={() => setViewRow(row)}>View</PillBtn>
                      {canDecide(row.status) && (
                        <>
                          <PillBtn
                            onClick={() => onApprove(row.uuid)}
                            disabled={decisionLoading === row.uuid}
                            color="#10B981"
                          >
                            Approve
                          </PillBtn>
                          <PillBtn
                            onClick={() => onReject(row.uuid)}
                            disabled={decisionLoading === row.uuid}
                            color="#EF4444"
                          >
                            Reject
                          </PillBtn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      <Modal
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        title="Leave Request Details"
        subtitle={viewRow?.full_name || viewRow?.employee_uuid}
        maxWidth={900}
      >
        {viewRow && <LeaveRequestDetailCard request={viewRow} showEmployeeInfo={true} colorScheme={C} />}
      </Modal>

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

      {/* Reject Dialog with Reason Input */}
      {rejectDialog.open && (
        <div
          onClick={() => setRejectDialog({ open: false, uuid: null, reason: "" })}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(26, 46, 43, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 60px rgba(0, 60, 45, 0.2), 0 8px 28px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(0, 80, 60, 0.1)",
              animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setRejectDialog({ open: false, uuid: null, reason: "" })}
              disabled={decisionLoading === rejectDialog.uuid}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: decisionLoading === rejectDialog.uuid ? "not-allowed" : "pointer",
                opacity: decisionLoading === rejectDialog.uuid ? 0.4 : 0.6,
                transition: "all 0.2s ease",
                color: "#1A2E2B",
              }}
              onMouseEnter={(e) => {
                if (decisionLoading !== rejectDialog.uuid) {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.backgroundColor = "rgba(0, 80, 60, 0.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.6";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Content */}
            <div style={{ padding: "40px 32px 32px", textAlign: "center" }}>
              {/* Icon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                  animation: decisionLoading === rejectDialog.uuid ? "none" : "iconPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s backwards",
                }}
              >
                {decisionLoading === rejectDialog.uuid ? (
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      border: "4px solid rgba(220, 38, 38, 0.2)",
                      borderTopColor: "#DC2626",
                      animation: "continuousSpin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="32" cy="32" r="32" fill="#DC2626"/>
                    <path d="M24 24L40 40M40 24L24 40" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Title */}
              <h2
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "20px",
                  fontWeight: 600,
                  lineHeight: "1.3",
                  color: "#1A2E2B",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {decisionLoading === rejectDialog.uuid ? "Rejecting Request..." : "Reject Leave Request?"}
              </h2>

              {/* Description */}
              {decisionLoading !== rejectDialog.uuid && (
                <>
                  <p
                    style={{
                      margin: "0 0 20px 0",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: "#2A5C54",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Please provide a reason for rejecting this leave request.
                  </p>

                  {/* Reason Input */}
                  <textarea
                    value={rejectDialog.reason}
                    onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                    placeholder="Enter rejection reason..."
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1.5px solid rgba(0, 80, 60, 0.2)",
                      fontSize: "14px",
                      fontFamily: "Poppins, sans-serif",
                      color: "#1A2E2B",
                      resize: "vertical",
                      outline: "none",
                      transition: "border-color 0.2s ease",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#0F766E"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(0, 80, 60, 0.2)"}
                  />
                </>
              )}

              {/* Loading Message */}
              {decisionLoading === rejectDialog.uuid && (
                <p
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    color: "#2A5C54",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Please wait while we process your rejection...
                </p>
              )}
            </div>

            {/* Actions */}
            <div
              style={{
                padding: "0 32px 32px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Reject Button */}
              <button
                onClick={confirmReject}
                disabled={decisionLoading === rejectDialog.uuid || !rejectDialog.reason.trim()}
                style={{
                  width: "100%",
                  height: "48px",
                  padding: "0 24px",
                  fontSize: "15px",
                  fontWeight: 600,
                  fontFamily: "Poppins, sans-serif",
                  borderRadius: "12px",
                  cursor: decisionLoading === rejectDialog.uuid || !rejectDialog.reason.trim() ? "not-allowed" : "pointer",
                  backgroundColor: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  transition: "all 0.2s ease",
                  opacity: decisionLoading === rejectDialog.uuid || !rejectDialog.reason.trim() ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: decisionLoading === rejectDialog.uuid || !rejectDialog.reason.trim() ? "none" : "0 2px 8px rgba(220, 38, 38, 0.2)",
                }}
                onMouseEnter={(e) => {
                  if (decisionLoading !== rejectDialog.uuid && rejectDialog.reason.trim()) {
                    e.currentTarget.style.backgroundColor = "#B91C1C";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#DC2626";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = decisionLoading === rejectDialog.uuid || !rejectDialog.reason.trim() ? "none" : "0 2px 8px rgba(220, 38, 38, 0.2)";
                }}
              >
                {decisionLoading === rejectDialog.uuid && (
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      borderTopColor: "#FFFFFF",
                      borderRadius: "50%",
                      animation: "continuousSpin 0.6s linear infinite",
                    }}
                  />
                )}
                Reject Request
              </button>

              {/* Cancel Button */}
              {decisionLoading !== rejectDialog.uuid && (
                <button
                  onClick={() => setRejectDialog({ open: false, uuid: null, reason: "" })}
                  style={{
                    width: "100%",
                    height: "48px",
                    padding: "0 24px",
                    fontSize: "15px",
                    fontWeight: 500,
                    fontFamily: "Poppins, sans-serif",
                    borderRadius: "12px",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    color: "#1A2E2B",
                    border: "1.5px solid rgba(0, 80, 60, 0.2)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(0, 80, 60, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(0, 80, 60, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "rgba(0, 80, 60, 0.2)";
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageLeavePage;
