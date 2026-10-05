import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, CloudCheck, LogIn, LogOut, User as UserIcon, RefreshCw, CheckCircle2 } from 'lucide-react';

interface UserAuthButtonProps {
  onSyncAll?: () => Promise<void>;
  compact?: boolean;
}

export const UserAuthButton: React.FC<UserAuthButtonProps> = ({ onSyncAll, compact = false }) => {
  const { user, loading, signIn, signOut, isSyncing } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [syncedRecently, setSyncedRecently] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualSync = async () => {
    if (onSyncAll) {
      await onSyncAll();
      setSyncedRecently(true);
      setTimeout(() => setSyncedRecently(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-800 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        id="firebase-google-login-btn"
        onClick={() => signIn()}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition-colors shadow-xs ${
          compact ? 'px-2' : ''
        }`}
        title="গুগল দিয়ে লগইন করে ক্লাউড ফায়ারস্টোরে চ্যাট হিস্ট্রি ব্যাকআপ রাখুন"
      >
        <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className={compact ? 'hidden sm:inline' : ''}>ক্লাউড সিঙ্ক</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="user-profile-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all"
        title={`${user.displayName || user.email} (ক্লাউড কানেক্টেড)`}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-7 h-7 rounded-full object-cover border border-emerald-500 shadow-xs"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl z-50 p-3 space-y-3">
          {/* User info */}
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-stone-100 dark:border-stone-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-9 h-9 rounded-full object-cover border border-emerald-500"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                {user.displayName || 'Google User'}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="px-2.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
              <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>ফায়ারস্টোর ক্লাউড সিঙ্ক</span>
            </div>
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            ) : syncedRecently ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : null}
          </div>

          {/* Sync Button */}
          {onSyncAll && (
            <button
              id="user-sync-chats-btn"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই সব চ্যাট সিঙ্ক করুন'}</span>
            </button>
          )}

          {/* Sign Out Button */}
          <button
            id="user-signout-btn"
            onClick={() => {
              signOut();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট (Sign Out)</span>
          </button>
        </div>
      )}
    </div>
  );
};
