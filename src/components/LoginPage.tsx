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

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);
    sounds.playClick('left');
    try {
      const user = await authService.loginWithGoogle();
      sounds.playTargetHit();
      setSuccessMessage(`Signed in with Google as ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication is not configured for this domain.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
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

          {/* Quick Google Sign In Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
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
              <span>Continue with Google</span>
              <span className="text-[10px] text-neutral-500 font-normal hidden sm:inline">(OAuth domain required)</span>
            </button>

            <div className="relative flex items-center justify-center">
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
      </div>
    </div>
  );
};
