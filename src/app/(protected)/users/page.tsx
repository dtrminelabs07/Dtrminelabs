"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Power, Users as UsersIcon } from "lucide-react";

type User = { id: string; name: string; username: string | null; email: string; role: "ADMIN" | "STAFF"; isActive: boolean; createdAt: string };
type Draft = { name: string; username: string; email: string; password: string; confirmPassword: string; role: "ADMIN" | "STAFF"; isActive: boolean };
const emptyDraft: Draft = { name: "", username: "", email: "", password: "", confirmPassword: "", role: "STAFF", isActive: true };

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      if (response.status === 403 || response.status === 401) { setAdmin(false); setRows([]); return; }
      const data: unknown = await response.json();
      if (!response.ok) throw new Error("Daftar pengguna gagal dimuat.");
      setRows(Array.isArray(data) ? data as User[] : []);
      setAdmin(true);
    } catch (cause) {
      setAdmin(false);
      setError(cause instanceof Error ? cause.message : "Daftar pengguna gagal dimuat.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditing(null); setDraft(emptyDraft); setError(""); setShowPassword(false); setShowConfirmPassword(false); setModal(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setDraft({ name: user.name, username: user.username ?? "", email: user.email, password: "", confirmPassword: "", role: user.role, isActive: user.isActive });
    setError(""); setShowPassword(false); setShowConfirmPassword(false); setModal(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    if ((!editing || draft.password) && draft.password !== draft.confirmPassword) { setError("Konfirmasi kata sandi tidak sama."); return; }
    if (!editing && draft.password.length < 12) { setError("Kata sandi awal minimal 12 karakter."); return; }
    setBusy(true);
    try {
      const payload = editing
        ? { name: draft.name, username: draft.username, role: draft.role, isActive: draft.isActive, ...(draft.password ? { password: draft.password } : {}) }
        : { name: draft.name, username: draft.username, email: draft.email, password: draft.password, role: draft.role, isActive: draft.isActive };
      const response = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Perubahan pengguna gagal disimpan.");
      setModal(false);
      setSuccess(editing ? "Data pengguna berhasil diperbarui." : "Pengguna berhasil ditambahkan.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tidak dapat menghubungi server."); }
    finally { setBusy(false); }
  }

  async function toggleStatus(user: User) {
    const nextActive = !user.isActive;
    if (!window.confirm(`${nextActive ? "Aktifkan" : "Nonaktifkan"} pengguna ${user.name}?${!nextActive ? " Pengguna ini tidak dapat login lagi." : ""}`)) return;
    setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: nextActive }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Status pengguna gagal diubah.");
      setSuccess(nextActive ? "Pengguna diaktifkan." : "Pengguna dinonaktifkan.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tidak dapat menghubungi server."); }
  }

  return <main className="page">
    <div className="page-title-row"><div><h1 className="page-title">Pengguna</h1><p className="page-subtitle">Kelola orang yang dapat login ke Dtrminelabs, peran, status, dan kata sandi mereka.</p></div>{admin && <button className="btn btn-primary" onClick={openCreate}><Plus size={15}/>Tambah pengguna</button>}</div>
    {error && !modal && <div className="notice" role="alert">{error}<button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div>}
    {success && <div className="notice users-success" role="status">{success}</div>}
    {!loading && !admin ? <div className="notice">Halaman ini hanya dapat diakses oleh admin.</div> : loading ? <section className="panel"><div className="empty" role="status">Memuat pengguna...</div></section> : <section className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Pengguna</th><th>Username</th><th>Email</th><th>Peran</th><th>Status</th><th>Bergabung</th><th>Aksi</th></tr></thead><tbody>{rows.map(user => <tr key={user.id}>
      <td><div style={{ display: "flex", gap: 9, alignItems: "center" }}><div className="avatar"><UsersIcon size={14}/></div><strong>{user.name}</strong></div></td>
      <td>{user.username ?? "—"}</td><td>{user.email}</td><td><span className={`role-pill role-${user.role.toLowerCase()}`}>{user.role === "ADMIN" ? "Admin" : "User"}</span></td>
      <td><span className={`account-card-state user-state ${user.isActive ? "" : "is-inactive"}`}><i className={`account-state-dot ${user.isActive ? "is-active" : ""}`} />{user.isActive ? "Aktif" : "Nonaktif"}</span></td>
      <td>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(user.createdAt))}</td>
      <td><div className="user-row-actions"><button className="btn btn-sm" onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}><Pencil size={13}/>Edit</button><button className="btn btn-sm" onClick={() => void toggleStatus(user)} aria-label={`${user.isActive ? "Nonaktifkan" : "Aktifkan"} ${user.name}`}><Power size={13}/>{user.isActive ? "Nonaktifkan" : "Aktifkan"}</button></div></td>
    </tr>)}</tbody></table>{rows.length === 0 && <div className="empty">Belum ada pengguna.</div>}</div></section>}
    {modal && <div className="modal-backdrop" onClick={() => { if (!busy) setModal(false); }}><form className="modal" onSubmit={save} onClick={event => event.stopPropagation()}>
      <h2 className="modal-title">{editing ? "Edit pengguna" : "Tambah pengguna"}</h2><p className="page-subtitle">{editing ? "Perubahan memperbarui pengguna ini tanpa membuat akun baru." : "Pengguna masuk menggunakan username dan kata sandi yang dibuat admin."}</p>
      <div className="form-grid"><label className="form-field full">Nama<input required minLength={1} maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
        <label className="form-field full">Username<input required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]+" autoCapitalize="none" value={draft.username} onChange={event => setDraft({ ...draft, username: event.target.value })}/></label>
        {!editing && <label className="form-field full">Email<input required type="email" maxLength={254} value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })}/></label>}
        <label className="form-field full">{editing ? "Kata sandi baru (kosongkan jika tidak diubah)" : "Kata sandi awal (minimal 12 karakter)"}<span className="user-password-field"><input required={!editing} minLength={12} maxLength={200} autoComplete="new-password" type={showPassword ? "text" : "password"} value={draft.password} onChange={event => setDraft({ ...draft, password: event.target.value })}/><button type="button" className="password-toggle" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>
        {(!editing || draft.password) && <label className="form-field full">Konfirmasi kata sandi<span className="user-password-field"><input required minLength={12} maxLength={200} autoComplete="new-password" type={showConfirmPassword ? "text" : "password"} value={draft.confirmPassword} onChange={event => setDraft({ ...draft, confirmPassword: event.target.value })}/><button type="button" className="password-toggle" aria-label={showConfirmPassword ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"} onClick={() => setShowConfirmPassword(value => !value)}>{showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>}
        <label className="form-field">Peran<select value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value as Draft["role"] })}><option value="STAFF">User</option><option value="ADMIN">Admin</option></select></label>
        <label className="form-field">Status<select value={draft.isActive ? "active" : "inactive"} onChange={event => setDraft({ ...draft, isActive: event.target.value === "active" })}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
      </div>
      {error && <div className="notice" style={{ marginTop: 10 }} role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="btn" disabled={busy} onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan..." : editing ? "Simpan perubahan" : "Buat pengguna"}</button></div>
    </form></div>}
  </main>;
}
