"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BarChart3, CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, Search, Settings, UserRound, Users, X } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import ThemeToggle from "@/components/theme-toggle";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard }, { href: "/tracker", label: "Upload Tracker", icon: Activity },
  { href: "/calendar", label: "Kalender", icon: CalendarDays }, { href: "/history", label: "Riwayat", icon: BarChart3 },
  { href: "/accounts", label: "Akun", icon: UserRound }, { href: "/users", label: "Pengguna", icon: Users, admin: true },
  { href: "/settings", label: "Pengaturan", icon: Settings, admin: true }, { href: "/reports", label: "Laporan", icon: BarChart3 }
];
export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [query, setQuery] = useState(""); const [drawer, setDrawer] = useState(false); const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("global-search")?.focus(); }
      if (event.key === "Escape") { setDrawer(false); setProfileOpen(false); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); };
  const search = (event: React.FormEvent) => { event.preventDefault(); router.push(`/accounts?q=${encodeURIComponent(query)}`); };
  const roleLabel = user.role === "ADMIN" ? "Administrator" : user.role === "DEMO" ? "Mode Demo" : "Staff";
  const nav = <><div className="brand"><div className="brand-mark">D</div><div><div className="brand-name">DTRMINELABS</div><div className="brand-caption">UPLOAD TRACKER</div></div></div>{user.role === "DEMO" && <div className="demo-mode-banner">DEMO MODE <span>Data terisolasi</span></div>}<div className="nav-label">WORKSPACE</div>{links.filter(item => !item.admin || user.role === "ADMIN").map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setDrawer(false)} title={label} className={`nav-link ${pathname === href ? "active" : ""}`}><Icon /><span>{label}</span></Link>)}<div className="side-bottom"><div className="user-chip"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="user-info"><div className="user-name">{user.name}</div><div className="user-role">{roleLabel}</div></div><button className="btn btn-sm" onClick={logout} title="Keluar" aria-label="Keluar"><LogOut size={14} /></button></div></div></>;
  const sectionLabels: Record<string, string> = { dashboard: "Home", tracker: "Upload Tracker", calendar: "Kalender", history: "Riwayat", reports: "Laporan", accounts: "Akun", users: "Pengguna", settings: "Pengaturan" };
  const segment = pathname.split("/")[1] ?? "dashboard";
  return <div className="app-shell"><aside className="sidebar">{nav}</aside>{drawer && <div className="modal-backdrop mobile-drawer-backdrop" onClick={() => setDrawer(false)}><aside className="sidebar" style={{ display: "flex", position: "fixed", width: 245 }} onClick={event => event.stopPropagation()}><button className="btn btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => setDrawer(false)} aria-label="Tutup menu"><X size={14} /></button>{nav}</aside></div>}<div className="main-area"><header className="topbar"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><button className="btn btn-sm mobile-menu" onClick={() => setDrawer(true)} aria-label="Buka menu"><Menu size={16} /></button><div className="crumb">Workspace&nbsp; / &nbsp;<strong>{sectionLabels[segment] ?? "Upload Tracker"}</strong></div></div><div className="top-actions"><form onSubmit={search} className="global-search"><Search size={14} /><input id="global-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari akun... (Ctrl K)" aria-label="Cari akun" /></form><span className="top-date">{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}</span><ThemeToggle /><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen} aria-label="Menu profil"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="profile-name">{user.name}</span><ChevronDown size={13} /></button>{profileOpen && <div className="profile-popover"><strong>{user.name}</strong><span>{user.email}</span><span className="user-role">{roleLabel}</span><button className="btn btn-sm" onClick={logout}><LogOut size={13} />Keluar</button></div>}</div></div></header>{children}</div></div>;
}
