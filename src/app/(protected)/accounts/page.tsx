"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, History, Plus, Power, Search, UserRound, X, Pencil, Trash2, StickyNote } from "lucide-react";

type Account = { id: string; name: string; username: string | null; avatarUrl: string | null; core: string; subCore: string | null; platform: string | null; internalNotes?: string | null; isActive: boolean; createdAt: string; updatedAt: string };
type Upload = { id: string; date: string; status: string; notes: string | null; updatedAt: string };
type Activity = { id: string; description: string; createdAt: string; actor: { name: string } };
type AccountDetail = Account & { uploads: Upload[]; activities: Activity[] };
type AccountNote = { id: string; content: string; createdAt: string; updatedAt: string; author: { id: string; name: string } | null };
type Draft = { name: string; username: string; password: string; avatarUrl: string; core: string; subCore: string; platform: string; internalNotes: string };
const empty: Draft = { name: "", username: "", password: "", avatarUrl: "", core: "", subCore: "", platform: "", internalNotes: "" };
const statusLabels: Record<string, string> = { COMPLETED: "Sudah", PENDING: "Belum", UPLOADED: "Sudah Upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };
const dateLabel = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function AccountsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [allRows, setAllRows] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");
  const [core, setCore] = useState("");
  const [subCore, setSubCore] = useState("");
  const [sort, setSort] = useState("core");
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Account | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [details, setDetails] = useState<AccountDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [notes, setNotes] = useState<AccountNote[]>([]);
  const [notesBusy, setNotesBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteError, setNoteError] = useState("");
  const cores = useMemo(() => Array.from(new Set(allRows.map(row => row.core))).sort(), [allRows]);
  const subCores = useMemo(() => Array.from(new Set(allRows.filter(row => !core || row.core === core).map(row => row.subCore).filter((value): value is string => Boolean(value)))).sort(), [allRows, core]);
  const displayRows = useMemo(() => [...rows].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : a.core.localeCompare(b.core) || (a.subCore ?? "").localeCompare(b.subCore ?? "") || a.name.localeCompare(b.name)), [rows, sort]);

  const loadAll = useCallback(async () => {
    const response = await fetch("/api/accounts?active=all", { cache: "no-store" });
    const data: unknown = await response.json();
    setAllRows(Array.isArray(data) ? data as Account[] : []);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ active, q: query });
      if (core) params.set("core", core);
      if (subCore) params.set("subCore", subCore);
      const [accountResponse, sessionResponse] = await Promise.all([fetch(`/api/accounts?${params}`, { cache: "no-store" }), fetch("/api/auth/session", { cache: "no-store" })]);
      if (!accountResponse.ok) throw new Error("Daftar akun gagal dimuat.");
      const [accountData, sessionData] = await Promise.all([accountResponse.json(), sessionResponse.json()]);
      setRows(Array.isArray(accountData) ? accountData : []);
      setAdmin(sessionData.user?.role === "ADMIN");
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Daftar akun gagal dimuat."); }
    finally { setLoading(false); }
  }, [active, core, query, subCore]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 160); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    void loadAll();
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q");
    if (initialQuery) setQuery(initialQuery);
    if (params.get("new") === "1") setModal(true);
  }, [loadAll]);
  useEffect(() => {
    if (!modal && !details) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (details) setDetails(null);
      else setModal(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [details, modal]);

  function start(account?: Account) {
    setEdit(account ?? null);
    setDraft(account ? { name: account.name, username: account.username ?? "", password: "", avatarUrl: account.avatarUrl ?? "", core: account.core, subCore: account.subCore ?? "", platform: account.platform ?? "", internalNotes: account.internalNotes ?? "" } : empty);
    setShowAccountPassword(false);
    setModal(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const { password, ...accountFields } = draft;
      const payload = edit
        ? { ...accountFields, ...(password ? { password } : {}), username: draft.username || null, avatarUrl: draft.avatarUrl || null, subCore: draft.subCore || null, platform: draft.platform || null, internalNotes: draft.internalNotes || null }
        : { name: draft.name, internalNotes: draft.internalNotes || null };
      const response = await fetch(edit ? `/api/accounts/${edit.id}` : "/api/accounts", { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Gagal menyimpan akun.");
      setToast(edit ? "Akun diperbarui" : "Akun ditambahkan"); setModal(false); await Promise.all([load(), loadAll()]);
    } catch (error) { setToast(error instanceof Error ? error.message : "Gagal menyimpan akun"); }
    finally { setBusy(false); window.setTimeout(() => setToast(""), 3500); }
  }
  async function toggle(account: Account) {
    if (!window.confirm(`${account.isActive ? "Nonaktifkan" : "Aktifkan"} akun ${account.name}? Riwayat tracker tetap disimpan.`)) return;
    setStatusBusyId(account.id);
    try {
      const response = await fetch(`/api/accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !account.isActive }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Perubahan status gagal disimpan.");
      setToast(account.isActive ? "Akun dinonaktifkan" : "Akun diaktifkan"); await Promise.all([load(), loadAll()]);
    } catch (error) { setToast(error instanceof Error ? error.message : "Perubahan status gagal disimpan."); }
    finally { setStatusBusyId(null); window.setTimeout(() => setToast(""), 3500); }
  }
  async function viewDetails(account: Account) {
    setDetails(null); setNotes([]); setNoteDraft(""); setNoteError(""); setDetailBusy(true);
    try {
      const response = await fetch(`/api/accounts/${account.id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Detail akun gagal dimuat.");
      setDetails(data as AccountDetail);
      if (admin) {
        setNotesBusy(true);
        try {
          const noteResponse = await fetch(`/api/accounts/${account.id}/notes`, { cache: "no-store" });
          const noteData = await noteResponse.json();
          if (!noteResponse.ok) throw new Error(noteData.error || "Catatan privat gagal dimuat.");
          setNotes(Array.isArray(noteData) ? noteData as AccountNote[] : []);
        } catch (error) { setNoteError(error instanceof Error ? error.message : "Catatan privat gagal dimuat."); }
      }
    } catch (error) { setToast(error instanceof Error ? error.message : "Detail akun gagal dimuat."); }
    finally { setDetailBusy(false); setNotesBusy(false); }
  }
  async function saveNote(event: React.FormEvent) {
    event.preventDefault(); if (!details || !noteDraft.trim()) return;
    setNoteError(""); setNotesBusy(true);
    try {
      const isEdit = Boolean(editingNote);
      const response = await fetch(isEdit ? `/api/accounts/${details.id}/notes/${editingNote}` : `/api/accounts/${details.id}/notes`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteDraft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Catatan gagal disimpan.");
      setNotes(current => isEdit ? current.map(note => note.id === data.id ? data as AccountNote : note) : [data as AccountNote, ...current]);
      setNoteDraft(""); setEditingNote(null);
    } catch (error) { setNoteError(error instanceof Error ? error.message : "Catatan gagal disimpan."); }
    finally { setNotesBusy(false); }
  }
  async function deleteNote(note: AccountNote) {
    if (!details || !window.confirm("Hapus catatan privat ini?")) return;
    setNotesBusy(true); setNoteError("");
    try {
      const response = await fetch(`/api/accounts/${details.id}/notes/${note.id}`, { method: "DELETE" });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Catatan gagal dihapus."); }
      setNotes(current => current.filter(item => item.id !== note.id));
      if (editingNote === note.id) { setEditingNote(null); setNoteDraft(""); }
    } catch (error) { setNoteError(error instanceof Error ? error.message : "Catatan gagal dihapus."); }
    finally { setNotesBusy(false); }
  }
  function editNote(note: AccountNote) { setEditingNote(note.id); setNoteDraft(note.content); }

  return <main className="page accounts-reference-page">
    <div className="page-title-row"><div><h1 className="page-title">Akun</h1><p className="page-subtitle">Kelola akun, kategori, dan status keaktifan.</p></div>{admin && <button className="btn btn-primary" onClick={() => start()}><Plus size={15} />Tambah akun</button>}</div>
    <section className="panel accounts-panel">
      <div className="matrix-tools accounts-tools"><label className="global-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, username, core..." aria-label="Cari akun" /></label>
        <select className="select" aria-label="Filter core" value={core} onChange={event => { setCore(event.target.value); setSubCore(""); }}><option value="">Semua core</option>{cores.map(value => <option key={value}>{value}</option>)}</select>
        <select className="select" aria-label="Filter sub-core" value={subCore} onChange={event => setSubCore(event.target.value)}><option value="">Semua sub-core</option>{subCores.map(value => <option key={value}>{value}</option>)}</select>
        <select className="select" aria-label="Urutkan akun" value={sort} onChange={event => setSort(event.target.value)}><option value="core">Urutkan: Core</option><option value="name">Urutkan: Nama</option><option value="updated">Urutkan: Terbaru</option></select>
        <select className="select" aria-label="Filter status akun" value={active} onChange={event => setActive(event.target.value)}><option value="true">Akun aktif</option><option value="false">Akun nonaktif</option><option value="all">Semua akun</option></select><span className="muted account-count">{rows.length} akun</span>
      </div>
      {loading ? <div className="empty">Memuat akun...</div> : loadError ? <div className="empty account-load-error" role="alert"><p>{loadError}</p><button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div> : displayRows.length === 0 ? <div className="empty">{allRows.length === 0 ? <><p>Belum ada akun. Tambahkan akun pertama untuk mulai mengelola tracker.</p>{admin && <button className="btn btn-primary" onClick={() => start()}><Plus size={14} />Tambah akun</button>}</> : "Belum ada akun yang sesuai filter."}</div> : <div className="account-card-grid">{displayRows.map(account => <article className="account-card" key={account.id}>
        <button className="account-card-main" onClick={() => void viewDetails(account)} aria-label={`Buka detail akun ${account.name}`}>
          <div className="account-card-heading"><div className="avatar account-card-avatar" style={account.avatarUrl ? { backgroundImage: `url(${account.avatarUrl})`, backgroundSize: "cover", color: "transparent" } : undefined}>{account.avatarUrl ? " " : <UserRound size={17} />}</div><div className="account-card-copy"><strong>{account.name}</strong><small>{account.username || "Tanpa username"}</small></div><span className={`account-card-state ${account.isActive ? "is-active" : "is-inactive"}`}><i className={`account-state-dot ${account.isActive ? "is-active" : "is-inactive"}`} />{account.isActive ? "Aktif" : "Belum Aktif"}</span></div>
          <div className="account-card-tags"><span>{account.core}</span>{account.subCore && <span>{account.subCore}</span>}</div>
          <div className="account-card-foot"><span>{account.platform || "Platform belum diatur"}</span><small>Ditambahkan {dateLabel(account.createdAt)}</small></div>
        </button>
        <div className="account-card-actions"><button className="btn btn-sm" onClick={() => void viewDetails(account)} title="Detail akun" aria-label={`Detail ${account.name}`}><Eye size={14} /></button><Link className="btn btn-sm" href={`/history?accountId=${account.id}`} title="Riwayat akun" aria-label={`Riwayat ${account.name}`}><History size={14} /></Link>{admin && <><button className="btn btn-sm" onClick={() => start(account)} aria-label={`Edit ${account.name}`}><Pencil size={13} />Edit</button><button className="btn btn-sm" onClick={() => void toggle(account)} disabled={statusBusyId === account.id} title={account.isActive ? "Arsipkan" : "Aktifkan"} aria-label={account.isActive ? `Arsipkan ${account.name}` : `Aktifkan ${account.name}`}><Power size={13} />{statusBusyId === account.id ? "Menyimpan…" : account.isActive ? "Nonaktifkan" : "Aktifkan"}</button></>}</div>
      </article>)}</div>}
    </section>
    {modal && admin && <div className="modal-backdrop" onClick={() => setModal(false)}><form role="dialog" aria-modal="true" aria-labelledby="account-form-title" className="modal" onSubmit={submit} onClick={event => event.stopPropagation()}><div className="account-modal-heading"><div><h2 id="account-form-title" className="modal-title">{edit ? "Edit akun" : "Tambah akun"}</h2><p className="page-subtitle">Detail akun yang digunakan pada tracker.</p></div><button type="button" className="btn btn-sm" onClick={() => setModal(false)} aria-label="Tutup"><X size={14} /></button></div><div className="form-grid"><label className="form-field full">Nama Akun<input required maxLength={120} autoFocus value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Masukkan nama akun" /></label>{edit && <>{([ ["username", "Username / identifier", false], ["avatarUrl", "URL foto profil", false], ["core", "Core", true], ["subCore", "Sub-core", false], ["platform", "Platform", false] ] as const).map(([key, label, required]) => <label className="form-field" key={key}>{label}<input required={required} type={key === "avatarUrl" ? "url" : "text"} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}<label className="form-field full">Password baru (kosongkan jika tidak ingin mengubah)<span className="user-password-field"><input type={showAccountPassword ? "text" : "password"} autoComplete="new-password" maxLength={200} value={draft.password} onChange={event => setDraft({ ...draft, password: event.target.value })} /><button type="button" className="password-toggle" aria-label={showAccountPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showAccountPassword} onClick={() => setShowAccountPassword(value => !value)}>{showAccountPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label></>}<label className="form-field full">Catatan<textarea rows={3} maxLength={4000} value={draft.internalNotes} onChange={event => setDraft({ ...draft, internalNotes: event.target.value })} placeholder="Catatan opsional tentang akun ini" /></label></div><div className="modal-actions"><button type="button" className="btn" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan akun"}</button></div></form></div>}
    {details && <div className="modal-backdrop" onClick={() => setDetails(null)}><section role="dialog" aria-modal="true" aria-labelledby="account-detail-title" className="modal account-detail-modal" onClick={event => event.stopPropagation()}><div className="account-modal-heading"><div><h2 id="account-detail-title" className="modal-title">{details.name}</h2><p className="page-subtitle">{details.username || "Tanpa username"} · {details.core}{details.subCore ? ` / ${details.subCore}` : ""}</p></div><button className="btn btn-sm" onClick={() => setDetails(null)} aria-label="Tutup detail"><X size={14} /></button></div>
      <div className="notice account-info-note">{details.platform || "Platform tidak diisi"} · {details.isActive ? "Aktif" : "Belum Aktif"}<div>Dibuat {dateLabel(details.createdAt)} · Diperbarui {dateLabel(details.updatedAt)}</div></div>
      {admin && <section className="private-notes-section"><div className="private-notes-title"><h3 className="panel-title"><StickyNote size={15} />Catatan privat</h3><span>Hanya admin</span></div><form className="private-note-form" onSubmit={saveNote}><textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} maxLength={4000} placeholder={editingNote ? "Ubah isi catatan..." : "Tambahkan catatan internal tentang akun ini..."} aria-label="Isi catatan privat" required /><div className="private-note-form-foot"><small>{noteDraft.length}/4000</small><div>{editingNote && <button type="button" className="btn btn-sm" onClick={() => { setEditingNote(null); setNoteDraft(""); }}>Batal edit</button>}<button className="btn btn-primary btn-sm" disabled={notesBusy || !noteDraft.trim()}>{notesBusy ? "Menyimpan..." : editingNote ? "Simpan perubahan" : "Tambah catatan"}</button></div></div></form>{noteError && <p className="private-note-error" role="alert">{noteError}</p>}{notesBusy && !notes.length ? <p className="muted">Memuat catatan...</p> : notes.length ? <div className="private-note-list">{notes.map(note => <article className="private-note-card" key={note.id}><p>{note.content}</p><div className="private-note-meta"><span>{note.author?.name ?? "Pengguna dihapus"}<small>Dibuat {dateLabel(note.createdAt)}{note.updatedAt !== note.createdAt ? ` · Diperbarui ${dateLabel(note.updatedAt)}` : ""}</small></span><div><button type="button" className="btn btn-sm" onClick={() => editNote(note)} aria-label="Edit catatan"><Pencil size={13} /></button><button type="button" className="btn btn-sm danger-action" onClick={() => void deleteNote(note)} aria-label="Hapus catatan"><Trash2 size={13} /></button></div></div></article>)}</div> : <p className="muted">Belum ada catatan privat.</p>}</section>}
      <h3 className="panel-title account-section-heading">Status terbaru</h3>{details.uploads.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Tanggal</th><th>Status</th><th>Catatan tracker</th></tr></thead><tbody>{details.uploads.slice(0, 8).map(upload => <tr key={upload.id}><td>{String(upload.date).slice(0, 10)}</td><td>{statusLabels[upload.status] ?? upload.status}</td><td>{upload.notes || "—"}</td></tr>)}</tbody></table></div> : <p className="muted">Belum ada status tracker.</p>}<h3 className="panel-title account-section-heading">Aktivitas terbaru</h3>{details.activities.length ? <div className="activity-list">{details.activities.slice(0, 6).map(item => <div className="activity-row" key={item.id}><div className="activity-copy"><strong>{item.actor.name}</strong> · {item.description}<div className="activity-time">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</div></div></div>)}</div> : <p className="muted">Belum ada aktivitas.</p>}</section></div>}
    {detailBusy && !details && <div className="toast" role="status">Memuat detail akun...</div>}{toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
