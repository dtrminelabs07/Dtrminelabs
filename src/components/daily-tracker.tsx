"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Grid2X2, List, MoreHorizontal, Plus, Search, UserPlus, UserRound, X } from "lucide-react";
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
  const router = useRouter();
  const [date, setDate] = useState(todayKey);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("name");
  const [canManageAccounts, setCanManageAccounts] = useState(false);
  const [view, setView] = useState<"list" | "matrix">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Status>("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialDate = params.get("date");
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) setDate(initialDate);
    const initialStatus = params.get("status");
    if (initialStatus === "UNRECORDED" || (initialStatus !== null && statuses.includes(initialStatus as Status))) setFilter(initialStatus ?? "");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" })
      .then(response => response.json())
      .then(session => { if (!controller.signal.aborted) setCanManageAccounts(session.user?.role === "ADMIN"); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tracker?date=" + date, { signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Tracker gagal dimuat.");
      setAccounts(data.accounts ?? []);
      setUploads(data.uploads ?? []);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Tracker gagal dimuat.");
      setAccounts([]);
      setUploads([]);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }, [date]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshVersion]);

  const uploadByAccount = useMemo(() => new Map(uploads.map(upload => [upload.accountId, upload])), [uploads]);
  const counts = useMemo(() => {
    const result: Record<Status, number> = { COMPLETED: 0, PENDING: 0, UPLOADED: 0, LIMIT: 0, OUT_OF_STOCK: 0, HOLIDAY: 0 };
    for (const upload of uploads) result[upload.status]++;
    return result;
  }, [uploads]);

  const unrecorded = Math.max(0, accounts.length - uploads.length);

  const filtered = useMemo(() => accounts.filter(account => {
    const upload = uploadByAccount.get(account.id);
    if (filter === "UNRECORDED" && upload) return false;
    if (filter && filter !== "UNRECORDED" && upload?.status !== filter) return false;
    const haystack = (account.name + " " + (account.username || "") + " " + account.core + " " + (account.subCore || "")).toLowerCase();
    return !search.trim() || haystack.includes(search.trim().toLowerCase());
  }).sort((a, b) => sort === "name-desc" ? b.name.localeCompare(a.name) : sort === "core" ? a.core.localeCompare(b.core) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [accounts, filter, search, sort, uploadByAccount]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const updateDate = (value: string) => {
    if (!value) return;
    setDate(value);
    setPage(1);
    router.replace("/tracker?date=" + value + (filter ? "&status=" + filter : ""), { scroll: false });
  };
  const moveDate = (delta: number) => {
    const current = new Date(date + "T12:00:00");
    current.setDate(current.getDate() + delta);
    updateDate(localDayKey(current));
  };
  const chooseToday = () => updateDate(todayKey());

  const openEditor = (account: Account) => {
    const upload = uploadByAccount.get(account.id);
    setEditing(account);
    setSelectedStatus(upload?.status ?? "PENDING");
    setNotes(upload?.notes ?? "");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/tracker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: editing.id, date, status: selectedStatus, notes: notes.trim() || null })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Status gagal disimpan.");
      setEditing(null);
      setToast("Status berhasil disimpan.");
      setRefreshVersion(value => value + 1);
      window.setTimeout(() => setToast(""), 2800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const exportDate = () => {
    const params = new URLSearchParams({ date, format: "xlsx" });
    if (filter && filter !== "UNRECORDED") params.set("status", filter);
    const link = document.createElement("a");
    link.href = "/api/export?" + params;
    link.download = "dtrminelabs-tracker-" + date + ".xlsx";
    link.click();
  };

  const dayLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(date + "T12:00:00"));
  const headerDateLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date + "T12:00:00"));

  const completedPct = accounts.length ? Math.round((counts.COMPLETED / accounts.length) * 100) : 0;
  const pendingPct = accounts.length ? Math.round((counts.PENDING / accounts.length) * 100) : 0;
  const limitPct = accounts.length ? Math.round((counts.LIMIT / accounts.length) * 100) : 0;
  const unrecordedPct = accounts.length ? Math.round((unrecorded / accounts.length) * 100) : 0;

  return (
    <main className="page daily-page">
      <div className="page-title-row daily-heading">
        <div>
          <h1 className="page-title">Upload Tracker</h1>
          <p className="page-subtitle">Pantau dan kelola aktivitas upload setiap hari.</p>
        </div>
        <div className="daily-header-actions">
          <div className="daily-date-controls">
            <button className="btn btn-sm" onClick={() => moveDate(-1)} aria-label="Hari sebelumnya">
              <ChevronLeft size={15} />
            </button>
            <label className="daily-date-picker btn btn-sm">
              <CalendarDays size={14} />
              <span>{dayLabel}</span>
              <input type="date" aria-label="Pilih tanggal tracker" value={date} onChange={event => updateDate(event.target.value)} />
            </label>
            <button className="btn btn-sm" onClick={() => moveDate(1)} aria-label="Hari berikutnya">
              <ChevronRight size={15} />
            </button>
            <button className="btn btn-sm today-button" onClick={chooseToday}>
              Hari ini
            </button>
          </div>
          {canManageAccounts && (
            <Link className="btn btn-primary btn-sm" href="/accounts?new=1">
              <Plus size={14} />Tambah akun
            </Link>
          )}
        </div>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}

      {/* 5 Prominent Stat Cards matching Mockup */}
      <section className="daily-stat-grid" aria-label="Ringkasan status tanggal terpilih">
        <button
          type="button"
          className={"daily-stat daily-total" + (!filter ? " selected" : "")}
          onClick={() => { setFilter(""); setPage(1); }}
        >
          <span className="daily-stat-title">Total Akun aktif</span>
          <strong className="daily-stat-value">{busy ? "—" : accounts.length}</strong>
          <div className="daily-stat-bar"><i style={{ width: "100%" }} /></div>
          <small className="daily-stat-sub">100%</small>
        </button>

        <button
          type="button"
          className={"daily-stat tone-completed" + (filter === "COMPLETED" ? " selected" : "")}
          onClick={() => { setFilter(value => value === "COMPLETED" ? "" : "COMPLETED"); setPage(1); }}
        >
          <span className="daily-stat-title">Selesai</span>
          <strong className="daily-stat-value">{busy ? "—" : counts.COMPLETED}</strong>
          <div className="daily-stat-bar"><i style={{ width: `${completedPct}%` }} /></div>
          <small className="daily-stat-sub">{completedPct}%</small>
        </button>

        <button
          type="button"
          className={"daily-stat tone-pending" + (filter === "PENDING" ? " selected" : "")}
          onClick={() => { setFilter(value => value === "PENDING" ? "" : "PENDING"); setPage(1); }}
        >
          <span className="daily-stat-title">Belum Dikerjakan</span>
          <strong className="daily-stat-value">{busy ? "—" : counts.PENDING}</strong>
          <div className="daily-stat-bar"><i style={{ width: `${pendingPct}%` }} /></div>
          <small className="daily-stat-sub">{pendingPct}%</small>
        </button>

        <button
          type="button"
          className={"daily-stat tone-limit" + (filter === "LIMIT" ? " selected" : "")}
          onClick={() => { setFilter(value => value === "LIMIT" ? "" : "LIMIT"); setPage(1); }}
        >
          <span className="daily-stat-title">Limit</span>
          <strong className="daily-stat-value">{busy ? "—" : counts.LIMIT}</strong>
          <div className="daily-stat-bar"><i style={{ width: `${limitPct}%` }} /></div>
          <small className="daily-stat-sub">{limitPct}%</small>
        </button>

        <button
          type="button"
          className={"daily-stat tone-unrecorded" + (filter === "UNRECORDED" ? " selected" : "")}
          onClick={() => { setFilter(value => value === "UNRECORDED" ? "" : "UNRECORDED"); setPage(1); }}
        >
          <span className="daily-stat-title">Tanpa Status</span>
          <strong className="daily-stat-value">{busy ? "—" : unrecorded}</strong>
          <div className="daily-stat-bar"><i style={{ width: `${unrecordedPct}%` }} /></div>
          <small className="daily-stat-sub">{unrecordedPct}%</small>
        </button>
      </section>

      {/* Main Table Workspace */}
      <section className="panel daily-workspace">
        <div className="daily-toolbar">
          <label className="global-search">
            <Search size={14} />
            <input
              aria-label="Cari akun tracker"
              placeholder="Cari nama atau username..."
              value={search}
              onChange={event => { setSearch(event.target.value); setPage(1); }}
            />
          </label>
          <select
            className="select"
            aria-label="Filter status tracker"
            value={filter}
            onChange={event => { setFilter(event.target.value); setPage(1); }}
          >
            <option value="">Semua status</option>
            <option value="UNRECORDED">Tanpa status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{labels[status]}</option>
            ))}
          </select>
          <select
            className="select"
            aria-label="Urutkan akun tracker"
            value={sort}
            onChange={event => setSort(event.target.value)}
          >
            <option value="name">Nama A–Z</option>
            <option value="name-desc">Nama Z–A</option>
            <option value="core">Kategori</option>
          </select>
          <div className="daily-toolbar-spacer" />
          <div className="view-toggle" role="group" aria-label="Tampilan tracker">
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="Tampilan daftar">
              <List size={15} />
            </button>
            <button className={view === "matrix" ? "active" : ""} onClick={() => setView("matrix")} aria-label="Tampilan matriks bulanan">
              <Grid2X2 size={15} />
            </button>
          </div>
          <button className="btn btn-sm" onClick={exportDate} disabled={busy}>
            <Download size={14} />Ekspor
          </button>
        </div>

        {view === "matrix" ? (
          <div className="daily-matrix-wrap">
            <TrackerMatrix isAdmin={canManageAccounts} />
          </div>
        ) : (
          <>
            <div className="daily-table-wrap">
              <table className="daily-table">
                <colgroup>
                  <col style={{ width: "64px" }} />
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "280px" }} />
                  <col style={{ width: "80px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="daily-col-no">NO.</th>
                    <th className="daily-col-name">NAMA AKUN</th>
                    <th className="daily-col-status">STATUS ({headerDateLabel.toUpperCase()})</th>
                    <th className="daily-col-actions">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((account, index) => {
                    const upload = uploadByAccount.get(account.id);
                    return (
                      <tr key={account.id}>
                        <td className="daily-col-no">{(page - 1) * pageSize + index + 1}</td>
                        <td className="daily-col-name">
                          <div className="daily-account-cell">
                            <span className="daily-account-avatar" aria-hidden="true">
                              <UserRound size={16} />
                            </span>
                            <div className="daily-account-copy">
                              <strong className="daily-account-name">{account.name}</strong>
                              <small className="muted">{account.username ? (account.username.startsWith("@") ? account.username : `@${account.username}`) : "Tanpa username"}</small>
                            </div>
                          </div>
                        </td>
                        <td className="daily-col-status">
                          {upload ? (
                            <span title={upload.notes || labels[upload.status]} className={"status-pill daily-status-pill status-" + upload.status.toLowerCase()}>
                              <i className="status-indicator" />
                              <span className="status-label-text">{labels[upload.status]}</span>
                              <small className="status-date-sub">{date}</small>
                            </span>
                          ) : (
                            <span className="status-pill daily-status-pill status-unrecorded">
                              <i className="status-indicator" />
                              <span className="status-label-text">Tanpa status</span>
                            </span>
                          )}
                        </td>
                        <td className="daily-col-actions">
                          <button
                            type="button"
                            className="btn btn-sm daily-row-action"
                            onClick={() => openEditor(account)}
                            aria-label={"Perbarui status " + account.name}
                            title="Perbarui status"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!busy && accounts.length === 0 && (
                <div className="empty daily-empty">
                  <strong>Belum ada akun aktif</strong>
                  <span>Tambahkan akun di menu Akun untuk memulai tracking.</span>
                  <Link className="btn btn-primary btn-sm" href="/accounts">Buka Akun</Link>
                </div>
              )}
              {!busy && accounts.length > 0 && rows.length === 0 && (
                <div className="empty daily-empty">Tidak ada akun yang cocok dengan filter.</div>
              )}
              {busy && <div className="daily-inline-loading" role="status">Memuat status untuk {date}...</div>}
            </div>

            {/* Pagination consistent with mockup */}
            <div className="daily-pagination">
              <span className="daily-pagination-info">
                {filtered.length ? `Menampilkan ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} dari ${filtered.length} akun` : "0 akun"}
              </span>
              <div className="daily-pagination-controls">
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={page <= 1 || busy}
                  onClick={() => setPage(value => value - 1)}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="daily-page-numbers">
                  {Array.from({ length: pages }, (_, i) => i + 1).map(p => {
                    if (pages > 7) {
                      if (p !== 1 && p !== pages && Math.abs(p - page) > 1) {
                        if (p === 2 || p === pages - 1) return <span key={p} className="daily-page-dots">…</span>;
                        return null;
                      }
                    }
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`daily-page-btn${p === page ? " active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={page >= pages || busy}
                  onClick={() => setPage(value => value + 1)}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
                <select
                  className="select select-pagesize"
                  value={pageSize}
                  onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}
                  aria-label="Pilih jumlah baris per halaman"
                >
                  <option value={10}>10 / halaman</option>
                  <option value={20}>20 / halaman</option>
                  <option value={30}>30 / halaman</option>
                  <option value={50}>50 / halaman</option>
                </select>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Status Editor Modal using portal */}
      {editing && mounted && createPortal(
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <section
            className="modal daily-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-edit-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-heading-row">
              <div>
                <h2 id="daily-edit-title" className="modal-title">Perbarui status</h2>
                <p className="page-subtitle">{editing.name} · {date}</p>
              </div>
              <button className="btn btn-sm" onClick={() => setEditing(null)} aria-label="Tutup dialog">
                <X size={14} />
              </button>
            </div>
            <label className="form-field">
              Status
              <select className="select" value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as Status)}>
                {statuses.map(status => (
                  <option key={status} value={status}>{labels[status]}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Catatan opsional
              <textarea
                value={notes}
                onChange={event => setNotes(event.target.value)}
                maxLength={1000}
                placeholder="Tambahkan catatan untuk status ini"
              />
            </label>
            <div className="modal-actions">
              <button className="btn" onClick={() => setEditing(null)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
