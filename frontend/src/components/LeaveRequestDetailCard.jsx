import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ui/ConfirmDialog';

/**
 * Comprehensive Leave Request Detail Card Component
 * Displays all details including planned days and documents with preview
 */
const LeaveRequestDetailCard = ({ 
  request, 
  showEmployeeInfo = false,
  colorScheme = {
    primary: '#00503C',
    card: '#FFFFFF',
    border: '#E5E7EB',
    textMain: '#1F2937',
    textSub: '#6B7280',
    textMuted: '#9CA3AF',
  }
}) => {
  const [imagePreview, setImagePreview] = useState(null);
  const [downloading, setDownloading] = useState({});
  const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
  const C = colorScheme;

  if (!request) return null;

  // Format date helper
  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Get day type label
  const getDayType = () => {
    if (request.dayPattern === 'FULL_DAY') return 'Full Day';
    if (request.dayPattern === 'HALF_DAY') return 'Half Day';
    if (request.dayPattern === 'MIXED') return 'Mixed (Full & Half Days)';
    return '—';
  };

  // Check if file is an image
  const isImageFile = (filename) => {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename || '');
  };

  // Check if file is PDF
  const isPdfFile = (filename) => {
    return /\.pdf$/i.test(filename || '');
  };

  // Get document preview URL (for authenticated requests)
  const getDocumentUrl = (doc) => {
    if (doc.uuid && request.uuid) {
      return `/api/requests/${request.uuid}/documents/${doc.uuid}/content`;
    }
    return null;
  };

  // Download document with authentication
  const downloadDocument = async (doc) => {
    if (!doc.uuid || !request.uuid) return;
    
    setDownloading(prev => ({ ...prev, [doc.uuid]: true }));
    
    try {
      const token = localStorage.getItem('authToken');
      const url = `/api/requests/${request.uuid}/documents/${doc.uuid}/content`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.originalName || doc.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      setErrorDialog({ open: true, message: 'Failed to download document. Please try again.' });
    } finally {
      setDownloading(prev => ({ ...prev, [doc.uuid]: false }));
    }
  };

  // Preview image with authentication
  const previewImage = async (doc) => {
    if (!doc.uuid || !request.uuid) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const url = `/api/requests/${request.uuid}/documents/${doc.uuid}/content`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load image');
      }

      const blob = await response.blob();
      const imageUrl = window.URL.createObjectURL(blob);
      setImagePreview(imageUrl);
    } catch (error) {
      console.error('Preview error:', error);
      setErrorDialog({ open: true, message: 'Failed to preview image. Please try again.' });
    }
  };

  // Close preview and cleanup
  const closePreview = () => {
    if (imagePreview) {
      window.URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 12, 
        marginBottom: 24 
      }}>
        <div style={{
          background: C.primary,
          borderRadius: 10,
          padding: '16px 18px',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(0,80,60,0.2)',
        }}>
          <div style={{ 
            fontSize: '0.68rem', 
            fontWeight: 600, 
            opacity: 0.8, 
            marginBottom: 6, 
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Leave Type
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {request.leaveType || '—'}
          </div>
        </div>

        <div style={{
          background: C.card,
          borderRadius: 10,
          padding: '16px 18px',
          border: `1px solid ${C.border}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ 
            fontSize: '0.68rem', 
            fontWeight: 600, 
            color: C.textMuted, 
            marginBottom: 6, 
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Duration
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: C.primary }}>
            {request.total_days ?? request.numberOfDays ?? '—'} Days
          </div>
        </div>

        <div style={{
          background: C.card,
          borderRadius: 10,
          padding: '16px 18px',
          border: `1px solid ${C.border}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ 
            fontSize: '0.68rem', 
            fontWeight: 600, 
            color: C.textMuted, 
            marginBottom: 6, 
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Status
          </div>
          <div style={{ marginTop: 6 }}>
            <StatusBadge status={request.status} />
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <div style={{
        background: 'rgba(0,80,60,0.03)',
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '18px 20px',
        marginBottom: 20,
      }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: C.textSub,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Request Information
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px 24px' 
        }}>
          {showEmployeeInfo && (request.full_name || request.employee_uuid) && (
            <div>
              <div style={{ 
                fontSize: '0.68rem', 
                fontWeight: 600, 
                color: C.textMuted, 
                marginBottom: 4, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                Employee
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textMain }}>
                {request.full_name || request.employee_uuid}
              </div>
            </div>
          )}
          {request.budgetYear && (
            <div>
              <div style={{ 
                fontSize: '0.68rem', 
                fontWeight: 600, 
                color: C.textMuted, 
                marginBottom: 4, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}>
                Budget Year
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textMain }}>
                {request.budgetYear}
              </div>
            </div>
          )}
          <div>
            <div style={{ 
              fontSize: '0.68rem', 
              fontWeight: 600, 
              color: C.textMuted, 
              marginBottom: 4, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Start Date
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textMain }}>
              {fmtDate(request.startDate)}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '0.68rem', 
              fontWeight: 600, 
              color: C.textMuted, 
              marginBottom: 4, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              End Date
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textMain }}>
              {fmtDate(request.endDate)}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '0.68rem', 
              fontWeight: 600, 
              color: C.textMuted, 
              marginBottom: 4, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Day Type
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textMain }}>
              {getDayType()}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '0.68rem', 
              fontWeight: 600, 
              color: C.textMuted, 
              marginBottom: 4, 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Submitted
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textMain }}>
              {fmtDate(request.created_at || request.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Planned Leave Days Section - MUST HAVE */}
      {request.dailyPlan && Array.isArray(request.dailyPlan) && request.dailyPlan.length > 0 && (
        <div style={{
          background: '#F0FDFA',
          border: '1px solid #99F6E4',
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 20,
        }}>
          <h4 style={{
            margin: '0 0 14px 0',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#115E59',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            📅 Planned Leave Days ({request.dailyPlan.length} {request.dailyPlan.length === 1 ? 'day' : 'days'})
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10,
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: 4,
          }}>
            {request.dailyPlan.map((day, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #99F6E4',
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1F2937' }}>
                  {fmtDate(day.date)}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: day.portion === 'HALF' ? '#F59E0B' : '#10B981',
                    background: day.portion === 'HALF' ? '#FEF3C7' : '#D1FAE5',
                    padding: '4px 10px',
                    borderRadius: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {day.portion === 'HALF' ? '🌗 HALF' : '⚪ FULL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reason Section */}
      {request.reason && (
        <div style={{
          background: 'rgba(0,80,60,0.03)',
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 20,
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: C.textSub,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Reason
          </h4>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: C.textMain,
            whiteSpace: 'pre-wrap',
          }}>
            {request.reason}
          </p>
        </div>
      )}

      {/* Rejection Reason */}
      {request.rejectionReason && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 10,
          padding: '18px 20px',
          marginBottom: 20,
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#991B1B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            ❌ Rejection Reason
          </h4>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: '#991B1B',
            whiteSpace: 'pre-wrap',
          }}>
            {request.rejectionReason}
          </p>
        </div>
      )}

      {/* Supporting Documents Section with Preview - MUST HAVE */}
      {request.documents && Array.isArray(request.documents) && request.documents.length > 0 && (
        <div style={{
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          padding: '18px 20px',
        }}>
          <h4 style={{
            margin: '0 0 14px 0',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            📎 Supporting Documents ({request.documents.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {request.documents.map((doc, idx) => {
              const isImage = isImageFile(doc.originalName || doc.name);
              const isPdf = isPdfFile(doc.originalName || doc.name);
              const docUrl = getDocumentUrl(doc);
              
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '14px 16px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: isImage ? '#DBEAFE' : isPdf ? '#FEE2E2' : '#E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: isImage ? '#1E40AF' : isPdf ? '#991B1B' : '#6B7280',
                          flexShrink: 0,
                        }}
                      >
                        {isImage ? '🖼️' : isPdf ? '📄' : '📋'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: '#1F2937',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {doc.originalName || doc.name || `Document ${idx + 1}`}
                        </div>
                        {doc.sizeBytes && (
                          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>
                            {(doc.sizeBytes / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                    {docUrl && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {isImage && (
                          <button
                            onClick={() => previewImage(doc)}
                            disabled={downloading[doc.uuid]}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: downloading[doc.uuid] ? '#9CA3AF' : '#7C3AED',
                              background: 'transparent',
                              padding: '6px 14px',
                              borderRadius: 6,
                              border: `1.5px solid ${downloading[doc.uuid] ? '#9CA3AF' : '#7C3AED'}`,
                              cursor: downloading[doc.uuid] ? 'wait' : 'pointer',
                              transition: 'all 0.15s',
                              whiteSpace: 'nowrap',
                              opacity: downloading[doc.uuid] ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (!downloading[doc.uuid]) {
                                e.currentTarget.style.background = '#7C3AED';
                                e.currentTarget.style.color = '#fff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!downloading[doc.uuid]) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#7C3AED';
                              }
                            }}
                          >
                            {downloading[doc.uuid] ? '⏳ Loading...' : '🔍 Preview'}
                          </button>
                        )}
                        <button
                          onClick={() => downloadDocument(doc)}
                          disabled={downloading[doc.uuid]}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: downloading[doc.uuid] ? '#9CA3AF' : C.primary,
                            textDecoration: 'none',
                            background: 'transparent',
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: `1.5px solid ${downloading[doc.uuid] ? '#9CA3AF' : C.primary}`,
                            cursor: downloading[doc.uuid] ? 'wait' : 'pointer',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                            opacity: downloading[doc.uuid] ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!downloading[doc.uuid]) {
                              e.currentTarget.style.background = C.primary;
                              e.currentTarget.style.color = '#fff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!downloading[doc.uuid]) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = C.primary;
                            }
                          }}
                        >
                          {downloading[doc.uuid] ? '⏳ Loading...' : '⬇️ Download'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
          }}
          onClick={closePreview}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePreview}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.9)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
            <img
              src={imagePreview}
              alt="Document preview"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'block',
              }}
            />
          </div>
        </div>
      )}

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
    </div>
  );
};

export default LeaveRequestDetailCard;
