import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  QrCode,
  ShieldCheck,
  Store
} from 'lucide-react';

type Props = { lang: 'ar' | 'en' };

export const AdminLogin: React.FC<Props> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError(isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'The email or password is incorrect.');
      } else if (code === 'auth/too-many-requests') {
        setError(isAr ? 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.' : 'Too many attempts. Please wait and try again.');
      } else {
        setError(isAr ? 'تعذّر تسجيل الدخول. تحقق من الاتصال ثم أعد المحاولة.' : 'Sign-in failed. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative min-h-screen overflow-hidden bg-[#101113] px-4 py-8 text-white sm:px-8 sm:py-12"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-24 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#17181b] shadow-[0_32px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[1fr_0.95fr]">
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-[#17130a] shadow-[0_8px_30px_rgba(252,211,77,0.2)]">
                <Store className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight">Mneu</p>
                <p className="text-xs text-zinc-500">Restaurant Menu Platform</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1.5 text-xs font-semibold text-amber-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isAr ? 'مساحة آمنة للمالك' : 'Secure owner workspace'}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {isAr ? 'مرحبًا بعودتك' : 'Welcome back'}
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-400">
                {isAr
                  ? 'سجّل الدخول لإدارة مطاعمك ومنيوهاتك من مكان واحد.'
                  : 'Sign in to manage your restaurants and menus in one place.'}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-200" htmlFor="admin-email">
                  {isAr ? 'البريد الإلكتروني' : 'Email address'}
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#101113] px-4 transition focus-within:border-amber-300/70 focus-within:ring-4 focus-within:ring-amber-300/10">
                  <Mail className="h-[18px] w-[18px] shrink-0 text-zinc-500 transition group-focus-within:text-amber-300" />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={isAr ? 'name@example.com' : 'name@example.com'}
                    className="min-w-0 w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-200" htmlFor="admin-password">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#101113] px-4 transition focus-within:border-amber-300/70 focus-within:ring-4 focus-within:ring-amber-300/10">
                  <KeyRound className="h-[18px] w-[18px] shrink-0 text-zinc-500 transition group-focus-within:text-amber-300" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••"
                    className="min-w-0 w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? (isAr ? 'إخفاء كلمة المرور' : 'Hide password') : (isAr ? 'إظهار كلمة المرور' : 'Show password')}
                    className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm leading-6 text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3.5 font-extrabold text-[#17130a] shadow-[0_10px_28px_rgba(252,211,77,0.12)] transition hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-[0_14px_34px_rgba(252,211,77,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/30 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
              >
                {busy
                  ? (isAr ? 'جارٍ التحقق من بياناتك…' : 'Verifying your details…')
                  : (isAr ? 'دخول إلى لوحة التحكم' : 'Sign in to dashboard')}
                {!busy && (isAr
                  ? <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                  : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />)}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <LockKeyhole className="h-3.5 w-3.5" />
              {isAr ? 'اتصال مشفر ومحمي' : 'Encrypted and protected connection'}
            </div>
          </div>
        </section>

        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[radial-gradient(ellipse_at_top_right,_rgba(252,211,77,0.12),_transparent_50%),linear-gradient(145deg,#202124,#151619)] p-10 lg:flex xl:p-14">
          <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-amber-200/10" />
          <div aria-hidden="true" className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full border border-amber-200/[0.07]" />
          <div className="relative">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200/80">Mneu workspace</span>
            <h2 className="mt-5 max-w-sm text-3xl font-extrabold leading-[1.5]">
              {isAr ? 'كل منيوهاتك، تحت تحكمك.' : 'Every menu, under your control.'}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-400">
              {isAr ? 'إدارة سهلة للمطاعم والفروع والأصناف وتجربة الضيوف.' : 'A simple way to manage restaurants, menus, and guest experiences.'}
            </p>
          </div>

          <div className="relative my-10 rounded-2xl border border-white/10 bg-[#111214]/80 p-5 shadow-2xl backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200"><LayoutDashboard className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs font-bold text-white">{isAr ? 'ملخص المنصة' : 'Platform overview'}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">{isAr ? 'مساحة الإدارة' : 'Admin workspace'}</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                <Store className="mb-3 h-4 w-4 text-amber-200" />
                <p className="text-[10px] text-zinc-500">{isAr ? 'إدارة المطاعم' : 'Restaurant management'}</p>
                <p className="mt-1 text-sm font-bold text-zinc-100">{isAr ? 'من مكان واحد' : 'All in one place'}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                <QrCode className="mb-3 h-4 w-4 text-amber-200" />
                <p className="text-[10px] text-zinc-500">{isAr ? 'منيو رقمي' : 'Digital menus'}</p>
                <p className="mt-1 text-sm font-bold text-zinc-100">{isAr ? 'تجربة أسرع للضيف' : 'A smoother guest experience'}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200/10 bg-amber-200/[0.05] px-3.5 py-3 text-[11px] text-amber-100/80">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {isAr ? 'الوصول محصور بالحسابات المعتمدة' : 'Access is limited to authorized accounts'}
            </div>
          </div>

          <p className="relative text-[11px] text-zinc-600">© {new Date().getFullYear()} Mneu · {isAr ? 'إدارة المنيوهات ببساطة' : 'Menus made simple'}</p>
        </aside>
      </div>
    </main>
  );
};

