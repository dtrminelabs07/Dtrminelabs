"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download, Grid2X2, List, Search, UserPlus, X } from "lucide-react";
import TrackerMatrix from "@/components/tracker-matrix";

const statuses = ["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as const;
type Status = typeof statuses[number];
type Account = { id: string; name: string; username: string | null; core: string; subCore: string | null };
type Upload = { id: string; accountId: string; date: string; status: Status; notes: string | null };
const labels: Record<Status, string> = { COMPLETED: "Selesai", PENDING: "Belum dikerjakan", UPLOADED: "Sudah upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };
const localDayKey = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const field = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return field("year") + "-" + field("month") + "-" + field("day");
};
const todayKey = () => localDayKey(new Date());

export default function DailyTracker() {
  const router = useRouter(); const [date, setDate] = useState(todayKey); const [accounts, setAccounts] = useState<Account[]>([]); const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [filter, setFilter] = useState(""); const [sort, setSort] = useState("name");
  const [canManageAccounts, setCanManageAccounts] = useState(false);
  const [view, setView] = useState<"list" | "matrix">("list"); const [page, setPage] = useState(1); const [refreshVersion, setRefreshVersion] = useState(0); const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<Account | null>(null); const [selectedStatus, setSelectedStatus] = useState<Status>("PENDING"); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { const params = new URLSearchParams(window.location.search); const initialDate = params.get("date"); if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) setDate(initialDate); const initialStatus = params.get("status"); if (initialStatus === "UNRECORDED" || (initialStatus !== null && statuses.includes(initialStatus as Status))) setFilter(initialStatus ?? ""); }, []);
  useEffect(() => { const controller = new AbortController(); void fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" }).then(response => response.json()).then(session => { if (!controller.signal.aborted) setCanManageAccounts(session.user?.role === "ADMIN"); }).catch(() => undefined); return () => controller.abort(); }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true); setError("");
    try { const response = await fetch("/api/tracker?date=" + date, { signal }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Tracker gagal dimuat."); setAccounts(data.accounts ?? []); setUploads(data.uploads ?? []); }
    catch (reason) { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(reason instanceof Error ? reason.message : "Tracker gagal dimuat."); setAccounts([]); setUploads([]); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [date]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, refreshVersion]);
  const uploadByAccount = useMemo(() => new Map(uploads.map(upload => [upload.accountId, upload])), [uploads]);
  const counts = useMemo(() => { const result: Record<Status, number> = { COMPLETED: 0, PENDING: 0, UPLOADED: 0, LIMIT: 0, OUT_OF_STOCK: 0, HOLIDAY: 0 }; for (const upload of uploads) result[upload.status]++; return result; }, [uploads]);
  const unrecorded = Math.max(0, accounts.length - uploads.length);
  const filtered = useMemo(() => accounts.filter(account => {
    const upload = uploadByAccount.get(account.id);
    if (filter === "UNRECORDED" && upload) return false;
    if (filter && filter !== "UNRECORDED" && upload?.status !== filter) return false;
    const haystack = (account.name + " " + (account.username || "") + " " + account.core + " " + (account.subCore || "")).toLowerCase();
    return !search.trim() || haystack.includes(search.trim().toLowerCase());
  }).sort((a, b) => sort === "name-desc" ? b.name.localeCompare(a.name) : sort === "core" ? a.core.localeCompare(b.core) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [accounts, filter, search, sort, uploadByAccount]);
  const pageSize = 30; const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const updateDate = (value: string) => { if (!value) return; setDate(value); setPage(1); router.replace("/tracker?date=" + value + (filter ? "&status=" + filter : ""), { scroll: false }); };
  const moveDate = (delta: number) => { const current = new Date(date + "T12:00:00"); current.setDate(current.getDate() + delta); updateDate(localDayKey(current)); };
  const chooseToday = () => updateDate(todayKey());
  const openEditor = (account: Account) => { const upload = uploadByAccount.get(account.id); setEditing(account); setSelectedStatus(upload?.status ?? "PENDING"); setNotes(upload?.notes ?? ""); };
  const save = async () => {
    if (!editing) return; setSaving(true); setError("");
    try { const response = await fetch("/api/tracker", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: editing.id, date, status: selectedStatus, notes: notes.trim() || null }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Status gagal disimpan."); setEditing(null); setToast("Status berhasil disimpan."); setRefreshVersion(value => value + 1); window.setTimeout(() => setToast(""), 2800); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Status gagal disimpan."); }
    finally { setSaving(false); }
  };
  const exportDate = () => { const params = new URLSearchParams({ date, format: "xlsx" }); if (filter && filter !== "UNRECORDED") params.set("status", filter); const link = document.createElement("a"); link.href = "/api/export?" + params; link.download = "dtrminelabs-tracker-" + date + ".xlsx"; link.click(); };
  const dayLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(date + "T12:00:00"));
  return <main className="page daily-page">
    <div className="page-title-row daily-heading"><div><h1 className="page-title">Upload Tracker</h1><p className="page-subtitle">Pantau dan kelola aktivitas upload setiap hari.</p></div><div className="daily-date-controls"><button className="btn btn-sm" onClick={() => moveDate(-1)} aria-label="Hari sebelumnya"><ChevronLeft size={15} /></button><label className="daily-date-picker btn btn-sm"><CalendarDays size={14} /><span>{dayLabel}</span><input type="date" aria-label="Pilih tanggal tracker" value={date} onChange={event => updateDate(event.target.value)} /></label><button className="btn btn-sm" onClick={() => moveDate(1)} aria-label="Hari berikutnya"><ChevronRight size={15} /></button><button className="btn btn-sm today-button" onClick={chooseToday}>Hari ini</button></div></div>

    {error && <div className="notice" role="alert">{error}</div>}
    <section className="daily-stat-grid" aria-label="Ringkasan status tanggal terpilih">
      <button className="daily-stat daily-total" onClick={() => { setFilter(""); setPage(1); }}><span>Total akun aktif</span><strong>{busy ? "-" : accounts.length}</strong><small>100%</small></button>
      {(["COMPLETED", "PENDING", "UPLOADED", "LIMIT"] as const).map(status => <button key={status} className={"daily-stat tone-" + status.toLowerCase() + (filter === status ? " selected" : "")} onClick={() => { setFilter(value => value === status ? "" : status); setPage(1); }}><span>{labels[status]}</span><strong>{busy ? "—" : counts[status]}</strong><small>{accounts.length ? Math.round(counts[status] / accounts.length * 100) : 0}% akun</small></button>)}
      <button className={"daily-stat tone-unrecorded" + (filter === "UNRECORDED" ? " selected" : "")} onClick={() => { setFilter(value => value === "UNRECORDED" ? "" : "UNRECORDED"); setPage(1); }}><span>Tanpa status</span><strong>{busy ? "-" : unrecorded}</strong><small>{accounts.length ? Math.round(unrecorded / accounts.length * 100) : 0}%</small></button>


    </section>
    <section className="panel daily-workspace"><div className="daily-toolbar"><label className="global-search"><Search size={14} /><input aria-label="Cari akun tracker" placeholder="Cari nama atau username akun..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><select className="select" aria-label="Filter status tracker" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="">Semua status</option><option value="UNRECORDED">Tanpa status</option>{statuses.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select><select className="select" aria-label="Urutkan akun tracker" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Nama A–Z</option><option value="name-desc">Nama Z–A</option><option value="core">Kategori</option></select><div className="daily-toolbar-spacer" /><div className="view-toggle" role="group" aria-label="Tampilan tracker"><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="Tampilan daftar"><List size={15} /></button><button className={view === "matrix" ? "active" : ""} onClick={() => setView("matrix")} aria-label="Tampilan matriks bulanan"><Grid2X2 size={15} /></button></div><button className="btn btn-sm" onClick={exportDate} disabled={busy}><Download size={14} />Ekspor</button></div>
      {view === "matrix" ? <div className="daily-matrix-wrap"><TrackerMatrix isAdmin={canManageAccounts} /></div> : <><div className="daily-table-wrap"><table className="daily-table"><thead><tr><th className="daily-number">No.</th><th>Nama akun</th><th>Status ({new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date + "T12:00:00"))})</th><th className="daily-actions-head">Aksi</th></tr></thead><tbody>{rows.map((account, index) => { const upload = uploadByAccount.get(account.id); return <tr key={account.id}><td className="daily-number">{(page - 1) * pageSize + index + 1}</td><td><div className="daily-account-cell"><span className="daily-account-avatar" aria-hidden="true">{account.name.trim().slice(0, 1).toUpperCase()}</span><span className="daily-account-copy"><span className="daily-account-name">{account.name}</span>{account.username && <small className="muted">{account.username}</small>}</span></div></td><td>{upload ? <span title={upload.notes || labels[upload.status]} className={"status-pill daily-status-pill status-" + upload.status.toLowerCase()}><i className="status-indicator" />{labels[upload.status]}</span> : <span className="status-pill daily-status-pill status-unrecorded"><i className="status-indicator" />Tanpa status</span>}</td><td className="daily-actions-cell"><button className="btn btn-sm daily-row-action" onClick={() => openEditor(account)} aria-label={"Perbarui status " + account.name}><ChevronDown size={14} /></button></td></tr>; })}</tbody></table>{!busy && accounts.length === 0 && <div className="empty daily-empty"><strong>Belum ada akun aktif</strong><span>Tambahkan akun di menu Akun untuk memulai tracking.</span><Link className="btn btn-primary btn-sm" href="/accounts">Buka Akun</Link></div>}{!busy && accounts.length > 0 && rows.length === 0 && <div className="empty daily-empty">Tidak ada akun yang cocok dengan filter.</div>}{busy && <div className="daily-inline-loading" role="status">Memuat status untuk {date}...</div>}</div><div className="daily-pagination"><span>{filtered.length ? (page - 1) * pageSize + 1 + "–" + Math.min(page * pageSize, filtered.length) + " dari " + filtered.length + " akun" : "0 akun"}</span><div><button className="btn btn-sm" disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>Sebelumnya</button><span>Halaman {page} / {pages}</span><button className="btn btn-sm" disabled={page >= pages || busy} onClick={() => setPage(value => value + 1)}>Berikutnya</button></div></div></>}
    </section>
    {editing && <div className="modal-backdrop" onClick={() => setEditing(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="daily-edit-title" onClick={event => event.stopPropagation()}><div className="modal-heading-row"><div><h2 id="daily-edit-title" className="modal-title">Perbarui status</h2><p className="page-subtitle">{editing.name} · {date}</p></div><button className="btn btn-sm" onClick={() => setEditing(null)} aria-label="Tutup dialog"><X size={14} /></button></div><label className="form-field">Status<select className="select" value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as Status)}>{statuses.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></label><label className="form-field">Catatan opsional<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} placeholder="Tambahkan catatan untuk status ini" /></label><div className="modal-actions"><button className="btn" onClick={() => setEditing(null)} disabled={saving}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan perubahan"}</button></div></section></div>}
    {canManageAccounts && <div className="tracker-add-account-row"><Link className="btn btn-primary btn-sm" href="/accounts?new=1"><UserPlus size={14} />Tambah Akun</Link><span>Tambahkan akun target melalui pengelolaan akun.</span></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}
