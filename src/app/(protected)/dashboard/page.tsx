import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, FileBarChart2, PackageCheck, Settings, UploadCloud, UserRound } from "lucide-react";

const modules = [
  { href: "/tracker", label: "Upload Tracker", description: "Perbarui dan pantau status upload harian.", icon: UploadCloud, tone: "blue" },
  { href: "/production", label: "Production Dashboard", description: "Pantau produk, target, dan progres produksi.", icon: PackageCheck, tone: "amber" },
  { href: "/calendar", label: "Kalender", description: "Lihat ringkasan aktivitas berdasarkan tanggal.", icon: CalendarDays, tone: "green" },
  { href: "/history", label: "Riwayat", description: "Telusuri perubahan status dan aktivitas akun.", icon: Clock3, tone: "purple" },
  { href: "/accounts", label: "Akun", description: "Kelola akun target dan kategorinya.", icon: UserRound, tone: "cyan" },
  { href: "/reports", label: "Laporan", description: "Analisis periode dan ekspor data tracker.", icon: FileBarChart2, tone: "amber" },
  { href: "/settings", label: "Pengaturan", description: "Atur preferensi workspace.", icon: Settings, tone: "purple" }
];

export default function Dashboard() {
  return <main className="page dashboard-page home-page home-navigation-page">
    <div className="page-title-row dashboard-heading"><div><h1 className="page-title">Home</h1><p className="page-subtitle">Pilih fitur untuk melanjutkan pekerjaan Anda.</p></div></div>
    <section className="dashboard-shortcuts home-navigation-shortcuts">
      <div className="dashboard-section-heading"><div><h2>Akses fitur</h2><p>Semua area kerja Dtrminelabs Upload Tracker.</p></div></div>
      <div className="home-module-grid dashboard-module-grid" aria-label="Navigasi menu utama">
        {modules.map(({ href, label, description, icon: Icon, tone }) => <Link className={`home-module-card module-${tone}`} key={href} href={href}>
          <span className="home-module-icon"><Icon size={19} /></span><span className="home-module-copy"><strong>{label}</strong><small>{description}</small></span><ArrowRight size={16} className="home-module-arrow" />
        </Link>)}
      </div>
    </section>
  </main>;
}
