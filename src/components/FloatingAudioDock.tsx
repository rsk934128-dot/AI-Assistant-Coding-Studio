import React from 'react';
import { Play, Pause, SkipForward, Maximize2, X, Music, Volume2, VolumeX } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export const FloatingAudioDock: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    nextTrack,
    currentTime,
    duration,
    isModalOpen,
    openPlayer,
    expandPlayer,
    isMinimized,
    minimizePlayer,
    isMuted,
    toggleMute,
    seek,
  } = useAudioPlayer();

  // Show if explicitly minimized OR if playing while the main modal is closed
  const shouldShow = (isMinimized || (isPlaying && !isModalOpen)) && currentTrack;

  if (!shouldShow || !currentTrack) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleOpenFull = () => {
    expandPlayer();
  };

  const handleDismiss = () => {
    // If minimized, we can close the dock view
    openPlayer();
  };

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-84 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-purple-950/40 p-3 text-white transition-all transform animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ isolation: 'isolate' }}
    >
      {/* Mini Progress Bar */}
      <div
        className="w-full h-1 bg-slate-800 rounded-full mb-2.5 overflow-hidden cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = clickX / rect.width;
          if (duration > 0) {
            seek(ratio * duration);
          }
        }}
        title="ক্লিক করে ট্র্যাক সিক করুন"
      >
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Vinyl / Cover Art with spinning animation when playing */}
        <button
          onClick={handleOpenFull}
          className="relative group flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden ring-2 ring-purple-500/40 hover:ring-purple-400 transition shadow-md cursor-pointer"
          title="সম্পূর্ণ অডিও স্টুডিও খুলুন"
        >
          {currentTrack.artwork ? (
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '8s' }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition">
            <Maximize2 className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition" />
          </div>
        </button>

        {/* Track Title & Artist */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleOpenFull}>
          <div className="flex items-center gap-1.5">
            {isPlaying && (
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
            <h4 className="text-xs font-semibold text-slate-100 truncate hover:text-purple-300 transition">
              {currentTrack.title}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {currentTrack.artist}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleMute}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title={isMuted ? 'আনমিউট' : 'মিউট'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-600/30 transition transform active:scale-95 cursor-pointer"
            title={isPlaying ? 'পজ' : 'প্লে'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={nextTrack}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="পরবর্তী ট্র্যাক"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenFull}
            className="p-1.5 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-purple-950/40 transition cursor-pointer"
            title="স্টুডিও ফুলস্ক্রিন"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition ml-0.5 cursor-pointer"
            title="ফুলস্ক্রিন খুলুন বা বন্ধ করুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
