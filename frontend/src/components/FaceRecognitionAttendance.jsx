import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, AlertCircle, User, Building2, Clock, LogIn, LogOut } from 'lucide-react';
import * as faceapi from 'face-api.js';

const C = {
  card: '#EEF1F0',
  border: 'rgba(0,80,60,0.09)',
  shadow: '0 25px 50px rgba(0,0,0,0.3)',
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
};

const FaceRecognitionAttendance = ({ onClose, onSuccess, attendanceType }) => {
  const [step, setStep] = useState('select'); // 'select', 'scanning', 'confirm', 'processing'
  const [selectedType, setSelectedType] = useState(attendanceType || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

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

        // Store descriptor and verify face with backend
        const descriptorArray = Array.from(detection.descriptor);
        setCapturedDescriptor(descriptorArray);
        await verifyFace(descriptorArray);
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  const verifyFace = async (descriptor) => {
    setStep('processing');
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/face-recognition/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ descriptor }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      if (!result.data.matched) {
        setError('No matching employee found. Please try again or use manual check-in.');
        setCapturedDescriptor(null);
        setStep('select');
        return;
      }

      // Show confirmation with matched employee
      setMatchedEmployee(result.data.employee);
      setStep('confirm');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Face verification failed. Please try again.');
      setCapturedDescriptor(null);
      setStep('select');
    }
  };

  const handleConfirm = async () => {
    if (!matchedEmployee || !capturedDescriptor) return;

    setStep('processing');
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/face-recognition/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          descriptor: capturedDescriptor,
          type: selectedType,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Show the actual error message from backend
        throw new Error(result.message || 'Failed to log attendance');
      }

      // Success!
      onSuccess(result.data);
      onClose();
    } catch (err) {
      console.error('Attendance logging error:', err);
      setError(err.message || 'Failed to log attendance. Please try again.');
      // Stay on confirm step to show the error
      setStep('confirm');
    }
  };

  const handleStartScan = (type) => {
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
    setCapturedDescriptor(null);
    setMatchedEmployee(null);
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
            <AlertCircle size={16} color="#DC2626" />
            <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 500 }}>{error}</span>
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
                style={{
                  padding: 24,
                  borderRadius: 12,
                  border: `2px solid ${C.primary}`,
                  background: 'rgba(15,118,110,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <LogIn size={32} color={C.primary} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: C.primary }}>Check In</span>
              </button>

              <button
                onClick={() => handleStartScan('CHECK_OUT')}
                style={{
                  padding: 24,
                  borderRadius: 12,
                  border: `2px solid ${C.primary}`,
                  background: 'rgba(15,118,110,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,118,110,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <LogOut size={32} color={C.primary} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: C.primary }}>Check Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Scanning Step */}
        {step === 'scanning' && (
          <div>
            <div style={{ background: 'rgba(15,118,110,0.1)', padding: 14, borderRadius: 10, marginBottom: 16, border: `1px solid ${C.primary}`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.primary }}>
                {isScanning ? 'Scanning for face...' : 'Position your face in the camera'}
              </div>
            </div>

            <div style={{ position: 'relative', marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              {!cameraReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem' }}>
                  Starting camera...
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <button
              onClick={() => setStep('select')}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 8,
                border: `1.5px solid ${C.primary}`,
                background: 'transparent',
                color: C.primary,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && matchedEmployee && (
          <div>
            <div style={{ background: 'rgba(15,118,110,0.1)', padding: 20, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <User size={28} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: C.textMain, marginBottom: 4 }}>
                    {matchedEmployee.firstName} {matchedEmployee.middleName} {matchedEmployee.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: C.textMuted, fontWeight: 500 }}>
                    ID: {matchedEmployee.mesobId}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: C.card, padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Department</div>
                  <div style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} />
                    {matchedEmployee.departmentName || 'N/A'}
                  </div>
                </div>

                <div style={{ background: C.card, padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: C.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Time</div>
                  <div style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} />
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, padding: 10, background: C.card, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: C.textMuted, marginBottom: 4 }}>Action</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.primary }}>
                  {selectedType === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setStep('select');
                  setMatchedEmployee(null);
                }}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 8,
                  border: `1.5px solid ${C.primary}`,
                  background: 'transparent',
                  color: C.primary,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 8,
                  border: 'none',
                  background: C.primary,
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.primaryHov}
                onMouseLeave={e => e.currentTarget.style.background = C.primary}
              >
                <Check size={16} />
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '0.9rem', color: C.textMain, fontWeight: 600, marginBottom: 8 }}>
              Processing...
            </div>
            <div style={{ fontSize: '0.75rem', color: C.textMuted }}>
              Please wait while we record your attendance
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRecognitionAttendance;
