import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api } from '../api';

type ScanResult = {
  kind: 'idle' | 'success' | 'duplicate' | 'error';
  title: string;
  detail?: string;
  member?: { fullName: string; memberNo: string; position: string };
  status?: string;
  time?: string;
};

export function ScannerPage() {
  const { eventId = '' } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const inflightRef = useRef(false);
  const lastTokenRef = useRef('');
  const lastAtRef = useRef(0);
  const [result, setResult] = useState<ScanResult>({ kind: 'idle', title: 'Ready to scan' });
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
    let cancelled = false;
    async function start() {
      if (!videoRef.current) return;
      try {
        controlsRef.current = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (decoded) => { if (decoded && !cancelled) void submit(decoded.getText()); }
        );
      } catch {
        setCameraError('Camera unavailable or permission denied. Use manual token entry below.');
      }
    }
    void start();
    return () => { cancelled = true; controlsRef.current?.stop(); };
  }, [eventId]);

  async function submit(qrToken: string) {
    const now = Date.now();
    if (inflightRef.current) return;
    if (qrToken === lastTokenRef.current && now - lastAtRef.current < 1800) return;
    inflightRef.current = true;
    lastTokenRef.current = qrToken;
    lastAtRef.current = now;
    setResult({ kind: 'idle', title: 'Validating…' });
    try {
      const data = await api<any>(`/api/events/${eventId}/check-in`, {
        method: 'POST', body: JSON.stringify({ qrToken, checkInMethod: 'QR' })
      });
      setResult({ kind: 'success', title: 'ATTENDANCE RECORDED', member: data.member, status: data.attendance.status, time: data.attendance.scannedAt });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ALREADY_RECORDED') {
        const data: any = error.data;
        setResult({ kind: 'duplicate', title: 'ALREADY RECORDED', member: data.member, status: data.attendance.status, time: data.attendance.scannedAt });
      } else {
        const code = error instanceof ApiError ? error.code : 'SCAN_FAILED';
        setResult({ kind: 'error', title: code.replaceAll('_', ' '), detail: 'No attendance row was created.' });
      }
    } finally {
      window.setTimeout(() => { inflightRef.current = false; }, 500);
    }
  }

  async function manualSubmit() {
    const token = prompt('Paste or type the member QR token:');
    if (token) await submit(token.trim());
  }

  return <section className="scanner-page">
    <header className="page-header"><div><div className="eyebrow">CONTINUOUS SCAN</div><h1>Attendance scanner</h1></div><Link className="button" to={`/events/${eventId}/attendance`}>Records</Link></header>
    <div className="scanner-grid">
      <div className="camera-panel"><video ref={videoRef} autoPlay muted playsInline /><div className="scan-frame" />{cameraError && <div className="camera-error">{cameraError}</div>}</div>
      <aside className={`scan-result ${result.kind}`}><div className="scan-icon">{result.kind === 'success' ? '✓' : result.kind === 'duplicate' ? '!' : result.kind === 'error' ? '×' : '•'}</div><h2>{result.title}</h2>{result.member && <><strong>{result.member.fullName}</strong><span>{result.member.memberNo}</span><span>{result.member.position}</span></>}{result.status && <div className="status-large">{result.status}</div>}{result.time && <time>{new Date(result.time).toLocaleTimeString()}</time>}<button onClick={manualSubmit}>Manual token lookup</button><small>Scanner automatically remains ready for the next member.</small></aside>
    </div>
  </section>;
}
