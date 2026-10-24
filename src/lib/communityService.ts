import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { CommunityUser, CommunityMessage, CallSession } from '../types/community';

// Dedicated BroadcastChannel for instant multi-tab zero-latency synchronization & offline testing
const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('sheikh_farid_community_mesh') 
  : null;

// Initial curated community team companions so users can immediately test messaging & calls
export const DEFAULT_COMMUNITY_MEMBERS: CommunityUser[] = [
  {
    id: 'team_founder_farid',
    displayName: 'শেখ ফরিদ (Founder & Lead)',
    email: 'sheikhfaridvisa164@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    lastActive: Date.now(),
    role: 'Lead Architect & Founder',
    bio: 'দুবাই ও ইউএই ভিসা অটোমেশন, ফিনটেক ও এআই সফটওয়্যার আর্কিটেক্ট। যেকোনো সাহায্য লাগলে মেসেজ বা কল করুন!',
    customStatus: '🚀 ডেভেলপিং নিউ ফিচার্স',
    joinedAt: Date.now() - 30 * 24 * 3600 * 1000,
    isGoogleVerified: true,
  },
  {
    id: 'team_tanveer_cloud',
    displayName: 'তানভীর আহমেদ',
    email: 'tanveer.cloud@studiodubai.ae',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    lastActive: Date.now() - 2 * 60 * 1000,
    role: 'Senior Cloud & DevOps Engineer',
    bio: 'Cloud Run, Kubernetes এবং হাই-পারফরম্যান্স সার্ভার সিঙ্ক এক্সপার্ট।',
    customStatus: '⚡ সার্ভার মনিটরিং',
    joinedAt: Date.now() - 20 * 24 * 3600 * 1000,
    isGoogleVerified: true,
  },
  {
    id: 'team_fatema_ai',
    displayName: 'ফাতেমা জাহান',
    email: 'fatema.ml@studiodubai.ae',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    lastActive: Date.now() - 5 * 60 * 1000,
    role: 'AI & NLP Specialist',
    bio: 'Gemini ও বাংলা ন্যাচারাল ল্যাঙ্গুয়েজ মডেল অপ্টিমাইজেশন নিয়ে কাজ করছি।',
    customStatus: '🧠 প্রম্পট টিউনিং',
    joinedAt: Date.now() - 15 * 24 * 3600 * 1000,
    isGoogleVerified: true,
  },
  {
    id: 'team_maruf_frontend',
    displayName: 'মারুফ হাসান',
    email: 'maruf.dev@studiodubai.ae',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    isOnline: false,
    lastActive: Date.now() - 45 * 60 * 1000,
    role: 'Full-Stack UI Engineer',
    bio: 'Tailwind CSS, Glassmorphism এবং রিয়্যাল-টাইম অডিও/ভিডিও কলিং ডেভেলপার।',
    customStatus: '☕ কোডিং ইন প্রগ্রেস',
    joinedAt: Date.now() - 10 * 24 * 3600 * 1000,
    isGoogleVerified: false,
  },
  {
    id: 'team_sumi_community',
    displayName: 'সুমি আক্তার',
    email: 'sumi.community@studiodubai.ae',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    isOnline: false,
    lastActive: Date.now() - 3 * 3600 * 1000,
    role: 'Community Lead & Support',
    bio: 'প্ল্যাটফর্মের সকল মেম্বারদের সহায়তা এবং গাইডলাইন প্রদানে নিয়োজিত।',
    customStatus: '🌟 কমিউনিটি হেল্পডেস্ক',
    joinedAt: Date.now() - 5 * 24 * 3600 * 1000,
    isGoogleVerified: false,
  }
];

// Local memory storage for offline/fallback mode
const localUsersStore = new Map<string, CommunityUser>();
DEFAULT_COMMUNITY_MEMBERS.forEach(u => localUsersStore.set(u.id, u));

const localMessagesStore: CommunityMessage[] = [];

// Helper to get local user identity from localStorage or Firebase Auth
export function getLocalUserProfile(): CommunityUser {
  if (typeof window === 'undefined') {
    return DEFAULT_COMMUNITY_MEMBERS[0];
  }

  // If user is actively signed in with Firebase Auth, their verified Google credentials ALWAYS take precedence!
  const currentUser = auth.currentUser;
  if (currentUser) {
    const googleProfile: CommunityUser = {
      id: currentUser.uid,
      displayName: currentUser.displayName || 'গুগল ব্যবহারকারী',
      email: currentUser.email || 'user@gmail.com',
      photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
      isOnline: true,
      lastActive: Date.now(),
      role: 'গুগল ভেরিফায়েড অ্যাকাউন্ট (Google Account)',
      bio: 'গুগল অ্যাকাউন্ট দিয়ে সরাসরি সংযুক্ত। মেসেজ বা কল করুন!',
      joinedAt: currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).getTime() : Date.now(),
      isGoogleVerified: true,
    };
    try {
      localStorage.setItem('sheikh_farid_my_community_profile', JSON.stringify(googleProfile));
      localUsersStore.set(googleProfile.id, googleProfile);
    } catch {}
    return googleProfile;
  }

  const saved = localStorage.getItem('sheikh_farid_my_community_profile');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id) return parsed;
    } catch {
      // ignore
    }
  }

  const newProfile: CommunityUser = {
    id: `guest_${Math.random().toString(36).slice(2, 9)}`,
    displayName: 'কমিউনিটি মেম্বার',
    email: 'member@studiodubai.ae',
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`,
    isOnline: true,
    lastActive: Date.now(),
    role: 'সদস্য (Member)',
    bio: 'আমাদের স্মার্ট কোডিং ও কমিউনিটি প্ল্যাটফর্ম ব্যবহার করছি।',
    joinedAt: Date.now(),
    isGoogleVerified: false,
  };

  localStorage.setItem('sheikh_farid_my_community_profile', JSON.stringify(newProfile));
  localUsersStore.set(newProfile.id, newProfile);
  return newProfile;
}

export function saveLocalUserProfile(profile: CommunityUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sheikh_farid_my_community_profile', JSON.stringify(profile));
    localUsersStore.set(profile.id, profile);
    broadcast?.postMessage({ type: 'USER_PRESENCE_UPDATE', payload: profile });
  }
}

// Explicit sync helper when Google Auth status changes
export async function syncGoogleUserToCommunity(currentUser: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  metadata?: { creationTime?: string };
}): Promise<CommunityUser> {
  const profile: CommunityUser = {
    id: currentUser.uid,
    displayName: currentUser.displayName || 'গুগল ব্যবহারকারী',
    email: currentUser.email || 'user@gmail.com',
    photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
    isOnline: true,
    lastActive: Date.now(),
    role: 'গুগল ভেরিফায়েড অ্যাকাউন্ট (Google Account)',
    bio: 'গুগল অ্যাকাউন্ট থেকে ভেরিফায়েড মেম্বার। মেসেজ ও কল করতে পারেন!',
    customStatus: '🟢 সক্রিয়',
    joinedAt: currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).getTime() : Date.now(),
    isGoogleVerified: true,
  };

  saveLocalUserProfile(profile);
  await updateUserPresence(profile);
  return profile;
}

// ----------------------------------------------------
// 1. PRESENCE & USER DIRECTORY
// ----------------------------------------------------
export async function updateUserPresence(user: Partial<CommunityUser> & { id: string }): Promise<void> {
  const existing = localUsersStore.get(user.id) || getLocalUserProfile();
  const updatedUser: CommunityUser = {
    ...existing,
    ...user,
    lastActive: Date.now(),
    isGoogleVerified: user.isGoogleVerified !== undefined ? user.isGoogleVerified : existing.isGoogleVerified,
  };

  localUsersStore.set(user.id, updatedUser);
  saveLocalUserProfile(updatedUser);

  // Sync to Firestore if authenticated or online
  try {
    const userRef = doc(db, 'community_users', user.id);
    await setDoc(userRef, {
      id: updatedUser.id,
      displayName: (updatedUser.displayName || 'ব্যবহারকারী').slice(0, 100),
      email: (updatedUser.email || '').slice(0, 150),
      photoURL: (updatedUser.photoURL || '').slice(0, 500),
      isOnline: Boolean(updatedUser.isOnline),
      lastActive: updatedUser.lastActive,
      role: (updatedUser.role || 'Member').slice(0, 100),
      bio: (updatedUser.bio || '').slice(0, 300),
      customStatus: (updatedUser.customStatus || '').slice(0, 100),
      joinedAt: updatedUser.joinedAt || Date.now(),
      isGoogleVerified: Boolean(updatedUser.isGoogleVerified || (updatedUser.email && updatedUser.email.endsWith('@gmail.com'))),
    }, { merge: true });
  } catch (err: any) {
    const msg = (err?.message || String(err)).toLowerCase();
    if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('permission')) {
      console.info('Community user presence cached locally.');
    } else {
      console.warn('Firestore presence write warning:', err);
    }
  }
}

export function subscribeToCommunityUsers(callback: (users: CommunityUser[]) => void): () => void {
  // Always trigger immediately with cached/default users
  const emitLocal = () => {
    const list = Array.from(localUsersStore.values()).sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return b.lastActive - a.lastActive;
    });
    callback(list);
  };
  emitLocal();

  // Listen to BroadcastChannel
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'USER_PRESENCE_UPDATE') {
      const u = event.data.payload as CommunityUser;
      localUsersStore.set(u.id, u);
      emitLocal();
    }
  };
  broadcast?.addEventListener('message', handleBroadcast);

  // Listen to Firestore
  const usersCol = collection(db, 'community_users');
  const unsubscribeFirestore = onSnapshot(
    usersCol,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as CommunityUser;
        if (data && data.id) {
          const isGoogle = Boolean(data.isGoogleVerified || (data.email && (data.email.includes('@gmail.com') || data.email.includes('sheikhfarid'))));
          localUsersStore.set(data.id, {
            ...data,
            isGoogleVerified: isGoogle,
            // If active in last 5 minutes, treat as online
            isOnline: Boolean(data.isOnline && (Date.now() - (data.lastActive || 0) < 5 * 60 * 1000)),
          });
        }
      });
      emitLocal();
    },
    (error) => {
      console.info('Using local community directory (Firestore snapshot deferred):', error.message);
      emitLocal();
    }
  );

  return () => {
    broadcast?.removeEventListener('message', handleBroadcast);
    unsubscribeFirestore();
  };
}

// ----------------------------------------------------
// 2. REAL-TIME MESSAGING (Direct & Group)
// ----------------------------------------------------
export async function sendCommunityMessage(
  msg: Omit<CommunityMessage, 'id' | 'timestamp'>
): Promise<CommunityMessage> {
  const newMsg: CommunityMessage = {
    ...msg,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    read: false,
  };

  localMessagesStore.push(newMsg);
  broadcast?.postMessage({ type: 'NEW_COMMUNITY_MESSAGE', payload: newMsg });

  // Sync to Firestore
  const path = `community_messages/${newMsg.id}`;
  try {
    const msgRef = doc(db, 'community_messages', newMsg.id);
    await setDoc(msgRef, {
      id: newMsg.id,
      conversationId: newMsg.conversationId,
      senderId: newMsg.senderId,
      senderName: newMsg.senderName.slice(0, 100),
      senderPhoto: (newMsg.senderPhoto || '').slice(0, 500),
      receiverId: newMsg.receiverId,
      text: newMsg.text.slice(0, 10000),
      type: newMsg.type,
      audioUrl: newMsg.audioUrl || '',
      timestamp: newMsg.timestamp,
      read: Boolean(newMsg.read),
    });
  } catch (err: any) {
    const msgErr = (err?.message || String(err)).toLowerCase();
    if (msgErr.includes('offline') || msgErr.includes('unavailable') || msgErr.includes('permission')) {
      console.info('Message sent via local mesh/offline cache.');
    } else {
      console.warn('Firestore message write deferred:', err);
    }
  }

  return newMsg;
}

export function subscribeToCommunityMessages(
  conversationId: string,
  callback: (messages: CommunityMessage[]) => void
): () => void {
  const emitLocal = () => {
    const filtered = localMessagesStore
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp - b.timestamp);
    callback(filtered);
  };
  emitLocal();

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'NEW_COMMUNITY_MESSAGE') {
      const m = event.data.payload as CommunityMessage;
      if (m.conversationId === conversationId) {
        if (!localMessagesStore.some((x) => x.id === m.id)) {
          localMessagesStore.push(m);
        }
        emitLocal();
      }
    }
  };
  broadcast?.addEventListener('message', handleBroadcast);

  // Firestore onSnapshot listener
  const messagesCol = collection(db, 'community_messages');
  const q = query(
    messagesCol,
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const cloudMsgs: CommunityMessage[] = [];
      snapshot.forEach((docSnap) => {
        cloudMsgs.push(docSnap.data() as CommunityMessage);
      });

      // Merge unique
      cloudMsgs.forEach((cm) => {
        const idx = localMessagesStore.findIndex((lm) => lm.id === cm.id);
        if (idx >= 0) {
          localMessagesStore[idx] = cm;
        } else {
          localMessagesStore.push(cm);
        }
      });

      emitLocal();
    },
    (err) => {
      console.info('Using local messages cache (Firestore query deferred):', err.message);
      emitLocal();
    }
  );

  return () => {
    broadcast?.removeEventListener('message', handleBroadcast);
    unsubscribe();
  };
}

// ----------------------------------------------------
// 3. WEBRTC AUDIO & VIDEO CALL SIGNALING
// ----------------------------------------------------
export async function initiateCallSession(
  params: Omit<CallSession, 'id' | 'createdAt' | 'status'>
): Promise<CallSession> {
  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const callSession: CallSession = {
    ...params,
    id: callId,
    status: 'calling',
    createdAt: Date.now(),
  };

  // Broadcast to other tabs/windows
  broadcast?.postMessage({ type: 'CALL_SIGNAL_INITIATED', payload: callSession });

  try {
    const callRef = doc(db, 'calls', callId);
    await setDoc(callRef, {
      id: callSession.id,
      callerId: callSession.callerId,
      callerName: callSession.callerName,
      callerPhoto: callSession.callerPhoto || '',
      receiverId: callSession.receiverId,
      receiverName: callSession.receiverName,
      receiverPhoto: callSession.receiverPhoto || '',
      type: callSession.type,
      status: callSession.status,
      createdAt: callSession.createdAt,
    });
  } catch (err: any) {
    console.info('Call initiated via local WebRTC signaling mesh:', err?.message);
  }

  return callSession;
}

export async function updateCallSessionState(
  callId: string,
  updates: Partial<CallSession>
): Promise<void> {
  broadcast?.postMessage({
    type: 'CALL_SIGNAL_UPDATED',
    payload: { callId, ...updates },
  });

  try {
    const callRef = doc(db, 'calls', callId);
    await setDoc(callRef, updates, { merge: true });
  } catch (err: any) {
    console.info('Call update delivered via local signaling mesh:', err?.message);
  }
}

export function subscribeToCallSignals(
  callId: string,
  callback: (session: CallSession | null) => void
): () => void {
  const handleBroadcast = (event: MessageEvent) => {
    if (
      (event.data?.type === 'CALL_SIGNAL_UPDATED' && event.data.payload?.callId === callId) ||
      (event.data?.type === 'CALL_SIGNAL_INITIATED' && event.data.payload?.id === callId)
    ) {
      callback(event.data.payload);
    }
  };
  broadcast?.addEventListener('message', handleBroadcast);

  const callRef = doc(db, 'calls', callId);
  const unsubscribe = onSnapshot(
    callRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as CallSession);
      }
    },
    (err) => {
      console.info('Call signal listening on local mesh channel:', err.message);
    }
  );

  return () => {
    broadcast?.removeEventListener('message', handleBroadcast);
    unsubscribe();
  };
}

export function subscribeToIncomingCalls(
  currentUserId: string,
  callback: (call: CallSession | null) => void
): () => void {
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'CALL_SIGNAL_INITIATED') {
      const session = event.data.payload as CallSession;
      if (session.receiverId === currentUserId && (session.status === 'calling' || session.status === 'ringing')) {
        callback(session);
      }
    } else if (event.data?.type === 'CALL_SIGNAL_UPDATED') {
      const session = event.data.payload as Partial<CallSession>;
      if (session.status === 'ended' || session.status === 'declined') {
        callback(null);
      }
    }
  };
  broadcast?.addEventListener('message', handleBroadcast);

  // Firestore listener for calls targeting current user
  const callsCol = collection(db, 'calls');
  const q = query(
    callsCol,
    where('receiverId', '==', currentUserId),
    where('status', 'in', ['calling', 'ringing']),
    limit(1)
  );

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data() as CallSession;
        callback(data);
      }
    },
    (err) => {
      console.info('Incoming call listener active on local channel:', err.message);
    }
  );

  return () => {
    broadcast?.removeEventListener('message', handleBroadcast);
    unsubscribe();
  };
}

// ICE Candidate exchange helper
export async function sendIceCandidate(
  callId: string,
  candidate: RTCIceCandidateInit,
  role: 'caller' | 'receiver'
): Promise<void> {
  broadcast?.postMessage({
    type: 'ICE_CANDIDATE',
    payload: { callId, candidate, role },
  });

  try {
    const candRef = doc(collection(db, 'calls', callId, 'candidates'));
    await setDoc(candRef, {
      candidate: JSON.stringify(candidate),
      role,
      timestamp: Date.now(),
    });
  } catch {
    // handled via broadcast
  }
}

export function subscribeToIceCandidates(
  callId: string,
  oppositeRole: 'caller' | 'receiver',
  callback: (candidate: RTCIceCandidateInit) => void
): () => void {
  const handleBroadcast = (event: MessageEvent) => {
    if (
      event.data?.type === 'ICE_CANDIDATE' &&
      event.data.payload?.callId === callId &&
      event.data.payload?.role === oppositeRole
    ) {
      callback(event.data.payload.candidate);
    }
  };
  broadcast?.addEventListener('message', handleBroadcast);

  const candCol = collection(db, 'calls', callId, 'candidates');
  const unsubscribe = onSnapshot(
    candCol,
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.role === oppositeRole && data.candidate) {
            try {
              const parsed = JSON.parse(data.candidate);
              callback(parsed);
            } catch {
              // ignore
            }
          }
        }
      });
    },
    () => {}
  );

  return () => {
    broadcast?.removeEventListener('message', handleBroadcast);
    unsubscribe();
  };
}
