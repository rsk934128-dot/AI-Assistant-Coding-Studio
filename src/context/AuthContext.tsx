import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, testFirestoreConnection } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  authError: string | null;
  clearAuthError: () => void;
  signIn: (withDrive?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  requestDriveToken: () => Promise<string>;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  authError: null,
  clearAuthError: () => {},
  signIn: async () => {},
  signOut: async () => {},
  requestDriveToken: async () => '',
  isSyncing: false,
  setIsSyncing: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Test initial connection
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
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
    } catch (error: any) {
      console.error('Login failed:', error);
      setAuthError(error?.message || 'লগইন ব্যর্থ হয়েছে');
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
        signOut: handleSignOut,
        requestDriveToken: handleRequestDriveToken,
        isSyncing,
        setIsSyncing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
