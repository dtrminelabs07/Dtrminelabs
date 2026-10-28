"use client";

import { useEffect, useState } from "react";
import { Plus, Users as UsersIcon } from "lucide-react";

type User = { id: string; name: string; username: string | null; email: string; role: "ADMIN" | "STAFF"; createdAt: string };

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/users");
    if (response.status === 403) { setAdmin(false); return; }
    const data: unknown = await response.json();
    setRows(Array.isArray(data) ? data as User[] : []);
    setAdmin(true);
  }

  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, email, password, role }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error); return; }
      setModal(false);
      setName(""); setUsername(""); setEmail(""); setPassword("");
      await load();
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function change(user: User, key: "name" | "username" | "role", value: string) {
    const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) });
    if (response.ok) await load();
  }

  if (!admin) return <main className="page"><div className="notice">Halaman ini hanya dapat diakses oleh admin.</div></main>;

  return <main className="page">
    <div className="page-title-row"><div><h1 className="page-title">Pengguna</h1><p className="page-subtitle">Atur akses administrator dan staf workspace.</p></div><button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15}/>Tambah pengguna</button></div>
    <section className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Pengguna</th><th>Username</th><th>Email</th><th>Peran</th><th>Bergabung</th></tr></thead><tbody>{rows.map(user => <tr key={user.id}>
      <td><div style={{ display: "flex", gap: 9, alignItems: "center" }}><div className="avatar"><UsersIcon size={14}/></div><input className="field" defaultValue={user.name} aria-label={`Nama ${user.email}`} onBlur={event => event.target.value !== user.name && void change(user, "name", event.target.value)}/></div></td>
      <td><input className="field" key={`${user.id}-${user.username}`} defaultValue={user.username ?? ""} placeholder="Atur username" aria-label={`Username ${user.email}`} onBlur={event => event.target.value !== (user.username ?? "") && void change(user, "username", event.target.value)}/></td>
      <td>{user.email}</td><td><select className="select" value={user.role} onChange={event => void change(user, "role", event.target.value)}><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select></td>
      <td>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(user.createdAt))}</td>
    </tr>)}</tbody></table>{rows.length === 0 && <div className="empty">Tidak ada data pengguna.</div>}</div></section>
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="modal" onSubmit={create} onClick={event => event.stopPropagation()}>
      <h2 className="modal-title">Tambah pengguna</h2><p className="page-subtitle">Pengguna masuk menggunakan username dan kata sandi yang Anda buat.</p>
      <div className="form-grid"><label className="form-field full">Nama<input required value={name} onChange={event => setName(event.target.value)}/></label>
        <label className="form-field full">Username<input required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]+" autoCapitalize="none" value={username} onChange={event => setUsername(event.target.value)}/></label>
        <label className="form-field full">Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)}/></label>
        <label className="form-field full">Kata sandi awal (minimal 12 karakter)<input required minLength={12} type="password" value={password} onChange={event => setPassword(event.target.value)}/></label>
        <label className="form-field full">Peran<select value={role} onChange={event => setRole(event.target.value as "ADMIN" | "STAFF")}><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select></label>
      </div>
      {error && <div className="notice" style={{ marginTop: 10, color: "#ff929e" }}>{error}</div>}
      <div className="modal-actions"><button type="button" className="btn" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan..." : "Buat pengguna"}</button></div>
    </form></div>}
  </main>;
}

