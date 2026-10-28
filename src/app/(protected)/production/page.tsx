"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Box, CheckCircle2, Clock3, PackagePlus, Search, Settings2, UserRound, X } from "lucide-react";

type AccountRow = { id: string; name: string; username: string | null; isActive: boolean; planned: number; completed: number; doneProducts: number; inProgress: number; notStarted: number; progress: number; productCount: number };
type Summary = { accounts: number; planned: number; completed: number; doneProducts: number; inProgress: number; notStarted: number; progress: number };
type DashboardData = { accounts: AccountRow[]; totals: Summary };

const blankSummary: Summary = { accounts: 0, planned: 0, completed: 0, doneProducts: 0, inProgress: 0, notStarted: 0, progress: 0 };

export default function ProductionDashboardPage() {
  const [data, setData] = useState<DashboardData>({ accounts: [], totals: blankSummary });
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [target, setTarget] = useState("1");
  const [requestKey, setRequestKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true); setError("");
    try {
      const [response, sessionResponse] = await Promise.all([fetch("/api/production", { cache: "no-store", signal }), fetch("/api/auth/session", { cache: "no-store", signal })]);
      const [payload, session] = await Promise.all([response.json(), sessionResponse.json()]);
      if (!response.ok) throw new Error(payload.error || "Dashboard produksi gagal dimuat.");
      if (signal?.aborted) return;
      setData(payload as DashboardData); setAdmin(session.user?.role === "ADMIN");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Dashboard produksi gagal dimuat.");
    } finally { if (!signal?.aborted) setBusy(false); }
  }, []);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const visibleAccounts = useMemo(() => data.accounts.filter(account => (stateFilter === "all" || (stateFilter === "inactive" ? !account.isActive : account.isActive)) && (!query.trim() || `${account.name} ${account.username ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))), [data.accounts, query, stateFilter]);
  const activeAccounts = useMemo(() => data.accounts.filter(account => account.isActive), [data.accounts]);

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, requestKey, name, targetCount: Number(target) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Produk gagal ditambahkan.");
      setMessage("Produk berhasil ditambahkan."); setModal(false); setName(""); setTarget("1"); setRequestKey(""); await load();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Produk gagal ditambahkan."); }
    finally { setSaving(false); }
  }

  return <main className="page production-page">
    <div className="page-title-row"><div><div className="production-eyebrow"><Activity size={14}/>WORKSPACE PRODUKSI</div><h1 className="page-title">Production Dashboard</h1><p className="page-subtitle">Pantau target, progres, dan kendala produksi untuk setiap akun.</p></div>{admin && <button className="btn btn-primary" onClick={() => { setAccountId(activeAccounts[0]?.id ?? ""); setRequestKey(crypto.randomUUID()); setModal(true); }} disabled={!activeAccounts.length}><PackagePlus size={15}/>Tambah produk</button>}</div>
    {error && <div className="notice production-error" role="alert">{error}<button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div>}
    {message && !modal && <div className="notice production-notice" role="status">{message}<button className="production-notice-close" onClick={() => setMessage("")} aria-label="Tutup notifikasi"><X size={14}/></button></div>}
    <section className="production-kpis" aria-label="Ringkasan produksi">
      <article className="production-kpi"><span><UserRound size={15}/>Akun produksi</span><strong>{busy ? "—" : data.totals.accounts}</strong><small>termasuk akun nonaktif</small></article>
      <article className="production-kpi"><span><Box size={15}/>Target unit</span><strong>{busy ? "—" : data.totals.planned.toLocaleString("id-ID")}</strong><small>jumlah unit direncanakan</small></article>
      <article className="production-kpi tone-green"><span><CheckCircle2 size={15}/>Produk selesai</span><strong>{busy ? "—" : data.totals.doneProducts}</strong><small>{busy ? "Memuat" : `${data.totals.completed.toLocaleString("id-ID")} unit selesai`}</small></article>
      <article className="production-kpi tone-amber"><span><Clock3 size={15}/>Dalam proses</span><strong>{busy ? "—" : data.totals.inProgress}</strong><small>{busy ? "Memuat" : `${data.totals.notStarted} belum dimulai`}</small></article>
    </section>
    <section className="panel production-overview">
      <div className="production-overview-head"><div><h2 className="panel-title">Progres keseluruhan</h2><p className="panel-sub">Perbandingan unit yang selesai dengan seluruh target aktif produksi</p></div><strong>{busy ? "—" : `${data.totals.progress}%`}</strong></div>
      <div className="production-progress-track"><i style={{ width: `${busy ? 0 : data.totals.progress}%` }}/></div>
      <div className="production-overview-foot"><span>{busy ? "Memuat data produksi…" : `${data.totals.completed.toLocaleString("id-ID")} dari ${data.totals.planned.toLocaleString("id-ID")} unit selesai`}</span><span>{data.totals.doneProducts} produk completed · {data.totals.inProgress} on progress · {data.totals.notStarted} belum dimulai</span></div>
    </section>
    <section className="production-accounts-section">
      <div className="production-list-heading"><div><h2>Akun produksi</h2><p>Pilih akun untuk melihat daftar dan riwayat produknya.</p></div><div className="production-filters"><label className="global-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari akun…" aria-label="Cari akun produksi"/></label><select className="select" value={stateFilter} onChange={event => setStateFilter(event.target.value)} aria-label="Filter status akun"><option value="all">Semua akun</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div></div>
      {busy && !data.accounts.length ? <div className="production-empty">Memuat akun produksi…</div> : visibleAccounts.length ? <div className="production-account-grid">{visibleAccounts.map(account => <Link key={account.id} href={`/production/accounts/${account.id}`} className={`production-account-card${account.isActive ? "" : " is-inactive"}`}>
        <div className="production-account-top"><span className="production-account-icon"><UserRound size={17}/></span><span className={`production-state ${account.isActive ? "active" : "inactive"}`}>{account.isActive ? "Aktif" : "Nonaktif"}</span></div>
        <strong className="production-account-name">{account.name}</strong><small className="production-account-username">{account.username || "Identifier belum diatur"}</small>
        <div className="production-account-progress"><span>Progres produksi</span><b>{account.progress}%</b></div><div className="production-progress-track compact"><i style={{ width: `${account.progress}%` }}/></div>
        <div className="production-account-metrics"><span>{account.productCount} produk <small>· {account.planned} unit target</small></span><span>{account.doneProducts} selesai · {account.inProgress} proses</span></div>
      </Link>)}</div> : <div className="production-empty"><Settings2 size={20}/><strong>Tidak ada akun yang cocok</strong><span>{data.accounts.length ? "Ubah pencarian atau filter status." : "Akun yang sudah ada akan tampil di sini setelah ditambahkan."}</span></div>}
    </section>
    {modal && admin && <div className="modal-backdrop" onClick={() => !saving && setModal(false)}><form className="modal production-modal" onSubmit={addProduct} onClick={event => event.stopPropagation()}><div className="account-modal-heading"><div><h2 className="modal-title">Tambah produk</h2><p className="page-subtitle">Produk dikaitkan langsung dengan akun yang dipilih.</p></div><button type="button" className="btn btn-sm" onClick={() => setModal(false)} aria-label="Tutup"><X size={14}/></button></div><div className="form-grid"><label className="form-field full">Akun<select required value={accountId} onChange={event => setAccountId(event.target.value)}><option value="" disabled>Pilih akun aktif</option>{activeAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="form-field full">Nama produk<input required maxLength={160} value={name} onChange={event => setName(event.target.value)} placeholder="Contoh: Foto katalog utama"/></label><label className="form-field full">Target jumlah<input required type="number" min={1} max={1000000} step={1} value={target} onChange={event => setTarget(event.target.value)}/></label></div>{message && <div className="notice production-error" role="alert">{message}</div>}<div className="modal-actions"><button type="button" className="btn" disabled={saving} onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={saving || !accountId}>{saving ? "Menyimpan…" : "Simpan produk"}</button></div></form></div>}
  </main>;
}
