"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BarChart3, CalendarDays, CheckCircle2, Clock3, FileBarChart2, Settings, ShieldAlert, UploadCloud, UserRound } from "lucide-react";
import { dateKeyInTimezone, monthKeyInTimezone } from "@/lib/date";

const statuses = ["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"] as const;
type Status = typeof statuses[number];
type Account = { id: string; name: string; username: string | null; core: string; subCore: string | null };
type Upload = { id: string; accountId: string; date: string; status: Status; notes: string | null; updatedAt: string };
type ActivityItem = { id: string; description: string; createdAt: string; account: { name: string }; actor: { name: string }; dailyUpload: { date: string } | null };
type Snapshot = { accounts: Account[]; uploads: Upload[] };
type DayColumn = { date: string; day: number; counts: Record<Status, number>; total: number };

const labels: Record<Status, string> = { COMPLETED: "Selesai", PENDING: "Belum dikerjakan", UPLOADED: "Sudah upload", LIMIT: "Limit", OUT_OF_STOCK: "Stok habis", HOLIDAY: "Libur" };
const colors: Record<Status, string> = { COMPLETED: "#10d6a0", PENDING: "#ffc83d", UPLOADED: "#20b8ff", LIMIT: "#c477ff", OUT_OF_STOCK: "#ff5263", HOLIDAY: "#ed45db" };
const statusIcons = { COMPLETED: CheckCircle2, PENDING: Clock3, UPLOADED: UploadCloud, LIMIT: ShieldAlert, OUT_OF_STOCK: ShieldAlert, HOLIDAY: CalendarDays } satisfies Record<Status, typeof CheckCircle2>;
const emptyUploads: Upload[] = [];
const todayKey = () => dateKeyInTimezone();
const blankCounts = (): Record<Status, number> => ({ COMPLETED: 0, PENDING: 0, UPLOADED: 0, LIMIT: 0, OUT_OF_STOCK: 0, HOLIDAY: 0 });
const monthDays = (month: string) => { const [year, value] = month.split("-").map(Number); return new Date(year, value, 0).getDate(); };

const modules = [
  { href: "/tracker", label: "Upload Tracker", description: "Perbarui status harian", icon: UploadCloud, tone: "blue" },
  { href: "/calendar", label: "Kalender", description: "Lihat aktivitas per tanggal", icon: CalendarDays, tone: "green" },
  { href: "/history", label: "Riwayat", description: "Telusuri perubahan status", icon: Clock3, tone: "purple" },
  { href: "/reports", label: "Laporan", description: "Analisis periode dan ekspor", icon: FileBarChart2, tone: "amber" },
  { href: "/accounts", label: "Akun", description: "Kelola akun target", icon: UserRound, tone: "cyan" },
  { href: "/settings", label: "Pengaturan", description: "Atur preferensi workspace", icon: Settings, tone: "purple", admin: true }
];

export default function Dashboard() {
  const today = todayKey();
  const [month, setMonth] = useState(monthKeyInTimezone);
  const [selectedDate, setSelectedDate] = useState(today);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const days = monthDays(month);
  const uploadsByDate = useMemo(() => {
    const result = new Map<string, Upload[]>();
    for (const upload of snapshot?.uploads ?? []) {
      const key = upload.date.slice(0, 10);
      const current = result.get(key) ?? [];
      current.push(upload);
      result.set(key, current);
    }
    return result;
  }, [snapshot]);
  const selectedUploads = uploadsByDate.get(selectedDate) ?? emptyUploads;
  const selectedCounts = useMemo(() => {
    const result = blankCounts();
    for (const upload of selectedUploads) result[upload.status]++;
    return result;
  }, [selectedUploads]);
  const noStatus = Math.max(0, (snapshot?.accounts.length ?? 0) - selectedUploads.length);
  const dailyTrend = useMemo<DayColumn[]>(() => Array.from({ length: days }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const counts = blankCounts();
    for (const upload of uploadsByDate.get(date) ?? []) counts[upload.status]++;
    return { date, day: index + 1, counts, total: statuses.reduce((sum, status) => sum + counts[status], 0) };
  }), [days, month, uploadsByDate]);
  const monthlyCounts = useMemo(() => {
    const result = blankCounts();
    for (const upload of snapshot?.uploads ?? []) result[upload.status]++;
    return result;
  }, [snapshot]);
  const monthTotal = statuses.reduce((sum, status) => sum + monthlyCounts[status], 0);
  const processableMonth = monthTotal - monthlyCounts.HOLIDAY;
  const completion = processableMonth ? Math.round(monthlyCounts.COMPLETED / processableMonth * 100) : 0;
  const maxDaily = Math.max(1, ...dailyTrend.map(day => day.total));

  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true); setError("");
    const lastDay = monthDays(month);
    try {
      const [trackerResponse, historyResponse, sessionResponse] = await Promise.all([
        fetch(`/api/tracker?month=${month}`, { signal, cache: "no-store" }),
        fetch(`/api/history?from=${month}-01&to=${month}-${String(lastDay).padStart(2, "0")}`, { signal, cache: "no-store" }),
        fetch("/api/auth/session", { signal, cache: "no-store" })
      ]);
      const [trackerData, historyData, sessionData] = await Promise.all([trackerResponse.json(), historyResponse.json(), sessionResponse.json()]);
      if (!trackerResponse.ok) throw new Error(trackerData.error || "Ringkasan tracker gagal dimuat.");
      if (signal?.aborted) return;
      setSnapshot({ accounts: trackerData.accounts ?? [], uploads: trackerData.uploads ?? [] });
      setActivities(historyResponse.ok && Array.isArray(historyData.items) ? historyData.items.slice(0, 7) : []);
      setAdmin(sessionData.user?.role === "ADMIN");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Ringkasan tracker gagal dimuat.");
      setSnapshot(null); setActivities([]);
    } finally { if (!signal?.aborted) setBusy(false); }
  }, [month]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  function changeMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    setMonth(value);
    const nextDay = Math.min(Number(selectedDate.slice(-2)), monthDays(value));
    setSelectedDate(`${value}-${String(nextDay).padStart(2, "0")}`);
  }
  function chooseToday() { setMonth(today.slice(0, 7)); setSelectedDate(today); }

  const visibleModules = modules.filter(item => !item.admin || admin);
  return <main className="page dashboard-page home-page">
    <div className="page-title-row dashboard-heading"><div><h1 className="page-title">Upload Tracker</h1><p className="page-subtitle">Kelola dan pantau progres upload harian semua akun.</p></div><div className="dashboard-period-controls"><label><span>Periode laporan</span><input className="field" type="month" value={month} onChange={event => changeMonth(event.target.value)} /></label><label><span>Tanggal dipilih</span><input className="field" type="date" min={`${month}-01`} max={`${month}-${String(days).padStart(2, "0")}`} value={selectedDate} onChange={event => { if (event.target.value) setSelectedDate(event.target.value); }} /></label><button className="btn btn-sm" onClick={chooseToday}>Hari ini</button></div></div>
    {error && <div className="notice dashboard-error" role="alert">{error}<button className="btn btn-sm" onClick={() => void load()}>Coba lagi</button></div>}
    <div className="dashboard-date-caption"><CalendarDays size={13} /><span>{new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`))}</span><span className="dashboard-period-badge">{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}</span></div>
    <section className="dashboard-kpi-grid" aria-label="Ringkasan status pada tanggal terpilih">
      <article className="dashboard-kpi dashboard-kpi-total"><span>Total akun aktif</span><strong>{busy ? "—" : snapshot?.accounts.length ?? 0}</strong><small>akun tersedia pada tracker</small></article>
      {statuses.map(status => { const Icon = statusIcons[status]; return <article className="dashboard-kpi" key={status} style={{ "--kpi-tone": colors[status] } as React.CSSProperties}><span><i /><Icon size={13} />{labels[status]}</span><strong>{busy ? "—" : selectedCounts[status]}</strong><small>{busy ? "Memuat data" : `${snapshot?.accounts.length ? Math.round(selectedCounts[status] / snapshot.accounts.length * 100) : 0}% akun aktif`}</small></article>; })}
      <article className="dashboard-kpi dashboard-kpi-unrecorded"><span><i />Tanpa status</span><strong>{busy ? "—" : noStatus}</strong><small>{busy ? "Memuat data" : `${snapshot?.accounts.length ? Math.round(noStatus / snapshot.accounts.length * 100) : 0}% akun aktif`}</small></article>
    </section>
    <section className="dashboard-main-grid">
      <article className="panel dashboard-trend-panel"><div className="panel-head"><div><div className="panel-title">Tren status harian</div><div className="panel-sub">Jumlah catatan status per tanggal pada periode yang dipilih</div></div><BarChart3 size={16} className="muted" /></div>
        {busy ? <div className="dashboard-chart-loading" role="status">Memuat data periode...</div> : <><div className="dashboard-trend-chart" role="img" aria-label={`Grafik jumlah status harian untuk ${month}`}><div className="dashboard-y-axis"><span>{maxDaily}</span><span>{Math.round(maxDaily / 2)}</span><span>0</span></div><div className="dashboard-bars">{dailyTrend.map(day => <div className={`dashboard-bar-column ${day.date === selectedDate ? "selected" : ""}`} key={day.date}><button type="button" className="dashboard-bar-stack" style={{ "--bar-height": `${Math.max(day.total ? 3 : 0, day.total / maxDaily * 100)}%` } as React.CSSProperties} onClick={() => setSelectedDate(day.date)} title={`${day.date}: ${day.total} status`} aria-label={`${day.day}: ${day.total} status`}>{statuses.map(status => day.counts[status] > 0 && <i key={status} style={{ height: `${day.counts[status] / day.total * 100}%`, background: colors[status] }} />)}</button><span>{day.day === 1 || day.day % 5 === 0 || day.day === days ? day.day : ""}</span></div>)}</div></div><div className="dashboard-chart-legend">{statuses.map(status => <span key={status}><i style={{ background: colors[status] }} />{labels[status]}</span>)}</div></>}
      </article>
      <div className="dashboard-side-stack">
        <article className="panel dashboard-monthly-card"><div className="panel-head"><div><div className="panel-title">Performa {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}</div><div className="panel-sub">Berdasarkan catatan status tersimpan</div></div></div><div className="dashboard-monthly-content"><div className="dashboard-completion"><strong>{busy ? "—" : `${completion}%`}</strong><span>Tingkat selesai</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${busy ? 0 : completion}%` }} /></div><div className="dashboard-monthly-meta"><span>{busy ? "—" : monthTotal} catatan</span><small>Selesai ÷ status tercatat selain libur</small></div></div></article>
        <article className="panel dashboard-activity-panel"><div className="panel-head"><div><div className="panel-title">Aktivitas terbaru</div><div className="panel-sub">Perubahan selama periode terpilih</div></div><Link href="/history" aria-label="Lihat seluruh riwayat"><ArrowRight size={15} /></Link></div>{busy ? <div className="dashboard-chart-loading" role="status">Memuat aktivitas...</div> : activities.length ? <div className="dashboard-activity-list">{activities.map(item => <div className="dashboard-activity-item" key={item.id}><span className="activity-icon"><Activity size={13} /></span><span><strong>{item.account.name}</strong><small>{item.description}</small><time>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))} · {item.actor.name}</time></span></div>)}</div> : <div className="dashboard-activity-empty">Belum ada perubahan pada periode ini.</div>}</article>
      </div>
    </section>
    <section className="dashboard-shortcuts"><div className="dashboard-section-heading"><div><h2>Akses cepat</h2><p>Buka pekerjaan atau data yang dibutuhkan.</p></div><Link href="/tracker">Lihat tracker <ArrowRight size={13} /></Link></div><div className="home-module-grid dashboard-module-grid" aria-label="Navigasi menu utama">{visibleModules.map(({ href, label, description, icon: Icon, tone }) => <Link className={`home-module-card module-${tone}`} key={href} href={href}><span className="home-module-icon"><Icon size={17} /></span><span className="home-module-copy"><strong>{label}</strong><small>{description}</small></span><ArrowRight size={15} className="home-module-arrow" /></Link>)}</div></section>
  </main>;
}
