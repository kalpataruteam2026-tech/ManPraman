import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@/lib/navigation';
import { Camera, X, AlertCircle, CheckCircle, Search, QrCode } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
}

export function QrScannerModal({ open, onClose }: QrScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  const reports = useAppStore((s) => s.reports);
  const sessions = useAppStore((s) => s.sessions);

  // Initialize camera when opened
  useEffect(() => {
    if (!open) {
      stopCamera();
      setErrorMsg(null);
      setCameraError(null);
      setManualCode('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser. Please enter verification ID manually.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Camera access was denied or is unavailable. Please enter code manually.');
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

  const handleVerifyPayload = (raw: string) => {
    setErrorMsg(null);
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a verification code or scan a valid report QR.');
      return;
    }

    // Payload can be a direct verificationId (e.g. VRF-2026-00120), report code, or full URL
    let candidate = trimmed;
    try {
      if (trimmed.startsWith('http')) {
        const url = new URL(trimmed);
        const parts = url.pathname.split('/');
        candidate = parts[parts.length - 1];
      }
    } catch {
      // not a url, use direct
    }

    // Match against known reports
    const matchedReport = reports.find(
      (r) =>
        r.verificationId.toLowerCase() === candidate.toLowerCase() ||
        r.code.toLowerCase() === candidate.toLowerCase() ||
        r.id.toLowerCase() === candidate.toLowerCase(),
    );

    // Or match against test session code
    const matchedSession = sessions.find(
      (s) => s.code.toLowerCase() === candidate.toLowerCase() || s.id.toLowerCase() === candidate.toLowerCase(),
    );

    if (matchedReport) {
      stopCamera();
      onClose();
      navigate(`/verify/${matchedReport.verificationId}`);
    } else if (matchedSession) {
      // If session exists, see if report exists
      const r = reports.find((rep) => rep.sessionId === matchedSession.id);
      if (r) {
        stopCamera();
        onClose();
        navigate(`/verify/${r.verificationId}`);
      } else {
        setErrorMsg(`Session ${matchedSession.code} is found, but a finalized report has not been issued yet.`);
      }
    } else {
      // Required wording for unknown QR:
      setErrorMsg('QR code not recognized by this application.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-navy-900 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/20 text-accent-400">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">Report QR Scanner</h3>
              <p className="text-xs text-slate-400">Verify genuine OIML R-76 test reports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black/60 sm:aspect-[4/3]">
          {cameraActive ? (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              {/* Reticle / scanner crosshair */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-48 rounded-2xl border-2 border-accent-400/80 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  {/* Laser line animation */}
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-accent-400 shadow-[0_0_8px_#22c55e] animate-pulse" />
                  <div className="absolute -top-1 -left-1 h-4 w-4 border-l-2 border-t-2 border-accent-400" />
                  <div className="absolute -top-1 -right-1 h-4 w-4 border-r-2 border-t-2 border-accent-400" />
                  <div className="absolute -bottom-1 -left-1 h-4 w-4 border-l-2 border-b-2 border-accent-400" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 border-r-2 border-b-2 border-accent-400" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Camera className="h-10 w-10 text-slate-500" />
              <p className="mt-2 text-xs text-slate-400">
                {cameraError || 'Point camera at the printed certificate QR code'}
              </p>
              {cameraError && (
                <button
                  onClick={startCamera}
                  className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
                >
                  Retry Camera
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback / Error message */}
        {errorMsg && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Manual Code Input Fallback */}
        <div className="p-5">
          <label className="block text-xs font-semibold text-slate-300">
            Manual Verification Code Fallback
          </label>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPayload(manualCode)}
                placeholder="e.g. VRF-2026-00120 or LM-2026-00120"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleVerifyPayload(manualCode)}
              className="flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-accent-600 active:scale-95"
            >
              <Search className="h-4 w-4" />
              Verify
            </button>
          </div>

          {/* Quick Demo Verification shortcuts */}
          {reports.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <span className="text-[11px] text-slate-400">Sample verified report ID in database:</span>
              <button
                type="button"
                onClick={() => handleVerifyPayload(reports[0].verificationId)}
                className="ml-1 inline-flex items-center gap-1 font-mono text-[11px] text-accent-400 hover:underline"
              >
                <CheckCircle className="h-3 w-3" />
                {reports[0].verificationId}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
