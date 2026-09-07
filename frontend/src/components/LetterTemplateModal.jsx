import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const C = {
  primary: '#0F766E', primaryHov: '#14B8A6', textMain: '#1A2E2B',
  textSub: '#1E4A42', textMuted: '#2E6058', border: 'rgba(0,80,60,0.12)',
  card: '#EEF1F0',
};

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

/**
 * Letter Template Modal with Rich Text Editing
 * Official letter format with structured sections
 */
const LetterTemplateModal = ({ template, onClose, onSave, placeholders = [] }) => {
  const [form, setForm] = useState({
    title: '',
    category: LETTER_CATEGORIES[0].value,
    description: '',
    // Official format fields (rich text HTML)
    recipient_info: '',
    subject: '',
    main_body: '',
    closing_text: '',
    cc_recipients: '',
  });

  const [saving, setSaving] = useState(false);
  const [showFormatInfo, setShowFormatInfo] = useState(false);

  useEffect(() => {
    if (template) {
      setForm({
        title: template.title || template.name || '',
        category: template.category || LETTER_CATEGORIES[0].value,
        description: template.description || '',
        // Official format fields
        recipient_info: template.recipient_info || '',
        subject: template.subject || '',
        main_body: template.main_body || '',
        closing_text: template.closing_text || '',
        cc_recipients: template.cc_recipients || '',
      });
    }
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (placeholder, field = 'main_body') => {
    setForm(p => ({ ...p, [field]: (p[field] || '') + ' ' + placeholder }));
  };

  const fieldStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
    fontSize: '0.85rem', color: C.textMain, background: '#fff', outline: 'none',
    fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.textSub,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em'
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      overflowY: 'auto'
    }}>
      <div style={{ 
        background: C.card, borderRadius: 14, width: '100%', maxWidth: 900, 
        maxHeight: '95vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        margin: '20px auto'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', borderBottom: `2px solid ${C.border}`, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          background: C.card, position: 'sticky', top: 0, zIndex: 10
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>
              {template ? 'Edit Template' : 'Create Letter Template'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.textMuted }}>
              📋 Official Format with Structured Sections
            </p>
          </div>
          <button onClick={onClose} style={{ 
            background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted 
          }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Basic Info */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Template Name *</label>
            <input
              style={fieldStyle}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Standard Employment Verification"
              required
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Category *</label>
              <select
                style={{ ...fieldStyle, cursor: 'pointer' }}
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                required
              >
                {LETTER_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description (Optional)</label>
            <textarea
              style={{ ...fieldStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: '60px' }}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of when to use this template"
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Format Information Banner */}
          <div style={{ 
            padding: '12px 16px', background: 'rgba(15,118,110,0.08)', borderRadius: 8, 
            marginBottom: 20, border: `1px solid rgba(15,118,110,0.15)`,
            display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <Info size={18} color={C.primary} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.8rem', color: C.primary, display: 'block', marginBottom: 4 }}>
                Official Letter Format
              </strong>
              <p style={{ margin: 0, fontSize: '0.75rem', color: C.textMain, lineHeight: 1.5 }}>
                Structured sections matching official letter standards: Recipient Info, Subject, Main Body, Closing Text, and CC Recipients. Header (logo, ref, date) and footer are automatically added.
              </p>
            </div>
          </div>

          {/* Official Format Fields */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Recipient Information <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMuted }}>(Top-left)</span>
            </label>
            <RichTextEditor
              value={form.recipient_info}
              onChange={(html) => setForm(p => ({ ...p, recipient_info: html }))}
              placeholder="Example:&#10;በገቢዎች ሚኒስቴር&#10;ለመካከለኛ ቁጥር 1 ግብር ከፋዮች ቅ/ጽ/ቤት&#10;አዲስ አበባ"
              minHeight="100px"
            />
            <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: C.textMuted }}>
              Organization name, department/office, city, etc.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Subject * <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMuted }}>(Bold, separated)</span>
            </label>
            <RichTextEditor
              value={form.subject}
              onChange={(html) => setForm(p => ({ ...p, subject: html }))}
              placeholder="Letter subject line"
              minHeight="80px"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Main Body * <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMuted }}>(Center content)</span>
            </label>
            <RichTextEditor
              value={form.main_body}
              onChange={(html) => setForm(p => ({ ...p, main_body: html }))}
              placeholder="Main letter content. Use placeholders like {{employee_name}}, {{position}}, {{department}}, etc."
              minHeight="200px"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Closing Text <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMuted }}>(Bottom-right)</span>
            </label>
            <RichTextEditor
              value={form.closing_text}
              onChange={(html) => setForm(p => ({ ...p, closing_text: html }))}
              placeholder="Example:&#10;ከሰላምታ ጋር&#10;Sincerely,"
              minHeight="100px"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Copy Recipients (CC) <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMuted }}>(Left side above footer)</span>
            </label>
            <RichTextEditor
              value={form.cc_recipients}
              onChange={(html) => setForm(p => ({ ...p, cc_recipients: html }))}
              placeholder="Example:&#10;ለአቶ ብሩክ ዉብሽት&#10;ለፋይናንስ ዳይሬክቶሬት"
              minHeight="100px"
            />
          </div>

          {/* Placeholder Helper */}
          <div style={{ 
            padding: '12px 16px', background: 'rgba(15,118,110,0.08)', borderRadius: 8, 
            marginBottom: 20, border: `1px solid rgba(15,118,110,0.15)` 
          }}>
            <strong style={{ fontSize: '0.75rem', color: C.primary }}>Available Placeholders:</strong>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(placeholders.length > 0 ? placeholders.map(p => p.placeholder_key) : PLACEHOLDER_HINTS).map(p => (
                <code
                  key={p}
                  onClick={() => insertPlaceholder(p, 'main_body')}
                  style={{
                    background: 'rgba(15,118,110,0.15)', padding: '3px 8px', borderRadius: 6,
                    fontSize: '0.7rem', fontFamily: 'monospace', color: C.primary, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,118,110,0.15)'}
                >
                  {p}
                </code>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: C.textMuted }}>
              💡 Header (Ref No, Date, Logo) and Footer (Contact Info) are automatically added to all letters
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10 }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                background: 'rgba(15,118,110,0.1)', color: C.primary, border: 'none', borderRadius: 8,
                padding: '9px 18px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              style={{
                background: saving ? '#8AADA6' : C.primary, color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 18px', fontSize: '0.78rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LetterTemplateModal;


