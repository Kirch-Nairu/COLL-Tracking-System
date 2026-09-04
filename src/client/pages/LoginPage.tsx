import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

type LoginResponse = {
  token: string;
  expiresAt: string;
  officer: { id: string; email: string; fullName: string; role: string };
};

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const result = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(result.token);
      navigate("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "LOGIN_FAILED");
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <section className="card" style={{ width: "min(440px, 100%)" }}>
        <div className="brand" style={{ color: "#0f2744" }}>
          COLL
          <small>Attendance & Member Management</small>
        </div>
        <h1>Officer Login</h1>
        <p className="muted">Only authorized COLL officers need accounts. Members present their permanent QR.</p>
        {error && <div className="alert error">{error}</div>}
        <form className="form-grid" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="btn">Login</button>
        </form>
      </section>
    </main>
  );
}
