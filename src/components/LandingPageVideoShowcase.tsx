import React, { useState } from 'react';
import {
  Youtube,
  Play,
  Maximize2,
  Music,
  Disc3,
  Search,
  ExternalLink,
  Sparkles,
  Radio,
  Headphones,
  Laptop
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { MusicTrack } from '../types';
import { extractYouTubeVideoId } from '../utils/youtube';

interface LandingPageVideoShowcaseProps {
  onSendToChat?: (prompt: string) => void;
}

// Curated verified tracks that play reliably in in-app fullscreen
const CURATED_TRACKS: (MusicTrack & { category: string; duration: string; icon: React.ReactNode })[] = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Girl - Chill Beats to Code & Study To',
    artist: 'Lofi Girl',
    category: 'কোডিং ও স্টাডি',
    duration: 'লাইভ রেডিও / রিল্যাক্সিং',
    icon: <Headphones className="w-4 h-4 text-emerald-400" />,
  },
  {
    videoId: '4xDzrJKXOOY',
    title: 'Synthwave Radio - Chill Retro Beats to Relax & Game To',
    artist: 'Lofi Girl / Synthwave',
    category: 'রেট্রো সিন্থওয়েভ',
    duration: 'লাইভ সিন্থ স্ট্রিম',
    icon: <Radio className="w-4 h-4 text-rose-400" />,
  },
  {
    videoId: 'DWcJFNfaw90',
    title: 'Chill Drive - Late Night Lofi & Coding Focus Beats',
    artist: 'Chill Music Lab',
    category: 'প্রোগ্রামিং ফোকাস',
    duration: 'স্টাডি সেশন',
    icon: <Laptop className="w-4 h-4 text-blue-400" />,
  },
  {
    videoId: 'M576WGiDBdQ',
    title: 'Deep Focus Nature Ambience & Calm Mind Piano',
    artist: 'Ambient Soundscape',
    category: 'ধ্যান ও প্রশান্তি',
    duration: 'রিল্যাক্সিং সাউন্ড',
    icon: <Disc3 className="w-4 h-4 text-amber-400" />,
  },
];

export const LandingPageVideoShowcase: React.FC<LandingPageVideoShowcaseProps> = ({
  onSendToChat,
}) => {
  const { playTrack, playVideoId } = useMusicPlayer();
  const [featuredTrack, setFeaturedTrack] = useState<MusicTrack>(CURATED_TRACKS[0]);
  const [customInput, setCustomInput] = useState('');

  const handleInputChange = (val: string) => {
    setCustomInput(val);
    const detectedId = extractYouTubeVideoId(val);
    if (detectedId) {
      setFeaturedTrack({
        videoId: detectedId,
        title: 'ইউটিউব ভিডিও (লিংক শনাক্ত হয়েছে)',
        originalUrl: `https://www.youtube.com/watch?v=${detectedId}`,
        searchQuery: val,
      });
    }
  };

  const handlePlayCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const query = customInput.trim();
    if (!query) return;

    const detectedId = extractYouTubeVideoId(query);
    if (detectedId) {
      const trackToPlay: MusicTrack = {
        videoId: detectedId,
        title: 'ইউটিউব ভিডিও / গান',
        originalUrl: `https://www.youtube.com/watch?v=${detectedId}`,
        searchQuery: query,
      };
      setFeaturedTrack(trackToPlay);
      playVideoId(detectedId, 'ইউটিউব ভিডিও / গান', { autoPlay: true });
    } else {
      playVideoId(query, query, { autoPlay: true });
    }
  };

  const handleSendQueryToChat = () => {
    const query = customInput.trim();
    if (!query || !onSendToChat) return;
    onSendToChat(`ইউটিউবে "${query}" সম্পর্কিত সেরা গান বা ভিডিও লিংক ও বিবরণ দিন।`);
  };

  return (
    <section className="my-6 rounded-3xl overflow-hidden border border-red-500/25 dark:border-red-500/20 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 shadow-xl text-white">
      {/* Top Banner Header */}
      <div className="px-5 sm:px-7 py-4 bg-stone-950/80 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
            <Youtube className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[10px] font-bold border border-red-500/30 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                মিউজিক ও ভিডিও স্টুডিও
              </span>
              <span className="text-xs text-stone-400 font-medium hidden sm:inline">
                • চ্যাট ছাড়াই সরাসরি ফুলস্ক্রিনে প্লে করুন
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5">
              ইউটিউব ইন-অ্যাপ সিনেমা ও ব্যাকগ্রাউন্ড প্লেয়ার
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => playTrack(featuredTrack)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:brightness-110 active:scale-98 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer self-start sm:self-auto"
          title="ফিচার্ড ভিডিওটি এখনই সম্পূর্ণ ফুলস্ক্রিনে প্লে করুন"
        >
          <Maximize2 className="w-4 h-4" />
          <span>ফুলস্ক্রিন প্লেয়ারে চালান</span>
        </button>
      </div>

      <div className="p-5 sm:p-7 space-y-6">
        {/* Direct Search or YouTube URL Input Bar */}
        <form onSubmit={handlePlayCustom} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="যেকোনো গানের নাম লিখুন বা YouTube URL পেস্ট করুন (যেমন: https://youtube.com/watch?v=...)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-750 text-white placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              title="ইন-অ্যাপ ফুলস্ক্রিন প্লেয়ারে খুলুন"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>ফুলস্ক্রিনে শুনুন</span>
            </button>

            {onSendToChat && (
              <button
                type="button"
                onClick={handleSendQueryToChat}
                disabled={!customInput.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-850 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-stone-300 hover:text-white text-xs font-medium border border-stone-750 transition-colors cursor-pointer"
                title="এআই চ্যাটে গানটির বিষয়ে প্রশ্ন করুন"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">চ্যাটে খুঁজুন</span>
              </button>
            )}
          </div>
        </form>

        {/* Featured Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Main Video Stage Preview */}
          <div className="lg:col-span-7">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-stone-800 shadow-2xl group">
              <iframe
                src={`https://www.youtube.com/embed/${featuredTrack.videoId}?rel=0&modestbranding=1&playsinline=1`}
                title={featuredTrack.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />

              {/* Overlay Fullscreen Button on Hover */}
              <button
                onClick={() => playTrack(featuredTrack)}
                className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 hover:bg-red-600 text-white text-xs font-semibold backdrop-blur-md border border-stone-700 hover:border-red-500 transition-all shadow-lg cursor-pointer"
                title="অ্যাপের ভেতরে বড় সিনেমাটিক ফুলস্ক্রিন প্লেয়ারে নিন"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ফুলস্ক্রিন মোড</span>
              </button>
            </div>
          </div>

          {/* Featured Track Info & Live Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-600/30 text-red-400 border border-red-500/30 uppercase font-bold">
                  এখন নির্বাচিত
                </span>
                <span className="text-[11px] text-stone-400 font-mono">
                  ID: {featuredTrack.videoId}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {featuredTrack.title}
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                কোনো চ্যাট শুরু না করেই ল্যান্ডিং পেজে সরাসরি ভিডিও উপভোগ করতে পারেন। ফুলস্ক্রিন প্লেয়ারে ক্লিক করলে ভিজ্যুয়ালাইজার সহ সিনেমাটিক মোডে চালু হবে এবং মিনিমাইজ করে ব্যাকগ্রাউন্ডেও শুনতে পারবেন।
              </p>
            </div>

            {/* Quick action buttons for featured track */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => playTrack(featuredTrack)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-red-600/25 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ফুলস্ক্রিনে শুরু করুন</span>
                <Maximize2 className="w-3.5 h-3.5 ml-1" />
              </button>

              <a
                href={`https://www.youtube.com/watch?v=${featuredTrack.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold border border-stone-750 transition-colors"
              >
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube এ চালান</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Curated Playlist Cards Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-red-400" />
              <span>জনপ্রিয় প্লেলিস্ট ও কিউরেটেড ট্র্যাকসমূহ (1-Click Play)</span>
            </h4>
            <span className="text-[11px] text-stone-500">চ্যাট ছাড়াই তাৎক্ষণিক উপভোগ করুন</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CURATED_TRACKS.map((t) => {
              const isSelected = featuredTrack.videoId === t.videoId;
              return (
                <div
                  key={t.videoId}
                  className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-3 group/track ${
                    isSelected
                      ? 'bg-stone-900 border-red-500/60 shadow-lg shadow-red-950/30'
                      : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900/60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-stone-900 text-stone-300 font-mono text-[10px] border border-stone-800 flex items-center gap-1">
                        {t.icon}
                        <span>{t.category}</span>
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{t.duration}</span>
                    </div>

                    <h5 className="text-xs font-bold text-white group-hover/track:text-red-400 transition-colors line-clamp-2 leading-snug">
                      {t.title}
                    </h5>
                    <p className="text-[11px] text-stone-400 truncate">{t.artist}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-stone-850">
                    <button
                      type="button"
                      onClick={() => setFeaturedTrack(t)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-200 text-[11px] font-medium transition-colors cursor-pointer text-center"
                      title="এখানে প্রিভিউ দেখুন"
                    >
                      প্রিভিউ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedTrack(t);
                        playTrack(t);
                      }}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                      title="অ্যাপের ভেতরে বড় ফুলস্ক্রিন প্লেয়ারে চালান"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>ফুলস্ক্রিন</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
