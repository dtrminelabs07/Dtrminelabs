"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, ArrowRight, Archive, Box, Calendar, CheckCircle2, ChevronDown, Clock3, Layers, MessageSquareText, PackagePlus, Plus, RotateCcw, Search, Send, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { getProductionProgress, getProductionStatus, getProductionStatusLabel } from "@/lib/production-status";

type AccountRow = { id: string; name: string; username: string | null; core: string; subCore: string | null; isActive: boolean; planned: number; completed: number; doneProducts: number; inProgress: number; notStarted: number; progress: number; productCount: number };
type Summary = { accounts: number; planned: number; completed: number; doneProducts: number; inProgress: number; notStarted: number; progress: number };
type CatalogItem = { id: string; name: string; core: string | null; subCore: string | null; description: string | null; defaultTarget: number | null; isArchived: boolean; assigned?: boolean; _count: { assignments: number } };
type ProductRow = { id: string; templateId: string; name: string; description: string | null; targetCount: number; completedCount: number; isArchived: boolean; _count: { comments: number } };
type Person = { id: string; name: string } | null;
type Comment = { id: string; content: string; createdAt: string; author: Person };
type ProgressChange = { id: string; previousCompletedCount: number; newCompletedCount: number; previousTargetCount: number | null; newTargetCount: number | null; note: string | null; createdAt: string; actor: { id: string; name: string } };
type AccountDetail = { id: string; name: string; username: string | null; core: string; subCore: string | null; platform: string | null; isActive: boolean; productionProducts: ProductRow[]; summary: { target: number; completed: number; progress: number; products: number; done: number; inProgress: number; notStarted: number; archived: number } };
type ProductDetail = { id: string; accountId: string; name: string; description: string | null; targetCount: number; completedCount: number; isArchived: boolean; progress: number; status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED"; account: { id: string; name: string; username: string | null; core: string; subCore: string | null; isActive: boolean }; comments: Comment[]; progressHistory: ProgressChange[] };
type DashboardData = { accounts: AccountRow[]; totals: Summary };
const emptySummary: Summary = { accounts: 0, planned: 0, completed: 0, doneProducts: 0, inProgress: 0, notStarted: 0, progress: 0 };
const timeLabel = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const productState = getProductionStatus;
const statusLabel = getProductionStatusLabel;
const progressPercent = getProductionProgress;

export default function ProductionDashboardPage() {
  const [data, setData] = useState<DashboardData>({ accounts: [], totals: emptySummary });
  const [query, setQuery] = useState(""); const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [admin, setAdmin] = useState(false); const [userId, setUserId] = useState("");
  const [accountOpen, setAccountOpen] = useState(false); const [accountId, setAccountId] = useState(""); const [account, setAccount] = useState<AccountDetail | null>(null); const [accountBusy, setAccountBusy] = useState(false); const [accountError, setAccountError] = useState("");
  const [accountComments, setAccountComments] = useState<Comment[]>([]); const [accountComment, setAccountComment] = useState(""); const [accountCommentBusy, setAccountCommentBusy] = useState(false);
  const [productOpen, setProductOpen] = useState(false); const [product, setProduct] = useState<ProductDetail | null>(null); const [productBusy, setProductBusy] = useState(false); const [productError, setProductError] = useState(""); const [productFieldErrors, setProductFieldErrors] = useState<Record<string, string>>({});
  const [productName, setProductName] = useState(""); const [description, setDescription] = useState(""); const [target, setTarget] = useState(""); const [completed, setCompleted] = useState(""); const [progressNote, setProgressNote] = useState(""); const [productComment, setProductComment] = useState(""); const [productCommentBusy, setProductCommentBusy] = useState(false); const [productSaving, setProductSaving] = useState(false);
  const [requestKey, setRequestKey] = useState(""); const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]); const [catalogQuery, setCatalogQuery] = useState("");
  const [templateFormOpen, setTemplateFormOpen] = useState(false); const [templateEditId, setTemplateEditId] = useState<string | null>(null); const [templateAssignAccount, setTemplateAssignAccount] = useState("");
  const [templateName, setTemplateName] = useState(""); const [templateCore, setTemplateCore] = useState(""); const [templateSubCore, setTemplateSubCore] = useState(""); const [templateTarget, setTemplateTarget] = useState("100"); const [templateDescription, setTemplateDescription] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false); const [pickerQuery, setPickerQuery] = useState(""); const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]); const [assignmentTargets, setAssignmentTargets] = useState<Record<string, string>>({});
  const [portalReady, setPortalReady] = useState(false);
  const accountTriggerRef = useRef<HTMLElement | null>(null); const productTriggerRef = useRef<HTMLElement | null>(null); const createTriggerRef = useRef<HTMLElement | null>(null);

  const loadCatalog = useCallback(async (forAccountId?: string) => {
    const response = await fetch(`/api/production/catalog${forAccountId ? `?accountId=${encodeURIComponent(forAccountId)}` : ""}`, { cache: "no-store" });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Core Library gagal dimuat.");
    setCatalog(payload as CatalogItem[]);
  }, []);
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
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); void loadCatalog().catch(cause => setError(cause instanceof Error ? cause.message : "Core Library gagal dimuat.")); return () => controller.abort(); }, [load, loadCatalog]);
  useEffect(() => { setPortalReady(true); }, []);
  useEffect(() => { if (!accountOpen) accountTriggerRef.current?.focus(); }, [accountOpen]);
  useEffect(() => { if (!productOpen) productTriggerRef.current?.focus(); }, [productOpen]);
  useEffect(() => { if (!templateFormOpen) createTriggerRef.current?.focus(); }, [templateFormOpen]);
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
  const openProduct = (id: string) => { productTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setProduct(null); setProductFieldErrors({}); setProductOpen(true); setProductComment(""); void loadProduct(id); };
  const openTemplateForm = (assignAccountId = "", item?: CatalogItem) => {
    createTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTemplateEditId(item?.id ?? null); setTemplateAssignAccount(assignAccountId); setTemplateName(item?.name ?? ""); setTemplateCore(item?.core ?? account?.core ?? ""); setTemplateSubCore(item?.subCore ?? account?.subCore ?? ""); setTemplateTarget(String(item?.defaultTarget ?? 100)); setTemplateDescription(item?.description ?? ""); setRequestKey(crypto.randomUUID()); setAccountError(""); setTemplateFormOpen(true);
  };
  const openPicker = async () => { if (!account) return; setPickerQuery(""); setSelectedTemplates([]); setAssignmentTargets({}); setAccountError(""); try { await loadCatalog(account.id); setPickerOpen(true); } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Katalog gagal dimuat."); } };
  const toggleTemplate = (item: CatalogItem) => { if (item.assigned) return; setSelectedTemplates(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]); };
  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreating(true); setAccountError("");
    try {
      const payload = { name: templateName, core: templateCore || null, subCore: templateSubCore || null, defaultTarget: Number(templateTarget), description: templateDescription || null };
      const response = templateEditId ? await fetch(`/api/production/catalog/${templateEditId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }) : await fetch("/api/production/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, creationKey: requestKey, ...(templateAssignAccount ? { assignAccountId: templateAssignAccount, accountTarget: Number(templateTarget) } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Template gagal disimpan.");
      setTemplateFormOpen(false); setMessage(templateEditId ? "Template diperbarui." : templateAssignAccount ? "Produk dibuat dan ditambahkan ke akun." : "Produk ditambahkan ke katalog.");
      await Promise.all([loadCatalog(accountOpen ? accountId : undefined), ...(templateAssignAccount ? [loadAccount(templateAssignAccount)] : []), load()]);
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Template gagal disimpan."); }
    finally { setCreating(false); }
  }
  async function assignTemplates() {
    if (!account || !selectedTemplates.length) return; setCreating(true); setAccountError("");
    try {
      const assignments = selectedTemplates.map(templateId => ({ templateId, ...(assignmentTargets[templateId] ? { targetCount: Number(assignmentTargets[templateId]) } : {}) }));
      const response = await fetch(`/api/production/accounts/${account.id}/assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignments }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Produk gagal ditambahkan.");
      setPickerOpen(false); setMessage(`${result.created} produk ditambahkan ke ${account.name}.`); await Promise.all([loadAccount(account.id), loadCatalog(account.id), load()]);
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Produk gagal ditambahkan."); }
    finally { setCreating(false); }
  }
  async function deleteCore(item: CatalogItem) {
    const isUnused = item._count.assignments === 0;
    const confirmText = isUnused
      ? `Hapus Core "${item.name}" secara permanen? Template ini belum digunakan oleh akun manapun.`
      : item.isArchived
      ? `Core "${item.name}" masih digunakan oleh ${item._count.assignments} produk akun produksi. Lanjutkan percobaan hapus?`
      : `Core "${item.name}" masih digunakan oleh ${item._count.assignments} produk akun produksi.\n\nApakah Anda ingin mengarsipkannya agar data produksi yang berjalan tetap aman?`;

    if (!window.confirm(confirmText)) return;

    setError("");
    setMessage("");
    try {
      const url = (!isUnused && !item.isArchived)
        ? `/api/production/catalog/${item.id}?action=archive`
        : `/api/production/catalog/${item.id}?action=delete`;

      const response = await fetch(url, { method: "DELETE" });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Core gagal dihapus.");
      }

      await Promise.all([loadCatalog(accountOpen ? accountId : undefined), load()]);
      setMessage(result?.message || (result?.archived ? "Core berhasil diarsipkan." : "Core berhasil dihapus."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Core gagal dihapus.");
    }
  }

  async function archiveCore(item: CatalogItem) {
    if (!window.confirm(`Arsipkan Core "${item.name}"? Template tidak akan muncul untuk penugasan baru, namun ${item._count.assignments} produk yang sedang berjalan pada akun tetap aman.`)) return;

    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/production/catalog/${item.id}?action=archive`, { method: "DELETE" });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Core gagal diarsipkan.");
      }

      await Promise.all([loadCatalog(accountOpen ? accountId : undefined), load()]);
      setMessage(result?.message || "Core berhasil diarsipkan; data akun tetap tersedia.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Core gagal diarsipkan.");
    }
  }

  async function restoreCore(item: CatalogItem) {
    if (!window.confirm(`Aktifkan kembali Core "${item.name}"? Template akan kembali tersedia untuk penugasan akun produksi.`)) return;

    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/production/catalog/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Core gagal dipulihkan.");
      }

      await Promise.all([loadCatalog(accountOpen ? accountId : undefined), load()]);
      setMessage(result?.message || `Core "${item.name}" berhasil dipulihkan.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Core gagal dipulihkan.");
    }
  }

  const accountModalOpen = accountOpen; const productModalOpen = productOpen; const creationModalOpen = templateFormOpen; const pickerModalOpen = pickerOpen;
  useEffect(() => {
    if (!accountModalOpen && !productModalOpen && !creationModalOpen && !pickerModalOpen) return;
    const priorOverflow = document.body.style.overflow; const priorPaddingRight = document.body.style.paddingRight;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (productModalOpen) { if (!productSaving) setProductOpen(false); }
      else if (pickerModalOpen) setPickerOpen(false);
      else if (creationModalOpen) setTemplateFormOpen(false);
      else setAccountOpen(false);
    };
    const scrollBarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = "hidden"; if (scrollBarWidth) document.body.style.paddingRight = `${scrollBarWidth}px`; window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = priorOverflow; document.body.style.paddingRight = priorPaddingRight; window.removeEventListener("keydown", escape); };
  }, [accountModalOpen, creationModalOpen, pickerModalOpen, productModalOpen, productSaving]);

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!product || productSaving) return; setProductSaving(true); setProductError(""); setProductFieldErrors({});
    try {
      const response = await fetch(`/api/production/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: productName, description: description || null, targetCount: Number(target), completedCount: Number(completed), note: progressNote || null }) });
      const result = await response.json();
      if (!response.ok) {
        const fieldErrors = result.issues?.fieldErrors as Record<string, string[] | undefined> | undefined;
        if (fieldErrors) setProductFieldErrors(Object.fromEntries(Object.entries(fieldErrors).flatMap(([key, messages]) => messages?.[0] ? [[key, messages[0]]] : [])));
        throw new Error(result.error || "Perubahan produk gagal disimpan.");
      }
      setProgressNote(""); await Promise.all([loadProduct(product.id), loadAccount(product.accountId), load()]); setProductOpen(false); setMessage("Perubahan produk berhasil disimpan.");
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

  const currentProductProgress = product ? progressPercent(product.completedCount, product.targetCount) : 0;
  const currentProductState = product ? productState(product.completedCount, product.targetCount) : "pending";

  const totalAccounts = data.totals.accounts || data.accounts.length;
  const completedAccounts = data.accounts.filter(a => a.progress === 100 && a.productCount > 0).length;
  const inProgressAccounts = data.accounts.filter(a => a.progress > 0 && a.progress < 100).length;
  const notStartedAccounts = data.accounts.filter(a => a.progress === 0 && a.productCount > 0).length;
  const noProductAccounts = data.accounts.filter(a => a.productCount === 0).length;

  const completedPct = totalAccounts ? Math.round((completedAccounts / totalAccounts) * 100) : 0;
  const inProgressPct = totalAccounts ? Math.round((inProgressAccounts / totalAccounts) * 100) : 0;
  const notStartedPct = totalAccounts ? Math.round((notStartedAccounts / totalAccounts) * 100) : 0;
  const noProductPct = totalAccounts ? Math.round((noProductAccounts / totalAccounts) * 100) : 0;

  const todayLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const currentMonthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());

  return <main className="page production-page">
    <div className="page-title-row">
      <div>
        <h1 className="page-title">Production</h1>
        <p className="page-subtitle">Pantau progres produksi dan kelola akun produksi.</p>
      </div>
    </div>
    {error && <div className="notice production-error" role="alert">{error}<button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div>}
    {message && !accountOpen && <div className="notice production-notice" role="status">{message}<button className="production-notice-close" onClick={() => setMessage("")} aria-label="Tutup notifikasi"><X size={14}/></button></div>}

    {/* 1. Overall Progress / Progres Keseluruhan */}
    <section className="panel production-overview-panel" aria-label="Progres keseluruhan">
      <div className="production-overview-top">
        <div className="production-overview-title-wrap">
          <h2 className="panel-title">Progres Keseluruhan</h2>
          <span className="production-update-badge">Update terakhir: {todayLabel}</span>
        </div>
        <div className="production-month-select">
          <span>{currentMonthLabel}</span>
          <ChevronDown size={14} />
        </div>
      </div>

      <div className="production-metrics-cards">
        <article className="prod-stat-card tone-total">
          <span className="prod-stat-label">Total Akun</span>
          <strong className="prod-stat-num">{busy ? "—" : totalAccounts}</strong>
          <div className="prod-stat-bar"><i style={{ width: "100%" }} /></div>
          <small className="prod-stat-sub">100%</small>
        </article>

        <article className="prod-stat-card tone-completed">
          <span className="prod-stat-label">Selesai</span>
          <strong className="prod-stat-num">{busy ? "—" : completedAccounts}</strong>
          <div className="prod-stat-bar"><i style={{ width: `${completedPct}%` }} /></div>
          <small className="prod-stat-sub">{completedPct}%</small>
        </article>

        <article className="prod-stat-card tone-pending">
          <span className="prod-stat-label">Belum Dikerjakan</span>
          <strong className="prod-stat-num">{busy ? "—" : notStartedAccounts}</strong>
          <div className="prod-stat-bar"><i style={{ width: `${notStartedPct}%` }} /></div>
          <small className="prod-stat-sub">{notStartedPct}%</small>
        </article>

        <article className="prod-stat-card tone-limit">
          <span className="prod-stat-label">Limit / Proses</span>
          <strong className="prod-stat-num">{busy ? "—" : inProgressAccounts}</strong>
          <div className="prod-stat-bar"><i style={{ width: `${inProgressPct}%` }} /></div>
          <small className="prod-stat-sub">{inProgressPct}%</small>
        </article>

        <article className="prod-stat-card tone-unrecorded">
          <span className="prod-stat-label">Tanpa Status</span>
          <strong className="prod-stat-num">{busy ? "—" : noProductAccounts}</strong>
          <div className="prod-stat-bar"><i style={{ width: `${noProductPct}%` }} /></div>
          <small className="prod-stat-sub">{noProductPct}%</small>
        </article>
      </div>

      <div className="production-overview-bottom">
        <div className="production-progress-meta">
          <span>Target keseluruhan: <strong>{data.totals.planned.toLocaleString("id-ID")} unit</strong> ({data.totals.completed.toLocaleString("id-ID")} selesai)</span>
          <span className="production-progress-pct">{busy ? "—" : `${data.totals.progress}%`}</span>
        </div>
        <div className="production-progress-track">
          <i style={{ width: `${busy ? 0 : data.totals.progress}%` }} />
        </div>
        <div className="production-overview-foot">
          <span>{busy ? "Memuat data produksi…" : `${data.totals.completed.toLocaleString("id-ID")} dari ${data.totals.planned.toLocaleString("id-ID")} unit selesai`}</span>
          <span>{data.totals.doneProducts} produk selesai · {data.totals.inProgress} dalam proses · {data.totals.notStarted} belum dimulai</span>
        </div>
      </div>
    </section>

    {/* 2. Active Accounts */}
    <section className="production-accounts-section">
      <div className="production-list-heading">
        <div>
          <h2>Active Accounts</h2>
          <p>Daftar akun yang sedang aktif dalam proses produksi.</p>
        </div>
        <div className="production-heading-actions">
          <div className="production-filters">
            <label className="global-search">
              <Search size={14}/>
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama atau username…" aria-label="Cari akun produksi"/>
            </label>
          </div>
          {admin && (
            <Link href="/accounts?new=1" className="btn btn-primary btn-sm">
              <Plus size={14}/>Tambah akun
            </Link>
          )}
        </div>
      </div>
      {busy && !data.accounts.length ? (
        <div className="production-empty">Memuat akun produksi…</div>
      ) : visibleAccounts.length ? (
        <div className="production-account-grid">
          {visibleAccounts.map(accountRow => (
            <button
              type="button"
              key={accountRow.id}
              onClick={() => openAccount(accountRow.id)}
              className="production-account-card production-account-card-button"
              aria-haspopup="dialog"
            >
              <div className="production-account-top">
                <span className="production-account-icon"><UserRound size={17}/></span>
                <div className="production-account-info-col">
                  <strong className="production-account-name">{accountRow.name}</strong>
                  <span className="production-account-username">{accountRow.username ? (accountRow.username.startsWith("@") ? accountRow.username : `@${accountRow.username}`) : "Tanpa username"}</span>
                  <span className="production-account-core">{accountRow.core}{accountRow.subCore ? ` / ${accountRow.subCore}` : ""}</span>
                </div>
                <span className="production-state active">Aktif</span>
              </div>
              <div className="production-account-progress">
                <span>Progres produksi</span>
                <b>{accountRow.progress}%</b>
              </div>
              <div className="production-progress-track compact">
                <i style={{ width: `${accountRow.progress}%` }}/>
              </div>
              <div className="production-account-metrics">
                <div>
                  <span>{accountRow.productCount} produk · {accountRow.planned.toLocaleString("id-ID")} unit target</span>
                  <small>{accountRow.doneProducts} selesai · {accountRow.inProgress} proses</small>
                </div>
                <span className="production-account-open">Lihat detail <ArrowRight size={13}/></span>
              </div>
              {accountRow.productCount === 0 && <span className="production-no-products">Belum ada produk</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="production-empty">
          <UserRound size={20}/>
          <strong>{data.accounts.length ? "Akun tidak ditemukan" : "Belum ada akun aktif"}</strong>
          <span>{data.accounts.length ? "Ubah kata pencarian." : "Tambahkan atau aktifkan akun di halaman Akun untuk memulai produksi."}</span>
        </div>
      )}
    </section>

    {/* 3. Core Library */}
    <section className="panel production-catalog">
      <div className="production-list-heading">
        <div>
          <h2>Core Library</h2>
          <p>Template tersedia untuk ditambahkan secara terpisah ke akun produksi.</p>
        </div>
        <div className="production-catalog-header-actions">
          <label className="global-search">
            <Search size={14}/>
            <input value={catalogQuery} onChange={event => setCatalogQuery(event.target.value)} placeholder="Cari katalog…" aria-label="Cari Core Library"/>
          </label>
          {admin && (
            <button className="btn btn-primary btn-sm" onClick={() => openTemplateForm()}>
              <Plus size={14}/>Tambah Template
            </button>
          )}
        </div>
      </div>
      <div className="production-catalog-grid">
        {catalog.filter(item => `${item.name} ${item.core ?? ""} ${item.subCore ?? ""}`.toLowerCase().includes(catalogQuery.trim().toLowerCase())).map(item => (
          <article className={`production-catalog-card${item.isArchived ? " is-archived" : ""}`} key={item.id}>
            <div className="production-product-top">
              <span className="production-product-icon"><Box size={16}/></span>
              <span className={`production-product-state ${item.isArchived ? "state-archived" : "state-done"}`}>
                {item.isArchived ? "Diarsipkan" : "Tersedia"}
              </span>
            </div>
            <strong>{item.name}</strong>
            <small>{[item.core, item.subCore].filter(Boolean).join(" / ") || "Untuk akun umum"}</small>
            <p>{item.description || "Template siap digunakan untuk akun produksi."}</p>
            <div className="production-catalog-foot">
              <span>{item.defaultTarget ? `${item.defaultTarget.toLocaleString("id-ID")} target default` : `${item._count.assignments} penugasan`}</span>
              <span className="production-catalog-badge">{item.isArchived ? "Diarsipkan" : "Tersedia"}</span>
            </div>
            {admin && (
              <div className="production-catalog-actions">
                <button className="btn btn-sm" onClick={() => openTemplateForm("", item)}>Edit</button>
                {item.isArchived ? (
                  <>
                    <button className="btn btn-sm" onClick={() => void restoreCore(item)} title="Pulihkan Core">
                      <RotateCcw size={13}/>Pulihkan
                    </button>
                    <button
                      className={`btn btn-sm danger-action ${item._count.assignments > 0 ? "disabled" : ""}`}
                      onClick={() => void deleteCore(item)}
                      title={item._count.assignments === 0 ? "Hapus Core permanen" : "Template masih digunakan. Tidak dapat dihapus."}
                      disabled={item._count.assignments > 0}
                    >
                      <Trash2 size={13}/>Hapus
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-sm" onClick={() => void archiveCore(item)} title="Arsipkan Core">
                      Arsipkan
                    </button>
                    <button
                      className={`btn btn-sm ${item._count.assignments === 0 ? "danger-action" : ""}`}
                      onClick={() => void deleteCore(item)}
                      title={item._count.assignments === 0 ? "Hapus Core permanen" : "Template masih digunakan. Arsipkan terlebih dahulu."}
                      disabled={item._count.assignments > 0}
                    >
                      {item._count.assignments === 0 ? <><Trash2 size={13}/>Hapus</> : "Tidak dapat dihapus"}
                    </button>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
        {!catalog.length && <div className="production-empty">Katalog masih kosong. Buat template agar dapat digunakan pada akun.</div>}
      </div>
    </section>


    {portalReady && createPortal(<>
    {accountOpen && <div className="modal-backdrop production-layer account-layer" onMouseDown={event => { if (event.target === event.currentTarget && !productOpen && !templateFormOpen && !pickerOpen) setAccountOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="production-account-title" className="modal production-account-modal" onKeyDown={keepFocusInside} onMouseDown={event => event.stopPropagation()}><header className="production-modal-header"><div><span className="production-eyebrow"><UserRound size={14}/>DETAIL AKUN PRODUKSI</span><h2 id="production-account-title" className="modal-title">{account?.name ?? (accountBusy ? "Memuat akun…" : "Akun")}</h2><p className="page-subtitle">{account?.username || "Identifier belum diatur"}{account?.core ? ` · ${account.core}${account.subCore ? ` / ${account.subCore}` : ""}` : ""}{account?.platform ? ` · ${account.platform}` : ""}</p></div><button autoFocus className="btn btn-sm" onClick={() => setAccountOpen(false)} aria-label="Tutup detail akun"><X size={16}/></button></header>
        <div className="production-modal-content">{accountError && <div className="notice production-error" role="alert">{accountError}<button className="btn btn-sm" onClick={() => void loadAccount(accountId)}>Coba lagi</button></div>}{message && <div className="notice production-notice" role="status">{message}</div>}
          {accountBusy && !account ? <div className="production-empty">Memuat produk akun…</div> : account && <>
            <section className="production-account-modal-summary"><div><span>Total produk aktif</span><strong>{account.summary.products}</strong></div><div><span>Total target</span><strong>{account.summary.target.toLocaleString("id-ID")}</strong></div><div><span>Sudah diproduksi</span><strong>{account.summary.completed.toLocaleString("id-ID")}</strong></div><div><span>Progres keseluruhan</span><strong>{account.summary.progress}%</strong></div><div className="production-modal-progress"><div className="production-progress-track"><i style={{ width: `${account.summary.progress}%` }}/></div><div className="production-account-status-summary"><span><i className="state-dot done"/>{account.summary.done} selesai</span><span><i className="state-dot progress"/>{account.summary.inProgress} dalam proses</span><span><i className="state-dot pending"/>{account.summary.notStarted} belum dimulai</span></div></div></section>
             <div className="production-modal-section-heading"><div><h3>Produk</h3><p>Klik produk untuk membuka detail di atas modal akun.</p></div>{admin && <div className="production-modal-header-actions"><button className="btn btn-primary" onClick={() => void openPicker()} disabled={!account.isActive}><Plus size={14}/>Pilih Produk</button><button className="btn" onClick={() => openTemplateForm(account.id)} disabled={!account.isActive}><PackagePlus size={14}/>Buat Produk Baru</button></div>}</div>
            {account.productionProducts.filter(item => !item.isArchived).length ? <div className="production-modal-product-grid">{account.productionProducts.filter(item => !item.isArchived).map(item => { const progress = progressPercent(item.completedCount, item.targetCount); const state = productState(item.completedCount, item.targetCount); return <button type="button" key={item.id} className="production-modal-product-card" onClick={() => openProduct(item.id)} aria-haspopup="dialog"><div className="production-product-top"><span className="production-product-icon"><Box size={16}/></span><span className={`production-product-state state-${state}`}>{statusLabel(item.completedCount, item.targetCount)}</span></div><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}<div className="production-modal-product-numbers"><span>{item.completedCount.toLocaleString("id-ID")} produced</span><b>Target {item.targetCount.toLocaleString("id-ID")}</b></div><div className={`production-progress-track compact status-${state}`}><i style={{ width: `${progress}%` }}/></div><div className="production-modal-product-foot"><span>{progress}%</span><span><MessageSquareText size={12}/>{item._count.comments} komentar</span></div></button>; })}</div> : <div className="production-empty production-modal-empty"><Box size={20}/><strong>Belum ada produk untuk akun ini</strong><span>{account.isActive ? "Tambahkan produk pertama untuk mulai melacak produksi." : "Akun nonaktif. Data lama tetap tersedia, tetapi tidak dapat menerima produk baru."}</span>{admin && account.isActive && <button className="btn btn-primary" onClick={() => openPicker()}><Plus size={14}/>Pilih Produk</button>}</div>}
            {account.productionProducts.some(item => item.isArchived) && <section className="production-archived-products"><div className="production-modal-section-heading"><div><h3>Produk diarsipkan</h3><p>Riwayat tetap tersimpan dan Admin dapat memulihkan produk.</p></div></div><div className="production-modal-product-grid">{account.productionProducts.filter(item => item.isArchived).map(item => <button type="button" className="production-modal-product-card is-archived" key={item.id} onClick={() => openProduct(item.id)} aria-haspopup="dialog"><div className="production-product-top"><span className="production-product-icon"><Archive size={15}/></span><span className="production-product-state state-archived">Diarsipkan</span></div><strong>{item.name}</strong><div className="production-modal-product-numbers"><span>{item.completedCount.toLocaleString("id-ID")} produced</span><b>Target {item.targetCount.toLocaleString("id-ID")}</b></div></button>)}</div></section>}
            <section className="production-account-comments"><div className="production-modal-section-heading"><div><h3>Komentar akun</h3><p>Catatan umum untuk seluruh pekerjaan pada akun ini.</p></div><MessageSquareText size={15}/></div><form className="production-comment-form" onSubmit={event => { event.preventDefault(); void postComment(`/api/production/accounts/${account.id}/comments`, accountComment, () => setAccountComment(""), setAccountCommentBusy, () => loadAccount(account.id)); }}><textarea required maxLength={2000} rows={2} value={accountComment} onChange={event => setAccountComment(event.target.value)} placeholder="Tulis komentar akun…"/><button className="btn btn-primary btn-sm" disabled={accountCommentBusy || !accountComment.trim()}><Send size={13}/>{accountCommentBusy ? "Mengirim…" : "Kirim"}</button></form><CommentList comments={accountComments} userId={userId} admin={admin} onDelete={commentId => void deleteComment(`/api/production/accounts/${account.id}/comments/${commentId}`, accountComments.find(item => item.id === commentId)?.author?.id ?? null)}/></section>
          </>}
        </div>
      </section></div>}

    {productOpen && <div className="modal-backdrop production-layer product-layer" onMouseDown={event => { if (event.target === event.currentTarget && !productSaving) setProductOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="production-product-title" className="modal production-product-modal" onKeyDown={keepFocusInside} onMouseDown={event => event.stopPropagation()}><header className="production-modal-header"><div><span className="production-eyebrow"><Box size={14}/>DETAIL PRODUK</span><h2 id="production-product-title" className="modal-title">{product?.name ?? (productBusy ? "Memuat produk…" : "Produk")}</h2><p className="page-subtitle">{product?.account.name}{product?.account.username ? ` · ${product.account.username}` : ""}</p></div><div className="production-modal-header-actions">{admin && product && <button className="btn btn-sm" onClick={() => void archiveProduct()} disabled={productSaving}><Archive size={14}/>{product.isArchived ? "Pulihkan" : "Hapus"}</button>}<button autoFocus className="btn btn-sm" onClick={() => setProductOpen(false)} disabled={productSaving} aria-label="Tutup detail produk"><X size={16}/></button></div></header>
      <div className="production-modal-content">{productError && <div className="notice production-error" role="alert">{productError}<button className="btn btn-sm" onClick={() => product && void loadProduct(product.id)}>Coba lagi</button></div>}{message && <div className="notice production-notice" role="status">{message}</div>}{productBusy && !product ? <div className="production-empty">Memuat detail produk…</div> : product && <>
        <section className="production-product-modal-summary"><div className={`production-product-modal-status status-${currentProductState}`}><span className={`production-product-state state-${product.isArchived ? "archived" : currentProductState}`}>{product.isArchived ? "Diarsipkan" : statusLabel(product.completedCount, product.targetCount)}</span><strong>{currentProductProgress}%</strong><small>progres produksi</small></div><div className={`production-progress-track status-${currentProductState}`}><i style={{ width: `${currentProductProgress}%` }}/></div><div className="production-detail-counts"><div><span>Produced</span><strong>{product.completedCount.toLocaleString("id-ID")}</strong></div><div><span>Target</span><strong>{product.targetCount.toLocaleString("id-ID")}</strong></div><div><span>Sisa</span><strong>{Math.max(0, product.targetCount - product.completedCount).toLocaleString("id-ID")}</strong></div></div><p className="production-product-parent"><b>Akun:</b> {product.account.name} <span>· {product.account.core}{product.account.subCore ? ` / ${product.account.subCore}` : ""}</span></p>{product.description && <p className="production-product-description">{product.description}</p>}</section>
        {admin && !product.isArchived && <form className="production-modal-edit-form" onSubmit={saveProduct}><div className="production-modal-section-heading"><div><h3>Edit produk dan progres</h3><p>Status serta persentase dihitung otomatis.</p></div></div><div className="production-modal-edit-grid"><label className="form-field">Nama produk<input required maxLength={160} value={productName} onChange={event => { setProductName(event.target.value); setProductError(""); setProductFieldErrors(errors => ({ ...errors, name: "" })); }}/>{productFieldErrors.name && <small className="production-field-error">{productFieldErrors.name}</small>}</label><label className="form-field">Deskripsi<textarea rows={2} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)}/></label><label className="form-field">Target<input required type="number" min={1} max={1000000} step={1} value={target} onChange={event => { setTarget(event.target.value); setProductError(""); setProductFieldErrors(errors => ({ ...errors, targetCount: "" })); }}/>{productFieldErrors.targetCount && <small className="production-field-error">{productFieldErrors.targetCount}</small>}</label><label className="form-field">Produced<input required type="number" min={0} max={1000000} step={1} value={completed} onChange={event => { setCompleted(event.target.value); setProductError(""); setProductFieldErrors(errors => ({ ...errors, completedCount: "" })); }}/>{productFieldErrors.completedCount && <small className="production-field-error">{productFieldErrors.completedCount}</small>}</label><label className="form-field production-edit-note">Catatan progres (opsional)<input maxLength={2000} value={progressNote} onChange={event => setProgressNote(event.target.value)} placeholder="Catatan untuk riwayat perubahan"/></label></div><div className="production-edit-status"><span className={`production-product-state state-${productState(Number(completed) || 0, Number(target) || 0)}`}>{statusLabel(Number(completed) || 0, Number(target) || 0)}</span><b>{progressPercent(Number(completed) || 0, Number(target) || 0)}%</b><span>Status dan progres dihitung otomatis dari produced dan target.</span></div><button className="btn btn-primary btn-sm" disabled={productSaving}>{productSaving ? "Menyimpan…" : "Simpan perubahan"}</button></form>}
        <section className="production-account-comments"><div className="production-modal-section-heading"><div><h3>Komentar produk</h3><p>Komentar terbaru muncul lebih dahulu.</p></div><MessageSquareText size={15}/></div><form className="production-comment-form" onSubmit={event => { event.preventDefault(); void postComment(`/api/production/products/${product.id}/comments`, productComment, () => setProductComment(""), setProductCommentBusy, () => loadProduct(product.id)); }}><textarea required maxLength={2000} rows={2} value={productComment} onChange={event => setProductComment(event.target.value)} placeholder="Tambahkan komentar…"/><button className="btn btn-primary btn-sm" disabled={productCommentBusy || !productComment.trim()}><Send size={13}/>{productCommentBusy ? "Mengirim…" : "Kirim"}</button></form><CommentList comments={product.comments} userId={userId} admin={admin} onDelete={commentId => void deleteComment(`/api/production/products/${product.id}/comments/${commentId}`, product.comments.find(item => item.id === commentId)?.author?.id ?? null)}/></section>
        <details className="production-modal-history"><summary>Riwayat progres ({product.progressHistory.length})</summary>{product.progressHistory.length ? product.progressHistory.map(item => <div className="production-modal-history-item" key={item.id}><strong>{item.previousCompletedCount} → {item.newCompletedCount} unit</strong>{item.note && <p>{item.note}</p>}<small>{timeLabel(item.createdAt)} · {item.actor.name}</small></div>) : <p className="muted">Belum ada riwayat progres.</p>}</details>
      </>}</div>
    </section></div>}

    {templateFormOpen && <div className="modal-backdrop production-layer creation-layer" onMouseDown={event => { if (event.target === event.currentTarget && !creating) setTemplateFormOpen(false); }}><form role="dialog" aria-modal="true" aria-labelledby="production-create-title" className="modal production-create-modal" onKeyDown={keepFocusInside} onSubmit={saveTemplate} onMouseDown={event => event.stopPropagation()}><header className="production-modal-header"><div><span className="production-eyebrow"><PackagePlus size={14}/>{templateEditId ? "EDIT KATALOG" : "PRODUK BARU"}</span><h2 id="production-create-title" className="modal-title">{templateEditId ? "Edit template produk" : "Tambah produk baru"}</h2><p className="page-subtitle">{templateAssignAccount ? `Akan ditambahkan ke akun ${account?.name ?? "terpilih"}` : "Template katalog dapat digunakan di beberapa akun."}</p></div><button autoFocus type="button" className="btn btn-sm" onClick={() => setTemplateFormOpen(false)} aria-label="Tutup form"><X size={16}/></button></header><div className="production-modal-content"><div className="production-modal-edit-grid"><label className="form-field production-edit-note">Nama produk<input required maxLength={160} value={templateName} onChange={event => setTemplateName(event.target.value)}/></label><label className="form-field">Core / kategori<input maxLength={80} value={templateCore} onChange={event => setTemplateCore(event.target.value)}/></label><label className="form-field">Sub-core<input maxLength={80} value={templateSubCore} onChange={event => setTemplateSubCore(event.target.value)}/></label><label className="form-field">Target default<input required type="number" min={1} max={1000000} value={templateTarget} onChange={event => setTemplateTarget(event.target.value)}/></label><label className="form-field production-edit-note">Deskripsi / catatan<textarea rows={3} maxLength={4000} value={templateDescription} onChange={event => setTemplateDescription(event.target.value)}/></label></div>{accountError && <div className="notice production-error" role="alert">{accountError}</div>}<div className="modal-actions"><button type="button" className="btn" disabled={creating} onClick={() => setTemplateFormOpen(false)}>Batal</button><button className="btn btn-primary" disabled={creating}>{creating ? "Menyimpan?" : templateEditId ? "Simpan perubahan" : templateAssignAccount ? "Buat dan tambahkan ke akun" : "Simpan ke katalog"}</button></div></div></form></div>}

    {pickerOpen && account && <div className="modal-backdrop production-layer picker-layer" onMouseDown={event => { if (event.target === event.currentTarget) setPickerOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="production-picker-title" className="modal production-create-modal" onKeyDown={keepFocusInside} onMouseDown={event => event.stopPropagation()}><header className="production-modal-header"><div><span className="production-eyebrow"><Box size={14}/>Core Library</span><h2 id="production-picker-title" className="modal-title">Pilih produk</h2><p className="page-subtitle">Pilih template untuk ditambahkan ke {account.name}. Target dapat diatur khusus untuk akun ini.</p></div><button autoFocus className="btn btn-sm" onClick={() => setPickerOpen(false)} aria-label="Tutup pemilih produk"><X size={16}/></button></header><div className="production-modal-content"><label className="global-search production-picker-search"><Search size={14}/><input value={pickerQuery} onChange={event => setPickerQuery(event.target.value)} placeholder="Cari nama produk?" aria-label="Cari produk katalog"/></label><div className="production-picker-list">{catalog.filter(item => !item.isArchived && `${item.name} ${item.core ?? ""} ${item.subCore ?? ""}`.toLowerCase().includes(pickerQuery.trim().toLowerCase())).map(item => <article className={`production-picker-item${item.assigned ? " is-assigned" : ""}`} key={item.id}><label><input type="checkbox" checked={item.assigned || selectedTemplates.includes(item.id)} disabled={item.assigned} onChange={() => toggleTemplate(item)}/><span><b>{item.name}</b><small>{[item.core, item.subCore].filter(Boolean).join(" / ") || "Tanpa kategori"}</small></span></label><div><span>Default {item.defaultTarget?.toLocaleString("id-ID") ?? "?"}</span>{item.assigned ? <b>Sudah ditambahkan</b> : selectedTemplates.includes(item.id) && <label className="production-target-override">Target akun<input type="number" min={1} max={1000000} placeholder={String(item.defaultTarget ?? "Wajib diisi")} value={assignmentTargets[item.id] ?? ""} onChange={event => setAssignmentTargets(current => ({ ...current, [item.id]: event.target.value }))}/></label>}</div></article>)}{catalog.filter(item => !item.isArchived && `${item.name} ${item.core ?? ""} ${item.subCore ?? ""}`.toLowerCase().includes(pickerQuery.trim().toLowerCase())).length === 0 && <div className="production-empty">Tidak ada produk tersedia yang cocok.</div>}</div>{accountError && <div className="notice production-error" role="alert">{accountError}</div>}<div className="modal-actions"><button className="btn" onClick={() => setPickerOpen(false)}>Batal</button><button className="btn btn-primary" onClick={() => void assignTemplates()} disabled={creating || !selectedTemplates.length}>{creating ? "Menambahkan?" : `Tambahkan ${selectedTemplates.length} produk`}</button></div></div></section></div>}
    </>, document.body)}
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
