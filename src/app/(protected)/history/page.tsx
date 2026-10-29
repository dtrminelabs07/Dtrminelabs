"use client";
import { useEffect, useState } from "react";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

type Item = { id: string; description: string; createdAt: string; previousStatus: string | null; newStatus: string | null; account: { name: string } | null; accountName: string | null; actor: { name: string }; dailyUpload: { date: string } | null };
type Option = { id: string; name: string };
const labels: Record<string, string> = { COMPLETED: "Selesai", PENDING: "Belum dikerjakan", UPLOADED: "Sudah upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };

export default function HistoryPage() {
  const [items, setItems] = useState<Item[]>([]); const [accounts, setAccounts] = useState<Option[]>([]); const [users, setUsers] = useState<Option[]>([]);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [status, setStatus] = useState(""); const [accountId, setAccountId] = useState(""); const [actorId, setActorId] = useState(""); const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true); const [exporting, setExporting] = useState(false); const [error, setError] = useState("");
  useEffect(() => { const selectedAccount = new URLSearchParams(window.location.search).get("accountId"); if (selectedAccount) setAccountId(selectedAccount); }, []);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    async function load() {
      setBusy(true); setError("");
      const params = new URLSearchParams({ page: String(page) });
      if (from) params.set("from", from); if (to) params.set("to", to); if (status) params.set("status", status);
      if (accountId) params.set("accountId", accountId); if (actorId) params.set("actorId", actorId); if (query) params.set("q", query);
      try {
        const response = await fetch("/api/history?" + params, { signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Riwayat gagal dimuat.");
        if (active) { setItems(data.items ?? []); setAccounts(data.accounts ?? []); setUsers(data.users ?? []); setPages(data.pages ?? 1); }
      } catch (reason) { if (active && !(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Riwayat gagal dimuat."); }
      finally { if (active) setBusy(false); }
    }
    void load(); return () => { active = false; controller.abort(); };
  }, [page, from, to, status, accountId, actorId, query]);
  async function exportHistory() {
    if (from && to && from > to) { setError("Tanggal awal tidak boleh melewati tanggal akhir."); return; }
    setExporting(true); setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from); if (to) params.set("to", to);
      if (accountId) params.set("accountId", accountId); if (actorId) params.set("actorId", actorId);
      if (status) params.set("status", status); if (query) params.set("q", query);
      const response = await fetch("/api/history/export?" + params);
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "Ekspor riwayat gagal."); }
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a");
      link.href = url; link.download = "dtrminelabs-riwayat-" + (from || "awal") + "-" + (to || "sekarang") + ".xlsx"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ekspor riwayat gagal."); }
    finally { setExporting(false); }
  }
  const reset = () => { setQuery(""); setFrom(""); setTo(""); setStatus(""); setAccountId(""); setActorId(""); setPage(1); };
  return <main className="page history-page">
    <div className="page-title-row"><div><div className="home-kicker"><Search size={13} /> ACTIVITY LOG</div><h1 className="page-title">Riwayat</h1><p className="page-subtitle">Jejak perubahan status tersimpan dan tidak dapat diubah oleh pengguna.</p></div></div>
    {error && <div className="notice" role="alert">{error}</div>}
    <section className="panel">
      <div className="matrix-tools history-filter-tools">
        <label className="global-search"><Search size={14} /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Cari akun atau aktivitas..." aria-label="Cari aktivitas" /></label>
        <label className="history-date-field">Dari<input className="field" type="date" aria-label="Dari tanggal" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label>
        <label className="history-date-field">Sampai<input className="field" type="date" aria-label="Sampai tanggal" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} /></label>
        <select className="select" aria-label="Filter akun" value={accountId} onChange={event => { setAccountId(event.target.value); setPage(1); }}><option value="">Semua akun</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
        <select className="select" aria-label="Filter status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Semua status</option>{Object.entries(labels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
        <select className="select" aria-label="Filter pengguna" value={actorId} onChange={event => { setActorId(event.target.value); setPage(1); }}><option value="">Semua pengguna</option>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <button className="btn btn-sm" onClick={reset}>Reset</button><button className="btn btn-primary btn-sm" disabled={exporting} onClick={() => void exportHistory()}><Download size={13} />{exporting ? "Mengekspor..." : "Ekspor Excel"}</button>
      </div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Waktu</th><th>Akun / tanggal terdampak</th><th>Perubahan status</th><th>Catatan aktivitas</th><th>Pengguna</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</td><td><strong>{item.account?.name ?? item.accountName ?? "Akun dihapus"}</strong><div className="muted" style={{ fontSize: 10, marginTop: 3 }}>{item.dailyUpload?.date ? String(item.dailyUpload.date).slice(0, 10) : "—"}</div></td><td>{item.previousStatus ? labels[item.previousStatus] : "Baru"} → {item.newStatus ? labels[item.newStatus] : "—"}</td><td>{item.description}</td><td>{item.actor.name}</td></tr>)}</tbody></table>{busy ? <div className="empty">Memuat riwayat...</div> : items.length === 0 && <div className="empty">Belum ada aktivitas untuk filter ini.</div>}</div>
      <div className="history-pagination"><span className="muted">Halaman {page} dari {pages}</span><div><button className="btn btn-sm" disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={14} /></button><button className="btn btn-sm" disabled={page >= pages || busy} onClick={() => setPage(value => value + 1)} aria-label="Halaman selanjutnya"><ChevronRight size={14} /></button></div></div>
    </section>
  </main>;
}
