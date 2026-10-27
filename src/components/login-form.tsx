"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Eye, EyeOff, Grid2X2, LockKeyhole, ShieldCheck } from "lucide-react";

type DemoCredentials = { email: string; password: string } | null;
const sampleRows = [
  { name: "@northstar.daily", day: "12", cells: ["done", "done", "upload", "done"] },
  { name: "@studio.river", day: "13", cells: ["done", "pending", "done", "limit"] },
  { name: "@fieldnotes.co", day: "14", cells: ["done", "done", "done", "done"] },
  { name: "@morning.goods", day: "15", cells: ["holiday", "done", "pending", "done"] }
];

export default function LoginForm({ demo }: { demo: DemoCredentials }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setError(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Email atau kata sandi tidak cocok.");
      router.replace("/dashboard"); router.refresh();
    } catch (cause) {
      setError(cause instanceof TypeError ? "Tidak dapat terhubung ke server. Pastikan aplikasi berjalan lalu coba lagi." : cause instanceof Error ? cause.message : "Tidak dapat menghubungi server. Periksa koneksi aplikasi lalu coba lagi.");
    } finally { setBusy(false); }
  }

  return <main className="login-layout">
    <section className="login-story" aria-label="Tentang Dtrminelabs Upload Tracker">
      <div className="login-brand"><span className="login-brand-mark"><span>D</span><i/><i/><i/><i/></span><span className="login-brand-copy"><strong>DTRMINELABS</strong><small>UPLOAD TRACKER</small></span></div>
      <div className="story-copy"><span className="eyebrow"><span/> DAILY OPERATIONS, IN FOCUS</span><h1>Semua akun.<br/><em>Satu kendali.</em></h1><p>Pantau aktivitas upload harian, kelola status, dan temukan progres setiap akun dalam satu workspace.</p></div>
      <div className="tracker-preview" aria-label="Pratinjau matriks status upload">
        <div className="preview-topline"><div className="preview-title"><Grid2X2 size={15}/><span>Activity overview</span></div><span className="preview-period">OCT <b>2026</b><ArrowUpRight size={13}/></span></div>
        <div className="preview-head"><span>ACCOUNT</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span></div>
        {sampleRows.map((row,index)=><div className="preview-row" key={row.name} style={{"--row":index} as React.CSSProperties}><span className="preview-account"><i>{row.day}</i>{row.name}</span>{row.cells.map((cell,cellIndex)=><span className={`preview-cell preview-${cell}`} key={`${row.day}-${cellIndex}`} aria-label={cell}><span>{cell==="done"?<Check size={12}/>:cell==="upload"?"UP":cell==="pending"?"—":cell==="limit"?"L":"OFF"}</span></span>)}</div>)}
        <div className="preview-footer"><span><i className="preview-key key-done"/>Selesai</span><span><i className="preview-key key-upload"/>Sudah upload</span><span><i className="preview-key key-pending"/>Belum</span><div className="preview-progress"><span>PROGRESS</span><b>78%</b><i><u/></i></div></div>
      </div>
      <div className="story-foot"><span>BUILT FOR CLARITY</span><span>01 — 06</span></div>
    </section>

    <section className="login-panel"><div className="mobile-login-brand"><span className="login-brand-mark"><span>D</span><i/><i/><i/><i/></span><span className="login-brand-copy"><strong>DTRMINELABS</strong><small>UPLOAD TRACKER</small></span></div>
      <div className="login-card"><div className="form-overline"><span className="overline-rule"/> WORKSPACE ACCESS</div><h2>Selamat datang kembali</h2><p className="login-intro">Masuk untuk melanjutkan ke workspace upload tracker.</p>
        <form onSubmit={submit} className="login-fields" noValidate>
          <label className="login-label" htmlFor="login-email">Email</label><div className="login-input-wrap"><input id="login-email" type="email" autoComplete="username" inputMode="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="nama@perusahaan.com" aria-describedby={error?"login-error":undefined}/></div>
          <div className="password-label-row"><label className="login-label" htmlFor="login-password">Kata sandi</label></div><div className="login-input-wrap password-input"><input id="login-password" type={showPassword?"text":"password"} autoComplete="current-password" required maxLength={200} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Masukkan kata sandi" aria-describedby={error?"login-error":undefined}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?"Sembunyikan kata sandi":"Tampilkan kata sandi"} aria-pressed={showPassword}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          {error&&<div id="login-error" className="login-error" role="alert"><span>!</span><p>{error}</p></div>}
          <button type="submit" className="login-submit" disabled={busy}>{busy?<><span className="button-spinner"/>Memeriksa akses...</>:<>Masuk ke workspace<ArrowUpRight size={17}/></>}</button>
          {demo&&<button type="button" className="demo-fill" onClick={()=>{setEmail(demo.email);setPassword(demo.password);setError("")}}>Isi Akun Demo<span>DEV / STAGING</span></button>}
        </form>
        <div className="login-security"><ShieldCheck size={15}/><span>Akses workspace terlindungi</span><i/><LockKeyhole size={13}/><span>Session terenkripsi</span></div>
      </div>
      <div className="login-panel-foot"><span>© {new Date().getFullYear()} Dtrminelabs</span><span><i/> Workspace sign in</span></div>
    </section>
  </main>;
}
