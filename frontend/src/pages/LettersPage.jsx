import React, { useState, useEffect, useCallback } from "react";
import { LetterApi } from "../api/letterApi";
import { EmployeeApi } from "../api/employeeApi";
import {
  FileText, Plus, Eye, Trash2, RefreshCw, X, Edit2, Search, Send,
  CheckCircle, XCircle, Clock, Filter, Download, Upload, AlertCircle, Sparkles
} from "lucide-react";
import PDFTemplateModal from "../components/PDFTemplateModal";
import LetterTemplateModal from "../components/LetterTemplateModal";
import { useDialog } from "../context/DialogContext";

const C = {
  page: '#C5CECC', card: '#EEF1F0', cardBorder: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', primaryHov: '#14B8A6', textMain: '#1A2E2B',
  textSub: '#1E4A42', textMuted: '#2E6058', border: 'rgba(0,80,60,0.12)',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const LETTER_TYPES = [
  "Employment Verification", "Experience Letter", "Salary Confirmation",
  "Transfer Letter", "Promotion Letter", "Warning Letter",
];

const LETTER_CATEGORIES = [
  { value: "EMPLOYMENT", label: "Employment Letter" },
  { value: "PROMOTION", label: "Promotion Letter" },
  { value: "TRANSFER", label: "Transfer Letter" },
  { value: "WARNING", label: "Warning Letter" },
  { value: "EXPERIENCE", label: "Experience Certificate" },
  { value: "LEAVE_APPROVAL", label: "Leave Approval" },
  { value: "TERMINATION", label: "Termination Letter" },
  { value: "SALARY_VERIFICATION", label: "Salary Verification" },
  { value: "TAX_VERIFICATION", label: "Tax Verification" },
  { value: "GENERAL", label: "General Letter" },
];

const PLACEHOLDER_HINTS = [
  "{{employee_name}}", "{{position}}", "{{department}}",
  "{{hire_date}}", "{{date}}", "{{mesob_id}}",
  "{{email}}", "{{phone}}", "{{salary}}",
  "{{organization_name}}", "{{ref_no}}",
];

/* ── Modern Components ── */
const Card = ({ children, style = {}, hover = false }) => (
  <div style={{
    background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`,
    boxShadow: C.shadow, transition: 'all 0.2s ease', ...style
  }}
    onMouseEnter={hover ? (e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,60,45,0.12)';
    } : undefined}
    onMouseLeave={hover ? (e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = C.shadow;
    } : undefined}
  >{children}</div>
);

const GreenBtn = ({ children, onClick, disabled, type = 'button', style = {}, variant = 'primary' }) => {
  const variants = {
    primary: { bg: C.primary, hov: C.primaryHov, color: '#fff' },
    secondary: { bg: 'rgba(15,118,110,0.1)', hov: 'rgba(15,118,110,0.2)', color: C.primary },
    danger: { bg: '#DC2626', hov: '#EF4444', color: '#fff' },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#8AADA6' : v.bg, color: v.color, border: 'none', borderRadius: 8,
      padding: '9px 18px', fontSize: '0.78rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'Poppins, sans-serif',
      transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', ...style,
    }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = v.hov; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'; }}}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = v.bg; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'; }}}
    >{children}</button>
  );
};

const IconBtn = ({ children, onClick, color = C.primary, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? C.textMuted : color, padding: '6px 10px', borderRadius: 6,
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600,
    fontFamily: 'Poppins, sans-serif', opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
  }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
    onMouseLeave={e => !disabled && (e.currentTarget.style.background = 'none')}
  >{children}</button>
);

const SearchInput = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px 10px 38px', borderRadius: 8, border: `1px solid ${C.border}`,
        fontSize: '0.82rem', color: C.textMain, background: C.card, outline: 'none',
        fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s',
      }}
      onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px rgba(15,118,110,0.1)`; }}
      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
    />
  </div>
);

const Toast = ({ message, type = 'success', onClose }) => {
  const types = {
    success: { bg: '#DCFCE7', border: '#166534', icon: CheckCircle },
    error: { bg: '#FEE2E2', border: '#991B1B', icon: XCircle },
    info: { bg: '#EFF6FF', border: '#1E40AF', icon: AlertCircle },
  };
  const t = types[type] || types.success;
  const Icon = t.icon;

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: t.bg, border: `2px solid ${t.border}`, borderRadius: 10,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease',
      minWidth: 300, maxWidth: 400,
    }}>
      <Icon size={20} color={t.border} />
      <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: t.border }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.border }}>
        <X size={16} />
      </button>
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
};

const PreviewModal = ({ letter, onClose }) => {
  const dialog = useDialog();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!letter.template_uuid || !letter.employee_uuid) {
      dialog.showError('Missing template or employee information');
      return;
    }

    setDownloading(true);
    try {
      await LetterApi.generateEnhancedLetter({
        template_uuid: letter.template_uuid,
        employee_uuid: letter.employee_uuid,
        ref_no: letter.ref_no || ''
      });
      dialog.showSuccess('Letter downloaded successfully!');
    } catch (err) {
      dialog.showError(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', animation: 'scaleIn 0.3s ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.headerBg, borderRadius: '16px 16px 0 0' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#E8F0EE' }}>{letter.template_name || letter.name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(232,240,238,0.7)' }}>
              {letter.employee_name || 'Letter Preview'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          ><X size={18} /></button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#fff' }}>
          {letter.html_content ? (
            <div dangerouslySetInnerHTML={{ __html: letter.html_content }} style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.9, color: C.textMain }} />
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '0.95rem', lineHeight: 2, color: C.textMain, margin: 0 }}>
              {letter.generated_content || 'No content available.'}
            </pre>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'rgba(0,80,60,0.02)' }}>
          <GreenBtn variant="secondary" onClick={onClose}>Close</GreenBtn>
          {letter.status === 'APPROVED' && letter.template_uuid && letter.employee_uuid && (
            <GreenBtn onClick={handleDownload} disabled={downloading}>
              <Download size={14} /> {downloading ? 'Downloading...' : 'Download PDF'}
            </GreenBtn>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
};

// TemplateModal moved to separate component file (LetterTemplateModal.jsx)

const GenerateModal = ({ templates, onClose, onGenerated }) => {
  const [form, setForm] = useState({ template_uuid: '', employee_uuid: '', ref_no: '' });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    // Fetch employees for dropdown
    fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'}/employees`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    })
      .then(res => res.json())
      .then(data => setEmployees(data.data || []))
      .catch(() => {});
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await LetterApi.previewEnhancedLetter(form);
      setPreview(res.data);
    } catch (err) {
      dialog.showError(err.message || 'Failed to generate preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      console.log('[UI] Starting PDF generation...');
      const result = await LetterApi.generateEnhancedLetter(form);
      console.log('[UI] Generation successful:', result);
      dialog.showSuccess(`Letter downloaded successfully!\nFilename: ${result.filename}`);
      onGenerated();
      onClose();
    } catch (err) {
      console.error('[UI] Generation failed:', err);
      dialog.showError(`Failed to generate letter:\n${err.message}\n\nPlease check the browser console for details.`);
    } finally {
      setGenerating(false);
    }
  };

  const fieldStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
    fontSize: '0.85rem', color: C.textMain, background: '#fff', outline: 'none',
    fontFamily: 'Poppins, sans-serif',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: preview ? 700 : 500, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,118,110,0.05)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>Generate Letter</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}><X size={20} /></button>
        </div>
        {!preview ? (
          <form onSubmit={handleGenerate} style={{ padding: '24px' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.textSub, marginBottom: 6 }}>Select Template *</label>
              <select style={{ ...fieldStyle, cursor: 'pointer' }} value={form.template_uuid} onChange={e => setForm(p => ({ ...p, template_uuid: e.target.value }))} required>
                <option value="">— Choose a template —</option>
                {templates.map(t => <option key={t.uuid} value={t.uuid}>{t.title || t.name} ({t.category || t.type})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.textSub, marginBottom: 6 }}>Select Employee *</label>
              <select style={{ ...fieldStyle, cursor: 'pointer' }} value={form.employee_uuid} onChange={e => setForm(p => ({ ...p, employee_uuid: e.target.value }))} required>
                <option value="">— Choose an employee —</option>
                {employees.map(emp => (
                  <option key={emp.uuid} value={emp.uuid}>
                    {emp.first_name} {emp.middle_name} {emp.last_name} ({emp.mesob_id})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.textSub, marginBottom: 6 }}>
                Reference Number
                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMuted, marginLeft: 8 }}>(Optional - auto-generated if empty)</span>
              </label>
              <input 
                type="text" 
                style={fieldStyle} 
                value={form.ref_no} 
                onChange={e => setForm(p => ({ ...p, ref_no: e.target.value }))} 
                placeholder="e.g., MESOB/2026/0001"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GreenBtn type="button" variant="secondary" onClick={onClose}>Cancel</GreenBtn>
              <GreenBtn type="submit" disabled={generating}>{generating ? 'Generating...' : 'Preview Letter'}</GreenBtn>
            </div>
          </form>
        ) : (
          <div style={{ padding: '24px' }}>
            <div style={{ background: 'rgba(15,118,110,0.05)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: `1px solid rgba(15,118,110,0.15)` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem' }}>
                <div>
                  <strong style={{ color: C.textSub }}>Reference No:</strong> {preview.ref_no}
                </div>
                <div>
                  <strong style={{ color: C.textSub }}>Category:</strong> {preview.category}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: C.textSub }}>Employee:</strong> {preview.employee_name}
                </div>
              </div>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px', marginBottom: 20, maxHeight: 400, overflowY: 'auto' }}>
              <div dangerouslySetInnerHTML={{ __html: preview.html_content }} style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.9, color: C.textMain }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GreenBtn variant="secondary" onClick={() => setPreview(null)}>Back</GreenBtn>
              <GreenBtn onClick={handleDownloadPDF} disabled={generating}>
                {generating ? 'Generating...' : 'Generate & Download PDF'}
              </GreenBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN PAGE - ADVANCED HR LETTERS MANAGEMENT
══════════════════════════════════════════════════════════ */
const LettersPage = () => {
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPDFTemplateModal, setShowPDFTemplateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewLetter, setPreviewLetter] = useState(null);
  const [deletingUuid, setDeletingUuid] = useState(null);
  const [approvingUuid, setApprovingUuid] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHTML, setPreviewHTML] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [inlineEmployees, setInlineEmployees] = useState([]);
  const [inlineForm, setInlineForm] = useState({ template_uuid: '', employee_uuid: '', ref_no: '' });
  const [inlineGenerating, setInlineGenerating] = useState(false);
  const [inlinePreview, setInlinePreview] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, requestsRes, placeholdersRes] = await Promise.all([
        LetterApi.listTemplates(),
        LetterApi.getAllLetterRequests(), // Get all requests, not just pending
        LetterApi.getPlaceholdersList().catch(() => ({ data: [] })), // Load placeholders
      ]);
      setTemplates(templatesRes?.data || []);
      setPendingRequests(requestsRes?.data || []);
      setPlaceholders(placeholdersRes?.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    EmployeeApi.list({ pageSize: 500 })
      .then(res => setInlineEmployees(Array.isArray(res.data) ? res.data : (res.data?.employees || [])))
      .catch(() => {});
  }, []);

  const handleInlinePreview = async () => {
    if (!inlineForm.template_uuid || !inlineForm.employee_uuid) {
      dialog.showError("Please select both a template and an employee first.");
      return;
    }
    setInlineGenerating(true);
    try {
      const res = await LetterApi.previewEnhancedLetter(inlineForm);
      setInlinePreview(res.data);
    } catch (err) {
      dialog.showError(err.message || "Failed to generate preview");
    } finally {
      setInlineGenerating(false);
    }
  };

  const handleInlineDownload = async () => {
    if (!inlineForm.template_uuid || !inlineForm.employee_uuid) {
      dialog.showError("Please select both a template and an employee first.");
      return;
    }
    setInlineGenerating(true);
    try {
      const result = await LetterApi.generateEnhancedLetter(inlineForm);
      dialog.showSuccess(`Letter generated and downloaded successfully!\nFilename: ${result.filename}`);
      loadData();
    } catch (err) {
      dialog.showError(`Failed to generate letter:\n${err.message}`);
    } finally {
      setInlineGenerating(false);
    }
  };

  const handleDeleteTemplate = async (uuid) => {
    dialog.showDeleteConfirm(
      'Are you sure you want to delete this template? This action cannot be undone.',
      async () => {
        setDeletingUuid(uuid);
        try {
          await LetterApi.deleteTemplate(uuid);
          showToast('Template deleted successfully.');
          loadData();
        } catch (err) {
          showToast(err.message || 'Failed to delete.', 'error');
        } finally {
          setDeletingUuid(null);
        }
      },
      {
        title: 'Delete Template',
        confirmText: 'Delete',
      }
    );
  };

  const handlePreviewTemplate = async (template) => {
    setPreviewTemplate(template);
    setPreviewLoading(true);
    setPreviewHTML(null);
    
    try {
      console.log('[UI] Previewing template with placeholders:', template.uuid);
      
      // Generate preview with placeholders (no employee needed)
      const previewData = await LetterApi.previewEnhancedLetter({
        template_uuid: template.uuid,
        ref_no: 'MESOB/2026/PREVIEW',
        show_placeholders: true, // Show template structure with placeholders
      });

      setPreviewHTML(previewData.data.html_content);
      
      // Show info about preview mode
      if (previewData.data.preview_mode === 'placeholder') {
        console.log('[UI] Preview showing template structure with placeholders');
      }
    } catch (err) {
      console.error('[UI] Preview error:', err);
      showToast('Failed to load preview: ' + err.message, 'error');
      setPreviewTemplate(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewRequest = async (req) => {
    try {
      // Load full HTML preview for the request
      const previewData = await LetterApi.previewEnhancedLetter({
        template_uuid: req.template_uuid,
        employee_uuid: req.employee_uuid,
        ref_no: req.ref_no || ''
      });
      
      setPreviewLetter({
        ...req,
        html_content: previewData.data.html_content,
        template_uuid: req.template_uuid,
        employee_uuid: req.employee_uuid
      });
    } catch (err) {
      showToast('Failed to load preview: ' + err.message, 'error');
    }
  };

  const handleApproveRequest = async (uuid) => {
    setApprovingUuid(uuid);
    try {
      await LetterApi.approveLetterRequest(uuid);
      showToast('Letter request approved and issued!');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to approve request.', 'error');
    } finally {
      setApprovingUuid(null);
    }
  };

  const handleRejectRequest = async (uuid) => {
    dialog.showPrompt(
      'Enter rejection reason (optional):',
      async (reason) => {
        try {
          await LetterApi.rejectLetterRequest(uuid, reason || '');
          showToast('Letter request rejected.');
          loadData();
        } catch (err) {
          showToast(err.message || 'Failed to reject request.', 'error');
        }
      },
      {
        title: 'Reject Letter Request',
        placeholder: 'Enter reason for rejection...',
        defaultValue: '',
        confirmText: 'Reject',
      }
    );
  };

  const handleGenerateApprovedLetter = async (req) => {
    if (!req.template_uuid || !req.employee_uuid) {
      showToast('Missing template or employee information', 'error');
      return;
    }

    setApprovingUuid(req.uuid);
    try {
      await LetterApi.generateEnhancedLetter({
        template_uuid: req.template_uuid,
        employee_uuid: req.employee_uuid,
        ref_no: req.ref_no || ''
      });
      showToast('Letter downloaded successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to generate letter.', 'error');
    } finally {
      setApprovingUuid(null);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = pendingRequests.filter(r => r.status === 'PENDING').length;
  const allRequestsCount = pendingRequests.length;

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner */}
      <div style={{ background: C.headerBg, borderRadius: 16, padding: '24px 28px', color: '#fff', marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(232,240,238,0.5)', fontWeight: 600 }}>
                Letters & Documents
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#E8F0EE', letterSpacing: '-0.5px' }}>
              Letters Management
            </h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(232,240,238,0.75)', fontSize: '0.84rem' }}>
              {templates.length} templates · {pendingCount} pending requests · {allRequestsCount} total requests
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadData} disabled={loading} style={{
              background: 'rgba(255,255,255,0.12)', color: '#E8F0EE', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8, padding: '10px 18px', fontSize: '0.8rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
              fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s',
            }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            >
              <RefreshCw size={14} className={loading ? 'spinning' : ''} /> {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes letterSwipeAnim {
          0% {
            opacity: 0;
            transform: translateX(18px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .letter-swipe-pane {
          animation: letterSwipeAnim 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Redesigned Sliding Pill Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px',
        background: 'rgba(238, 241, 240, 0.95)',
        borderRadius: 14,
        border: `1px solid ${C.cardBorder}`,
        boxShadow: C.shadow,
        marginBottom: 24,
        overflowX: 'auto',
      }}>
        {[
          { key: 'templates', label: 'Letter Templates', icon: FileText, count: templates.length },
          { key: 'generate', label: 'Generate Letter', icon: Send },
          { 
            key: 'requests', 
            label: 'Letter Requests', 
            icon: Clock, 
            count: pendingCount > 0 ? `${pendingCount} pending` : allRequestsCount,
            isPendingBadge: pendingCount > 0
          },
        ].map(({ key, label, icon: Icon, count, isPendingBadge }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #0F766E 0%, #0d655e 100%)' : 'transparent',
                color: isActive ? '#FFFFFF' : C.textSub,
                boxShadow: isActive ? '0 4px 14px rgba(15,118,110,0.28)' : 'none',
                fontSize: '0.84rem',
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(15,118,110,0.08)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
              {count !== undefined && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: isActive
                    ? (isPendingBadge ? '#EF4444' : 'rgba(255,255,255,0.22)')
                    : (isPendingBadge ? '#FEF3C7' : 'rgba(0,80,60,0.08)'),
                  color: isActive
                    ? '#FFFFFF'
                    : (isPendingBadge ? '#B45309' : C.textMuted),
                  transition: 'all 0.2s',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div key="templates" className="letter-swipe-pane">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
            <SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search templates..." />
            <div style={{ display: 'flex', gap: 10 }}>
              <GreenBtn variant="secondary" onClick={() => { setShowPDFTemplateModal(true); }}>
                <Upload size={16} /> Upload PDF Template
              </GreenBtn>
              <GreenBtn onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}>
                <Plus size={16} /> Text Template
              </GreenBtn>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: C.textMuted }}>
              <RefreshCw size={32} className="spinning" style={{ margin: '0 auto 12px' }} />
              <p>Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card style={{ padding: 60, textAlign: 'center' }}>
              <FileText size={56} style={{ margin: '0 auto 16px', opacity: 0.2, color: C.textMuted }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: C.textMain }}>
                {searchTerm ? 'No templates found' : 'No templates yet'}
              </h3>
              <p style={{ margin: '0 0 20px', color: C.textMuted, fontSize: '0.85rem' }}>
                {searchTerm ? 'Try adjusting your search' : 'Create your first letter template to get started'}
              </p>
              {!searchTerm && (
                <GreenBtn onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}>
                  <Plus size={14} /> Create Template
                </GreenBtn>
              )}
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filteredTemplates.map(tpl => (
                <Card key={tpl.uuid} hover style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'visible' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, #14B8A6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15,118,110,0.3)', flexShrink: 0 }}>
                      <FileText size={24} color="#fff" />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(15,118,110,0.1)', color: C.primary, padding: '4px 10px', borderRadius: 20 }}>
                        {tpl.category || tpl.type}
                      </span>
                      {tpl.template_type === 'pdf' && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#EFF6FF', color: '#1E40AF', padding: '4px 8px', borderRadius: 20 }}>
                          PDF
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: 70 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: C.textMain, lineHeight: 1.3 }}>
                      {tpl.title || tpl.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: C.textMuted, lineHeight: 1.5 }}>
                      {tpl.description || 'Ready for generation with dynamic employee variables'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '0.72rem', color: C.textMuted }}>
                      {tpl.created_at ? new Date(tpl.created_at).toLocaleDateString('en-GB') : 'Active'}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button 
                        onClick={() => handlePreviewTemplate(tpl)} 
                        title="Preview Template"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: C.primary, padding: '8px', borderRadius: 6,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => { setEditingTemplate(tpl); setShowTemplateModal(true); }}
                        title="Edit Template"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: C.primary, padding: '8px', borderRadius: 6,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTemplate(tpl.uuid)} 
                        disabled={deletingUuid === tpl.uuid}
                        title="Delete Template"
                        style={{
                          background: 'none', border: 'none', cursor: deletingUuid === tpl.uuid ? 'not-allowed' : 'pointer',
                          color: '#DC2626', padding: '8px', borderRadius: 6,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s', opacity: deletingUuid === tpl.uuid ? 0.5 : 1,
                        }}
                        onMouseEnter={e => !deletingUuid && (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}
                        onMouseLeave={e => !deletingUuid && (e.currentTarget.style.background = 'none')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Letter Tab */}
      {activeTab === 'generate' && (
        <div key="generate" className="letter-swipe-pane">
          <div style={{ display: 'grid', gridTemplateColumns: inlinePreview ? '1fr 1.1fr' : '1fr', gap: 24, maxWidth: inlinePreview ? 1200 : 760, margin: '0 auto' }}>
            <Card style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}, #14B8A6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15,118,110,0.25)' }}>
                  <Send size={24} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: C.textMain }}>
                    Generate Official Letter
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: C.textMuted }}>
                    Select template and employee to generate a branded, official PDF letter
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.textSub, marginBottom: 8 }}>
                    1. Select Letter Template *
                  </label>
                  <select
                    value={inlineForm.template_uuid}
                    onChange={e => setInlineForm(p => ({ ...p, template_uuid: e.target.value }))}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
                      fontSize: '0.85rem', color: C.textMain, background: '#fff', outline: 'none',
                      fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
                    }}
                  >
                    <option value="">— Choose a template —</option>
                    {templates.map(t => (
                      <option key={t.uuid} value={t.uuid}>
                        {t.title || t.name} ({t.category || t.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.textSub, marginBottom: 8 }}>
                    2. Select Recipient Employee *
                  </label>
                  <select
                    value={inlineForm.employee_uuid}
                    onChange={e => setInlineForm(p => ({ ...p, employee_uuid: e.target.value }))}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
                      fontSize: '0.85rem', color: C.textMain, background: '#fff', outline: 'none',
                      fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
                    }}
                  >
                    <option value="">— Choose an employee —</option>
                    {inlineEmployees.map(emp => (
                      <option key={emp.uuid} value={emp.uuid}>
                        {emp.first_name} {emp.middle_name || ''} {emp.last_name} ({emp.mesob_id || 'ID'}) - {emp.position_title || emp.position || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.textSub, marginBottom: 8 }}>
                    3. Reference Number (Optional)
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: C.textMuted, marginLeft: 8 }}>(Auto-generated if left blank)</span>
                  </label>
                  <input
                    type="text"
                    value={inlineForm.ref_no}
                    onChange={e => setInlineForm(p => ({ ...p, ref_no: e.target.value }))}
                    placeholder="e.g., FDRE/HR/2026/0145"
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
                      fontSize: '0.85rem', color: C.textMain, background: '#fff', outline: 'none',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <GreenBtn 
                    variant="secondary" 
                    onClick={handleInlinePreview} 
                    disabled={inlineGenerating || !inlineForm.template_uuid || !inlineForm.employee_uuid}
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                  >
                    <Eye size={16} /> {inlineGenerating ? 'Generating...' : 'Live Preview'}
                  </GreenBtn>
                  <GreenBtn 
                    onClick={handleInlineDownload} 
                    disabled={inlineGenerating || !inlineForm.template_uuid || !inlineForm.employee_uuid}
                    style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                  >
                    <Download size={16} /> {inlineGenerating ? 'Generating...' : 'Download PDF'}
                  </GreenBtn>
                </div>
              </div>
            </Card>

            {/* Inline Preview Pane */}
            {inlinePreview && (
              <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', maxHeight: 600 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.primary, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} /> Live Letter Preview
                  </h3>
                  <button 
                    onClick={() => setInlinePreview(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  {inlinePreview.html_content ? (
                    <div dangerouslySetInnerHTML={{ __html: inlinePreview.html_content }} style={{ fontSize: '0.85rem', lineHeight: 1.8 }} />
                  ) : (
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '0.85rem' }}>
                      {inlinePreview.main_body || 'No content generated.'}
                    </pre>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Letter Requests Tab */}
      {activeTab === 'requests' && (
        <div key="requests" className="letter-swipe-pane">
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `All Requests (${pendingRequests.length})` },
              { key: 'PENDING', label: `Pending (${pendingCount})` },
              { key: 'APPROVED', label: `Approved (${pendingRequests.filter(r => r.status === 'APPROVED').length})` },
              { key: 'REJECTED', label: `Rejected (${pendingRequests.filter(r => r.status === 'REJECTED').length})` },
            ].map(filter => {
              const isSelected = requestFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setRequestFilter(filter.key)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 20,
                    border: isSelected ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`,
                    background: isSelected ? 'rgba(15,118,110,0.12)' : C.card,
                    color: isSelected ? C.primary : C.textMuted,
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: C.textMuted }}>
              <RefreshCw size={32} className="spinning" style={{ margin: '0 auto 12px' }} />
              <p>Loading requests...</p>
            </div>
          ) : pendingRequests.filter(r => requestFilter === 'ALL' || r.status === requestFilter).length === 0 ? (
            <Card style={{ padding: 60, textAlign: 'center' }}>
              <Clock size={56} style={{ margin: '0 auto 16px', opacity: 0.2, color: C.textMuted }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: C.textMain }}>
                {requestFilter === 'ALL' ? 'No letter requests yet' : `No ${requestFilter.toLowerCase()} requests`}
              </h3>
              <p style={{ margin: 0, color: C.textMuted, fontSize: '0.85rem' }}>
                Employee submitted requests will appear here for review and official issuance
              </p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {pendingRequests
                .filter(r => requestFilter === 'ALL' || r.status === requestFilter)
                .map((req) => {
                  const statusColors = {
                    PENDING: { bg: '#FEF9C3', text: '#92400E', icon: Clock, label: 'PENDING' },
                    APPROVED: { bg: '#DCFCE7', text: '#166534', icon: CheckCircle, label: 'APPROVED' },
                    REJECTED: { bg: '#FEE2E2', text: '#991B1B', icon: XCircle, label: 'REJECTED' },
                  };
                  const statusInfo = statusColors[req.status] || statusColors.PENDING;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <Card key={req.uuid} hover style={{ padding: 22, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(15,118,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={26} color={C.primary} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: C.textMain }}>
                              {req.template_name || 'Letter'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.84rem', color: C.textMuted }}>
                              Requested by <strong>{req.employee_name || 'Employee'}</strong> ({req.mesob_id || 'ID'})
                            </p>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, background: statusInfo.bg, color: statusInfo.text, padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            <StatusIcon size={13} /> {statusInfo.label}
                          </span>
                        </div>
                        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(0,80,60,0.03)', borderRadius: 8, fontSize: '0.78rem', color: C.textSub, lineHeight: 1.5 }}>
                          <strong>Requested on:</strong> {req.requested_at ? new Date(req.requested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          {req.reviewed_by_name && (
                            <span style={{ marginLeft: 16 }}>
                              <strong>Reviewed by:</strong> {req.reviewed_by_name}
                            </span>
                          )}
                          {req.rejection_reason && (
                            <div style={{ marginTop: 6, color: '#991B1B' }}>
                              <strong>Reason:</strong> {req.rejection_reason}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {req.status === 'PENDING' ? (
                            <>
                              <GreenBtn onClick={() => handlePreviewRequest(req)} variant="secondary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                                <Eye size={14} /> Preview Content
                              </GreenBtn>
                              <GreenBtn onClick={() => handleApproveRequest(req.uuid)} disabled={approvingUuid === req.uuid} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                                <CheckCircle size={14} /> {approvingUuid === req.uuid ? 'Approving...' : 'Approve & Issue'}
                              </GreenBtn>
                              <GreenBtn onClick={() => handleRejectRequest(req.uuid)} variant="danger" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                                <XCircle size={14} /> Reject
                              </GreenBtn>
                            </>
                          ) : req.status === 'APPROVED' ? (
                            <>
                              <GreenBtn onClick={() => handlePreviewRequest(req)} variant="secondary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                                <Eye size={14} /> Preview
                              </GreenBtn>
                              <GreenBtn onClick={() => handleGenerateApprovedLetter(req)} disabled={approvingUuid === req.uuid} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                                <Download size={14} /> {approvingUuid === req.uuid ? 'Generating...' : 'Generate & Download PDF'}
                              </GreenBtn>
                            </>
                          ) : (
                            <GreenBtn onClick={() => handlePreviewRequest(req)} variant="secondary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                              <Eye size={14} /> Preview
                            </GreenBtn>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showTemplateModal && (
        <LetterTemplateModal
          template={editingTemplate}
          onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
          onSave={async (formData) => { 
            try {
              if (editingTemplate) {
                await LetterApi.updateEnhancedTemplate(editingTemplate.uuid, formData);
              } else {
                await LetterApi.createEnhancedTemplate(formData);
              }
              setShowTemplateModal(false); 
              setEditingTemplate(null); 
              loadData(); 
              showToast('Template saved successfully!');
            } catch (err) {
              throw err; // Let modal handle error display
            }
          }}
          placeholders={placeholders}
        />
      )}
      {showPDFTemplateModal && (
        <PDFTemplateModal
          onClose={() => setShowPDFTemplateModal(false)}
          onSave={() => { setShowPDFTemplateModal(false); loadData(); }}
          showToast={showToast}
        />
      )}
      {showGenerateModal && (
        <GenerateModal
          templates={templates}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={() => { loadData(); showToast('Letter generated and saved!'); }}
        />
      )}
      {previewLetter && <PreviewModal letter={previewLetter} onClose={() => setPreviewLetter(null)} />}
      
      {/* Template Preview Modal */}
      {previewTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,118,110,0.05)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>Template Preview</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: C.textMuted }}>
                  {previewTemplate.title || previewTemplate.name} - {previewTemplate.category || previewTemplate.type}
                </p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>
                <X size={20} />
              </button>
            </div>

            {/* Placeholder Notice Banner */}
            <div style={{ 
              padding: '12px 24px', 
              background: 'rgba(15,118,110,0.08)', 
              borderBottom: `1px solid rgba(15,118,110,0.15)`,
              display: 'flex',
              gap: 10,
              alignItems: 'center'
            }}>
              <AlertCircle size={16} color={C.primary} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: C.textMain, lineHeight: 1.5 }}>
                <strong>Preview Mode:</strong> This shows your template structure. Text like <code style={{ 
                  background: 'rgba(15,118,110,0.15)', 
                  padding: '2px 6px', 
                  borderRadius: 4, 
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>{'{{employee_name}}'}</code> are placeholders that will be replaced with real employee data when generating actual letters.
              </p>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {previewLoading ? (
                <div style={{ padding: 60, textAlign: 'center', color: C.textMuted }}>
                  <RefreshCw size={32} className="spinning" style={{ margin: '0 auto 12px' }} />
                  <p>Loading preview...</p>
                </div>
              ) : previewHTML ? (
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div dangerouslySetInnerHTML={{ __html: previewHTML }} style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.9, color: C.textMain }} />
                </div>
              ) : (
                <div style={{ padding: 60, textAlign: 'center', color: C.textMuted }}>
                  <AlertCircle size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p>Failed to load preview</p>
                </div>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <GreenBtn onClick={() => setPreviewTemplate(null)}>Close</GreenBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LettersPage;
