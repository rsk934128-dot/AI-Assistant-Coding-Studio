import React, { useState, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  Clock,
  Upload,
  Link as LinkIcon,
  Mic,
  Music,
  Disc3,
  Sliders,
  Download,
  Share2,
  ListMusic,
  Trash2,
  Sparkles,
  Maximize2,
  Minimize2,
  ExternalLink,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useAudioPlayer, AudioTrack, VisualizerMode } from '../context/AudioPlayerContext';
import { AudioVisualizerCanvas } from './AudioVisualizerCanvas';

interface AudioPlayerModalProps {
  onAskAI?: (prompt: string) => void;
  onOpenShareModal?: (config?: { title?: string; text?: string; url?: string; shareType?: 'session' | 'app' | 'message' }) => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  onAskAI,
  onOpenShareModal,
}) => {
  const {
    playlist,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    repeatMode,
    isShuffle,
    sleepTimerMinutes,
    sleepTimerRemaining,
    visualizerMode,
    isModalOpen,
    closePlayer,
    minimizePlayer,
    playTrack,
    playTrackByIndex,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setRepeatMode,
    toggleShuffle,
    setVisualizerMode,
    setSleepTimer,
    addLocalFiles,
    addTrackByUrl,
    playTTSVoice,
    removeTrack,
    clearPlaylist,
  } = useAudioPlayer();

  const [activeTab, setActiveTab] = useState<'player' | 'playlist' | 'add'>('player');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [streamArtist, setStreamArtist] = useState('');
  const [ttsInputText, setTtsInputText] = useState('');
  const [ttsLang, setTtsLang] = useState<'bn' | 'en'>('bn');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isModalOpen) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addLocalFiles(e.target.files);
      setActiveTab('player');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addLocalFiles(e.dataTransfer.files);
      setActiveTab('player');
    }
  };

  const handleAddStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrl.trim()) return;
    addTrackByUrl(streamUrl, streamTitle, streamArtist);
    setStreamUrl('');
    setStreamTitle('');
    setStreamArtist('');
    setActiveTab('player');
  };

  const handlePlayTTS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsInputText.trim()) return;
    playTTSVoice(ttsInputText, ttsLang);
    setActiveTab('player');
  };

  const speeds = [0.75, 1, 1.25, 1.5, 2];
  const sleepOptions = [
    { label: 'বন্ধ', val: null },
    { label: '১৫ মি.', val: 15 },
    { label: '৩০ মি.', val: 30 },
    { label: '৪৫ মি.', val: 45 },
    { label: '৬০ মি.', val: 60 },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closePlayer}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800/80 bg-stone-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>স্মার্ট অডিও প্লেয়ার</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  Audio Studio
                </span>
              </h3>
              <p className="text-[10px] text-stone-400">
                লোকাল ফাইল, অ্যাম্বিয়েন্ট সাউন্ড, স্পিচ ও অনলাইন স্ট্রিম
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Visualizer Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const modes: VisualizerMode[] = ['wave', 'bars', 'circle'];
                const next = modes[(modes.indexOf(visualizerMode) + 1) % modes.length];
                setVisualizerMode(next);
              }}
              className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors"
              title={`ভিজ্যুয়ালাইজার স্টাইল পরিবর্তন (${visualizerMode})`}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Minimize */}
            <button
              type="button"
              onClick={minimizePlayer}
              className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors"
              title="মিনিমাইজ করে নিচে রাখুন"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={closePlayer}
              className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-around px-4 pt-2 border-b border-stone-800/60 bg-stone-950/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'player'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Disc3 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
            <span>প্লেয়ার ও ওয়েভ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('playlist')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'playlist'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>প্লেলিস্ট ({playlist.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>অডিও ফাইল / লিংক</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: PLAYER */}
          {activeTab === 'player' && currentTrack && (
            <div className="space-y-4">
              {/* Artwork & Track Info Card */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-stone-950/70 border border-stone-800/80 shadow-md">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 shadow-lg bg-stone-850 group">
                  {currentTrack.artwork ? (
                    <img
                      src={currentTrack.artwork}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-900 to-indigo-950 text-cyan-300">
                      <Music className={`w-10 h-10 ${isPlaying ? 'animate-bounce' : ''}`} />
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                      <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {currentTrack.category === 'ambient'
                        ? 'প্রাকৃতিক অ্যাম্বিয়েন্ট'
                        : currentTrack.category === 'local'
                        ? 'ডিভাইসের লোকাল ফাইল'
                        : currentTrack.category === 'tts'
                        ? 'AI ভয়েস স্পিচ'
                        : 'অনলাইন স্ট্রিম'}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-bold text-white truncate">
                    {currentTrack.title}
                  </h4>
                  <p className="text-xs text-stone-400 truncate">
                    {currentTrack.artist}
                  </p>
                  {currentTrack.album && (
                    <p className="text-[11px] text-stone-500 truncate">
                      {currentTrack.album}
                    </p>
                  )}
                </div>

                {/* Direct Audio Tools */}
                <div className="flex items-center gap-1.5 shrink-0 self-center sm:self-start">
                  {onAskAI && (
                    <button
                      type="button"
                      onClick={() => onAskAI(`"${currentTrack.title}" অডিও বা মিউজিক সম্পর্কে বিস্তারিত জানতে চাই এবং এর প্রভাব কী?`)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors"
                      title="এই গান/সাউন্ড সম্পর্কে AI-কে প্রশ্ন করুন"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                    </button>
                  )}

                  {onOpenShareModal && (
                    <button
                      type="button"
                      onClick={() => onOpenShareModal({
                        title: currentTrack.title,
                        text: `আমি AI Studio Audio Player এ "${currentTrack.title}" শুনছি।`,
                        shareType: 'app',
                      })}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors"
                      title="অডিও শেয়ার করুন"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}

                  <a
                    href={currentTrack.src}
                    download={`${currentTrack.title}.mp3`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors"
                    title="অডিও ডাউনলোড করুন"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Real-Time Live Visualizer */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1 text-[11px] text-stone-400">
                  <span>অ্যাকোস্টিক ওয়েভফর্ম ({visualizerMode})</span>
                  <span>{isPlaying ? 'লাইভ ফ্রিকোয়েন্সি সক্রিয়' : 'অডিও পজড'}</span>
                </div>
                <AudioVisualizerCanvas mode={visualizerMode} height={120} />
              </div>

              {/* Progress / Seek Bar */}
              <div className="space-y-1 px-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Player Controls */}
              <div className="flex items-center justify-center gap-3 sm:gap-5 py-2">
                {/* Shuffle */}
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                    isShuffle ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/60' : 'text-stone-400 hover:text-white bg-stone-800/60'
                  }`}
                  title={isShuffle ? 'শাফল অন' : 'শাফল অফ'}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Previous */}
                <button
                  type="button"
                  onClick={previousTrack}
                  className="p-2.5 rounded-xl text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-750 transition-colors cursor-pointer"
                  title="পূর্ববর্তী ট্র্যাক"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                {/* -10s */}
                <button
                  type="button"
                  onClick={() => seekRelative(-10)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-200 transition-colors"
                  title="১০ সেকেন্ড পেছনে যান"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Big Play/Pause Button */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-rose-500 hover:brightness-110 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-all cursor-pointer ring-4 ring-stone-800"
                  title={isPlaying ? 'পজ করুন' : 'প্লে করুন'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* +10s */}
                <button
                  type="button"
                  onClick={() => seekRelative(10)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-200 transition-colors"
                  title="১০ সেকেন্ড সামনে যান"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Next */}
                <button
                  type="button"
                  onClick={nextTrack}
                  className="p-2.5 rounded-xl text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-750 transition-colors cursor-pointer"
                  title="পরবর্তী ট্র্যাক"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>

                {/* Repeat */}
                <button
                  type="button"
                  onClick={() => {
                    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
                    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
                    setRepeatMode(next);
                  }}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                    repeatMode !== 'off' ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/60' : 'text-stone-400 hover:text-white bg-stone-800/60'
                  }`}
                  title={`রিপিট মোড: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume & Speed Controls Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                {/* Volume Slider */}
                <div className="flex items-center gap-2.5 w-full sm:w-48">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-stone-400 hover:text-white transition-colors"
                    title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] font-mono text-stone-500 w-8 text-right">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>

                {/* Playback Speed Pill */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-500 mr-1 font-semibold">গতি:</span>
                  {speeds.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setPlaybackRate(rate)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                        playbackRate === rate
                          ? 'bg-cyan-500 text-stone-950 shadow-xs'
                          : 'bg-stone-850 hover:bg-stone-800 text-stone-400'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Sleep Timer */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-[10px] text-stone-500 font-semibold">স্লিপ:</span>
                  <div className="flex items-center gap-1">
                    {sleepOptions.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setSleepTimer(opt.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                          sleepTimerMinutes === opt.val
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-stone-850 hover:bg-stone-800 text-stone-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Sleep Timer Countdown Banner if set */}
              {sleepTimerRemaining !== null && sleepTimerRemaining > 0 && (
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span>স্লিপ টাইমার চালু আছে: {Math.ceil(sleepTimerRemaining / 60)} মিনিট পর অডিও নিজে থেকেই বন্ধ হবে</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSleepTimer(null)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-200 underline"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLAYLIST QUEUE */}
          {activeTab === 'playlist' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-stone-300">
                  মোট {playlist.length}টি অডিও ট্র্যাক
                </span>
                <button
                  type="button"
                  onClick={clearPlaylist}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>ডিফল্ট ট্র্যাকে রিসেট করুন</span>
                </button>
              </div>

              <div className="divide-y divide-stone-800/60 rounded-2xl bg-stone-950/60 border border-stone-800 overflow-hidden">
                {playlist.map((track, idx) => {
                  const isCurrent = idx === currentTrackIndex;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playTrackByIndex(idx);
                        setActiveTab('player');
                      }}
                      className={`flex items-center justify-between p-3 gap-3 hover:bg-stone-850/70 transition-colors cursor-pointer group ${
                        isCurrent ? 'bg-cyan-950/40 border-l-4 border-cyan-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-stone-500 w-5 text-right">
                          {idx + 1}
                        </span>
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-stone-800 shrink-0">
                          {track.artwork ? (
                            <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <Music className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isCurrent ? 'text-cyan-300' : 'text-stone-200'}`}>
                            {track.title}
                          </p>
                          <p className="text-[11px] text-stone-400 truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCurrent && isPlaying ? (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-cyan-400 animate-pulse" />
                            <span className="w-1 h-4 bg-cyan-400 animate-pulse delay-75" />
                            <span className="w-1 h-2 bg-cyan-400 animate-pulse delay-150" />
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTrack(track.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-stone-750 text-stone-400 hover:text-rose-400 transition-all"
                          title="প্লেলিস্ট থেকে সরান"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ADD AUDIO & STREAM */}
          {activeTab === 'add' && (
            <div className="space-y-5">
              {/* Local File Upload Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                    : 'border-stone-750 hover:border-cyan-500/60 bg-stone-950/60 text-stone-400 hover:text-stone-200'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="audio/*"
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-cyan-400 animate-bounce" />
                <h5 className="text-sm font-bold text-white mb-1">
                  কম্পিউটার বা ফোন থেকে অডিও ফাইল যুক্ত করুন
                </h5>
                <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
                  MP3, WAV, OGG, AAC, M4A, FLAC ফাইল টেনে এনে এখানে ছেড়ে দিন অথবা ব্রাউজ করতে ক্লিক করুন।
                </p>
              </div>

              {/* Online Audio Stream URL */}
              <form onSubmit={handleAddStream} className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3">
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>অনলাইন অডিও লিংক বা রেডিও স্ট্রিম চালান</span>
                </h5>
                <div className="space-y-2">
                  <input
                    type="url"
                    required
                    placeholder="অডিও URL দিন (যেমন: https://example.com/audio.mp3)"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-600 focus:outline-hidden focus:border-cyan-500"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="ট্র্যাকের নাম (ঐচ্ছিক)"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-600 focus:outline-hidden focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="শিল্পী বা সোর্সের নাম (ঐচ্ছিক)"
                      value={streamArtist}
                      onChange={(e) => setStreamArtist(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-600 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>স্ট্রিম শুরু করুন ও প্লেলিস্টে যোগ করুন</span>
                </button>
              </form>

              {/* Text-to-Speech (TTS) Voice Player */}
              <form onSubmit={handlePlayTTS} className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-rose-400" />
                    <span>বাংলা ও ইংরেজি টেক্সট-টু-স্পিচ (TTS Voice)</span>
                  </h5>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTtsLang('bn')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        ttsLang === 'bn' ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      বাংলা
                    </button>
                    <button
                      type="button"
                      onClick={() => setTtsLang('en')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        ttsLang === 'en' ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="যেকোনো বাক্য বা লেখা লিখুন যা স্পষ্ট মানব কণ্ঠে শুনতে চান..."
                  value={ttsInputText}
                  onChange={(e) => setTtsInputText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-600 focus:outline-hidden focus:border-rose-500 resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>কণ্ঠে রূপান্তর করে শুনুন</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
