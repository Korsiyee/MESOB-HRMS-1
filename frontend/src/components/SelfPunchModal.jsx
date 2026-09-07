/**
 * Self-Punch Modal Component
 * 
 * Reusable modal for employee self-service attendance punch using face recognition.
 * This component uses the self-punch API endpoint which:
 * - Requires company Wi-Fi connection
 * - Uses face recognition for identity verification
 * - Records attendance for the authenticated user only
 * 
 * Usage:
 *   <SelfPunchModal 
 *     onClose={() => setShowModal(false)} 
 *     onSuccess={(data) => handleSuccess(data)} 
 *   />
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, AlertCircle, LogIn, LogOut } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { AttendanceApi } from '../api/attendanceApi';
import { FaceRecognitionApi } from '../api/faceRecognitionApi';

const C = {
  card: '#EEF1F0',
  border: 'rgba(0,80,60,0.09)',
  shadow: '0 25px 50px rgba(0,0,0,0.3)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  success: '#059669',
  error: '#DC2626',
};

const SelfPunchModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState('select'); // 'select', 'scanning', 'processing', 'success'
  const [selectedType, setSelectedType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const isSubmittingRef = useRef(false); // Prevent duplicate submissions

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        setError('Failed to load face detection models. Please refresh the page.');
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Start camera when scanning begins
  useEffect(() => {
    if (step !== 'scanning' || isLoading) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
            startScanning();
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Unable to access camera. Please grant camera permissions.');
        setStep('select');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [step, isLoading]);

  const startScanning = () => {
    setIsScanning(true);
    
    let scanCount = 0;
    const MAX_SCANS = 20; // Stop after 20 attempts (10 seconds)
    
    // Scan for face every 500ms
    scanIntervalRef.current = setInterval(async () => {
      scanCount++;
      if (scanCount > MAX_SCANS) {
        clearInterval(scanIntervalRef.current);
        setIsScanning(false);
        setError('Face scan timeout. Please try again with better lighting or positioning.');
        setStep('select');
        return;
      }
      await scanForFace();
    }, 500);
  };

  const scanForFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect face and get descriptor
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Stop scanning
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
        }
        setIsScanning(false);

        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Store descriptor and submit attendance
        const descriptorArray = Array.from(detection.descriptor);
        setCapturedDescriptor(descriptorArray);
        await submitAttendance(descriptorArray);
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  const submitAttendance = async (descriptor) => {
    setStep('processing');
    setError('');

    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      console.log('[SelfPunch] Already submitting, ignoring duplicate request');
      return;
    }
    
    isSubmittingRef.current = true;

    try {
      // Submit attendance with self-punch endpoint including face descriptor
      // Backend will verify the face matches the authenticated user
      const result = await AttendanceApi.selfPunch({
        type: selectedType,
        source: 'FACE_RECOGNITION',
        descriptor: descriptor, // Send descriptor to backend for verification
      });

      // Success
      setStep('success');
      
      // Auto-close after 2 seconds and call onSuccess
      setTimeout(() => {
        onSuccess && onSuccess(result.data);
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Attendance logging error:', err);
      
      // Parse error messages
      if (err.message.includes('NOT_ON_COMPANY_WIFI') || err.message.includes('company network')) {
        setError('You must be connected to the company Wi-Fi to record attendance.');
      } else if (err.message.includes('ALREADY_CHECKED_IN')) {
        setError('You have already checked in today.');
      } else if (err.message.includes('ALREADY_CHECKED_OUT')) {
        setError('You have already checked out today.');
      } else if (err.message.includes('NO_CHECK_IN')) {
        setError('You must check in before checking out.');
      } else if (err.message.includes('NOT_WORKING_DAY')) {
        setError('Today is not a working day for your shift.');
      } else if (err.message.includes('NO_ACTIVE_SHIFT')) {
        setError('No shift assigned. Please contact HR.');
      } else if (err.message.includes('FACE_NOT_RECOGNIZED') || err.message.includes('not recognized')) {
        setError('Face not recognized. Please ensure good lighting and try again, or contact HR to register your face.');
      } else if (err.message.includes('FACE_MISMATCH')) {
        setError('Face does not match your account. Attendance can only be recorded with your own face.');
      } else if (err.message.includes('INVALID_DESCRIPTOR')) {
        setError('Face scan data is invalid. Please try scanning again.');
      } else {
        setError(err.message || 'Failed to record attendance. Please try again.');
      }
      
      setStep('select');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleStartScan = (type) => {
    // Prevent multiple clicks
    if (step === 'scanning' || step === 'processing') {
      return;
    }
    
    setSelectedType(type);
    setStep('scanning');
    setError('');
    setCapturedDescriptor(null);
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    onClose();
  };

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: C.textMain, fontWeight: 600 }}>Loading face recognition...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 600, padding: 28, boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>
            Face Recognition Attendance
          </h2>
          <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color={C.error} />
            <span style={{ fontSize: '0.8rem', color: C.error, fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Select Type Step */}
        {step === 'select' && (
          <div>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: C.textSub, textAlign: 'center' }}>
              Select the type of attendance you want to record
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <button
                onClick={() => handleStartScan('CHECK_IN')}
                disabled={step === 'scanning' || step === 'processing'}
                style={{
                  padding: 24,
                  borderRadius: 12,
                  border: `2px solid ${C.primary}`,
                  background: 'rgba(15,118,110,0.05)',
                  cursor: step === 'scanning' || step === 'processing' ? 'not-allowed' : 'pointer',
                  opacity: step === 'scanning' || step === 'processing' ? 0.6 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  if (step !== 'scanning' && step !== 'processing') {
                    e.currentTarget.style.background = 'rgba(15,118,110,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (step !== 'scanning' && step !== 'processing') {
                    e.currentTarget.style.background = 'rgba(15,118,110,0.05)';
                  }
                }}
              >
                <LogIn size={40} color={C.primary} />
                <span style={{ fontSize: '1rem', fontWeight: 700, color: C.textMain }}>Check In</span>
              </button>

              <button
                onClick={() => handleStartScan('CHECK_OUT')}
                disabled={step === 'scanning' || step === 'processing'}
                style={{
                  padding: 24,
                  borderRadius: 12,
                  border: `2px solid ${C.primary}`,
                  background: 'rgba(15,118,110,0.05)',
                  cursor: step === 'scanning' || step === 'processing' ? 'not-allowed' : 'pointer',
                  opacity: step === 'scanning' || step === 'processing' ? 0.6 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  if (step !== 'scanning' && step !== 'processing') {
                    e.currentTarget.style.background = 'rgba(15,118,110,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (step !== 'scanning' && step !== 'processing') {
                    e.currentTarget.style.background = 'rgba(15,118,110,0.05)';
                  }
                }}
              >
                <LogOut size={40} color={C.primary} />
                <span style={{ fontSize: '1rem', fontWeight: 700, color: C.textMain }}>Check Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Scanning Step */}
        {step === 'scanning' && (
          <div>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: C.textSub, textAlign: 'center' }}>
              {isScanning ? 'Scanning for face...' : 'Position your face in the camera'}
            </p>
            
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 16 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block', maxHeight: 400 }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {isScanning && (
                <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, color: C.primary }}>
                  Detecting face...
                </div>
              )}
            </div>

            <button
              onClick={handleCancel}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: 'white',
                color: C.textMain,
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #E5E7EB', borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: C.textMain }}>
              Recording Attendance...
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={36} color={C.success} strokeWidth={3} />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>
              Attendance Recorded!
            </div>
          </div>
        )}
      </div>

      {/* Global animation keyframes */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default SelfPunchModal;
