'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Eye, EyeOff, GraduationCap, Loader2, ShieldCheck, Sparkles, ArrowLeft, Mail, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { verifyAndConnectClass, clearTenantCookies } from '@/lib/actions/auth-tenant';
import { requestPasswordResetOtp, verifyAndResetPassword } from '@/lib/actions/profile';

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

  // Forgot password OTP flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailLocked, setForgotEmailLocked] = useState(false);
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [showForgotLink, setShowForgotLink] = useState(false);
  const [showForgotNewPwd, setShowForgotNewPwd] = useState(false);
  const [showForgotConfirmPwd, setShowForgotConfirmPwd] = useState(false);

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
      const errorParam = searchParams.get('error');
      if (errorParam) {
        if (errorParam === 'profile_missing') {
          setError('Your profile could not be found. Please contact your Class Representative.');
        } else if (errorParam === 'auth_failed') {
          setError(searchParams.get('description') || 'Authentication failed or link expired. Please try again.');
        } else {
          setError(searchParams.get('description') || 'An authentication error occurred.');
        }
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

  async function handleSwitchClass() {
    await clearTenantCookies();
    localStorage.removeItem('tenant_class_name');
    setIsClassConnected(false);
    setClassName('');
    setJoinCode('');
    setError(null);
    setCaptchaToken(isLocalhost ? 'dev-bypass-token' : null);
    captchaRef.current?.resetCaptcha();
    setShowForgotPassword(false);
    setShowForgotLink(false);
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
        const errMsg = signInError.message.toLowerCase();
        if (
          errMsg.includes('invalid') || 
          errMsg.includes('credentials') || 
          signInError.status === 400
        ) {
          setShowForgotLink(true);
          throw new Error('Invalid email or password. Please verify your credentials and try again.');
        }
        throw new Error(signInError.message);
      }
      if (!data.user) throw new Error('Login failed. Please try again.');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, password_reset_required')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileData?.password_reset_required === true) {
        window.location.href = '/reset-password';
        return;
      }

      const role = profileData?.role;
      const defaultRedirect = role === 'cr' || role === 'admin'
        ? '/cr/timeline'
        : '/student/timeline';

      let finalRedirect = defaultRedirect;
      const searchParams = new URLSearchParams(window.location.search);
      const nextParam = searchParams.get('next');

      if (
        nextParam &&
        nextParam.startsWith('/') &&
        !nextParam.startsWith('//') &&
        !nextParam.startsWith('/\\') &&
        !nextParam.includes('://') &&
        !nextParam.includes('\\\\') &&
        !nextParam.includes('//')
      ) {
        const isStudentRoute = nextParam.startsWith('/student/');
        const isCrRoute = nextParam.startsWith('/cr/');
        const isResetPassword = nextParam.startsWith('/reset-password');

        if (role === 'cr' || role === 'admin') {
          if (isCrRoute || isResetPassword) {
            finalRedirect = nextParam;
          } else if (isStudentRoute) {
            finalRedirect = nextParam.replace(/^\/student\//, '/cr/');
          }
        } else if (role === 'student') {
          if (isStudentRoute || isResetPassword) {
            finalRedirect = nextParam;
          } else if (isCrRoute) {
            finalRedirect = nextParam.replace(/^\/cr\//, '/student/');
          }
        }
      }

      window.location.href = finalRedirect;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  // ── OTP password reset handlers ────────────────────────────────────────────

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotPending(true);
    try {
      const result = await requestPasswordResetOtp(forgotEmail.trim().toLowerCase());
      if (result?.error) {
        setForgotError(result.error);
        return;
      }
      setForgotStep('otp');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setForgotPending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError('Password must be at least 8 characters.');
      return;
    }
    setForgotPending(true);
    try {
      const result = await verifyAndResetPassword(forgotEmail, forgotOtp, forgotNewPassword);
      if (result?.error) {
        setForgotError(result.error);
        return;
      }
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setForgotPending(false);
    }
  }

  function resetForgotFlow() {
    setShowForgotPassword(false);
    setForgotStep('email');
    setForgotEmail('');
    setForgotEmailLocked(false);
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError(null);
    setForgotSuccess(false);
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
          Academic management portal for your class
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
                Enter your Classcode to accesss your class
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="joinCode" className="text-xs font-semibold text-slate-300">
                Classcode
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
              <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
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
                'Connect'
              )}
            </button>
          </form>
        ) : showForgotPassword ? (
          // ── Forgot Password OTP Flow ───────────────────────
          <div className="flex flex-col gap-5">
            <button
              onClick={resetForgotFlow}
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
              <h2 className="text-base font-bold text-white">
                {forgotSuccess ? 'Password Reset!' : forgotStep === 'otp' ? 'Enter Reset Code' : 'Reset Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {forgotSuccess
                  ? 'Your password has been updated. You can now sign in.'
                  : forgotStep === 'otp'
                    ? <>We sent a 6-digit code to <strong className="text-slate-300">{forgotEmail}</strong></>
                    : <>The email linked to your <strong className="text-slate-300">{className}</strong> Class portal</>}
              </p>
            </div>

            {forgotSuccess ? (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <button onClick={resetForgotFlow} className="btn-primary w-full">
                  Sign In Now
                </button>
              </div>
            ) : forgotStep === 'otp' ? (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                {/* 6-digit code */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgotOtp" className="text-xs font-semibold text-slate-300">
                    6-Digit Code
                  </label>
                  <input
                    id="forgotOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="_ _ _ _ _ _"
                    required
                    className="form-input text-center font-mono text-xl tracking-[0.4em] font-bold"
                    disabled={forgotPending}
                    autoFocus
                  />
                </div>

                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgotNewPwd" className="text-xs font-semibold text-slate-300">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="forgotNewPwd"
                      type={showForgotNewPwd ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="form-input pr-10"
                      disabled={forgotPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showForgotNewPwd ? 'Hide password' : 'Show password'}
                    >
                      {showForgotNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgotConfirmPwd" className="text-xs font-semibold text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="forgotConfirmPwd"
                      type={showForgotConfirmPwd ? 'text' : 'password'}
                      value={forgotConfirmPassword}
                      onChange={e => setForgotConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      className="form-input pr-10"
                      disabled={forgotPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showForgotConfirmPwd ? 'Hide password' : 'Show password'}
                    >
                      {showForgotConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {forgotError && (
                  <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                    {forgotError}
                  </div>
                )}

                <button type="submit" disabled={forgotPending || forgotOtp.length !== 6} className="btn-primary">
                  {forgotPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Reset Password'}
                </button>

                <button
                  type="button"
                  disabled={forgotPending}
                  onClick={() => { setForgotStep('email'); setForgotOtp(''); setForgotError(null); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2 text-center"
                >
                  Didn&apos;t receive a code? Send again
                </button>
              </form>
            ) : (
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgotEmail" className="text-xs font-semibold text-slate-300">
                    University Email
                  </label>
                  {forgotEmailLocked ? (
                    // Locked — email came from sign-in form, cannot be changed
                    <div className="form-input flex items-center gap-2 opacity-75 cursor-not-allowed select-none">
                      <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-200 text-sm truncate flex-1">{forgotEmail}</span>
                    </div>
                  ) : (
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
                  )}
                </div>

                {forgotError && (
                  <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                    {forgotError}
                  </div>
                )}

                <button type="submit" disabled={forgotPending} className="btn-primary">
                  {forgotPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Code'}
                </button>
              </form>
            )}
          </div>
        ) : (
          // ── Step 2: Sign In ────────────────────────────────
          <form onSubmit={handleSignIn} className="flex flex-col gap-5">
            <div className="text-center mb-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Sign In</h2>
              <div className="flex items-center justify-center gap-2 mt-1.5 px-4">
                <span className="text-sm text-emerald-400 font-semibold truncate max-w-[240px]" title={className}>
                  {className}
                </span>
                <span className="text-slate-600 select-none">•</span>
                <button
                  type="button"
                  onClick={handleSwitchClass}
                  className="touch-compact inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-400 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5 transition-transform hover:rotate-180 duration-500" />
                  Switch
                </button>
              </div>
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
                {showForgotLink && (
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setForgotEmailLocked(!!email.trim()); setError(null); }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2 animate-fade-in"
                  >
                    Forgot password?
                  </button>
                )}
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
              <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs font-medium animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-450 flex-shrink-0" />
                <span>{error}</span>
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
