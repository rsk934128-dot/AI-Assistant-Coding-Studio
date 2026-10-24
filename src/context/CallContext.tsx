import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CallSession, CallType } from '../types/community';
import {
  initiateCallSession,
  updateCallSessionState,
  subscribeToCallSignals,
  subscribeToIncomingCalls,
  sendIceCandidate,
  subscribeToIceCandidates,
  getLocalUserProfile
} from '../lib/communityService';
import { useAuth } from './AuthContext';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// High-fidelity Web Audio Synthesizer for Outgoing and Incoming Ringtones
export class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;

  private initCtx() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Caller: Outgoing ringing tone (periodic 440Hz + 480Hz PBX pulse)
  startOutgoingTone() {
    this.stopRinging();
    try {
      this.initCtx();
      const playTone = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.25);
        osc2.stop(now + 1.25);
      };

      playTone();
      this.intervalId = setInterval(playTone, 2800);
    } catch {}
  }

  // Receiver: Vibrant musical marimba incoming ringtone with vibration
  startIncomingRingtone() {
    this.stopRinging();
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([400, 200, 400, 200, 600]);
      }
    } catch {}

    try {
      this.initCtx();
      const playPhrase = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        const notes = [
          { f: 587.33, t: 0.0 },   // D5
          { f: 659.25, t: 0.12 },  // E5
          { f: 783.99, t: 0.24 },  // G5
          { f: 880.00, t: 0.36 },  // A5
          { f: 1046.50, t: 0.52 }, // C6
          { f: 880.00, t: 0.72 },  // A5
        ];

        notes.forEach(({ f, t }) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0.001, now + t);
          gain.gain.linearRampToValueAtTime(0.14, now + t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.28);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + 0.3);
        });
      };

      playPhrase();
      this.intervalId = setInterval(playPhrase, 2200);
    } catch {}
  }

  stopRinging() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

export const ringtone = new RingtonePlayer();

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  facingMode: 'user' | 'environment';
  callDuration: number;
  localAudioLevel: number;
  mediaError: string | null;
  clearMediaError: () => void;
  startCall: (targetUserId: string, targetUserName: string, targetUserPhoto?: string, type?: CallType) => Promise<CallSession | null>;
  acceptCall: (call: CallSession, withVideo?: boolean) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  flipCamera: () => Promise<void>;
  testMediaDevices: () => Promise<void>;
  stopMediaTest: () => void;
  isTestingMedia: boolean;
  simulateTestCall: (type?: CallType) => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isTestingMedia, setIsTestingMedia] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Auto unlock Web Audio context on user interaction
  useEffect(() => {
    const unlockAudio = () => {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const temp = new AudioCtx();
        temp.resume().then(() => temp.close()).catch(() => {});
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Cleanup helper
  const cleanUpCallResources = useCallback(() => {
    ringtone.stopRinging();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setCallDuration(0);
    setLocalAudioLevel(0);
  }, [localStream, remoteStream]);

  // Real-time microphone audio frequency visualizer loop
  useEffect(() => {
    if (!localStream) {
      setLocalAudioLevel(0);
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      setLocalAudioLevel(0);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setLocalAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {}

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, [localStream, isMuted]);

  // Attach local stream to video ref
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Attach remote stream to video ref
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Handle call status changes & ringtones
  useEffect(() => {
    if (activeCall?.status === 'connected') {
      ringtone.stopRinging();
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (activeCall?.status === 'calling') {
      ringtone.startOutgoingTone();
    } else if (activeCall?.status === 'ringing') {
      ringtone.startIncomingRingtone();
    } else if (activeCall?.status === 'ended' || activeCall?.status === 'declined') {
      cleanUpCallResources();
      const timer = setTimeout(() => {
        setActiveCall(null);
      }, 1200);
      return () => clearTimeout(timer);
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [activeCall?.status, cleanUpCallResources]);

  // Global listener for incoming WebRTC audio/video calls
  useEffect(() => {
    const profile = getLocalUserProfile();
    const currentId = user?.uid || profile.id;

    const unsubscribe = subscribeToIncomingCalls(currentId, (call) => {
      setIncomingCall(call);
      if (call && (call.status === 'calling' || call.status === 'ringing')) {
        ringtone.startIncomingRingtone();
      } else {
        ringtone.stopRinging();
      }
    });

    return () => {
      unsubscribe();
      ringtone.stopRinging();
    };
  }, [user]);

  // Start outgoing call
  const startCall = async (
    targetUserId: string,
    targetUserName: string,
    targetUserPhoto?: string,
    type: CallType = 'video'
  ): Promise<CallSession | null> => {
    cleanUpCallResources();
    setMediaError(null);
    const myProfile = getLocalUserProfile();

    // Acquire local media stream
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode } : false,
      });
      setLocalStream(stream);
    } catch (err: any) {
      console.warn('Could not access requested camera/mic:', err);
      try {
        // Fallback to audio only
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setIsVideoOff(true);
      } catch (audioErr: any) {
        setMediaError('ক্যামেরা অথবা মাইক্রোফোনের অনুমতি প্রদান করুন। ব্রাউজারের অনুমতি সেটিংস চেক করুন।');
      }
    }

    // Create call session
    const callSession = await initiateCallSession({
      callerId: user?.uid || myProfile.id,
      callerName: user?.displayName || myProfile.displayName,
      callerPhoto: user?.photoURL || myProfile.photoURL,
      receiverId: targetUserId,
      receiverName: targetUserName,
      receiverPhoto: targetUserPhoto,
      type,
    });

    setActiveCall(callSession);

    // If calling a demo companion or team contact, simulate an intelligent response with tone & video
    if (targetUserId.startsWith('team_')) {
      setTimeout(() => {
        ringtone.stopRinging();
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));

        // Create remote mock stream if audio context is available
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.connect(dst);
            osc.start();
            setRemoteStream(dst.stream);
          }
        } catch {}
      }, 3000);
      return callSession;
    }

    // Set up WebRTC Peer Connection
    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate(callSession.id, event.candidate.toJSON(), 'caller');
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await updateCallSessionState(callSession.id, {
        offer: { type: offer.type, sdp: offer.sdp },
      });

      // Listen for answer
      const unsubscribe = subscribeToCallSignals(callSession.id, async (updated) => {
        if (updated?.status === 'accepted' || updated?.status === 'connected') {
          if (updated.answer && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(updated.answer));
            setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
          }
        } else if (updated?.status === 'declined' || updated?.status === 'ended') {
          setActiveCall((prev) => (prev ? { ...prev, status: updated.status } : null));
          cleanUpCallResources();
          unsubscribe();
        }
      });

      subscribeToIceCandidates(callSession.id, 'receiver', (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });
    } catch (err) {
      console.warn('WebRTC peer connection setup warning:', err);
    }

    return callSession;
  };

  // Accept incoming call
  const acceptCall = async (incoming: CallSession, withVideo = true) => {
    cleanUpCallResources();
    ringtone.stopRinging();
    setIncomingCall(null);
    setMediaError(null);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo && incoming.type === 'video' ? { facingMode } : false,
      });
      setLocalStream(stream);
    } catch (err) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setIsVideoOff(true);
      } catch (audioErr) {
        setMediaError('মাইক্রোফোন ও ক্যামেরার অনুমতি নিশ্চিত করুন।');
      }
    }

    setActiveCall({ ...incoming, status: 'connected' });
    await updateCallSessionState(incoming.id, { status: 'connected' });

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate(incoming.id, event.candidate.toJSON(), 'receiver');
        }
      };

      if (incoming.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateCallSessionState(incoming.id, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected',
        });
      }

      subscribeToIceCandidates(incoming.id, 'caller', (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });

      subscribeToCallSignals(incoming.id, (updated) => {
        if (updated?.status === 'ended') {
          setActiveCall((prev) => (prev ? { ...prev, status: 'ended' } : null));
          cleanUpCallResources();
        }
      });
    } catch (err) {
      console.warn('Peer connection error on accepting call:', err);
    }
  };

  // Reject / Decline call
  const declineCall = async (callId: string) => {
    ringtone.stopRinging();
    cleanUpCallResources();
    setIncomingCall(null);
    await updateCallSessionState(callId, { status: 'declined', endedAt: Date.now() });
    setActiveCall(null);
  };

  // End active call
  const endCall = async () => {
    ringtone.stopRinging();
    if (activeCall) {
      await updateCallSessionState(activeCall.id, {
        status: 'ended',
        endedAt: Date.now(),
        duration: callDuration,
      });
    }
    cleanUpCallResources();
    setActiveCall(null);
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Flip Camera (Front / Rear) for mobile
  const flipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    if (localStream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: true,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack);
        }
        localStream.getVideoTracks().forEach((t) => t.stop());
        setLocalStream(newStream);
      } catch (e) {
        console.warn('Camera flip error:', e);
      }
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
        const camTrack = camStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        }
        setLocalStream(camStream);
        setIsScreenSharing(false);
      } catch {}
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
        };

        setLocalStream(screenStream);
        setIsScreenSharing(true);
      } catch {
        console.warn('Screen share canceled or failed');
      }
    }
  };

  // Media preview and testing helper
  const testMediaDevices = async () => {
    setIsTestingMedia(true);
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
    } catch (err: any) {
      setMediaError('ক্যামেরা বা মাইক্রোফোন সংযোগে সমস্যা: ' + (err.message || 'অনুমতি মেলেনি'));
    }
  };

  const stopMediaTest = () => {
    setIsTestingMedia(false);
    if (!activeCall) {
      cleanUpCallResources();
    }
  };

  // Simulate an incoming call for instant zero-friction testing
  const simulateTestCall = (type: CallType = 'video') => {
    ringtone.stopRinging();
    const mockCall: CallSession = {
      id: `test_call_${Date.now()}`,
      callerId: 'team_founder_farid',
      callerName: 'শেখ ফরিদ (Founder & Lead)',
      callerPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      receiverId: user?.uid || getLocalUserProfile().id,
      receiverName: user?.displayName || getLocalUserProfile().displayName,
      receiverPhoto: user?.photoURL || getLocalUserProfile().photoURL,
      type,
      status: 'ringing',
      createdAt: Date.now(),
    };
    setIncomingCall(mockCall);
    ringtone.startIncomingRingtone();
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
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
        clearMediaError: () => setMediaError(null),
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        flipCamera,
        testMediaDevices,
        stopMediaTest,
        isTestingMedia,
        simulateTestCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
