import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ChatSession, ChatMessage } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with forced long polling to prevent 10s WebSocket timeouts in iframes & proxies
let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  try {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch {
    firestoreDb = getFirestore(app);
  }
}
export const db = firestoreDb;
export const auth = getAuth(app);

// Standard Google Auth Provider for basic user sign-in and cloud sync
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// Google Drive Workspace Provider (requested only when connecting to Google Drive)
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

export const googleDriveProvider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => {
  googleDriveProvider.addScope(scope);
});
googleDriveProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// Alias for backwards compatibility
export const googleProvider = googleAuthProvider;

// MANDATORY per SKILL.md: In-memory cache for OAuth access token (NO localStorage / sessionStorage)
let cachedAccessToken: string | null = null;

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

// Standard Firestore Error Handling conforming strictly to Firebase Skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Graceful connection status helper
export async function testFirestoreConnection() {
  if (!auth.currentUser) {
    return;
  }
  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await getDoc(userRef);
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (
      msg.includes('the client is offline') ||
      msg.includes('unavailable') ||
      msg.includes('Could not reach') ||
      msg.includes('Failed to get document')
    ) {
      console.info("Firestore client is operating in offline mode or establishing connection.");
    }
  }
}

// Auth Actions
export function formatAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  const message = (error?.message || String(error)).toLowerCase();

  if (code === 'auth/popup-closed-by-user') {
    return 'লগইন পপ-আপ উইন্ডোটি বন্ধ করা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
  }
  if (code === 'auth/popup-blocked') {
    return 'ব্রাউজার পপ-আপ উইন্ডোটি ব্লক করেছে। অনুগ্রহ করে ব্রাউজার অ্যাড্রেসবারে পপ-আপ অনুমোদন করে পুনরায় চেষ্টা করুন।';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'পূর্ববর্তী লগইন রিকোয়েস্ট বাতিল হয়েছে। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।';
  }
  if (code === 'auth/network-request-failed') {
    return 'ইন্টারনেট বা নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'এই ডোমেইনটি Firebase অনুমোদিত তালিকায় নেই।';
  }
  if (message.includes('state') || message.includes('missing')) {
    return 'OAuth সংযোগ ব্যর্থ (Missing state parameter)। ব্রাউজারের থার্ড-পার্টি কুকিজ বা ট্র্যাকিং শিল্ড (যেমন Brave Shields, AdBlock) সাময়িকভাবে নিষ্ক্রিয় করে পুনরায় চেষ্টা করুন।';
  }
  return error?.message || 'গুগল সংযোগ স্থাপন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
}

export async function signInWithGoogle(withDriveScopes = false): Promise<{ user: User; accessToken: string | null }> {
  try {
    const provider = withDriveScopes ? googleDriveProvider : googleAuthProvider;
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Extract OAuth access token from credential and cache in memory
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    
    // Sync user profile to Firestore
    const userRef = doc(db, 'users', user.uid);
    const path = `users/${user.uid}`;
    try {
      const userDoc = await getDoc(userRef);
      const existingData = userDoc.exists() ? userDoc.data() : null;
      await setDoc(userRef, {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
        createdAt: existingData?.createdAt || new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    
    return { user, accessToken: cachedAccessToken };
  } catch (err: unknown) {
    console.error('Sign-in error:', err);
    throw new Error(formatAuthErrorMessage(err));
  }
}

/**
 * Ensures an active Google Drive OAuth access token is available.
 * If token is not cached in memory, prompts user to sign in / consent via popup with Drive scopes.
 */
export async function requestDriveAccessToken(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  const { accessToken } = await signInWithGoogle(true);
  if (!accessToken) {
    throw new Error('Google Drive এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পপআপে পারমিশন দিন।');
  }
  return accessToken;
}

export async function signOutUser(): Promise<void> {
  cachedAccessToken = null;
  await firebaseSignOut(auth);
}

// Cloud Synchronization for Sessions
export async function saveSessionToCloud(userId: string, session: ChatSession): Promise<void> {
  if (!userId || !session || !session.id) return;
  const path = `users/${userId}/sessions/${session.id}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
    await setDoc(sessionRef, {
      id: session.id,
      userId,
      title: (session.title || 'নতুন চ্যাট').slice(0, 200),
      mode: session.mode || 'general',
      createdAt: typeof session.createdAt === 'number' ? session.createdAt : (Date.parse(String(session.createdAt)) || Date.now()),
      updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : (Date.parse(String(session.updatedAt)) || Date.now()),
      isPinned: Boolean(session.isPinned),
      pinnedAt: typeof session.pinnedAt === 'number' ? session.pinnedAt : null,
    }, { merge: true });

    // Save individual messages in subcollection
    if (Array.isArray(session.messages)) {
      for (const msg of session.messages) {
        if (!msg.id) continue;
        const msgPath = `users/${userId}/sessions/${session.id}/messages/${msg.id}`;
        try {
          const msgRef = doc(db, 'users', userId, 'sessions', session.id, 'messages', msg.id);
          await setDoc(msgRef, {
            id: msg.id,
            sessionId: session.id,
            userId,
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: (msg.text || '').slice(0, 50000),
            timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
            citations: msg.groundingChunks ? msg.groundingChunks.map(c => c.web?.title || '').filter(Boolean).slice(0, 50) : [],
          }, { merge: true });
        } catch (msgErr) {
          handleFirestoreError(msgErr, OperationType.WRITE, msgPath);
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadSessionsFromCloud(userId: string): Promise<ChatSession[]> {
  const path = `users/${userId}/sessions`;
  try {
    const sessionsCol = collection(db, 'users', userId, 'sessions');
    const sessionsSnapshot = await getDocs(sessionsCol);
    const sessions: ChatSession[] = [];

    for (const sessionDoc of sessionsSnapshot.docs) {
      const sData = sessionDoc.data();
      const sessionId = sessionDoc.id;

      // Fetch messages for this session
      const messagesCol = collection(db, 'users', userId, 'sessions', sessionId, 'messages');
      const q = query(messagesCol, orderBy('timestamp', 'asc'));
      const messagesSnapshot = await getDocs(q);

      const messages: ChatMessage[] = messagesSnapshot.docs.map(mDoc => {
        const mData = mDoc.data();
        return {
          id: mData.id || mDoc.id,
          role: mData.role,
          text: mData.content || '',
          timestamp: Number(mData.timestamp) || Date.now(),
        };
      });

      sessions.push({
        id: sessionId,
        title: sData.title || 'কথোপকথন',
        mode: sData.mode || 'general',
        enableSearch: false,
        createdAt: typeof sData.createdAt === 'number' ? sData.createdAt : (Date.parse(sData.createdAt) || Date.now()),
        updatedAt: typeof sData.updatedAt === 'number' ? sData.updatedAt : (Date.parse(sData.updatedAt) || Date.now()),
        isPinned: Boolean(sData.isPinned),
        pinnedAt: typeof sData.pinnedAt === 'number' ? sData.pinnedAt : undefined,
        messages,
      });
    }

    return sessions.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteSessionFromCloud(userId: string, sessionId: string): Promise<void> {
  const path = `users/${userId}/sessions/${sessionId}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
