import type { Metadata } from "next";
import "./globals.css";
import BrandPreloader from "@/components/brand-preloader";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Upload Tracker · Dtrminelabs",
  description: "Kelola dan pantau progres upload harian semua akun."
};

const themeBootstrap = `(()=>{try{const key="dtrminelabs-theme";const saved=localStorage.getItem(key);const preference=saved==="dark"||saved==="light"||saved==="system"?saved:"system";const dark=window.matchMedia("(prefers-color-scheme: dark)").matches;const theme=preference==="system"?(dark?"dark":"light"):preference;const root=document.documentElement;root.dataset.theme=theme;root.dataset.themePreference=preference}catch{document.documentElement.dataset.theme="dark";document.documentElement.dataset.themePreference="system"}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" data-theme="dark" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
    <body><ThemeProvider>{children}<BrandPreloader /></ThemeProvider></body>
  </html>;
}
