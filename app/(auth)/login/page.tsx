'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Eye, EyeOff, GraduationCap, Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const captchaRef = useRef<HCaptcha>(null);

  const [isLocalhost, setIsLocalhost] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        setIsLocalhost(true);
        setCaptchaToken('dev-bypass-token');
      }
    }
  }, []);

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
    setIsSuccess(false);
    setCaptchaToken(isLocalhost ? 'dev-bypass-token' : null);
    captchaRef.current?.resetCaptcha();
  };

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
        const data = await verifyRes.json();
        throw new Error(data.error ?? 'Captcha verification failed');
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw new Error(signInError.message);
      if (!data.user) throw new Error('Login failed. Please try again.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'cr' || profile?.role === 'admin') {
        router.push('/cr/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full Name is required');
      return;
    }
    if (!universityId.trim()) {
      setError('Student ID is required');
      return;
    }
    if (!email.trim().toLowerCase()) {
      setError('University Email is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
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
        const data = await verifyRes.json();
        throw new Error(data.error ?? 'Captcha verification failed');
      }

      const supabase = getSupabaseBrowserClient();

      // Pre-verify unique Student ID
      const { data: existingProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('university_id', universityId.trim())
        .maybeSingle();

      if (profileErr) {
        console.error('Error pre-checking profile:', profileErr);
      }
      if (existingProfile) {
        throw new Error('This Student ID is already registered. Please contact your CR if this is an error.');
      }

      // Supabase Auth Sign Up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            university_id: universityId.trim(),
            department: department.trim() || null,
            batch: batch.trim() || null,
            role: 'student',
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error('Registration failed. Please try again.');

      if (signUpData.session) {
        // Logged in immediately
        router.push('/student/dashboard');
      } else {
        // Needs email confirmation
        setIsSuccess(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg, hsl(220 91% 58%), hsl(260 80% 60%))' }}
        >
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">ClassApp</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Academic management for your class
        </p>
      </div>

      {/* Card */}
      <div className="glass-card p-8">
        {isSuccess ? (
          <div className="text-center flex flex-col items-center gap-4 py-4">
            <CheckCircle className="w-16 h-16 text-emerald-500 animate-pulse" />
            <h2 className="text-xl font-bold text-foreground">Verify Your Email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <strong className="text-foreground">{email}</strong>. Please check your inbox and click the link to activate your account.
            </p>
            <button
              onClick={() => handleModeChange('signin')}
              className="btn-primary mt-4 w-full"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border mb-6">
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                disabled={isLoading}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                  mode === 'signin'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                disabled={isLoading}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                  mode === 'signup'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Account
              </button>
            </div>

            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="flex flex-col gap-5">
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
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
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
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                  >
                    {error}
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
            ) : (
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="fullName" className="text-xs font-medium">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>

                {/* Student ID */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="universityId" className="text-xs font-medium">
                    Student ID
                  </label>
                  <input
                    id="universityId"
                    type="text"
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    placeholder="e.g. 2021-1-60-001"
                    required
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>

                {/* Department & Batch */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="department" className="text-xs font-medium">
                      Department <span className="text-muted-foreground text-[10px]">(Optional)</span>
                    </label>
                    <input
                      id="department"
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. CSE"
                      className="form-input"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="batch" className="text-xs font-medium">
                      Batch <span className="text-muted-foreground text-[10px]">(Optional)</span>
                    </label>
                    <input
                      id="batch"
                      type="text"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="e.g. 48th"
                      className="form-input"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="text-xs font-medium">
                    University Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    required
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="password" className="text-xs font-medium">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      required
                      className="form-input"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="confirmPassword" className="text-xs font-medium">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                      className="form-input"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* hCaptcha — only shown on non-localhost */}
                {!isLocalhost && (
                  <div className="flex flex-col items-center gap-2 mt-1">
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
                        Complete verification above to sign up
                      </p>
                    )}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={isLoading || (!isLocalhost && !captchaToken)}
                  className="btn-primary mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Account…
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Contact your CR or admin if you need assistance.
      </p>
    </div>
  );
}

