import type { Metadata } from "next";
import "./globals.css";
import BrandPreloader from "@/components/brand-preloader";
export const metadata: Metadata = { title: "Upload Tracker · Dtrminelabs", description: "Kelola dan pantau progres upload harian semua akun." };
const themeBootstrap = `try{const saved=localStorage.getItem("dtrminelabs-theme");const theme=saved||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=theme}catch{document.documentElement.dataset.theme="dark"}`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body>{children}<BrandPreloader /></body></html>; }
