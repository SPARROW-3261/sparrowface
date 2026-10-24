/**
 * AeroFace Desktop Login & Registration Page
 * Features Email/Password authentication, Registration, and Google Sign-In options.
 */

import React, { useState } from 'react';
import { authService, UserProfile } from '../services/authService';
import { sounds } from '../services/soundEffects';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  LogIn,
  UserPlus,
  Check,
  ChevronRight,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess: (user: UserProfile) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onClose, isModal = false }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('harshvardhan32613261@gmail.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      sounds.playClick('left');
      const user = await authService.loginWithEmail(email, password);
      sounds.playTargetHit();
      setSuccessMessage(`Welcome back, ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      sounds.playClick('left');
      const user = await authService.registerWithEmail(name, email, password);
      sounds.playTargetHit();
      setSuccessMessage(`Account created successfully! Welcome, ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [isCustomGoogleOpen, setIsCustomGoogleOpen] = useState(false);

  const googleAccounts = authService.getAvailableGoogleAccounts();

  const handleGoogleSignIn = async (accountEmail?: string, accountName?: string) => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);
    sounds.playClick('left');
    try {
      const emailToUse = (accountEmail || email || 'harshvardhan32613261@gmail.com').trim();
      const user = await authService.loginWithGoogle(emailToUse, accountName);
      sounds.playTargetHit();
      setSuccessMessage(`Signed in with Google as ${user.name}!`);
      setIsGoogleChooserOpen(false);
      setTimeout(() => {
        onSuccess(user);
      }, 450);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
      setError('Please provide a valid Google email address.');
      return;
    }
    handleGoogleSignIn(customGoogleEmail, customGoogleName || undefined);
  };

  const fillDemoAccount = () => {
    setEmail('harshvardhan32613261@gmail.com');
    setPassword('sparrow123');
    setError(null);
  };

  const handleGuestContinue = () => {
    if (isLoading) return;
    sounds.playClick('left');
    const guestUser = authService.continueAsGuest();
    onSuccess(guestUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl shadow-cyan-950/20 overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

        {/* Close Button if Modal */}
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-purple-500/20 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 mb-1">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-07-26_at_3.25.36_PM_04076b3e.jpeg"
                alt="Sparrow Logo"
                className="w-14 h-14 rounded-xl object-cover ring-1 ring-cyan-400/40"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Sign in to Sparrow' : 'Create Sparrow Account'}
            </h1>
            <p className="text-xs text-neutral-400">
              Access your personalized Sparrow face-motion sensitivity profiles & calibration
            </p>
          </div>

          {/* Mode Switch Tabs (Login / Register) */}
          <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs font-medium">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                sounds.playClick('left');
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'login'
                  ? 'bg-neutral-800 text-cyan-400 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
                sounds.playClick('left');
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'register'
                  ? 'bg-neutral-800 text-cyan-400 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>

          {/* Quick Google Sign In Section */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleGoogleSignIn()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 disabled:opacity-60 text-neutral-900 font-semibold text-xs transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              {/* Google Brand G Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>

            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="text-neutral-400">
                Google ID: <span className="text-cyan-300 font-medium">{email.includes('@') ? email : 'harshvardhan32613261@gmail.com'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick('left');
                  setIsGoogleChooserOpen(true);
                }}
                className="text-cyan-400 hover:text-cyan-300 transition-colors underline cursor-pointer font-medium"
              >
                Choose account
              </button>
            </div>

            <div className="relative flex items-center justify-center pt-1">
              <div className="border-t border-neutral-800 w-full" />
              <div className="bg-neutral-900 px-3 text-[11px] text-neutral-500 uppercase tracking-wider absolute">
                or with email
              </div>
            </div>
          </div>

          {mode === 'login' && (
            <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Registered demo account:</span>
              <button
                type="button"
                onClick={fillDemoAccount}
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline transition-colors"
              >
                Autofill Harsh Vardhan
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Harsh Vardhan"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Footer Guest Option & Storage Privacy Notice */}
          <div className="pt-3 border-t border-neutral-800 space-y-2 text-center">
            <button
              type="button"
              onClick={handleGuestContinue}
              disabled={isLoading}
              className="text-xs text-neutral-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Continue without signing in as <span className="underline">Guest</span>
            </button>
            <div className="text-[10px] text-neutral-500 leading-relaxed px-4">
              Browser-Local Storage: User accounts, custom presets, and calibration are securely preserved in your local browser storage.
            </div>
          </div>
        </div>

        {/* Google Identity Services / Account Chooser Modal Overlay */}
        {isGoogleChooserOpen && (
          <div className="absolute inset-0 z-30 bg-neutral-900/98 backdrop-blur-md p-6 flex flex-col justify-between animate-in fade-in duration-150">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight">Sign in with Google</h3>
                    <p className="text-[10px] text-neutral-400">Choose an account to continue to Sparrow</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGoogleChooserOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Accounts list */}
              <div className="mt-4 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {googleAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      handleGoogleSignIn(acc.email, acc.name);
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/90 border border-neutral-800 hover:border-cyan-500/50 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={acc.avatarUrl}
                        alt={acc.name}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-cyan-500/40"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                          <span>{acc.name}</span>
                          {acc.email === 'harshvardhan32613261@gmail.com' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400">{acc.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-cyan-400 opacity-80 group-hover:opacity-100">
                      <span className="text-[11px] font-medium hidden sm:inline">Sign In</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}

                {/* Option to use another Google account */}
                {!isCustomGoogleOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsCustomGoogleOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-neutral-700 hover:border-cyan-500/60 text-neutral-300 hover:text-white text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-neutral-950/50"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Use another Google account</span>
                  </button>
                ) : (
                  <form onSubmit={handleCustomGoogleSubmit} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 text-xs">
                    <div className="text-[11px] font-semibold text-neutral-300">Enter custom Google credentials:</div>
                    <input
                      type="text"
                      placeholder="Your Name (e.g. Alex Rivera)"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="email"
                      required
                      placeholder="yourname@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs transition-colors"
                      >
                        Sign In with Google
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCustomGoogleOpen(false)}
                        className="px-2.5 py-1.5 text-neutral-400 hover:text-white rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 text-[10px] text-neutral-500 leading-tight">
              To continue, Google will securely link your profile and motion presets with Sparrow.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
