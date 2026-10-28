"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Clock3, RefreshCw } from "lucide-react";
import { dateKeyInTimezone } from "@/lib/date";

const statuses = ["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as const;
type Status = typeof statuses[number];
type Account = { id: string; name: string };
type Upload = { id: string; accountId: string; date: string; status: Status; notes: string | null };
const labels: Record<Status, string> = { COMPLETED: "Selesai", PENDING: "Belum dikerjakan", UPLOADED: "Sudah upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };
const colors: Record<Status, string> = { COMPLETED: "#10d6a0", PENDING: "#ffc83d", UPLOADED: "#20b8ff", LIMIT: "#c477ff", OUT_OF_STOCK: "#ff5263", HOLIDAY: "#ed45db" };
const keyFor = (date: Date) => String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
const today = dateKeyInTimezone();

export default function CalendarPage() {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedMonth = query.get("month");
    const requestedDate = query.get("date");
    if (requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) setMonth(requestedMonth);
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) { setSelected(requestedDate); setMonth(requestedDate.slice(0, 7)); }
  }, []);

  const load = useCallback(async (signal: AbortSignal) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/tracker?month=" + month, { signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kalender gagal dimuat.");
      setAccounts(data.accounts ?? []); setUploads(data.uploads ?? []);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Kalender gagal dimuat."); setAccounts([]); setUploads([]);
    } finally { if (!signal.aborted) setBusy(false); }
  }, [month]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const uploadByDay = useMemo(() => {
    const result = new Map<string, Upload[]>();
    for (const upload of uploads) { const key = String(upload.date).slice(0, 10); result.set(key, [...(result.get(key) ?? []), upload]); }
    return result;
  }, [uploads]);
  const selectedRows = useMemo(() => uploadByDay.get(selected) ?? [], [uploadByDay, selected]);
  const counts = useMemo(() => {
    const result: Record<Status, number> = { COMPLETED: 0, PENDING: 0, UPLOADED: 0, LIMIT: 0, OUT_OF_STOCK: 0, HOLIDAY: 0 };
    for (const row of selectedRows) result[row.status]++;
    return result;
  }, [selectedRows]);
  const pendingOrUnrecorded = Math.max(0, accounts.length - selectedRows.length);
  const monthDate = new Date(month + "-01T12:00:00");
  const year = monthDate.getFullYear(); const monthIndex = monthDate.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    const cellDate = new Date(year, monthIndex, day);
    return { key: keyFor(cellDate), day: cellDate.getDate(), currentMonth: day >= 1 && day <= daysInMonth };
  });
  const move = (step: number) => { const date = new Date(month + "-01T12:00:00"); date.setMonth(date.getMonth() + step); const nextMonth = keyFor(date).slice(0, 7); setMonth(nextMonth); setSelected(nextMonth + "-01"); };
  const chooseMonth = (value: string) => { if (value) { setMonth(value); setSelected(value + "-01"); } };
  const chooseYear = (value: string) => { if (/^\d{4}$/.test(value)) { const next = value + "-" + month.slice(5, 7); setMonth(next); setSelected(next + "-01"); } };
  const dayLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(selected + "T12:00:00"));

  return <main className="page calendar-page">
    <div className="page-title-row"><div><div className="home-kicker"><CalendarDays size={13} /> MONTHLY OVERVIEW</div><h1 className="page-title">Kalender</h1><p className="page-subtitle">Jelajahi catatan status berdasarkan bulan dan tanggal.</p></div><Link className="btn btn-primary" href={"/tracker?date=" + selected}><CircleCheck size={14} />Buka tracker tanggal</Link></div>
    {error && <div className="notice" role="alert">{error}<button className="btn btn-sm" onClick={() => setMonth(value => value)}>Coba lagi</button></div>}
    <div className="calendar-layout">
      <section className="panel calendar-main">
        <div className="panel-head calendar-main-head"><div><div className="panel-title">Kalender aktivitas</div><div className="panel-sub">Titik warna menunjukkan status yang tercatat pada tanggal tersebut</div></div><div className="calendar-controls"><button className="btn btn-sm" onClick={() => move(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={15} /></button><input className="field" type="month" aria-label="Pilih bulan kalender" value={month} onChange={event => chooseMonth(event.target.value)} /><select className="select" aria-label="Pilih tahun kalender" value={year} onChange={event => chooseYear(event.target.value)}>{Array.from({ length: 121 }, (_, index) => 2000 + index).map(value => <option key={value} value={value}>{value}</option>)}</select><button className="btn btn-sm" onClick={() => move(1)} aria-label="Bulan berikutnya"><ChevronRight size={15} /></button><button className="btn btn-sm calendar-today" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Hari ini</button></div></div>
        <div className="calendar-month-label">{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(monthDate)}</div>
        <div className="calendar-grid">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((weekday, index) => <div key={weekday + index} className="calendar-weekday">{weekday}</div>)}
          {cells.map(cell => {
            const rows = uploadByDay.get(cell.key) ?? [];
            const present = new Set(rows.map(row => row.status));
            return <button type="button" key={cell.key} className={"calendar-day" + (!cell.currentMonth ? " outside" : "") + (cell.key === selected ? " selected" : "") + (cell.key === today ? " today" : "")} onClick={() => { setSelected(cell.key); if (!cell.currentMonth) setMonth(cell.key.slice(0, 7)); }} aria-label={cell.key + ", " + rows.length + " catatan"} aria-pressed={cell.key === selected}>
              <span className="calendar-day-number">{cell.day}</span>{rows.length > 0 && <small className="calendar-day-total">{rows.length}</small>}
              {present.size > 0 && <span className="calendar-markers">{statuses.filter(status => present.has(status)).map(status => <i key={status} style={{ background: colors[status] }} title={labels[status]} />)}</span>}
            </button>;
          })}
        </div>
        <div className="calendar-legend">{statuses.map(status => <span key={status}><i style={{ background: colors[status] }} />{labels[status]}</span>)}</div>
        {busy && <div className="calendar-loading" role="status"><RefreshCw size={13} />Memuat aktivitas bulan ini...</div>}
      </section>
      <aside className="panel calendar-detail">
        <div className="calendar-detail-head"><div className="home-kicker"><CalendarDays size={13} /> SELECTED DATE</div><h2>{dayLabel}</h2><p>{busy ? "Memuat data..." : selectedRows.length + " dari " + accounts.length + " akun memiliki status"}</p></div>
        <div className="calendar-detail-total"><span>Total akun aktif</span><strong>{busy ? "—" : accounts.length}</strong><small>{pendingOrUnrecorded} belum memiliki catatan</small></div>
        <div className="calendar-status-list">{statuses.map(status => <Link key={status} href={"/tracker?date=" + selected + "&status=" + status} className="calendar-status-row"><i style={{ background: colors[status] }} /><span>{labels[status]}</span><strong>{busy ? "—" : counts[status]}</strong><ChevronRight size={14} /></Link>)}<Link href={"/tracker?date=" + selected + "&status=UNRECORDED"} className="calendar-status-row calendar-status-unrecorded"><i /><span>Tanpa status</span><strong>{busy ? "—" : pendingOrUnrecorded}</strong><ChevronRight size={14} /></Link></div>
        <div className="calendar-detail-actions"><Link className="btn btn-primary" href={"/tracker?date=" + selected}>Lihat akun pada tanggal ini</Link><Link className="btn" href={"/reports?mode=month&month=" + selected.slice(0, 7)}><Clock3 size={14} />Laporan bulanan</Link></div>
      </aside>
    </div>
  </main>;
}
