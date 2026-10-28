"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, Archive, Box, CheckCircle2, Clock3, MessageSquareText, PackagePlus, Plus, Search, Send, UserRound, X } from "lucide-react";

type AccountRow = { id: string; name: string; username: string | null; core: string; subCore: string | null; isActive: boolean; planned: number; completed: number; doneProducts: number; inProgress: number; notStarted: number; progress: number; productCount: number };
type Summary = { accounts: number; planned: number; completed: number; doneProducts: number; inProgress: number; notStarted: number; progress: number };
type ProductRow = { id: string; name: string; description: string | null; targetCount: number; completedCount: number; isArchived: boolean; _count: { comments: number } };
type Person = { id: string; name: string } | null;
type Comment = { id: string; content: string; createdAt: string; author: Person };
type ProgressChange = { id: string; previousCompletedCount: number; newCompletedCount: number; previousTargetCount: number | null; newTargetCount: number | null; note: string | null; createdAt: string; actor: { id: string; name: string } };
type AccountDetail = { id: string; name: string; username: string | null; core: string; subCore: string | null; platform: string | null; isActive: boolean; productionProducts: ProductRow[]; summary: { target: number; completed: number; progress: number; products: number; done: number; inProgress: number; notStarted: number; archived: number } };
type ProductDetail = { id: string; accountId: string; name: string; description: string | null; targetCount: number; completedCount: number; isArchived: boolean; progress: number; status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED"; account: { id: string; name: string; username: string | null; core: string; subCore: string | null; isActive: boolean }; comments: Comment[]; progressHistory: ProgressChange[] };
type DashboardData = { accounts: AccountRow[]; totals: Summary };
const emptySummary: Summary = { accounts: 0, planned: 0, completed: 0, doneProducts: 0, inProgress: 0, notStarted: 0, progress: 0 };
const timeLabel = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const statusLabel = (completed: number, target: number) => completed === 0 ? "Belum dimulai" : completed >= target ? "Selesai" : "Dalam proses";

export default function ProductionDashboardPage() {
  const [data, setData] = useState<DashboardData>({ accounts: [], totals: emptySummary });
  const [query, setQuery] = useState(""); const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [admin, setAdmin] = useState(false); const [userId, setUserId] = useState("");
  const [accountOpen, setAccountOpen] = useState(false); const [accountId, setAccountId] = useState(""); const [account, setAccount] = useState<AccountDetail | null>(null); const [accountBusy, setAccountBusy] = useState(false); const [accountError, setAccountError] = useState("");
  const [accountComments, setAccountComments] = useState<Comment[]>([]); const [accountComment, setAccountComment] = useState(""); const [accountCommentBusy, setAccountCommentBusy] = useState(false);
  const [productOpen, setProductOpen] = useState(false); const [product, setProduct] = useState<ProductDetail | null>(null); const [productBusy, setProductBusy] = useState(false); const [productError, setProductError] = useState("");
  const [productName, setProductName] = useState(""); const [description, setDescription] = useState(""); const [target, setTarget] = useState(""); const [completed, setCompleted] = useState(""); const [progressNote, setProgressNote] = useState(""); const [productComment, setProductComment] = useState(""); const [productCommentBusy, setProductCommentBusy] = useState(false); const [productSaving, setProductSaving] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false); const [newName, setNewName] = useState(""); const [newDescription, setNewDescription] = useState(""); const [newTarget, setNewTarget] = useState("1"); const [newCompleted, setNewCompleted] = useState("0"); const [initialNote, setInitialNote] = useState(""); const [requestKey, setRequestKey] = useState(""); const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const accountTriggerRef = useRef<HTMLElement | null>(null); const productTriggerRef = useRef<HTMLElement | null>(null); const createTriggerRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true); setError("");
    try {
      const [response, sessionResponse] = await Promise.all([fetch("/api/production", { cache: "no-store", signal }), fetch("/api/auth/session", { cache: "no-store", signal })]);
      const [payload, session] = await Promise.all([response.json(), sessionResponse.json()]);
      if (!response.ok) throw new Error(payload.error || "Dashboard produksi gagal dimuat.");
      if (signal?.aborted) return;
      setData(payload as DashboardData); setAdmin(session.user?.role === "ADMIN"); setUserId(session.user?.id ?? "");
    } catch (cause) { if (cause instanceof DOMException && cause.name === "AbortError") return; setError(cause instanceof Error ? cause.message : "Dashboard produksi gagal dimuat."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => { if (!accountOpen) accountTriggerRef.current?.focus(); }, [accountOpen]);
  useEffect(() => { if (!productOpen) productTriggerRef.current?.focus(); }, [productOpen]);
  useEffect(() => { if (!addProductOpen) createTriggerRef.current?.focus(); }, [addProductOpen]);
  const visibleAccounts = useMemo(() => data.accounts.filter(accountRow => `${accountRow.name} ${accountRow.username ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())), [data.accounts, query]);

  const loadAccount = useCallback(async (id: string) => {
    setAccountBusy(true); setAccountError("");
    try {
      const [response, commentsResponse] = await Promise.all([fetch(`/api/production/accounts/${id}`, { cache: "no-store" }), fetch(`/api/production/accounts/${id}/comments`, { cache: "no-store" })]);
      const [payload, comments] = await Promise.all([response.json(), commentsResponse.json()]);
      if (!response.ok) throw new Error(payload.error || "Detail akun produksi gagal dimuat.");
      const result = payload as { account: Omit<AccountDetail, "summary">; summary: AccountDetail["summary"] };
      setAccount({ ...result.account, summary: result.summary }); setAccountComments(Array.isArray(comments) ? comments as Comment[] : []);
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Detail akun produksi gagal dimuat."); }
    finally { setAccountBusy(false); }
  }, []);
  const openAccount = (id: string) => { accountTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setAccountId(id); setAccountOpen(true); setAccount(null); setAccountComments([]); setAccountComment(""); setMessage(""); void loadAccount(id); };
  const loadProduct = useCallback(async (id: string) => {
    setProductBusy(true); setProductError("");
    try {
      const response = await fetch(`/api/production/products/${id}`, { cache: "no-store" }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Detail produk gagal dimuat.");
      const next = payload as ProductDetail; setProduct(next); setProductName(next.name); setDescription(next.description ?? ""); setTarget(String(next.targetCount)); setCompleted(String(next.completedCount));
    } catch (cause) { setProductError(cause instanceof Error ? cause.message : "Detail produk gagal dimuat."); }
    finally { setProductBusy(false); }
  }, []);
  const openProduct = (id: string) => { productTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setProduct(null); setProductOpen(true); setProductComment(""); void loadProduct(id); };
  const openAddProduct = () => { createTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setNewName(""); setNewDescription(""); setNewTarget("1"); setNewCompleted("0"); setInitialNote(""); setRequestKey(crypto.randomUUID()); setAddProductOpen(true); };

  const accountModalOpen = accountOpen; const productModalOpen = productOpen; const creationModalOpen = addProductOpen;
  useEffect(() => {
    if (!accountModalOpen && !productModalOpen && !creationModalOpen) return;
    const priorOverflow = document.body.style.overflow; const priorPaddingRight = document.body.style.paddingRight;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (productModalOpen) setProductOpen(false);
      else if (creationModalOpen) setAddProductOpen(false);
      else setAccountOpen(false);
    };
    const scrollBarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = "hidden"; if (scrollBarWidth) document.body.style.paddingRight = `${scrollBarWidth}px`; window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = priorOverflow; document.body.style.paddingRight = priorPaddingRight; window.removeEventListener("keydown", escape); };
  }, [accountModalOpen, creationModalOpen, productModalOpen]);

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!accountId) return; setCreating(true); setMessage("");
    try {
      const response = await fetch("/api/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, requestKey, name: newName, description: newDescription || null, targetCount: Number(newTarget), completedCount: Number(newCompleted), initialNote: initialNote || null }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Produk gagal ditambahkan.");
      setAddProductOpen(false); setMessage("Produk berhasil ditambahkan."); await Promise.all([loadAccount(accountId), load()]);
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Produk gagal ditambahkan."); }
    finally { setCreating(false); }
  }
  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!product) return; setProductSaving(true); setProductError("");
    try {
      const response = await fetch(`/api/production/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: productName, description: description || null, targetCount: Number(target), completedCount: Number(completed), note: progressNote || null }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Perubahan produk gagal disimpan.");
      setProgressNote(""); setMessage("Perubahan progres tersimpan."); await Promise.all([loadProduct(product.id), loadAccount(product.accountId), load()]);
    } catch (cause) { setProductError(cause instanceof Error ? cause.message : "Perubahan produk gagal disimpan."); }
    finally { setProductSaving(false); }
  }
  async function archiveProduct() {
    if (!product || !window.confirm(`${product.isArchived ? "Pulihkan" : "Hapus"} produk ${product.name}? Komentar dan riwayat progres akan tetap tersimpan.`)) return;
    setProductSaving(true); setProductError("");
    try {
      const response = product.isArchived ? await fetch(`/api/production/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isArchived: false }) }) : await fetch(`/api/production/products/${product.id}`, { method: "DELETE" });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Status produk gagal diubah.");
      setProductOpen(false); setMessage(product.isArchived ? "Produk dipulihkan." : "Produk diarsipkan; riwayat tetap tersedia."); await Promise.all([loadAccount(product.accountId), load()]);
    } catch (cause) { setProductError(cause instanceof Error ? cause.message : "Status produk gagal diubah."); }
    finally { setProductSaving(false); }
  }
  async function postComment(url: string, content: string, done: () => void, setLoading: (value: boolean) => void, refresh: () => Promise<void>) {
    if (!content.trim()) return; setLoading(true);
    try { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Komentar gagal disimpan."); done(); setMessage("Komentar tersimpan."); await refresh(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Komentar gagal disimpan."); }
    finally { setLoading(false); }
  }
  async function deleteComment(url: string, authorId: string | null) {
    if (!admin && authorId !== userId) return;
    if (!window.confirm("Hapus komentar ini?")) return;
    const response = await fetch(url, { method: "DELETE" }); const payload = await response.json();
    if (!response.ok) { setMessage(payload.error || "Komentar gagal dihapus."); return; }
    if (accountId && accountOpen) await loadAccount(accountId);
    if (product?.id && productOpen) await loadProduct(product.id);
  }

  return <main className="page production-page">
    <div className="page-title-row"><div><div className="production-eyebrow"><Activity size={14}/>WORKSPACE PRODUKSI</div><h1 className="page-title">Production Dashboard</h1><p className="page-subtitle">Pantau target, progres, dan kendala produksi untuk setiap akun aktif.</p></div></div>
    {error && <div className="notice production-error" role="alert">{error}<button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div>}
    {message && !accountOpen && <div className="notice production-notice" role="status">{message}<button className="production-notice-close" onClick={() => setMessage("")} aria-label="Tutup notifikasi"><X size={14}/></button></div>}
    <section className="production-kpis" aria-label="Ringkasan produksi">
      <article className="production-kpi"><span><UserRound size={15}/>Akun aktif</span><strong>{busy ? "—" : data.totals.accounts}</strong><small>termasuk akun tanpa produk</small></article>
      <article className="production-kpi"><span><Box size={15}/>Target unit</span><strong>{busy ? "—" : data.totals.planned.toLocaleString("id-ID")}</strong><small>jumlah unit direncanakan</small></article>
      <article className="production-kpi tone-green"><span><CheckCircle2 size={15}/>Produk selesai</span><strong>{busy ? "—" : data.totals.doneProducts}</strong><small>{busy ? "Memuat" : `${data.totals.completed.toLocaleString("id-ID")} unit selesai`}</small></article>
      <article className="production-kpi tone-amber"><span><Clock3 size={15}/>Dalam proses</span><strong>{busy ? "—" : data.totals.inProgress}</strong><small>{busy ? "Memuat" : `${data.totals.notStarted} belum dimulai`}</small></article>
    </section>
    <section className="panel production-overview"><div className="production-overview-head"><div><h2 className="panel-title">Progres keseluruhan</h2><p className="panel-sub">Unit selesai dibandingkan dengan seluruh target produk aktif.</p></div><strong>{busy ? "—" : `${data.totals.progress}%`}</strong></div><div className="production-progress-track"><i style={{ width: `${busy ? 0 : data.totals.progress}%` }}/></div><div className="production-overview-foot"><span>{busy ? "Memuat data produksi…" : `${data.totals.completed.toLocaleString("id-ID")} dari ${data.totals.planned.toLocaleString("id-ID")} unit selesai`}</span><span>{data.totals.doneProducts} selesai · {data.totals.inProgress} dalam proses · {data.totals.notStarted} belum dimulai</span></div></section>
    <section className="production-accounts-section"><div className="production-list-heading"><div><h2>Akun aktif</h2><p>Semua akun aktif tampil, termasuk akun yang belum memiliki produk.</p></div><div className="production-filters"><label className="global-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama atau username…" aria-label="Cari akun produksi"/></label></div></div>
      {busy && !data.accounts.length ? <div className="production-empty">Memuat akun produksi…</div> : visibleAccounts.length ? <div className="production-account-grid">{visibleAccounts.map(accountRow => <button type="button" key={accountRow.id} onClick={() => openAccount(accountRow.id)} className="production-account-card production-account-card-button" aria-haspopup="dialog"><div className="production-account-top"><span className="production-account-icon"><UserRound size={17}/></span><span className="production-state active">Aktif</span></div><strong className="production-account-name">{accountRow.name}</strong><small className="production-account-username">{accountRow.username || "Identifier belum diatur"}</small><small className="production-account-username">{accountRow.core}{accountRow.subCore ? ` / ${accountRow.subCore}` : ""}</small><div className="production-account-progress"><span>Progres produksi</span><b>{accountRow.progress}%</b></div><div className="production-progress-track compact"><i style={{ width: `${accountRow.progress}%` }}/></div><div className="production-account-metrics"><span>{accountRow.productCount} produk <small>· {accountRow.planned.toLocaleString("id-ID")} unit target</small></span><span>{accountRow.doneProducts} selesai · {accountRow.inProgress} proses</span></div>{accountRow.productCount === 0 && <span className="production-no-products">Belum ada produk</span>}<span className="production-account-open">Lihat detail <ArrowRight size={14}/></span></button>)}</div> : <div className="production-empty"><UserRound size={20}/><strong>{data.accounts.length ? "Akun tidak ditemukan" : "Belum ada akun aktif"}</strong><span>{data.accounts.length ? "Ubah kata pencarian." : "Tambahkan atau aktifkan akun di halaman Akun untuk memulai produksi."}</span></div>}
    </section>

    {accountOpen && <div className="modal-backdrop production-layer account-layer" onMouseDown={event => { if (event.target === event.currentTarget && !productOpen && !addProductOpen) setAccountOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="production-account-title" className="modal production-account-modal" onKeyDown={keepFocusInside} onMouseDown={event => event.stopPropagation()}><header className="production-modal-header"><div><span className="production-eyebrow"><UserRound size={14}/>DETAIL AKUN PRODUKSI</span><h2 id="production-account-title" className="modal-title">{account?.name ?? (accountBusy ? "Memuat akun…" : "Akun")}</h2><p className="page-subtitle">{account?.username || "Identifier belum diatur"}{account?.core ? ` · ${account.core}${account.subCore ? ` / ${account.subCore}` : ""}` : ""}{account?.platform ? ` · ${account.platform}` : ""}</p></div><button autoFocus className="btn btn-sm" onClick={() => setAccountOpen(false)} aria-label="Tutup detail akun"><X size={16}/></button></header>
        <div className="production-modal-content">{accountError && <div className="notice production-error" role="alert">{accountError}<button className="btn btn-sm" onClick={() => void loadAccount(accountId)}>Coba lagi</button></div>}{message && <div className="notice production-notice" role="status">{message}</div>}
          {accountBusy && !account ? <div className="production-empty">Memuat produk akun…</div> : account && <>
            <section className="production-account-modal-summary"><div><span>Total produk aktif</span><strong>{account.summary.products}</strong></div><div><span>Total target</span><strong>{account.summary.target.toLocaleString("id-ID")}</strong></div><div><span>Sudah diproduksi</span><strong>{account.summary.completed.toLocaleString("id-ID")}</strong></div><div><span>Progres keseluruhan</span><strong>{account.summary.progress}%</strong></div><div className="production-modal-progress"><div className="production-progress-track"><i style={{ width: `${account.summary.progress}%` }}/></div><div className="production-account-status-summary"><span><i className="state-dot done"/>{account.summary.done} selesai</span><span><i className="state-dot progress"/>{account.summary.inProgress} dalam proses</span><span><i className="state-dot pending"/>{account.summary.notStarted} belum dimulai</span></div></div></section>
            <div className="production-modal-section-heading"><div><h3>Produk</h3><p>Klik produk untuk membuka detail di atas modal akun.</p></div>{admin && <button className="btn btn-primary" onClick={openAddProduct} disabled={!account.isActive}><Plus size={14}/>Tambah produk</button>}</div>
            {account.productionProducts.filter(item => !item.isArchived).length ? <div className="production-modal-product-grid">{account.productionProducts.filter(item => !item.isArchived).map(item => { const progress = Math.min(100, Math.round(item.completedCount / item.targetCount * 100)); return <button type="button" key={item.id} className="production-modal-product-card" onClick={() => openProduct(item.id)} aria-haspopup="dialog"><div className="production-product-top"><span className="production-product-icon"><Box size={16}/></span><span className={`production-product-state state-${item.completedCount === item.targetCount ? "done" : item.completedCount ? "progress" : "pending"}`}>{statusLabel(item.completedCount, item.targetCount)}</span></div><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}<div className="production-modal-product-numbers"><span>{item.completedCount.toLocaleString("id-ID")} produced</span><b>Target {item.targetCount.toLocaleString("id-ID")}</b></div><div className="production-progress-track compact"><i style={{ width: `${progress}%` }}/></div><div className="production-modal-product-foot"><span>{progress}%</span><span><MessageSquareText size={12}/>{item._count.comments} komentar</span></div></button>; })}</div> : <div className="production-empty production-modal-empty"><Box size={20}/><strong>Belum ada produk untuk akun ini</strong><span>{account.isActive ? "Tambahkan produk pertama untuk mulai melacak produksi." : "Akun nonaktif. Data lama tetap tersedia, tetapi tidak dapat menerima produk baru."}</span>{admin && account.isActive && <button className="btn btn-primary" onClick={openAddProduct}><Plus size={14}/>Tambah produk</button>}</div>}
            {account.productionProducts.some(item => item.isArchived) && <section className="production-archived-products"><div className="production-modal-section-heading"><div><h3>Produk diarsipkan</h3><p>Riwayat tetap tersimpan dan Admin dapat memulihkan produk.</p></div></div><div className="production-modal-product-grid">{account.productionProducts.filter(item => item.isArchived).map(item => <button type="button" className="production-modal-product-card is-archived" key={item.id} onClick={() => openProduct(item.id)} aria-haspopup="dialog"><div className="production-product-top"><span className="production-product-icon"><Archive size={15}/></span><span className="production-product-state state-archived">Diarsipkan</span></div><strong>{item.name}</strong><div className="production-modal-product-numbers"><span>{item.completedCount.toLocaleString("id-ID")} produced</span><b>Target {item.targetCount.toLocaleString("id-ID")}</b></div></button>)}</div></section>}
            <section className="production-account-comments"><div className="production-modal-section-heading"><div><h3>Komentar akun</h3><p>Catatan umum untuk seluruh pekerjaan pada akun ini.</p></div><MessageSquareText size={15}/></div><form className="production-comment-form" onSubmit={event => { event.preventDefault(); void postComment(`/api/production/accounts/${account.id}/comments`, accountComment, () => setAccountComment(""), setAccountCommentBusy, () => loadAccount(account.id)); }}><textarea required maxLength={2000} rows={2} value={accountComment} onChange={event => setAccountComment(event.target.value)} placeholder="Tulis komentar akun…"/><button className="btn btn-primary btn-sm" disabled={accountCommentBusy || !accountComment.trim()}><Send size={13}/>{accountCommentBusy ? "Mengirim…" : "Kirim"}</button></form><CommentList comments={accountComments} userId={userId} admin={admin} onDelete={commentId => void deleteComment(`/api/production/accounts/${account.id}/comments/${commentId}`, accountComments.find(item => item.id === commentId)?.author?.id ?? null)}/></section>
          </>}
        </div>
      </section></div>}

    {productOpen && <div className="modal-backdrop production-layer product-layer" onMouseDown={event => { if (event.target === event.currentTarget) setProductOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="production-product-title" className="modal production-product-modal" onKeyDown={keepFocusInside} onMouseDown={event => event.stopPropagation()}><header className="production-modal-header"><div><span className="production-eyebrow"><Box size={14}/>DETAIL PRODUK</span><h2 id="production-product-title" className="modal-title">{product?.name ?? (productBusy ? "Memuat produk…" : "Produk")}</h2><p className="page-subtitle">{product?.account.name}{product?.account.username ? ` · ${product.account.username}` : ""}</p></div><div className="production-modal-header-actions">{admin && product && <button className="btn btn-sm" onClick={() => void archiveProduct()} disabled={productSaving}><Archive size={14}/>{product.isArchived ? "Pulihkan" : "Hapus"}</button>}<button autoFocus className="btn btn-sm" onClick={() => setProductOpen(false)} aria-label="Tutup detail produk"><X size={16}/></button></div></header>
      <div className="production-modal-content">{productError && <div className="notice production-error" role="alert">{productError}<button className="btn btn-sm" onClick={() => product && void loadProduct(product.id)}>Coba lagi</button></div>}{message && <div className="notice production-notice" role="status">{message}</div>}{productBusy && !product ? <div className="production-empty">Memuat detail produk…</div> : product && <>
        <section className="production-product-modal-summary"><div className="production-product-modal-status"><span className={`production-product-state state-${product.isArchived ? "archived" : product.status === "COMPLETED" ? "done" : product.status === "IN_PROGRESS" ? "progress" : "pending"}`}>{product.isArchived ? "Diarsipkan" : product.status === "COMPLETED" ? "Selesai" : product.status === "IN_PROGRESS" ? "Dalam proses" : "Belum dimulai"}</span><strong>{product.progress}%</strong><small>progres produksi</small></div><div className="production-progress-track"><i style={{ width: `${product.progress}%` }}/></div><div className="production-detail-counts"><div><span>Produced</span><strong>{product.completedCount.toLocaleString("id-ID")}</strong></div><div><span>Target</span><strong>{product.targetCount.toLocaleString("id-ID")}</strong></div><div><span>Sisa</span><strong>{Math.max(0, product.targetCount - product.completedCount).toLocaleString("id-ID")}</strong></div></div><p className="production-product-parent"><b>Akun:</b> {product.account.name} <span>· {product.account.core}{product.account.subCore ? ` / ${product.account.subCore}` : ""}</span></p>{product.description && <p className="production-product-description">{product.description}</p>}</section>
        {admin && !product.isArchived && <form className="production-modal-edit-form" onSubmit={saveProduct}><div className="production-modal-section-heading"><div><h3>Edit produk dan progres</h3><p>Status serta persentase dihitung otomatis.</p></div></div><div className="production-modal-edit-grid"><label className="form-field">Nama produk<input required maxLength={160} value={productName} onChange={event => setProductName(event.target.value)}/></label><label className="form-field">Deskripsi<textarea rows={2} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)}/></label><label className="form-field">Target<input required type="number" min={1} max={1000000} value={target} onChange={event => setTarget(event.target.value)}/></label><label className="form-field">Produced<input required type="number" min={0} max={Number(target) || 1} value={completed} onChange={event => setCompleted(event.target.value)}/></label><label className="form-field production-edit-note">Catatan progres (opsional)<input maxLength={2000} value={progressNote} onChange={event => setProgressNote(event.target.value)} placeholder="Catatan untuk riwayat perubahan"/></label></div><button className="btn btn-primary btn-sm" disabled={productSaving}>{productSaving ? "Menyimpan…" : "Simpan perubahan"}</button></form>}
        <section className="production-account-comments"><div className="production-modal-section-heading"><div><h3>Komentar produk</h3><p>Komentar terbaru muncul lebih dahulu.</p></div><MessageSquareText size={15}/></div><form className="production-comment-form" onSubmit={event => { event.preventDefault(); void postComment(`/api/production/products/${product.id}/comments`, productComment, () => setProductComment(""), setProductCommentBusy, () => loadProduct(product.id)); }}><textarea required maxLength={2000} rows={2} value={productComment} onChange={event => setProductComment(event.target.value)} placeholder="Tambahkan komentar…"/><button className="btn btn-primary btn-sm" disabled={productCommentBusy || !productComment.trim()}><Send size={13}/>{productCommentBusy ? "Mengirim…" : "Kirim"}</button></form><CommentList comments={product.comments} userId={userId} admin={admin} onDelete={commentId => void deleteComment(`/api/production/products/${product.id}/comments/${commentId}`, product.comments.find(item => item.id === commentId)?.author?.id ?? null)}/></section>
        <details className="production-modal-history"><summary>Riwayat progres ({product.progressHistory.length})</summary>{product.progressHistory.length ? product.progressHistory.map(item => <div className="production-modal-history-item" key={item.id}><strong>{item.previousCompletedCount} → {item.newCompletedCount} unit</strong>{item.note && <p>{item.note}</p>}<small>{timeLabel(item.createdAt)} · {item.actor.name}</small></div>) : <p className="muted">Belum ada riwayat progres.</p>}</details>
      </>}</div>
    </section></div>}

    {addProductOpen && account && <div className="modal-backdrop production-layer creation-layer" onMouseDown={event => { if (event.target === event.currentTarget && !creating) setAddProductOpen(false); }}><form role="dialog" aria-modal="true" aria-labelledby="production-create-title" className="modal production-create-modal" onKeyDown={keepFocusInside} onSubmit={addProduct} onMouseDown={event => event.stopPropagation()}><header className="production-modal-header"><div><span className="production-eyebrow"><PackagePlus size={14}/>PRODUK BARU</span><h2 id="production-create-title" className="modal-title">Tambah produk</h2><p className="page-subtitle">Terhubung ke akun {account.name}</p></div><button autoFocus type="button" className="btn btn-sm" onClick={() => setAddProductOpen(false)} aria-label="Tutup form"><X size={16}/></button></header><div className="production-modal-content"><div className="production-modal-edit-grid"><label className="form-field production-edit-note">Nama produk<input required maxLength={160} value={newName} onChange={event => setNewName(event.target.value)}/></label><label className="form-field production-edit-note">Deskripsi (opsional)<textarea rows={2} maxLength={4000} value={newDescription} onChange={event => setNewDescription(event.target.value)}/></label><label className="form-field">Target<input required type="number" min={1} max={1000000} value={newTarget} onChange={event => setNewTarget(event.target.value)}/></label><label className="form-field">Produced awal<input required type="number" min={0} max={Number(newTarget) || 1} value={newCompleted} onChange={event => setNewCompleted(event.target.value)}/></label><label className="form-field production-edit-note">Catatan awal (opsional)<input maxLength={2000} value={initialNote} onChange={event => setInitialNote(event.target.value)}/></label></div><div className="modal-actions"><button type="button" className="btn" disabled={creating} onClick={() => setAddProductOpen(false)}>Batal</button><button className="btn btn-primary" disabled={creating}>{creating ? "Menyimpan…" : "Simpan produk"}</button></div></div></form></div>}
  </main>;
}

function CommentList({ comments, userId, admin, onDelete }: { comments: Comment[]; userId: string; admin: boolean; onDelete: (commentId: string) => void }) {
  return comments.length ? <div className="production-comment-list">{comments.map(comment => <article className="production-comment" key={comment.id}><div><strong>{comment.author?.name ?? "Pengguna"}</strong><time>{timeLabel(comment.createdAt)}</time>{(admin || comment.author?.id === userId) && <button className="production-comment-delete" onClick={() => onDelete(comment.id)} aria-label="Hapus komentar"><X size={13}/></button>}</div><p>{comment.content}</p></article>)}</div> : <p className="muted production-comment-empty">Belum ada komentar.</p>;
}

function keepFocusInside(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
  if (!focusable.length) { event.preventDefault(); return; }
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
