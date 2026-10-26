import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppLogo } from './AppLogo';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  KeyRound
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    signIn, 
    signInWithEmail, 
    signUpWithEmail, 
    signInAsGuest, 
    sendPasswordReset,
    authError,
    clearAuthError
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    clearAuthError();
    setLocalError(null);
    setSuccessMessage(null);
    closeAuthModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearAuthError();

    if (!email.trim()) {
      setLocalError('দয়া করে আপনার ইমেইল অ্যাড্রেস লিখুন।');
      return;
    }

    if (mode === 'forgot') {
      try {
        setLoading(true);
        await sendPasswordReset(email.trim());
        setSuccessMessage('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।');
      } catch (err: any) {
        setLocalError(err?.message || 'রিসেট লিংক পাঠাতে ব্যর্থ হয়েছে।');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setLocalError('দয়া করে আপনার পাসওয়ার্ড লিখুন।');
      return;
    }

    if (password.length < 6) {
      setLocalError('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      }
      handleClose();
    } catch (err: any) {
      setLocalError(err?.message || 'অথেন্টিকেশন ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setSuccessMessage(null);
    clearAuthError();
    try {
      setLoading(true);
      await signIn();
      handleClose();
    } catch (err: any) {
      setLocalError(err?.message || 'গুগল সাইন-ইন ব্যর্থ হয়েছে। অ্যান্ড্রয়েড অ্যাপে সমস্যা হলে সরাসরি ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLocalError(null);
    setSuccessMessage(null);
    clearAuthError();
    try {
      setLoading(true);
      await signInAsGuest('গেস্ট ইউজার');
      handleClose();
    } catch (err: any) {
      setLocalError(err?.message || 'গেস্ট লগইন ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header & Logo */}
          <div className="flex items-center gap-3.5 mb-5">
            <AppLogo size={46} withGlow />
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                লগইন ও অ্যাকাউন্ট
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                  <Smartphone className="w-2.5 h-2.5" />
                  অ্যান্ড্রয়েড রেডি
                </span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                ক্লাউড চ্যাট হিস্ট্রি ও ব্যাকআপের জন্য সাইন-ইন করুন
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 mb-5 bg-stone-950/80 rounded-xl border border-stone-800/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('signin'); setLocalError(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-cyan-500 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setLocalError(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-cyan-500 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              নতুন অ্যাকাউন্ট
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setLocalError(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'forgot'
                  ? 'bg-cyan-500 text-stone-950 shadow-sm font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              রিসেট
            </button>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{displayError}</div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  আপনার নাম (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="যেমন: শেখ ফরিদ"
                    className="w-full pl-9 pr-3 py-2 bg-stone-950/60 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-hidden focus:border-cyan-500 placeholder-stone-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                ইমেইল ঠিকানা
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950/60 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-hidden focus:border-cyan-500 placeholder-stone-600 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-stone-300">
                    পাসওয়ার্ড
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬টি অক্ষর"
                    className="w-full pl-9 pr-9 py-2 bg-stone-950/60 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-hidden focus:border-cyan-500 placeholder-stone-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  <span>লগইন করুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>অ্যাকাউন্ট তৈরি করুন</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>রিসেট লিংক পাঠান</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-stone-900 px-2 text-stone-500 font-semibold tracking-wider">
                অথবা অন্য উপায়ে
              </span>
            </div>
          </div>

          {/* Secondary Actions: Google and Guest */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2 px-3 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2.5"
            >
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
              <span>গুগল অ্যাকাউন্ট দিয়ে লগইন</span>
            </button>

            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={loading}
              className="w-full py-2 px-3 bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800/80 text-stone-300 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>এক ক্লিকে গেস্ট হিসেবে প্রবেশ করুন</span>
            </button>
          </div>

          {/* Android Mobile Help Note */}
          <div className="mt-4 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/60 text-[11px] text-stone-400 leading-relaxed">
            💡 <strong className="text-stone-300">অ্যান্ড্রয়েড ব্যবহারকারীদের জন্য:</strong> আপনার ফোনে সরাসরি ইমেইল ও পাসওয়ার্ড দিয়ে লগইন অথবা গেস্ট মোড ব্যবহার করলে কোনো ব্রাউজার রিডাইরেক্ট ছাড়াই নির্বিঘ্নে চ্যাট ও ক্লাউড ডেটা সিঙ্ক হবে।
          </div>
        </div>
      </div>
    </div>
  );
};
