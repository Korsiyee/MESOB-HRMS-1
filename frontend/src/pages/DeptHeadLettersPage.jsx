import React, { useState, useEffect, useCallback } from "react";
import { LetterApi } from "../api/letterApi";
import { FileText, Eye, X, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

const IconBtn = ({ children, onClick, color = C.primary }) => (
  <button onClick={onClick} style={{
    background: 'none', border: 'none', cursor: 'pointer', color, padding: '4px 8px',
    borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Poppins, sans-serif', transition: 'color 0.15s',
  }}>{children}</button>
);

const PreviewModal = ({ letter, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: `1px solid ${C.cardBorder}` }}>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textMain }}>{letter.name}</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: C.textMuted }}>
            Issued: {new Date(letter.issued_at || letter.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}><X size={20} /></button>
      </div>
      <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.9, color: C.textMain, margin: 0 }}>
          {letter.generated_content || 'No content available.'}
        </pre>
      </div>
    </div>
  </div>
);

const DeptHeadLettersPage = () => {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewLetter, setPreviewLetter] = useState(null);

  // Check if user has employee_uuid
  if (!user?.employee_uuid) {
    return (
      <div style={{ fontFamily: 'Poppins, sans-serif', padding: 20 }}>
        <Card>
          <div style={{ padding: 40, textAlign: 'center' }}>
            <FileText size={48} color="#DC2626" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: C.textMain }}>Employee Profile Not Found</h3>
            <p style={{ margin: '12px 0 0', color: C.textMuted, fontSize: '0.9rem' }}>
              Your employee profile is not properly configured. Please contact your administrator.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const loadLetters = useCallback(async () => {
    if (!user?.employee_uuid) {
      setLoading(false);
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await LetterApi.listIssuedLetters(user.employee_uuid);
      setLetters(res?.data || []);
    } catch (err) {
      console.error('Failed to load letters:', err);
      setError(err.message || 'Failed to load letters. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadLetters(); }, [loadLetters]);

  const TH = { padding: '11px 16px', textAlign: 'left', fontSize: '0.68rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, background: 'rgba(0,80,60,0.05)', borderBottom: `1px solid ${C.border}`, fontFamily: 'Poppins, sans-serif' };
  const TD = { padding: '13px 16px', fontSize: '0.8rem', color: C.textMain, borderBottom: `1px solid rgba(0,80,60,0.07)`, fontFamily: 'Poppins, sans-serif' };

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ background: C.headerBg, borderRadius: 14, padding: '20px 26px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#E8F0EE' }}>My Letters</h1>
          <p style={{ margin: '3px 0 0', color: 'rgba(232,240,238,0.6)', fontSize: '0.75rem' }}>View and download your employment letters</p>
        </div>
        <button onClick={loadLetters} disabled={loading} style={{
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

      <Card style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Letter Name', 'Type', 'Date Issued', 'Actions'].map((h, i) => (
                <th key={h} style={{ ...TH, textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', padding: 48, color: C.textMuted }}>Loading your letters...</td></tr>
            ) : letters.length === 0 ? (
              <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', padding: 48, color: C.textMuted }}>
                <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>No letters have been issued to you yet.</p>
              </td></tr>
            ) : letters.map((letter, i) => (
              <tr key={letter.uuid} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,80,60,0.02)' }}>
                <td style={{ ...TD, fontWeight: 600 }}><FileText size={14} style={{ display: 'inline', marginRight: 8 }} />{letter.name}</td>
                <td style={TD}>
                  <span style={{ background: 'rgba(15,118,110,0.1)', color: C.primary, padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>{letter.type}</span>
                </td>
                <td style={{ ...TD, color: C.textSub }}>
                  {new Date(letter.issued_at || letter.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <IconBtn onClick={() => setPreviewLetter(letter)}><Eye size={14} /> View</IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {previewLetter && <PreviewModal letter={previewLetter} onClose={() => setPreviewLetter(null)} />}
    </div>
  );
};

export default DeptHeadLettersPage;
