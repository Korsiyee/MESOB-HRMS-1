import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Phone, Briefcase, FileText,
  Pencil, Upload, Plus, Trash2, UserCircle, BookOpen,
  Globe, Tag, Calendar, Settings, CreditCard, Building2,
  MapPin, Mail, Hash, Camera,
} from "lucide-react";
import { EmployeeApi } from "../api/employeeApi";
import { LevelApi } from "../api/levelApi";
import PrettyDatePicker from "../components/PrettyDatePicker";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmployeeFaceRegistration from '../components/EmployeeFaceRegistration';

const C = {
  card: "#EEF1F0", cardBorder: "rgba(0,80,60,0.09)",
  shadow: "0 2px 12px rgba(0,60,45,0.07)",
  primary: "#0F766E", primaryHov: "#14B8A6",
  textMain: "#1A2E2B", textSub: "#1E4A42", textMuted: "#2E6058",
  border: "rgba(0,80,60,0.12)",
  headerBg: "linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)",
};

const GreenBtn = ({ children, onClick, disabled, style = {} }) => {
  const baseBg = style.background || (disabled ? "#8AADA6" : C.primary);
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#8AADA6" : C.primary, color: "#fff",
      border: "none", borderRadius: 8, padding: "9px 18px",
      fontSize: "0.78rem", fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 6,
      fontFamily: "Poppins, sans-serif", transition: "background 0.15s", ...style,
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.primaryHov; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = baseBg; }}
    >{children}</button>
  );
};

const OutlineBtn = ({ children, onClick, style = {} }) => (
  <button onClick={onClick} style={{
    background: "transparent", color: C.primary,
    border: `1.5px solid ${C.primary}`, borderRadius: 8,
    padding: "8px 16px", fontSize: "0.78rem", fontWeight: 600,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    fontFamily: "Poppins, sans-serif", transition: "all 0.15s", ...style,
  }}
    onMouseEnter={e => { e.currentTarget.style.background = "rgba(15,118,110,0.08)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
  >{children}</button>
);

const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    INACTIVE: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    TERMINATED: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  };
  const s = map[status] || { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" };
  return (
    <span style={{
      display: "inline-flex", padding: "3px 12px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>{status}</span>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: C.textMuted }}>{icon}</span>
      <span style={{ fontSize: "0.7rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
    </div>
    <span style={{ fontSize: "0.85rem", color: C.textMain, fontWeight: 500, paddingLeft: 22 }}>{value || "—"}</span>
  </div>
);

const SectionCard = ({ title, icon, children, onEdit }) => (
  <div style={{
    background: C.card, borderRadius: 12, border: `1px solid ${C.cardBorder}`,
    boxShadow: C.shadow, padding: "20px 24px", marginBottom: 16,
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: C.primary }}>{icon}</span>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: C.textMain }}>{title}</span>
      </div>
      {onEdit && (
        <button onClick={onEdit} style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.textMuted, padding: 4, borderRadius: 6,
          display: "flex", alignItems: "center",
        }}>
          <Pencil size={14} />
        </button>
      )}
    </div>
    {children}
  </div>
);

const Modal = ({ open, onClose, title, children, maxWidth = 520 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, borderRadius: 12, width: "100%",
        maxWidth, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`,
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.textMain }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: C.textMain,
          }}>Close</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
};

const fld = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "9px 12px", fontSize: "0.82rem", color: C.textMain,
  background: C.card, outline: "none", fontFamily: "Poppins, sans-serif",
  boxSizing: "border-box",
};
const lbl = {
  fontSize: "0.75rem", fontWeight: 600, color: C.textSub,
  display: "block", marginBottom: 5,
};

/* ── Edit Personal Info Modal ── */
const EditPersonalModal = ({ employee, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: employee?.title || "",
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

  const save = async () => {
    setSaving(true); setError("");
    try {
      await EmployeeApi.update(employee.uuid, form);
      onSaved(); onClose();
    } catch (e) { setError(e.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Modal open title="Edit Personal Information" onClose={onClose} maxWidth={560}>
      {error && <div style={{ padding: "9px 14px", borderRadius: 7, marginBottom: 14, background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: 13 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={lbl}>Title</label>
          <select value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={fld}>
            {["Mr", "Mrs", "Ms", "Dr", "Prof", "Ato", "W/ro", "W/t"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Gender</label>
          <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} style={fld}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div>
          <label style={lbl}>First Name *</label>
          <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} style={fld} />
        </div>
        <div>
          <label style={lbl}>Middle Name *</label>
          <input value={form.middle_name} onChange={e => setForm(p => ({ ...p, middle_name: e.target.value }))} style={fld} />
        </div>
        <div>
          <label style={lbl}>Last Name *</label>
          <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} style={fld} />
        </div>
        <div>
          <label style={lbl}>Mother's Name *</label>
          <input value={form.mother_name} onChange={e => setForm(p => ({ ...p, mother_name: e.target.value }))} style={fld} />
        </div>
        <div><label style={lbl}>Date of Birth</label><PrettyDatePicker value={form.date_of_birth} onChange={v=>setForm(p=>({...p,date_of_birth:v}))}/></div>
        <div>
          <label style={lbl}>Nationality</label>
          <input value={form.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))} style={fld} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
        <OutlineBtn onClick={onClose}>Cancel</OutlineBtn>
        <GreenBtn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</GreenBtn>
      </div>
    </Modal>
  );
};

/* ── Edit Employment Modal ── */
const EditEmploymentModal = ({ employee, departments, positions, levels, onClose, onSaved }) => {
  const [form, setForm] = useState({
    hire_date: employee?.hire_date?.slice(0, 10) || "",
    department_uuid: employee?.department_uuid || "",
    position_uuid: employee?.position_uuid || "",
    level_uuid: employee?.level_uuid || "",
    occupation_uuid: employee?.occupation_uuid || "",
    tin_number: employee?.tin_number || "",
    pension_code: employee?.pension_code || "",
    bank_name: employee?.bank_name || "",
    bank_account_number: employee?.bank_account_number || "",
    prior_gov_service: employee?.prior_gov_service || 0,
    attendance_exempt: employee?.attendance_exempt || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      await EmployeeApi.update(employee.uuid, form);
      onSaved(); onClose();
    } catch (e) { setError(e.message || "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Modal open title="Edit Employment Details" onClose={onClose} maxWidth={560}>
      {error && <div style={{ padding: "9px 14px", borderRadius: 7, marginBottom: 14, background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: 13 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div>
          <label style={lbl}>Department</label>
          <select value={form.department_uuid} onChange={e => setForm(p => ({ ...p, department_uuid: e.target.value }))} style={fld}>
            <option value="">— Select —</option>
            {departments.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Position</label>
          <select value={form.position_uuid} onChange={e => setForm(p => ({ ...p, position_uuid: e.target.value }))} style={fld}>
            <option value="">— Select —</option>
            {positions.map(p => <option key={p.uuid} value={p.uuid}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Level</label>
          <select value={form.level_uuid} onChange={e => setForm(p => ({ ...p, level_uuid: e.target.value }))} style={fld}>
            <option value="">— Select —</option>
            {levels.map(l => <option key={l.uuid} value={l.uuid}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div>
          <label style={lbl}>Join Date</label>
          <PrettyDatePicker value={form.hire_date} onChange={v=>setForm(p=>({...p,hire_date:v}))}/>
        </div>
        <div>
          <label style={lbl}>Prior Gov. Service (years)</label>
          <input type="number" step="0.5" value={form.prior_gov_service} onChange={e => setForm(p => ({ ...p, prior_gov_service: e.target.value }))} style={fld} />
        </div>
        <div>
          <label style={lbl}>Bank Name</label>
          <input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} style={fld} />
        </div>
        <div>
          <label style={lbl}>Account Number</label>
          <input value={form.bank_account_number} onChange={e => setForm(p => ({ ...p, bank_account_number: e.target.value }))} style={fld} />
        </div>
        <div>
          <label style={lbl}>TIN Number</label>
          <input value={form.tin_number} onChange={e => setForm(p => ({ ...p, tin_number: e.target.value }))} style={fld} />
        </div>
        <div>
          <label style={lbl}>Pension Code</label>
          <input value={form.pension_code} onChange={e => setForm(p => ({ ...p, pension_code: e.target.value }))} style={fld} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
        <OutlineBtn onClick={onClose}>Cancel</OutlineBtn>
        <GreenBtn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</GreenBtn>
      </div>
    </Modal>
  );
};

/* ── Tab panels ── */
const PersonalTab = ({ emp, onEdit }) => {
  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "—";
  return (
    <SectionCard title="Personal Information" icon={<User size={16} />} onEdit={onEdit}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        <InfoRow icon={<User size={13} />} label="Full Name" value={`${emp.title || ""} ${emp.first_name} ${emp.middle_name} ${emp.last_name}`.trim()} />
        <InfoRow icon={<Globe size={13} />} label="Nationality" value={emp.nationality} />
        <InfoRow icon={<Tag size={13} />} label="Attendance Exempt" value={emp.attendance_exempt ? "Yes" : "No"} />
        <InfoRow icon={<Calendar size={13} />} label="Date of Birth" value={fmtDate(emp.date_of_birth)} />
        <InfoRow icon={<Settings size={13} />} label="Status" value={<StatusBadge status={emp.status} />} />
        <InfoRow icon={<CreditCard size={13} />} label="Mesob ID" value={emp.mesob_id} />
        <InfoRow icon={<User size={13} />} label="Gender" value={emp.gender ? (emp.gender === "MALE" ? "Male" : "Female") : "—"} />
        <InfoRow icon={<Calendar size={13} />} label="Join Date" value={fmtDate(emp.hire_date)} />
        <InfoRow icon={<User size={13} />} label="Mother's Name" value={emp.mother_name} />
      </div>
    </SectionCard>
  );
};

const ContactTab = ({ emp }) => {
  const addr = emp.addresses?.find(a => a.address_type === "CURRENT") || emp.addresses?.[0];
  return (
    <SectionCard title="Contact Information" icon={<Phone size={16} />}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h4 style={{ margin: "0 0 14px", fontSize: "0.8rem", fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Details</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InfoRow icon={<Mail size={13} />} label="Email" value={addr?.email} />
            <InfoRow icon={<Phone size={13} />} label="Phone Number" value={addr?.phone_primary} />
            {addr?.phone_secondary && <InfoRow icon={<Phone size={13} />} label="Phone (Secondary)" value={addr.phone_secondary} />}
          </div>
        </div>
        <div>
          <h4 style={{ margin: "0 0 14px", fontSize: "0.8rem", fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.05em" }}>Address Information</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InfoRow icon={<Globe size={13} />} label="Country" value={addr?.region || "Ethiopia"} />
            <InfoRow icon={<MapPin size={13} />} label="City" value={addr?.zone} />
            <InfoRow icon={<MapPin size={13} />} label="Kebele" value={addr?.kebele} />
            <InfoRow icon={<MapPin size={13} />} label="Woreda" value={addr?.woreda} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

const EmploymentTab = ({ emp, departments, positions, levels, onEdit }) => {
  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "—";
  return (
    <div>
      <SectionCard title="Employment Details" icon={<Briefcase size={16} />} onEdit={onEdit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <InfoRow icon={<Briefcase size={13} />} label="Department" value={emp.department_name} />
            <InfoRow icon={<Briefcase size={13} />} label="Position" value={emp.position_title} />
            <InfoRow icon={<Briefcase size={13} />} label="Level" value={emp.level_name} />
            <InfoRow icon={<Briefcase size={13} />} label="Occupation" value={emp.occupation_name} />
            <InfoRow icon={<Calendar size={13} />} label="Join Date" value={fmtDate(emp.hire_date)} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 14px", fontSize: "0.8rem", fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.05em" }}>Financial Information</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <InfoRow icon={<Building2 size={13} />} label="Bank Name" value={emp.bank_name} />
              <InfoRow icon={<CreditCard size={13} />} label="Account Number" value={emp.bank_account_number} />
              <InfoRow icon={<Hash size={13} />} label="TIN Number" value={emp.tin_number} />
              <InfoRow icon={<Hash size={13} />} label="Pension Code" value={emp.pension_code} />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

/* ── Documents Tab ── */
const DocumentsTab = ({ emp, documents, onDocAdded, onDocRemoved }) => {
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({ doc_type: "Resident ID", id_number: "", issue_date: "", valid_until: "" });
  const [docFile, setDocFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* Additional info modal state */
  const [addModal, setAddModal] = useState(null); // label string
  const [addForm, setAddForm] = useState({});
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const fieldsFor = (label) => {
    if (label === "Education") return [
      { key:"institution", label:"Institution / University *" },
      { key:"degree",      label:"Degree / Qualification *" },
      { key:"field",       label:"Field of Study" },
      { key:"start_date",  label:"Start Date", type:"date" },
      { key:"end_date",    label:"End Date",   type:"date" },
    ];
    if (label === "Work Experience") return [
      { key:"company",     label:"Company / Organization *" },
      { key:"title",       label:"Job Title *" },
      { key:"start_date",  label:"Start Date", type:"date" },
      { key:"end_date",    label:"End Date",   type:"date" },
      { key:"description", label:"Description", type:"textarea" },
    ];
    return [
      { key:"name",     label:"Certification / Training Name *" },
      { key:"provider", label:"Issuing Organization" },
      { key:"date",     label:"Date Obtained", type:"date" },
      { key:"expiry",   label:"Expiry Date",   type:"date" },
    ];
  };

  const handleAddInfo = async () => {
    const fields = fieldsFor(addModal);
    const required = fields.filter(f => f.label.includes("*"));
    const missing = required.filter(f => !addForm[f.key]?.trim());
    if (missing.length) { setAddError(`${missing[0].label.replace(" *","")} is required.`); return; }
    setAddSaving(true); setAddError("");
    try {
      // Store as a document record — doc_type = section label, id_number = JSON of form data
      await EmployeeApi.addDocument(emp.uuid, [], {
        doc_type: addModal,
        id_number: JSON.stringify(addForm),
        issue_date: addForm.start_date || addForm.date || "",
        valid_until: addForm.end_date || addForm.expiry || "",
      });
      setAddModal(null); setAddForm({});
      onDocAdded();
    } catch (e) { setAddError(e.message || "Failed to save."); }
    finally { setAddSaving(false); }
  };

  const handleAddDoc = async () => {
    if (!docFile) { setError("Please select a file."); return; }
    setSaving(true); setError("");
    try {
      await EmployeeApi.addDocument(emp.uuid, [docFile], docForm);
      setShowAddDoc(false);
      setDocForm({ doc_type: "Resident ID", id_number: "", issue_date: "", valid_until: "" });
      setDocFile(null);
      onDocAdded();
    } catch (e) { setError(e.message || "Failed to upload."); }
    finally { setSaving(false); }
  };

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });

  const handleRemove = async (docUuid) => {
    setConfirmDelete(docUuid);
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
  const idDocsList = documents.filter(d => !INFO_TYPES.includes(d.doc_type));
  const infoFor = (label) => documents.filter(d => d.doc_type === label);

  return (
    <div>
      <SectionCard title={`Identification Documents (${idDocsList.length})`} icon={<FileText size={16} />}>
        {idDocsList.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>No identification documents uploaded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {idDocsList.map(doc => (
              <div key={doc.uuid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.textMain }}>{doc.doc_type}</div>
                  <div style={{ fontSize: "0.72rem", color: C.textMuted, marginTop: 2 }}>
                    {doc.id_number && `ID: ${doc.id_number}`}
                    {doc.issue_date && ` · Issued: ${new Date(doc.issue_date).toLocaleDateString()}`}
                    {doc.valid_until && ` · Valid until: ${new Date(doc.valid_until).toLocaleDateString()}`}
                  </div>
                </div>
                <button onClick={() => handleRemove(doc.uuid)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <GreenBtn onClick={() => setShowAddDoc(true)} style={{ fontSize: "0.72rem" }}>
            <Upload size={13} /> UPLOAD DOCUMENT
          </GreenBtn>
        </div>
      </SectionCard>

      <SectionCard title="Additional Information" icon={<FileText size={16} />}>
        {[
          { label: "Education", icon: <BookOpen size={14} /> },
          { label: "Work Experience", icon: <Briefcase size={14} /> },
          { label: "Training & Certifications", icon: <FileText size={14} /> },
        ].map(({ label, icon }) => {
          const recs = infoFor(label);
          return (
            <div key={label} style={{ marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{icon}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: C.textMain }}>{label}</span>
                  <span style={{ background: "rgba(0,80,60,0.1)", color: C.textMuted, borderRadius: 99, padding: "1px 8px", fontSize: "0.65rem", fontWeight: 700 }}>{recs.length}</span>
                </div>
                <GreenBtn onClick={() => { setAddError(""); setAddForm({}); setAddModal(label); }} style={{ fontSize: "0.7rem", padding: "6px 12px" }}>
                  <Plus size={11} /> ADD {label.toUpperCase().split(" ")[0]}
                </GreenBtn>
              </div>
              <div style={{ padding: "12px 16px", background: "#fafafa" }}>
                {recs.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>No {label.toLowerCase()} records found.</p>
                ) : recs.map(r => {
                  let info = {};
                  try { info = JSON.parse(r.id_number || "{}"); } catch {}
                  return (
                    <div key={r.uuid} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.textMain }}>
                          {info.institution || info.company || info.name || "—"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: C.textMuted, marginTop: 2 }}>
                          {info.degree || info.title || info.provider || ""}
                          {info.start_date ? ` · ${info.start_date}` : ""}
                          {info.end_date ? ` – ${info.end_date}` : ""}
                          {info.date ? ` · ${info.date}` : ""}
                        </div>
                      </div>
                      <button onClick={() => handleRemove(r.uuid)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4, display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </SectionCard>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmRemove}
        variant="delete"
        title="Remove this record?"
        description="This action will permanently delete this document record."
        confirmText="Delete"
        cancelText="Cancel"
      />

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

      {/* Upload Document Modal */}
      <Modal open={showAddDoc} onClose={() => setShowAddDoc(false)} title="Upload Document" maxWidth={480}>
        {error && <div style={{ padding: "9px 14px", borderRadius: 7, marginBottom: 14, background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Document Type</label>
            <select value={docForm.doc_type} onChange={e => setDocForm(p => ({ ...p, doc_type: e.target.value }))} style={fld}>
              {["Resident ID", "Driving License", "Passport", "National ID", "Other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>ID Number</label>
            <input value={docForm.id_number} onChange={e => setDocForm(p => ({ ...p, id_number: e.target.value }))} style={fld} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Issue Date</label><PrettyDatePicker value={docForm.issue_date} onChange={v => setDocForm(p => ({ ...p, issue_date: v }))}/></div>
            <div><label style={lbl}>Valid Until</label><PrettyDatePicker value={docForm.valid_until} onChange={v => setDocForm(p => ({ ...p, valid_until: v }))}/></div>
          </div>
          <div>
            <label style={lbl}>File *</label>
            <input type="file" accept=".pdf,image/*" onChange={e => setDocFile(e.target.files?.[0] || null)} style={{ ...fld, padding: "7px 12px" }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <OutlineBtn onClick={() => setShowAddDoc(false)}>Cancel</OutlineBtn>
            <GreenBtn onClick={handleAddDoc} disabled={saving}>{saving ? "Uploading..." : "Upload"}</GreenBtn>
          </div>
        </div>
      </Modal>

      {/* Add Education / Work Experience / Training Modal */}
      <Modal open={!!addModal} onClose={() => setAddModal(null)} title={`Add ${addModal}`} maxWidth={500}>
        {addError && <div style={{ padding: "9px 14px", borderRadius: 7, marginBottom: 14, background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: 13 }}>{addError}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {addModal && fieldsFor(addModal).map(({ key, label, type = "text" }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              {type === "textarea" ? (
                <textarea value={addForm[key] || ""} onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))} rows={3} style={{ ...fld, resize: "vertical" }}/>
              ) : type === "date" ? (
                <PrettyDatePicker value={addForm[key] || ""} onChange={v => setAddForm(p => ({ ...p, [key]: v }))}/>
              ) : (
                <input value={addForm[key] || ""} onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))} style={fld}/>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <OutlineBtn onClick={() => setAddModal(null)}>Cancel</OutlineBtn>
            <GreenBtn onClick={handleAddInfo} disabled={addSaving}>{addSaving ? "Saving..." : "Save"}</GreenBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════
   ROOT — EmployeeDetailPage
══════════════════════════════════════════ */
const TABS = [
  { key: "personal", label: "Personal", icon: <User size={14} /> },
  { key: "contact",  label: "Contact",  icon: <Phone size={14} /> },
  { key: "employment", label: "Employment", icon: <Briefcase size={14} /> },
  { key: "documents",  label: "Documents",  icon: <FileText size={14} /> },
  { key: "face-registration", label: "Face Registration", icon: <Camera size={14} /> },
];

const EmployeeDetailPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  const [editPersonal, setEditPersonal] = useState(false);
  const [editEmployment, setEditEmployment] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [empRes, deptRes, posRes, levelRes] = await Promise.all([
        EmployeeApi.get(uuid, true), // Request signed URLs for photos and documents
        EmployeeApi.listDepartments().catch(() => ({ data: [] })),
        EmployeeApi.listPositions().catch(() => ({ data: [] })),
        LevelApi.list().catch(() => ({ data: [] })),
      ]);
      setEmployee(empRes?.data || null);
      setDocuments(empRes?.data?.documents || []);
      setDepartments(deptRes?.data || []);
      setPositions(posRes?.data || []);
      setLevels(levelRes?.data || []);
    } catch (e) {
      setError(e.message || "Failed to load employee.");
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { load(); }, [load]);

  const reloadDocs = async () => {
    try {
      const res = await EmployeeApi.listDocuments(uuid);
      setDocuments(res?.data || []);
    } catch { /* ignore */ }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      await EmployeeApi.uploadPhoto(uuid, file);
      load();
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(0,80,60,0.15)", borderTop: `3px solid ${C.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, textAlign: "center", color: "#b91c1c", fontSize: 14 }}>
      {error}
      <br />
      <OutlineBtn onClick={() => navigate("/employees")} style={{ margin: "16px auto 0" }}>
        <ArrowLeft size={13} /> Back to List
      </OutlineBtn>
    </div>
  );

  if (!employee) return null;

  const fullName = `${employee.title || ""} ${employee.first_name} ${employee.middle_name} ${employee.last_name}`.trim();
  const positionLabel = `${employee.occupation_name || ""} at ${employee.department_name || ""}`.trim().replace(/^at /, "");

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Page Header ── */}
      <div style={{
        background: C.headerBg, borderRadius: 14, padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#E8F0EE" }}>Employee Details</h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.72rem", color: "rgba(232,240,238,0.6)" }}>
            Viewing details for {fullName}
          </p>
        </div>
        <OutlineBtn onClick={() => navigate("/employees")} style={{ color: "#E8F0EE", borderColor: "rgba(232,240,238,0.4)" }}>
          <ArrowLeft size={13} /> BACK TO LIST
        </OutlineBtn>
      </div>

      {/* ── Employee Hero Card ── */}
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.cardBorder}`,
        boxShadow: C.shadow, padding: "20px 24px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 20,
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {employee.profile_photo_url ? (
            <img
              src={employee.profile_photo_url}
              alt={fullName}
              style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.primary}` }}
              onError={e => { e.target.style.display = "none"; }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(15,118,110,0.15)", border: `3px solid ${C.primary}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UserCircle size={40} color={C.primary} />
            </div>
          )}
          <label style={{
            position: "absolute", bottom: 0, right: 0,
            width: 22, height: 22, borderRadius: "50%",
            background: C.primary, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff",
          }}>
            <Upload size={10} color="#fff" />
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} disabled={photoUploading} />
          </label>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: C.textMain }}>{fullName}</h2>
            <StatusBadge status={employee.status} />
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: C.textMuted }}>{positionLabel}</p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Left nav */}
        <div style={{
          background: C.primary, borderRadius: 12,
          padding: "16px 0", height: "fit-content",
          boxShadow: C.shadow,
        }}>
          <div style={{ padding: "0 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employee Info</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>Select a section to view details</p>
          </div>
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "11px 16px", border: "none",
                background: activeTab === key ? "rgba(255,255,255,0.15)" : "transparent",
                cursor: "pointer", fontSize: "0.82rem", fontWeight: activeTab === key ? 700 : 500,
                color: activeTab === key ? "#fff" : "rgba(255,255,255,0.7)",
                borderLeft: activeTab === key ? "3px solid #fff" : "3px solid transparent",
                transition: "all 0.15s", textAlign: "left",
                justifyContent: "space-between",
              }}
              onMouseEnter={e => { if (activeTab !== key) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (activeTab !== key) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{icon} {label}</div>
              {activeTab === key && <span style={{ fontSize: 16, color: "#fff" }}>›</span>}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div>
          {activeTab === "personal" && (
            <PersonalTab emp={employee} onEdit={() => setEditPersonal(true)} />
          )}
          {activeTab === "contact" && <ContactTab emp={employee} />}
          {activeTab === "employment" && (
            <EmploymentTab emp={employee} departments={departments} positions={positions} levels={levels} onEdit={() => setEditEmployment(true)} />
          )}
          {activeTab === "documents" && (
            <DocumentsTab emp={employee} documents={documents} onDocAdded={reloadDocs} onDocRemoved={reloadDocs} />
          )}
          {activeTab === "face-registration" && (
            <EmployeeFaceRegistration 
              employeeUuid={employee.uuid} 
              employeeName={fullName}
              isHR={true}
              onUpdate={load}
            />
          )}
        </div>
      </div>

      {/* ── Edit Modals ── */}
      {editPersonal && (
        <EditPersonalModal employee={employee} onClose={() => setEditPersonal(false)} onSaved={load} />
      )}
      {editEmployment && (
        <EditEmploymentModal employee={employee} departments={departments} positions={positions} levels={levels} onClose={() => setEditEmployment(false)} onSaved={load} />
      )}
    </div>
  );
};

export default EmployeeDetailPage;
