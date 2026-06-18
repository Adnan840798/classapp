'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Eye, EyeOff, GraduationCap, Loader2, ShieldCheck, Sparkles, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { verifyAndConnectClass } from '@/lib/actions/auth-tenant';
import { requestPasswordReset } from '@/lib/actions/profile';

export default function LoginPage() {
  const captchaRef = useRef<HCaptcha>(null);

  const [isLocalhost, setIsLocalhost] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SaaS Dynamic Tenant States
  const [joinCode, setJoinCode] = useState('');
  const [className, setClassName] = useState('');
  const [isClassConnected, setIsClassConnected] = useState(false);

  // Forgot password flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        setIsLocalhost(true);
        setCaptchaToken('dev-bypass-token');
      }

      // Check if dynamic connection parameters already exist in cookies
      const matchUrl = document.cookie.match(/(^|;)\s*tenant_supabase_url\s*=\s*([^;]+)/);
      if (matchUrl) {
        setIsClassConnected(true);
        const storedName = localStorage.getItem('tenant_class_name');
        setClassName(storedName || 'Registered Class');
      }

      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('error') === 'profile_missing') {
        setError('Your profile could not be found. Please contact your Class Representative.');
        const supabase = getSupabaseBrowserClient();
        supabase.auth.signOut().catch(console.error);
      }
    }
  }, []);

  async function handleVerifyJoinCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!joinCode.trim()) {
      setError('Please enter a Class Join Code');
      return;
    }
    setIsLoading(true);
    try {
      const res = await verifyAndConnectClass(joinCode);
      if (!res.success || !res.className) {
        throw new Error(res.error || 'Failed to verify join code');
      }
      localStorage.setItem('tenant_class_name', res.className);
      setClassName(res.className);
      setIsClassConnected(true);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please double-check your join code.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSwitchClass() {
    document.cookie = 'tenant_supabase_url=; Max-Age=0; path=/;';
    document.cookie = 'tenant_supabase_anon_key=; Max-Age=0; path=/;';
    localStorage.removeItem('tenant_class_name');
    setIsClassConnected(false);
    setClassName('');
    setJoinCode('');
    setError(null);
    setCaptchaToken(isLocalhost ? 'dev-bypass-token' : null);
    captchaRef.current?.resetCaptcha();
    setShowForgotPassword(false);
    setForgotSent(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isLocalhost && !captchaToken) {
      setError('Please complete the captcha verification.');
      return;
    }

    setIsLoading(true);

    try {
      const verifyRes = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });

      if (!verifyRes.ok) {
        let errorMsg = 'Captcha verification failed';
        try {
          const data = await verifyRes.json();
          errorMsg = data.error ?? errorMsg;
        } catch {
          if (verifyRes.status === 429) {
            errorMsg = 'Too many requests. Please try again later.';
          } else {
            errorMsg = `Server error (${verifyRes.status}). Please try again later.`;
          }
        }
        throw new Error(errorMsg);
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        // Show forgot password hint on bad credentials
        if (signInError.message.toLowerCase().includes('invalid') || signInError.message.toLowerCase().includes('credentials')) {
          throw new Error(signInError.message + ' — Did you forget your password?');
        }
        throw new Error(signInError.message);
      }
      if (!data.user) throw new Error('Login failed. Please try again.');

      // Fetch the user's profile to determine role and first-login status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, password_reset_required')
        .eq('id', data.user.id)
        .maybeSingle();

      // First-time login: CR created account with temp password → force reset
      if (profileData?.password_reset_required === true) {
        window.location.href = '/reset-password';
        return;
      }

      const role = profileData?.role;
      const redirectTo = role === 'cr' || role === 'admin'
        ? '/cr/timeline'
        : '/student/timeline';

      window.location.href = redirectTo;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotPending(true);
    try {
      // requestPasswordReset validates the email exists in this class before sending
      await requestPasswordReset(forgotEmail.trim().toLowerCase());
      // Always show success (prevents email enumeration)
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotPending(false);
    }
  }

  return (
    <div className="w-full max-w-md fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex flex-col items-center group cursor-pointer select-none">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}
          >
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">ClassApp</h1>
        </Link>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Academic management for your class
        </p>
      </div>

      {/* Card */}
      <div className="glass-card p-8">
        {!isClassConnected ? (
          // ── Step 1: Join Code ──────────────────────────────
          <form onSubmit={handleVerifyJoinCode} className="flex flex-col gap-5">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Connect to Class
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your Google Classroom-style join code to connect to your class database
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="joinCode" className="text-xs font-semibold text-slate-300">
                Class Join Code
              </label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. CS-2026-XYZ"
                required
                className="form-input text-center font-mono uppercase tracking-wider"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary mt-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                'Connect Class'
              )}
            </button>
          </form>
        ) : showForgotPassword ? (
          // ── Forgot Password Flow ───────────────────────────
          <div className="flex flex-col gap-5">
            <button
              onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotError(null); setForgotEmail(''); }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>

            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 mx-auto"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
              >
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-base font-bold text-white">Reset Password</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Enter the email linked to your <strong className="text-slate-300">{className}</strong> account. We'll send a reset link if it exists.
              </p>
            </div>

            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Check your inbox</p>
                  <p className="text-xs text-slate-400 mt-1">
                    If <span className="text-slate-300">{forgotEmail}</span> is registered, a reset link has been sent. Check your spam folder too.
                  </p>
                </div>
                <button
                  onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(''); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgotEmail" className="text-xs font-semibold text-slate-300">
                    University Email
                  </label>
                  <input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@university.edu"
                    required
                    className="form-input"
                    disabled={forgotPending}
                  />
                </div>

                {forgotError && (
                  <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {forgotError}
                  </div>
                )}

                <button type="submit" disabled={forgotPending} className="btn-primary">
                  {forgotPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          // ── Step 2: Sign In ────────────────────────────────
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            {/* Connected Class Status Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="font-bold truncate">Connected: {className}</span>
              </div>
              <button
                type="button"
                onClick={handleSwitchClass}
                className="font-black hover:text-white underline cursor-pointer flex-shrink-0"
              >
                Switch Class
              </button>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                University Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
                autoComplete="email"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setError(null); }}
                  className="text-[11px] text-slate-500 hover:text-emerald-400 transition-colors underline underline-offset-2"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="form-input pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* hCaptcha — only shown on non-localhost */}
            {!isLocalhost && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-full flex justify-center rounded-xl overflow-hidden border border-border bg-muted/30 p-3">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => {
                      setCaptchaToken(null);
                      setError('Captcha error. Please try again.');
                    }}
                    theme="dark"
                    size="normal"
                  />
                </div>
                {!captchaToken && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Complete verification above to sign in
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
                {error.includes('forget') && (
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setError(null); }}
                    className="mt-1 block text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    Reset your password →
                  </button>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading || (!isLocalhost && !captchaToken)}
              className="btn-primary mt-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Contact your Class Representative to activate your account.
      </p>
    </div>
  );
}
