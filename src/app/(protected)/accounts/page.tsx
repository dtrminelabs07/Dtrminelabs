"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { History, Plus, Power, Search, UserRound, X } from "lucide-react";

type Account = { id: string; name: string; username: string | null; avatarUrl: string | null; core: string; subCore: string | null; platform: string | null; notes: string | null; isActive: boolean; createdAt: string; updatedAt: string };
type Draft = { name: string; username: string; avatarUrl: string; core: string; subCore: string; platform: string; notes: string };
const empty: Draft = { name: "", username: "", avatarUrl: "", core: "", subCore: "", platform: "", notes: "" };

export default function AccountsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [allRows, setAllRows] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("true");
  const [core, setCore] = useState("");
  const [subCore, setSubCore] = useState("");
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Account | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const cores = Array.from(new Set(allRows.map(row => row.core))).sort();
  const subCores = Array.from(new Set(allRows.filter(row => !core || row.core === core).map(row => row.subCore).filter((value): value is string => Boolean(value)))).sort();

  const load = useCallback(async () => {
    const params = new URLSearchParams({ active, q: query });
    if (core) params.set("core", core);
    if (subCore) params.set("subCore", subCore);
    const [accountResponse, sessionResponse] = await Promise.all([fetch(`/api/accounts?${params}`), fetch("/api/auth/session")]);
    const [accountData, sessionData] = await Promise.all([accountResponse.json(), sessionResponse.json()]);
    setRows(Array.isArray(accountData) ? accountData : []);
    setAdmin(sessionData.user?.role === "ADMIN");
  }, [active, core, query, subCore]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 160); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    void fetch("/api/accounts?active=all").then(response => response.json()).then(data => setAllRows(Array.isArray(data) ? data : []));
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q");
    if (initialQuery) setQuery(initialQuery);
    if (params.get("new") === "1") setModal(true);
  }, []);

  function start(account?: Account) {
    setEdit(account ?? null);
    setDraft(account ? { name: account.name, username: account.username ?? "", avatarUrl: account.avatarUrl ?? "", core: account.core, subCore: account.subCore ?? "", platform: account.platform ?? "", notes: account.notes ?? "" } : empty);
    setModal(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const payload = { ...draft, username: draft.username || null, avatarUrl: draft.avatarUrl || null, subCore: draft.subCore || null, platform: draft.platform || null, notes: draft.notes || null };
      const response = await fetch(edit ? `/api/accounts/${edit.id}` : "/api/accounts", { method: edit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setToast(edit ? "Akun diperbarui" : "Akun ditambahkan"); setModal(false); await load();
      const all = await fetch("/api/accounts?active=all").then(result => result.json()); setAllRows(Array.isArray(all) ? all : []);
    } catch (error) { setToast(error instanceof Error ? error.message : "Gagal menyimpan akun"); }
    finally { setBusy(false); window.setTimeout(() => setToast(""), 3000); }
  }
  async function toggle(account: Account) {
    if (!window.confirm(`${account.isActive ? "Nonaktifkan" : "Aktifkan"} akun ${account.name}? Riwayat tracker tetap disimpan.`)) return;
    const response = await fetch(`/api/accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !account.isActive }) });
    if (response.ok) { setToast(account.isActive ? "Akun dinonaktifkan" : "Akun diaktifkan"); await load(); const all = await fetch("/api/accounts?active=all").then(result => result.json()); setAllRows(Array.isArray(all) ? all : []); }
    else setToast("Perubahan gagal disimpan");
  }

  return <main className="page">
    <div className="page-title-row"><div><h1 className="page-title">Akun</h1><p className="page-subtitle">Kelola akun, kategori, dan status keaktifan.</p></div>{admin && <button className="btn btn-primary" onClick={() => start()}><Plus size={15} />Tambah akun</button>}</div>
    <section className="panel"><div className="matrix-tools"><label className="global-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, username, core..." aria-label="Cari akun" /></label>
      <select className="select" aria-label="Filter core" value={core} onChange={event => { setCore(event.target.value); setSubCore(""); }}><option value="">Semua core</option>{cores.map(value => <option key={value}>{value}</option>)}</select>
      <select className="select" aria-label="Filter sub-core" value={subCore} onChange={event => setSubCore(event.target.value)}><option value="">Semua sub-core</option>{subCores.map(value => <option key={value}>{value}</option>)}</select>
      <select className="select" aria-label="Filter status akun" value={active} onChange={event => setActive(event.target.value)}><option value="true">Akun aktif</option><option value="false">Akun nonaktif</option><option value="all">Semua akun</option></select><span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>{rows.length} akun</span>
    </div><div className="table-wrap"><table className="data-table"><thead><tr><th>Akun</th><th>Core / Sub-core</th><th>Platform</th><th>Status</th><th>Diperbarui</th><th>Aksi</th></tr></thead><tbody>{rows.map(account => <tr key={account.id}><td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div className="avatar" style={account.avatarUrl ? { backgroundImage: `url(${account.avatarUrl})`, backgroundSize: "cover", color: "transparent" } : undefined}>{account.avatarUrl ? " " : <UserRound size={15} />}</div><div><strong>{account.name}</strong><div className="muted" style={{ fontSize: 10, marginTop: 3 }}>{account.username || "Tanpa username"}</div></div></div></td><td>{account.core}<div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{account.subCore || "—"}</div></td><td>{account.platform || "—"}</td><td><span className={`status-pill ${account.isActive ? "status-completed" : "cell-empty"}`}>{account.isActive ? "Aktif" : "Nonaktif"}</span></td><td className="muted">{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(account.updatedAt))}</td><td><div style={{ display: "flex", gap: 6 }}><Link className="btn btn-sm" href={`/history?accountId=${account.id}`} title="Riwayat akun"><History size={13} /></Link>{admin && <><button className="btn btn-sm" onClick={() => start(account)}>Edit</button><button className="btn btn-sm" onClick={() => void toggle(account)} title={account.isActive ? "Nonaktifkan" : "Aktifkan"}><Power size={13} /></button></>}</div></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty">Belum ada akun yang sesuai.</div>}</div></section>
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="modal" onSubmit={submit} onClick={event => event.stopPropagation()}><div style={{ display: "flex", justifyContent: "space-between" }}><div><h2 className="modal-title">{edit ? "Edit akun" : "Tambah akun"}</h2><p className="page-subtitle">Detail akun yang digunakan pada tracker.</p></div><button type="button" className="btn btn-sm" onClick={() => setModal(false)} aria-label="Tutup"><X size={14} /></button></div><div className="form-grid">{([["name", "Nama akun", true], ["username", "Username / identifier", false], ["avatarUrl", "URL foto profil", false], ["core", "Core", true], ["subCore", "Sub-core", false], ["platform", "Platform", false]] as const).map(([key, label, required]) => <label className="form-field" key={key}>{label}<input required={required} type={key === "avatarUrl" ? "url" : "text"} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}<label className="form-field full">Catatan<textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label></div><div className="modal-actions"><button type="button" className="btn" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan akun"}</button></div></form></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
