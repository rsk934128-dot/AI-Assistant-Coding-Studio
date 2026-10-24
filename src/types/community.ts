export interface CommunityUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isOnline: boolean;
  lastActive: number;
  role?: string;
  bio?: string;
  customStatus?: string;
  joinedAt?: number;
  isGoogleVerified?: boolean;
}

export type MessageType = 'text' | 'audio' | 'call_log' | 'image';

export interface CommunityMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  receiverId: string; // user UID or 'community_public'
  text: string;
  type: MessageType;
  audioUrl?: string; // base64 or blob URL for voice clips
  timestamp: number;
  read?: boolean;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'accepted' | 'connected' | 'ended' | 'declined' | 'missed';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  type: CallType;
  status: CallStatus;
  offer?: RTCSessionDescriptionInit | null;
  answer?: RTCSessionDescriptionInit | null;
  createdAt: number;
  endedAt?: number;
  duration?: number; // seconds
}
