"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Box, PackagePlus, Plus, X } from "lucide-react";
import { getProductionProgress, getProductionStatus, getProductionStatusLabel } from "@/lib/production-status";

type Product = { id: string; name: string; description: string | null; targetCount: number; completedCount: number; isArchived: boolean; updatedAt: string; _count: { comments: number } };
type Payload = { account: { id: string; name: string; username: string | null; platform: string | null; core: string; subCore: string | null; isActive: boolean; productionProducts: Product[] }; summary: { target: number; completed: number; progress: number; products: number; done: number; inProgress: number; notStarted: number; archived: number } };

function productStatus(product: Product) { return getProductionStatusLabel(product.completedCount, product.targetCount); }
function productTone(product: Product) { return getProductionStatus(product.completedCount, product.targetCount); }

export default function ProductionAccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const [accountId, setAccountId] = useState(""); const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false); const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [target, setTarget] = useState("1"); const [completed, setCompleted] = useState("0"); const [initialNote, setInitialNote] = useState(""); const [requestKey, setRequestKey] = useState(""); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { void params.then(({ accountId: id }) => setAccountId(id)); }, [params]);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!accountId) return;
    setBusy(true); setError("");
    try {
      const [response, sessionResponse] = await Promise.all([fetch(`/api/production/accounts/${accountId}`, { cache: "no-store", signal }), fetch("/api/auth/session", { cache: "no-store", signal })]);
      const [payload, session] = await Promise.all([response.json(), sessionResponse.json()]);
      if (!response.ok) throw new Error(payload.error || "Detail produksi gagal dimuat.");
      if (signal?.aborted) return;
      setData(payload as Payload); setAdmin(session.user?.role === "ADMIN");
    } catch (cause) { if (cause instanceof DOMException && cause.name === "AbortError") return; setError(cause instanceof Error ? cause.message : "Detail produksi gagal dimuat."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [accountId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data) return; setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, requestKey, name, description: description || null, targetCount: Number(target), completedCount: Number(completed), initialNote: initialNote || null }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Produk gagal ditambahkan.");
      setName(""); setDescription(""); setTarget("1"); setCompleted("0"); setInitialNote(""); setRequestKey(""); setModal(false); setMessage("Produk ditambahkan."); await load();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Produk gagal ditambahkan."); }
    finally { setSaving(false); }
  }
  function openAddProduct() { setRequestKey(crypto.randomUUID()); setModal(true); }

  const account = data?.account;
  const products = account?.productionProducts ?? [];
  return <main className="page production-page">
    <Link href="/production" className="production-back-link"><ArrowLeft size={15}/>Kembali ke dashboard produksi</Link>
    {error ? <div className="notice production-error" role="alert">{error}<button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div> : <>
      <div className="page-title-row production-account-title"><div><div className="production-eyebrow"><Box size={14}/>AKUN PRODUKSI</div><h1 className="page-title">{busy ? "Memuat akun…" : account?.name}</h1><p className="page-subtitle">{account?.username || "Identifier belum diatur"}{account?.platform ? ` · ${account.platform}` : ""}{account?.core ? ` · ${account.core}${account.subCore ? ` / ${account.subCore}` : ""}` : ""}</p></div>{admin && <button className="btn btn-primary" onClick={openAddProduct} disabled={!account?.isActive}><PackagePlus size={15}/>Tambah produk</button>}</div>
      {data && <section className="production-account-summary panel"><div className="production-summary-numbers"><div><span>Jumlah produk</span><strong>{data.summary.products}</strong></div><div><span>Total target</span><strong>{data.summary.target.toLocaleString("id-ID")}</strong></div><div><span>Progres selesai</span><strong>{data.summary.completed.toLocaleString("id-ID")} <small>/ {data.summary.target.toLocaleString("id-ID")}</small></strong></div><div><span>Progres keseluruhan</span><strong>{data.summary.progress}%</strong></div></div><div className="production-progress-track"><i style={{ width: `${data.summary.progress}%` }}/></div><div className="production-account-status-summary"><span><i className="state-dot done"/>{data.summary.done} selesai</span><span><i className="state-dot progress"/>{data.summary.inProgress} dalam proses</span><span><i className="state-dot pending"/>{data.summary.notStarted} belum dimulai</span>{!account?.isActive && <b>Akun nonaktif · data lama tetap tersedia</b>}</div></section>}
      {message && !modal && <div className="notice production-notice" role="status">{message}</div>}
      <div className="production-list-heading"><div><h2>Daftar produk</h2><p>Persentase dihitung dari progres dibagi target. Produk yang diarsipkan tetap dapat diakses dari riwayat produk.</p></div></div>
      {busy && !data ? <div className="production-empty">Memuat produk…</div> : products.length ? <div className="table-wrap production-table-wrap"><table className="data-table production-products-table"><thead><tr><th>No.</th><th>Nama produk</th><th>Target</th><th>Progres</th><th>Persentase</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{products.map((product, index) => {
        const progress = getProductionProgress(product.completedCount, product.targetCount); const tone = productTone(product);
        return <tr key={product.id} className={product.isArchived ? "production-row-archived" : undefined}><td>{index + 1}</td><td><Link href={`/production/products/${product.id}`} className="production-table-product"><strong>{product.name}</strong>{product.description && <small>{product.description}</small>}<small>{product._count.comments} komentar</small></Link></td><td>{product.targetCount.toLocaleString("id-ID")}</td><td>{product.completedCount.toLocaleString("id-ID")}</td><td><div className="production-table-progress"><div className={`production-progress-track compact status-${tone}`}><i style={{ width: `${progress}%` }}/></div><b>{progress}%</b></div></td><td><span className={`production-product-state state-${product.isArchived ? "archived" : tone}`}>{product.isArchived ? "Diarsipkan" : productStatus(product)}</span></td><td><Link className="btn btn-sm" href={`/production/products/${product.id}`}>{product.isArchived ? "Pulihkan" : "Lihat / edit"}</Link></td></tr>;
      })}</tbody></table></div> : <div className="production-empty"><Box size={20}/><strong>Belum ada produk untuk akun ini</strong><span>{account?.isActive ? "Tambahkan produk pertama untuk memulai pemantauan progres." : "Akun nonaktif tidak menerima pekerjaan baru. Data produksi yang ada tetap tersimpan."}</span>{admin && account?.isActive && <button className="btn btn-primary" onClick={openAddProduct}><Plus size={14}/>Tambah produk</button>}</div>}
    </>}
    {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(false)}><form role="dialog" aria-modal="true" aria-labelledby="production-create-title" className="modal production-modal" onSubmit={addProduct} onClick={event => event.stopPropagation()}><div className="account-modal-heading"><div><h2 id="production-create-title" className="modal-title">Tambah produk</h2><p className="page-subtitle">Untuk {account?.name}</p></div><button type="button" className="btn btn-sm" onClick={() => setModal(false)} aria-label="Tutup"><X size={14}/></button></div><div className="form-grid"><label className="form-field full">Nama produk<input required maxLength={160} value={name} onChange={event => setName(event.target.value)}/></label><label className="form-field full">Deskripsi produk (opsional)<textarea rows={2} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)}/></label><label className="form-field">Target jumlah<input required type="number" min={1} max={1000000} step={1} value={target} onChange={event => setTarget(event.target.value)}/></label><label className="form-field">Progres awal<input required type="number" min={0} max={1000000} step={1} value={completed} onChange={event => setCompleted(event.target.value)}/></label><label className="form-field full">Catatan awal (opsional)<textarea rows={2} maxLength={2000} value={initialNote} onChange={event => setInitialNote(event.target.value)}/></label></div>{message && <div className="notice production-error" role="alert">{message}</div>}<div className="modal-actions"><button type="button" className="btn" disabled={saving} onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan…" : "Simpan produk"}</button></div></form></div>}
  </main>;
}
