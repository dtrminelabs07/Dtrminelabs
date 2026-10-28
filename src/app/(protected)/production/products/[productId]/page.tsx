"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Archive, Clock3, MessageSquareText, Save, Send, X } from "lucide-react";

type Person = { id: string; name: string } | null;
type Comment = { id: string; content: string; createdAt: string; author: Person };
type ProgressChange = { id: string; previousCompletedCount: number; newCompletedCount: number; previousTargetCount: number | null; newTargetCount: number | null; note: string | null; createdAt: string; actor: { id: string; name: string } };
type Product = { id: string; accountId: string; name: string; targetCount: number; completedCount: number; isArchived: boolean; progress: number; status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED"; account: { id: string; name: string; username: string | null; isActive: boolean }; comments: Comment[]; progressHistory: ProgressChange[] };
const statusText = { COMPLETED: "Selesai", IN_PROGRESS: "Dalam proses", NOT_STARTED: "Belum dimulai" };
const timestamp = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function ProductionProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const [productId, setProductId] = useState(""); const [product, setProduct] = useState<Product | null>(null); const [admin, setAdmin] = useState(false);
  const [name, setName] = useState(""); const [target, setTarget] = useState(""); const [completed, setCompleted] = useState(""); const [progressNote, setProgressNote] = useState(""); const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(true); const [saving, setSaving] = useState(false); const [commentBusy, setCommentBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { void params.then(({ productId: id }) => setProductId(id)); }, [params]);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!productId) return;
    setBusy(true); setError("");
    try {
      const [response, sessionResponse] = await Promise.all([fetch(`/api/production/products/${productId}`, { cache: "no-store", signal }), fetch("/api/auth/session", { cache: "no-store", signal })]);
      const [payload, session] = await Promise.all([response.json(), sessionResponse.json()]); if (!response.ok) throw new Error(payload.error || "Detail produk gagal dimuat.");
      if (signal?.aborted) return;
      const next = payload as Product; setProduct(next); setName(next.name); setTarget(String(next.targetCount)); setCompleted(String(next.completedCount)); setAdmin(session.user?.role === "ADMIN");
    } catch (cause) { if (cause instanceof DOMException && cause.name === "AbortError") return; setError(cause instanceof Error ? cause.message : "Detail produk gagal dimuat."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [productId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  async function saveProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!product) return; setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/production/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, targetCount: Number(target), completedCount: Number(completed), note: progressNote || null }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Progres gagal disimpan.");
      setProgressNote(""); setMessage("Perubahan progres tersimpan."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Progres gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!product || !comment.trim()) return; setCommentBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/production/products/${product.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Komentar gagal disimpan.");
      setComment(""); setMessage("Komentar tersimpan."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Komentar gagal disimpan."); }
    finally { setCommentBusy(false); }
  }

  async function archive() {
    if (!product || !window.confirm(`${product.isArchived ? "Pulihkan" : "Arsipkan"} produk ${product.name}? Data komentar dan riwayat progres tetap tersimpan.`)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/production/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isArchived: !product.isArchived }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Status produk gagal diubah.");
      setMessage(product.isArchived ? "Produk dipulihkan." : "Produk diarsipkan. Riwayat tetap tersedia."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Produk gagal diperbarui."); }
    finally { setSaving(false); }
  }

  const progress = product ? Math.round(product.completedCount / product.targetCount * 100) : 0;
  return <main className="page production-page">
    <Link href={product ? `/production/accounts/${product.accountId}` : "/production"} className="production-back-link"><ArrowLeft size={15}/>{product ? `Kembali ke ${product.account.name}` : "Kembali ke dashboard produksi"}</Link>
    {error && <div className="notice production-error" role="alert">{error}<button className="production-notice-close" onClick={() => setError("")} aria-label="Tutup"><X size={14}/></button></div>}
    {message && <div className="notice production-notice" role="status">{message}</div>}
    {busy && !product ? <div className="production-empty">Memuat detail produk…</div> : product && <>
      <div className="page-title-row production-product-title"><div><div className="production-eyebrow"><MessageSquareText size={14}/>DETAIL PRODUK</div><h1 className="page-title">{product.name}</h1><p className="page-subtitle"><Link href={`/production/accounts/${product.account.id}`}>{product.account.name}</Link>{product.account.username ? ` · ${product.account.username}` : ""}</p></div>{admin && <button className="btn" onClick={() => void archive()} disabled={saving}><Archive size={14}/>{product.isArchived ? "Pulihkan produk" : "Arsipkan produk"}</button>}</div>
      <section className="production-product-detail-grid">
        <article className="panel production-progress-panel"><div className="production-progress-hero"><div className={`production-product-state state-${product.status === "COMPLETED" ? "done" : product.status === "IN_PROGRESS" ? "progress" : "pending"}`}>{statusText[product.status]}</div><strong>{progress}%</strong><span>progres selesai</span></div><div className="production-progress-track"><i style={{ width: `${progress}%` }}/></div><div className="production-detail-counts"><div><span>Target</span><strong>{product.targetCount.toLocaleString("id-ID")}</strong></div><div><span>Sudah dikerjakan</span><strong>{product.completedCount.toLocaleString("id-ID")}</strong></div><div><span>Sisa</span><strong>{Math.max(0, product.targetCount - product.completedCount).toLocaleString("id-ID")}</strong></div></div>{product.isArchived && <div className="notice">Produk diarsipkan. Data dan riwayatnya tetap tersimpan.</div>}</article>
        <form className="panel production-edit-panel" onSubmit={saveProgress}><div className="panel-head"><div><h2 className="panel-title">Perbarui produk</h2><p className="panel-sub">Progres dan status dihitung otomatis saat disimpan.</p></div><Save size={16} className="muted"/></div><div className="production-edit-fields"><label className="form-field">Nama produk<input required maxLength={160} disabled={!admin || product.isArchived} value={name} onChange={event => setName(event.target.value)}/></label><div className="production-edit-numbers"><label className="form-field">Target<input required type="number" min={1} max={1000000} step={1} disabled={!admin || product.isArchived} value={target} onChange={event => setTarget(event.target.value)}/></label><label className="form-field">Jumlah selesai<input required type="number" min={0} max={Number(target) || product.targetCount} step={1} disabled={!admin || product.isArchived} value={completed} onChange={event => setCompleted(event.target.value)}/></label></div><label className="form-field">Catatan progres (opsional)<textarea rows={3} maxLength={2000} disabled={!admin || product.isArchived} value={progressNote} onChange={event => setProgressNote(event.target.value)} placeholder="Catat kendala atau perubahan pekerjaan"/></label>{admin && <button className="btn btn-primary" disabled={saving || product.isArchived}><Save size={14}/>{saving ? "Menyimpan…" : "Simpan progres"}</button>}</div></form>
      </section>
      <section className="production-history-grid"><article className="panel production-history-panel"><div className="panel-head"><div><h2 className="panel-title">Riwayat progres</h2><p className="panel-sub">Perubahan angka disimpan bersama waktu dan pengguna.</p></div><Clock3 size={15} className="muted"/></div>{product.progressHistory.length ? <div className="production-timeline">{product.progressHistory.map(item => <div className="production-timeline-item" key={item.id}><span className="production-timeline-dot"/><div><strong>{item.previousCompletedCount.toLocaleString("id-ID")} → {item.newCompletedCount.toLocaleString("id-ID")} unit{item.previousTargetCount !== null && item.newTargetCount !== null ? ` · Target ${item.previousTargetCount.toLocaleString("id-ID")} → ${item.newTargetCount.toLocaleString("id-ID")}` : ""}</strong>{item.note && <p>{item.note}</p>}<small>{timestamp(item.createdAt)} · {item.actor.name}</small></div></div>)}</div> : <div className="production-empty compact-empty">Belum ada perubahan progres.</div>}</article>
        <article className="panel production-comments-panel"><div className="panel-head"><div><h2 className="panel-title">Komentar produksi</h2><p className="panel-sub">Kendala, catatan, dan koordinasi pengerjaan.</p></div><MessageSquareText size={15} className="muted"/></div>{admin && <form className="production-comment-form" onSubmit={addComment}><textarea required maxLength={2000} rows={3} value={comment} onChange={event => setComment(event.target.value)} placeholder="Tulis komentar untuk produk ini…"/><button className="btn btn-primary btn-sm" disabled={commentBusy || !comment.trim()}><Send size={13}/>{commentBusy ? "Mengirim…" : "Kirim komentar"}</button></form>}{product.comments.length ? <div className="production-comment-list">{product.comments.map(item => <div className="production-comment" key={item.id}><div><strong>{item.author?.name ?? "Pengguna"}</strong><time>{timestamp(item.createdAt)}</time></div><p>{item.content}</p></div>)}</div> : <div className="production-empty compact-empty">Belum ada komentar.</div>}</article></section>
    </>}
  </main>;
}
