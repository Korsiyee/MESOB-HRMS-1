import React, { useState, useEffect, useCallback } from "react";
import { LetterApi } from "../api/letterApi";
import { FileText, Eye, X, RefreshCw, Send, XCircle, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

const C = {
  page: '#C5CECC', card: '#EEF1F0', cardBorder: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', primaryHov: '#14B8A6', textMain: '#1A2E2B',
  textSub: '#1E4A42', textMuted: '#2E6058', border: 'rgba(0,80,60,0.12)',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`, boxShadow: C.shadow, ...style }}>
    {children}
  </div>
);

const GreenBtn = ({ children, onClick, disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? '#8AADA6' : C.primary, color: '#fff', border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: '0.78rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'Poppins, sans-serif',
    transition: 'background 0.15s', ...style,
  }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.primaryHov; }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = C.primary; }}
  >{children}</button>
);

const IconBtn = ({ children, onClick, color = C.primary, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? C.textMuted : color, padding: '4px 8px', borderRadius: 6,
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600,
    fontFamily: 'Poppins, sans-serif', opacity: disabled ? 0.5 : 1, transition: 'color 0.15s',
  }}>{children}</button>
);

const PreviewModal = ({ letter, onClose, onSubmit, isRequest = false, submitting = false }) => {
  const dialog = useDialog();
  const [downloading, setDownloading] = React.useState(false);

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: `1px solid ${C.cardBorder}` }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textMain }}>
              {letter.template_name || letter.name}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: C.textMuted }}>
              {isRequest ? 'Preview your letter before submitting' : 
               `Issued: ${new Date(letter.issued_at || letter.requested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, background: '#fff' }}>
          {letter.html_content ? (
            <div dangerouslySetInnerHTML={{ __html: letter.html_content }} style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.9, color: C.textMain }} />
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.9, color: C.textMain, margin: 0 }}>
              {letter.generated_content || 'No content available.'}
            </pre>
          )}
        </div>
        {isRequest && onSubmit ? (
          <div style={{ padding: '18px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSub, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              Cancel
            </button>
            <GreenBtn onClick={onSubmit} disabled={submitting}>
              <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Request'}
            </GreenBtn>
          </div>
        ) : (
          letter.status === 'APPROVED' && letter.template_uuid && letter.employee_uuid && (
            <div style={{ padding: '18px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GreenBtn onClick={handleDownload} disabled={downloading}>
                <Eye size={14} /> {downloading ? 'Downloading...' : 'Download PDF'}
              </GreenBtn>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const MyLettersPage = () => {
  const { user } = useAuth();
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewLetter, setPreviewLetter] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [templatesRes, requestsRes] = await Promise.all([
        LetterApi.listTemplates(),
        LetterApi.getMyLetterRequests(),
      ]);
      setTemplates(templatesRes?.data || []);
      setMyRequests(requestsRes?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRequestLetter = async (template) => {
    // Only generate preview, do NOT create request yet
    setRequesting(true);
    try {
      const previewData = await LetterApi.previewEnhancedLetter({
        template_uuid: template.uuid,
        employee_uuid: user?.employee_uuid,
        ref_no: '' // Will be auto-generated on actual submission
      });
      
      setPreviewLetter({
        template_name: template.name || template.title,
        template_uuid: template.uuid,
        html_content: previewData.data.html_content,
        isRequest: true
      });
    } catch (err) {
      setError(err.message || 'Failed to generate preview.');
    } finally {
      setRequesting(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!previewLetter || !previewLetter.template_uuid) {
      setError('Invalid template selection');
      return;
    }

    setRequesting(true);
    try {
      // NOW create the actual request
      await LetterApi.requestLetter(previewLetter.template_uuid);
      setPreviewLetter(null);
      await loadData();
      dialog.showSuccess('Letter request submitted successfully!');
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setRequesting(false);
    }
  };

  const handleViewRequest = async (req) => {
    try {
      if (!req.template_uuid) {
        setError('Template information missing. Cannot load preview.');
        return;
      }

      const employeeUuidToUse = req.employee_uuid || user?.employee_uuid;
      if (!employeeUuidToUse) {
        setError('Employee information missing. Cannot load preview.');
        return;
      }

      const previewData = await LetterApi.previewEnhancedLetter({
        template_uuid: req.template_uuid,
        employee_uuid: employeeUuidToUse,
        ref_no: req.ref_no || ''
      });
      
      setPreviewLetter({
        ...req,
        html_content: previewData.data.html_content,
        template_uuid: req.template_uuid,
        employee_uuid: employeeUuidToUse,
        isRequest: false
      });
    } catch (err) {
      setError('Failed to load preview: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelRequest = async (uuid) => {
    dialog.showConfirm(
      'Are you sure you want to cancel this letter request?',
      async () => {
        try {
          await LetterApi.cancelLetterRequest(uuid);
          await loadData();
          dialog.showSuccess('Letter request cancelled successfully');
        } catch (err) {
          setError(err.message || 'Failed to cancel request.');
        }
      },
      {
        title: 'Cancel Letter Request',
        confirmText: 'Yes, Cancel',
        cancelText: 'No, Keep It',
      }
    );
  };

  const pendingCount = myRequests.filter(r => r.status === 'PENDING').length;

  const TH = { padding: '11px 16px', textAlign: 'left', fontSize: '0.68rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, background: 'rgba(0,80,60,0.05)', borderBottom: `1px solid ${C.border}`, fontFamily: 'Poppins, sans-serif' };
  const TD = { padding: '13px 16px', fontSize: '0.8rem', color: C.textMain, borderBottom: `1px solid rgba(0,80,60,0.07)`, fontFamily: 'Poppins, sans-serif' };

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ background: C.headerBg, borderRadius: 14, padding: '20px 26px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#E8F0EE' }}>My Letters</h1>
          <p style={{ margin: '3px 0 0', color: 'rgba(232,240,238,0.6)', fontSize: '0.75rem' }}>Request new letters or view your submitted requests</p>
        </div>
        <button onClick={loadData} disabled={loading} style={{
          background: 'rgba(255,255,255,0.12)', color: '#E8F0EE', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8, padding: '9px 16px', fontSize: '0.78rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'Poppins, sans-serif', transition: 'background 0.15s',
        }}>
          <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <Card style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex' }}>
          {[
            ['templates', 'Available Templates'],
            ['requests', `My Requests ${pendingCount > 0 ? `(${pendingCount})` : ''}`],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: '14px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === key ? `2.5px solid ${C.primary}` : '2.5px solid transparent',
              color: activeTab === key ? C.primary : C.textMuted,
              fontWeight: activeTab === key ? 700 : 500, fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: 'Poppins, sans-serif', transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>
      </Card>

      {/* Available Templates Tab */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: C.textMuted }}>Loading templates...</div>
          ) : templates.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: C.textMuted, background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}` }}>
              No letter templates available yet.
            </div>
          ) : templates.map(tpl => (
            <Card key={tpl.uuid} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,60,45,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = C.shadow; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(15,118,110,0.1)', color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>{tpl.name}</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: C.textMuted, lineHeight: 1.5 }}>
                  {tpl.description || tpl.type || 'Letter template'}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(15,118,110,0.1)', color: C.primary, padding: '3px 10px', borderRadius: 20 }}>
                  {tpl.type}
                </span>
                <GreenBtn onClick={() => handleRequestLetter(tpl)} disabled={requesting} style={{ fontSize: '0.72rem', padding: '7px 14px' }}>
                  <Send size={12} /> Request
                </GreenBtn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* My Requests Tab */}
      {activeTab === 'requests' && (
        <Card style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Template', 'Status', 'Requested', 'Actions'].map((h, i) => (
                  <th key={h} style={{ ...TH, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', padding: 48, color: C.textMuted }}>Loading requests...</td></tr>
              ) : myRequests.length === 0 ? (
                <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', padding: 48, color: C.textMuted }}>
                  <Clock size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>No letter requests yet. Request a letter from the Available Templates tab.</p>
                </td></tr>
              ) : myRequests.map((req, i) => {
                const statusColors = {
                  PENDING: { bg: '#FEF9C3', text: '#92400E', icon: Clock },
                  APPROVED: { bg: '#DCFCE7', text: '#166534', icon: CheckCircle },
                  REJECTED: { bg: '#FEE2E2', text: '#991B1B', icon: XCircle },
                };
                const sc = statusColors[req.status] || statusColors.PENDING;
                const StatusIcon = sc.icon;
                
                return (
                  <tr key={req.uuid} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,80,60,0.02)' }}>
                    <td style={{ ...TD, fontWeight: 600 }}>
                      <FileText size={14} style={{ display: 'inline', marginRight: 8 }} />
                      {req.template_name}
                    </td>
                    <td style={TD}>
                      <span style={{ background: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <StatusIcon size={12} /> {req.status}
                      </span>
                    </td>
                    <td style={{ ...TD, color: C.textSub }}>
                      {new Date(req.requested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <IconBtn onClick={() => handleViewRequest(req)}><Eye size={14} /> View</IconBtn>
                      {req.status === 'PENDING' && (
                        <IconBtn onClick={() => handleCancelRequest(req.uuid)} color="#DC2626"><XCircle size={14} /> Cancel</IconBtn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {previewLetter && (
        <PreviewModal
          letter={previewLetter}
          onClose={() => setPreviewLetter(null)}
          onSubmit={previewLetter.isRequest ? handleSubmitRequest : null}
          isRequest={previewLetter.isRequest}
          submitting={requesting}
        />
      )}
    </div>
  );
};

export default MyLettersPage;
