'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ShieldAlert, Loader2, KeyRound, CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import { resetFirstTimePassword } from '@/lib/actions/profile';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type FlowMode = 'first-login' | 'email-recovery' | 'loading';

export default function ResetPasswordPage() {
  const [mode, setMode] = useState<FlowMode>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // BUG-04: tracks whether setSession() succeeded before allowing form submit
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Check URL params to detect if this is an email-recovery link from Supabase
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const hashType = hashParams.get('type');

    if (type === 'recovery' || hashType === 'recovery') {
      // This is an email reset link — Supabase puts the session in the URL hash
      setMode('email-recovery');

      if (accessToken) {
        const refreshToken = hashParams.get('refresh_token');
        if (!refreshToken) {
          // PKCE / magic-link flow: no refresh token in hash.
          // BUG-04 fix: show a clear error instead of silently passing '' to setSession.
          setError('This reset link is incomplete. Please request a new password reset email.');
          setSessionReady(false);
          return;
        }

        const supabase = getSupabaseBrowserClient();
        // BUG-04 fix: await setSession and handle failure explicitly
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: sessionError }: { error: Error | null }) => {
            if (sessionError) {
              console.error('setSession error:', sessionError);
              setError(
                'Your reset link has expired or is invalid. Please request a new password reset email.'
              );
              setSessionReady(false);
            } else {
              setSessionReady(true);
            }
          });
      } else {
        // No access_token at all in hash — likely a server-side redirect flow
        setSessionReady(true);
      }
    } else {
      setMode('first-login');
      // If the user already reset their password, redirect them immediately to dashboard
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getUser().then((res: any) => {
        const user = res.data?.user;
        if (user) {
          supabase
            .from('profiles')
            .select('password_reset_required, role')
            .eq('id', user.id)
            .maybeSingle()
            .then((profileRes: any) => {
              const profileData = profileRes.data;
              if (profileData && !profileData.password_reset_required) {
                const dest = (profileData.role === 'cr' || profileData.role === 'admin') ? '/cr/timeline' : '/student/timeline';
                window.location.replace(dest);
              } else {
                setSessionReady(true);
              }
            });
        } else {
          setSessionReady(true);
        }
      });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'email-recovery') {
        // For email recovery, use the Supabase client directly
        // The session was set from the URL hash, so updateUser() will work
        const supabase = getSupabaseBrowserClient();
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw new Error(updateError.message);
        setSuccess(true);
        setTimeout(() => { window.location.replace('/login'); }, 2000);
      } else {
        // First-login flow — uses the existing server action
        const res = await resetFirstTimePassword(password);
        if (res && res.error) throw new Error(res.error);
        // BUG-11 fix: redirect directly to role dashboard instead of '/' to avoid
        // unnecessary middleware hops and to match the success message text.
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        let dest = '/';
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          const role = profileData?.role;
          dest = (role === 'cr' || role === 'admin') ? '/cr/timeline' : '/student/timeline';
        }
        setSuccess(true);
        setTimeout(() => { window.location.replace(dest); }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (mode === 'loading') {
    return (
      <div className="w-full max-w-md fade-in flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isRecovery = mode === 'email-recovery';

  return (
    <div className="w-full max-w-md fade-in">
      {/* Header */}
      <div className="text-center mb-8 select-none">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg"
          style={{
            background: isRecovery
              ? 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))'
              : 'linear-gradient(135deg, hsl(265, 85%, 60%), hsl(275, 80%, 48%))',
          }}
        >
          {isRecovery ? (
            <Mail className="w-7 h-7 text-white" />
          ) : (
            <KeyRound className="w-7 h-7 text-white" />
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {isRecovery ? 'Reset Password' : 'Activate Account'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isRecovery
            ? 'Enter a new password for your account'
            : 'Choose a new password to secure your class account'}
        </p>
      </div>

      {/* Card */}
      <div className="glass-card p-8">
        {success ? (
          <div className="text-center flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Password Updated!</h2>
            <p className="text-xs text-slate-400">
              {isRecovery
                ? 'Redirecting to sign in…'
                : 'Securing your profile and loading your classroom dashboard…'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {!isRecovery && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs leading-relaxed">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  You are logging in with a default password. For security, you must set a new personal password before accessing ClassApp.
                </span>
              </div>
            )}

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-300">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="form-input pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="form-input"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading || (mode === 'email-recovery' && !sessionReady)} className="btn-primary mt-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRecovery ? 'Updating Password…' : 'Securing Profile…'}
                </>
              ) : (
                isRecovery ? 'Set New Password' : 'Activate Account'
              )}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                try {
                  const supabase = getSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                } catch (err) {
                  console.error(err);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.06] active:scale-[0.98] transition-all cursor-pointer"
            >
              Cancel & Sign Out
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
