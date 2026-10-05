import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Search,
  Youtube,
  Music,
  FileText,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  Home,
  Play,
  Check,
  Copy,
  Sparkles,
  Disc3,
  Headphones,
  AlertCircle,
  ArrowRight,
  Radio,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  History,
  ArrowLeft,
  Volume2,
  VolumeX,
  ShieldCheck,
  MessageSquare,
  Send,
  Link2,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useMiniBrowser } from '../context/MiniBrowserContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { ContinuousTTSPlayer } from '../utils/textToSpeech';
import { ChatSession } from '../types';

export interface MiniGoogleBrowserModalProps {
  activeSession?: ChatSession;
  onInsertIntoChat?: (text: string) => void;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  url: string;
  thumbnail: string;
}

interface SearchResult {
  title: string;
  url: string;
  domain?: string;
  snippet: string;
}

interface SearchResponse {
  query: string;
  instantAnswer?: string;
  knowledgeCard?: {
    title: string;
    subtitle?: string;
    description?: string;
    fields?: Array<{ label: string; value: string }>;
  };
  results: SearchResult[];
  youtubeMedia?: {
    videoId?: string;
    title?: string;
    artist?: string;
    watchUrl?: string;
    musicUrl?: string;
  };
  groundingSources?: Array<{ uri: string; title: string }>;
}

interface LyricsData {
  title: string;
  artist?: string;
  lyricsText: string;
}

interface HistoryEntry {
  tab: 'search' | 'youtube' | 'web' | 'lyrics';
  urlOrQuery: string;
  videoId?: string;
  videoTitle?: string;
  searchData?: SearchResponse | null;
  lyricsData?: LyricsData | null;
}

export const MiniGoogleBrowserModal: React.FC<MiniGoogleBrowserModalProps> = ({
  activeSession,
  onInsertIntoChat,
}) => {
  const {
    isOpen,
    closeBrowser,
    activeUrl,
    setActiveUrl,
    searchQuery,
    setSearchQuery,
    activeVideoId,
    activeVideoTitle,
    activeTab,
    setActiveTab,
    openYouTubeInBrowser,
    chatContext,
  } = useMiniBrowser();

  const [inputUrlOrQuery, setInputUrlOrQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chat context research states
  const [isChatContextOpen, setIsChatContextOpen] = useState(true);
  const [insertedFeedback, setInsertedFeedback] = useState<string | null>(null);

  // Web tab proxy & reader mode states
  const [webViewMode, setWebViewMode] = useState<'proxy' | 'reader'>('proxy');
  const [readerData, setReaderData] = useState<{ title: string; domain: string; content: string; url: string } | null>(null);
  const [isReaderLoading, setIsReaderLoading] = useState(false);
  const [isReaderSpeaking, setIsReaderSpeaking] = useState(false);

  // Track last handled query & url to avoid unnecessary repeated searches
  const lastHandledQueryRef = useRef<string | null>(null);
  const lastHandledUrlRef = useRef<string | null>(null);
  const lastHandledVideoRef = useRef<string | null>(null);

  const musicPlayer = useMusicPlayer();
  const [ytVideos, setYtVideos] = useState<YouTubeSearchResult[]>([]);
  const [isYtSearching, setIsYtSearching] = useState(false);
  const [ytSearchTerm, setYtSearchTerm] = useState('');

  // Local copy of active video for navigation history
  const [navVideoId, setNavVideoId] = useState<string | undefined>(activeVideoId);
  const [navVideoTitle, setNavVideoTitle] = useState<string | undefined>(activeVideoTitle);

  // Navigation History Stack
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Derive research topics and URLs from either passed activeSession or chatContext
  const currentChatResearch = React.useMemo(() => {
    const sessionTitle = activeSession?.title && activeSession.title !== 'নতুন কথোপকথন'
      ? activeSession.title
      : chatContext?.sessionTitle;

    const topicSet = new Set<string>();
    const urlList: Array<{ url: string; title: string }> = [];
    const seenUrls = new Set<string>();

    if (sessionTitle) topicSet.add(sessionTitle);
    if (chatContext?.currentPrompt) topicSet.add(chatContext.currentPrompt);
    if (chatContext?.topics) {
      chatContext.topics.forEach((t) => topicSet.add(t));
    }
    if (chatContext?.urls) {
      chatContext.urls.forEach((u) => {
        if (!seenUrls.has(u.url)) {
          seenUrls.add(u.url);
          urlList.push({ url: u.url, title: u.title || new URL(u.url).hostname });
        }
      });
    }

    if (activeSession?.messages) {
      activeSession.messages.forEach((msg) => {
        // Grounding chunks from Gemini
        msg.groundingChunks?.forEach((chunk) => {
          if (chunk.web?.uri && !seenUrls.has(chunk.web.uri)) {
            seenUrls.add(chunk.web.uri);
            urlList.push({
              url: chunk.web.uri,
              title: chunk.web.title || new URL(chunk.web.uri).hostname,
            });
          }
        });

        // Search queries from Gemini
        msg.searchQueries?.forEach((sq) => {
          if (sq && sq.trim()) topicSet.add(sq.trim());
        });

        // Any URLs in message text
        const foundUrls = msg.text.match(/https?:\/\/[^\s)<>"']+/g);
        if (foundUrls) {
          foundUrls.forEach((u) => {
            const cleanU = u.replace(/[.,;!?]+$/, '');
            if (!seenUrls.has(cleanU)) {
              try {
                seenUrls.add(cleanU);
                urlList.push({ url: cleanU, title: new URL(cleanU).hostname });
              } catch (_) {}
            }
          });
        }

        // Recent user questions (topics discussed)
        if (msg.role === 'user' && msg.text.trim()) {
          const firstLine = msg.text.trim().split('\n')[0];
          if (firstLine.length > 4 && firstLine.length < 80) {
            topicSet.add(firstLine);
          }
        }
      });
    }

    const topics = Array.from(topicSet).slice(0, 10);
    const urls = urlList.slice(0, 10);

    return {
      title: sessionTitle,
      topics,
      urls,
      hasContext: Boolean(sessionTitle || topics.length > 0 || urls.length > 0),
    };
  }, [activeSession, chatContext]);

  const handleInsertReference = (title: string, url: string, snippet?: string) => {
    const referenceText = snippet 
      ? `> **[${title}](${url})**\n> ${snippet}\n`
      : `[${title}](${url})`;

    if (onInsertIntoChat) {
      onInsertIntoChat(referenceText);
      setInsertedFeedback('চ্যাটে রেফারেন্স যোগ হয়েছে!');
      setTimeout(() => setInsertedFeedback(null), 2500);
    } else {
      navigator.clipboard.writeText(referenceText);
      setInsertedFeedback('রেফারেন্স লিঙ্ক কপি হয়েছে!');
      setTimeout(() => setInsertedFeedback(null), 2500);
    }
  };

  const handleSelectChatTopic = (topic: string) => {
    setInputUrlOrQuery(topic);
    setActiveTab('search');
    handleSearch(topic, true);
  };

  const handleSelectChatUrl = (url: string) => {
    setInputUrlOrQuery(url);
    setActiveUrl(url);
    setActiveTab('web');
    pushHistory({
      tab: 'web',
      urlOrQuery: url,
    });
  };

  // Dedicated YouTube searcher
  const handleSearchYouTube = useCallback(async (term: string) => {
    const q = term.trim();
    if (!q) return;
    setIsYtSearching(true);
    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos) && data.videos.length > 0) {
          setYtVideos(data.videos);
        }
      }
    } catch (err) {
      console.warn('YouTube search error:', err);
    } finally {
      setIsYtSearching(false);
    }
  }, []);

  // Helper to push history entry
  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      // Discard any forward history if user navigated from a middle state
      const truncated = prev.slice(0, historyIndex + 1);
      const last = truncated[truncated.length - 1];
      // Avoid pushing immediate duplicates
      if (
        last &&
        last.tab === entry.tab &&
        last.urlOrQuery === entry.urlOrQuery &&
        last.videoId === entry.videoId
      ) {
        return truncated;
      }
      return [...truncated, entry];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Sync state when modal opens or external query/videoId is passed
  useEffect(() => {
    if (isOpen) {
      if (activeVideoId && activeVideoId !== lastHandledVideoRef.current) {
        lastHandledVideoRef.current = activeVideoId;
        setNavVideoId(activeVideoId);
        setNavVideoTitle(activeVideoTitle || 'ইউটিউব গান / ভিডিও');
        const url = `https://www.youtube.com/watch?v=${activeVideoId}`;
        setInputUrlOrQuery(url);
        const entry: HistoryEntry = {
          tab: 'youtube',
          urlOrQuery: url,
          videoId: activeVideoId,
          videoTitle: activeVideoTitle,
        };
        pushHistory(entry);
        handleSearchYouTube(activeVideoTitle || 'Zack Knight Dheere');
      } else if (searchQuery && searchQuery !== lastHandledQueryRef.current) {
        lastHandledQueryRef.current = searchQuery;
        setInputUrlOrQuery(searchQuery);
        handleSearch(searchQuery, true);
        handleSearchYouTube(searchQuery);
      } else if (activeUrl && activeUrl !== 'https://www.google.com' && activeUrl !== lastHandledUrlRef.current) {
        lastHandledUrlRef.current = activeUrl;
        setInputUrlOrQuery(activeUrl);
        const entry: HistoryEntry = {
          tab: 'web',
          urlOrQuery: activeUrl,
        };
        pushHistory(entry);
      } else if (history.length === 0) {
        // Default Google Search Home
        const defaultEntry: HistoryEntry = {
          tab: 'search',
          urlOrQuery: 'Google Search',
        };
        setHistory([defaultEntry]);
        setHistoryIndex(0);
        setInputUrlOrQuery('Google Search');
        handleSearch('Google Search', false);
        handleSearchYouTube('Zack Knight Dheere');
      }
    } else {
      lastHandledQueryRef.current = null;
      lastHandledUrlRef.current = null;
      lastHandledVideoRef.current = null;
    }
  }, [isOpen, activeVideoId, searchQuery, activeUrl, handleSearchYouTube]);

  const loadReaderContent = useCallback(async (urlToRead: string) => {
    if (!urlToRead) return;
    setIsReaderLoading(true);
    try {
      const res = await fetch(`/api/proxy/reader?url=${encodeURIComponent(urlToRead)}`);
      if (res.ok) {
        const data = await res.json();
        setReaderData(data);
      } else {
        setReaderData({
          title: 'ওয়েব পেজ',
          domain: new URL(urlToRead).hostname,
          content: 'ওয়েব পেজের টেক্সট এক্সট্র্যাক্ট করা যায়নি। সম্পূর্ণ পেজ দেখতে লাইভ ওয়েব মোড ব্যবহার করুন।',
          url: urlToRead,
        });
      }
    } catch {
      setReaderData({
        title: 'ওয়েব পেজ',
        domain: urlToRead,
        content: 'লোড করতে সমস্যা হয়েছে। লাইভ ব্রাউজারে অথবা নতুন ট্যাবে খুলুন।',
        url: urlToRead,
      });
    } finally {
      setIsReaderLoading(false);
    }
  }, []);

  const readerPlayerRef = useRef<ContinuousTTSPlayer | null>(null);

  useEffect(() => {
    if (activeTab === 'web' && webViewMode === 'reader' && activeUrl) {
      loadReaderContent(activeUrl);
    }
  }, [activeTab, webViewMode, activeUrl, loadReaderContent]);

  useEffect(() => {
    return () => {
      readerPlayerRef.current?.stop();
    };
  }, []);

  const handleToggleSpeakReader = () => {
    if (isReaderSpeaking) {
      readerPlayerRef.current?.stop();
      setIsReaderSpeaking(false);
      return;
    }
    if (!readerData?.content) return;
    const speed = parseFloat(localStorage.getItem('ai_preferred_tts_speed') || '0.85');
    readerPlayerRef.current = new ContinuousTTSPlayer({
      speed,
      onStateChange: (speaking) => setIsReaderSpeaking(speaking),
      onComplete: () => setIsReaderSpeaking(false),
      onError: () => setIsReaderSpeaking(false),
    });
    setIsReaderSpeaking(true);
    readerPlayerRef.current.play(readerData.content, 0);
  };

  const handleSearch = async (queryText: string, addToHistory: boolean = true) => {
    const q = queryText.trim();
    if (!q) return;

    setIsLoading(true);
    setActiveTab('search');
    try {
      const res = await fetch('/api/mini-browser/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setSearchData(data);
        if (data.youtubeMedia?.videoId) {
          setNavVideoId(data.youtubeMedia.videoId);
          setNavVideoTitle(data.youtubeMedia.title);
        }
        if (addToHistory) {
          pushHistory({
            tab: 'search',
            urlOrQuery: q,
            searchData: data,
            videoId: data.youtubeMedia?.videoId,
            videoTitle: data.youtubeMedia?.title,
          });
        }
      }
    } catch (err) {
      console.warn('Mini browser search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchLyrics = async (
    title: string,
    artist?: string,
    vid?: string,
    addToHistory: boolean = true
  ) => {
    setIsLyricsLoading(true);
    setActiveTab('lyrics');
    try {
      const res = await fetch('/api/mini-browser/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songTitle: title, artist, videoId: vid }),
      });
      if (res.ok) {
        const data: LyricsData = await res.json();
        setLyricsData(data);
        if (addToHistory) {
          pushHistory({
            tab: 'lyrics',
            urlOrQuery: title,
            videoId: vid,
            videoTitle: title,
            lyricsData: data,
          });
        }
      }
    } catch (err) {
      console.warn('Lyrics fetch failed:', err);
    } finally {
      setIsLyricsLoading(false);
    }
  };

  // Navigate to specific history entry
  const applyHistoryEntry = (entry: HistoryEntry) => {
    setInputUrlOrQuery(entry.urlOrQuery);
    setActiveTab(entry.tab);

    if (entry.videoId) {
      setNavVideoId(entry.videoId);
      setNavVideoTitle(entry.videoTitle);
    }

    if (entry.tab === 'search') {
      if (entry.searchData) {
        setSearchData(entry.searchData);
      } else {
        handleSearch(entry.urlOrQuery, false);
      }
    } else if (entry.tab === 'lyrics') {
      if (entry.lyricsData) {
        setLyricsData(entry.lyricsData);
      } else {
        handleFetchLyrics(entry.urlOrQuery, undefined, entry.videoId, false);
      }
    } else if (entry.tab === 'web') {
      setActiveUrl(entry.urlOrQuery);
    }
  };

  // Back Button
  const canGoBack = historyIndex > 0;
  const handleGoBack = useCallback(() => {
    if (canGoBack) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      applyHistoryEntry(history[newIdx]);
    }
  }, [canGoBack, historyIndex, history]);

  // Forward Button
  const canGoForward = historyIndex >= 0 && historyIndex < history.length - 1;
  const handleGoForward = useCallback(() => {
    if (canGoForward) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      applyHistoryEntry(history[newIdx]);
    }
  }, [canGoForward, historyIndex, history]);

  // Refresh Button
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);

    try {
      if (activeTab === 'search') {
        const q = inputUrlOrQuery.trim() || 'Google Search';
        await handleSearch(q, false);
      } else if (activeTab === 'lyrics') {
        const title = navVideoTitle || inputUrlOrQuery || 'গান';
        await handleFetchLyrics(title, undefined, navVideoId, false);
      } else if (activeTab === 'youtube') {
        // Trigger key increment so iframe reloads smoothly
        setRefreshKey((k) => k + 1);
      } else if (activeTab === 'web') {
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [activeTab, inputUrlOrQuery, navVideoTitle, navVideoId]);

  // Home Button
  const handleGoHome = () => {
    setInputUrlOrQuery('https://www.google.com');
    setActiveTab('search');
    handleSearch('Google Search', true);
  };

  // Keyboard Navigation Shortcuts (Alt+Left, Alt+Right, F5 / Ctrl+R)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts if typing in text inputs (except Alt+Left/Right)
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Alt + Left Arrow -> Back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
        return;
      }
      // Alt + Right Arrow -> Forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
        return;
      }
      // F5 or Ctrl+R (when modal focused) -> Refresh modal without full page reload
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r' && !isInput)) {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleGoBack, handleGoForward, handleRefresh]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputUrlOrQuery.trim();
    if (!val) return;

    // Check if user entered a direct YouTube link
    const ytMatch = val.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) {
      const vid = ytMatch[1];
      setNavVideoId(vid);
      setNavVideoTitle('ইউটিউব গান / ভিডিও');
      setActiveTab('youtube');
      pushHistory({
        tab: 'youtube',
        urlOrQuery: val,
        videoId: vid,
        videoTitle: 'ইউটিউব গান / ভিডিও',
      });
      return;
    }

    // If it's a google domain, switch to search tab
    if (/^https?:\/\/(?:www\.)?google\.[a-z.]+(?:\/)?$/i.test(val)) {
      setActiveTab('search');
      return;
    }
    const googleQueryMatch = val.match(/^https?:\/\/(?:www\.)?google\.[a-z.]+\/search\?.*q=([^&]+)/i);
    if (googleQueryMatch) {
      const q = decodeURIComponent(googleQueryMatch[1].replace(/\+/g, ' '));
      setInputUrlOrQuery(q);
      handleSearch(q, true);
      return;
    }

    if (val.startsWith('http://') || val.startsWith('https://')) {
      setActiveUrl(val);
      setActiveTab('web');
      pushHistory({
        tab: 'web',
        urlOrQuery: val,
      });
    } else if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(\/.*)?$/i.test(val)) {
      const fullUrl = `https://${val}`;
      setActiveUrl(fullUrl);
      setActiveTab('web');
      pushHistory({
        tab: 'web',
        urlOrQuery: fullUrl,
      });
    } else {
      handleSearch(val, true);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const currentVideoId = navVideoId || activeVideoId || searchData?.youtubeMedia?.videoId;
  const currentSongTitle = navVideoTitle || activeVideoTitle || searchData?.youtubeMedia?.title || searchData?.knowledgeCard?.title || inputUrlOrQuery || 'গান / মিউজিক';
  const watchUrl = currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(currentSongTitle)}`;
  const musicUrl = currentVideoId ? `https://music.youtube.com/watch?v=${currentVideoId}` : `https://music.youtube.com/search?q=${encodeURIComponent(currentSongTitle)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-stone-900 border border-stone-750 text-stone-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none sm:rounded-xl'
            : 'w-full max-w-4xl h-[90vh] max-h-[820px]'
        }`}
      >
        {/* Browser Top Titlebar (Chrome / Safari style) */}
        <div className="px-3.5 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Window control dots */}
            <div className="flex items-center gap-1.5 mr-2">
              <button
                type="button"
                onClick={closeBrowser}
                className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors"
                title="বন্ধ করুন"
              />
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors"
                title={isFullscreen ? 'ছোট করুন' : 'বড় করুন'}
              />
              <button
                type="button"
                onClick={() => window.open(watchUrl, '_blank')}
                className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors"
                title="ব্রাউজারে খুলুন"
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-stone-900/90 p-0.5 rounded-lg border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('youtube');
                  pushHistory({
                    tab: 'youtube',
                    urlOrQuery: watchUrl,
                    videoId: currentVideoId,
                    videoTitle: currentSongTitle,
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'youtube'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <Youtube className="w-3.5 h-3.5 text-white" />
                <span>ইউটিউব ও মিউজিক</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('search');
                  pushHistory({
                    tab: 'search',
                    urlOrQuery: inputUrlOrQuery || 'Google Search',
                    searchData,
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'search'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-white" />
                <span>গুগল সার্চ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!lyricsData) {
                    handleFetchLyrics(currentSongTitle, undefined, currentVideoId, true);
                  } else {
                    setActiveTab('lyrics');
                    pushHistory({
                      tab: 'lyrics',
                      urlOrQuery: currentSongTitle,
                      videoId: currentVideoId,
                      videoTitle: currentSongTitle,
                      lyricsData,
                    });
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'lyrics'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>লিরিক্স ও তথ্য</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={closeBrowser}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              title="চ্যাটে ফিরে যান (Back)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ফিরে যান</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-750 text-stone-300 transition-colors"
              title={isFullscreen ? 'রিস্টোর করুন' : 'ফুলস্ক্রিন করুন'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={closeBrowser}
              className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-rose-900/60 text-stone-300 hover:text-rose-200 transition-colors"
              title="বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Omnibox / Browser Navigation Toolbar */}
        <div className="p-2.5 bg-stone-900 border-b border-stone-800 flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Navigation Controls Group: Back, Forward, Refresh, Home */}
          <div className="flex items-center gap-1 shrink-0 bg-stone-950/70 p-1 rounded-xl border border-stone-800">
            {/* 1. BACK BUTTON */}
            <button
              type="button"
              onClick={handleGoBack}
              disabled={!canGoBack}
              title="পেছনে যান (Back - Alt+Left)"
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 2. FORWARD BUTTON */}
            <button
              type="button"
              onClick={handleGoForward}
              disabled={!canGoForward}
              title="সামনে যান (Forward - Alt+Right)"
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* 3. REFRESH / RELOAD BUTTON */}
            <button
              type="button"
              onClick={handleRefresh}
              title="রিফ্রেশ করুন (Refresh / Reload)"
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${
                  isLoading || isRefreshing || isLyricsLoading ? 'animate-spin text-blue-400' : ''
                }`}
              />
            </button>

            {/* 4. HOME BUTTON */}
            <button
              type="button"
              onClick={handleGoHome}
              title="গুগল হোম (Home)"
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibox / Search & Address Input */}
          <form onSubmit={handleFormSubmit} className="flex-1 flex items-center relative min-w-0">
            <div className="absolute left-3 flex items-center gap-1.5 text-stone-400 pointer-events-none">
              <span className="font-bold text-blue-400 text-xs">G</span>
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={inputUrlOrQuery}
              onChange={(e) => setInputUrlOrQuery(e.target.value)}
              placeholder="গুগলে খুঁজুন বা ইউটিউব লিঙ্ক পেস্ট করুন (যেমন: https://youtu.be/...)"
              className="w-full pl-12 pr-28 py-2 rounded-xl bg-stone-950 border border-stone-750 focus:border-blue-500 focus:outline-hidden text-xs text-stone-100 placeholder-stone-500 transition-all font-sans"
            />

            {/* History Position Indicator & Submit Button */}
            <div className="absolute right-1.5 flex items-center gap-1">
              {history.length > 1 && (
                <span
                  className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-stone-800/80 text-[10px] text-stone-400 font-mono"
                  title={`হিস্টোরি অবস্থান: ${historyIndex + 1} / ${history.length}`}
                >
                  <History className="w-2.5 h-2.5 text-stone-500" />
                  <span>{historyIndex + 1}/{history.length}</span>
                </span>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <span>খুঁজুন</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* External Browser Launcher */}
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="সরাসরি মূল ব্রাউজারে খুলুন"
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 💬 CHAT CONTEXT RESEARCH BAR */}
        {currentChatResearch.hasContext && (
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-blue-950/40 via-stone-900 to-stone-950 border-b border-blue-900/40 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-blue-300 shrink-0">
                  চ্যাট প্রসঙ্গ:
                </span>
                <span
                  className="text-xs font-medium text-stone-200 truncate max-w-[220px] sm:max-w-[360px]"
                  title={currentChatResearch.title || 'চলমান কথোপকথন'}
                >
                  {currentChatResearch.title || 'চলমান কথোপকথন'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {insertedFeedback && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 animate-in fade-in">
                    {insertedFeedback}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatContextOpen(!isChatContextOpen)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{isChatContextOpen ? 'সংক্ষিপ্ত করুন' : 'প্রদর্শন করুন'}</span>
                  {isChatContextOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {isChatContextOpen && (
              <div className="space-y-1.5 pt-0.5">
                {/* 1. Topics and Prompts from this chat */}
                {currentChatResearch.topics.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <span className="text-[10px] text-stone-400 uppercase font-bold shrink-0">
                      টপিক:
                    </span>
                    {currentChatResearch.topics.map((topic, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectChatTopic(topic)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs shrink-0 transition-all cursor-pointer font-sans shadow-2xs hover:scale-102"
                        title={`গুগলে '${topic}' সার্চ করুন`}
                      >
                        <Search className="w-2.5 h-2.5 text-blue-400" />
                        <span className="max-w-[180px] sm:max-w-[260px] truncate">{topic}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Detected Links and Sources from this chat */}
                {currentChatResearch.urls.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold shrink-0">
                      লিংক:
                    </span>
                    {currentChatResearch.urls.map((linkObj, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectChatUrl(linkObj.url)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] shrink-0 transition-all cursor-pointer font-sans hover:scale-102"
                        title={`${linkObj.url} ওপেন করুন`}
                      >
                        <Globe className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="max-w-[170px] truncate">{linkObj.title || linkObj.url}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="px-3 py-1.5 bg-stone-950/60 border-b border-stone-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 scrollbar-none">
          <span className="text-stone-500 text-[10px] uppercase font-semibold shrink-0">জনপ্রিয়:</span>
          {[
            { label: '🎵 Zack Knight - Dheere', query: 'https://youtu.be/Vny_75WmEH4?si=CnMSNOnq_rgEuf17' },
            { label: '🇧🇩 আমার সোনার বাংলা', query: 'আমার সোনার বাংলা গান' },
            { label: '🎧 ইউটিউব মিউজিক ট্রেন্ডিং', query: 'YouTube Music Top Songs' },
            { label: '📰 আজকের খবর', query: 'বাংলাদেশ আজকের খবর' },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputUrlOrQuery(item.query);
                if (item.query.startsWith('http')) {
                  const ytMatch = item.query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
                  if (ytMatch) {
                    const vid = ytMatch[1];
                    setNavVideoId(vid);
                    setNavVideoTitle(item.label);
                    setActiveTab('youtube');
                    pushHistory({
                      tab: 'youtube',
                      urlOrQuery: item.query,
                      videoId: vid,
                      videoTitle: item.label,
                    });
                  }
                } else {
                  handleSearch(item.query, true);
                }
              }}
              className="px-2 py-0.5 rounded-full bg-stone-800/70 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors shrink-0 border border-stone-700/60 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Browser Viewport Content Area */}
        <div className="flex-1 overflow-y-auto bg-stone-950 p-4 space-y-4">
          {/* TAB 1: YOUTUBE & MUSIC WEB PLAYER */}
          {activeTab === 'youtube' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Media Title & Author Banner */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-red-950/40 via-stone-900 to-stone-900 border border-red-500/20 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-red-600/30">
                    <Music className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {currentSongTitle}
                    </h3>
                    <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                        <Youtube className="w-3 h-3" />
                        <span>ইউটিউব মিউজিক স্ট্রিম</span>
                      </span>
                      {currentVideoId && (
                        <span className="font-mono text-[10px] text-stone-500">ID: {currentVideoId}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(watchUrl)}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white text-xs transition-colors"
                    title="লিংক কপি করুন"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-md shadow-red-600/20"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>ইউটিউব অ্যাপে খুলুন</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Embedded Player */}
              {currentVideoId ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-stone-800 shadow-2xl">
                  <iframe
                    key={`yt-${currentVideoId}-${refreshKey}`}
                    src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
                    title="YouTube Video Player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-stone-900 border border-stone-800 text-stone-400 space-y-2">
                  <Disc3 className="w-8 h-8 text-red-500 mx-auto animate-spin" />
                  <p className="text-sm">ইউটিউব ভিডিও বা গানের লিংক উপরে দিয়ে সার্চ করুন।</p>
                </div>
              )}

              {/* T-Series & Copyright Restricted Fallback Card */}
              <div className="p-4 rounded-2xl bg-stone-900/90 border border-amber-500/30 text-stone-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                      কপিরাইট সীমাবদ্ধতা ও নিরবচ্ছিন্ন শোনার নিশ্চয়তা:
                    </h4>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      অনেক অফিসিয়াল মিউজিক লেবেল (যেমন T-Series, Sony, VEVO) তাদের গানের ভিডিও অন্য ওয়েবসাইটে সরাসরি এম্বেড প্লেব্যাক বন্ধ রাখে। সেজন্য নিচের যে কোনো বিকল্প দিয়ে মুহূর্তে গানটি চালানো সম্ভব:
                    </p>
                  </div>
                </div>

                {/* Direct Action Launchers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs transition-all shadow-md shadow-red-600/25"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>ইউটিউব ও ভিডিও শুনুন</span>
                  </a>

                  <a
                    href={musicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-stone-800 to-stone-750 hover:bg-stone-700 text-stone-100 font-semibold text-xs border border-stone-700 transition-all shadow-md"
                  >
                    <Headphones className="w-4 h-4 text-rose-400" />
                    <span>YouTube Music (অডিও)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      handleFetchLyrics(currentSongTitle, undefined, currentVideoId, true);
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:brightness-110 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>লিরিক্স ও গানটির অর্থ</span>
                  </button>
                </div>
              </div>

              {/* Verified YouTube Videos List inside App */}
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                      <Youtube className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        ইউটিউব থেকে আসল ও ভেরিফাইড ভিডিও/গান
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        অ্যাপের ভেতরে সরাসরি চালাতে যেকোনো গানে ক্লিক করুন
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSearchYouTube(ytSearchTerm || currentSongTitle);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={ytSearchTerm}
                      onChange={(e) => setYtSearchTerm(e.target.value)}
                      placeholder="অন্য কোনো গান বা শিল্পী..."
                      className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-red-500 w-full sm:w-56"
                    />
                    <button
                      type="submit"
                      disabled={isYtSearching}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isYtSearching ? '...' : 'খুঁজুন'}</span>
                    </button>
                  </form>
                </div>

                {isYtSearching ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-stone-400">ইউটিউব থেকে আসল লিঙ্ক সংগ্রহ করা হচ্ছে...</p>
                  </div>
                ) : ytVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {ytVideos.map((video) => (
                      <div
                        key={video.videoId}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-850 border border-stone-800 transition-all group"
                      >
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-black shrink-0">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.videoId}/0.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-5 h-5 text-white fill-current drop-shadow-md" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h5 className="text-xs font-semibold text-white truncate leading-tight" title={video.title}>
                            {video.title}
                          </h5>
                          <p className="text-[11px] text-stone-400 truncate">
                            {video.author}
                          </p>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setNavVideoId(video.videoId);
                                setNavVideoTitle(video.title);
                                pushHistory({
                                  tab: 'youtube',
                                  urlOrQuery: video.url,
                                  videoId: video.videoId,
                                  videoTitle: video.title,
                                });
                              }}
                              className="px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>এখানে চালান</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                musicPlayer.playVideoId(video.videoId, video.title, { autoPlay: true });
                              }}
                              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-750 text-stone-200 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="ব্যাকগ্রাউন্ড প্লেয়ারে চালান"
                            >
                              <Music className="w-2.5 h-2.5 text-rose-400" />
                              <span>প্লেয়ারে</span>
                            </button>
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md bg-stone-800 hover:bg-stone-750 text-stone-400 hover:text-white text-[10px] transition-colors"
                              title="সরাসরি ইউটিউবে দেখুন"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-stone-400 space-y-2">
                    <Disc3 className="w-6 h-6 text-red-500/50 mx-auto" />
                    <p>অন্য কোনো গান খুঁজতে উপরের বক্সে গানের নাম লিখে "খুঁজুন" চাপুন।</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SEARCH RESULTS */}
          {activeTab === 'search' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {isLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-stone-400">গুগল থেকে রিয়েল-টাইম তথ্য এবং লিঙ্ক খোঁজা হচ্ছে...</p>
                </div>
              ) : searchData ? (
                <>
                  {/* Instant Answer / AI Summary */}
                  {searchData.instantAnswer && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-stone-900 to-stone-900 border border-blue-500/30 shadow-md space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                        <Sparkles className="w-4 h-4" />
                        <span>Google Search Instant Overview</span>
                      </div>
                      <p className="text-sm text-stone-200 leading-relaxed">
                        {searchData.instantAnswer}
                      </p>
                    </div>
                  )}

                  {/* Knowledge Card if available */}
                  {searchData.knowledgeCard && (
                    <div className="p-4 rounded-2xl bg-stone-900 border border-stone-750 shadow-md space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {searchData.knowledgeCard.title}
                        </h3>
                        {searchData.knowledgeCard.subtitle && (
                          <p className="text-xs text-blue-400 font-medium">
                            {searchData.knowledgeCard.subtitle}
                          </p>
                        )}
                      </div>
                      {searchData.knowledgeCard.description && (
                        <p className="text-xs text-stone-300 leading-relaxed">
                          {searchData.knowledgeCard.description}
                        </p>
                      )}
                      {searchData.knowledgeCard.fields && searchData.knowledgeCard.fields.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800 text-xs">
                          {searchData.knowledgeCard.fields.map((f, i) => (
                            <div key={i}>
                              <span className="text-stone-400 font-medium">{f.label}: </span>
                              <span className="text-stone-200 font-semibold">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* YouTube Music Quick Launcher in Search */}
                  {searchData.youtubeMedia && searchData.youtubeMedia.videoId && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/40 to-stone-900 border border-red-500/30 flex items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0">
                          <Youtube className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {searchData.youtubeMedia.title || currentSongTitle}
                          </h4>
                          <p className="text-[11px] text-stone-400 truncate">
                            {searchData.youtubeMedia.artist || 'অফিসিয়াল মিউজিক ভিডিও'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (searchData.youtubeMedia?.videoId) {
                              setNavVideoId(searchData.youtubeMedia.videoId);
                              setNavVideoTitle(searchData.youtubeMedia.title);
                              setActiveTab('youtube');
                              pushHistory({
                                tab: 'youtube',
                                urlOrQuery: `https://www.youtube.com/watch?v=${searchData.youtubeMedia.videoId}`,
                                videoId: searchData.youtubeMedia.videoId,
                                videoTitle: searchData.youtubeMedia.title,
                              });
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>এখানে চালান</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Organic Search Results List */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-semibold uppercase text-stone-400 tracking-wider">
                      সার্চ রেজাল্ট ({searchData.results.length}):
                    </h4>
                    {searchData.results.map((res, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-stone-900 hover:bg-stone-850 border border-stone-800 transition-colors group space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-stone-400 font-mono truncate">
                            {res.domain || new URL(res.url).hostname}
                          </span>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-400 group-hover:text-blue-400 transition-colors shrink-0"
                            title="নতুন ট্যাবে খুলুন"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUrl(res.url);
                            setActiveTab('web');
                            pushHistory({
                              tab: 'web',
                              urlOrQuery: res.url,
                            });
                          }}
                          className="text-sm font-semibold text-blue-400 hover:underline block text-left cursor-pointer"
                        >
                          {res.title}
                        </button>
                        <p className="text-xs text-stone-300 leading-relaxed">
                          {res.snippet}
                        </p>
                        <div className="flex items-center gap-2 pt-1 border-t border-stone-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveUrl(res.url);
                              setActiveTab('web');
                              pushHistory({
                                tab: 'web',
                                urlOrQuery: res.url,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            <Globe className="w-3 h-3" />
                            <span>এখানে পড়ুন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertReference(res.title, res.url, res.snippet)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white border border-stone-700/80 text-[11px] font-medium transition-colors cursor-pointer"
                            title="চ্যাটে রেফারেন্স সাইটেশন যোগ করুন"
                          >
                            <Send className="w-3 h-3 text-blue-400" />
                            <span>চ্যাটে পাঠান</span>
                          </button>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-stone-400 hover:text-stone-200 text-[11px] transition-colors ml-auto"
                          >
                            <span>নতুন ট্যাবে</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <Search className="w-10 h-10 text-stone-600 mx-auto" />
                  <p className="text-sm text-stone-400">উপরে আপনার কাঙ্ক্ষিত বিষয় বা গান লিখে সার্চ করুন।</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LYRICS & DETAILS */}
          {activeTab === 'lyrics' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {isLyricsLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-stone-400">গানের লিরিক্স এবং অর্থ সংগ্রহ করা হচ্ছে...</p>
                </div>
              ) : lyricsData ? (
                <div className="p-5 rounded-2xl bg-stone-900 border border-purple-500/30 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {lyricsData.title}
                      </h3>
                      {lyricsData.artist && (
                        <p className="text-xs text-purple-400 font-medium">{lyricsData.artist}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(lyricsData.lyricsText)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'কপি হয়েছে' : 'লিরিক্স কপি'}</span>
                    </button>
                  </div>
                  <div className="prose prose-invert prose-stone max-w-none text-xs sm:text-sm text-stone-200 leading-relaxed font-sans">
                    <Markdown>{lyricsData.lyricsText}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <FileText className="w-10 h-10 text-stone-600 mx-auto" />
                  <p className="text-sm text-stone-400">গানের লিরিক্স দেখতে উপরে গানের নাম দিয়ে সার্চ করুন।</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WEB READER & PROXY BROWSER */}
          {activeTab === 'web' && (
            <div className="max-w-4xl mx-auto space-y-3 flex-1 flex flex-col min-h-0">
              {/* Web Header Toolbar */}
              <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    HTTPS
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-stone-200 truncate" title={activeUrl}>
                      {activeUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* View Mode Switcher */}
                  <div className="flex items-center rounded-xl bg-stone-950 p-0.5 border border-stone-800">
                    <button
                      type="button"
                      onClick={() => setWebViewMode('proxy')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        webViewMode === 'proxy'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>লাইভ ওয়েব</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWebViewMode('reader')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        webViewMode === 'reader'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>রিডার ভিউ</span>
                    </button>
                  </div>

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={() => {
                      setRefreshKey((k) => k + 1);
                      if (webViewMode === 'reader') loadReaderContent(activeUrl);
                    }}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title="রিলোড / রিফ্রেশ"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeUrl)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title="লিঙ্ক কপি করুন"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertReference(readerData?.title || activeUrl, activeUrl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-blue-400 hover:text-blue-300 border border-stone-700 hover:border-blue-500/40 text-xs font-medium transition-colors cursor-pointer"
                    title="চলমান চ্যাটে এই লিঙ্ক ও রেফারেন্স যোগ করুন"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">চ্যাটে রেফারেন্স</span>
                  </button>
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                    title="নতুন ট্যাবে খুলুন"
                  >
                    <span>নতুন ট্যাবে খুলুন</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Mode 1: Live Web View through Server Proxy (Bypasses X-Frame-Options) */}
              {webViewMode === 'proxy' && (
                <div className="space-y-2 flex-1 flex flex-col">
                  <div className="h-[460px] sm:h-[520px] w-full rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 relative shadow-inner">
                    <iframe
                      key={`web-proxy-${activeUrl}-${refreshKey}`}
                      src={`/api/proxy?url=${encodeURIComponent(activeUrl)}`}
                      title="Web Proxy Viewer"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>

                  {/* Informational Proxy Notice */}
                  <div className="p-3 rounded-xl bg-stone-900 border border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-400">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        ইন-অ্যাপ ক্লাউড প্রক্সি সক্রিয়: যেকোনো ওয়েবসাইটের X-Frame-Options ও ফ্রেম ব্লকিং দূর করে সরাসরি অ্যাপের ভেতরে রেন্ডার করা হচ্ছে।
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setWebViewMode('reader')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-[11px] border border-emerald-500/20 transition-colors cursor-pointer"
                      >
                        স্মার্ট রিডার ভিউ 📖
                      </button>
                      <a
                        href={activeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>সরাসরি সাইট</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Clean Reader View */}
              {webViewMode === 'reader' && (
                <div className="p-5 rounded-2xl bg-stone-900 border border-emerald-500/30 space-y-4 shadow-lg min-h-[420px]">
                  {isReaderLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-stone-400">ওয়েব পেজের টেক্সট বিশ্লেষণ ও এক্সট্র্যাক্ট করা হচ্ছে...</p>
                    </div>
                  ) : readerData ? (
                    <div className="space-y-4">
                      {/* Reader Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                            {readerData.title}
                          </h3>
                          <p className="text-xs text-emerald-400 font-mono mt-0.5">{readerData.domain}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleToggleSpeakReader}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                              isReaderSpeaking
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {isReaderSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            <span>{isReaderSpeaking ? 'থামান' : 'পড়ে শোনান'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(readerData.content)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs transition-colors cursor-pointer"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'কপি হয়েছে' : 'টেক্সট কপি'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setWebViewMode('proxy')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors cursor-pointer"
                          >
                            লাইভ ওয়েব দেখুন
                          </button>
                        </div>
                      </div>

                      {/* Clean Text Content */}
                      <div className="prose prose-invert prose-stone max-w-none text-xs sm:text-sm text-stone-200 leading-relaxed font-sans whitespace-pre-line space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {readerData.content}
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center space-y-3">
                      <BookOpen className="w-10 h-10 text-stone-600 mx-auto" />
                      <p className="text-sm text-stone-400">ওয়েব পেজের টেক্সট পাওয়া যায়নি।</p>
                      <button
                        type="button"
                        onClick={() => setWebViewMode('proxy')}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        লাইভ ব্রাউজারে দেখুন
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Browser Footer */}
        <div className="px-4 py-2 bg-stone-950 border-t border-stone-800 text-[11px] text-stone-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>ইন-অ্যাপ মিনি গুগল ওয়েব ব্রাউজার ও মিউজিক প্লেয়ার</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-stone-500 text-[10px]">
              শর্টকাট: Alt+← (Back) / Alt+→ (Forward) / F5 (Refresh)
            </span>
            <span className="font-mono text-[10px] text-stone-400">Google Grounded Live Web</span>
          </div>
        </div>
      </div>
    </div>
  );
};
