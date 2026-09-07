import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import PDFViewer from './PDFViewer';
import { LetterApi } from '../api/letterApi';

const C = {
  card: '#EEF1F0',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  border: 'rgba(0,80,60,0.12)',
};

const LETTER_TYPES = [
  "Employment Verification",
  "Experience Letter",
  "Salary Confirmation",
  "Transfer Letter",
  "Promotion Letter",
  "Warning Letter",
];

const PDFTemplateModal = ({ onClose, onSave, showToast }) => {
  const [step, setStep] = useState(1); // 1: Upload PDF, 2: Add Text Content
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: LETTER_TYPES[0],
    text_content: '',
  });
  const [placeholders, setPlaceholders] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Load available placeholders
    LetterApi.getPlaceholders()
      .then(res => setPlaceholders(res.data || []))
      .catch(err => console.error('Failed to load placeholders:', err));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfPreview(URL.createObjectURL(file));
      setStep(2); // Move to text content step
    } else {
      showToast('Please select a valid PDF file.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pdfFile) {
      showToast('Please upload a PDF file.', 'error');
      return;
    }

    if (!form.text_content.trim()) {
      showToast('Please add text content with placeholders.', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('name', form.name);
      formData.append('type', form.type);
      formData.append('text_content', form.text_content);

      await LetterApi.createTemplateWithPDF(formData);
      showToast('PDF template created successfully!');
      onSave();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to create template.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const insertPlaceholder = (placeholder) => {
    setForm(prev => ({
      ...prev,
      text_content: prev.text_content + ' ' + placeholder
    }));
  };

  const fieldStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    fontSize: '0.85rem',
    color: C.textMain,
    background: '#fff',
    outline: 'none',
    fontFamily: 'Poppins, sans-serif',
    transition: 'all 0.2s',
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: C.card,
        borderRadius: 14,
        width: '100%',
        maxWidth: step === 2 ? 1000 : 600,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        animation: 'scaleIn 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `2px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15,118,110,0.05)',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>
              Create PDF Letter Template
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.textMuted }}>
              Step {step} of 2: {step === 1 ? 'Upload PDF' : 'Add Text Content'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: C.textMuted,
          }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Step 1: Upload PDF */}
          {step === 1 && (
            <div>
              <label style={{
                display: 'block',
                padding: '40px',
                border: `2px dashed ${C.border}`,
                borderRadius: 12,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#fff',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.primary;
                  e.currentTarget.style.backgroundColor = 'rgba(15,118,110,0.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                <Upload size={48} style={{ margin: '0 auto 16px', color: C.primary, opacity: 0.5 }} />
                <p style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600, color: C.textMain }}>
                  Click to upload PDF template
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: C.textMuted }}>
                  Upload a pre-designed PDF with company letterhead
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              <div style={{
                marginTop: 20,
                padding: '12px 16px',
                background: 'rgba(15,118,110,0.08)',
                borderRadius: 8,
                border: `1px solid rgba(15,118,110,0.15)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={16} style={{ color: C.primary, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.75rem', color: C.primary }}>Note:</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.textSub, lineHeight: 1.5 }}>
                      Upload a PDF with your company letterhead. In the next step, you'll add the text content with placeholders for employee data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Add Text Content */}
          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left: PDF Preview */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: C.textSub,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  PDF Preview
                </label>
                {pdfPreview && <PDFViewer file={pdfPreview} width={400} />}
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setPdfFile(null);
                    setPdfPreview(null);
                  }}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: 'transparent',
                    color: C.textSub,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  ← Change PDF
                </button>
              </div>

              {/* Right: Form Fields */}
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: C.textSub,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Template Name *
                  </label>
                  <input
                    style={fieldStyle}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Standard Employment Letter"
                    required
                    onFocus={e => e.target.style.borderColor = C.primary}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: C.textSub,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Letter Type
                  </label>
                  <select
                    style={{ ...fieldStyle, cursor: 'pointer' }}
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  >
                    {LETTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: C.textSub,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Text Content *
                  </label>
                  <textarea
                    value={form.text_content}
                    onChange={e => setForm(p => ({ ...p, text_content: e.target.value }))}
                    rows={8}
                    required
                    placeholder="Dear Sir/Madam,&#10;&#10;This is to certify that {{employee_name}} works as {{position}} in the {{department}} department..."
                    style={{
                      ...fieldStyle,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      resize: 'vertical',
                    }}
                    onFocus={e => e.target.style.borderColor = C.primary}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>

                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(15,118,110,0.08)',
                  borderRadius: 8,
                  border: `1px solid rgba(15,118,110,0.15)`,
                }}>
                  <strong style={{ fontSize: '0.75rem', color: C.primary }}>
                    Available Placeholders:
                  </strong>
                  <div style={{
                    marginTop: 8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}>
                    {placeholders.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => insertPlaceholder(p.key)}
                        title={p.description}
                        style={{
                          background: 'rgba(15,118,110,0.15)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: `1px solid rgba(15,118,110,0.25)`,
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          color: C.primary,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(15,118,110,0.25)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(15,118,110,0.15)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          {step === 2 && (
            <div style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              marginTop: 24,
              paddingTop: 20,
              borderTop: `1px solid ${C.border}`,
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: 'transparent',
                  color: C.textSub,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: uploading ? '#8AADA6' : C.primary,
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => !uploading && (e.currentTarget.style.background = C.primaryHov)}
                onMouseLeave={e => !uploading && (e.currentTarget.style.background = C.primary)}
              >
                {uploading ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          )}
        </form>
      </div>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
};

export default PDFTemplateModal;
