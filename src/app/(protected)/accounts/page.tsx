"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, History, Plus, Power, Search, UserRound, X } from "lucide-react";

type Account = { id: string; name: string; username: string | null; avatarUrl: string | null; core: string; subCore: string | null; platform: string | null; notes: string | null; isActive: boolean; createdAt: string; updatedAt: string };
type AccountDetail = Account & { uploads: { id: string; date: string; status: string; notes: string | null; updatedAt: string }[]; activities: { id: string; description: string; createdAt: string; actor: { name: string } }[] };
type Draft = { name: string; username: string; avatarUrl: string; core: string; subCore: string; platform: string; notes: string };
const empty: Draft = { name: "", username: "", avatarUrl: "", core: "", subCore: "", platform: "", notes: "" };
const statusLabels: Record<string, string> = { COMPLETED: "Sudah", PENDING: "Belum", UPLOADED: "Sudah Upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };

export default function AccountsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [allRows, setAllRows] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("true");
  const [core, setCore] = useState("");
  const [subCore, setSubCore] = useState("");
  const [sort, setSort] = useState("core");
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Account | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [details, setDetails] = useState<AccountDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const cores = Array.from(new Set(allRows.map(row => row.core))).sort();
  const subCores = Array.from(new Set(allRows.filter(row => !core || row.core === core).map(row => row.subCore).filter((value): value is string => Boolean(value)))).sort();
  const displayRows = useMemo(() => [...rows].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : a.core.localeCompare(b.core) || (a.subCore ?? "").localeCompare(b.subCore ?? "") || a.name.localeCompare(b.name)), [rows, sort]);

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
  async function viewDetails(account: Account) {
    setDetailBusy(true);
    try {
      const response = await fetch(`/api/accounts/${account.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Detail akun gagal dimuat.");
      setDetails(data as AccountDetail);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Detail akun gagal dimuat.");
    } finally { setDetailBusy(false); }
  }

  return <main className="page">
    <div className="page-title-row"><div><h1 className="page-title">Akun</h1><p className="page-subtitle">Kelola akun, kategori, dan status keaktifan.</p></div>{admin && <button className="btn btn-primary" onClick={() => start()}><Plus size={15} />Tambah akun</button>}</div>
    <section className="panel"><div className="matrix-tools"><label className="global-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, username, core..." aria-label="Cari akun" /></label>
      <select className="select" aria-label="Filter core" value={core} onChange={event => { setCore(event.target.value); setSubCore(""); }}><option value="">Semua core</option>{cores.map(value => <option key={value}>{value}</option>)}</select>
      <select className="select" aria-label="Filter sub-core" value={subCore} onChange={event => setSubCore(event.target.value)}><option value="">Semua sub-core</option>{subCores.map(value => <option key={value}>{value}</option>)}</select>
      <select className="select" aria-label="Urutkan akun" value={sort} onChange={event => setSort(event.target.value)}><option value="core">Urutkan: Core</option><option value="name">Urutkan: Nama</option><option value="updated">Urutkan: Terbaru</option></select><select className="select" aria-label="Filter status akun" value={active} onChange={event => setActive(event.target.value)}><option value="true">Akun aktif</option><option value="false">Akun nonaktif</option><option value="all">Semua akun</option></select><span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>{rows.length} akun</span>
    </div><div className="table-wrap"><table className="data-table"><thead><tr><th>Akun</th><th>Core / Sub-core</th><th>Platform</th><th>Status</th><th>Diperbarui</th><th>Aksi</th></tr></thead><tbody>{displayRows.map(account => <tr key={account.id}><td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div className="avatar" style={account.avatarUrl ? { backgroundImage: `url(${account.avatarUrl})`, backgroundSize: "cover", color: "transparent" } : undefined}>{account.avatarUrl ? " " : <UserRound size={15} />}</div><div><strong>{account.name}</strong><div className="muted" style={{ fontSize: 10, marginTop: 3 }}>{account.username || "Tanpa username"}</div></div></div></td><td>{account.core}<div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{account.subCore || "—"}</div></td><td>{account.platform || "—"}</td><td><span className={`status-pill ${account.isActive ? "status-completed" : "cell-empty"}`}>{account.isActive ? "Aktif" : "Nonaktif"}</span></td><td className="muted">{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(account.updatedAt))}</td><td><div style={{ display: "flex", gap: 6 }}><button className="btn btn-sm" onClick={() => void viewDetails(account)} disabled={detailBusy} title="Detail akun" aria-label={`Detail ${account.name}`}><Eye size={13} /></button><Link className="btn btn-sm" href={`/history?accountId=${account.id}`} title="Riwayat akun"><History size={13} /></Link>{admin && <><button className="btn btn-sm" onClick={() => start(account)}>Edit</button><button className="btn btn-sm" onClick={() => void toggle(account)} title={account.isActive ? "Nonaktifkan" : "Aktifkan"}><Power size={13} /></button></>}</div></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty">{detailBusy ? "Memuat akun..." : allRows.length === 0 ? <><p>Belum ada akun. Tambahkan akun pertama untuk mulai mengelola tracker.</p>{admin && <button className="btn btn-primary" onClick={() => start()}><Plus size={14} />Tambah akun</button>}</> : "Belum ada akun yang sesuai filter."}</div>}</div></section>
    {modal && <div className="modal-backdrop" onClick={() => setModal(false)}><form className="modal" onSubmit={submit} onClick={event => event.stopPropagation()}><div style={{ display: "flex", justifyContent: "space-between" }}><div><h2 className="modal-title">{edit ? "Edit akun" : "Tambah akun"}</h2><p className="page-subtitle">Detail akun yang digunakan pada tracker.</p></div><button type="button" className="btn btn-sm" onClick={() => setModal(false)} aria-label="Tutup"><X size={14} /></button></div><div className="form-grid">{([["name", "Nama akun", true], ["username", "Username / identifier", false], ["avatarUrl", "URL foto profil", false], ["core", "Core", true], ["subCore", "Sub-core", false], ["platform", "Platform", false]] as const).map(([key, label, required]) => <label className="form-field" key={key}>{label}<input required={required} type={key === "avatarUrl" ? "url" : "text"} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}<label className="form-field full">Catatan<textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label></div><div className="modal-actions"><button type="button" className="btn" onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan akun"}</button></div></form></div>}
    {details && <div className="modal-backdrop" onClick={() => setDetails(null)}><section className="modal account-detail-modal" onClick={event => event.stopPropagation()}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><h2 className="modal-title">{details.name}</h2><p className="page-subtitle">{details.username || "Tanpa username"} · {details.core}{details.subCore ? ` / ${details.subCore}` : ""}</p></div><button className="btn btn-sm" onClick={() => setDetails(null)} aria-label="Tutup detail"><X size={14} /></button></div><div className="notice" style={{ marginTop: 14 }}>{details.platform || "Platform tidak diisi"} · {details.isActive ? "Aktif" : "Nonaktif"}{details.notes ? ` · ${details.notes}` : ""}<div style={{marginTop:6}}>Dibuat {new Intl.DateTimeFormat("id-ID", {dateStyle:"medium"}).format(new Date(details.createdAt))} · Diperbarui {new Intl.DateTimeFormat("id-ID", {dateStyle:"medium"}).format(new Date(details.updatedAt))}</div></div><h3 className="panel-title" style={{ marginTop: 18 }}>Status terbaru</h3>{details.uploads.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Tanggal</th><th>Status</th><th>Catatan</th></tr></thead><tbody>{details.uploads.slice(0, 8).map(upload => <tr key={upload.id}><td>{String(upload.date).slice(0, 10)}</td><td>{statusLabels[upload.status] ?? upload.status}</td><td>{upload.notes || "—"}</td></tr>)}</tbody></table></div> : <p className="muted">Belum ada status tracker.</p>}<h3 className="panel-title" style={{ marginTop: 18 }}>Aktivitas terbaru</h3>{details.activities.length ? <div className="activity-list">{details.activities.slice(0, 6).map(item => <div className="activity-row" key={item.id}><div className="activity-copy"><strong>{item.actor.name}</strong> · {item.description}<div className="activity-time">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</div></div></div>)}</div> : <p className="muted">Belum ada aktivitas.</p>}</section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
