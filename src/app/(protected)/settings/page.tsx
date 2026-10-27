"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- This navigates to the CSV download endpoint. */
import { useEffect, useState } from "react";
import { Download, FileUp, ShieldCheck } from "lucide-react";
import { parseCsv } from "@/lib/csv";

type Preview = { total: number; valid: number; errors: { row: number; message: string }[]; duplicates: { row: number; message: string }[]; conflicts: { row: number; message: string }[]; canImport: boolean };
type AccountOption = { id: string; name: string };
const statusLabels: Record<string, string> = { COMPLETED: "Sudah", PENDING: "Belum", UPLOADED: "Sudah Upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok Habis", HOLIDAY: "Libur" };

export default function SettingsPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/accounts?active=all")
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Daftar akun gagal dimuat.");
        if (active) setAccounts(Array.isArray(data) ? data.map((item: AccountOption) => ({ id: item.id, name: item.name })) : []);
      })
      .catch(cause => { if (active) { setError(true); setMessage(cause instanceof Error ? cause.message : "Daftar akun gagal dimuat."); } });
    return () => { active = false; };
  }, []);

  async function file(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selected = input.files?.[0];
    if (!selected) return;
    setMessage(""); setError(false); setPreview(null);
    try {
      const grid = parseCsv((await selected.text()).replace(/^\uFEFF/, ""));
      if (grid.length < 2) throw new Error("CSV harus memiliki header dan sedikitnya satu baris data.");
      const headers = grid[0].map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim().toLowerCase());
      const required = ["date", "account", "status"];
      const allowed = new Set([...required, "notes"]);
      if (required.some(header => !headers.includes(header))) throw new Error("Header wajib: date, account, status. Kolom opsional: notes.");
      if (headers.some((header, index) => headers.indexOf(header) !== index)) throw new Error("Header CSV tidak boleh berulang.");
      if (headers.some(header => !allowed.has(header))) throw new Error("Kolom tidak dikenal. Gunakan hanya date, account, status, notes.");
      const rows = grid.slice(1).map(columns => Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""])));
      setImportRows(rows);
      const response = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Validasi CSV gagal.");
      setPreview(data);
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : "CSV tidak dapat dibaca.");
    } finally { input.value = ""; }
  }

  async function commit() {
    if (!preview?.canImport) return;
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: importRows, commit: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impor gagal.");
      setMessage(`${data.imported} baris berhasil diimpor.`); setPreview(null); setImportRows([]);
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : "Impor gagal.");
    } finally { setBusy(false); }
  }

  function exportCsv() {
    if (!month) return;
    const params = new URLSearchParams({ month });
    if (accountId) params.set("accountId", accountId);
    if (status) params.set("status", status);
    window.location.assign(`/api/export?${params.toString()}`);
  }

  const issues = preview ? [...preview.errors, ...preview.duplicates, ...preview.conflicts] : [];
  return <main className="page">
    <div className="page-title-row"><div><h1 className="page-title">Pengaturan & impor</h1><p className="page-subtitle">Impor CSV dengan pratinjau, atau ekspor tracker sesuai filter.</p></div></div>
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Impor data CSV</div><div className="panel-sub">Validasi dan pratinjau sebelum data ditambahkan</div></div><FileUp size={17} color="#62adff" /></div>
        <div style={{ padding: 18 }}>
          <div className="notice">Format wajib: <code>date,account,status</code>. Kolom opsional: <code>notes</code>. Tanggal gunakan YYYY-MM-DD; status gunakan kode COMPLETED, PENDING, UPLOADED, LIMIT, OUT_OF_STOCK, atau HOLIDAY. Nama akun harus sama dengan data di Akun.</div>
          <div className="filters" style={{ marginTop: 14 }}><label className="btn" style={{ cursor: "pointer" }}><FileUp size={14} />Pilih file CSV<input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={file} /></label><a className="btn" href={`data:text/csv;charset=utf-8,${encodeURIComponent("date,account,status,notes\r\n")}`} download="dtrminelabs-template.csv">Unduh template</a></div>
          {preview && <div style={{ marginTop: 16 }}><div className="panel-title">Hasil validasi</div><p className="muted" style={{ fontSize: 11 }}>{preview.valid} baris valid dari {preview.total} · {preview.errors.length} kesalahan · {preview.duplicates.length + preview.conflicts.length} duplikat</p>{issues.slice(0, 8).map((issue, index) => <div key={`${issue.row}-${index}`} className="notice" style={{ marginTop: 6, color: "#ffc981" }}>Baris {issue.row}: {issue.message}</div>)}{issues.length > 8 && <p className="muted">dan {issues.length - 8} masalah lainnya</p>}{preview.canImport && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={commit} disabled={busy}>{busy ? "Mengimpor..." : "Konfirmasi impor"}</button>}</div>}
          {message && <div className="notice" role={error ? "alert" : "status"} style={{ marginTop: 12, color: error ? "#ff929e" : "#62dfb5" }}>{message}</div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><div className="panel-title">Ekspor tracker</div><div className="panel-sub">Pilih periode dan filter opsional untuk CSV.</div></div><Download size={17} color="#62adff" /></div>
        <div style={{ padding: 18 }}>
          <div className="form-grid" style={{ marginTop: 0 }}>
            <label className="form-field">Bulan<input className="field" type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
            <label className="form-field">Akun<select className="select" value={accountId} onChange={event => setAccountId(event.target.value)}><option value="">Semua akun</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label className="form-field full">Status<select className="select" value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={exportCsv} disabled={!month}><Download size={14} />Unduh CSV</button>
        </div>
      </section>
    </div>
    <section className="panel" style={{ marginTop: 15 }}><div className="panel-head"><div><div className="panel-title">Keamanan workspace</div><div className="panel-sub">Autentikasi dan hak akses</div></div><ShieldCheck size={17} color="#10d6a0" /></div><div style={{ padding: 18 }} className="notice">Akun dibuat admin dan tidak ada pendaftaran publik. Perubahan data serta riwayat aktivitas divalidasi di server. Untuk mengundang staf, gunakan halaman Pengguna.</div></section>
  </main>;
}
