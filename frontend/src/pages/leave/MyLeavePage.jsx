import React, { useState, useEffect, useCallback, useRef } from "react";
import { LeaveApi } from "../../api/leaveApi";
import { AuthApi } from "../../api/authApi";
import StatusBadge from "../../components/StatusBadge";
import LeaveRequestDetailCard from "../../components/LeaveRequestDetailCard";
import PrettyDatePicker from "../../components/PrettyDatePicker";
import { Calendar, Upload, Eye } from "lucide-react";

const LEAVE_TYPES = ["Annual", "Sick", "Maternity", "Paternity", "Emergency", "Unpaid"];

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

const dayLabel = (d) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return d;
  }
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

const GreenBtn = ({ children, onClick, disabled, type = "button" }) => {
  const baseBg = disabled ? '#8AADA6' : C.primary;
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
        fontFamily: 'Poppins, sans-serif',
        transition: 'background 0.15s',
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

const OutlineBtn = ({ children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: C.card,
      color: C.textSub,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: '9px 18px',
      fontSize: '0.78rem',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'Poppins, sans-serif',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(15,118,110,0.08)';
      e.currentTarget.style.borderColor = C.primary;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = C.card;
      e.currentTarget.style.borderColor = C.border;
    }}
  >
    {children}
  </button>
);

const Modal = ({ open, onClose, title, children, maxWidth = 700 }) => {
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
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
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

// Balance Cards Component
const BalanceCards = ({ balance }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
    {[
      ["ENTITLED", balance?.entitledDays],
      ["CARRIED FORWARD", balance?.carriedForwardDays || balance?.carriedForward],
      ["REMAINING", balance?.remainingDays],
    ].map(([label, val]) => (
      <div
        key={label}
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: "20px 24px",
          boxShadow: C.shadow,
        }}
      >
        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            color: C.textMuted,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: 10,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: C.textMain,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {val != null ? Number(val).toFixed(1) : "—"}
        </div>
      </div>
    ))}
  </div>
);

// Request Leave Form
const RequestLeaveForm = ({ employeeUuid, onSubmitted }) => {
  const [form, setForm] = useState({
    leaveType: "Annual",
    startDate: "",
    numberOfDays: 1,
    reason: "",
  });
  const [leavePlan, setLeavePlan] = useState([]);
  const [planning, setPlanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState([]);
  const browseRef = useRef(null);

  const onPlanDays = async () => {
    if (!form.startDate) {
      setError("Choose a start date first.");
      return;
    }
    const n = parseInt(form.numberOfDays, 10);
    if (!n || n < 1) {
      setError("Enter a valid number of working days.");
      return;
    }
    setPlanning(true);
    setError("");
    try {
      const res = await LeaveApi.previewDates({
        startDate: form.startDate,
        numberOfDays: n,
        leaveType: form.leaveType,
        employee_uuid: employeeUuid,
      });
      const dates = res?.data?.workingDates || [];
      if (dates.length === 0) {
        const arr = [];
        const cur = new Date(form.startDate + "T00:00:00Z");
        while (arr.length < n) {
          const d = cur.getUTCDay();
          if (d !== 0 && d !== 6) arr.push(cur.toISOString().slice(0, 10));
          cur.setUTCDate(cur.getUTCDate() + 1);
          if (arr.length > 400) break;
        }
        setLeavePlan(arr.map((date) => ({ date, portion: "FULL" })));
      } else {
        setLeavePlan(dates.map((date) => ({ date, portion: "FULL" })));
      }
    } catch (e) {
      setError(e.message || "Preview failed.");
    } finally {
      setPlanning(false);
    }
  };

  const totalDays = leavePlan.reduce((s, d) => s + (d.portion === "HALF" ? 0.5 : 1), 0);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate) {
      setError("Start date is required.");
      return;
    }
    if (!form.reason.trim()) {
      setError("Reason is required.");
      return;
    }
    if (leavePlan.length === 0) {
      setError("Click Plan Days first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await LeaveApi.submitRequest({
        employee_uuid: employeeUuid,
        leaveType: form.leaveType,
        startDate: form.startDate,
        numberOfDays: totalDays,
        dailyPlan: leavePlan,
        reason: form.reason,
        documents: docs,
      });
      setForm({ leaveType: "Annual", startDate: "", numberOfDays: 1, reason: "" });
      setLeavePlan([]);
      setDocs([]);
      if (onSubmitted) onSubmitted();
    } catch (e) {
      setError(e.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div
          style={{
            padding: '11px 16px',
            borderRadius: 10,
            marginBottom: 16,
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.2)',
            color: '#DC2626',
            fontSize: '0.8rem',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <label style={S.label}>Leave Type</label>
          <select
            value={form.leaveType}
            onChange={(e) => setForm((p) => ({ ...p, leaveType: e.target.value }))}
            style={S.field}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>Start Date</label>
          <PrettyDatePicker
            value={form.startDate}
            onChange={v => setForm(p => ({ ...p, startDate: v }))}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <label style={S.label}>Working Days</label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.numberOfDays}
            onChange={(e) => setForm((p) => ({ ...p, numberOfDays: e.target.value }))}
            style={S.field}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <OutlineBtn onClick={onPlanDays} disabled={planning}>
            {planning ? "Planning..." : "Plan Days"}
          </OutlineBtn>
        </div>
      </div>

      {leavePlan.length > 0 && (
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 16,
            background: 'rgba(0,80,60,0.03)',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={S.label}>Day-by-Day Plan</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setLeavePlan((p) => p.map((d) => ({ ...d, portion: "FULL" })))}
                style={{
                  fontSize: '0.68rem',
                  padding: '5px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: C.card,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  color: C.textSub,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(15,118,110,0.08)';
                  e.currentTarget.style.borderColor = C.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.card;
                  e.currentTarget.style.borderColor = C.border;
                }}
              >
                All Full
              </button>
              <button
                type="button"
                onClick={() => setLeavePlan((p) => p.map((d) => ({ ...d, portion: "HALF" })))}
                style={{
                  fontSize: '0.68rem',
                  padding: '5px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: C.card,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  color: C.textSub,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(15,118,110,0.08)';
                  e.currentTarget.style.borderColor = C.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.card;
                  e.currentTarget.style.borderColor = C.border;
                }}
              >
                All Half
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {leavePlan.map((item, idx) => (
              <div
                key={item.date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
                    Day {idx + 1}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", fontFamily: "Inter, sans-serif" }}>
                    {dayLabel(item.date)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {["FULL", "HALF"].map((p) => (
                    <label
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: '0.78rem',
                        cursor: "pointer",
                        fontFamily: 'Poppins, sans-serif',
                        color: C.textMain,
                      }}
                    >
                      <input
                        type="radio"
                        name={`day-${item.date}`}
                        checked={item.portion === p}
                        onChange={() =>
                          setLeavePlan((prev) =>
                            prev.map((d) => (d.date === item.date ? { ...d, portion: p } : d))
                          )
                        }
                      />
                      {p === "FULL" ? "Full" : "Half"}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: '0.82rem', fontWeight: 700, color: C.primary, fontFamily: 'Poppins, sans-serif' }}>
            Requested Leave Days: {totalDays.toFixed(1)}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Reason</label>
        <textarea
          value={form.reason}
          onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
          rows={4}
          style={{ ...S.field, resize: "vertical" }}
          placeholder="Enter reason for leave request..."
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Supporting Documents (Optional)</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDocs((prev) => [...prev, ...Array.from(e.dataTransfer.files || [])]);
          }}
          onClick={() => browseRef.current?.click()}
          style={{
            border: `2px dashed ${C.border}`,
            borderRadius: 10,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: 'rgba(0,80,60,0.03)',
            cursor: "pointer",
          }}
        >
          <Upload size={40} color={C.textMuted} />
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.textMain, fontFamily: 'Poppins, sans-serif' }}>
            Drag and drop files here
          </div>
          <div style={{ fontSize: '0.75rem', color: C.textMuted, fontFamily: 'Poppins, sans-serif' }}>
            Supported: PDF, PNG, JPG (Max 10MB)
          </div>
          <OutlineBtn onClick={(e) => { e.stopPropagation(); browseRef.current?.click(); }}>
            Browse Files
          </OutlineBtn>
          <input
            ref={browseRef}
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg"
            style={{ display: "none" }}
            onChange={(e) => setDocs((prev) => [...prev, ...Array.from(e.target.files || [])])}
          />
        </div>
        {docs.length > 0 && (
          <div style={{ marginTop: 12, fontSize: '0.78rem', color: C.textSub, fontFamily: 'Poppins, sans-serif' }}>
            {docs.length} file(s) selected: {docs.map((f) => f.name).join(", ")}
            <button
              type="button"
              onClick={() => setDocs([])}
              style={{
                marginLeft: 12,
                color: '#DC2626',
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: '0.78rem',
                fontWeight: 600,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <OutlineBtn
          onClick={() => {
            setForm({ leaveType: "Annual", startDate: "", numberOfDays: 1, reason: "" });
            setLeavePlan([]);
            setDocs([]);
          }}
        >
          Reset
        </OutlineBtn>
        <GreenBtn type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Request"}
        </GreenBtn>
      </div>
    </form>
  );
};

// Leave History Component
const LeaveHistory = ({ employeeUuid, onBalanceRefresh }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewRow, setViewRow] = useState(null);

  // Cancel state
  const [cancelDialog, setCancelDialog] = useState({ open: false, row: null });
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Shorten state
  const [shortenDialog, setShortenDialog] = useState({ open: false, row: null });
  const [shortenNewEndDate, setShortenNewEndDate] = useState("");
  const [shortenPreview, setShortenPreview] = useState(null);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [shortenError, setShortenError] = useState("");
  const [shortenConfirmed, setShortenConfirmed] = useState(false);

  const load = useCallback(async () => {
    if (!employeeUuid) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await LeaveApi.getEmployeeRequests(employeeUuid);
      setRequests(r?.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [employeeUuid]);

  useEffect(() => { load(); }, [load]);

  const todayUtc = new Date().toISOString().slice(0, 10);

  // Cancel: pending/approved + before start date
  const canCancel = (row) => {
    const CANCELLABLE = ["PENDING_DEPARTMENT", "PENDING_HR", "APPROVED", "PENDING"];
    if (!CANCELLABLE.includes(row.status)) return false;
    if (!row.startDate) return false;
    return todayUtc < row.startDate;
  };

  // Shorten: approved + leave has NOT yet ended (works both before and during leave)
  const canShorten = (row) => {
    if (row.status !== "APPROVED") return false;
    if (!row.startDate || !row.endDate) return false;
    // Block only when leave has already ended
    return todayUtc <= row.endDate;
  };

  // ── Cancel handlers ──────────────────────────────────────────
  const confirmCancel = async () => {
    if (!cancelDialog.row) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      await LeaveApi.cancelRequest(cancelDialog.row.uuid);
      setCancelDialog({ open: false, row: null });
      load();
      if (onBalanceRefresh) onBalanceRefresh();
    } catch (e) {
      setCancelError(e.message || "Failed to cancel request.");
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Shorten handlers ─────────────────────────────────────────
  const openShorten = (row) => {
    // Default selected date:
    //   - Before leave: one day before the current end date
    //   - During leave: today (earliest reasonable return)
    const leaveStarted = todayUtc >= row.startDate;
    let defaultDate = "";
    if (leaveStarted) {
      // During leave: default to today (they're returning today)
      defaultDate = todayUtc;
    } else {
      // Before leave: default to one calendar day before current endDate
      const d = new Date(`${row.endDate}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      const candidate = d.toISOString().slice(0, 10);
      // Must still be >= startDate
      defaultDate = candidate >= row.startDate ? candidate : row.startDate;
    }
    setShortenDialog({ open: true, row });
    setShortenNewEndDate(defaultDate);
    setShortenPreview(computeShortenPreview(row, defaultDate));
    setShortenError("");
    setShortenConfirmed(false);
  };

  const closeShorten = () => {
    if (shortenLoading) return;
    setShortenDialog({ open: false, row: null });
    setShortenNewEndDate("");
    setShortenPreview(null);
    setShortenError("");
    setShortenConfirmed(false);
  };

  // Preview: estimate days taken (startDate → newEndDate inclusive) vs original total_days.
  // Server computes exact working-day counts; this is a calendar-day estimate for the UI.
  const computeShortenPreview = (row, newEnd) => {
    if (!newEnd || !row) return null;
    if (newEnd < row.startDate) return null;
    if (newEnd >= row.endDate) return null;
    const msPerDay = 86400000;
    const startMs = Date.parse(`${row.startDate}T00:00:00Z`);
    const newEndMs = Date.parse(`${newEnd}T00:00:00Z`);
    const origEndMs = Date.parse(`${row.endDate}T00:00:00Z`);
    const calDaysKept = Math.round((newEndMs - startMs) / msPerDay) + 1;
    const calDaysOrig = Math.round((origEndMs - startMs) / msPerDay) + 1;
    const calDaysRefunded = calDaysOrig - calDaysKept;
    return { calDaysKept, calDaysRefunded, calDaysOrig };
  };

  const handleShortenDateChange = (val) => {
    setShortenNewEndDate(val);
    setShortenError("");
    setShortenPreview(computeShortenPreview(shortenDialog.row, val));
  };

  const submitShorten = async () => {
    if (!shortenDialog.row || !shortenNewEndDate) return;
    setShortenLoading(true);
    setShortenError("");
    try {
      await LeaveApi.shortenApprovedRequest({
        uuid: shortenDialog.row.uuid,
        newEndDate: shortenNewEndDate,
      });
      setShortenConfirmed(true);
      load();
      if (onBalanceRefresh) onBalanceRefresh();
      setTimeout(() => closeShorten(), 2000);
    } catch (e) {
      setShortenError(e.message || "Failed to shorten leave.");
    } finally {
      setShortenLoading(false);
    }
  };

  // Shorten date constraints:
  //   min = startDate (must keep at least the first day)
  //   max = endDate - 1 (must actually shorten something)
  //         but if leave has started, also cap at today (can't pick future end)
  const shortenRow = shortenDialog.row;
  const shortenLeaveStarted = shortenRow ? todayUtc >= shortenRow.startDate : false;
  const shortenMinDate = shortenRow?.startDate ?? "";
  const shortenMaxDate = (() => {
    if (!shortenRow) return "";
    // One day before the current endDate
    const d = new Date(`${shortenRow.endDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    const dayBeforeEnd = d.toISOString().slice(0, 10);
    // If leave already started, also cap at today
    if (shortenLeaveStarted && todayUtc < dayBeforeEnd) return todayUtc;
    return dayBeforeEnd;
  })();

  return (
    <div>
      {/* ── History Table ── */}
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
              {["Type", "Start", "End", "Days", "Day Type", "Status", "Reason", ""].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#6B7280", padding: 48 }}>Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#6B7280", padding: 48 }}>No leave history found.</td></tr>
            ) : (
              requests.map((row, i) => (
                <tr key={row.uuid || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={S.td}>{row.leaveType || "—"}</td>
                  <td style={S.td}>{fmtDate(row.startDate)}</td>
                  <td style={S.td}>
                    <div>{fmtDate(row.endDate)}</div>
                    {row.is_shortened && row.original_end_date && (
                      <div style={{ fontSize: '0.68rem', color: '#6B7280', textDecoration: 'line-through' }}>
                        {fmtDate(row.original_end_date)}
                      </div>
                    )}
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: C.primary }}>
                    {row.total_days ?? row.numberOfDays ?? "—"}
                  </td>
                  <td style={S.td}>{getDayType(row)}</td>
                  <td style={S.td}>
                    <StatusBadge status={row.status} />
                    {row.is_shortened ? (
                      <div style={{ fontSize: '0.62rem', color: '#6B7280', marginTop: 3, fontStyle: 'italic' }}>
                        Shortened
                      </div>
                    ) : null}
                  </td>
                  <td style={{ ...S.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6B7280" }}>
                    {row.reason || "—"}
                  </td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
                      {/* View */}
                      <button
                        onClick={() => setViewRow(row)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#3B82F6", padding: 4 }}
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Shorten Days */}
                      {canShorten(row) && (
                        <button
                          onClick={() => openShorten(row)}
                          style={{
                            background: 'rgba(15,118,110,0.08)',
                            color: C.primary,
                            border: `1px solid rgba(15,118,110,0.3)`,
                            borderRadius: 6,
                            padding: '4px 9px',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Poppins, sans-serif',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15,118,110,0.08)'; e.currentTarget.style.color = C.primary; }}
                          title="Return to work early"
                        >
                          Shorten Days
                        </button>
                      )}

                      {/* Cancel */}
                      {canCancel(row) && (
                        <button
                          onClick={() => setCancelDialog({ open: true, row })}
                          style={{
                            background: 'rgba(220,38,38,0.07)',
                            color: '#DC2626',
                            border: '1px solid rgba(220,38,38,0.25)',
                            borderRadius: 6,
                            padding: '4px 9px',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Poppins, sans-serif',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.07)'; e.currentTarget.style.color = '#DC2626'; }}
                          title="Cancel this request"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── View Detail Modal ── */}
      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Leave Request Details">
        {viewRow && <LeaveRequestDetailCard request={viewRow} colorScheme={C} />}
      </Modal>

      {/* ── Shorten Days Modal ── */}
      {shortenDialog.open && (
        <div
          onClick={closeShorten}
          style={{ position: "fixed", inset: 0, background: "rgba(26,46,43,0.75)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,60,45,0.22)", border: "1px solid rgba(0,80,60,0.1)", fontFamily: "Poppins, sans-serif" }}
          >
            {/* Header */}
            <div style={{ padding: "22px 28px 16px", borderBottom: "1px solid rgba(0,80,60,0.08)" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1A2E2B" }}>
                Shorten Leave Duration
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#6B7280" }}>
                {shortenDialog.row?.leaveType} leave · {fmtDate(shortenDialog.row?.startDate)} → {fmtDate(shortenDialog.row?.endDate)}
                {shortenDialog.row?.total_days ? ` · ${Number(shortenDialog.row.total_days).toFixed(1)} approved days` : ""}
              </p>
              {shortenLeaveStarted ? (
                <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#0F766E", fontWeight: 600 }}>
                  Leave in progress — select your new last day of leave.
                </p>
              ) : (
                <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#6B7280" }}>
                  Leave has not started yet — you can reduce the approved duration.
                </p>
              )}
            </div>

            <div style={{ padding: "22px 28px" }}>
              {shortenConfirmed ? (
                /* ── Success state ── */
                <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1A2E2B", margin: "0 0 6px" }}>Leave shortened successfully</p>
                  <p style={{ fontSize: "0.78rem", color: "#6B7280", margin: 0 }}>Your leave balance has been updated. Closing…</p>
                </div>
              ) : (
                <>
                  {/* ── Leave period info ── */}
                  <div style={{ background: "rgba(0,80,60,0.04)", border: "1px solid rgba(0,80,60,0.1)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      {[
                        ["Leave Start", fmtDate(shortenDialog.row?.startDate)],
                        ["Original End", fmtDate(shortenDialog.row?.endDate)],
                        ["Approved Days", Number(shortenDialog.row?.total_days || 0).toFixed(1)],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1A2E2B" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Return date picker ── */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ ...S.label, marginBottom: 8 }}>
                      {shortenLeaveStarted ? "Select Your Last Day of Leave (New End Date)" : "Select New End Date"}
                    </label>
                    <input
                      type="date"
                      value={shortenNewEndDate}
                      min={shortenMinDate}
                      max={shortenMaxDate}
                      onChange={(e) => handleShortenDateChange(e.target.value)}
                      style={{ ...S.field, fontSize: "0.9rem", padding: "10px 14px" }}
                    />
                    <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: "#6B7280" }}>
                      {shortenLeaveStarted
                        ? `Must be between ${fmtDate(shortenMinDate)} and today (${fmtDate(todayUtc)}).`
                        : `Must be between ${fmtDate(shortenMinDate)} and ${fmtDate(shortenMaxDate)}.`}
                    </p>
                  </div>

                  {/* ── Preview ── */}
                  {shortenNewEndDate && shortenPreview && (
                    <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                        Preview of Changes
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[
                          ["New End Date", fmtDate(shortenNewEndDate)],
                          ["Original End", fmtDate(shortenDialog.row?.endDate)],
                          ["Days Returned", `≈ ${shortenPreview.calDaysRefunded} cal. days`],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#065F46" }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {shortenLeaveStarted && (
                        <div style={{ marginTop: 10, fontSize: "0.75rem", color: "#065F46" }}>
                          Return to work: <strong>{fmtDate((() => { const d = new Date(`${shortenNewEndDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })())}</strong>
                        </div>
                      )}
                      <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(16,185,129,0.1)", borderRadius: 7, fontSize: "0.77rem", color: "#065F46", fontWeight: 600 }}>
                        Unused leave days will be returned to your balance. Exact count is calculated by the server.
                      </div>
                    </div>
                  )}

                  {shortenNewEndDate && !shortenPreview && (
                    <div style={{ padding: "10px 14px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 8, fontSize: "0.78rem", color: "#DC2626", marginBottom: 16 }}>
                      Selected date is outside the allowed range. The new end date must be between {fmtDate(shortenMinDate)} and {fmtDate(shortenMaxDate)}.
                    </div>
                  )}

                  {shortenError && (
                    <div style={{ padding: "10px 14px", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, fontSize: "0.78rem", color: "#DC2626", marginBottom: 16, fontWeight: 500 }}>
                      {shortenError}
                    </div>
                  )}

                  {/* ── Actions ── */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={closeShorten}
                      disabled={shortenLoading}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid rgba(0,80,60,0.2)", background: "transparent", color: "#1A2E2B", fontSize: "0.82rem", fontWeight: 600, cursor: shortenLoading ? "not-allowed" : "pointer", opacity: shortenLoading ? 0.5 : 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitShorten}
                      disabled={shortenLoading || !shortenNewEndDate || !shortenPreview}
                      style={{
                        flex: 2,
                        padding: "11px 0",
                        borderRadius: 10,
                        border: "none",
                        background: (shortenLoading || !shortenNewEndDate || !shortenPreview) ? "#8AADA6" : C.primary,
                        color: "#fff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: (shortenLoading || !shortenNewEndDate || !shortenPreview) ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!shortenLoading && shortenNewEndDate && shortenPreview) e.currentTarget.style.background = C.primaryHov; }}
                      onMouseLeave={(e) => { if (!shortenLoading && shortenNewEndDate && shortenPreview) e.currentTarget.style.background = C.primary; }}
                    >
                      {shortenLoading && (
                        <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                      )}
                      {shortenLoading ? "Shortening..." : "Confirm & Shorten Leave"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Confirmation Dialog ── */}
      {cancelDialog.open && (
        <div
          onClick={() => { if (!cancelLoading) { setCancelDialog({ open: false, row: null }); setCancelError(""); } }}
          style={{ position: "fixed", inset: 0, background: "rgba(26,46,43,0.75)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,60,45,0.2)", border: "1px solid rgba(0,80,60,0.1)", fontFamily: "Poppins, sans-serif", padding: "36px 32px 28px", textAlign: "center" }}
          >
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(220,38,38,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem", fontWeight: 700, color: "#1A2E2B" }}>Cancel Leave Request?</h3>
            <p style={{ margin: "0 0 6px", fontSize: "0.82rem", color: "#2E6058", lineHeight: 1.6 }}>
              You are about to cancel your <strong>{cancelDialog.row?.leaveType}</strong> leave request starting <strong>{fmtDate(cancelDialog.row?.startDate)}</strong>.
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "0.78rem", color: "#6B7280", lineHeight: 1.5 }}>
              This action cannot be undone. The request will be permanently marked as <strong>CANCELLED</strong> and removed from all approval queues.
              {cancelDialog.row?.status === "APPROVED" && <span> Your leave balance will be restored.</span>}
            </p>
            {cancelError && (
              <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626", fontSize: "0.78rem", fontWeight: 500, textAlign: "left" }}>
                {cancelError}
              </div>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => { setCancelDialog({ open: false, row: null }); setCancelError(""); }}
                disabled={cancelLoading}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid rgba(0,80,60,0.2)", background: "transparent", color: "#1A2E2B", fontSize: "0.82rem", fontWeight: 600, cursor: cancelLoading ? "not-allowed" : "pointer", opacity: cancelLoading ? 0.5 : 1 }}
              >
                Keep Request
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelLoading}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: cancelLoading ? "#EF9A9A" : "#DC2626", color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: cancelLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.15s" }}
                onMouseEnter={(e) => { if (!cancelLoading) e.currentTarget.style.background = "#B91C1C"; }}
                onMouseLeave={(e) => { if (!cancelLoading) e.currentTarget.style.background = "#DC2626"; }}
              >
                {cancelLoading && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />}
                {cancelLoading ? "Cancelling..." : "Yes, Cancel It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
const MyLeavePage = () => {
  const user = AuthApi.getStoredUser();
  const employeeUuid = user?.employee_uuid || "";
  const [tab, setTab] = useState("request");
  const [balance, setBalance] = useState(null);

  const loadBalance = useCallback(async () => {
    if (!employeeUuid) return;
    try {
      const r = await LeaveApi.getBalance(employeeUuid);
      setBalance(r?.data || r || null);
    } catch {}
  }, [employeeUuid]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const TAB_STYLE = (active) => ({
    flex: 1,
    padding: '14px 0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: 'transparent',
    borderBottom: active ? `2.5px solid ${C.primary}` : '2.5px solid transparent',
    color: active ? C.primary : C.textMuted,
    fontFamily: 'Poppins, sans-serif',
    transition: 'all 0.15s',
  });

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
          My Leave
        </h1>
        <p
          style={{
            color: 'rgba(232,240,238,0.6)',
            fontSize: '0.75rem',
            margin: '3px 0 0',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          Request new leave and view your leave history
        </p>
      </div>

      {/* Balance Cards */}
      <BalanceCards balance={balance} />

      {/* Tab Bar */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          display: 'flex',
          marginBottom: 20,
          overflow: 'hidden',
          boxShadow: C.shadow,
        }}
      >
        <button style={TAB_STYLE(tab === "request")} onClick={() => setTab("request")}>
          <Calendar size={14} style={{ display: "inline", marginRight: 6 }} />
          REQUEST LEAVE
        </button>
        <button style={TAB_STYLE(tab === "history")} onClick={() => setTab("history")}>
          <Eye size={14} style={{ display: "inline", marginRight: 6 }} />
          LEAVE HISTORY
        </button>
      </div>

      {/* Content */}
      {tab === "request" && (
        <div
          style={{
            background: C.card,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            padding: 28,
            boxShadow: C.shadow,
          }}
        >
          <RequestLeaveForm
            employeeUuid={employeeUuid}
            onSubmitted={() => {
              loadBalance();
              setTab("history");
            }}
          />
        </div>
      )}

      {tab === "history" && <LeaveHistory employeeUuid={employeeUuid} onBalanceRefresh={loadBalance} />}
    </div>
  );
};

// Inject keyframe for cancel spinner
if (typeof document !== "undefined") {
  const styleId = "my-leave-cancel-spin";
  if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(s);
  }
}

export default MyLeavePage;
