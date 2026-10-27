"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BarChart3, Bell, CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, Moon, Search, Settings, Sun, UserRound, Users, X } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, { href: "/calendar", label: "Kalender Tracker", icon: CalendarDays },
  { href: "/history", label: "Riwayat", icon: Activity }, { href: "/reports", label: "Laporan", icon: BarChart3 }, { href: "/accounts", label: "Akun", icon: UserRound },
  { href: "/users", label: "Pengguna", icon: Users, admin: true }, { href: "/settings", label: "Pengaturan", icon: Settings, admin: true }
];
export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [query, setQuery] = useState(""); const [drawer, setDrawer] = useState(false); const [profileOpen, setProfileOpen] = useState(false); const [recentCount, setRecentCount] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { const current = document.documentElement.dataset.theme; setTheme(current === "light" ? "light" : "dark"); }, []);
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("dtrminelabs-theme", next); setTheme(next); };
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("global-search")?.focus(); }
      if (event.key === "Escape") { setDrawer(false); setProfileOpen(false); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => { void fetch("/api/history?page=1").then(response => response.ok ? response.json() : null).then(data => { if (data?.items) { const since = Date.now() - 24 * 60 * 60 * 1000; setRecentCount(data.items.filter((item: { createdAt: string }) => new Date(item.createdAt).getTime() >= since).length); } }).catch(() => undefined); }, []);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); };
  const search = (event: React.FormEvent) => { event.preventDefault(); router.push(`/accounts?q=${encodeURIComponent(query)}`); };
  const roleLabel = user.role === "ADMIN" ? "Administrator" : user.role === "DEMO" ? "Mode Demo" : "Staff";
  const nav = <><div className="brand"><div className="brand-mark">D</div><div><div className="brand-name">DTRMINELABS</div><div className="brand-caption">UPLOAD TRACKER</div></div></div>{user.role === "DEMO" && <div className="demo-mode-banner">DEMO MODE <span>Data terisolasi</span></div>}<div className="nav-label">WORKSPACE</div>{links.filter(item => !item.admin || user.role === "ADMIN").map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setDrawer(false)} title={label} className={`nav-link ${pathname === href ? "active" : ""}`}><Icon /><span>{label}</span></Link>)}<div className="side-bottom"><div className="user-chip"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="user-info"><div className="user-name">{user.name}</div><div className="user-role">{roleLabel}</div></div><button className="btn btn-sm" onClick={logout} title="Keluar" aria-label="Keluar"><LogOut size={14} /></button></div></div></>;
  const sectionLabels: Record<string, string> = { dashboard: "Dashboard", calendar: "Kalender Tracker", history: "Riwayat", reports: "Laporan", accounts: "Akun", users: "Pengguna", settings: "Pengaturan" };
  const segment = pathname.split("/")[1] ?? "dashboard";
  return <div className="app-shell"><aside className="sidebar">{nav}</aside>{drawer && <div className="modal-backdrop" onClick={() => setDrawer(false)}><aside className="sidebar" style={{ display: "flex", position: "fixed", width: 245 }} onClick={event => event.stopPropagation()}><button className="btn btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => setDrawer(false)} aria-label="Tutup menu"><X size={14} /></button>{nav}</aside></div>}<div className="main-area"><header className="topbar"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><button className="btn btn-sm mobile-menu" onClick={() => setDrawer(true)} aria-label="Buka menu"><Menu size={16} /></button><div className="crumb">Workspace&nbsp; / &nbsp;<strong>{sectionLabels[segment] ?? "Upload Tracker"}</strong></div></div><div className="top-actions"><form onSubmit={search} className="global-search"><Search size={14} /><input id="global-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari akun... (Ctrl K)" aria-label="Cari akun" /></form><span className="top-date">{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}</span><button className="top-icon theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Aktifkan tema terang" : "Aktifkan tema gelap"} title={theme === "dark" ? "Tema terang" : "Tema gelap"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button><Link className="top-icon" href="/history" aria-label={`${recentCount} aktivitas dalam 24 jam`} title={`${recentCount} aktivitas baru`}><Bell size={16} />{recentCount > 0 && <span className="notification-badge">{recentCount > 9 ? "9+" : recentCount}</span>}</Link><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen} aria-label="Menu profil"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="profile-name">{user.name}</span><ChevronDown size={13} /></button>{profileOpen && <div className="profile-popover"><strong>{user.name}</strong><span>{user.email}</span><span className="user-role">{roleLabel}</span><button className="btn btn-sm" onClick={logout}><LogOut size={13} />Keluar</button></div>}</div></div></header>{children}</div></div>;
}
