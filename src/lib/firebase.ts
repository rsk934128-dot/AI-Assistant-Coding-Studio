import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  setLogLevel,
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

// Set Firestore log level to error to prevent verbose 10s WebSocket timeout warning spam in sandboxes & iframes
try {
  setLogLevel('error');
} catch {
  // Ignored if logger is restricted
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with forced long polling and auto-detect disabled
// This prevents the SDK from probing WebSockets and waiting 10s before falling back.
let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
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

// YouTube Google Auth Provider (requested for YouTube channel & media library integration)
export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
];

export const googleYouTubeProvider = new GoogleAuthProvider();
YOUTUBE_SCOPES.forEach((scope) => {
  googleYouTubeProvider.addScope(scope);
});
googleYouTubeProvider.setCustomParameters({
  prompt: 'select_account',
});

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
}

export async function fetchUserYouTubeChannel(token: string): Promise<YouTubeChannelInfo | null> {
  if (!token) return null;
  try {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
      id: item.id,
      title: item.snippet?.title || '',
      customUrl: item.snippet?.customUrl || '',
      description: item.snippet?.description || '',
      thumbnail: item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.medium?.url || '',
      subscriberCount: item.statistics?.subscriberCount || '0',
      videoCount: item.statistics?.videoCount || '0',
      viewCount: item.statistics?.viewCount || '0',
    };
  } catch (err) {
    console.warn('Error fetching YouTube channel:', err);
    return null;
  }
}

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
    return 'ব্রাউজার পপ-আপ উইন্ডোটি ব্লক করেছে। অ্যান্ড্রয়েড অ্যাপে সরাসরি ইমেইল/পাসওয়ার্ড বা গেস্ট মোড দিয়ে লগইন করুন।';
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
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
    return 'ভুল ইমেইল অথবা পাসওয়ার্ড দেওয়া হয়েছে। পুনরায় সঠিক তথ্য দিন।';
  }
  if (code === 'auth/user-not-found') {
    return 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে রেজিস্ট্রেশন করুন।';
  }
  if (code === 'auth/email-already-in-use') {
    return 'এই ইমেইলটি ইতিপূর্বে ব্যবহৃত হয়েছে। দয়া করে লগইন করুন অথবা অন্য ইমেইল ব্যবহার করুন।';
  }
  if (code === 'auth/weak-password') {
    return 'পাসওয়ার্ডটি খুব দুর্বল। অনুগ্রহ করে কমপক্ষে ৬ বা ততোধিক অক্ষরের পাসওয়ার্ড দিন।';
  }
  if (code === 'auth/invalid-email') {
    return 'দয়া করে একটি সঠিক ও কার্যকর ইমেইল অ্যাড্রেস লিখুন।';
  }
  if (code === 'auth/operation-not-supported-in-this-environment') {
    return 'এই প্ল্যাটফর্মে সরাসরি পপ-আপ অনুমোদিত নয়। অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।';
  }
  if (message.includes('disallowed_useragent') || message.includes('user agent')) {
    return 'গুগল সিকিউরিটি পলিসির কারণে অ্যাপের ভেতর সরাসরি গুগল পপআপ ব্লক করা হয়েছে। অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি লগইন বা রেজিস্টার করুন।';
  }
  if (message.includes('state') || message.includes('missing')) {
    return 'OAuth সংযোগ ব্যর্থ (Missing state parameter)। ব্রাউজারের থার্ড-পার্টি কুকিজ বা ট্র্যাকিং শিল্ড সাময়িকভাবে নিষ্ক্রিয় করে পুনরায় চেষ্টা করুন।';
  }
  return error?.message || 'লগইন সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
}

/**
 * Universal profile synchronizer for any authenticated user (Google, Email/Password, Anonymous)
 */
export async function syncUserProfile(user: User, fallbackName?: string): Promise<void> {
  if (!user || !user.uid) return;
  const userRef = doc(db, 'users', user.uid);
  const commUserRef = doc(db, 'community_users', user.uid);
  const path = `users/${user.uid}`;
  const displayName = user.displayName || fallbackName || (user.isAnonymous ? 'গেস্ট ব্যবহারকারী' : (user.email ? user.email.split('@')[0] : 'ইউজার'));
  
  try {
    const userDoc = await getDoc(userRef);
    const existingData = userDoc.exists() ? userDoc.data() : null;
    const profileData = {
      id: user.uid,
      email: user.email || (user.isAnonymous ? 'guest@aiassistant.app' : ''),
      displayName,
      photoURL: user.photoURL || '',
      isAnonymous: Boolean(user.isAnonymous),
      updatedAt: new Date().toISOString(),
      createdAt: existingData?.createdAt || new Date().toISOString(),
    };
    await setDoc(userRef, profileData, { merge: true });

    // Register into community users directory
    await setDoc(commUserRef, {
      id: user.uid,
      displayName,
      email: user.email || '',
      photoURL: user.photoURL || '',
      isOnline: true,
      lastActive: Date.now(),
      role: user.isAnonymous ? 'গেস্ট অ্যাকাউন্ট' : 'ভেরিফায়েড অ্যাকাউন্ট',
      bio: user.isAnonymous ? 'গেস্ট মোডে সক্রিয় সদস্য।' : 'প্ল্যাটফর্মে সক্রিয় রেজিস্টার্ড সদস্য।',
      joinedAt: existingData?.joinedAt || Date.now(),
    }, { merge: true });
  } catch (err: any) {
    const errStr = (err?.message || String(err)).toLowerCase();
    if (
      errStr.includes('offline') ||
      errStr.includes('could not reach') ||
      errStr.includes('unavailable') ||
      errStr.includes('timeout')
    ) {
      console.info('User profile write queued in offline cache.');
    } else {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

/**
 * Sign in using Email and Password (Works 100% on Native Android WebView & Web)
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await syncUserProfile(credential.user);
    return credential.user;
  } catch (err: any) {
    console.error('Email sign-in error:', err);
    throw new Error(formatAuthErrorMessage(err));
  }
}

/**
 * Sign up using Email, Password, and Display Name
 */
export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const trimmedName = displayName?.trim() || email.split('@')[0];
    try {
      await updateProfile(credential.user, { displayName: trimmedName });
    } catch {
      // Continue if updateProfile fails
    }
    await syncUserProfile(credential.user, trimmedName);
    return credential.user;
  } catch (err: any) {
    console.error('Email sign-up error:', err);
    throw new Error(formatAuthErrorMessage(err));
  }
}

/**
 * Sign in as Guest / Anonymous user for instant Android access without credentials
 */
export async function signInAsGuest(displayName = 'গেস্ট ইউজার'): Promise<User> {
  try {
    const credential = await signInAnonymously(auth);
    try {
      await updateProfile(credential.user, { displayName });
    } catch {
      // Ignore
    }
    await syncUserProfile(credential.user, displayName);
    return credential.user;
  } catch (err: any) {
    console.error('Anonymous sign-in error:', err);
    throw new Error(formatAuthErrorMessage(err));
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    console.error('Password reset error:', err);
    throw new Error(formatAuthErrorMessage(err));
  }
}

export async function signInWithGoogle(
  withDriveScopes = false,
  withYouTubeScopes = false
): Promise<{ user: User; accessToken: string | null; youtubeChannel?: YouTubeChannelInfo | null }> {
  try {
    let provider = googleAuthProvider;
    if (withDriveScopes && withYouTubeScopes) {
      provider = new GoogleAuthProvider();
      [...DRIVE_SCOPES, ...YOUTUBE_SCOPES].forEach((scope) => provider.addScope(scope));
      provider.setCustomParameters({ prompt: 'consent', access_type: 'offline' });
    } else if (withDriveScopes) {
      provider = googleDriveProvider;
    } else if (withYouTubeScopes) {
      provider = googleYouTubeProvider;
    }

    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Extract OAuth access token from credential and cache in memory
    const credential = GoogleAuthProvider.credentialFromResult(result);
    let ytInfo: YouTubeChannelInfo | null = null;

    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      if (withYouTubeScopes) {
        try {
          ytInfo = await fetchUserYouTubeChannel(credential.accessToken);
        } catch {
          // Continue if YouTube API read fails
        }
      }
    }
    
    // Sync user profile to Firestore
    const userRef = doc(db, 'users', user.uid);
    const commUserRef = doc(db, 'community_users', user.uid);
    const path = `users/${user.uid}`;
    try {
      const userDoc = await getDoc(userRef);
      const existingData = userDoc.exists() ? userDoc.data() : null;
      const profileData: any = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'গুগল ব্যবহারকারী',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
        createdAt: existingData?.createdAt || new Date().toISOString(),
      };
      if (ytInfo) {
        profileData.youtubeChannel = ytInfo;
      }
      await setDoc(userRef, profileData, { merge: true });

      // Register into public community users directory for live presence, messaging & calling
      const commData: any = {
        id: user.uid,
        displayName: user.displayName || 'গুগল ব্যবহারকারী',
        email: user.email || '',
        photoURL: user.photoURL || '',
        isOnline: true,
        lastActive: Date.now(),
        role: ytInfo ? `YouTube ক্রিয়েটর (${ytInfo.title})` : 'গুগল ভেরিফায়েড অ্যাকাউন্ট',
        bio: ytInfo ? `YouTube Channel: ${ytInfo.title} | ${ytInfo.subscriberCount} Subscribers` : 'প্ল্যাটফর্মে সক্রিয় রিয়েল গুগল অ্যাকাউন্টধারী।',
        joinedAt: Date.now(),
      };
      if (ytInfo) {
        commData.youtubeChannel = ytInfo;
      }
      await setDoc(commUserRef, commData, { merge: true });
    } catch (err: any) {
      const errStr = (err?.message || String(err)).toLowerCase();
      if (
        errStr.includes('offline') ||
        errStr.includes('could not reach') ||
        errStr.includes('unavailable') ||
        errStr.includes('timeout')
      ) {
        console.info('User profile write queued in offline cache.');
      } else {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
    
    return { user, accessToken: cachedAccessToken, youtubeChannel: ytInfo };
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
        } catch (msgErr: any) {
          const msgErrStr = (msgErr?.message || String(msgErr)).toLowerCase();
          if (
            msgErrStr.includes('offline') ||
            msgErrStr.includes('could not reach') ||
            msgErrStr.includes('unavailable') ||
            msgErrStr.includes('timeout')
          ) {
            console.info('Message queued for offline sync.');
          } else {
            handleFirestoreError(msgErr, OperationType.WRITE, msgPath);
          }
        }
      }
    }
  } catch (err: any) {
    const errStr = (err?.message || String(err)).toLowerCase();
    if (
      errStr.includes('offline') ||
      errStr.includes('could not reach') ||
      errStr.includes('unavailable') ||
      errStr.includes('timeout')
    ) {
      console.info('Session queued for offline sync.');
    } else {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
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
      try {
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
      } catch (msgErr: any) {
        const msgErrStr = (msgErr?.message || String(msgErr)).toLowerCase();
        if (
          msgErrStr.includes('offline') ||
          msgErrStr.includes('could not reach') ||
          msgErrStr.includes('unavailable')
        ) {
          console.info('Session messages fetch deferred in offline mode.');
        } else {
          handleFirestoreError(msgErr, OperationType.LIST, `${path}/${sessionId}/messages`);
        }
      }
    }

    return sessions.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
  } catch (err: any) {
    const errMsg = (err?.message || String(err)).toLowerCase();
    if (
      errMsg.includes('offline') ||
      errMsg.includes('could not reach') ||
      errMsg.includes('unavailable') ||
      errMsg.includes('timeout') ||
      errMsg.includes('failed to get document') ||
      errMsg.includes('failed-precondition')
    ) {
      console.info('Firestore is in offline mode; using cached/local sessions.');
      return [];
    }
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteSessionFromCloud(userId: string, sessionId: string): Promise<void> {
  const path = `users/${userId}/sessions/${sessionId}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (err: any) {
    const errStr = (err?.message || String(err)).toLowerCase();
    if (
      errStr.includes('offline') ||
      errStr.includes('could not reach') ||
      errStr.includes('unavailable') ||
      errStr.includes('timeout')
    ) {
      console.info('Session delete queued for offline sync.');
    } else {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
}
