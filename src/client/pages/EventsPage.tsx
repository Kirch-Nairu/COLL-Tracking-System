import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

type EventRecord = {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  lateAfter: string;
  venue: string | null;
  attendanceStatus: "OPEN" | "CLOSED";
};

export function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api<{ events: EventRecord[] }>("/api/events");
      setEvents(data.events);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries()))
      });
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function setAttendance(id: string, open: boolean) {
    await api(`/api/events/${id}/${open ? "open-attendance" : "close-attendance"}`, {
      method: "POST",
      body: "{}"
    });
    await load();
  }

  return (
    <div className="stack">
      <header className="page-head"><h1>Events</h1></header>
      {error && <div className="alert error">{error}</div>}
      <div className="grid grid-2">
        <section className="card">
          <h2>Create event</h2>
          <form className="form-grid" onSubmit={create}>
            <label>Title<input name="title" required /></label>
            <label>Description<textarea name="description" /></label>
            <label>Date<input name="eventDate" type="date" required /></label>
            <label>Start time<input name="startTime" type="time" required /></label>
            <label>Late after<input name="lateAfter" type="time" required /></label>
            <label>Venue<input name="venue" /></label>
            <label>Activity type<input name="eventType" /></label>
            <button className="btn">Create event</button>
          </form>
        </section>

        <section className="card">
          <h2>Event list</h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Event</th><th>Schedule</th><th>Attendance</th><th>Action</th></tr></thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td><strong>{event.title}</strong><br/><span className="muted">{event.venue || "No venue"}</span></td>
                    <td>{event.eventDate}<br/><span className="muted">{event.startTime} · Late after {event.lateAfter}</span></td>
                    <td><span className={`badge ${event.attendanceStatus.toLowerCase()}`}>{event.attendanceStatus}</span></td>
                    <td>
                      {event.attendanceStatus === "OPEN"
                        ? <button className="btn danger" onClick={() => setAttendance(event.id, false)}>Close</button>
                        : <button className="btn" onClick={() => setAttendance(event.id, true)}>Open</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
