import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, User, Phone, Briefcase, FileText,
  Pencil, Upload, Plus, Trash2, UserCircle, BookOpen,
  Globe, Tag, Calendar, Settings, CreditCard, Building2,
  MapPin, Mail, Hash, Camera, Shield, Check, Copy, Clock,
  ChevronRight, AlertCircle, Sparkles
} from "lucide-react";
import { EmployeeApi } from "../api/employeeApi";
import { LevelApi } from "../api/levelApi";
import { getAllRoles } from "../api/roleManagement";
import PrettyDatePicker from "../components/PrettyDatePicker";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmployeeFaceRegistration from "../components/EmployeeFaceRegistration";

/* ── Modern Design Tokens ── */
const C = {
  pageBg: "#E8EEEC",
  cardBg: "#FFFFFF",
  cardSubtle: "#F6FAF9",
  cardBorder: "rgba(15, 118, 110, 0.12)",
  cardBorderHover: "rgba(15, 118, 110, 0.28)",
  shadowSm: "0 2px 8px rgba(12, 40, 35, 0.05)",
  shadowMd: "0 6px 20px rgba(12, 40, 35, 0.08)",
  shadowLg: "0 12px 32px rgba(12, 40, 35, 0.12)",
  primary: "#0F766E",
  primaryHover: "#115E59",
  primaryLight: "#CCFBF1",
  primaryAccent: "#14B8A6",
  textMain: "#0F2824",
  textSub: "#1E4A42",
  textMuted: "#4B726B",
  borderLight: "rgba(15, 118, 110, 0.15)",
  heroBg: "linear-gradient(135deg, #071E1B 0%, #0F3E37 55%, #155E54 100%)",
};

/* ── Helpers ── */
function calculateTenure(hireDate) {
  if (!hireDate) return "—";
  const start = new Date(hireDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years <= 0 && months <= 0) return "Just started";
  const parts = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? "s" : ""}`);
  return parts.join(" ") || "—";
}

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

/* ── Buttons ── */
const PrimaryBtn = ({ children, onClick, disabled, style = {}, icon }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: disabled
          ? "#94A3B8"
          : hover
          ? C.primaryHover
          : C.primary,
        color: "#fff",
        border: "none",
        borderRadius: 9,
        padding: "8px 16px",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "Poppins, sans-serif",
        boxShadow: hover && !disabled ? "0 4px 12px rgba(15,118,110,0.3)" : "none",
        transition: "all 0.18s ease",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const SecondaryBtn = ({ children, onClick, style = {}, icon }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(15,118,110,0.08)" : "#fff",
        color: C.primary,
        border: `1.5px solid ${C.primary}`,
        borderRadius: 9,
        padding: "8px 16px",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontFamily: "Poppins, sans-serif",
        transition: "all 0.18s ease",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE: { bg: "#DCFCE7", color: "#15803D", border: "#86EFAC", label: "Active" },
    INACTIVE: { bg: "#FEF9C3", color: "#854D0E", border: "#FDE047", label: "Inactive" },
    TERMINATED: { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5", label: "Terminated" },
  };
  const s = map[status] || { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1", label: status || "—" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: "0.74rem",
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
};

/* ── Modern Data Row Item ── */
const DetailItem = ({ icon, label, value, copyable }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value || value === "—") return;
    navigator.clipboard?.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "10px 14px",
        borderRadius: 10,
        background: C.cardSubtle,
        border: `1px solid ${C.cardBorder}`,
        transition: "border-color 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted }}>
          {icon}
          <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {label}
          </span>
        </div>
        {copyable && value && value !== "—" && (
          <button
            onClick={handleCopy}
            title="Copy value"
            style={{
              background: "none",
              border: "none",
              padding: 2,
              cursor: "pointer",
              color: copied ? "#16A34A" : C.textMuted,
              display: "flex",
              alignItems: "center",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
      <div style={{ fontSize: "0.92rem", fontWeight: 600, color: C.textMain, wordBreak: "break-word" }}>
        {value || "—"}
      </div>
    </div>
  );
};

/* ── Modern Section Card ── */
const ModernCard = ({ title, icon, action, children }) => (
  <div
    style={{
      background: C.cardBg,
      borderRadius: 14,
      border: `1px solid ${C.cardBorder}`,
      boxShadow: C.shadowSm,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: `1px solid ${C.borderLight}`,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F9FBFB 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(15,118,110,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.primary,
          }}
        >
          {icon}
        </div>
        <h3 style={{ margin: 0, fontSize: "0.96rem", fontWeight: 700, color: C.textMain }}>
          {title}
        </h3>
      </div>
      {action}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);

/* ── Modal Component ── */
const Modal = ({ open, onClose, title, subtitle, children, maxWidth = 640 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7, 30, 27, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: C.shadowLg,
          border: `1px solid ${C.cardBorder}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${C.borderLight}`,
            background: "linear-gradient(135deg, #F8FAFA 0%, #FFFFFF 100%)",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: C.textMain }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: C.textMuted }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(15,118,110,0.06)",
              border: `1px solid ${C.borderLight}`,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              color: C.textMain,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "22px 24px" }}>{children}</div>
      </div>
    </div>
  );
};

/* ── Form Styles ── */
const inputStyle = {
  width: "100%",
  border: `1px solid ${C.borderLight}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: "0.85rem",
  color: C.textMain,
  background: "#fff",
  outline: "none",
  fontFamily: "Poppins, sans-serif",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const labelStyle = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: C.textSub,
  display: "block",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

/* ── Edit Personal Modal ── */
const EditPersonalModal = ({ employee, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: employee?.title || "Mr",
    first_name: employee?.first_name || "",
    middle_name: employee?.middle_name || "",
    last_name: employee?.last_name || "",
    mother_name: employee?.mother_name || "",
    gender: employee?.gender || "MALE",
    date_of_birth: employee?.date_of_birth?.slice(0, 10) || "",
    nationality: employee?.nationality || "Ethiopian",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e) => {
    e?.preventDefault();
    const parts = form.mother_name.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      setError("Please enter the mother's full name (at least first and last name).");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await EmployeeApi.update(employee.uuid, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update personal details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Edit Personal Information" subtitle="Update identity and demographic information" onClose={onClose} maxWidth={580}>
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", fontSize: 13 }}>
          {error}
        </div>
      )}
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <select value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} style={inputStyle}>
              {["Mr", "Mrs", "Ms", "Dr", "Prof", "Ato", "W/ro", "W/t"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} style={inputStyle}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input required value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Middle Name *</label>
            <input required value={form.middle_name} onChange={(e) => setForm((p) => ({ ...p, middle_name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input required value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Mother's Full Name *</label>
          <input required placeholder="First and last name" value={form.mother_name} onChange={(e) => setForm((p) => ({ ...p, mother_name: e.target.value }))} style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Date of Birth *</label>
            <PrettyDatePicker value={form.date_of_birth} onChange={(v) => setForm((p) => ({ ...p, date_of_birth: v }))} />
          </div>
          <div>
            <label style={labelStyle}>Nationality</label>
            <input value={form.nationality} onChange={(e) => setForm((p) => ({ ...p, nationality: e.target.value }))} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
          <SecondaryBtn onClick={onClose} type="button">Cancel</SecondaryBtn>
          <PrimaryBtn type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
};

/* ── Edit Employment Modal ── */
const EditEmploymentModal = ({ employee, departments, positions, levels, roles, onClose, onSaved }) => {
  const [form, setForm] = useState({
    hire_date: employee?.hire_date?.slice(0, 10) || "",
    department_uuid: employee?.department_uuid || "",
    position_uuid: employee?.position_uuid || "",
    level_uuid: employee?.level_uuid || "",
    role_uuid: employee?.role_uuid || "",
    tin_number: employee?.tin_number || "",
    pension_code: employee?.pension_code || "",
    bank_name: employee?.bank_name || "",
    bank_account_number: employee?.bank_account_number || "",
    prior_gov_service_years: employee?.prior_gov_service_years ?? employee?.prior_gov_service ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        prior_gov_service: form.prior_gov_service_years,
      };
      await EmployeeApi.update(employee.uuid, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update employment details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Edit Employment & Role"
      subtitle="Modify department, role, compensation level and payroll identifiers"
      onClose={onClose}
      maxWidth={680}
    >
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", fontSize: 13 }}>
          {error}
        </div>
      )}
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Department, Position, Level */}
        <div style={{ padding: "14px 16px", borderRadius: 10, background: C.cardSubtle, border: `1px solid ${C.cardBorder}` }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "0.8rem", fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Organizational Assignment
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Department</label>
              <select
                value={form.department_uuid}
                onChange={(e) => setForm((p) => ({ ...p, department_uuid: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Select Department —</option>
                {departments.map((d) => (
                  <option key={d.uuid} value={d.uuid}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <select
                value={form.position_uuid}
                onChange={(e) => setForm((p) => ({ ...p, position_uuid: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Select Position —</option>
                {positions.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Compensation Level</label>
            <select
              value={form.level_uuid}
              onChange={(e) => setForm((p) => ({ ...p, level_uuid: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— Select Compensation Level —</option>
              {levels.map((l) => (
                <option key={l.uuid} value={l.uuid}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>System Access Role</label>
            <select
              value={form.role_uuid}
              onChange={(e) => setForm((p) => ({ ...p, role_uuid: e.target.value }))}
              style={inputStyle}
            >
              <option value="">— No Role Assigned —</option>
              {roles && roles.length > 0 ? (
                roles.map((r) => (
                  <option key={r.uuid} value={r.uuid}>
                    {r.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>No roles available (requires HR Admin permission)</option>
              )}
            </select>
            <p style={{ fontSize: "0.7rem", color: C.textMuted, marginTop: 6, fontStyle: "italic" }}>
              Assigns system access permissions to this employee's account
              {(!roles || roles.length === 0) && ". Requires HR Admin or Super Admin permission to view and assign roles."}
            </p>
          </div>
        </div>

        {/* Dates & Tenure */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Join / Hire Date</label>
            <PrettyDatePicker
              value={form.hire_date}
              onChange={(v) => setForm((p) => ({ ...p, hire_date: v }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Prior Gov Service (Years)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.prior_gov_service_years}
              onChange={(e) => setForm((p) => ({ ...p, prior_gov_service_years: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Banking and Tax */}
        <div style={{ padding: "14px 16px", borderRadius: 10, background: C.cardSubtle, border: `1px solid ${C.cardBorder}` }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "0.8rem", fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Payroll & Tax Identifiers
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Bank Name</label>
              <input
                placeholder="e.g. Commercial Bank of Ethiopia"
                value={form.bank_name}
                onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Bank Account Number</label>
              <input
                placeholder="Account number"
                value={form.bank_account_number}
                onChange={(e) => setForm((p) => ({ ...p, bank_account_number: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>TIN Number</label>
              <input
                placeholder="10-digit TIN"
                value={form.tin_number}
                onChange={(e) => setForm((p) => ({ ...p, tin_number: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Pension Code</label>
              <input
                placeholder="Pension identifier"
                value={form.pension_code}
                onChange={(e) => setForm((p) => ({ ...p, pension_code: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
          <SecondaryBtn onClick={onClose} type="button">Cancel</SecondaryBtn>
          <PrimaryBtn type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
};

/* ── Employment Tab Panel ── */
const EmploymentTab = ({ emp, onEdit }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Role & Org */}
        <ModernCard
          title="Organizational Position"
          icon={<Briefcase size={18} />}
          action={
            <SecondaryBtn onClick={onEdit} icon={<Pencil size={12} />} style={{ padding: "5px 12px", fontSize: "0.74rem" }}>
              Edit
            </SecondaryBtn>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DetailItem icon={<Building2 size={13} />} label="Department" value={emp.department_name} />
            <DetailItem icon={<Briefcase size={13} />} label="Position Title" value={emp.position_title} />
            <DetailItem icon={<Shield size={13} />} label="Level" value={emp.level_name} />
            <DetailItem icon={<Shield size={13} />} label="System Role" value={emp.role_name || "No Role Assigned"} />
            <DetailItem icon={<Calendar size={13} />} label="Join Date" value={fmtDate(emp.hire_date)} />
            <DetailItem icon={<Clock size={13} />} label="Tenure (Govt)" value={calculateTenure(emp.hire_date)} />
            <DetailItem icon={<Clock size={13} />} label="Prior Gov Service" value={emp.prior_gov_service_years ? `${emp.prior_gov_service_years} Years` : "None"} />
          </div>
        </ModernCard>

        {/* Banking & Payroll */}
        <ModernCard title="Payroll & Tax Identifiers" icon={<CreditCard size={18} />}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DetailItem icon={<Building2 size={13} />} label="Bank Name" value={emp.bank_name} />
            <DetailItem icon={<CreditCard size={13} />} label="Account Number" value={emp.bank_account_number} copyable />
            <DetailItem icon={<Hash size={13} />} label="TIN Number" value={emp.tin_number} copyable />
            <DetailItem icon={<Hash size={13} />} label="Pension Code" value={emp.pension_code} copyable />
            <DetailItem icon={<Settings size={13} />} label="Account Status" value={emp.status} />
          </div>
        </ModernCard>
      </div>
    </div>
  );
};

/* ── Personal Tab Panel ── */
const PersonalTab = ({ emp, onEdit }) => {
  const age = calculateAge(emp.date_of_birth);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
      <ModernCard
        title="Personal & Demographics"
        icon={<User size={18} />}
        action={
          <SecondaryBtn onClick={onEdit} icon={<Pencil size={12} />} style={{ padding: "5px 12px", fontSize: "0.74rem" }}>
            Edit
          </SecondaryBtn>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DetailItem icon={<User size={13} />} label="Title" value={emp.title} />
          <DetailItem icon={<User size={13} />} label="Gender" value={emp.gender === "MALE" ? "Male" : emp.gender === "FEMALE" ? "Female" : "—"} />
          <DetailItem icon={<User size={13} />} label="Full Name" value={`${emp.first_name} ${emp.middle_name} ${emp.last_name}`.trim()} />
          <DetailItem icon={<User size={13} />} label="Mother's Name" value={emp.mother_name} />
          <DetailItem icon={<Calendar size={13} />} label="Date of Birth" value={fmtDate(emp.date_of_birth)} />
          <DetailItem icon={<Clock size={13} />} label="Age" value={age ? `${age} years old` : "—"} />
          <DetailItem icon={<Globe size={13} />} label="Nationality" value={emp.nationality} />
          <DetailItem icon={<Tag size={13} />} label="Mesob ID" value={emp.mesob_id} copyable />
        </div>
      </ModernCard>

      <ModernCard title="System Record Details" icon={<Settings size={18} />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DetailItem icon={<Hash size={13} />} label="Internal UUID" value={emp.uuid} copyable />
          <DetailItem icon={<Settings size={13} />} label="Status" value={emp.status} />
          <DetailItem icon={<Calendar size={13} />} label="Created At" value={fmtDate(emp.created_at)} />
          <DetailItem icon={<Calendar size={13} />} label="Updated At" value={fmtDate(emp.updated_at)} />
        </div>
      </ModernCard>
    </div>
  );
};

/* ── Contact Tab Panel ── */
const ContactTab = ({ emp }) => {
  const addr = emp.addresses?.find((a) => a.address_type === "CURRENT") || emp.addresses?.[0];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
      <ModernCard title="Communication Channels" icon={<Phone size={18} />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <DetailItem icon={<Mail size={13} />} label="Email Address" value={addr?.email} copyable />
          <DetailItem icon={<Phone size={13} />} label="Primary Phone" value={addr?.phone_primary} copyable />
          <DetailItem icon={<Phone size={13} />} label="Secondary Phone" value={addr?.phone_secondary} copyable />
        </div>
      </ModernCard>

      <ModernCard title="Residential Address" icon={<MapPin size={18} />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DetailItem icon={<Globe size={13} />} label="Region / Country" value={addr?.region || "Ethiopia"} />
          <DetailItem icon={<MapPin size={13} />} label="Zone / Sub-city" value={addr?.zone} />
          <DetailItem icon={<MapPin size={13} />} label="Woreda" value={addr?.woreda} />
          <DetailItem icon={<MapPin size={13} />} label="Kebele" value={addr?.kebele} />
          <DetailItem icon={<Building2 size={13} />} label="House Number" value={addr?.house_number} />
          <DetailItem icon={<Tag size={13} />} label="Address Type" value={addr?.address_type || "CURRENT"} />
        </div>
      </ModernCard>
    </div>
  );
};

/* ── Documents Tab Panel ── */
const DocumentsTab = ({ emp, documents, onDocAdded, onDocRemoved }) => {
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    doc_type: "Resident ID",
    id_number: "",
    issue_date: "",
    valid_until: "",
  });
  const [docFile, setDocFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [addModal, setAddModal] = useState(null);
  const [addForm, setAddForm] = useState({});
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });

  const fieldsFor = (label) => {
    if (label === "Education")
      return [
        { key: "institution", label: "Institution / University *" },
        { key: "degree", label: "Degree / Qualification *" },
        { key: "field", label: "Field of Study" },
        { key: "start_date", label: "Start Date", type: "date" },
        { key: "end_date", label: "End Date", type: "date" },
      ];
    if (label === "Work Experience")
      return [
        { key: "company", label: "Company / Organization *" },
        { key: "title", label: "Job Title *" },
        { key: "start_date", label: "Start Date", type: "date" },
        { key: "end_date", label: "End Date", type: "date" },
        { key: "description", label: "Description", type: "textarea" },
      ];
    return [
      { key: "name", label: "Certification / Training Name *" },
      { key: "provider", label: "Issuing Organization" },
      { key: "date", label: "Date Obtained", type: "date" },
      { key: "expiry", label: "Expiry Date", type: "date" },
    ];
  };

  const handleAddInfo = async () => {
    const fields = fieldsFor(addModal);
    const required = fields.filter((f) => f.label.includes("*"));
    const missing = required.filter((f) => !addForm[f.key]?.trim());
    if (missing.length) {
      setAddError(`${missing[0].label.replace(" *", "")} is required.`);
      return;
    }
    setAddSaving(true);
    setAddError("");
    try {
      await EmployeeApi.addDocument(emp.uuid, [], {
        doc_type: addModal,
        id_number: JSON.stringify(addForm),
        issue_date: addForm.start_date || addForm.date || "",
        valid_until: addForm.end_date || addForm.expiry || "",
      });
      setAddModal(null);
      setAddForm({});
      onDocAdded();
    } catch (e) {
      setAddError(e.message || "Failed to save record.");
    } finally {
      setAddSaving(false);
    }
  };

  const handleAddDoc = async () => {
    if (!docFile) {
      setError("Please select a file to upload.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await EmployeeApi.addDocument(emp.uuid, [docFile], docForm);
      setShowAddDoc(false);
      setDocForm({ doc_type: "Resident ID", id_number: "", issue_date: "", valid_until: "" });
      setDocFile(null);
      onDocAdded();
    } catch (e) {
      setError(e.message || "Failed to upload document.");
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!confirmDelete) return;
    try {
      await EmployeeApi.removeDocument(emp.uuid, confirmDelete);
      setConfirmDelete(null);
      onDocRemoved();
    } catch (e) {
      setErrorDialog({ open: true, message: e.message || "Failed to remove." });
      setConfirmDelete(null);
    }
  };

  const INFO_TYPES = ["Education", "Work Experience", "Training & Certifications"];
  const idDocsList = documents.filter((d) => !INFO_TYPES.includes(d.doc_type));
  const infoFor = (label) => documents.filter((d) => d.doc_type === label);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Identification documents */}
      <ModernCard
        title={`Identification Documents (${idDocsList.length})`}
        icon={<FileText size={18} />}
        action={
          <PrimaryBtn onClick={() => setShowAddDoc(true)} icon={<Upload size={12} />} style={{ padding: "6px 13px", fontSize: "0.76rem" }}>
            Upload Doc
          </PrimaryBtn>
        }
      >
        {idDocsList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: C.textMuted }}>
            <FileText size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: "0.85rem" }}>No identification documents uploaded yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {idDocsList.map((doc) => (
              <div
                key={doc.uuid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: C.cardSubtle,
                  borderRadius: 10,
                  border: `1px solid ${C.cardBorder}`,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: C.textMain }}>
                    {doc.doc_type}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: C.textMuted, marginTop: 3 }}>
                    {doc.id_number && <span>ID: {doc.id_number}</span>}
                    {doc.issue_date && <span> · Issued: {fmtDate(doc.issue_date)}</span>}
                    {doc.valid_until && <span> · Valid: {fmtDate(doc.valid_until)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDelete(doc.uuid)}
                  title="Remove document"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#DC2626",
                    padding: 6,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </ModernCard>

      {/* Additional Qualifications & Experiences */}
      <ModernCard title="Education & Professional Background" icon={<BookOpen size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Education", icon: <BookOpen size={14} /> },
            { label: "Work Experience", icon: <Briefcase size={14} /> },
            { label: "Training & Certifications", icon: <FileText size={14} /> },
          ].map(({ label, icon }) => {
            const recs = infoFor(label);
            return (
              <div
                key={label}
                style={{
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: C.cardSubtle,
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.primary }}>{icon}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: C.textMain }}>{label}</span>
                    <span style={{ background: C.primaryLight, color: C.primary, borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem", fontWeight: 700 }}>
                      {recs.length}
                    </span>
                  </div>
                  <SecondaryBtn
                    onClick={() => {
                      setAddError("");
                      setAddForm({});
                      setAddModal(label);
                    }}
                    icon={<Plus size={12} />}
                    style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                  >
                    Add {label.split(" ")[0]}
                  </SecondaryBtn>
                </div>
                <div style={{ padding: "8px 16px" }}>
                  {recs.length === 0 ? (
                    <p style={{ margin: "6px 0", fontSize: "0.8rem", color: C.textMuted }}>
                      No {label.toLowerCase()} records provided.
                    </p>
                  ) : (
                    recs.map((r) => {
                      let info = {};
                      try {
                        info = JSON.parse(r.id_number || "{}");
                      } catch {}
                      return (
                        <div
                          key={r.uuid}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            padding: "9px 0",
                            borderBottom: `1px solid ${C.borderLight}`,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "0.86rem", fontWeight: 600, color: C.textMain }}>
                              {info.institution || info.company || info.name || "—"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: C.textMuted, marginTop: 2 }}>
                              {info.degree || info.title || info.provider || ""}
                              {info.start_date ? ` · ${info.start_date}` : ""}
                              {info.end_date ? ` – ${info.end_date}` : ""}
                              {info.date ? ` · ${info.date}` : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => setConfirmDelete(r.uuid)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#DC2626",
                              padding: 4,
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ModernCard>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmRemove}
        variant="delete"
        title="Remove Record"
        description="This action will permanently delete this record from the employee profile."
        confirmText="Delete Record"
        cancelText="Cancel"
      />

      {/* Error Dialog */}
      <ConfirmDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ open: false, message: "" })}
        onConfirm={() => setErrorDialog({ open: false, message: "" })}
        variant="warning"
        title="Error"
        description={errorDialog.message}
        confirmText="OK"
        hideCancel
      />

      {/* Upload Document Modal */}
      <Modal open={showAddDoc} onClose={() => setShowAddDoc(false)} title="Upload Identification Document" maxWidth={480}>
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", fontSize: 13 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Document Type</label>
            <select value={docForm.doc_type} onChange={(e) => setDocForm((p) => ({ ...p, doc_type: e.target.value }))} style={inputStyle}>
              {["Resident ID", "Driving License", "Passport", "National ID", "Work Permit", "Other"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ID / Document Number</label>
            <input value={docForm.id_number} onChange={(e) => setDocForm((p) => ({ ...p, id_number: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <PrettyDatePicker value={docForm.issue_date} onChange={(v) => setDocForm((p) => ({ ...p, issue_date: v }))} />
            </div>
            <div>
              <label style={labelStyle}>Valid Until</label>
              <PrettyDatePicker value={docForm.valid_until} onChange={(v) => setDocForm((p) => ({ ...p, valid_until: v }))} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Document File *</label>
            <input type="file" accept=".pdf,image/*" onChange={(e) => setDocFile(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: "7px 12px" }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <SecondaryBtn onClick={() => setShowAddDoc(false)}>Cancel</SecondaryBtn>
            <PrimaryBtn onClick={handleAddDoc} disabled={saving}>{saving ? "Uploading..." : "Upload File"}</PrimaryBtn>
          </div>
        </div>
      </Modal>

      {/* Add Info Modal */}
      <Modal open={Boolean(addModal)} onClose={() => setAddModal(null)} title={`Add ${addModal}`} maxWidth={520}>
        {addError && (
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", fontSize: 13 }}>
            {addError}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {addModal &&
            fieldsFor(addModal).map(({ key, label, type = "text" }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                {type === "textarea" ? (
                  <textarea value={addForm[key] || ""} onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                ) : type === "date" ? (
                  <PrettyDatePicker value={addForm[key] || ""} onChange={(v) => setAddForm((p) => ({ ...p, [key]: v }))} />
                ) : (
                  <input value={addForm[key] || ""} onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                )}
              </div>
            ))}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <SecondaryBtn onClick={() => setAddModal(null)}>Cancel</SecondaryBtn>
            <PrimaryBtn onClick={handleAddInfo} disabled={addSaving}>{addSaving ? "Saving..." : "Save Record"}</PrimaryBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE: EmployeeDetailPage
══════════════════════════════════════════ */
const EmployeeDetailPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("employment");

  const [editPersonal, setEditPersonal] = useState(false);
  const [editEmployment, setEditEmployment] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isEditMode = searchParams.get("mode") === "edit";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setImgError(false);
    try {
      const [empRes, deptRes, posRes, levelRes, rolesRes] = await Promise.all([
        EmployeeApi.get(uuid, true),
        EmployeeApi.listDepartments().catch(() => ({ data: [] })),
        EmployeeApi.listPositions().catch(() => ({ data: [] })),
        LevelApi.list().catch(() => ({ data: [] })),
        getAllRoles().catch((err) => {
          console.error('[EmployeeDetailPage] Failed to load roles:', err);
          return { data: { roles: [] } };
        }),
      ]);
      setEmployee(empRes?.data || null);
      setDocuments(empRes?.data?.documents || []);
      setDepartments(deptRes?.data || []);
      setPositions(posRes?.data || []);
      setLevels(levelRes?.data || []);
      
      // Defensive check for roles
      const rolesData = rolesRes?.data?.roles;
      if (Array.isArray(rolesData) && rolesData.length > 0) {
        console.log('[EmployeeDetailPage] Roles loaded successfully:', rolesData.length, 'roles');
        setRoles(rolesData);
      } else {
        console.warn('[EmployeeDetailPage] No roles loaded. Check user permissions (requires HR_ADMIN or SUPER_ADMIN)');
        setRoles([]);
      }
    } catch (e) {
      setError(e.message || "Failed to load employee details.");
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isEditMode && employee) {
      setEditEmployment(true);
    }
  }, [isEditMode, employee]);

  const reloadDocs = async () => {
    try {
      const res = await EmployeeApi.listDocuments(uuid);
      setDocuments(res?.data || []);
    } catch {}
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      await EmployeeApi.uploadPhoto(uuid, file);
      setImgError(false);
      await load();
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setPhotoUploading(false);
    }
  };

  const fullName = useMemo(() => {
    if (!employee) return "";
    return [employee.title, employee.first_name, employee.middle_name, employee.last_name]
      .filter(Boolean)
      .join(" ");
  }, [employee]);

  const initials = useMemo(() => {
    if (!employee) return "—";
    return `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`.toUpperCase() || "—";
  }, [employee]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 14 }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(15,118,110,0.2)", borderTop: `3px solid ${C.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: C.textMuted }}>Loading employee dossier...</span>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: "#FEE2E2", color: "#DC2626", marginBottom: 16 }}>
          <AlertCircle size={36} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 700, color: C.textMain }}>Unable to Load Employee</h3>
        <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: C.textMuted }}>{error || "Employee record not found."}</p>
        <PrimaryBtn onClick={() => navigate("/employees")} icon={<ArrowLeft size={14} />}>
          Back to Employee Directory
        </PrimaryBtn>
      </div>
    );
  }

  const photoSrc = !imgError && (employee.profile_photo_url || `/api/employees/${employee.uuid}/photo`);

  const TABS = [
    { key: "employment", label: "Employment & Role", icon: <Briefcase size={15} /> },
    { key: "personal", label: "Personal Information", icon: <User size={15} /> },
    { key: "contact", label: "Contact & Address", icon: <Phone size={15} /> },
    { key: "documents", label: `Documents (${documents.length})`, icon: <FileText size={15} /> },
    { key: "face-registration", label: "Biometric Face ID", icon: <Camera size={15} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.pageBg, padding: "24px 32px", fontFamily: "Poppins, sans-serif" }}>
      {/* ── 1. Unified Hero Header ── */}
      <div
        style={{
          background: C.heroBg,
          borderRadius: 18,
          padding: "24px 28px",
          color: "#fff",
          boxShadow: C.shadowMd,
          marginBottom: 20,
          border: "1px solid rgba(20, 184, 166, 0.25)",
        }}
      >
        {/* Top bar: Back & Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => navigate("/employees/profile")}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#E8F0EE",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          >
            <ArrowLeft size={14} /> Back to Directory
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SecondaryBtn
              onClick={() => setEditEmployment(true)}
              icon={<Pencil size={13} />}
              style={{ background: "#fff", color: C.primary, border: "none", fontSize: "0.78rem", padding: "7px 14px" }}
            >
              Edit Employment
            </SecondaryBtn>
            <SecondaryBtn
              onClick={() => setEditPersonal(true)}
              icon={<User size={13} />}
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.3)", fontSize: "0.78rem", padding: "7px 14px" }}
            >
              Edit Personal
            </SecondaryBtn>
          </div>
        </div>

        {/* Hero Main: Avatar & Identity Details */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {/* Avatar with Camera badge */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)",
                border: "3px solid #fff",
                boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                color: "#fff",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={fullName}
                  onError={() => setImgError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <label
              title="Upload new profile picture"
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: C.primaryAccent,
                border: "2px solid #fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: photoUploading ? "wait" : "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              }}
            >
              <Camera size={13} color="#fff" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Name & Primary Badges */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                {fullName}
              </h1>
              <StatusBadge status={employee.status} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: "0.82rem", color: "rgba(255,255,255,0.85)" }}>
              <span
                style={{
                  background: "rgba(255,255,255,0.15)",
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Hash size={12} /> {employee.mesob_id || "No Mesob ID"}
              </span>

              <span
                style={{
                  background: "rgba(255,255,255,0.15)",
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Building2 size={12} /> {employee.department_name || "No Department"}
              </span>

              <span
                style={{
                  background: "rgba(255,255,255,0.15)",
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Briefcase size={12} /> {employee.position_title || "No Position"}
              </span>

              {employee.level_name && (
                <span
                  style={{
                    background: "rgba(20, 184, 166, 0.3)",
                    border: "1px solid rgba(20, 184, 166, 0.5)",
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontWeight: 700,
                    color: "#A7F3D0",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Shield size={12} /> {employee.level_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hero Stats Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.6)" }}>
              Hire Date
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", marginTop: 2 }}>
              {fmtDate(employee.hire_date)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.6)" }}>
              Tenure / Service
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#A7F3D0", marginTop: 2 }}>
              {calculateTenure(employee.hire_date)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.6)" }}>
              Prior Gov Service
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", marginTop: 2 }}>
              {employee.prior_gov_service_years ? `${employee.prior_gov_service_years} Years` : "None"}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Modern Segmented Tab Navigation ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "#fff",
          padding: 6,
          borderRadius: 14,
          border: `1px solid ${C.cardBorder}`,
          boxShadow: C.shadowSm,
          marginBottom: 20,
          overflowX: "auto",
        }}
      >
        {TABS.map(({ key, label, icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: isActive ? C.primary : "transparent",
                color: isActive ? "#fff" : C.textSub,
                fontSize: "0.84rem",
                fontWeight: isActive ? 700 : 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(15,118,110,0.06)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── 3. Tab Contents ── */}
      <div>
        {activeTab === "employment" && (
          <EmploymentTab emp={employee} onEdit={() => setEditEmployment(true)} />
        )}
        {activeTab === "personal" && (
          <PersonalTab emp={employee} onEdit={() => setEditPersonal(true)} />
        )}
        {activeTab === "contact" && <ContactTab emp={employee} />}
        {activeTab === "documents" && (
          <DocumentsTab emp={employee} documents={documents} onDocAdded={reloadDocs} onDocRemoved={reloadDocs} />
        )}
        {activeTab === "face-registration" && (
          <ModernCard title="Biometric Face Recognition Profile" icon={<Camera size={18} />}>
            <EmployeeFaceRegistration
              employeeUuid={employee.uuid}
              employeeName={fullName}
              isHR={true}
              onUpdate={load}
            />
          </ModernCard>
        )}
      </div>

      {/* ── 4. Modals ── */}
      {editPersonal && (
        <EditPersonalModal employee={employee} onClose={() => setEditPersonal(false)} onSaved={load} />
      )}
      {editEmployment && (
        <EditEmploymentModal
          employee={employee}
          departments={departments}
          positions={positions}
          levels={levels}
          roles={roles}
          onClose={() => setEditEmployment(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default EmployeeDetailPage;
