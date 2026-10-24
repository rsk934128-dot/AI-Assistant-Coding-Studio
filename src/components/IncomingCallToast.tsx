import React, { useState } from 'react';
import { Phone, Video, PhoneOff, User as UserIcon, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { CallSession } from '../types/community';
import { ringtone } from '../context/CallContext';

interface IncomingCallToastProps {
  call: CallSession | null;
  onAccept: (call: CallSession, withVideo: boolean) => void;
  onDecline: (callId: string) => void;
}

export const IncomingCallToast: React.FC<IncomingCallToastProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const [isRingtoneMuted, setIsRingtoneMuted] = useState(false);

  if (!call || (call.status !== 'calling' && call.status !== 'ringing')) {
    return null;
  }

  const isVideo = call.type === 'video';

  const toggleRingtoneMute = () => {
    if (isRingtoneMuted) {
      ringtone.startIncomingRingtone();
      setIsRingtoneMuted(false);
    } else {
      ringtone.stopRinging();
      setIsRingtoneMuted(true);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[100] w-[calc(100vw-24px)] max-w-md animate-in slide-in-from-top-6 duration-300">
      <div className="relative overflow-hidden rounded-3xl bg-stone-925/95 text-white p-4 sm:p-5 shadow-2xl border-2 border-emerald-500/50 backdrop-blur-2xl ring-4 ring-emerald-500/20">
        {/* Animated radar pulse background rings */}
        <span className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/25 blur-2xl animate-pulse pointer-events-none" />
        <span className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-blue-500/25 blur-2xl animate-pulse pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3.5">
          {/* Top Row: Caller Info & Status */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                {call.callerPhoto ? (
                  <img
                    src={call.callerPhoto}
                    alt={call.callerName}
                    className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-400 ring-4 ring-emerald-500/30"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-2xl bg-stone-800 flex items-center justify-center border-2 border-emerald-400 ring-4 ring-emerald-500/30 text-emerald-300">
                    <UserIcon className="w-7 h-7" />
                  </div>
                )}
                {/* Ringing Beacon */}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-stone-900" />
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                    {isVideo ? <Video className="w-3 h-3 text-emerald-400" /> : <Phone className="w-3 h-3 text-emerald-400" />}
                    <span>{isVideo ? 'ইনকামিং ভিডিও কল' : 'ইনকামিং অডিও কল'}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>ভেরিফায়েড</span>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate mt-1">
                  {call.callerName}
                </h4>
                <p className="text-xs text-stone-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>রিংটোন বাজছে... রিসিভ করুন</span>
                </p>
              </div>
            </div>

            {/* Mute Ringtone Toggle */}
            <button
              type="button"
              onClick={toggleRingtoneMute}
              className="p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title={isRingtoneMuted ? 'রিংটোন চালু করুন' : 'রিংটোন সাইলেন্ট করুন'}
            >
              {isRingtoneMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          {/* Action Buttons: Accept with Video, Accept with Audio, or Decline */}
          <div className="flex items-center gap-2 pt-1">
            {/* Decline */}
            <button
              id="decline-call-btn"
              type="button"
              onClick={() => {
                ringtone.stopRinging();
                onDecline(call.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              title="কল বাতিল করুন"
            >
              <PhoneOff className="w-4 h-4" />
              <span>বাতিল</span>
            </button>

            {/* Accept Audio Only */}
            {isVideo && (
              <button
                id="accept-call-audio-btn"
                type="button"
                onClick={() => {
                  ringtone.stopRinging();
                  onAccept(call, false);
                }}
                className="py-2.5 px-3 rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-bold text-xs border border-stone-700 transition-all cursor-pointer flex items-center gap-1.5"
                title="শুধু অডিও দিয়ে রিসিভ করুন"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>অডিও</span>
              </button>
            )}

            {/* Accept Video/Audio */}
            <button
              id="accept-call-btn"
              type="button"
              onClick={() => {
                ringtone.stopRinging();
                onAccept(call, isVideo);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs shadow-xl shadow-emerald-600/40 transition-all cursor-pointer animate-pulse"
              title="কল গ্রহণ করুন"
            >
              {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              <span>রিসিভ করুন</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
