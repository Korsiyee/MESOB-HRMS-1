import React, { useState, useEffect } from 'react';
import { Camera, Check, X, AlertCircle, Trash2 } from 'lucide-react';
import FaceCaptureModal from './FaceCaptureModal';
import { FaceRecognitionApi } from '../api/faceRecognitionApi';

const C = {
  card: '#EEF1F0',
  border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
};

/**
 * Employee Face Registration Component
 * Used in employee profile or management pages
 * Shows registration status and allows registration/deletion
 */
const EmployeeFaceRegistration = ({ employeeUuid, employeeName, isHR = false, onUpdate }) => {
  const [status, setStatus] = useState({ registered: false, loading: true });
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [employeeUuid]);

  const loadStatus = async () => {
    try {
      setStatus({ registered: false, loading: true });
      const result = await FaceRecognitionApi.getFaceRegistrationStatus(employeeUuid);
      setStatus({ registered: result.data.registered, loading: false });
    } catch (err) {
      console.error('Failed to load face registration status:', err);
      setStatus({ registered: false, loading: false });
    }
  };

  const handleComplete = async (images, descriptors, uuid) => {
    setError('');
    setSuccess('');
    
    try {
      await FaceRecognitionApi.registerFaceImages(uuid, images, descriptors);
      setSuccess('Face images registered successfully!');
      setShowModal(false);
      loadStatus();
      
      if (onUpdate) {
        onUpdate();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Face registration error:', err);
      setError(err.message || 'Failed to register face images. Please try again.');
      setShowModal(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the registered face images? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      await FaceRecognitionApi.deleteFaceImages(employeeUuid);
      setSuccess('Face images deleted successfully.');
      loadStatus();
      
      if (onUpdate) {
        onUpdate();
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete face images.');
    } finally {
      setDeleting(false);
    }
  };

  if (status.loading) {
    return (
      <div style={{ 
        background: C.card, 
        borderRadius: 12, 
        border: `1px solid ${C.border}`, 
        padding: 20,
        boxShadow: C.shadow 
      }}>
        <div style={{ fontSize: '0.85rem', color: C.textMuted, textAlign: 'center' }}>
          Loading face registration status...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: C.card, 
      borderRadius: 12, 
      border: `1px solid ${C.border}`, 
      padding: 20,
      boxShadow: C.shadow 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${C.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={18} color={C.primary} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>
            Face Recognition
          </h3>
        </div>
        
        {/* Status Badge */}
        {status.registered ? (
          <span style={{
            background: 'rgba(5,150,105,0.1)',
            color: '#059669',
            padding: '4px 12px',
            borderRadius: 99,
            fontSize: '0.7rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <Check size={12} />
            Registered
          </span>
        ) : (
          <span style={{
            background: 'rgba(220,38,38,0.08)',
            color: '#DC2626',
            padding: '4px 12px',
            borderRadius: 99,
            fontSize: '0.7rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <X size={12} />
            Not Registered
          </span>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          background: 'rgba(220,38,38,0.1)', 
          padding: 10, 
          borderRadius: 8, 
          marginBottom: 12,
          border: '1px solid rgba(220,38,38,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertCircle size={14} color="#DC2626" />
          <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ 
          background: 'rgba(5,150,105,0.1)', 
          padding: 10, 
          borderRadius: 8, 
          marginBottom: 12,
          border: '1px solid rgba(5,150,105,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Check size={14} color="#059669" />
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500 }}>{success}</span>
        </div>
      )}

      {/* Content */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: C.textSub, lineHeight: 1.5 }}>
          {status.registered ? (
            <>
              <strong>{employeeName || 'This employee'}</strong> has registered face images for attendance recognition.
              Face recognition can be used for quick and secure check-in/check-out.
            </>
          ) : (
            <>
              <strong>{employeeName || 'This employee'}</strong> has not registered face images yet.
              Register 7 face photos from different angles to enable face recognition attendance.
            </>
          )}
        </p>

        {!status.registered && (
          <div style={{ 
            background: 'rgba(15,118,110,0.05)', 
            padding: 12, 
            borderRadius: 8,
            marginTop: 12,
            border: `1px solid rgba(15,118,110,0.15)`
          }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: C.textMuted, lineHeight: 1.6 }}>
              <strong style={{ color: C.primary }}>What you'll need:</strong><br />
              • Working camera (webcam or built-in)<br />
              • Good lighting conditions<br />
              • About 1-2 minutes to capture 7 photos<br />
              • Follow on-screen instructions for each angle
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        {!status.registered ? (
          <button
            onClick={() => setShowModal(true)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: C.primary,
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.primaryHov}
            onMouseLeave={e => e.currentTarget.style.background = C.primary}
          >
            <Camera size={14} />
            Register Face Images
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowModal(true)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: `1.5px solid ${C.primary}`,
                background: 'transparent',
                color: C.primary,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,118,110,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Camera size={14} />
              Re-register
            </button>

            {isHR && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1.5px solid #DC2626',
                  background: 'transparent',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: deleting ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
                onMouseLeave={e => { if (!deleting) e.currentTarget.style.background = 'transparent'; }}
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <FaceCaptureModal
          onClose={() => setShowModal(false)}
          onComplete={handleComplete}
          employeeUuid={employeeUuid}
        />
      )}
    </div>
  );
};

export default EmployeeFaceRegistration;
