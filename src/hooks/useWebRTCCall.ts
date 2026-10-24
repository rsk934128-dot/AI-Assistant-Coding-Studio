import { useState, useEffect, useRef, useCallback } from 'react';
import { CallSession, CallType } from '../types/community';
import { 
  initiateCallSession, 
  updateCallSessionState, 
  subscribeToCallSignals,
  sendIceCandidate,
  subscribeToIceCandidates,
  getLocalUserProfile
} from '../lib/communityService';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Web Audio Ringtone Generator (no external audio assets required)
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

  // Receiver: Vibrant musical marimba incoming ringtone
  startIncomingRingtone() {
    this.stopRinging();
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

export function useWebRTCCall() {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationTimerRef = useRef<any>(null);

  // Stop ringtone and timer helper
  const cleanUpCallResources = useCallback(() => {
    ringtone.stopRinging();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
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
  }, [localStream, remoteStream]);

  // Handle call duration counting when status is connected
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

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start outgoing call
  const startCall = async (
    targetUserId: string,
    targetUserName: string,
    targetUserPhoto: string | undefined,
    type: CallType
  ) => {
    cleanUpCallResources();
    const myProfile = getLocalUserProfile();

    // Acquire local media stream
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);
    } catch (err) {
      console.warn('Could not access requested media devices:', err);
      // Fallback to audio only if video failed
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
      } catch (audioErr) {
        console.warn('Microphone permission not granted:', audioErr);
      }
    }

    // Create call session
    const callSession = await initiateCallSession({
      callerId: myProfile.id,
      callerName: myProfile.displayName,
      callerPhoto: myProfile.photoURL,
      receiverId: targetUserId,
      receiverName: targetUserName,
      receiverPhoto: targetUserPhoto,
      type,
    });

    setActiveCall(callSession);

    // If calling a team companion or demo contact, trigger simulated answer
    if (targetUserId.startsWith('team_')) {
      setTimeout(() => {
        ringtone.stopRinging();
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));

        // Create mock remote audio stream if supported
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            osc.connect(dst);
            osc.start();
            setRemoteStream(dst.stream);
          }
        } catch {}
      }, 2500);
      return;
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
  };

  // Accept incoming call
  const acceptCall = async (incomingCall: CallSession, withVideo = true) => {
    cleanUpCallResources();
    ringtone.stopRinging();

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo && incomingCall.type === 'video',
      });
      setLocalStream(stream);
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
      } catch {}
    }

    setActiveCall({ ...incomingCall, status: 'connected' });
    await updateCallSessionState(incomingCall.id, { status: 'connected' });

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
          sendIceCandidate(incomingCall.id, event.candidate.toJSON(), 'receiver');
        }
      };

      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateCallSessionState(incomingCall.id, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected',
        });
      }

      subscribeToIceCandidates(incomingCall.id, 'caller', (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });

      subscribeToCallSignals(incomingCall.id, (updated) => {
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

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: true,
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

  return {
    activeCall,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isSpeakerOn,
    callDuration,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    setIsSpeakerOn,
  };
}
