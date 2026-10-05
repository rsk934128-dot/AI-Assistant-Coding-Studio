import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { 
  Bot, 
  User, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  Play, 
  Download, 
  Volume2, 
  VolumeX, 
  Pause,
  Square,
  Radio,
  AlertCircle,
  FileCode,
  Sparkles,
  RotateCw,
  Pencil,
  Send,
  X,
  Gauge,
  Music,
  Youtube,
  Disc3,
  Share2,
  Search,
  HelpCircle,
  Maximize2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Languages,
  Sliders,
  Hash,
  WrapText,
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useMiniBrowser } from '../context/MiniBrowserContext';
import { ChatMessage, GroundingChunk } from '../types';
import { ContinuousTTSPlayer } from '../utils/textToSpeech';
import { highlightCode, normalizeLanguage, getExtensionForLanguage } from '../utils/prismLanguages';

interface ChatMessageItemProps {
  message: ChatMessage;
  onPreviewCode: (code: string, language: string) => void;
  onSelectPrompt?: (prompt: string) => void;
  onRetry?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onShareMessage?: (text: string) => void;
  onOpenHostingGuide?: () => void;
  isGenerating?: boolean;
}

const CodeBlockItem: React.FC<{
  language: string;
  codeString: string;
  children: React.ReactNode;
  onPreviewCode: (code: string, language: string) => void;
  downloadAsFile: (content: string, filename: string) => void;
}> = ({ language, codeString, onPreviewCode, downloadAsFile }) => {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);

  const normLanguage = normalizeLanguage(language);
  const canPreview = ['html', 'js', 'javascript', 'svg', 'css', 'markup'].includes(normLanguage);
  
  const lines = React.useMemo(() => codeString.split('\n'), [codeString]);
  const lineCount = lines.length;

  // Prism.js Syntax Highlighting
  const highlightedHtml = React.useMemo(() => {
    return highlightCode(codeString, language);
  }, [codeString, language]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = getExtensionForLanguage(language);
    downloadAsFile(codeString, `code-snippet.${ext}`);
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-stone-800 bg-[#121214] text-stone-100 shadow-xl ring-1 ring-white/5 transition-all">
      {/* Code Block Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#18181b]/95 border-b border-stone-800/80 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
          <FileCode className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="text-stone-200 font-semibold tracking-wide uppercase text-[11px] sm:text-xs truncate">
            {language || 'code'}
          </span>
          <span className="text-[10px] text-stone-500 font-normal hidden sm:inline">
            • {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle Line Wrap */}
          <button
            type="button"
            onClick={() => setWrapLines((w) => !w)}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              wrapLines
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'hover:bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title={wrapLines ? 'লাইন আন-র‍্যাপ করুন (Unwrap)' : 'লাইন র‍্যাপ করুন (Wrap Lines)'}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Line Numbers */}
          {lineCount > 1 && (
            <button
              type="button"
              onClick={() => setShowLineNumbers((n) => !n)}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                showLineNumbers
                  ? 'bg-stone-800 text-stone-200 border border-stone-700/60'
                  : 'hover:bg-stone-800 text-stone-500 hover:text-stone-300'
              }`}
              title={showLineNumbers ? 'লাইন নম্বর লুকান' : 'লাইন নম্বর দেখান'}
            >
              <Hash className="w-3.5 h-3.5" />
            </button>
          )}

          {canPreview && (
            <button
              type="button"
              onClick={() => onPreviewCode(codeString, language)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer text-xs font-medium"
              title="লাইভ প্রিভিউ দেখুন"
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Run</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title={`কোড ফাইল ডাউনলোড করুন (.${getExtensionForLanguage(language)})`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/60'
            }`}
            title="কোড ক্লিপবোর্ডে কপি করুন"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>কপি</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content with Prism.js Highlighting */}
      <div className="relative overflow-hidden bg-[#121214]">
        <pre
          className={`p-4 text-xs sm:text-[13px] font-mono leading-relaxed selection:bg-emerald-700/50 selection:text-white ${
            wrapLines ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto whitespace-pre'
          }`}
        >
          {showLineNumbers && !wrapLines ? (
            <div className="flex">
              <div
                className="select-none text-stone-600 pr-3.5 text-right font-mono text-[11px] sm:text-xs leading-relaxed shrink-0 border-r border-stone-800/80"
                aria-hidden="true"
              >
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <div className="pl-4 min-w-0 flex-1">
                <code
                  className={`prism-code-block language-${normLanguage}`}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              </div>
            </div>
          ) : (
            <code
              className={`prism-code-block language-${normLanguage}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          )}
        </pre>
      </div>
    </div>
  );
};

const YouTubeSearchCard: React.FC<{
  href: string;
  query: string;
  title: React.ReactNode;
}> = ({ href, query, title }) => {
  const [copied, setCopied] = useState(false);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const musicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
  const musicPlayer = useMusicPlayer();
  const miniBrowser = useMiniBrowser();
  const cleanTitle = typeof title === 'string' ? title : query;

  return (
    <div className="my-3 p-3.5 rounded-2xl border border-red-500/30 bg-stone-950 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Youtube className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-stone-100 truncate">
            {cleanTitle}
          </h4>
          <p className="text-[11px] text-stone-400 truncate">
            ইউটিউব অফিসিয়াল সার্চ লিংক (শতভাগ কার্যকর)
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => miniBrowser.openBrowser(cleanTitle, 'search')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          title="আমাদের অ্যাপের ভেতরে মিনি গুগল ওয়েব ব্রাউজারে খুঁজুন ও চালান"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>মিনি গুগল ওয়েবে খুঁজুন</span>
        </button>
        <button
          type="button"
          onClick={() =>
            musicPlayer.playTrack({
              videoId: '',
              title: cleanTitle,
              originalUrl: href,
              searchQuery: query,
            })
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          title="আমাদের অ্যাপের ভেতরে বড় ফুলস্ক্রিন প্লেয়ারে গানটি চালান"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>ফুলস্ক্রিন প্লেয়ার</span>
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
          title="লিঙ্ক কপি করুন"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-white font-semibold text-xs transition-all border border-stone-750"
        >
          <Play className="w-3 h-3 fill-current text-red-500" />
          <span className="hidden sm:inline">ইউটিউবে</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={musicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-all border border-stone-700"
        >
          <Music className="w-3 h-3 text-red-400" />
          <span className="hidden sm:inline">Music</span>
        </a>
      </div>
    </div>
  );
};

const YouTubeEmbedCard: React.FC<{
  href: string;
  videoId: string;
  title: React.ReactNode;
}> = ({ href, videoId, title }) => {
  const [copied, setCopied] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [useNoCookie, setUseNoCookie] = useState(false);
  const [fetchedMeta, setFetchedMeta] = useState<{ title?: string; author?: string } | null>(null);

  const musicPlayer = useMusicPlayer();
  const miniBrowser = useMiniBrowser();

  useEffect(() => {
    let active = true;
    const fetchMeta = async () => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (active && data && data.title) {
            setFetchedMeta({ title: data.title, author: data.author_name });
          }
        }
      } catch (_) {}
    };
    fetchMeta();
    return () => { active = false; };
  }, [videoId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rawTitleString = React.Children.toArray(title)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('')
    .trim();

  const isRawUrlOrGeneric = !rawTitleString || 
    rawTitleString.startsWith('http') || 
    rawTitleString.includes('youtu') ||
    rawTitleString === 'ভিডিও / গান' ||
    rawTitleString === 'ইউটিউব গান / ভিডিও';

  const displayTitle = fetchedMeta?.title || (isRawUrlOrGeneric ? 'ইউটিউব গান / ভিডিও' : rawTitleString);
  const displayAuthor = fetchedMeta?.author;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(displayTitle)}`;
  const musicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(displayTitle)}`;

  const embedHost = useNoCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
  const embedUrl = `https://${embedHost}/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;

  const handleOpenFullscreenPlayer = () => {
    musicPlayer.playVideoId(videoId, displayTitle, {
      autoPlay: true,
      startMinimized: false,
    });
  };

  const handleOpenBackgroundPlayer = () => {
    musicPlayer.playVideoId(videoId, displayTitle, {
      autoPlay: true,
      startMinimized: true,
    });
  };

  return (
    <div className="my-4 rounded-2xl overflow-hidden border border-red-500/30 dark:border-red-500/20 bg-stone-950 text-stone-100 shadow-xl block">
      {/* Header bar with controls */}
      <div className="px-3.5 py-2.5 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded-md bg-red-600 text-white shrink-0">
            <Play className="w-3.5 h-3.5 fill-current" />
          </span>
          <span className="font-semibold text-stone-200 truncate flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">{displayTitle}</span>
            {displayAuthor && (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-stone-800 text-[10px] text-stone-400 font-normal shrink-0 border border-stone-700/60">
                {displayAuthor}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => miniBrowser.openYouTubeInBrowser(videoId, displayTitle, href)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-semibold text-[11px] transition-all shadow-xs cursor-pointer"
            title="আমাদের অ্যাপের ভেতরে মিনি গুগল ব্রাউজারে গানটি শুনুন ও লিরিক্স দেখুন"
          >
            <Globe className="w-3 h-3" />
            <span>মিনি ব্রাউজার</span>
          </button>

          <button
            type="button"
            onClick={handleOpenFullscreenPlayer}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-semibold text-[11px] transition-all shadow-xs cursor-pointer"
            title="আমাদের অ্যাপের ভেতরে ফুলস্ক্রিন প্লেয়ারে গানটি খুলুন"
          >
            <Maximize2 className="w-3 h-3" />
            <span>ফুলস্ক্রিন প্লেয়ার</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            title="শেয়ার লিংক কপি করুন"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors text-[11px] cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-750 text-white font-medium text-[11px] transition-colors shadow-2xs border border-stone-750"
            title="মূল ইউটিউব অ্যাপে ভিডিওটি খুলুন"
          >
            <Youtube className="w-3 h-3 text-red-500" />
            <span className="hidden sm:inline">ইউটিউবে</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Embedded Responsive YouTube Player */}
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={embedUrl}
          title="YouTube music and video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="w-full h-full border-0"
        />
      </div>

      {/* Action & Fallback Quick Controls */}
      <div className="p-3 bg-stone-900 border-t border-stone-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Primary: In-App Mini Google Web Browser */}
            <button
              type="button"
              onClick={() => miniBrowser.openYouTubeInBrowser(videoId, displayTitle, href)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              title="আমাদের অ্যাপের ভেতরে মিনি গুগল ওয়েব ব্রাউজারে গানটি চালান ও লিরিক্স দেখুন"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>মিনি গুগল ওয়েবে চালান</span>
            </button>

            <button
              type="button"
              onClick={handleOpenFullscreenPlayer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-red-600/25 transition-all cursor-pointer"
              title="আমাদের অ্যাপের ভেতরে বড় ফুলস্ক্রিন প্লেয়ারে গানটি চালান"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>অ্যাপে ফুলস্ক্রিন প্লেয়ার</span>
            </button>

            <button
              type="button"
              onClick={handleOpenBackgroundPlayer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-500/40 shadow-xs transition-colors cursor-pointer"
              title="চ্যাট চালিয়ে যান, গানটি ব্যাকগ্রাউন্ডে চলতে থাকবে"
            >
              <span>ব্যাকগ্রাউন্ডে চালান</span>
            </button>

            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-white text-xs font-semibold shadow-xs transition-colors border border-stone-700"
            >
              <Play className="w-3 h-3 fill-current text-red-500" />
              <span>সরাসরি YouTube এ চালান</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors border border-stone-700"
              title="যদি এই ভিডিও আইডি বন্ধ থাকে, ইউটিউবে আসল গানটি খুঁজুন"
            >
              <Search className="w-3 h-3 text-red-400" />
              <span>ইউটিউবে সার্চ করুন</span>
            </a>

            <a
              href={musicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors border border-stone-700"
              title="YouTube Music এ শুনুন"
            >
              <Music className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">YouTube Music</span>
            </a>
          </div>

          <button
            type="button"
            onClick={() => setShowTroubleshoot((prev) => !prev)}
            className="text-[11px] text-stone-400 hover:text-stone-200 underline cursor-pointer flex items-center gap-1 ml-auto"
          >
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span>ভিডিও না চললে করণীয় কী?</span>
          </button>
        </div>

        {/* Informative explanation of why YouTube embeds fail and how to solve */}
        {showTroubleshoot && (
          <div className="p-3.5 rounded-xl bg-stone-950/90 border border-stone-800 text-xs text-stone-300 space-y-2 leading-relaxed animate-in fade-in">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>ভিডিও প্লে না হওয়ার কারণ ও সমাধান:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-stone-400 text-[11px]">
              <li>
                <strong className="text-stone-200">কপিরাইট ও চ্যানেল বিধিনিষেধ (Error 150/101):</strong> অনেক অফিশিয়াল মিউজিক লেবেল (যেমন T-Series, Sony, VEVO বা শিল্পীদের চ্যানেল) অন্য ওয়েবসাইটে সরাসরি প্লেব্যাক বন্ধ রাখে।
              </li>
              <li>
                <strong className="text-stone-200">সহজ সমাধান:</strong> নিচের <span className="text-blue-400 font-semibold">"মিনি গুগল ওয়েবে চালান"</span> বোতামে ক্লিক করলে অ্যাপের ভেতরেই গানটি লিরিক্স সহ চলবে, অথবা <span className="text-red-400 font-semibold">"সরাসরি YouTube এ চালান"</span> বোতামে ক্লিক করলে কোনো বাধা ছাড়াই ভিডিওটি বাজবে।
              </li>
            </ul>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => miniBrowser.openYouTubeInBrowser(videoId, displayTitle, href)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>মিনি গুগল ওয়েব ব্রাউজারে খুলুন</span>
              </button>
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>সরাসরি YouTube এ খুলুন</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Audio / Song footer info */}
      <div className="px-3.5 py-2 bg-stone-950/90 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <Disc3 className="w-3.5 h-3.5 text-red-400 animate-spin [animation-duration:6s] shrink-0" />
          <span className="truncate">এখানে প্লে না হলে সরাসরি 'YouTube এ চালান' বাটনে চাপুন</span>
        </div>
        <span className="text-stone-500 font-mono text-[10px] shrink-0">ID: {videoId}</span>
      </div>
    </div>
  );
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onPreviewCode,
  onSelectPrompt,
  onRetry,
  onEditMessage,
  onShareMessage,
  onOpenHostingGuide,
  isGenerating = false,
}) => {
  const miniBrowser = useMiniBrowser();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ai_preferred_tts_speed');
      return saved ? parseFloat(saved) : 0.85;
    } catch {
      return 0.85;
    }
  });
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const [activeChunk, setActiveChunk] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [detectedVoiceLabel, setDetectedVoiceLabel] = useState<string>('');
  const [speechWarning, setSpeechWarning] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [currentReadingSentence, setCurrentReadingSentence] = useState<string>('');
  const ttsPlayerRef = useRef<ContinuousTTSPlayer | null>(null);

  // Available Browser Speech Voices & Selection
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem('ai_preferred_tts_voice') || 'auto';
    } catch {
      return 'auto';
    }
  });
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const voiceMenuRef = useRef<HTMLDivElement>(null);

  // Sync speed changes across app
  useEffect(() => {
    const handleSpeedEvent = (e: any) => {
      if (e?.detail && typeof e.detail === 'number') {
        setSpeechSpeed(e.detail);
        ttsPlayerRef.current?.updateOptions({ speed: e.detail });
      }
    };
    window.addEventListener('tts-speed-changed', handleSpeedEvent);
    return () => window.removeEventListener('tts-speed-changed', handleSpeedEvent);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target as Node)) {
        setIsVoiceMenuOpen(false);
      }
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatVoiceName = (rawName: string) => {
    return rawName
      .replace(/Microsoft\s*/gi, '')
      .replace(/Google\s*/gi, '')
      .replace(/Online\s*\(Natural\)\s*-?\s*/gi, '')
      .replace(/Desktop\s*/gi, '')
      .replace(/\(Bangladesh\)/gi, 'বাংলা (BD)')
      .replace(/\(India\)/gi, 'বাংলা (IN)')
      .trim() || rawName;
  };

  const bengaliVoices = availableVoices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('bn') ||
      v.name.toLowerCase().includes('bangla') ||
      v.name.toLowerCase().includes('bengali')
  );

  const englishVoices = availableVoices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('en') &&
      !bengaliVoices.some((b) => b.voiceURI === v.voiceURI)
  );

  const currentSelectedVoice = availableVoices.find(
    (v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI
  );

  const currentVoiceLabel = selectedVoiceURI === 'auto'
    ? 'স্বয়ংক্রিয়'
    : currentSelectedVoice
    ? formatVoiceName(currentSelectedVoice.name)
    : 'কণ্ঠ';

  const handleVoiceSelect = (voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    setIsVoiceMenuOpen(false);
    try {
      localStorage.setItem('ai_preferred_tts_voice', voiceURI);
    } catch {}

    if (ttsPlayerRef.current) {
      ttsPlayerRef.current.updateOptions({
        voiceURI,
        preferredMode: voiceURI === 'auto' ? 'natural' : 'browser',
      });
      if (isSpeaking) {
        ttsPlayerRef.current.jumpToChunk(activeChunk);
      }
    }
  };

  useEffect(() => {
    setEditText(message.text);
  }, [message.text]);

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || !onEditMessage) return;
    setIsEditing(false);
    onEditMessage(message.id, trimmed);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-format bare YouTube URLs (watch?v=, youtu.be/, shorts/, embed/) into markdown links
  // so that react-markdown automatically renders them as rich in-app YouTube player cards
  const autoFormatYouTubeLinks = (rawText: string): string => {
    if (!rawText) return '';
    return rawText.replace(
      /(?<!\]\(|href=["'])(https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^\s)]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s<>"')]*)/gi,
      (match) => `[ইউটিউব গান / ভিডিও](${match})`
    );
  };

  // Clean text for text-to-speech (remove markdown syntax, codeblocks, links)
  const cleanTextForSpeech = (rawText: string) => {
    return rawText
      .replace(/```[\s\S]*?```/g, ' কোড ব্লক বাদ দেওয়া হয়েছে। ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s)]+/g, ' ')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/[*_~#]/g, '')
      .replace(/>\s+/g, '')
      .replace(/\|[^\n]+\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getOrCreateTTSPlayer = (rate = speechSpeed) => {
    if (!ttsPlayerRef.current) {
      ttsPlayerRef.current = new ContinuousTTSPlayer({
        speed: rate,
        preferredMode: selectedVoiceURI === 'auto' ? 'natural' : 'browser',
        voiceURI: selectedVoiceURI,
        onChunkStart: (index, total, chunkText) => {
          setActiveChunk(index);
          setTotalChunks(total);
          setCurrentReadingSentence(chunkText);
          setIsSpeaking(true);
          setIsPaused(false);
        },
        onStateChange: (speaking, paused) => {
          setIsSpeaking(speaking);
          setIsPaused(paused);
        },
        onComplete: () => {
          setIsSpeaking(false);
          setIsPaused(false);
          setActiveChunk(0);
          setCurrentReadingSentence('');
        },
        onError: (errMsg) => {
          setSpeechWarning(errMsg);
          setTimeout(() => setSpeechWarning(null), 5000);
        },
      });
    } else {
      ttsPlayerRef.current.updateOptions({
        speed: rate,
        voiceURI: selectedVoiceURI,
        preferredMode: selectedVoiceURI === 'auto' ? 'natural' : 'browser',
      });
    }
    return ttsPlayerRef.current;
  };

  const handleStartSpeaking = (targetSpeed?: number) => {
    const rate = targetSpeed !== undefined ? targetSpeed : speechSpeed;
    if (isSpeaking) {
      if (isPaused) {
        handleResumeSpeaking();
      } else {
        handlePauseSpeaking();
      }
      return;
    }

    const player = getOrCreateTTSPlayer(rate);
    setIsSpeaking(true);
    setIsPaused(false);
    player.play(message.text, 0);
  };

  const handlePauseSpeaking = () => {
    ttsPlayerRef.current?.pause();
    setIsPaused(true);
  };

  const handleResumeSpeaking = () => {
    ttsPlayerRef.current?.resume();
    setIsPaused(false);
  };

  const handleStopSpeaking = () => {
    ttsPlayerRef.current?.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveChunk(0);
    setTotalChunks(0);
    setCurrentReadingSentence('');
  };

  const handleSpeedChange = (speed: number) => {
    const clamped = Math.round(Math.max(0.5, Math.min(2.0, speed)) * 100) / 100;
    setSpeechSpeed(clamped);
    ttsPlayerRef.current?.updateOptions({ speed: clamped });
    try {
      localStorage.setItem('ai_preferred_tts_speed', clamped.toString());
      window.dispatchEvent(new CustomEvent('tts-speed-changed', { detail: clamped }));
    } catch (_) {}
  };

  const handleJumpChunk = (direction: 'prev' | 'next') => {
    if (!ttsPlayerRef.current) return;
    const target = direction === 'prev' ? Math.max(0, activeChunk - 1) : Math.min(totalChunks - 1, activeChunk + 1);
    ttsPlayerRef.current.jumpToChunk(target);
  };

  const handleRestartSpeaking = () => {
    if (!ttsPlayerRef.current) return;
    ttsPlayerRef.current.jumpToChunk(0);
  };

  useEffect(() => {
    return () => {
      ttsPlayerRef.current?.stop();
    };
  }, []);

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Custom components for Markdown rendering
  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');

      if (!inline && (language || codeString.includes('\n'))) {
        return (
          <CodeBlockItem
            language={language}
            codeString={codeString}
            onPreviewCode={onPreviewCode}
            downloadAsFile={downloadAsFile}
          >
            {children}
          </CodeBlockItem>
        );
      }

      return (
        <code className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-medium" {...props}>
          {children}
        </code>
      );
    },
    p({ children }: any) {
      return <div className="mb-3 leading-relaxed last:mb-0 text-stone-800 dark:text-stone-200">{children}</div>;
    },
    ul({ children }: any) {
      return <ul className="list-disc pl-5 mb-3 space-y-1 text-stone-800 dark:text-stone-200">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="list-decimal pl-5 mb-3 space-y-1 text-stone-800 dark:text-stone-200">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="leading-relaxed">{children}</li>;
    },
    h1({ children }: any) {
      return <h1 className="text-xl font-bold mt-4 mb-2 text-stone-900 dark:text-white border-b border-stone-200 dark:border-stone-800 pb-1">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-lg font-bold mt-3 mb-2 text-stone-900 dark:text-white">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-base font-semibold mt-2.5 mb-1.5 text-stone-900 dark:text-stone-100">{children}</h3>;
    },
    blockquote({ children }: any) {
      return <blockquote className="border-l-3 border-emerald-500 pl-3 my-2 text-stone-600 dark:text-stone-400 italic text-sm">{children}</blockquote>;
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-3 rounded-lg border border-stone-200 dark:border-stone-800">
          <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800 text-xs text-left">
            {children}
          </table>
        </div>
      );
    },
    a({ href, children }: any) {
      if (!href) return <span>{children}</span>;

      // 1. Check if it's a YouTube search query URL
      const searchMatch = href.match(/(?:youtube|music\.youtube)\.com\/(?:results\?search_query=|search\?q=)([^&#]+)/i);
      if (searchMatch) {
        let query = searchMatch[1];
        try {
          query = decodeURIComponent(query.replace(/\+/g, ' '));
        } catch (_) {}
        return <YouTubeSearchCard href={href} query={query} title={children} />;
      }

      // 2. Extract YouTube Video ID from any URL format:
      // watch?v=ID, youtu.be/ID, shorts/ID, embed/ID, music.youtube.com/watch?v=ID
      const ytMatch = href.match(/(?:(?:youtube|music\.youtube)\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      const isYoutube = Boolean(ytMatch);
      const videoId = ytMatch ? ytMatch[1] : null;

      if (isYoutube && videoId) {
        return <YouTubeEmbedCard href={href} videoId={videoId} title={children} />;
      }

      return (
        <span className="inline-flex items-center gap-1 my-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              miniBrowser.openBrowser(href, 'web');
            }}
            title="ইন-অ্যাপ মিনি ব্রাউজারে পড়ুন"
            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-1 py-0.5 rounded transition-colors cursor-pointer text-left"
          >
            <span>{children}</span>
            <Globe className="w-3 h-3 inline shrink-0 opacity-70" />
          </button>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            title="নতুন ব্রাউজার ট্যাবে খুলুন"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 rounded hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
          </a>
        </span>
      );
    },
    th({ children }: any) {
      return <th className="px-3 py-2 bg-stone-100 dark:bg-stone-800 font-semibold text-stone-900 dark:text-stone-100">{children}</th>;
    },
    td({ children }: any) {
      return <td className="px-3 py-2 border-t border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300">{children}</td>;
    },
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group py-5 px-4 sm:px-6 transition-colors ${
        isUser
          ? 'bg-transparent'
          : 'bg-stone-50/70 dark:bg-stone-900/40 border-y border-stone-100 dark:border-stone-800/60'
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
            isUser
              ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 font-medium text-xs'
              : 'bg-emerald-600 dark:bg-emerald-500 text-white'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              {isUser ? 'You' : 'AI Assistant (Gemini 3.8 Flash)'}
            </span>
            <span className="text-[11px] text-stone-400 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Error display if any */}
          {message.error && (
            <div className="p-3.5 mb-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="leading-relaxed">{message.error}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                {onOpenHostingGuide && (
                  <button
                    onClick={onOpenHostingGuide}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-medium text-xs transition-colors cursor-pointer"
                  >
                    <span>হোস্টিং গাইড</span>
                  </button>
                )}
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>পুনরায় চেষ্টা করুন</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Text Content / Edit Box */}
          {isUser && isEditing ? (
            <div className="mt-1 w-full space-y-2.5">
              <textarea
                ref={editTextareaRef}
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditText(message.text);
                  }
                }}
                placeholder="আপনার বার্তা সম্পাদনা করুন..."
                rows={2}
                className="w-full resize-none p-3 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/50 shadow-inner leading-relaxed"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-stone-400 dark:text-stone-500 hidden sm:inline">
                  পাঠাতে <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] font-mono">Enter</kbd> চাপুন, নতুন লাইনের জন্য <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] font-mono">Shift+Enter</kbd>
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.text);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>বাতিল</span>
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() || editText.trim() === message.text || isGenerating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>সংরক্ষণ ও পাঠান</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm prose-stone dark:prose-invert max-w-none break-words">
              <Markdown components={MarkdownComponents}>
                {autoFormatYouTubeLinks(message.text)}
              </Markdown>
            </div>
          )}

          {/* User Action bar */}
          {isUser && !isEditing && (
            <div className="mt-2.5 flex items-center gap-1.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {onEditMessage && (
                <button
                  onClick={() => {
                    setEditText(message.text);
                    setIsEditing(true);
                  }}
                  title="মেসেজটি এডিট করুন ও নতুন উত্তর পান"
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400" />
                  <span>এডিট</span>
                </button>
              )}
              <button
                onClick={handleCopyMessage}
                title="মেসেজ কপি করো"
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কপি হয়েছে' : 'কপি'}</span>
              </button>
            </div>
          )}

          {/* Streaming cursor indicator */}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 align-middle bg-emerald-500 animate-pulse rounded-xs" />
          )}

          {/* Google Search Grounding Sources */}
          {message.groundingChunks && message.groundingChunks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>তথ্যসূত্র ও গুগল সার্চ গ্রাউন্ডিং (Google Search Sources)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.groundingChunks.map((chunk, idx) => {
                  if (!chunk.web) return null;
                  const domain = (() => {
                    try {
                      return new URL(chunk.web.uri).hostname.replace('www.', '');
                    } catch {
                      return 'source';
                    }
                  })();

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/60 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all flex items-start justify-between gap-2 group/link text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          miniBrowser.openBrowser(chunk.web!.uri, 'web', {
                            urls: [{ url: chunk.web!.uri, title: chunk.web!.title || domain }],
                          });
                        }}
                        className="min-w-0 text-left cursor-pointer flex-1"
                        title="ইন-অ্যাপ মিনি গুগল ব্রাউজারে পড়ুন"
                      >
                        <p className="font-medium text-stone-900 dark:text-stone-100 truncate group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400">
                          {chunk.web.title || domain}
                        </p>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate mt-0.5 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5 text-blue-500" />
                          <span>{domain}</span>
                        </p>
                      </button>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            miniBrowser.openBrowser(chunk.web!.uri, 'web');
                          }}
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 cursor-pointer"
                          title="মিনি ব্রাউজারে দেখুন"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-200"
                          title="নতুন ট্যাবে খুলুন"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Queries used */}
          {message.searchQueries && message.searchQueries.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-stone-600 dark:text-stone-400">অনুসন্ধান:</span>
              {message.searchQueries.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => miniBrowser.openBrowser(q, 'search')}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 hover:bg-blue-50 dark:bg-stone-800 dark:hover:bg-blue-950/40 text-stone-600 hover:text-blue-600 dark:text-stone-300 dark:hover:text-blue-300 border border-stone-200 hover:border-blue-300 dark:border-stone-700 transition-colors cursor-pointer"
                  title={`মিনি ব্রাউজারে '${q}' অনুসন্ধান করুন`}
                >
                  <Search className="w-2.5 h-2.5 text-blue-500" />
                  <span>"{q}"</span>
                </button>
              ))}
            </div>
          )}

          {/* Assistant Action bar */}
          {!isUser && !message.isStreaming && message.text && (
            <div className="mt-3.5 pt-2.5 flex items-center gap-2 flex-wrap border-t border-stone-200/60 dark:border-stone-800/60">
              {/* Prominent Copy Button */}
              <button
                id={`ai-copy-btn-${message.id}`}
                onClick={handleCopyMessage}
                title="এআই-এর সম্পূর্ণ উত্তর ক্লিপবোর্ডে কপি করুন"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-semibold'
                    : 'bg-white hover:bg-stone-50 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-750 hover:border-stone-300 dark:hover:border-stone-650'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>কপি করা হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>

              {/* Mini Browser Research Button */}
              <button
                type="button"
                onClick={() => {
                  const primaryQuery = message.searchQueries?.[0] || message.text.slice(0, 60).replace(/\n.*/s, '');
                  miniBrowser.openBrowser(primaryQuery, 'search', {
                    currentPrompt: primaryQuery,
                    topics: message.searchQueries || [],
                    urls: message.groundingChunks?.map((c) => ({ url: c.web?.uri || '', title: c.web?.title })).filter((u) => u.url),
                  });
                }}
                title="মিনি গুগল ব্রাউজারে এই বিষয়টি নিয়ে আরও জানুন বা রিসার্চ করুন"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition-all cursor-pointer shadow-2xs"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>গুগলে রিসার্চ</span>
              </button>

              {/* Text to Speech Button, Voice & Speed Selector */}
              {!isSpeaking ? (
                <div className="relative flex items-center gap-1 rounded-lg p-0.5 bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-750">
                  <button
                    id={`ai-speak-btn-${message.id}`}
                    onClick={() => handleStartSpeaking()}
                    title="এআই-এর উত্তর পড়ে শোনান (Web Speech API Text-to-Speech)"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-white dark:hover:bg-stone-700 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>পড়ে শোনান</span>
                  </button>

                  {/* Voice Selector Dropdown */}
                  <div className="relative" ref={voiceMenuRef}>
                    <button
                      type="button"
                      id={`ai-voice-select-btn-${message.id}`}
                      onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                      title="পড়ার কণ্ঠ ও ভাষা নির্বাচন করুন (Google বাংলা, English ইত্যাদি)"
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-all border-l border-stone-200 dark:border-stone-700 cursor-pointer ${
                        isVoiceMenuOpen || selectedVoiceURI !== 'auto'
                          ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-700/50'
                      }`}
                    >
                      <Languages className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="max-w-[70px] sm:max-w-[85px] truncate">{currentVoiceLabel}</span>
                      <ChevronDown className={`w-2.5 h-2.5 transition-transform opacity-70 ${isVoiceMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Voice Menu Dropdown Panel */}
                    {isVoiceMenuOpen && (
                      <div className="absolute bottom-full mb-1.5 left-0 z-50 w-72 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2 py-1.5 border-b border-stone-100 dark:border-stone-800 text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center justify-between">
                          <span>ভয়েস / কণ্ঠ নির্বাচন</span>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                            {availableVoices.length > 0 ? `${availableVoices.length} টি কণ্ঠ` : 'স্বয়ংক্রিয়'}
                          </span>
                        </div>

                        {/* Auto detect option */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => handleVoiceSelect('auto')}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                              selectedVoiceURI === 'auto'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-semibold">স্বয়ংক্রিয় (Auto Detect)</span>
                              </div>
                              <p className="text-[10px] text-stone-500 dark:text-stone-400 pl-5">
                                লেখা অনুযায়ী বাংলা বা ইংরেজি স্বয়ংক্রিয় কণ্ঠ
                              </p>
                            </div>
                            {selectedVoiceURI === 'auto' && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </button>
                        </div>

                        {/* Bengali Voices Section */}
                        <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                          <div className="px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <span>🇧🇩 বাংলা কণ্ঠ ({bengaliVoices.length})</span>
                          </div>
                          {bengaliVoices.length > 0 ? (
                            bengaliVoices.map((voice) => {
                              const isSelected = selectedVoiceURI === voice.voiceURI || selectedVoiceURI === voice.name;
                              return (
                                <button
                                  key={voice.voiceURI || voice.name}
                                  type="button"
                                  onClick={() => handleVoiceSelect(voice.voiceURI || voice.name)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium'
                                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <span className="font-medium text-stone-800 dark:text-stone-200">
                                      {voice.name}
                                    </span>
                                    <span className="ml-1 text-[10px] text-stone-400 font-mono">({voice.lang})</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <p className="px-2.5 py-1 text-[10px] text-stone-400 italic">
                              ব্রাউজারে আলাদা বাংলা ভয়েস নেই (স্বয়ংক্রিয় মোড ব্যবহার করুন)
                            </p>
                          )}
                        </div>

                        {/* English Voices Section */}
                        {englishVoices.length > 0 && (
                          <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800">
                            <div className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              🌐 ইংরেজি কণ্ঠ (English - {englishVoices.length})
                            </div>
                            {englishVoices.slice(0, 15).map((voice) => {
                              const isSelected = selectedVoiceURI === voice.voiceURI || selectedVoiceURI === voice.name;
                              return (
                                <button
                                  key={voice.voiceURI || voice.name}
                                  type="button"
                                  onClick={() => handleVoiceSelect(voice.voiceURI || voice.name)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium'
                                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <span className="font-medium text-stone-800 dark:text-stone-200">
                                      {voice.name}
                                    </span>
                                    <span className="ml-1 text-[10px] text-stone-400 font-mono">({voice.lang})</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interactive TTS Speed Control Setting */}
                  <div className="relative" ref={speedMenuRef}>
                    <button
                      type="button"
                      id={`ai-speed-select-btn-${message.id}`}
                      onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                      title={`সহকারীর পড়ার গতি নির্ধারণ করুন (বর্তমান গতি: ${speechSpeed.toFixed(2)}x)`}
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-all border-l border-stone-200 dark:border-stone-700 cursor-pointer ${
                        isSpeedMenuOpen
                          ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-700/50'
                      }`}
                    >
                      <Gauge className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-mono font-bold">{speechSpeed.toFixed(2)}x</span>
                      <ChevronDown className={`w-2.5 h-2.5 transition-transform opacity-70 ${isSpeedMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Speed Control Popover Panel */}
                    {isSpeedMenuOpen && (
                      <div className="absolute bottom-full mb-1.5 right-0 z-50 w-64 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 shadow-2xl text-xs animate-in fade-in zoom-in-95 duration-150 space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                          <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                            পড়ার গতি (TTS Speed)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {speechSpeed.toFixed(2)}x
                          </span>
                        </div>

                        {/* Speed Range Slider */}
                        <div className="space-y-1.5">
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.05"
                            value={speechSpeed}
                            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          />
                          <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                            <span>0.5x (ধীর)</span>
                            <span className="text-emerald-500 font-bold">0.85x (প্রাকৃতিক)</span>
                            <span>1.0x</span>
                            <span>2.0x (দ্রুত)</span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-4 gap-1 pt-1">
                          {[
                            { val: 0.75, lbl: '0.75x' },
                            { val: 0.85, lbl: '0.85x' },
                            { val: 1.0, lbl: '1.0x' },
                            { val: 1.25, lbl: '1.25x' },
                          ].map((preset) => {
                            const isSelected = Math.abs(speechSpeed - preset.val) < 0.02;
                            return (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => handleSpeedChange(preset.val)}
                                className={`py-1 rounded-lg text-center font-mono text-[11px] transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-500/50'
                                }`}
                              >
                                {preset.lbl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Active Audio Playback Bar */
                <div className="relative flex items-center gap-2 rounded-xl px-2.5 py-1.5 bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300/80 dark:border-emerald-700/70 text-xs shadow-xs animate-in fade-in duration-200 flex-wrap">
                  {/* Visual Audio Wave & Status */}
                  <div className="flex items-center gap-2 pr-1.5 border-r border-emerald-200 dark:border-emerald-800">
                    <span className="flex items-center gap-0.5 h-3.5" title={isPaused ? 'পজ রয়েছে' : 'ভয়েস চলছে'}>
                      <span className={`w-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400 ${!isPaused ? 'h-3.5 animate-bounce [animation-delay:-0.3s]' : 'h-1.5'}`} />
                      <span className={`w-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400 ${!isPaused ? 'h-2 animate-bounce [animation-delay:-0.15s]' : 'h-2.5'}`} />
                      <span className={`w-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400 ${!isPaused ? 'h-3.5 animate-bounce' : 'h-1.5'}`} />
                    </span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {isPaused ? 'পজ করা হয়েছে' : 'পড়ে শোনানো হচ্ছে...'}
                    </span>
                    {totalChunks > 1 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        {activeChunk + 1}/{totalChunks}
                      </span>
                    )}
                  </div>

                  {/* Previous Sentence Chunk */}
                  <button
                    type="button"
                    onClick={() => handleJumpChunk('prev')}
                    disabled={activeChunk <= 0}
                    title="পূর্ববর্তী বাক্য শুনুন"
                    className="p-1 rounded-md text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Pause / Resume Button */}
                  <button
                    id={`ai-pause-resume-btn-${message.id}`}
                    onClick={isPaused ? handleResumeSpeaking : handlePauseSpeaking}
                    title={isPaused ? 'চালিয়ে যান (Resume)' : 'পজ করুন (Pause)'}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>চালিয়ে যান</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>পজ</span>
                      </>
                    )}
                  </button>

                  {/* Next Sentence Chunk */}
                  <button
                    type="button"
                    onClick={() => handleJumpChunk('next')}
                    disabled={activeChunk >= totalChunks - 1}
                    title="পরবর্তী বাক্য শুনুন"
                    className="p-1 rounded-md text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Restart Speaking from beginning */}
                  <button
                    type="button"
                    onClick={handleRestartSpeaking}
                    title="প্রথম থেকে আবার শুনুন"
                    className="p-1 rounded-md text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Stop Button */}
                  <button
                    id={`ai-stop-btn-${message.id}`}
                    onClick={handleStopSpeaking}
                    title="ভয়েস পড়া থামান (Stop)"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-200/80 hover:bg-rose-100 dark:bg-stone-800 dark:hover:bg-rose-950/60 text-stone-700 hover:text-rose-700 dark:text-stone-300 dark:hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>থামান</span>
                  </button>

                  {/* Playback Speed selector while speaking */}
                  <div className="flex items-center gap-0.5 pl-1.5 border-l border-emerald-200 dark:border-emerald-800">
                    {[0.75, 0.85, 1, 1.25, 1.5].map((speed) => {
                      const isSelected = speechSpeed === speed;
                      return (
                        <button
                          key={speed}
                          id={`ai-active-speed-${speed}x-${message.id}`}
                          onClick={() => handleSpeedChange(speed)}
                          title={`গতি ${speed}x সেট করুন`}
                          className={`px-1.5 py-0.5 text-[11px] rounded transition-all font-mono cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                              : 'text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/40'
                          }`}
                        >
                          {speed}x
                        </button>
                      );
                    })}
                  </div>

                  {/* Voice Switcher in Active Bar */}
                  <div className="relative" ref={voiceMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                      title={`কণ্ঠ পরিবর্তন করুন (বর্তমান: ${detectedVoiceLabel || currentVoiceLabel})`}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100/80 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-700/60 transition-colors cursor-pointer"
                    >
                      <Languages className="w-3 h-3 text-emerald-700 dark:text-emerald-300 shrink-0" />
                      <span className="max-w-[80px] sm:max-w-[100px] truncate">{detectedVoiceLabel || currentVoiceLabel}</span>
                      <ChevronDown className={`w-2.5 h-2.5 transition-transform opacity-70 ${isVoiceMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isVoiceMenuOpen && (
                      <div className="absolute bottom-full mb-1.5 right-0 z-50 w-72 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-750 shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2 py-1.5 border-b border-stone-100 dark:border-stone-800 text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center justify-between">
                          <span>ভয়েস পরিবর্তন করুন</span>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                            {availableVoices.length > 0 ? `${availableVoices.length} টি কণ্ঠ` : 'স্বয়ংক্রিয়'}
                          </span>
                        </div>

                        {/* Auto detect */}
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => handleVoiceSelect('auto')}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                              selectedVoiceURI === 'auto'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-semibold">স্বয়ংক্রিয় (Auto Detect)</span>
                            </div>
                            {selectedVoiceURI === 'auto' && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </button>
                        </div>

                        {/* Bengali Voices */}
                        <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                          <div className="px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            🇧🇩 বাংলা কণ্ঠ ({bengaliVoices.length})
                          </div>
                          {bengaliVoices.length > 0 ? (
                            bengaliVoices.map((voice) => {
                              const isSelected = selectedVoiceURI === voice.voiceURI || selectedVoiceURI === voice.name;
                              return (
                                <button
                                  key={voice.voiceURI || voice.name}
                                  type="button"
                                  onClick={() => handleVoiceSelect(voice.voiceURI || voice.name)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium'
                                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <span className="font-medium text-stone-800 dark:text-stone-200">
                                      {voice.name}
                                    </span>
                                    <span className="ml-1 text-[10px] text-stone-400 font-mono">({voice.lang})</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <p className="px-2.5 py-1 text-[10px] text-stone-400 italic">
                              আলাদা বাংলা কণ্ঠ পাওয়া যায়নি
                            </p>
                          )}
                        </div>

                        {/* English Voices */}
                        {englishVoices.length > 0 && (
                          <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800">
                            <div className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              🌐 ইংরেজি কণ্ঠ (English - {englishVoices.length})
                            </div>
                            {englishVoices.slice(0, 15).map((voice) => {
                              const isSelected = selectedVoiceURI === voice.voiceURI || selectedVoiceURI === voice.name;
                              return (
                                <button
                                  key={voice.voiceURI || voice.name}
                                  type="button"
                                  onClick={() => handleVoiceSelect(voice.voiceURI || voice.name)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium'
                                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <span className="font-medium text-stone-800 dark:text-stone-200">
                                      {voice.name}
                                    </span>
                                    <span className="ml-1 text-[10px] text-stone-400 font-mono">({voice.lang})</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Current reading sentence preview */}
                  {currentReadingSentence && (
                    <div className="w-full mt-1.5 p-2 px-2.5 rounded-lg bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-800/80 text-xs text-emerald-950 dark:text-emerald-100 flex items-start gap-1.5 shadow-2xs">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium break-words">"{currentReadingSentence}"</span>
                    </div>
                  )}
                </div>
              )}

              {/* Speech warning if Web Speech API unsupported */}
              {speechWarning && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{speechWarning}</span>
                </div>
              )}

              {/* Markdown Download */}
              <button
                id={`ai-download-btn-${message.id}`}
                onClick={() => downloadAsFile(message.text, 'ai-response.md')}
                title="Markdown ফাইল হিসেবে ডাউনলোড করুন"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-stone-50 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-750 hover:border-stone-300 dark:hover:border-stone-650 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span>ডাউনলোড (.md)</span>
              </button>

              {/* Share AI Response to Social Media */}
              <button
                id={`ai-share-btn-${message.id}`}
                onClick={() => onShareMessage && onShareMessage(message.text)}
                title="বিভিন্ন মিডিয়া প্ল্যাটফর্মে এই উত্তরটি শেয়ার করুন"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-emerald-50 dark:bg-stone-850 dark:hover:bg-emerald-950/40 text-stone-600 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-300 border border-stone-200 dark:border-stone-750 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>শেয়ার</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
