import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, AlertCircle } from 'lucide-react';
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

const INSTRUCTIONS = [
  "Face the camera directly with a neutral expression",
  "Turn your head slightly to the left",
  "Turn your head slightly to the right",
  "Look slightly upward",
  "Look slightly downward",
  "Smile while facing the camera",
  "Wear glasses (if you normally wear them)"
];

const FaceCaptureModal = ({ onClose, onComplete, employeeUuid }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [captures, setCaptures] = useState([]);
  const [descriptors, setDescriptors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'; // Place models in public/models folder
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

  // Start camera
  useEffect(() => {
    if (isLoading) return;

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
    };
  }, [isLoading]);

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    setError('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect face and get descriptor
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('No face detected. Please ensure your face is clearly visible and try again.');
        setIsProcessing(false);
        return;
      }

      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      
      // Store capture and descriptor
      setCaptures(prev => [...prev, blob]);
      setDescriptors(prev => [...prev, Array.from(detection.descriptor)]);

      // Move to next step or complete
      if (currentStep < INSTRUCTIONS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // All captures complete
        handleComplete([...captures, blob], [...descriptors, Array.from(detection.descriptor)]);
      }
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async (allCaptures, allDescriptors) => {
    try {
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Call parent completion handler with captures and descriptors
      await onComplete(allCaptures, allDescriptors, employeeUuid);
    } catch (err) {
      setError('Failed to save face images. Please try again.');
      console.error('Save error:', err);
    }
  };

  const handleRetake = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setCaptures(prev => prev.slice(0, -1));
      setDescriptors(prev => prev.slice(0, -1));
      setError('');
    }
  };

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: C.card, borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: C.textMain, fontWeight: 600 }}>Loading face detection models...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: 700, padding: 28, boxShadow: C.shadow, border: `1px solid ${C.border}` }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.textMain }}>
            Face Registration - Step {currentStep + 1} of {INSTRUCTIONS.length}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20, background: 'rgba(0,80,60,0.1)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${((currentStep + 1) / INSTRUCTIONS.length) * 100}%`, height: '100%', background: C.primary, transition: 'width 0.3s' }} />
        </div>

        {/* Instruction */}
        <div style={{ background: 'rgba(15,118,110,0.1)', padding: 14, borderRadius: 10, marginBottom: 20, border: `1px solid ${C.primary}` }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.primary }}>
            {INSTRUCTIONS[currentStep]}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#DC2626" />
            <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* Video feed */}
        <div style={{ position: 'relative', marginBottom: 20, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
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

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <button
            onClick={handleRetake}
            disabled={currentStep === 0 || isProcessing}
            style={{
              padding: '11px 20px',
              borderRadius: 8,
              border: `1.5px solid ${C.primary}`,
              background: 'transparent',
              color: C.primary,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: currentStep === 0 || isProcessing ? 'not-allowed' : 'pointer',
              opacity: currentStep === 0 || isProcessing ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            Retake Previous
          </button>

          <button
            onClick={captureImage}
            disabled={!cameraReady || isProcessing}
            style={{
              padding: '11px 24px',
              borderRadius: 8,
              border: 'none',
              background: !cameraReady || isProcessing ? '#8AADA6' : C.primary,
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: !cameraReady || isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (cameraReady && !isProcessing) e.currentTarget.style.background = C.primaryHov; }}
            onMouseLeave={e => { if (cameraReady && !isProcessing) e.currentTarget.style.background = C.primary; }}
          >
            <Camera size={16} />
            {isProcessing ? 'Processing...' : currentStep === INSTRUCTIONS.length - 1 ? 'Capture & Complete' : 'Capture'}
          </button>
        </div>

        {/* Captured count */}
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.75rem', color: C.textMuted, fontWeight: 500 }}>
          {captures.length} of {INSTRUCTIONS.length} images captured
        </div>
      </div>
    </div>
  );
};

export default FaceCaptureModal;
