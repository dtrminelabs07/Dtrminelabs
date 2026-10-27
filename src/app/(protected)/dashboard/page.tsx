"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, CalendarDays, Clock3, FileSpreadsheet, Settings, UploadCloud, UserRound, Users } from "lucide-react";
import CountUp from "@/components/count-up";

type Status = "COMPLETED" | "PENDING" | "UPLOADED" | "LIMIT" | "OUT_OF_STOCK" | "HOLIDAY";
type Account = { id: string; name: string };
type Upload = { id: string; accountId: string; date: string; status: Status };
type ActivityRow = { id: string; description: string; createdAt: string; account: { name: string } };
type HomeData = { accounts: Account[]; uploads: Upload[]; activity: ActivityRow[] };

function localDate(date: Date) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const field = (type: string) => parts.find(part => part.type === type)?.value ?? ""; return field("year") + "-" + field("month") + "-" + field("day"); }

export default function Dashboard() {
  const [today] = useState(() => localDate(new Date()));
  const [data, setData] = useState<HomeData>({ accounts: [], uploads: [], activity: [] });
  const [busy, setBusy] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch(`/api/tracker?date=${today}`, { signal: controller.signal }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Ringkasan tracker gagal dimuat."); return result; }),
      fetch("/api/history?page=1", { signal: controller.signal }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Aktivitas terbaru gagal dimuat."); return result; })
    ]).then(([tracker, history]) => { setData({ accounts: tracker.accounts ?? [], uploads: tracker.uploads ?? [], activity: history.items ?? [] }); }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Data Home gagal dimuat."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [today]);
  const counts = useMemo(() => { const result: Record<Status, number> = { COMPLETED: 0, PENDING: 0, UPLOADED: 0, LIMIT: 0, OUT_OF_STOCK: 0, HOLIDAY: 0 }; for (const row of data.uploads) result[row.status]++; return result; }, [data.uploads]);
  const pending = Math.max(0, data.accounts.length - counts.COMPLETED - counts.PENDING - counts.UPLOADED - counts.LIMIT - counts.OUT_OF_STOCK - counts.HOLIDAY);
  const cards = [
    { href: `/tracker?date=${today}`, label: "Upload Tracker", description: "Catat dan perbarui status akun untuk hari ini.", value: `${data.uploads.length} status hari ini`, icon: UploadCloud, tone: "blue" },
    { href: "/calendar", label: "Kalender", description: "Tinjau aktivitas harian dan pilih tanggal dengan cepat.", value: "Lihat kalender bulanan", icon: CalendarDays, tone: "cyan" },
    { href: "/history", label: "Riwayat", description: "Telusuri perubahan status dan aktivitas sebelumnya.", value: "Aktivitas tersimpan", icon: Clock3, tone: "purple" },
    { href: "/accounts", label: "Akun", description: "Kelola akun, kategori, dan status keaktifannya.", value: `${data.accounts.length} akun aktif`, icon: UserRound, tone: "green" },
    { href: "/reports", label: "Laporan", description: "Analisis status dan ekspor laporan Excel.", value: "Laporan & ekspor", icon: FileSpreadsheet, tone: "amber" },
    { href: "/users", label: "Pengguna", description: "Atur peran dan akses workspace.", value: "Manajemen pengguna", icon: Users, tone: "cyan", admin: true },
    { href: "/settings", label: "Pengaturan", description: "Impor CSV dan atur preferensi tampilan.", value: "Impor & preferensi", icon: Settings, tone: "slate", admin: true }
  ];
  const [admin, setAdmin] = useState(false);
  useEffect(() => { void fetch("/api/auth/session").then(response => response.json()).then(session => setAdmin(session.user?.role === "ADMIN")).catch(() => setAdmin(false)); }, []);
  const visibleCards = cards.filter(card => !("admin" in card) || admin);

  return <main className="page home-page">
    <div className="page-title-row home-heading"><div><div className="home-kicker"><Activity size={13} /> WORKSPACE OVERVIEW</div><h1 className="page-title">Home</h1><p className="page-subtitle">Ringkasan operasional dan akses cepat ke seluruh modul Dtrminelabs.</p></div><div className="home-date-chip"><CalendarDays size={15} />{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${today}T12:00:00`))}</div></div>
    {error && <div className="notice" role="alert">{error}</div>}
    <section className="home-summary" aria-label="Ringkasan hari ini">
      <div className="home-summary-item"><span>Akun aktif</span><strong>{busy ? "—" : <CountUp value={data.accounts.length} />}</strong><small>Terdaftar untuk tracker</small></div>
      <div className="home-summary-item"><span>Status tercatat hari ini</span><strong>{busy ? "—" : <CountUp value={data.uploads.length} />}</strong><small>Dari {data.accounts.length} akun aktif</small></div>
      <div className="home-summary-item"><span>Belum memiliki status</span><strong className="home-pending-value">{busy ? "—" : <CountUp value={pending} />}</strong><small>Perlu diperiksa hari ini</small></div>
      <div className="home-summary-item"><span>Selesai hari ini</span><strong className="home-done-value">{busy ? "—" : <CountUp value={counts.COMPLETED} />}</strong><small>Libur tidak dihitung sebagai gagal</small></div>
    </section>
    <div className="home-section-heading"><div><h2>Menu workspace</h2><p>Pilih area kerja untuk melanjutkan.</p></div></div>
    <section className="home-module-grid" aria-label="Navigasi modul">
      {visibleCards.map(({ href, label, description, value, icon: Icon, tone }) => <Link className={`home-module-card module-${tone}`} key={href} href={href}><span className="home-module-icon"><Icon size={18} /></span><span className="home-module-copy"><strong>{label}</strong><small>{description}</small><em>{busy && ["Akun", "Upload Tracker", "Pengguna"].includes(label) ? "Memuat ringkasan..." : value}</em></span><ArrowUpRight size={16} className="home-module-arrow" /></Link>)}
    </section>
    <section className="home-latest panel"><div className="panel-head"><div><div className="panel-title">Aktivitas terbaru</div><div className="panel-sub">Catatan perubahan terakhir dari workspace</div></div><Link href="/history" className="btn btn-sm">Buka riwayat <ArrowUpRight size={13} /></Link></div>{data.activity.length === 0 ? <div className="empty">{busy ? "Memuat aktivitas..." : "Belum ada aktivitas tersimpan."}</div> : <div className="home-activity-list">{data.activity.slice(0, 4).map(item => <div className="home-activity-row" key={item.id}><span className="home-activity-mark"><Activity size={13} /></span><div><strong>{item.account.name}</strong><p>{item.description}</p></div><time>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</time></div>)}</div>}</section>
  </main>;
}
