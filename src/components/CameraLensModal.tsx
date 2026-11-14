/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, QrCode, Search, Image as ImageIcon, X, ShieldCheck, Zap, AlertCircle, ArrowLeft } from 'lucide-react';
import { auditUrlSecurity } from '../engine/security';

interface CameraLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onFlagSecurityThreat: (result: any) => void;
}

export const CameraLensModal: React.FC<CameraLensModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onFlagSecurityThreat,
}) => {
  const [activeMode, setActiveMode] = useState<'qr' | 'visual'>('qr');
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setErrorMessage(null);
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } else {
        setErrorMessage('Camera access is restricted in this environment. You can use the Quick QR Simulator below.');
      }
    } catch (err: any) {
      setErrorMessage('Camera access was denied or not available. Using On-Device Local Scanner simulation.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSimulateScan = (sampleUrl: string) => {
    setScannedResult(sampleUrl);
    // Link Clinic Pre-Flight Audit
    const audit = auditUrlSecurity(sampleUrl);
    if (!audit.isSafe) {
      onClose();
      onFlagSecurityThreat(audit);
    } else {
      setTimeout(() => {
        onClose();
        onNavigate(sampleUrl);
      }, 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Omarvio Privacy Lens</span>
              <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/30">
                100% On-Device
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Zero cloud photo storage · 100% anonymous visual scanning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center justify-center gap-2 py-3">
        <button
          type="button"
          onClick={() => setActiveMode('qr')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeMode === 'qr'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR & Barcode Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('visual')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeMode === 'visual'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Private Visual Search</span>
        </button>
      </div>

      {/* Main Scanner Viewport */}
      <div className="flex-1 relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <div className="flex flex-col items-center text-center p-6 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
              <QrCode className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-slate-200 mb-1">
              Point at any QR code, Barcode, or Web Link
            </p>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Omarvio scans codes in local device memory and runs Link Clinic pre-audit before opening.
            </p>
          </div>
        )}

        {/* Viewfinder Target Graphic */}
        <div className="absolute inset-x-8 inset-y-16 pointer-events-none flex items-center justify-center">
          <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-cyan-400/70 rounded-3xl relative shadow-[0_0_50px_rgba(34,211,238,0.2)]">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1 rounded-br-xl" />
          </div>
        </div>

        {/* Scanned Feedback */}
        {scannedResult && (
          <div className="absolute bottom-6 bg-slate-900/95 border border-cyan-400 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-cyan-300 text-xs font-mono animate-bounce">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Link Detected: {scannedResult}</span>
          </div>
        )}
      </div>

      {/* Quick Test Bar / Action Simulator */}
      <div className="pt-3">
        <p className="text-center text-[11px] text-slate-400 font-medium mb-2">
          Test Instant Scanner & Link Clinic Pre-Audit:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleSimulateScan('https://wikipedia.org')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold"
          >
            Scan Safe Site (Wikipedia)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateScan('http://bkash-verify-login-bonus.xyz')}
            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs font-semibold"
          >
            Scan Phishing Trap (Test Link Clinic)
          </button>
        </div>
      </div>
    </div>
  );
};
