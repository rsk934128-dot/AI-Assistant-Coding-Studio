import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  ExternalLink,
  Music,
  Youtube,
  Disc3,
  Sparkles,
  Share2,
  Copy,
  Check,
  AlertCircle,
  Play,
  RotateCcw,
  Search,
  Radio,
  RefreshCw,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { extractYouTubeVideoId } from '../utils/youtube';

interface MusicPlayerModalProps {
  onAskAIAboutSong?: (prompt: string) => void;
  onOpenShareModal?: (config?: { title?: string; text?: string; url?: string; sessionId?: string; shareType?: 'session' | 'app' | 'message' }) => void;
}

export const MusicPlayerModal: React.FC<MusicPlayerModalProps> = ({
  onAskAIAboutSong,
  onOpenShareModal,
}) => {
  const {
    currentTrack,
    isOpen,
    isMinimized,
    isStreaming,
    playVideoId,
    closePlayer,
    minimizePlayer,
    expandPlayer,
  } = useMusicPlayer();

  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useNoCookie, setUseNoCookie] = useState(false);
  const [key, setKey] = useState(0); // To allow manual reload/replay
  const [inputLinkOrId, setInputLinkOrId] = useState('');
  const [alternativeVideos, setAlternativeVideos] = useState<Array<{ videoId: string; title: string; author: string; url: string; thumbnail: string }>>([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePlayNewInput = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputLinkOrId.trim();
    if (!val) return;

    const detectedId = extractYouTubeVideoId(val);
    if (detectedId) {
      playVideoId(detectedId, 'ইউটিউব মিউজিক স্ট্রিম', { autoPlay: true });
      setInputLinkOrId('');
      setAlternativeVideos([]);
      return;
    }

    // It's a song/music search term: search YouTube directly for verified real links!
    setIsLoadingAlternatives(true);
    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: val }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos) && data.videos.length > 0) {
          setAlternativeVideos(data.videos);
          // Play the top real video found!
          const top = data.videos[0];
          playVideoId(top.videoId, top.title, { autoPlay: true, searchQuery: val });
        } else {
          playVideoId(val, val, { autoPlay: true, searchQuery: val });
        }
      }
    } catch {
      playVideoId(val, val, { autoPlay: true, searchQuery: val });
    } finally {
      setIsLoadingAlternatives(false);
      setInputLinkOrId('');
    }
  };

  // Sync fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isOpen || !currentTrack) return null;

  const { videoId, title, originalUrl, searchQuery } = currentTrack;
  const cleanTitle = title || searchQuery || 'গান / মিউজিক';
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}`;
  const ytMusicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(cleanTitle)}`;
  const watchUrl = originalUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ytSearchUrl);

  const host = useNoCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';

  // Clean YouTube embed URL without broken originParam/enablejsapi that causes cross-origin Playback ID errors in sandboxed iframes
  const embedUrl = videoId
    ? `https://${host}/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : `https://${host}/embed?listType=search&list=${encodeURIComponent(cleanTitle)}&autoplay=1&playsinline=1`;

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(watchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (onOpenShareModal) {
      onOpenShareModal({
        title: `ইউটিউব মিউজিক: ${cleanTitle}`,
        text: `এই চমৎকার গানটি শুনুন: "${cleanTitle}" — আমাদের এআই অ্যাসিস্ট্যান্ট মিউজিক প্লেয়ারে শুনুন।`,
        url: watchUrl,
        shareType: 'app',
      });
    } else {
      handleCopyLink();
    }
  };

  const handleAskAI = () => {
    if (onAskAIAboutSong) {
      minimizePlayer();
      onAskAIAboutSong(
        `"${cleanTitle}" এই গানটির লিরিক্স (কথা), গানের অর্থ ও শিল্পী সম্পর্কে বিস্তারিত বুঝিয়ে দিন।`
      );
    }
  };

  const handleFindAlternative = async () => {
    setIsLoadingAlternatives(true);
    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos) && data.videos.length > 0) {
          const filtered = data.videos.filter((v: any) => v.videoId !== videoId);
          setAlternativeVideos(filtered.length > 0 ? filtered : data.videos);
        }
      }
    } catch (e) {
      console.warn('Alternative search error:', e);
    } finally {
      setIsLoadingAlternatives(false);
    }
  };

  return (
    <div
      ref={containerRef}
      id="in-app-music-streaming-player"
      className={
        isMinimized
          ? 'fixed bottom-4 right-4 z-50 w-[340px] sm:w-[380px] bg-stone-950/95 text-stone-100 border border-red-500/50 rounded-2xl shadow-2xl backdrop-blur-xl p-3 flex flex-col gap-2.5 transition-all duration-300 animate-in slide-in-from-bottom-5'
          : 'fixed inset-0 z-50 flex flex-col bg-stone-950/98 text-stone-100 backdrop-blur-2xl overflow-y-auto antialiased animate-in fade-in duration-200'
      }
    >
      {/* Glow backdrop elements (Fullscreen mode only) */}
      {!isMinimized && (
        <>
          <div className="pointer-events-none fixed -top-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
          <div className="pointer-events-none fixed -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
        </>
      )}

      {/* TOP HEADER BAR */}
      {isMinimized ? (
        /* Minimized Header */
        <div className="flex items-center justify-between gap-2 border-b border-stone-850 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-red-600 text-white shrink-0 animate-pulse">
              <Radio className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{cleanTitle}</h4>
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                অটো-স্ট্রিমিং • ব্যাকগ্রাউন্ড মোড
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white transition-colors cursor-pointer"
              title="YouTube অ্যাপে চালান"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={expandPlayer}
              className="p-1.5 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="ফুলস্ক্রিন প্লেয়ারে ফেরত যান"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closePlayer}
              className="p-1.5 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="চ্যাটে ফিরে যান (Back)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closePlayer}
              className="p-1.5 rounded-lg bg-stone-850 hover:bg-rose-950/80 text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="প্লেয়ার বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Fullscreen Header */
        <header className="relative z-10 px-4 sm:px-6 py-3.5 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={closePlayer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-200 text-xs font-semibold border border-stone-750 transition-all cursor-pointer shadow-xs shrink-0"
              title="চ্যাটে ফিরে যান (Back)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ফিরে যান</span>
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
              <Youtube className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  অটো-স্ট্রিমিং ফুলস্ক্রিন প্লেয়ার
                </span>
                <span className="hidden sm:inline text-xs text-stone-400 font-medium">
                  • ব্যাকগ্রাউন্ড প্লেব্যাক সক্ষম
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                {cleanTitle}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setUseNoCookie((v) => !v)}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer border border-stone-800 text-xs hidden md:flex items-center gap-1"
              title="বিকল্প নো-কুকি সার্ভার বা স্ট্যান্ডার্ড সার্ভারে পরিবর্তন করুন"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[11px]">{useNoCookie ? 'No-Cookie' : 'Standard'}</span>
            </button>

            <button
              onClick={() => setKey((k) => k + 1)}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-800 text-xs hidden sm:flex items-center gap-1"
              title="ভিডিও রিফ্রেশ / পুনরায় শুরু করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Replay</span>
            </button>

            <button
              onClick={minimizePlayer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-stone-800 hover:border-emerald-500/40 transition-colors cursor-pointer"
              title="মিনিমাইজ করুন (গান ব্যাকগ্রাউন্ডে অবিরাম চলবে)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ব্যাকগ্রাউন্ড মোড</span>
            </button>

            <button
              onClick={toggleBrowserFullscreen}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 transition-colors cursor-pointer border border-stone-800"
              title={isBrowserFullscreen ? 'ফুলস্ক্রিন থেকে বের হন' : 'সম্পূর্ণ স্ক্রিন করুন'}
            >
              {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={closePlayer}
              className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950/80 text-stone-300 hover:text-rose-400 transition-colors cursor-pointer border border-stone-800"
              title="প্লেয়ার বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* CORE PERSISTENT IFRAME PLAYER */}
      <div className={isMinimized ? 'w-full' : 'relative z-10 flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center gap-4'}>
        
        {/* Fullscreen Search / Input Bar (Fullscreen mode only) */}
        {!isMinimized && (
          <form
            onSubmit={handlePlayNewInput}
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-lg"
          >
            <div className="pl-3 text-red-500 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputLinkOrId}
              onChange={(e) => setInputLinkOrId(e.target.value)}
              placeholder="যেকোনো ইউটিউব ভিডিওর আইডি (যেমন dQw4w9WgXcQ) বা লিঙ্ক পেস্ট করুন..."
              className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-0 px-2"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer shrink-0"
            >
              অটো স্ট্রিম
            </button>
          </form>
        )}

        {/* Video Player Box */}
        <div
          className={
            isMinimized
              ? 'relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-stone-800 shadow-md'
              : 'relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-red-950/40 border border-stone-800 bg-black group'
          }
        >
          <iframe
            key={`stream-${key}-${useNoCookie ? 'nocookie' : 'standard'}-${videoId || 'search'}`}
            src={embedUrl}
            title={cleanTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0"
          />
        </div>

        {/* Playback Error Instant Recovery Banner (Fullscreen mode) */}
        {!isMinimized && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="truncate sm:whitespace-normal">
                <strong>প্লেব্যাকে এরর বা "Playback ID" সমস্যা দেখা দিলে:</strong> কিছু মিউজিক কোম্পানি অন্য ওয়েবসাইটে প্লেব্যাক ব্লক করে রাখে।
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setUseNoCookie((v) => !v)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 transition-colors cursor-pointer text-[11px] font-medium"
              >
                🔄 সার্ভার পরিবর্তন ({useNoCookie ? 'নো-কুকি' : 'স্ট্যান্ডার্ড'})
              </button>
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-[11px] shadow-sm transition-all"
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>সরাসরি YouTube এ চালান (100% গ্যারান্টি)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={handleFindAlternative}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium cursor-pointer"
              >
                {isLoadingAlternatives ? 'খোঁজা হচ্ছে...' : 'বিকল্প অডিও খুঁজুন'}
              </button>
            </div>
          </div>
        )}

        {/* Verified YouTube Alternatives & Search Results Grid */}
        {!isMinimized && (isLoadingAlternatives || alternativeVideos.length > 0) && (
          <div className="p-4 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  ইউটিউব থেকে আসল ও বিকল্প ভিডিও/গানসমূহ:
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAlternativeVideos([])}
                className="text-stone-400 hover:text-white text-xs cursor-pointer"
              >
                লুকান
              </button>
            </div>

            {isLoadingAlternatives ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-stone-400">ইউটিউব থেকে আসল লিংক সংগ্রহ করা হচ্ছে...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {alternativeVideos.map((alt) => (
                  <div
                    key={alt.videoId}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-950/80 hover:bg-stone-850 border border-stone-800/80 transition-all group"
                  >
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-black shrink-0">
                      <img
                        src={alt.thumbnail}
                        alt={alt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${alt.videoId}/0.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h5 className="text-xs font-semibold text-white truncate leading-tight" title={alt.title}>
                        {alt.title}
                      </h5>
                      <p className="text-[10px] text-stone-400 truncate">
                        {alt.author}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            playVideoId(alt.videoId, alt.title, { autoPlay: true });
                          }}
                          className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>চালান</span>
                        </button>
                        <a
                          href={alt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-stone-800 hover:bg-stone-750 text-stone-400 hover:text-white text-[10px] transition-colors"
                          title="YouTube এ দেখুন"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Minimized bottom controls */}
        {isMinimized && (
          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <Disc3 className="w-3.5 h-3.5 text-red-500 animate-spin [animation-duration:5s] shrink-0" />
              <span className="truncate">চ্যাট করুন, গান ব্যাকগ্রাউন্ডে চলছে</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <span>YouTube</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={expandPlayer}
                className="text-xs font-semibold text-stone-200 hover:text-white cursor-pointer flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                <span>ফুলস্ক্রিন</span>
              </button>
            </div>
          </div>
        )}

        {/* Fullscreen Music Meta, Audio Visualizer & Action Bar */}
        {!isMinimized && (
          <div className="p-5 sm:p-6 rounded-3xl bg-stone-900/80 border border-stone-800 shadow-xl backdrop-blur-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            {/* Left: Track Information & Vinyl Disc */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 shadow-lg group">
                <Disc3 className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 animate-spin [animation-duration:4s]" />
                <div className="absolute inset-0 rounded-2xl bg-radial from-transparent via-red-500/10 to-transparent pointer-events-none" />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-600 text-white font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE STREAM
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    ID: {videoId || 'Live Stream'}
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-white tracking-tight truncate max-w-lg sm:max-w-xl">
                  {cleanTitle}
                </h3>

                {/* Dynamic Equalizer Visualizer Bars */}
                <div className="flex items-end gap-1 h-3.5 pt-1" title="অডিও ভিজ্যুয়ালাইজার">
                  {[60, 100, 40, 80, 50, 90, 70, 30, 85, 45, 95, 65, 80, 55].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                      className="w-1 bg-gradient-to-t from-red-600 to-rose-400 rounded-full animate-pulse [animation-duration:0.7s]"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
              <button
                onClick={minimizePlayer}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-colors cursor-pointer"
                title="ব্যাকগ্রাউন্ড মোডে রেখে চ্যাট করতে যান"
              >
                <Minimize2 className="w-4 h-4 text-emerald-400" />
                <span>ব্যাকগ্রাউন্ডে চালান</span>
              </button>

              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                title="ইউটিউব অফিশিয়াল অ্যাপে ভিডিওটি খুলুন"
              >
                <Youtube className="w-4 h-4" />
                <span>সরাসরি YouTube এ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={ytMusicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
                title="YouTube Music প্ল্যাটফর্মে শুনুন"
              >
                <Music className="w-4 h-4 text-rose-400" />
                <span>YouTube Music</span>
              </a>

              <button
                onClick={handleAskAI}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-colors cursor-pointer"
                title="এআই-এর কাছে এই গানের অর্থ ও লিরিক্স জানতে চান"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>লিরিক্স ও অর্থ</span>
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
                title="সোশ্যাল মিডিয়ায় গানটি শেয়ার করুন"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>শেয়ার</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors border border-stone-700 cursor-pointer"
                title="গানের লিঙ্ক কপি করুন"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
