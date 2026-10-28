"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal } from "lucide-react";
import { monthKeyInTimezone } from "@/lib/date";

type Account = {
  id: string;
  name: string;
  username: string | null;
  core: string;
  subCore: string | null;
  platform: string | null;
};
type Upload = { id: string; accountId: string; date: string; status: Status; notes: string | null; updatedAt: string };
type Status = "COMPLETED" | "PENDING" | "UPLOADED" | "LIMIT" | "OUT_OF_STOCK" | "HOLIDAY";
type MonthView = { year: number; month: number };

const statuses: Status[] = ["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"];
const labels: Record<Status, string> = {
  COMPLETED: "Sudah",
  PENDING: "Belum",
  UPLOADED: "Sudah Upload",
  LIMIT: "Limit",
  OUT_OF_STOCK: "Stok Habis",
  HOLIDAY: "Libur",
};
const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const shortDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function TrackerMatrix({ onSaved }: { onSaved?: () => void } = {}) {
  const initialMonth = monthKeyInTimezone();
  const [view, setView] = useState<MonthView>(() => { const [year, month] = initialMonth.split("-").map(Number); return { year, month: month - 1 }; });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [core, setCore] = useState("");
  const [subCore, setSubCore] = useState("");
  const [status, setStatus] = useState("");
  const [focusDate, setFocusDate] = useState("");
  const [sort, setSort] = useState("core");
  const [toast, setToast] = useState("");
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<{ account: Account; date: string; upload?: Upload } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Status>("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [comfortable, setComfortable] = useState(false);
  const [yearInput, setYearInput] = useState(initialMonth.slice(0, 4));

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const month = `${view.year}-${String(view.month + 1).padStart(2, "0")}`;
      const response = await fetch(`/api/tracker?month=${month}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAccounts(data.accounts);
      setUploads(data.uploads);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Gagal memuat tracker");
      setError(true);
    } finally {
      setBusy(false);
    }
  }, [view, setBusy, setAccounts, setUploads, setToast, setError]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => setYearInput(String(view.year)), [view.year]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const month = params.get("month");
    const date = params.get("date");
    const requestedStatus = params.get("status");
    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const [year, monthNumber] = month.split("-").map(Number);
      setView({ year, month: monthNumber - 1 });
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) {
        setFocusDate(date);
        setView({ year: parsed.getUTCFullYear(), month: parsed.getUTCMonth() });
      }
    }
    if (requestedStatus && statuses.includes(requestedStatus as Status)) setStatus(requestedStatus);
  }, []);

  const dateStatus = useMemo(() => new Map(uploads.map(upload => [`${upload.accountId}:${String(upload.date).slice(0, 10)}`, upload])), [uploads]);
  const cores = useMemo(() => Array.from(new Set(accounts.map(account => account.core))).sort(), [accounts]);
  const subCores = useMemo(() => Array.from(new Set(
    accounts.filter(account => !core || account.core === core).map(account => account.subCore).filter((value): value is string => !!value),
  )).sort(), [accounts, core]);
  const days = new Date(view.year, view.month + 1, 0).getDate();
  const dates = useMemo(() => Array.from({ length: days }, (_, index) => {
    const date = dayKey(view.year, view.month, index + 1);
    return { date, day: index + 1, weekday: shortDays[new Date(view.year, view.month, index + 1).getDay()] };
  }), [days, view]);
  const filtered = useMemo(() => accounts.filter(account => {
    if (core && account.core !== core) return false;
    if (subCore && account.subCore !== subCore) return false;
    if (query && !`${account.name} ${account.username ?? ""} ${account.core} ${account.subCore ?? ""} ${account.platform ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (!status) return true;
    if (focusDate) {
      const state = dateStatus.get(`${account.id}:${focusDate}`)?.status;
      return status === "PENDING" ? state === status || !state : state === status;
    }
    return dates.some(({ date }) => dateStatus.get(`${account.id}:${date}`)?.status === status);
  }).sort((a, b) => sort === "name"
    ? a.name.localeCompare(b.name)
    : sort === "subcore"
      ? (a.subCore ?? "").localeCompare(b.subCore ?? "") || a.name.localeCompare(b.name)
      : a.core.localeCompare(b.core) || a.name.localeCompare(b.name)), [accounts, core, subCore, query, status, focusDate, dateStatus, dates, sort]);

  function move(step: number) {
    setFocusDate("");
    setView(current => {
      const date = new Date(current.year, current.month + step, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function openCell(account: Account, date: string, upload?: Upload) {
    setSelected({ account, date, upload });
    setSelectedStatus(upload?.status ?? "PENDING");
    setNotes(upload?.notes ?? "");
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch("/api/tracker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selected.account.id, date: selected.date, status: selectedStatus, notes: notes.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(null);
      setToast("Status berhasil disimpan");
      setError(false);
      await load();
      onSaved?.();
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Gagal menyimpan status");
      setError(true);
    } finally {
      setSaving(false);
      window.setTimeout(() => setToast(""), 3200);
    }
  }

  function exportMonth(format: "csv" | "xlsx") {
    const link = document.createElement("a");
    link.href = `/api/export?month=${view.year}-${String(view.month + 1).padStart(2, "0")}${format === "xlsx" ? "&format=xlsx" : ""}`;
    link.download = `dtrminelabs-${view.year}-${String(view.month + 1).padStart(2, "0")}.${format}`;
    link.click();
  }

  return <>
    <section className="panel tracker-matrix-panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Matriks upload bulanan</div>
          <div className="panel-sub">{filtered.length} akun aktif · {days} hari · klik status untuk mengubah{focusDate && status ? ` · ${labels[status as Status]} pada ${focusDate}` : ""}</div>
        </div>
        <div className="calendar-toolbar">
          <button className="btn btn-sm" onClick={() => move(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={15} /></button>
          <div className="month-label">{months[view.month]} {view.year}</div>
          <button className="btn btn-sm" onClick={() => move(1)} aria-label="Bulan berikutnya"><ChevronRight size={15} /></button>
          <label className="select matrix-month-select"><select aria-label="Pilih bulan" value={view.month} onChange={event => { setFocusDate(""); setView(current => ({ ...current, month: Number(event.target.value) })); }}>
            {months.map((month, index) => <option key={month} value={index}>{month}</option>)}
          </select></label>
          <input className="field matrix-year-input" aria-label="Pilih tahun" type="number" min="1900" max="2100" value={yearInput} onChange={event => setYearInput(event.target.value)} onBlur={() => {
            const parsedYear = Number(yearInput);
            if (Number.isInteger(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100) {
              setFocusDate("");
              setView(current => ({ ...current, year: parsedYear }));
            } else setYearInput(String(view.year));
          }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
        </div>
      </div>

      <div className="matrix-tools">
        <label className="global-search matrix-search"><Search size={13} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama akun..." aria-label="Cari akun di matriks" /></label>
        <select className="select" aria-label="Filter core" value={core} onChange={event => { setCore(event.target.value); setSubCore(""); }}><option value="">Semua core</option>{cores.map(value => <option key={value}>{value}</option>)}</select>
        <select className="select" aria-label="Filter sub-core" value={subCore} onChange={event => setSubCore(event.target.value)}><option value="">Semua sub-core</option>{subCores.map(value => <option key={value}>{value}</option>)}</select>
        <select className="select" aria-label="Filter status" value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua status</option>{statuses.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select>
        <select className="select" aria-label="Urutkan akun" value={sort} onChange={event => setSort(event.target.value)}><option value="core">Urutkan: Core</option><option value="name">Urutkan: Nama</option><option value="subcore">Urutkan: Sub-core</option></select>
        <button className="btn btn-sm" onClick={() => { setQuery(""); setCore(""); setSubCore(""); setStatus(""); setSort("core"); setFocusDate(""); }}><SlidersHorizontal size={13} />Reset</button>
        <button className="btn btn-sm" onClick={() => setComfortable(value => !value)}>{comfortable ? "Mode ringkas" : "Mode nyaman"}</button>
        <button className="btn btn-sm" onClick={() => exportMonth("csv")}><Download size={13} />CSV</button>
        <button className="btn btn-sm" onClick={() => exportMonth("xlsx")}><Download size={13} />Excel</button>
      </div>

      <div className={`matrix-scroll${comfortable ? " matrix-scroll-comfortable" : ""}`}>
        {busy ? <div className="matrix-skeleton" role="status" aria-label="Memuat data tracker"><div className="matrix-skeleton-head">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>{Array.from({ length: 3 }, (_, row) => <div className="matrix-skeleton-row" key={row}>{Array.from({ length: 7 }, (_, column) => <i key={column} />)}</div>)}</div>
          : accounts.length === 0 ? <div className="empty">Belum ada akun aktif. Tambahkan akun untuk memulai tracker.</div>
            : filtered.length === 0 ? <div className="empty">Tidak ada akun yang cocok dengan filter.</div>
              : <table className={`matrix${comfortable ? " matrix--comfortable" : ""}`}>
                <thead><tr><th className="matrix-corner" scope="col">Nama Akun</th>{dates.map(({ date, day, weekday }) => <th className="matrix-date-header" scope="col" key={date} title={new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))}><span>{day}</span><small>{weekday}</small></th>)}</tr></thead>
                <tbody>{filtered.map(account => <tr key={account.id}>
                  <th scope="row" className="matrix-account-cell"><div className="account-head"><strong title={account.name}>{account.name}</strong><span title={[account.core, account.subCore].filter(Boolean).join(" · ")}>{account.core}{account.subCore ? ` · ${account.subCore}` : ""}</span></div></th>
                  {dates.map(({ date }) => {
                    const upload = dateStatus.get(`${account.id}:${date}`);
                    const state = upload?.status;
                    const title = `${account.name} · ${date} · ${state ? labels[state] : "Belum dicatat"}${upload?.notes ? ` · ${upload.notes}` : ""}`;
                    return <td key={`${account.id}:${date}`} title={title}><button className={`matrix-cell ${state ? `status-${state.toLowerCase()}` : "cell-empty"}`} onClick={() => openCell(account, date, upload)} aria-label={`${account.name}, ${date}, ${state ? labels[state] : "Belum dicatat"}. Klik untuk mengubah.`}>{state ? labels[state] : "—"}</button></td>;
                  })}
                </tr>)}</tbody>
              </table>}
      </div>

      <div className="legend">{statuses.map(value => <span className="legend-item" key={value}><span className={`legend-dot status-${value.toLowerCase()}`} />{labels[value]}</span>)}<span className="legend-item"><span className="legend-dot matrix-empty-dot" />Belum dicatat</span></div>
    </section>

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="modal" onClick={event => event.stopPropagation()}>
      <h2 className="modal-title">Perbarui status</h2><p className="page-subtitle">{selected.account.name} · {selected.date}</p>
      <label className="form-field matrix-edit-field" style={{ marginTop: 18 }}>Status<select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as Status)}>{statuses.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
      <label className="form-field matrix-edit-field" style={{ marginTop: 12 }}>Catatan opsional<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Tambahkan konteks untuk perubahan ini..." maxLength={1000} /></label>
      <div className="modal-actions"><button className="btn" onClick={() => setSelected(null)}>Batal</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan perubahan"}</button></div>
    </section></div>}
    {toast && <div className={`toast ${error ? "error" : ""}`} role="status">{toast}</div>}
  </>;
}
