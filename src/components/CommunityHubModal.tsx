import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Phone, 
  Video, 
  PhoneOff, 
  Mic, 
  MicOff, 
  VideoOff, 
  Monitor, 
  Send, 
  Search, 
  Sparkles, 
  Circle, 
  Clock, 
  Smile, 
  Paperclip, 
  X, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  Edit3, 
  ShieldCheck, 
  Radio, 
  Share2,
  Maximize2,
  RefreshCw,
  Camera,
  Activity,
  AlertCircle
} from 'lucide-react';
import { CommunityUser, CommunityMessage, CallSession, CallType } from '../types/community';
import { 
  subscribeToCommunityUsers, 
  subscribeToCommunityMessages, 
  sendCommunityMessage, 
  getLocalUserProfile, 
  saveLocalUserProfile,
  updateUserPresence
} from '../lib/communityService';
import { useCall } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';

interface CommunityHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'members' | 'messages' | 'calls';
  targetUserId?: string;
}

export const CommunityHubModal: React.FC<CommunityHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'members',
  targetUserId,
}) => {
  const { user: authUser, signIn: signInGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'messages' | 'calls'>(initialTab);
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CommunityUser>(getLocalUserProfile());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'google' | 'offline'>('all');
  
  // Messaging state
  const [activeConversationId, setActiveConversationId] = useState<string>('community_public');
  const [activeTargetUser, setActiveTargetUser] = useState<CommunityUser | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.displayName);
  const [editBio, setEditBio] = useState(currentUser.bio || '');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // WebRTC Calling Engine from Context
  const {
    activeCall,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isVideoOff,
    isScreenSharing,
    facingMode,
    callDuration,
    localAudioLevel,
    mediaError,
    clearMediaError,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    flipCamera,
    testMediaDevices,
    stopMediaTest,
    isTestingMedia,
    simulateTestCall,
  } = useCall();

  // Load and listen for community users
  useEffect(() => {
    if (!isOpen) return;

    const myProfile = getLocalUserProfile();
    setCurrentUser(myProfile);
    setEditName(myProfile.displayName);
    setEditBio(myProfile.bio || '');

    // Announce presence
    updateUserPresence({
      id: myProfile.id,
      displayName: myProfile.displayName,
      isOnline: true,
      lastActive: Date.now(),
      isGoogleVerified: Boolean(authUser || myProfile.isGoogleVerified),
    });

    const unsubscribeUsers = subscribeToCommunityUsers((userList) => {
      setUsers(userList);
    });

    // Periodic heartbeat to stay marked as online
    const heartbeat = setInterval(() => {
      updateUserPresence({
        id: myProfile.id,
        isOnline: true,
        lastActive: Date.now(),
      });
    }, 45000);

    return () => {
      unsubscribeUsers();
      clearInterval(heartbeat);
    };
  }, [isOpen, authUser]);

  // Handle incoming target user direct navigation
  useEffect(() => {
    if (targetUserId && users.length > 0) {
      const found = users.find(u => u.id === targetUserId);
      if (found) {
        startDirectChat(found);
      }
    }
  }, [targetUserId, users]);

  // Subscribe to messages in current active conversation
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToCommunityMessages(activeConversationId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsubscribe();
  }, [isOpen, activeConversationId]);

  // Switch to calls tab automatically if a call becomes active
  useEffect(() => {
    if (activeCall) {
      setActiveTab('calls');
    }
  }, [activeCall]);

  if (!isOpen) return null;

  // Format call duration MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format last active time in Bengali
  const formatLastActive = (timestamp: number, isOnline: boolean) => {
    if (isOnline) return 'এখন সক্রিয় (Active Now)';
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMins < 1) return 'এইমাত্র (Just now)';
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
    return `${Math.floor(diffHours / 24)} দিন আগে`;
  };

  // Switch to Direct Chat
  const startDirectChat = (user: CommunityUser) => {
    setActiveTargetUser(user);
    // Unique deterministic conversation ID for userA and userB
    const ids = [currentUser.id, user.id].sort();
    const convId = `direct_${ids[0]}_${ids[1]}`;
    setActiveConversationId(convId);
    setActiveTab('messages');
  };

  // Start Public Room Chat
  const startPublicRoom = () => {
    setActiveTargetUser(null);
    setActiveConversationId('community_public');
    setActiveTab('messages');
  };

  // Send text message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = messageText.trim();
    if (!text) return;

    setMessageText('');
    await sendCommunityMessage({
      conversationId: activeConversationId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderPhoto: currentUser.photoURL,
      receiverId: activeTargetUser ? activeTargetUser.id : 'community_public',
      text,
      type: 'text',
    });
  };

  // Audio voice clip recording
  const handleStartAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendCommunityMessage({
            conversationId: activeConversationId,
            senderId: currentUser.id,
            senderName: currentUser.displayName,
            senderPhoto: currentUser.photoURL,
            receiverId: activeTargetUser ? activeTargetUser.id : 'community_public',
            text: '🎤 অডিও ভয়েস মেসেজ',
            type: 'audio',
            audioUrl: base64Audio,
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.warn('Microphone permission required for audio message:', err);
    }
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // Save profile modifications
  const handleSaveProfile = () => {
    const updated = {
      ...currentUser,
      displayName: editName.trim() || currentUser.displayName,
      bio: editBio.trim(),
    };
    setCurrentUser(updated);
    saveLocalUserProfile(updated);
    updateUserPresence(updated);
    setIsEditingProfile(false);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (u.id === currentUser.id) return false;
    const matchesSearch = 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'online') return matchesSearch && u.isOnline;
    if (statusFilter === 'offline') return matchesSearch && !u.isOnline;
    if (statusFilter === 'google') return matchesSearch && (u.isGoogleVerified || (u.email && u.email.includes('@gmail.com')));
    return matchesSearch;
  });

  const onlineCount = users.filter((u) => u.isOnline).length;
  const googleAccountsCount = users.filter((u) => u.isGoogleVerified || (u.email && u.email.includes('@gmail.com'))).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[94vh] max-h-[880px] flex flex-col rounded-3xl bg-white dark:bg-stone-925 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100">
        
        {/* HEADER */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-white">
                  কমিউনিটি হাব ও লাইভ অডিও/ভিডিও কলিং
                </h3>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{onlineCount} জন সক্রিয়</span>
                </span>
                <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold text-[11px] border border-blue-500/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>{googleAccountsCount} গুগল অ্যাকাউন্ট</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ফায়ারবেজ থেকে রিয়েল গুগল অ্যাকাউন্ট, ইনস্ট্যান্ট মেসেজিং, রিংটোন সহ অডিও/ভিডিও কলিং
              </p>
            </div>
          </div>

          {/* Current User Quick Badge & Close */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-xs">
              <div className="relative">
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-stone-900" />
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200 max-w-[120px] truncate">
                {currentUser.displayName}
              </span>
              {currentUser.isGoogleVerified && (
                <span title="গুগল ভেরিফায়েড অ্যাকাউন্ট" className="shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="p-1 rounded text-stone-400 hover:text-emerald-500 transition-colors cursor-pointer"
                title="প্রোফাইল পরিবর্তন করুন"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Edit Drawer */}
        {isEditingProfile && (
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center gap-3 animate-in fade-in duration-200 shrink-0">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
              আপনার প্রোফাইল নাম ও পরিচয়:
            </span>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="আপনার নাম"
              className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 text-stone-900 dark:text-stone-100 focus:outline-emerald-500"
            />
            <input
              type="text"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="আপনার শর্ট বায়ো / পেশা"
              className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 text-stone-900 dark:text-stone-100 focus:outline-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveProfile}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              সংরক্ষণ করুন
            </button>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="px-5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'members'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>সক্রিয় মেম্বার ও স্ট্যাটাস ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'messages'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>মেসেজিং ও চ্যাটরুম</span>
              {activeTargetUser && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {activeTargetUser.displayName}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calls')}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'calls'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>অডিও ও ভিডিও কল স্টুডিও</span>
              {activeCall && activeCall.status === 'connected' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-600 text-white animate-pulse">
                  {formatDuration(callDuration)}
                </span>
              )}
            </button>
          </div>

          {/* Quick test call trigger */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => simulateTestCall('video')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition-all cursor-pointer"
              title="ইনকামিং কল এবং রিংটোন টেস্ট করুন"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>রিংটোন ও কল টেস্ট</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          
          {/* 1. MEMBERS & LIVE PRESENCE TAB */}
          {activeTab === 'members' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
              
              {/* Google Sign-in Banner if user has not yet authenticated */}
              {!authUser && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-emerald-600/10 to-indigo-600/10 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0 shadow-xs">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                        গুগল দিয়ে লগইন করে ফায়ারবেজে নিজের রিয়েল অ্যাকাউন্ট প্রদর্শন করুন
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        আপনার আসল গুগল নাম ও ছবি সবার মাঝে প্রদর্শিত হবে এবং আপনি সবার সাথে লাইভ চ্যাট ও অডিও/ভিডিও কল করতে পারবেন
                      </p>
                    </div>
                  </div>
                  <button
                    id="community-google-login-btn"
                    onClick={() => signInGoogle()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
                  >
                    <span>গুগল দিয়ে লগইন করুন</span>
                  </button>
                </div>
              )}

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="নাম, পেশা বা গুগল ইমেইল দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-850 text-xs shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'all'
                        ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-white shadow-2xs'
                        : 'text-stone-500'
                    }`}
                  >
                    সকল ({users.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('online')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'online'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-500'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>অনলাইন ({onlineCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('google')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'google'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-stone-500'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>গুগল অ্যাকাউন্টস ({googleAccountsCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('offline')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'offline'
                        ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-white shadow-2xs'
                        : 'text-stone-500'
                    }`}
                  >
                    অফলাইন
                  </button>
                </div>
              </div>

              {/* Members Grid */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="group relative p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Avatar, Presence badge & Google tag */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="relative">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="w-12 h-12 rounded-2xl object-cover border border-stone-200 dark:border-stone-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-bold flex items-center justify-center text-lg">
                              {user.displayName.slice(0, 1)}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-stone-900 ${
                              user.isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-stone-400'
                            }`}
                          />
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              user.isOnline
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-stone-200/60 dark:bg-stone-800 text-stone-500'
                            }`}
                          >
                            <Circle className={`w-1.5 h-1.5 fill-current ${user.isOnline ? 'text-emerald-500 animate-pulse' : 'text-stone-400'}`} />
                            <span>{user.isOnline ? 'অনলাইন' : 'অফলাইন'}</span>
                          </span>
                          <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            <span>{formatLastActive(user.lastActive, user.isOnline)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Name & Role & Verified Google Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                          {user.displayName}
                        </h4>
                        {(user.isGoogleVerified || (user.email && user.email.includes('@gmail.com'))) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            <span>গুগল ভেরিফায়েড</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate mb-1">
                        {user.role || (user.isGoogleVerified ? 'গুগল ভেরিফায়েড সদস্য' : 'কমিউনিটি মেম্বার')}
                      </p>
                      
                      {user.email && (
                        <p className="text-[11px] text-stone-400 font-mono truncate mb-1.5">
                          {user.email}
                        </p>
                      )}

                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {user.bio || 'আমাদের উদ্ভাবনী এআই ও গভটেক স্টুডিও ব্যবহারকারী।'}
                      </p>
                    </div>

                    {/* Action buttons: Message, Audio Call, Video Call */}
                    <div className="pt-3 mt-3 border-t border-stone-200/60 dark:border-stone-800/80 flex items-center gap-2">
                      <button
                        onClick={() => startDirectChat(user)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-stone-200/70 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
                        title="মেসেজ পাঠান"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>মেসেজ</span>
                      </button>

                      <button
                        onClick={() => startCall(user.id, user.displayName, user.photoURL, 'audio')}
                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                        title="অডিও কল করুন (রিংটোন সহ)"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => startCall(user.id, user.displayName, user.photoURL, 'video')}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                        title="ভিডিও কল করুন (ক্যামেরা ও মাইক সহ)"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. MESSAGING TAB */}
          {activeTab === 'messages' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Conversation List */}
              <div className="w-full md:w-72 lg:w-80 border-r border-stone-200 dark:border-stone-800 flex flex-col bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
                <div className="p-3 border-b border-stone-200 dark:border-stone-800">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    কথোপকথনের তালিকা
                  </h4>
                  {/* Public Room item */}
                  <button
                    onClick={startPublicRoom}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      activeConversationId === 'community_public'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">সার্বজনীন কমিউনিটি চ্যাটরুম</p>
                      <p className={`text-[10px] truncate ${activeConversationId === 'community_public' ? 'text-emerald-100' : 'text-stone-400'}`}>
                        সকল মেম্বারদের জন্য উন্মুক্ত
                      </p>
                    </div>
                  </button>
                </div>

                {/* Direct Members list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  <p className="text-[11px] font-bold text-stone-400 px-2 pt-2">সরাসরি মেসেজিং (Direct Chat)</p>
                  {users.filter(u => u.id !== currentUser.id).map(user => {
                    const ids = [currentUser.id, user.id].sort();
                    const isSelected = activeConversationId === `direct_${ids[0]}_${ids[1]}`;
                    return (
                      <button
                        key={user.id}
                        onClick={() => startDirectChat(user)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-8 h-8 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-stone-900 ${
                              user.isOnline ? 'bg-emerald-500' : 'bg-stone-400'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold truncate">{user.displayName}</p>
                            {user.isGoogleVerified && <ShieldCheck className="w-3 h-3 text-blue-400 shrink-0" />}
                          </div>
                          <p className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                            {user.role || 'মেম্বার'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Chat History & Input */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-stone-925">
                {/* Active chat header */}
                <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-stone-900/40">
                  <div className="flex items-center gap-3">
                    {activeTargetUser ? (
                      <>
                        <div className="relative">
                          <img
                            src={activeTargetUser.photoURL}
                            alt={activeTargetUser.displayName}
                            className="w-9 h-9 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-stone-900 ${
                              activeTargetUser.isOnline ? 'bg-emerald-500' : 'bg-stone-400'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                              {activeTargetUser.displayName}
                            </h4>
                            {activeTargetUser.isGoogleVerified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" />
                                <span>গুগল</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400">
                            {activeTargetUser.isOnline ? 'অনলাইন' : formatLastActive(activeTargetUser.lastActive, false)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                            সার্বজনীন কমিউনিটি চ্যাটরুম (Public Lounge)
                          </h4>
                          <p className="text-[10px] text-stone-400">
                            প্ল্যাটফর্মের সকল ব্যবহারকারী এখানে দেখতে ও লিখতে পারেন
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Calling buttons in direct chat */}
                  {activeTargetUser && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startCall(activeTargetUser.id, activeTargetUser.displayName, activeTargetUser.photoURL, 'audio')}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-emerald-600 hover:text-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                        title="অডিও কল"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startCall(activeTargetUser.id, activeTargetUser.displayName, activeTargetUser.photoURL, 'video')}
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                        title="ভিডিও কল"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                      <MessageSquare className="w-10 h-10 mb-2 opacity-40 text-emerald-500" />
                      <p className="text-xs font-medium">কথোপকথন শুরু করতে প্রথম মেসেজটি পাঠান!</p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                        {['হ্যালো, কেমন আছেন?', 'আসসালামু আলাইকুম!', 'প্রজেক্ট আপডেট কেমন?', 'কথা বলতে পারেন?'].map((quick) => (
                          <button
                            key={quick}
                            onClick={() => {
                              setMessageText(quick);
                            }}
                            className="px-2.5 py-1 rounded-full text-xs bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                          >
                            {quick}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <img
                            src={msg.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderId}`}
                            alt={msg.senderName}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                            referrerPolicy="no-referrer"
                          />
                          <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400">
                              <span className="font-semibold text-stone-600 dark:text-stone-300">
                                {isMe ? 'আমি' : msg.senderName}
                              </span>
                              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div
                              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                                  : 'bg-stone-100 dark:bg-stone-850 text-stone-800 dark:text-stone-100 rounded-tl-xs'
                              }`}
                            >
                              {msg.type === 'audio' && msg.audioUrl ? (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Mic className="w-3.5 h-3.5" />
                                    <span>ভয়েস মেসেজ</span>
                                  </div>
                                  <audio controls src={msg.audioUrl} className="w-48 h-8 rounded" />
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 flex items-center gap-2"
                >
                  {/* Voice recording toggle */}
                  <button
                    type="button"
                    onClick={isRecordingAudio ? handleStopAudioRecording : handleStartAudioRecording}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                      isRecordingAudio
                        ? 'bg-rose-600 text-white animate-pulse shadow-md'
                        : 'bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-rose-500'
                    }`}
                    title={isRecordingAudio ? 'রেকর্ডিং শেষ করে পাঠান' : 'ভয়েস অডিও রেকর্ড করুন'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      isRecordingAudio
                        ? 'ভয়েস রেকর্ড হচ্ছে... সম্পন্ন করতে মাইকে আবার ক্লিক করুন...'
                        : 'মেসেজ টাইপ করুন (Enter চাপুন)...'
                    }
                    disabled={isRecordingAudio}
                    className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-emerald-500"
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim() || isRecordingAudio}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                      messageText.trim()
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                    }`}
                    title="মেসেজ পাঠান"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. CALLING STUDIO TAB */}
          {activeTab === 'calls' && (
            <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden bg-stone-950 text-white">
              
              {/* Media Error Notification */}
              {mediaError && (
                <div className="mb-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{mediaError}</span>
                  </div>
                  <button onClick={clearMediaError} className="p-1 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {activeCall ? (
                /* IN-CALL VIEW */
                <div className="flex-1 flex flex-col justify-between overflow-hidden relative rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl p-4">
                  
                  {/* Top Call Info Overlay */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={activeCall.receiverPhoto || activeCall.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt="Caller"
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-stone-900 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {activeCall.callerId === currentUser.id ? activeCall.receiverName : activeCall.callerName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-stone-300">
                          <span className="capitalize">{activeCall.type === 'video' ? 'ভিডিও কল' : 'অডিও কল'}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {activeCall.status === 'connected' ? formatDuration(callDuration) : 'রিং হচ্ছে...'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Live Audio Activity Meter */}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-stone-800 text-xs">
                        <Activity className={`w-3.5 h-3.5 ${localAudioLevel > 15 ? 'text-emerald-400 animate-pulse' : 'text-stone-500'}`} />
                        <span className="text-[11px] font-mono text-emerald-300">{localAudioLevel}%</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        WebRTC HD P2P
                      </span>
                    </div>
                  </div>

                  {/* Main Video View / Audio Wave Display */}
                  <div className="flex-1 my-4 relative rounded-xl overflow-hidden bg-black flex items-center justify-center border border-stone-800">
                    {/* Remote Video Stream if video call */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className={`w-full h-full object-cover ${activeCall.type === 'video' && remoteStream ? 'block' : 'hidden'}`}
                    />

                    {/* Remote Placeholder / Audio Waveform if audio call or camera off */}
                    {(!remoteStream || activeCall.type === 'audio') && (
                      <div className="flex flex-col items-center justify-center space-y-4 p-6">
                        <div className="relative">
                          <span className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping" />
                          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-stone-800">
                            {activeCall.callerId === currentUser.id
                              ? (activeCall.receiverName.slice(0, 1) || 'C')
                              : (activeCall.callerName.slice(0, 1) || 'C')}
                          </div>
                        </div>

                        {/* Animated Equalizer Wave Bars reacting to audio level */}
                        <div className="flex items-center gap-1.5 h-9">
                          {[0.3, 0.8, 0.5, 1, 0.6, 0.4, 0.9, 0.2].map((scale, i) => (
                            <span
                              key={i}
                              style={{ 
                                height: `${Math.max(12, Math.min(36, 12 + (localAudioLevel / 100) * 24 * scale))}px`,
                                transition: 'height 0.1s ease-out'
                              }}
                              className="w-1.5 bg-emerald-400 rounded-full"
                            />
                          ))}
                        </div>

                        <p className="text-xs text-stone-300">
                          {activeCall.status === 'connected'
                            ? 'হাই-ডেফিনিশন ভয়েস স্ট্রিমিং সক্রিয়'
                            : 'অন্য প্রান্তে রিংটোন বাজছে, অনুগ্রহ করে অপেক্ষা করুন...'}
                        </p>
                      </div>
                    )}

                    {/* Local PIP Video (Self camera preview) */}
                    <div className="absolute bottom-3 right-3 w-32 sm:w-44 h-24 sm:h-32 rounded-2xl overflow-hidden border-2 border-stone-700 bg-stone-900 shadow-2xl z-20">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                      />
                      {isVideoOff && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-800 text-stone-400 text-[10px]">
                          <VideoOff className="w-5 h-5 mb-1" />
                          <span>ক্যামেরা বন্ধ</span>
                        </div>
                      )}
                      
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-semibold">
                          আমার ক্যামেরা
                        </span>
                      </div>

                      {/* Flip Camera Button on PIP */}
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="absolute bottom-1.5 right-1.5 p-1 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] cursor-pointer"
                        title="ক্যামেরা পরিবর্তন করুন"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Call Action Controls Bar */}
                  <div className="flex items-center justify-center gap-3 sm:gap-4 z-10 pt-2 flex-wrap">
                    {/* Mute Mic */}
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`p-3.5 rounded-full transition-all cursor-pointer ${
                        isMuted ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                      title={isMuted ? 'মাইক্রোফোন চালু করুন' : 'মাইক্রোফোন মিউট করুন'}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    {/* Toggle Video */}
                    <button
                      type="button"
                      onClick={toggleVideo}
                      className={`p-3.5 rounded-full transition-all cursor-pointer ${
                        isVideoOff ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                      title={isVideoOff ? 'ক্যামেরা চালু করুন' : 'ক্যামেরা বন্ধ করুন'}
                    >
                      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>

                    {/* Flip Camera */}
                    <button
                      type="button"
                      onClick={flipCamera}
                      className="p-3.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all cursor-pointer"
                      title="ক্যামেরা ফ্লিপ করুন (সামনে / পেছনে)"
                    >
                      <Camera className="w-5 h-5" />
                    </button>

                    {/* Screen Share */}
                    <button
                      type="button"
                      onClick={toggleScreenShare}
                      className={`p-3.5 rounded-full transition-all cursor-pointer ${
                        isScreenSharing ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                      title="স্ক্রিন শেয়ার / প্রেজেন্টেশন"
                    >
                      <Monitor className="w-5 h-5" />
                    </button>

                    {/* End Call / Hang Up */}
                    <button
                      type="button"
                      onClick={endCall}
                      className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/50 transition-all cursor-pointer flex items-center gap-2"
                      title="কল শেষ করুন"
                    >
                      <PhoneOff className="w-5 h-5" />
                      <span>কল সমাপ্ত</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* IDLE CALLING DASHBOARD */
                <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto space-y-6">
                  
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                      <Video className="w-8 h-8" />
                    </div>

                    <div className="max-w-md space-y-1.5">
                      <h3 className="text-xl font-bold text-white">
                        স্মার্ট অডিও ও ভিডিও কলিং স্টুডিও
                      </h3>
                      <p className="text-xs text-stone-400 leading-relaxed">
                        ওয়েবআরটিসি (WebRTC) ক্রিস্টাল ক্লিয়ার অডিও, এইচডি ভিডিও কলিং, রিংটোন এবং ক্যামেরা-মাইক্রোফোন এ টু জেড নিয়ন্ত্রণ।
                      </p>
                    </div>
                  </div>

                  {/* Device Test & Ringtone Test Control Panel */}
                  <div className="w-full max-w-xl p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>ক্যামেরা ও মাইক্রোফোন ডায়াগনস্টিক টেস্ট</span>
                      </h4>
                      {isTestingMedia ? (
                        <button
                          type="button"
                          onClick={stopMediaTest}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer"
                        >
                          টেস্ট শেষ করুন
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={testMediaDevices}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer"
                        >
                          ক্যামেরা ও মাইক টেস্ট শুরু
                        </button>
                      )}
                    </div>

                    {/* Preview video box if testing */}
                    {isTestingMedia && (
                      <div className="relative rounded-xl overflow-hidden bg-black h-48 border border-stone-700 flex items-center justify-center">
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] text-emerald-400 font-mono">
                          লাইভ ক্যামেরা ও মাইক্রোফোন সক্রিয়
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur text-xs">
                          <span className="text-[11px] text-stone-300">মাইক লেভেল:</span>
                          <div className="flex-1 mx-3 h-2 bg-stone-700 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${localAudioLevel}%` }}
                              className="h-full bg-emerald-400 transition-all duration-75"
                            />
                          </div>
                          <span className="font-mono text-emerald-400 text-xs">{localAudioLevel}%</span>
                        </div>
                      </div>
                    )}

                    {/* Test Ringtone Buttons */}
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-stone-400">রিংটোন ও ইনকামিং কল টেস্ট:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => simulateTestCall('audio')}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold border border-blue-500/30 cursor-pointer flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>অডিও কল টেস্ট</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => simulateTestCall('video')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 cursor-pointer flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>ভিডিও কল টেস্ট</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fast Call Companion Cards */}
                  <div className="w-full max-w-xl space-y-2">
                    <p className="text-xs font-bold text-stone-400 text-left">দ্রুত কল করতে মেম্বার নির্বাচন করুন:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {users.slice(0, 4).map((u) => (
                        <div
                          key={u.id}
                          className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-3 text-left hover:border-emerald-500/40 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{u.displayName}</p>
                              <p className="text-[10px] text-emerald-400 truncate">{u.isOnline ? 'অনলাইন' : 'অফলাইন'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => startCall(u.id, u.displayName, u.photoURL, 'audio')}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-emerald-600 text-stone-300 hover:text-white transition-colors cursor-pointer"
                              title="অডিও কল"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => startCall(u.id, u.displayName, u.photoURL, 'video')}
                              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
                              title="ভিডিও কল"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
