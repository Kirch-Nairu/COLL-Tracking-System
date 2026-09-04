import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";

type EventRecord = {
  id: string;
  title: string;
  eventDate: string;
  attendanceStatus: "OPEN" | "CLOSED";
};

type ScanSuccess = {
  member: { id: string; memberNo: string; fullName: string; position: string | null };
  attendance: { id: string; scannedAt: string; status: "PRESENT" | "LATE" };
};

export function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const recentTokenRef = useRef<{ token: string; at: number } | null>(null);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventId, setEventId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "duplicate" | "error"; title: string; detail: string } | null>(null);

  useEffect(() => {
    api<{ events: EventRecord[] }>("/api/events").then((data) => {
      const open = data.events.filter((event) => event.attendanceStatus === "OPEN");
      setEvents(open);
      if (open[0]) setEventId(open[0].id);
    });
    return () => controlsRef.current?.stop();
  }, []);

  async function submitToken(token: string) {
    if (!eventId || processingRef.current) return;

    const recent = recentTokenRef.current;
    if (recent && recent.token === token && Date.now() - recent.at < 1500) return;

    processingRef.current = true;
    recentTokenRef.current = { token, at: Date.now() };

    try {
      const response = await api<ScanSuccess>(`/api/events/${eventId}/check-in`, {
        method: "POST",
        body: JSON.stringify({ qrToken: token })
      });

      setResult({
        kind: "success",
        title: `${response.attendance.status} — ${response.member.fullName}`,
        detail: `${response.member.memberNo} · ${new Date(response.attendance.scannedAt).toLocaleTimeString()}`
      });
    } catch (reason) {
      const typed = reason as Error & { status?: number; body?: { error?: string; attendance?: { scannedAt?: string }; member?: { fullName?: string; memberNo?: string } } };
      if (typed.body?.error === "ALREADY_RECORDED") {
        setResult({
          kind: "duplicate",
          title: `Already recorded — ${typed.body.member?.fullName || "member"}`,
          detail: typed.body.attendance?.scannedAt
            ? `Original check-in: ${new Date(typed.body.attendance.scannedAt).toLocaleTimeString()}`
            : "This member is already checked in."
        });
      } else {
        setResult({ kind: "error", title: typed.body?.error || typed.message, detail: "Ready for the next scan." });
      }
    } finally {
      processingRef.current = false;
    }
  }

  async function start() {
    if (!videoRef.current || !eventId) return;
    setResult(null);

    const reader = new BrowserQRCodeReader();
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" } } },
      videoRef.current,
      (decodeResult) => {
        if (decodeResult) void submitToken(decodeResult.getText());
      }
    );

    controlsRef.current = controls;
    setRunning(true);
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setRunning(false);
  }

  return (
    <div className="stack">
      <header className="page-head"><h1>Attendance Scanner</h1></header>
      <div className="grid grid-2">
        <section className="card stack">
          <label>Open event
            <select value={eventId} onChange={(event) => setEventId(event.target.value)} disabled={running}>
              <option value="">Select an event</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.eventDate}</option>)}
            </select>
          </label>

          <video ref={videoRef} className="scanner-video" muted playsInline />
          <div className="actions">
            {!running
              ? <button className="btn" onClick={start} disabled={!eventId}>Start camera</button>
              : <button className="btn danger" onClick={stop}>Stop camera</button>}
          </div>
          <p className="muted">The browser decodes the member QR locally, then sends only the opaque token and selected event to the Worker API.</p>
        </section>

        <section className="card stack">
          <h2>Latest result</h2>
          {result
            ? <div className={`scan-result ${result.kind}`}><h2>{result.title}</h2><p>{result.detail}</p><strong>Ready to scan next member.</strong></div>
            : <div className="scan-result"><h2>Ready</h2><p>Start the camera and scan a member's permanent QR.</p></div>}
        </section>
      </div>
    </div>
  );
}
