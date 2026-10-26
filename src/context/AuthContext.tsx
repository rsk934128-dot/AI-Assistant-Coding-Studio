import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  signInWithGoogle, 
  signInWithEmail as fbSignInWithEmail,
  signUpWithEmail as fbSignUpWithEmail,
  signInAsGuest as fbSignInAsGuest,
  sendPasswordReset as fbSendPasswordReset,
  signOutUser 
} from '../lib/firebase';
import { syncGoogleUserToCommunity } from '../lib/communityService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  authError: string | null;
  clearAuthError: () => void;
  signIn: (withDrive?: boolean) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  signInAsGuest: (displayName?: string) => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestDriveToken: () => Promise<string>;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  authError: null,
  clearAuthError: () => {},
  signIn: async () => {},
  signInWithEmail: async () => ({} as User),
  signUpWithEmail: async () => ({} as User),
  signInAsGuest: async () => ({} as User),
  sendPasswordReset: async () => {},
  signOut: async () => {},
  requestDriveToken: async () => '',
  isSyncing: false,
  setIsSyncing: () => {},
  isAuthModalOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        syncGoogleUserToCommunity(currentUser).catch(() => {});
      } else {
        setAccessToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async (withDrive = false) => {
    try {
      setAuthError(null);
      const res = await signInWithGoogle(withDrive);
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
      }
      setIsAuthModalOpen(false);
    } catch (error: any) {
      console.error('Login failed:', error);
      setAuthError(error?.message || 'লগইন ব্যর্থ হয়েছে');
      throw error;
    }
  };

  const handleSignInWithEmail = async (email: string, pass: string): Promise<User> => {
    try {
      setAuthError(null);
      const u = await fbSignInWithEmail(email, pass);
      setIsAuthModalOpen(false);
      return u;
    } catch (error: any) {
      console.error('Email login failed:', error);
      setAuthError(error?.message || 'ইমেইল লগইন ব্যর্থ হয়েছে');
      throw error;
    }
  };

  const handleSignUpWithEmail = async (email: string, pass: string, name?: string): Promise<User> => {
    try {
      setAuthError(null);
      const u = await fbSignUpWithEmail(email, pass, name);
      setIsAuthModalOpen(false);
      return u;
    } catch (error: any) {
      console.error('Email registration failed:', error);
      setAuthError(error?.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
      throw error;
    }
  };

  const handleSignInAsGuest = async (displayName?: string): Promise<User> => {
    try {
      setAuthError(null);
      const u = await fbSignInAsGuest(displayName);
      setIsAuthModalOpen(false);
      return u;
    } catch (error: any) {
      console.error('Guest login failed:', error);
      setAuthError(error?.message || 'গেস্ট লগইন ব্যর্থ হয়েছে');
      throw error;
    }
  };

  const handleSendPasswordReset = async (email: string): Promise<void> => {
    try {
      setAuthError(null);
      await fbSendPasswordReset(email);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      setAuthError(error?.message || 'পাসওয়ার্ড রিসেট লিংক পাঠাতে সমস্যা হয়েছে');
      throw error;
    }
  };

  const handleRequestDriveToken = async (): Promise<string> => {
    try {
      setAuthError(null);
      const res = await signInWithGoogle(true);
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        return res.accessToken;
      }
      throw new Error('এক্সেস টোকেন পাওয়া যায়নি');
    } catch (error: any) {
      console.error('Drive token request failed:', error);
      setAuthError(error?.message || 'Drive সংযোগ ব্যর্থ হয়েছে');
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setAccessToken(null);
      setAuthError(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        authError,
        clearAuthError: () => setAuthError(null),
        signIn: handleSignIn,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signInAsGuest: handleSignInAsGuest,
        sendPasswordReset: handleSendPasswordReset,
        signOut: handleSignOut,
        requestDriveToken: handleRequestDriveToken,
        isSyncing,
        setIsSyncing,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
