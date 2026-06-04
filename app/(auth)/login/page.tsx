'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Eye, EyeOff, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const captchaRef = useRef<HCaptcha>(null);

  const [isLocalhost, setIsLocalhost] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        setIsLocalhost(true);
        setCaptchaToken('dev-bypass-token');
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
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
      router.refresh();
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
        <h2 className="text-xl font-semibold mb-6">Sign in to your account</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Contact your CR or admin if you don&apos;t have an account.
      </p>
    </div>
  );
}
