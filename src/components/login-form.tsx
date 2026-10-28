"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function LoginForm() {
  const router = useRouter();
  const { resolvedTheme, setPreference } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      requestController.current?.abort();
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setError(""); setBusy(true);
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username.trim(), password }), signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Username atau kata sandi tidak cocok.");
      router.replace("/dashboard"); router.refresh();
    } catch (cause) {
      if (isMounted.current) {
        setError(controller.signal.aborted
          ? "Permintaan login terlalu lama atau dibatalkan. Periksa koneksi lalu coba lagi."
          : cause instanceof TypeError
            ? "Tidak dapat terhubung ke server. Pastikan aplikasi berjalan lalu coba lagi."
            : cause instanceof Error ? cause.message : "Tidak dapat menghubungi server. Periksa koneksi aplikasi lalu coba lagi.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestController.current === controller) requestController.current = null;
      if (isMounted.current) setBusy(false);
    }
  }

  return <main className="login-v2">
    <div className="login-v2-architecture" aria-hidden="true"><span/><span/><span/><i/><i/><i/></div>
    <header className="login-v2-header">
      <a className="login-v2-brand" href="/login" aria-label="Dtrminelabs Upload Tracker">
        <svg className="login-v2-mark" viewBox="0 0 40 44" aria-hidden="true"><path d="M4 3h18l15 15v8L22 41H4V3Zm8 8v22h7l10-10v-2L19 11h-7Zm8 4 7 7-7 7v-5h-3v-4h3v-5Z" fill="currentColor" fillRule="evenodd"/></svg>
        <span><strong>DTRMINE<span>LABS</span></strong><small>UPLOAD TRACKER</small></span>
      </a>
      <div className="login-v2-theme" role="group" aria-label="Pilih tema">
        <button type="button" onClick={() => setPreference("light")} className={resolvedTheme === "light" ? "is-selected" : ""} aria-pressed={resolvedTheme === "light"} aria-label="Gunakan tema terang" title="Tema terang"><Sun size={17}/></button>
        <button type="button" onClick={() => setPreference("dark")} className={resolvedTheme === "dark" ? "is-selected" : ""} aria-pressed={resolvedTheme === "dark"} aria-label="Gunakan tema gelap" title="Tema gelap"><Moon size={17}/></button>
      </div>
    </header>

    <section className="login-v2-card" aria-labelledby="login-heading">
      <div className="login-v2-card-brand" aria-hidden="true">
        <svg className="login-v2-mark" viewBox="0 0 40 44"><path d="M4 3h18l15 15v8L22 41H4V3Zm8 8v22h7l10-10v-2L19 11h-7Zm8 4 7 7-7 7v-5h-3v-4h3v-5Z" fill="currentColor" fillRule="evenodd"/></svg>
        <span><strong>DTRMINE<span>LABS</span></strong><small>UPLOAD TRACKER</small></span>
      </div>
      <h1 id="login-heading">Selamat datang kembali</h1>
      <p className="login-v2-intro">Masuk untuk melanjutkan ke workspace<br className="login-v2-desktop-break"/> upload tracker.</p>

      <form onSubmit={submit} className="login-v2-form" noValidate>
        <label htmlFor="login-username">Username</label>
        <div className="login-v2-input-wrap"><UserRound size={20} aria-hidden="true"/><input id="login-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} pattern="[A-Za-z0-9._-]+" value={username} onChange={event => setUsername(event.target.value)} placeholder="Masukkan username" aria-describedby={error ? "login-error" : undefined}/></div>
        <label htmlFor="login-password">Kata sandi</label>
        <div className="login-v2-input-wrap"><LockKeyhole size={20} aria-hidden="true"/><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={200} value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan kata sandi" aria-describedby={error ? "login-error" : undefined}/><button type="button" className="login-v2-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>
        {error && <div id="login-error" className="login-v2-error" role="alert"><span>!</span><p>{error}</p></div>}
        <button type="submit" className="login-v2-submit" disabled={busy}>{busy ? <><span className="login-v2-spinner"/>Memproses...</> : <>Masuk ke workspace<ArrowRight size={20}/></>}</button>
      </form>
      <div className="login-v2-security"><span><ShieldCheck size={19}/>Akses workspace terlindungi</span><i aria-hidden="true"/><span><LockKeyhole size={18}/>Session terenkripsi</span></div>
    </section>
    <footer className="login-v2-footer">© {new Date().getFullYear()} Dtrminelabs. All rights reserved.</footer>
  </main>;
}
