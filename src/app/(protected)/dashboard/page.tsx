"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, CalendarDays, Check, Clock3, Plus, UploadCloud } from "lucide-react";
import TrackerMatrix from "@/components/tracker-matrix";

type Status = "COMPLETED" | "PENDING" | "UPLOADED" | "LIMIT" | "OUT_OF_STOCK" | "HOLIDAY";
type Account = { id: string; name: string; core: string; subCore: string | null };
type Upload = { id: string; accountId: string; date: string; status: Status; notes: string | null };
type History = { id: string; description: string; createdAt: string; account: { name: string }; actor: { name: string }; newStatus: Status | null };
const labels: Record<Status, string> = { COMPLETED: "Selesai", PENDING: "Belum dikerjakan", UPLOADED: "Sudah upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };
const tones: Record<Status, string> = { COMPLETED: "#10d6a0", PENDING: "#ffc83d", UPLOADED: "#20b8ff", LIMIT: "#c477ff", OUT_OF_STOCK: "#ff5263", HOLIDAY: "#ed45db" };
function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [activity, setActivity] = useState<History[]>([]);
  const [date, setDate] = useState(() => localDate(new Date()));
  const [busy, setBusy] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [month, setMonth] = useState(new Date());
  useEffect(() => {
    async function load() {
      setBusy(true);
      setLoadError("");
      try {
        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
        const json = async (url: string) => { const response = await fetch(url); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Data dashboard gagal dimuat."); return data; };
        const [tracker, history] = await Promise.all([json(`/api/tracker?month=${key}`), json("/api/history?page=1")]);
        setAccounts(tracker.accounts ?? []); setUploads(tracker.uploads ?? []); setActivity(history.items ?? []);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Tidak dapat memuat dashboard.");
        setAccounts([]); setUploads([]); setActivity([]);
      } finally { setBusy(false); }
    }
    void load();
  }, [month]);
  const dayUploads = useMemo(() => uploads.filter(row => String(row.date).slice(0, 10) === date), [uploads, date]);
  const count = (status: Status) => dayUploads.filter(row => row.status === status).length;
  const done = count("COMPLETED");
  const pending = accounts.length - dayUploads.filter(row => ["COMPLETED", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"].includes(row.status)).length;
  const progress = accounts.length ? Math.round(done / accounts.length * 100) : 0;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weekly = useMemo(() => {
    const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, index) => ({ label: `Minggu ${index + 1}`, total: 0, counts: Object.fromEntries(Object.keys(labels).map(status => [status, 0])) as Record<Status, number> }));
    for (const upload of uploads) {
      const [year, monthNumber, day] = String(upload.date).slice(0, 10).split("-").map(Number);
      if (year !== month.getFullYear() || monthNumber !== month.getMonth() + 1) continue;
      const week = weeks[Math.floor((day - 1) / 7)];
      if (week) { week.total += 1; week.counts[upload.status] += 1; }
    }
    return weeks;
  }, [uploads, month, days]);
  const weeklyMax = Math.max(1, ...weekly.map(week => week.total));
  const reminder = accounts.filter(account => !dayUploads.some(row => row.accountId === account.id));
  function chooseMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    const day = Number(date.slice(-2));
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setMonth(next);
    setDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`);
  }
  function chooseDate(value: string) { setDate(value); if (value) setMonth(new Date(`${value}T12:00:00`)); }

  return <main className={busy ? "page is-loading" : "page"}>
    <div className="page-title-row"><div><h1 className="page-title">Upload Tracker</h1><p className="page-subtitle">Kelola dan pantau progres upload harian semua akun.</p><p className="page-subtitle" style={{ marginTop: 8 }}>Tanggal laporan: <input type="date" className="field" value={date} onChange={event => chooseDate(event.target.value)} /></p></div><Link className="btn btn-primary" href="/calendar"><CalendarDays size={15} />Buka kalender</Link></div>
    {loadError && <div className="notice" role="alert" style={{ marginBottom: 14 }}>{loadError} <button className="btn btn-sm" onClick={() => setMonth(new Date(month))}>Coba lagi</button></div>}
    <div className="stats-grid">{(["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as Status[]).map(status => <Link href={`/calendar?month=${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}&date=${date}&status=${status}`} className={`stat-card stat-card-link stat-${status.toLowerCase()}`} key={status} style={{ "--tone": tones[status] } as React.CSSProperties}><div className="stat-label"><span className="stat-dot" />{labels[status]}</div><div className="stat-value">{busy ? "—" : status === "PENDING" ? pending : count(status)}</div><div className="stat-foot">{accounts.length ? Math.round((status === "PENDING" ? pending : count(status)) / accounts.length * 100) : 0}% dari akun · lihat akun</div></Link>)}<Link href="/accounts" className="stat-card stat-card-link stat-total" style={{ "--tone": "#1685ff" } as React.CSSProperties}><div className="stat-label"><span className="stat-dot" />Total akun</div><div className="stat-value">{busy ? "—" : accounts.length}</div><div className="stat-foot">akun aktif · lihat akun</div></Link></div>
    <div className="panel trend-panel" style={{ marginBottom: 15 }}><div className="panel-head"><div><div className="panel-title">Aktivitas tracker bulan ini</div><div className="panel-sub">Catatan status tersimpan, dikelompokkan per pekan</div></div><span className="trend-total">{uploads.length} catatan</span></div><div className="trend-chart">{weekly.map(week => <div className="trend-row" key={week.label}><span>{week.label}</span><div className="trend-track" role="img" aria-label={`${week.label}: ${week.total} catatan status`}>{(["COMPLETED", "UPLOADED", "PENDING", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as Status[]).map(status => week.counts[status] > 0 && <i key={status} title={`${labels[status]}: ${week.counts[status]}`} style={{ width: `${week.counts[status] / weeklyMax * 100}%`, background: tones[status] }} />)}</div><b>{week.total}</b></div>)}<div className="trend-legend">{(["COMPLETED", "UPLOADED", "PENDING", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as Status[]).map(status => <span key={status}><i style={{ background: tones[status] }} />{labels[status]}</span>)}</div></div></div>
    <div className="dashboard-grid"><section>
      <div className="panel" style={{ marginBottom: 15 }}><div className="panel-head"><div><div className="panel-title">Progres penyelesaian</div><div className="panel-sub">Status tanggal {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`))}</div></div><strong style={{ color: "#54dfb7", fontSize: 18 }}>{progress}%</strong></div><div className="progress-wrap"><div className="progress-top"><span className="muted" style={{ fontSize: 11 }}>{done} dari {accounts.length} akun berstatus selesai</span><span className="muted" style={{ fontSize: 11 }}>{pending} belum diproses</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div></div>
      <div className="panel" style={{ marginBottom: 15 }}><div className="panel-head"><div><div className="panel-title">Ringkasan bulanan</div><div className="panel-sub">Pilih tanggal untuk melihat status harian</div></div><div className="calendar-toolbar"><button className="btn btn-sm" onClick={() => chooseMonth(-1)} aria-label="Bulan sebelumnya">‹</button><span className="muted" style={{ fontSize: 11 }}>{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month)}</span><button className="btn btn-sm" onClick={() => chooseMonth(1)} aria-label="Bulan berikutnya">›</button></div></div><div style={{ padding: 15, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>{["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day, i) => <div key={`${day}${i}`} style={{ textAlign: "center", color: "#7890ac", fontSize: 9, padding: 4 }}>{day}</div>)}{Array.from({ length: new Date(month.getFullYear(), month.getMonth(), 1).getDay() }, (_, i) => <div key={`blank${i}`} />)}{Array.from({ length: days }, (_, i) => { const day = i + 1; const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const rows = uploads.filter(row => String(row.date).slice(0, 10) === key); const active = key === date; return <button key={key} onClick={() => chooseDate(key)} title={`${key}: ${rows.length} status tercatat`} style={{ height: 31, borderRadius: 6, border: active ? "1px solid #1685ff" : "1px solid transparent", background: active ? "#1685ff24" : "transparent", color: active ? "white" : "#afc0d5", fontSize: 10, position: "relative" }}>{day}{rows.length > 0 && <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: 4, background: tones[rows.some(row => row.status === "COMPLETED") ? "COMPLETED" : rows[0].status] }} />}</button>; })}</div></div>
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Aksi cepat</div><div className="panel-sub">Pintasan operasional</div></div></div><div className="quick-actions"><Link className="quick-action" href="/accounts?new=1"><Plus size={16} className="quick-icon" />Tambah akun</Link><Link className="quick-action" href="/calendar"><Check size={16} className="quick-icon" />Update tracker hari ini</Link><Link className="quick-action" href="/calendar"><CalendarDays size={16} className="quick-icon" />Buka kalender</Link><Link className="quick-action" href="/history"><Activity size={16} className="quick-icon" />Lihat riwayat</Link></div></div>
    </section><aside>
      <div className="panel" style={{ marginBottom: 15 }}><div className="panel-head"><div><div className="panel-title">Aktivitas terbaru</div><div className="panel-sub">Perubahan yang tercatat terakhir</div></div><Link href="/history" className="muted"><ArrowRight size={15} /></Link></div><div className="activity-list">{activity.length === 0 ? <div className="empty" style={{ padding: 25 }}>Belum ada aktivitas.</div> : activity.slice(0, 6).map(row => <div className="activity-row" key={row.id}><div className="activity-icon"><UploadCloud size={14} /></div><div><div className="activity-copy"><strong>{row.account.name}</strong> <span>{row.description}</span></div><div className="activity-time">{row.actor.name} · {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(row.createdAt))}</div></div></div>)}</div></div>
      <div className="panel"><div className="panel-head"><div><div className="panel-title">Perlu ditindaklanjuti</div><div className="panel-sub">Akun belum memiliki status untuk tanggal ini</div></div><Clock3 size={15} color="#ffc83d" /></div><div className="reminder">{reminder.length ? `${reminder.length} akun belum dicatat. Lengkapi tracker agar progres harian tetap akurat.` : "Semua akun sudah memiliki status hari ini."}</div>{reminder.length > 0 && <div style={{ padding: "0 15px 14px", color: "#aebfd2", fontSize: 10, lineHeight: 1.8 }}>{reminder.slice(0, 5).map(account => <div key={account.id}>• {account.name}</div>)}{reminder.length > 5 && <div className="muted">dan {reminder.length - 5} akun lainnya</div>}</div>}</div>
    </aside></div>
    <div style={{ marginTop: 16 }}><TrackerMatrix /></div>
  </main>;
}
