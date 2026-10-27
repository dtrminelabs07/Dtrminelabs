import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Upload Tracker · Dtrminelabs", description: "Kelola dan pantau progres upload harian semua akun." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
