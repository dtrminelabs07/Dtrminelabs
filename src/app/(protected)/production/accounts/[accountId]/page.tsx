"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Archive, Box, PackagePlus, Plus, X } from "lucide-react";

type Product = { id: string; name: string; targetCount: number; completedCount: number; isArchived: boolean; updatedAt: string; _count: { comments: number } };
type Payload = { account: { id: string; name: string; username: string | null; platform: string | null; core: string; subCore: string | null; isActive: boolean; productionProducts: Product[] }; summary: { target: number; completed: number; progress: number; products: number; archived: number } };

function productStatus(product: Product) { return product.completedCount === product.targetCount ? "Selesai" : product.completedCount ? "Dalam proses" : "Belum dimulai"; }

export default function ProductionAccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const [accountId, setAccountId] = useState(""); const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState(false); const [name, setName] = useState(""); const [target, setTarget] = useState("1"); const [requestKey, setRequestKey] = useState(""); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
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
      const response = await fetch("/api/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, requestKey, name, targetCount: Number(target) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Produk gagal ditambahkan.");
      setName(""); setTarget("1"); setRequestKey(""); setModal(false); setMessage("Produk ditambahkan."); await load();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Produk gagal ditambahkan."); }
    finally { setSaving(false); }
  }
  function openAddProduct() { setRequestKey(crypto.randomUUID()); setModal(true); }

  const products = data?.account.productionProducts ?? [];
  return <main className="page production-page">
    <Link href="/production" className="production-back-link"><ArrowLeft size={15}/>Kembali ke dashboard produksi</Link>
    {error ? <div className="notice production-error" role="alert">{error}<button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div> : <>
      <div className="page-title-row production-account-title"><div><div className="production-eyebrow"><Box size={14}/>DETAIL AKUN PRODUKSI</div><h1 className="page-title">{busy ? "Memuat akun…" : data?.account.name}</h1><p className="page-subtitle">{data?.account.username || "Identifier belum diatur"}{data?.account.platform ? ` · ${data.account.platform}` : ""}{data?.account.core ? ` · ${data.account.core}${data.account.subCore ? ` / ${data.account.subCore}` : ""}` : ""}</p></div>{admin && <button className="btn btn-primary" onClick={openAddProduct} disabled={!data?.account.isActive}><PackagePlus size={15}/>Tambah produk</button>}</div>
      {data && <section className="production-account-summary panel"><div className="production-summary-numbers"><div><span>Progres produksi</span><strong>{data.summary.progress}%</strong></div><div><span>Unit selesai</span><strong>{data.summary.completed.toLocaleString("id-ID")} <small>/ {data.summary.target.toLocaleString("id-ID")}</small></strong></div><div><span>Produk aktif</span><strong>{data.summary.products}</strong></div><div><span>Status akun</span><strong className={data.account.isActive ? "text-positive" : "text-muted-state"}>{data.account.isActive ? "Aktif" : "Nonaktif"}</strong></div></div><div className="production-progress-track"><i style={{ width: `${data.summary.progress}%` }}/></div></section>}
      {message && !modal && <div className="notice production-notice" role="status">{message}</div>}
      <div className="production-list-heading"><div><h2>Daftar produk</h2><p>Progres dihitung dari jumlah unit selesai dibandingkan target.</p></div></div>
      {busy && !data ? <div className="production-empty">Memuat produk…</div> : products.length ? <div className="production-product-grid">{products.map(product => {
        const progress = Math.min(100, Math.round(product.completedCount / product.targetCount * 100));
        return <article className={`production-product-card${product.isArchived ? " is-archived" : ""}`} key={product.id}>
          <Link href={`/production/products/${product.id}`} className="production-product-main"><div className="production-product-top"><span className="production-product-icon"><Box size={16}/></span><span className={`production-product-state state-${product.isArchived ? "archived" : product.completedCount === product.targetCount ? "done" : product.completedCount ? "progress" : "pending"}`}>{product.isArchived ? "Diarsipkan" : productStatus(product)}</span></div><strong>{product.name}</strong><span className="production-product-count">{product.completedCount.toLocaleString("id-ID")} / {product.targetCount.toLocaleString("id-ID")} unit</span><div className="production-progress-track compact"><i style={{ width: `${progress}%` }}/></div><div className="production-product-foot"><b>{progress}% selesai</b><span>{product._count.comments} komentar</span></div></Link>
          {admin && !product.isArchived && <Link className="production-archive-link" href={`/production/products/${product.id}`}><Archive size={13}/>Kelola produk</Link>}
        </article>;
      })}</div> : <div className="production-empty"><Box size={20}/><strong>Belum ada produk</strong><span>Tambahkan target produksi pertama untuk akun ini.</span>{admin && data?.account.isActive && <button className="btn btn-primary" onClick={openAddProduct}><Plus size={14}/>Tambah produk</button>}</div>}
    </>}
    {modal && <div className="modal-backdrop" onClick={() => !saving && setModal(false)}><form className="modal production-modal" onSubmit={addProduct} onClick={event => event.stopPropagation()}><div className="account-modal-heading"><div><h2 className="modal-title">Tambah produk</h2><p className="page-subtitle">Untuk {data?.account.name}</p></div><button type="button" className="btn btn-sm" onClick={() => setModal(false)} aria-label="Tutup"><X size={14}/></button></div><div className="form-grid"><label className="form-field full">Nama produk<input required maxLength={160} value={name} onChange={event => setName(event.target.value)}/></label><label className="form-field full">Target jumlah<input required type="number" min={1} max={1000000} step={1} value={target} onChange={event => setTarget(event.target.value)}/></label></div>{message && <div className="notice production-error">{message}</div>}<div className="modal-actions"><button type="button" className="btn" disabled={saving} onClick={() => setModal(false)}>Batal</button><button className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan…" : "Simpan produk"}</button></div></form></div>}
  </main>;
}
