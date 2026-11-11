import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthApi } from '../lib/api';
import { createPhoneVerifier, isFirebaseConfigured, sendPhoneOtp, signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { IconPulse, IconSpinner } from '../components/Icons';

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpInputRef = useRef(null);
  const confirmationRef = useRef(null);
  const verifierRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  const requestOtp = async (e) => {
    e?.preventDefault();
    setError('');
    if (!phone.trim()) return;
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim().replace(/[\s()-]/g, ''))) {
      setError('Enter your phone number with country code, for example +15551234567');
      return;
    }
    if (!isFirebaseConfigured) {
      setError('Firebase phone sign-in is not configured');
      return;
    }
    setSending(true);
    try {
      verifierRef.current?.clear();
      verifierRef.current = createPhoneVerifier();
      confirmationRef.current = await sendPhoneOtp(phone.trim(), verifierRef.current);
      toast.success(`Code sent to ${phone.trim()}`);
      setStep('otp');
      setCooldown(60);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    try {
      const firebaseUser = await confirmationRef.current.confirm(otp);
      const { data } = await AuthApi.phoneLogin(await firebaseUser.user.getIdToken(), name.trim() || undefined);
      login(data.token, data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const { data } = await AuthApi.googleLogin(idToken);
      login(data.token, data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent">
      {/* Hero panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden border-r border-white/10 px-14 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,80,115,0.26),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(246,219,192,0.12),transparent_35%)]" />
        <div className="relative z-10 flex items-center gap-2 text-[#F6DBC0]">
          <IconPulse />
          <span className="font-display text-lg text-text">RetainEdge</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-5xl leading-[1.08] text-text mb-5">
            Know who&rsquo;s leaving before they do.
          </h1>
          <p className="text-text-muted text-base leading-relaxed">
            Upload a customer file, run the model, and get a ranked list of accounts at risk — with the reasons
            behind each score and what to do about it.
          </p>
        </div>

        <div className="relative z-10">
          <HeroSignal />
        </div>
      </div>

      {/* Auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 text-[#F6DBC0] mb-10 justify-center">
            <IconPulse />
            <span className="font-display text-lg text-text">RetainEdge</span>
          </div>

          {step === 'phone' && (
            <form onSubmit={requestOtp}>
              <h2 className="text-text text-xl font-medium mb-1.5">Sign in</h2>
              <p className="text-text-muted text-sm mb-6">We&rsquo;ll text you a 6-digit code. No password needed.</p>

              <label className="label" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoFocus
                className="input mb-4"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {error && <p className="text-risk-high text-sm mb-4">{error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={sending}>
                {sending ? <IconSpinner /> : null}
                {sending ? 'Sending code…' : 'Send code'}
              </button>

              {isFirebaseConfigured && (
                <>
                  <div className="flex items-center gap-3 my-6">
                    <span className="h-px flex-1 bg-ink-line" />
                    <span className="text-text-faint text-xs">or</span>
                    <span className="h-px flex-1 bg-ink-line" />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? <IconSpinner /> : <GoogleG />}
                    Continue with Google
                  </button>
                </>
              )}
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={verifyOtp}>
              <h2 className="text-text text-xl font-medium mb-1.5">Enter your code</h2>
              <p className="text-text-muted text-sm mb-6">
                Sent to <span className="text-text">{phone}</span>.{' '}
                <button
                  type="button"
                  className="text-brand hover:underline"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                  }}
                >
                  Change
                </button>
              </p>

              <label className="label" htmlFor="otp">
                6-digit code
              </label>
              <input
                id="otp"
                ref={otpInputRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="input mb-4 tabular text-center text-lg tracking-[0.5em]"
                placeholder="······"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />

              <label className="label" htmlFor="name">
                Your name <span className="text-text-faint">(only used the first time)</span>
              </label>
              <input
                id="name"
                className="input mb-4"
                placeholder="Jordan Lee"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              {error && <p className="text-risk-high text-sm mb-4">{error}</p>}

              <button type="submit" className="btn-primary w-full mb-3" disabled={verifying}>
                {verifying ? <IconSpinner /> : null}
                {verifying ? 'Verifying…' : 'Verify & sign in'}
              </button>

              <button
                type="button"
                className="btn-ghost w-full"
                disabled={cooldown > 0 || sending}
                onClick={requestOtp}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </form>
          )}
          <div id="recaptcha-container" />
        </div>
      </div>
    </div>
  );
}

function formatAuthError(err) {
  if (err?.code === 'auth/billing-not-enabled') {
    return 'Phone OTP is unavailable because Firebase billing is not enabled for this project.';
  }
  if (err?.code === 'auth/operation-not-allowed') {
    return 'Phone sign-in is disabled in Firebase Authentication.';
  }
  if (err?.code === 'auth/invalid-phone-number') {
    return 'Enter a valid phone number with country code, for example +916359183473.';
  }
  return err?.message || 'Authentication failed. Please try again.';
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.96H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.04l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.96l2.97 2.34C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function HeroSignal() {
  return (
    <svg viewBox="0 0 420 140" className="text-brand w-full max-w-md">
      <defs>
        <linearGradient id="fade" x1="0" x2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((row) => (
        <line
          key={row}
          x1="0"
          x2="420"
          y1={30 + row * 40}
          y2={30 + row * 40}
          stroke="#2A3244"
          strokeWidth="1"
        />
      ))}
      <path
        d="M0 90 H120 L145 30 L170 130 L195 70 L215 90 H420"
        fill="none"
        stroke="url(#fade)"
        strokeWidth="2"
      />
    </svg>
  );
}
