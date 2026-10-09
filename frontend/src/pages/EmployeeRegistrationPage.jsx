import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Upload, Users, Plus, Trash2, FileText, Camera } from "lucide-react";
import { EmployeeApi } from "../api/employeeApi";
import { LevelApi } from "../api/levelApi";
import { RbacApi } from "../api/rbacApi";
import PrettyDatePicker from "../components/PrettyDatePicker";
import FaceCaptureModal from "../components/FaceCaptureModal";
import { FaceRecognitionApi } from "../api/faceRecognitionApi";

/* Simple UUID v4 generator (no external dep) */
function genUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const C = {
  card: "#EEF1F0", cardBorder: "rgba(0,80,60,0.09)",
  shadow: "0 2px 12px rgba(0,60,45,0.07)",
  primary: "#0F766E", primaryHov: "#14B8A6",
  textMain: "#1A2E2B", textSub: "#1E4A42", textMuted: "#2E6058",
  border: "rgba(0,80,60,0.12)",
  headerBg: "linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)",
};

const GreenBtn = ({ children, onClick, disabled, type = "button", style = {} }) => {
  const baseBg = style.background || (disabled ? "#8AADA6" : C.primary);
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#8AADA6" : C.primary, color: "#fff",
      border: "none", borderRadius: 8, padding: "10px 22px",
      fontSize: "0.82rem", fontWeight: 600,
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
    padding: "9px 20px", fontSize: "0.82rem", fontWeight: 600,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    fontFamily: "Poppins, sans-serif", transition: "all 0.15s", ...style,
  }}
    onMouseEnter={e => { e.currentTarget.style.background = "rgba(15,118,110,0.08)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
  >{children}</button>
);

const fld = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "10px 14px", fontSize: "0.82rem", color: C.textMain,
  background: C.card, outline: "none", fontFamily: "Poppins, sans-serif",
  boxSizing: "border-box",
};
const lbl = {
  fontSize: "0.75rem", fontWeight: 600, color: C.textSub,
  display: "block", marginBottom: 5,
};
const req = { color: "#dc2626" };

const Field = ({ label, required, children }) => (
  <div>
    <label style={lbl}>{label} {required && <span style={req}>**</span>}</label>
    {children}
  </div>
);

const STEPS = [
  "Personal Information",
  "Address Information",
  "Financial Information",
  "Additional Information",
  "Face Registration",
  "Review & Submit",
];

/* ── Step indicator ── */
const StepBar = ({ current }) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 28, overflowX: "auto" }}>
    {STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={i}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: done ? C.primary : active ? C.primary : "rgba(0,80,60,0.12)",
              color: done || active ? "#fff" : C.textMuted,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700, border: active ? `2px solid ${C.primaryHov}` : "none",
              boxShadow: active ? `0 0 0 4px rgba(15,118,110,0.15)` : "none",
            }}>
              {done ? <Check size={14} /> : i + 1}
            </div>
            <span style={{
              marginTop: 6, fontSize: "0.65rem", fontWeight: active ? 700 : 500,
              color: active ? C.primary : done ? C.textSub : C.textMuted,
              textAlign: "center", whiteSpace: "nowrap",
            }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, minWidth: 20,
              background: done ? C.primary : "rgba(0,80,60,0.12)",
              margin: "0 4px", marginBottom: 20,
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ── Step 1: Personal Information ── */
const Step1 = ({ data, onChange, photoFile, onPhotoChange, idDocs, onIdDocChange }) => {
  const DOC_TYPES = ["Resident ID", "Driving License", "Passport", "National ID"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title and Name */}
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>Title and Name</h3>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr 1fr", gap: 12 }}>
          <Field label="Title" required>
            <select value={data.title} onChange={e => onChange("title", e.target.value)} style={fld}>
              <option value="">Select Title</option>
              {["Mr", "Mrs", "Ms", "Dr", "Prof", "Ato", "W/ro", "W/t"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="First Name" required>
            <input value={data.first_name} onChange={e => onChange("first_name", e.target.value)} placeholder="First Name **" style={fld} />
          </Field>
          <Field label="Middle Name" required>
            <input value={data.middle_name} onChange={e => onChange("middle_name", e.target.value)} placeholder="Middle Name **" style={fld} />
          </Field>
          <Field label="Last Name" required>
            <input value={data.last_name} onChange={e => onChange("last_name", e.target.value)} placeholder="Last Name **" style={fld} />
          </Field>
          <Field label="Mother's Name" required>
            <input value={data.mother_name} onChange={e => onChange("mother_name", e.target.value)} placeholder="Mother's Name **" style={fld} />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={lbl}>Profile Picture <span style={req}>*</span></label>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 8, cursor: "pointer",
            background: photoFile ? "rgba(15,118,110,0.1)" : "#fee2e2",
            border: `1px solid ${photoFile ? C.primary : "#fca5a5"}`,
            color: photoFile ? C.primary : "#dc2626", fontSize: "0.78rem", fontWeight: 600,
          }}>
            <Upload size={13} />
            {photoFile ? photoFile.name : "UPLOAD PHOTO *"}
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => onPhotoChange(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>

      {/* Gender and DOB */}
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>Gender and Birth Date</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400 }}>
          <Field label="Gender" required>
            <select value={data.gender} onChange={e => onChange("gender", e.target.value)} style={fld}>
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </Field>
          <Field label="Date of Birth" required>
            <PrettyDatePicker 
              value={data.date_of_birth} 
              onChange={v => onChange("date_of_birth", v)}
              maxDate={new Date().toISOString().split('T')[0]}
            />
          </Field>
        </div>
      </div>

      {/* Nationality */}
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>ID</h3>
        <div style={{ maxWidth: 280 }}>
          <Field label="Nationality" required>
            <input value={data.nationality} onChange={e => onChange("nationality", e.target.value)} placeholder="Nationality **" style={fld} />
          </Field>
        </div>
      </div>

      {/* ID Documents */}
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>Identification Documents</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#E2E7E6" }}>
              {["Type", "Issue Date", "Valid Until", "ID Number", "Attachment"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOC_TYPES.map(type => {
              const doc = idDocs[type] || {};
              return (
                <tr key={type} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: C.textMain, fontWeight: 500 }}>{type}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <PrettyDatePicker 
                      value={doc.issue_date || ""} 
                      onChange={v => onIdDocChange(type, "issue_date", v)}
                      maxDate={new Date().toISOString().split('T')[0]}
                    />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <PrettyDatePicker 
                      value={doc.valid_until || ""} 
                      onChange={v => onIdDocChange(type, "valid_until", v)}
                    />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <input value={doc.id_number || ""} onChange={e => onIdDocChange(type, "id_number", e.target.value)} style={{ ...fld, padding: "7px 10px" }} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <label style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                      background: doc.file ? "rgba(15,118,110,0.1)" : "rgba(0,80,60,0.06)",
                      border: `1px solid ${doc.file ? C.primary : C.border}`,
                      color: doc.file ? C.primary : C.textMuted, fontSize: "0.72rem", fontWeight: 600,
                    }}>
                      <Upload size={11} />
                      {doc.file ? doc.file.name.slice(0, 12) + "…" : "UPLOAD"}
                      <input type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={e => onIdDocChange(type, "file", e.target.files?.[0] || null)} />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Step 2: Address Information ── */
const Step2 = ({ data, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    {["PERMANENT", "CURRENT"].map(type => {
      // For PERMANENT address, all fields are required except kebele and phone_secondary
      const isPermanent = type === "PERMANENT";
      const fields = [
        { key: "region", label: "Region / City", required: isPermanent },
        { key: "zone", label: "Zone / Sub-city", required: isPermanent },
        { key: "woreda", label: "Woreda", required: isPermanent },
        { key: "kebele", label: "Kebele", required: false },
        { key: "house_number", label: "House Number", required: isPermanent },
        { key: "phone_primary", label: "Phone (Primary)", required: isPermanent },
        { key: "phone_secondary", label: "Phone (Secondary)", required: false },
        { key: "email", label: "Email", required: isPermanent },
      ];

      return (
        <div key={type}>
          <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
            {type === "PERMANENT" ? "Permanent" : "Current"} Address
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {fields.map(({ key, label, required }) => (
              <Field key={key} label={label} required={required}>
                <input
                  value={data[type]?.[key] || ""}
                  onChange={e => onChange(type, key, e.target.value)}
                  style={fld}
                  type={key === "email" ? "email" : "text"}
                  placeholder={required ? `${label} **` : label}
                />
              </Field>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

/* ── Step 3: Financial Information ── */
const Step3 = ({ data, onChange, departments, positions, levels, occupations }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    <div>
      <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>Bank Information</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Bank Name" required>
          <input value={data.bank_name} onChange={e => onChange("bank_name", e.target.value)} placeholder="Bank Name **" style={fld} />
        </Field>
        <Field label="Bank Account Number" required>
          <input value={data.bank_account_number} onChange={e => onChange("bank_account_number", e.target.value)} placeholder="Bank Account Number **" style={fld} />
        </Field>
      </div>
    </div>
    <div>
      <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>Tax and Pension Information</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Income Tax Code (TIN No.)">
          <input value={data.tin_number} onChange={e => onChange("tin_number", e.target.value)} placeholder="Income Tax Code (TIN No.)" style={fld} />
        </Field>
        <Field label="Pension Code">
          <input value={data.pension_code} onChange={e => onChange("pension_code", e.target.value)} placeholder="Pension Code" style={fld} />
        </Field>
      </div>
    </div>
    <div>
      <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 700, color: C.textMain, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>Employment Details</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Department" required>
          <select value={data.department_uuid} onChange={e => onChange("department_uuid", e.target.value)} style={fld}>
            <option value="">Select Department</option>
            {departments.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Position" required>
          <select value={data.position_uuid} onChange={e => onChange("position_uuid", e.target.value)} style={fld}>
            <option value="">Select Position</option>
            {positions.map(p => <option key={p.uuid} value={p.uuid}>{p.title}</option>)}
          </select>
        </Field>
        <Field label="Level" required>
          <select value={data.level_uuid} onChange={e => onChange("level_uuid", e.target.value)} style={fld}>
            <option value="">Select Level</option>
            {levels.map(l => <option key={l.uuid} value={l.uuid}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Occupation">
          <select value={data.occupation_uuid} onChange={e => onChange("occupation_uuid", e.target.value)} style={fld}>
            <option value="">Select Occupation</option>
            {occupations.map(o => <option key={o.uuid} value={o.uuid}>{o.name}</option>)}
          </select>
        </Field>
        <Field label="Hire Date" required>
          <PrettyDatePicker 
            value={data.hire_date} 
            onChange={v => onChange("hire_date", v)}
            maxDate={new Date().toISOString().split('T')[0]}
          />
        </Field>
        <Field label="Prior Gov. Service (years)">
          <input type="number" step="0.5" min="0" value={data.prior_gov_service} onChange={e => onChange("prior_gov_service", e.target.value)} style={fld} />
        </Field>
      </div>
    </div>
  </div>
);

/* ── Step 4: Additional Information (Education / Work / Training) ── */
const Step4 = ({ extraInfo, onExtraInfoChange }) => {
  const SECTIONS = [
    {
      key: "Education",
      label: "Education",
      icon: <FileText size={14} color="#0F766E"/>,
      fields: [
        { key:"institution", label:"Institution / University *", placeholder:"e.g. Addis Ababa University" },
        { key:"degree",      label:"Degree / Qualification *",   placeholder:"e.g. B.Sc. Computer Science" },
        { key:"field",       label:"Field of Study",             placeholder:"e.g. Information Technology" },
        { key:"start_date",  label:"Start Date",  type:"date" },
        { key:"end_date",    label:"End Date",    type:"date" },
      ],
    },
    {
      key: "Work Experience",
      label: "Work Experience",
      icon: <FileText size={14} color="#2563EB"/>,
      fields: [
        { key:"company",     label:"Company / Organization *", placeholder:"e.g. Ethiopian Airlines" },
        { key:"title",       label:"Job Title *",              placeholder:"e.g. Software Engineer" },
        { key:"start_date",  label:"Start Date", type:"date" },
        { key:"end_date",    label:"End Date",   type:"date" },
        { key:"description", label:"Description", type:"textarea", placeholder:"Brief description of responsibilities" },
      ],
    },
    {
      key: "Training & Certifications",
      label: "Training & Certifications",
      icon: <FileText size={14} color="#7C3AED"/>,
      fields: [
        { key:"name",     label:"Certification / Training Name *", placeholder:"e.g. PMP Certification" },
        { key:"provider", label:"Issuing Organization",            placeholder:"e.g. PMI" },
        { key:"date",     label:"Date Obtained", type:"date" },
        { key:"expiry",   label:"Expiry Date",   type:"date" },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <p style={{ margin: 0, fontSize: "0.82rem", color: C.textMuted }}>
        Add education, work experience and certifications below. All fields are optional — you can also add them later from the employee profile.
      </p>
      {SECTIONS.map(({ key, label, icon, fields }) => {
        const entries = extraInfo[key] || [{}];
        return (
          <div key={key} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {icon}
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: C.textMain }}>{label}</span>
                <span style={{ background: "rgba(0,80,60,0.1)", color: C.textMuted, borderRadius: 99, padding: "1px 8px", fontSize: "0.65rem", fontWeight: 700 }}>{entries.filter(e => Object.keys(e).length > 0).length}</span>
              </div>
              <GreenBtn
                style={{ fontSize: "0.7rem", padding: "6px 12px" }}
                onClick={() => onExtraInfoChange(key, [...entries, {}])}
              >
                <Plus size={11} /> ADD
              </GreenBtn>
            </div>
            {/* Entries */}
            <div style={{ padding: "16px", background: "#fafafa", display: "flex", flexDirection: "column", gap: 16 }}>
              {entries.map((entry, idx) => (
                <div key={idx} style={{ background: "#fff", borderRadius: 8, border: `1px solid ${C.border}`, padding: "14px 16px", position: "relative" }}>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onExtraInfoChange(key, entries.filter((_, i) => i !== idx))}
                      style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 2, display: "flex", alignItems: "center" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {fields.map(({ key: fKey, label: fLabel, type = "text", placeholder }) => (
                      <div key={fKey} style={{ gridColumn: type === "textarea" ? "1 / -1" : "auto" }}>
                        <label style={lbl}>{fLabel}</label>
                        {type === "textarea" ? (
                          <textarea
                            value={entry[fKey] || ""}
                            onChange={e => {
                              const updated = [...entries];
                              updated[idx] = { ...updated[idx], [fKey]: e.target.value };
                              onExtraInfoChange(key, updated);
                            }}
                            rows={2}
                            placeholder={placeholder}
                            style={{ ...fld, resize: "vertical" }}
                          />
                        ) : type === "date" ? (
                          <PrettyDatePicker
                            value={entry[fKey] || ""}
                            onChange={v => {
                              const updated = [...entries];
                              updated[idx] = { ...updated[idx], [fKey]: v };
                              onExtraInfoChange(key, updated);
                            }}
                          />
                        ) : (
                          <input
                            value={entry[fKey] || ""}
                            onChange={e => {
                              const updated = [...entries];
                              updated[idx] = { ...updated[idx], [fKey]: e.target.value };
                              onExtraInfoChange(key, updated);
                            }}
                            placeholder={placeholder}
                            style={fld}
                          />
                        )}
                      </div>
                    ))}
                    {/* Document upload per entry */}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={lbl}>Supporting Document (optional)</label>
                      <label style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "7px 14px", borderRadius: 7, cursor: "pointer",
                        background: entry._file ? "rgba(15,118,110,0.08)" : "rgba(0,80,60,0.04)",
                        border: `1px solid ${entry._file ? C.primary : C.border}`,
                        color: entry._file ? C.primary : C.textMuted,
                        fontSize: "0.75rem", fontWeight: 600,
                      }}>
                        <Upload size={12} />
                        {entry._file ? entry._file.name.slice(0, 24) + (entry._file.name.length > 24 ? "…" : "") : "Upload file"}
                        <input type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={e => {
                          const updated = [...entries];
                          updated[idx] = { ...updated[idx], _file: e.target.files?.[0] || null };
                          onExtraInfoChange(key, updated);
                        }} />
                      </label>
                      {entry._file && (
                        <button type="button" onClick={() => {
                          const updated = [...entries];
                          updated[idx] = { ...updated[idx], _file: null };
                          onExtraInfoChange(key, updated);
                        }} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "0.72rem", fontWeight: 600, verticalAlign: "middle" }}>Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Step 5: Face Registration ── */
const Step5 = ({ employeeUuid, onFaceRegistered, onSkip }) => {
  const [showModal, setShowModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async (images, descriptors, uuid) => {
    setError('');
    setRegistering(true);
    
    try {
      await FaceRecognitionApi.registerFaceImages(uuid, images, descriptors);
      setRegistered(true);
      setShowModal(false);
      if (onFaceRegistered) onFaceRegistered();
    } catch (err) {
      console.error('Face registration error:', err);
      setError(err.message || 'Failed to register face images. You can skip this step and add them later.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "20px 0" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "rgba(15,118,110,0.1)", marginBottom: 16 }}>
          <Camera size={32} color={C.primary} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 700, color: C.textMain }}>
          Face Recognition Setup
        </h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: C.textMuted, maxWidth: 540, margin: "0 auto" }}>
          Register face images to enable biometric attendance. This step is optional and can be completed later from the employee profile.
        </p>
      </div>

      {/* Status */}
      {registered && (
        <div style={{ 
          background: 'rgba(5,150,105,0.1)', 
          padding: 16, 
          borderRadius: 10, 
          border: '1px solid rgba(5,150,105,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          maxWidth: 540,
          margin: "0 auto",
          width: "100%"
        }}>
          <Check size={20} color="#059669" />
          <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
            Face images registered successfully! You can proceed to review and submit.
          </span>
        </div>
      )}

      {error && (
        <div style={{ 
          background: 'rgba(220,38,38,0.1)', 
          padding: 14, 
          borderRadius: 10, 
          border: '1px solid rgba(220,38,38,0.3)',
          maxWidth: 540,
          margin: "0 auto",
          width: "100%"
        }}>
          <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Info Cards */}
      {!registered && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: C.primary, marginBottom: 4 }}>7</div>
            <div style={{ fontSize: "0.75rem", color: C.textMuted }}>Photos Required</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: C.primary, marginBottom: 4 }}>2</div>
            <div style={{ fontSize: "0.75rem", color: C.textMuted }}>Minutes Needed</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: C.primary, marginBottom: 4 }}>✓</div>
            <div style={{ fontSize: "0.75rem", color: C.textMuted }}>Different Angles</div>
          </div>
        </div>
      )}

      {/* Requirements */}
      {!registered && (
        <div style={{ 
          background: 'rgba(15,118,110,0.05)', 
          padding: 20, 
          borderRadius: 12,
          border: `1px solid rgba(15,118,110,0.15)`,
          maxWidth: 540,
          margin: "0 auto",
          width: "100%"
        }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 700, color: C.primary }}>What you'll need:</h4>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.8rem", color: C.textMuted, lineHeight: 1.8 }}>
            <li>Working camera (webcam or built-in)</li>
            <li>Good lighting conditions</li>
            <li>Follow on-screen instructions for each angle</li>
            <li>Ensure face is clearly visible in all photos</li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      {!registered && !employeeUuid && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: "0.8rem", color: C.textMuted, marginBottom: 16 }}>
            Face registration will be available after employee creation
          </p>
        </div>
      )}

      {!registered && employeeUuid && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
          <GreenBtn onClick={() => setShowModal(true)} disabled={registering}>
            <Camera size={14} />
            {registering ? 'Registering...' : 'Start Face Registration'}
          </GreenBtn>
        </div>
      )}

      {/* Modal */}
      {showModal && employeeUuid && (
        <FaceCaptureModal
          onClose={() => setShowModal(false)}
          onComplete={handleComplete}
          employeeUuid={employeeUuid}
        />
      )}
    </div>
  );
};

/* ── Step 6: Review & Submit ── */
const Step6 = ({ personal, address, financial, photoFile }) => {
  const Row = ({ label, value }) => (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontWeight: 600, color: C.textSub, minWidth: 180, fontSize: "0.8rem" }}>{label}:</span>
      <span style={{ color: C.textMain, fontSize: "0.8rem" }}>{value || "—"}</span>
    </div>
  );
  
  const photoPreviewUrl = photoFile ? URL.createObjectURL(photoFile) : null;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Photo Preview */}
      {photoPreviewUrl && (
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: "16px 20px", textAlign: "center" }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 700, color: C.primary }}>Profile Photo</h4>
          <img 
            src={photoPreviewUrl} 
            alt="Profile Preview" 
            style={{ 
              width: 120, 
              height: 120, 
              borderRadius: "50%", 
              objectFit: "cover", 
              border: `3px solid ${C.primary}`,
              margin: "0 auto"
            }} 
          />
          <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: C.textMuted }}>
            This photo will be set as the employee's profile picture
          </p>
        </div>
      )}
      
      <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 700, color: C.primary }}>Personal Information</h4>
        <Row label="Full Name" value={`${personal.title || ""} ${personal.first_name} ${personal.middle_name} ${personal.last_name}`.trim()} />
        <Row label="Mother's Name" value={personal.mother_name} />
        <Row label="Gender" value={personal.gender} />
        <Row label="Date of Birth" value={personal.date_of_birth} />
        <Row label="Nationality" value={personal.nationality} />
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 700, color: C.primary }}>Contact (Permanent)</h4>
        <Row label="Region" value={address.PERMANENT?.region} />
        <Row label="Phone" value={address.PERMANENT?.phone_primary} />
        <Row label="Email" value={address.PERMANENT?.email} />
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 700, color: C.primary }}>Financial & Employment</h4>
        <Row label="Bank Name" value={financial.bank_name} />
        <Row label="Account Number" value={financial.bank_account_number} />
        <Row label="TIN Number" value={financial.tin_number} />
        <Row label="Hire Date" value={financial.hire_date} />
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   ROOT — EmployeeRegistrationPage
══════════════════════════════════════════ */
const EmployeeRegistrationPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  
  // Persist draftUuid in localStorage to survive page refreshes
  const [draftUuid] = useState(() => {
    const stored = localStorage.getItem('employeeRegistrationDraftUuid');
    if (stored) return stored;
    const newUuid = genUuid();
    localStorage.setItem('employeeRegistrationDraftUuid', newUuid);
    return newUuid;
  });
  
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ── Form state ── */
  const [personal, setPersonal] = useState({
    title: "", first_name: "", middle_name: "", last_name: "",
    mother_name: "", gender: "", date_of_birth: "", nationality: "Ethiopian",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [idDocs, setIdDocs] = useState({});
  const [address, setAddress] = useState({ PERMANENT: {}, CURRENT: {} });
  const [financial, setFinancial] = useState({
    bank_name: "", bank_account_number: "", tin_number: "", pension_code: "",
    department_uuid: "", position_uuid: "", level_uuid: "", occupation_uuid: "",
    hire_date: "", prior_gov_service: 0,
  });
  const [extraInfo, setExtraInfo] = useState({
    "Education": [{}],
    "Work Experience": [{}],
    "Training & Certifications": [{}],
  });
  const [createdEmployeeUuid, setCreatedEmployeeUuid] = useState(null);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  /* ── Dropdown data ── */
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [occupations, setOccupations] = useState([]);

  /* ── Load dropdown data and restore draft on mount ── */
  useEffect(() => {
    Promise.all([
      EmployeeApi.listDepartments().catch(() => ({ data: [] })),
      EmployeeApi.listPositions().catch(() => ({ data: [] })),
      LevelApi.list().catch(() => ({ data: [] })),
      RbacApi.listOccupations().catch(() => ({ data: [] })),
    ]).then(([d, p, l, o]) => {
      // Defensive array checks to prevent .map() crashes
      setDepartments(Array.isArray(d?.data) ? d.data : []);
      setPositions(Array.isArray(p?.data) ? p.data : []);
      setLevels(Array.isArray(l?.data) ? l.data : []);
      setOccupations(Array.isArray(o?.data) ? o.data : []);
    }).catch(err => {
      console.error('Failed to load dropdown data:', err);
      // Ensure all are arrays even on complete failure
      setDepartments([]);
      setPositions([]);
      setLevels([]);
      setOccupations([]);
    });

    // Restore draft from backend
    EmployeeApi.getDraft(draftUuid)
      .then(response => {
        const draft = response?.data;
        if (!draft?.draft_json) return;
        
        const savedData = draft.draft_json;
        
        if (savedData.personal) setPersonal(savedData.personal);
        if (savedData.address) setAddress(savedData.address);
        if (savedData.financial) setFinancial(savedData.financial);
        if (typeof draft.step_completed === 'number') setStep(draft.step_completed);
        
        setDraftLoaded(true);
      })
      .catch(() => {
        // No draft exists yet
      });
  }, [draftUuid]);

  const handlePersonalChange = (key, val) => {
    // Validate future dates immediately for date_of_birth
    if (key === "date_of_birth" && val) {
      const selectedDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        setError("Date of Birth cannot be in the future.");
        return;
      }
    }
    setError("");
    setPersonal(p => ({ ...p, [key]: val }));
  };

  const handleAddressChange = (type, key, val) => setAddress(p => ({ ...p, [type]: { ...p[type], [key]: val } }));

  const handleFinancialChange = (key, val) => {
    // Validate future dates immediately for hire_date
    if (key === "hire_date" && val) {
      const selectedDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        setError("Hire Date cannot be in the future.");
        return;
      }
    }
    setError("");
    setFinancial(p => ({ ...p, [key]: val }));
  };

  const handleIdDocChange = (type, key, val) => {
    // Validate future dates immediately for ID document dates
    if ((key === "issue_date" || key === "valid_until") && val) {
      const selectedDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (key === "issue_date" && selectedDate > today) {
        setError(`${type} Issue Date cannot be in the future.`);
        return;
      }
    }
    setError("");
    setIdDocs(p => ({ ...p, [type]: { ...(p[type] || {}), [key]: val } }));
  };

  const handleExtraInfoChange = (section, entries) => setExtraInfo(p => ({ ...p, [section]: entries }));

  /* ── Auto-save draft ── */
  const saveDraft = useCallback(async (currentStep) => {
    try {
      setSaving(true);
      await EmployeeApi.saveDraft(draftUuid, currentStep, { personal, address, financial });
    } catch (error) {
      console.error('Draft save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [draftUuid, personal, address, financial]);

  /* ── Auto-save on form changes ── */
  useEffect(() => {
    // Only save if there's some data entered
    const hasData = personal.first_name || personal.last_name || 
                    personal.middle_name || personal.mother_name ||
                    financial.hire_date ||
                    Object.values(address.PERMANENT || {}).some(v => v) ||
                    Object.values(address.CURRENT || {}).some(v => v);
    
    if (!hasData) return;

    const timeoutId = setTimeout(() => {
      saveDraft(step);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [personal, address, financial, step, saveDraft]);

  const goNext = async () => {
    setError("");
    
    // Step 0: Personal Information validation
    if (step === 0) {
      if (!personal.first_name || !personal.middle_name || !personal.last_name || !personal.mother_name || !personal.gender || !personal.date_of_birth) {
        setError("Please fill all required fields (marked **).");
        return;
      }
      // Validate mother_name contains at least 2 name parts
      const motherNameParts = personal.mother_name.trim().split(/\s+/).filter(part => part.length > 0);
      if (motherNameParts.length < 2) {
        setError("Please enter the mother's full name (at least first and last name).");
        return;
      }
      if (!photoFile) {
        setError("Profile photo is required. Please upload a photo.");
        return;
      }
      // Validate date_of_birth is not in the future
      if (personal.date_of_birth) {
        const dob = new Date(personal.date_of_birth);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dob > today) {
          setError("Date of Birth cannot be in the future.");
          return;
        }
      }
    }
    
    // Step 1: Address Information validation (Permanent Address required fields)
    if (step === 1) {
      const perm = address.PERMANENT || {};
      const requiredFields = ["region", "zone", "woreda", "house_number", "phone_primary", "email"];
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!perm[field] || String(perm[field]).trim() === "") {
          missingFields.push(field.replace(/_/g, " "));
        }
      }
      
      if (missingFields.length > 0) {
        setError(`Please fill all required Permanent Address fields: ${missingFields.join(", ")}.`);
        return;
      }
    }
    
    // Step 2: Financial Information validation
    if (step === 2) {
      if (!financial.hire_date) {
        setError("Hire date is required.");
        return;
      }
      // Validate hire_date is not in the future
      if (financial.hire_date) {
        const hireDate = new Date(financial.hire_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (hireDate > today) {
          setError("Hire Date cannot be in the future.");
          return;
        }
      }
    }
    
    // If moving from step 3 to 4 (face registration), create the employee first
    if (step === 3 && !createdEmployeeUuid) {
      await createEmployee();
      if (!createdEmployeeUuid) return; // Stay on current step if creation failed
    }
    
    await saveDraft(step + 1);
    setStep(s => s + 1);
  };

  const createEmployee = async () => {
    setSubmitting(true); 
    setError("");
    try {
      const orNull = v => (v && String(v).trim() !== "" ? v : null);
      const bankName    = orNull(financial.bank_name);
      const bankAccount = orNull(financial.bank_account_number);
      if ((bankName && !bankAccount) || (!bankName && bankAccount)) {
        setError("Please provide both Bank Name and Bank Account Number, or leave both empty.");
        setSubmitting(false); 
        return;
      }

      const payload = {
        title:         orNull(personal.title),
        first_name:    personal.first_name.trim(),
        middle_name:   personal.middle_name.trim(),
        last_name:     personal.last_name.trim(),
        mother_name:   personal.mother_name.trim(),
        gender:        personal.gender,
        date_of_birth: personal.date_of_birth,
        nationality:   personal.nationality || "Ethiopian",
        hire_date:     financial.hire_date,
        prior_gov_service: Number(financial.prior_gov_service) || 0,
        draft_uuid:    draftUuid, // Include draft UUID so backend can delete it
        ...(orNull(financial.department_uuid)  && { department_uuid:  financial.department_uuid }),
        ...(orNull(financial.position_uuid)    && { position_uuid:    financial.position_uuid }),
        ...(orNull(financial.level_uuid)       && { level_uuid:       financial.level_uuid }),
        ...(orNull(financial.occupation_uuid)  && { occupation_uuid:  financial.occupation_uuid }),
        ...(bankName && bankAccount ? { bank_name: bankName, bank_account_number: bankAccount } : {}),
        ...(orNull(financial.tin_number)   && { tin_number:   financial.tin_number.trim() }),
        ...(orNull(financial.pension_code) && { pension_code: financial.pension_code.trim() }),
        addresses: [
          ...(Object.values(address.PERMANENT).some(v => v && v.trim && v.trim())
            ? [{ address_type: "PERMANENT", ...address.PERMANENT }] : []),
          ...(Object.values(address.CURRENT).some(v => v && v.trim && v.trim())
            ? [{ address_type: "CURRENT",   ...address.CURRENT   }] : []),
        ],
      };

      const res = await EmployeeApi.create(payload);
      const newUuid = res?.data?.uuid;

      if (!newUuid) {
        setError("Failed to create employee record.");
        setSubmitting(false);
        return;
      }

      setCreatedEmployeeUuid(newUuid);

      // Upload photo - critical for profile picture
      if (photoFile && newUuid) {
        try {
          await EmployeeApi.uploadPhoto(newUuid, photoFile);
          console.log('Profile photo uploaded successfully');
        } catch (photoError) {
          console.error('Photo upload failed:', photoError);
          setError(`Employee created but photo upload failed: ${photoError.message}. You can upload the photo from the employee detail page.`);
        }
      }
      
      // Upload ID documents
      if (newUuid) {
        for (const [type, doc] of Object.entries(idDocs)) {
          if (doc.file) {
            try {
              await EmployeeApi.addDocument(newUuid, [doc.file], {
                doc_type: type, id_number: doc.id_number || "",
                issue_date: doc.issue_date || "", valid_until: doc.valid_until || "",
              });
            } catch { /* non-critical */ }
          }
        }
      }

      // Save extra info (education, work, training)
      if (newUuid) {
        for (const [section, entries] of Object.entries(extraInfo)) {
          const filled = entries.filter(e => Object.values(e).some(v => v && v !== null && v.toString && v.toString().trim()));
          for (const entry of filled) {
            try {
              const { _file, ...formData } = entry;
              const jsonContent = JSON.stringify(formData);
              const fileToUpload = _file || new File(
                [new Blob([jsonContent], { type: "text/plain" })],
                `${section.replace(/\s+/g,"-").toLowerCase()}.txt`,
                { type: "text/plain" }
              );
              await EmployeeApi.addDocument(newUuid, [fileToUpload], {
                doc_type: section,
                id_number: jsonContent,
                issue_date: formData.start_date || formData.date || "",
                valid_until: formData.end_date || formData.expiry || "",
              });
            } catch { /* non-critical */ }
          }
        }
      }
    } catch (e) {
      setError(e.message || "Failed to create employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => { setError(""); setStep(s => s - 1); };
  
  const startFreshRegistration = () => {
    // Clear localStorage and reload
    localStorage.removeItem('employeeRegistrationDraftUuid');
    window.location.reload();
  };

  const handleSubmit = async () => {
    // If employee hasn't been created yet (e.g., if user skipped face registration), create now
    if (!createdEmployeeUuid) {
      await createEmployee();
      if (!createdEmployeeUuid) return;
    }
    
    // Clear the draft UUID from localStorage after successful submission
    localStorage.removeItem('employeeRegistrationDraftUuid');
    
    setSuccess("Employee registered successfully!");
    setTimeout(() => navigate(createdEmployeeUuid ? `/employees/${createdEmployeeUuid}` : "/employees/all"), 1500);
  };

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Page Header ── */}
      <div style={{
        background: C.headerBg, borderRadius: 14, padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#E8F0EE" }}>Employee Registration</h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "rgba(232,240,238,0.6)" }}>Create Employee Records</p>
        </div>
        <OutlineBtn onClick={() => navigate("/employees/all")} style={{ color: "#E8F0EE", borderColor: "rgba(232,240,238,0.4)" }}>
          <Users size={13} /> ALL RECORDS
        </OutlineBtn>
      </div>

      {/* ── Draft Restored Message ── */}
      {draftLoaded && (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          background: "rgba(134,239,172,0.15)", 
          border: "1px solid rgba(134,239,172,0.4)",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 20,
          fontSize: "0.85rem",
          color: "#166534"
        }}>
          <span>Your previous registration draft has been restored. You can continue where you left off.</span>
          <button
            onClick={startFreshRegistration}
            style={{
              background: "none",
              border: "none",
              color: "#166534",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
              padding: "0 8px",
              fontFamily: "Poppins, sans-serif"
            }}
          >
            Start Fresh
          </button>
        </div>
      )}

      {/* ── Form Card ── */}
      <div style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`,
        boxShadow: C.shadow, padding: "28px 32px",
      }}>
        <StepBar current={step} />

        {error && (
          <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 20, background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 20, background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", fontSize: 13 }}>
            {success}
          </div>
        )}

        {step === 0 && (
          <Step1
            data={personal}
            onChange={handlePersonalChange}
            photoFile={photoFile}
            onPhotoChange={setPhotoFile}
            idDocs={idDocs}
            onIdDocChange={handleIdDocChange}
          />
        )}
        {step === 1 && <Step2 data={address} onChange={handleAddressChange} />}
        {step === 2 && (
          <Step3
            data={financial}
            onChange={handleFinancialChange}
            departments={departments}
            positions={positions}
            levels={levels}
            occupations={occupations}
          />
        )}
        {step === 3 && (
          <Step4
            extraInfo={extraInfo}
            onExtraInfoChange={handleExtraInfoChange}
          />
        )}
        {step === 4 && (
          <Step5
            employeeUuid={createdEmployeeUuid}
            onFaceRegistered={() => setFaceRegistered(true)}
            onSkip={() => setStep(5)}
          />
        )}
        {step === 5 && <Step6 personal={personal} address={address} financial={financial} photoFile={photoFile} />}

        {/* ── Navigation buttons ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div>
            {step > 0 && <OutlineBtn onClick={goBack}>← Back</OutlineBtn>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step < STEPS.length - 1 ? (
              <GreenBtn onClick={goNext} disabled={saving}>
                {saving ? "Saving..." : "Next →"}
              </GreenBtn>
            ) : (
              <GreenBtn onClick={handleSubmit} disabled={submitting}>
                <Check size={14} />
                {submitting ? "Submitting..." : "Submit Registration"}
              </GreenBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeRegistrationPage;
