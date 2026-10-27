"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, CalendarDays, Clock3, Settings, UploadCloud, UserRound, Users } from "lucide-react";

const modules = [
  { href: "/tracker", label: "Upload Tracker", description: "Pantau status upload harian", icon: UploadCloud, tone: "blue" },
  { href: "/calendar", label: "Kalender", description: "Lihat ringkasan per tanggal", icon: CalendarDays, tone: "green" },
  { href: "/history", label: "Riwayat", description: "Cari data lama", icon: Clock3, tone: "purple" },
  { href: "/accounts", label: "Akun", description: "Kelola daftar akun", icon: UserRound, tone: "amber" },
  { href: "/users", label: "Pengguna", description: "Kelola akses pengguna", icon: Users, tone: "cyan", admin: true },
  { href: "/settings", label: "Pengaturan", description: "Atur preferensi workspace", icon: Settings, tone: "blue", admin: true }
];

export default function Dashboard() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { signal: controller.signal })
      .then(response => response.json())
      .then(session => { if (!controller.signal.aborted) setAdmin(session.user?.role === "ADMIN"); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const visibleModules = modules.filter(item => !item.admin || admin);

  return <main className="page home-page home-reference-page">
    <div className="home-reference-heading">
      <div className="home-reference-title"><span className="home-reference-mark"><Activity size={17} /></span><div><h1 className="page-title">Dtrminelabs Upload Tracker</h1><p className="page-subtitle">Kelola, pantau, dan tingkatkan produktivitas upload harian.</p></div></div>
    </div>
    <section className="home-module-grid home-reference-grid" aria-label="Navigasi menu utama">
      {visibleModules.map(({ href, label, description, icon: Icon, tone }) => <Link className={`home-module-card module-${tone}`} key={href} href={href}>
        <span className="home-module-icon"><Icon size={18} /></span>
        <span className="home-module-copy"><strong>{label}</strong><small>{description}</small></span>
        <ArrowRight size={16} className="home-module-arrow" />
      </Link>)}
    </section>
  </main>;
}
