import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  src: string;
  duration?: number;
  artwork?: string;
  isLocal?: boolean;
  category: 'ambient' | 'music' | 'local' | 'stream' | 'tts';
}

export type RepeatMode = 'off' | 'all' | 'one';
export type VisualizerMode = 'bars' | 'wave' | 'circle';

export const DEFAULT_PRESET_TRACKS: AudioTrack[] = [
  {
    id: 'track-rain',
    title: 'শান্ত বৃষ্টির আবহ (Heavy Rain Ambience)',
    artist: 'Nature Sounds • Deep Focus',
    album: 'Nature Ambience',
    src: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg',
    artwork: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=400&auto=format&fit=crop&q=80',
    category: 'ambient',
  },
  {
    id: 'track-ocean',
    title: 'সমুদ্রের শান্ত ঢেউ (Ocean Waves)',
    artist: 'Relaxing Waves • Mind Peace',
    album: 'Ocean Meditation',
    src: 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rocks.ogg',
    artwork: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80',
    category: 'ambient',
  },
  {
    id: 'track-forest',
    title: 'অরণ্যের সকাল ও পাখির গান (Forest Birds)',
    artist: 'Nature Morning • Fresh Mind',
    album: 'Forest Melody',
    src: 'https://actions.google.com/sounds/v1/ambiences/forest_day.ogg',
    artwork: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&auto=format&fit=crop&q=80',
    category: 'ambient',
  },
  {
    id: 'track-stream',
    title: 'পাহাড়ি ঝর্ণার কলতান (Mountain Forest Stream)',
    artist: 'Water Stream • Pure Calm',
    album: 'Stream Sounds',
    src: 'https://actions.google.com/sounds/v1/weather/gentle_stream_in_forest.ogg',
    artwork: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400&auto=format&fit=crop&q=80',
    category: 'ambient',
  },
  {
    id: 'track-thunder',
    title: 'মেঘের গর্জন ও বৃষ্টি (Thunderstorm & Rain)',
    artist: 'Atmospheric Sleep • Relax',
    album: 'Storm Sounds',
    src: 'https://actions.google.com/sounds/v1/weather/thunder_and_rain.ogg',
    artwork: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400&auto=format&fit=crop&q=80',
    category: 'ambient',
  },
  {
    id: 'track-bengali-intro',
    title: 'AI Assistant বাংলা পরিচিতি ও অনুপ্রেরণা',
    artist: 'AI Assistant Studio • শেখ ফরিদ',
    album: 'Studio Voice Showcase',
    src: '/api/tts?text=%E0%A6%86%E0%A6%AE%E0%A6%BF%20AI%20Assistant%20and%20Coding%20Studio%20%E0%A6%8F%E0%A6%B0%20%E0%A6%B8%E0%A7%8D%E0%A6%AE%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%9F%20%E0%A6%8F%E0%A6%86%E0%A6%87%20%E0%A6%B8%E0%A6%B9%E0%A6%95%E0%A6%BE%E0%A6%B0%E0%A7%80%E0%A5%A4%20%E0%A6%95%E0%A7%8B%E0%A6%A1%E0%A6%BF%E0%A6%82%20%E0%A6%93%20%E0%A6%B8%E0%A6%AB%E0%A6%9F%E0%A6%93%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%B0%20%E0%A6%A1%E0%A7%87%E0%A6%AD%E0%A7%87%E0%A6%B2%E0%A6%AA%E0%A6%AE%E0%A7%87%E0%A6%A8%E0%A7%8D%E0%A6%9F%E0%A7%87%20%E0%A6%86%E0%A6%AA%E0%A6%A8%E0%A6%BE%E0%A6%95%E0%A7%87%20%E0%A6%B8%E0%A7%8D%E0%A6%AC%E0%A6%BE%E0%A6%97%E0%A6%A4%E0%A6%AE%E0%A5%A4&lang=bn',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
    category: 'tts',
  },
];

interface AudioPlayerContextType {
  playlist: AudioTrack[];
  currentTrack: AudioTrack | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null;
  visualizerMode: VisualizerMode;
  isModalOpen: boolean;
  isMinimized: boolean;
  audioElement: HTMLAudioElement | null;
  analyserNode: AnalyserNode | null;

  // Actions
  openPlayer: () => void;
  closePlayer: () => void;
  minimizePlayer: () => void;
  expandPlayer: () => void;
  togglePlayer: () => void;
  playTrack: (track: AudioTrack) => void;
  playTrackByIndex: (index: number) => void;
  togglePlayPause: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setSleepTimer: (minutes: number | null) => void;
  addLocalFiles: (files: FileList | File[]) => void;
  addTrackByUrl: (url: string, title?: string, artist?: string) => void;
  playTTSVoice: (text: string, lang?: string) => void;
  removeTrack: (id: string) => void;
  clearPlaylist: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playlist, setPlaylist] = useState<AudioTrack[]>(() => {
    try {
      const saved = localStorage.getItem('ai_studio_audio_playlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PRESET_TRACKS;
  });

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('wave');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sleepIntervalRef = useRef<any>(null);

  const currentTrack = playlist[currentTrackIndex] || null;

  // Initialize Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Handle repeat mode
      setRepeatModeState((currentRepeat) => {
        if (currentRepeat === 'one') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          return currentRepeat;
        }
        // Advance to next track
        handleNextTrack();
        return currentRepeat;
      });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Sync Audio source when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const isCurrentSrc = audio.src.endsWith(currentTrack.src) || audio.src === currentTrack.src;
    if (!isCurrentSrc) {
      audio.src = currentTrack.src;
      audio.playbackRate = playbackRate;
      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Audio autoplay prevented or error:', err);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack]);

  // Persist playlist to local storage
  useEffect(() => {
    try {
      const serializable = playlist.filter((t) => !t.isLocal);
      localStorage.setItem('ai_studio_audio_playlist', JSON.stringify(serializable));
    } catch {}
  }, [playlist]);

  // Handle sleep timer countdown
  useEffect(() => {
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }

    if (!sleepTimerMinutes) {
      setSleepTimerRemaining(null);
      return;
    }

    let remainingSeconds = sleepTimerMinutes * 60;
    setSleepTimerRemaining(remainingSeconds);

    sleepIntervalRef.current = setInterval(() => {
      remainingSeconds -= 1;
      setSleepTimerRemaining(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(sleepIntervalRef.current);
        audioRef.current?.pause();
        setIsPlaying(false);
        setSleepTimerMinutes(null);
        setSleepTimerRemaining(null);
      }
    }, 1000);

    return () => {
      if (sleepIntervalRef.current) {
        clearInterval(sleepIntervalRef.current);
      }
    };
  }, [sleepTimerMinutes]);

  // Web Audio Context setup for visualizer
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      // Browsers may block CORS audio element source; fallback to simulated visualizer
      console.info('Using simulated audio visualizer for cross-origin streams.');
    }
  }, []);

  const playTrack = useCallback((track: AudioTrack) => {
    initAudioContext();
    const idx = playlist.findIndex((t) => t.id === track.id);
    if (idx !== -1) {
      setCurrentTrackIndex(idx);
    } else {
      setPlaylist((prev) => [track, ...prev]);
      setCurrentTrackIndex(0);
    }

    const audio = audioRef.current;
    if (audio) {
      audio.src = track.src;
      audio.playbackRate = playbackRate;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [playlist, playbackRate, initAudioContext]);

  const playTrackByIndex = useCallback((index: number) => {
    initAudioContext();
    if (index >= 0 && index < playlist.length) {
      setCurrentTrackIndex(index);
      const audio = audioRef.current;
      if (audio) {
        audio.src = playlist[index].src;
        audio.playbackRate = playbackRate;
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [playlist, playbackRate, initAudioContext]);

  const togglePlayPause = useCallback(() => {
    initAudioContext();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (!audio.src && currentTrack) {
        audio.src = currentTrack.src;
      }
      audio.play().catch((e) => console.warn('Audio play error:', e));
    }
  }, [isPlaying, currentTrack, initAudioContext]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    initAudioContext();
    audioRef.current?.play().catch(() => {});
  }, [initAudioContext]);

  const handleNextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    initAudioContext();

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentTrackIndex + 1) % playlist.length;
    }
    setCurrentTrackIndex(nextIndex);
    const audio = audioRef.current;
    if (audio && playlist[nextIndex]) {
      audio.src = playlist[nextIndex].src;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [playlist, currentTrackIndex, isShuffle, initAudioContext]);

  const previousTrack = useCallback(() => {
    if (playlist.length === 0) return;
    initAudioContext();

    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(prevIndex);
    if (audio && playlist[prevIndex]) {
      audio.src = playlist[prevIndex].src;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [playlist, currentTrackIndex, initAudioContext]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const seekRelative = useCallback((deltaSeconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      const target = Math.max(0, Math.min(audio.currentTime + deltaSeconds, audio.duration || 0));
      audio.currentTime = target;
      setCurrentTime(target);
    }
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.muted = false;
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  }, [isMuted]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeatModeState(mode);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerMinutes(minutes);
  }, []);

  const addLocalFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newTracks: AudioTrack[] = fileArray.map((file, idx) => {
      const objectUrl = URL.createObjectURL(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      return {
        id: `local-${Date.now()}-${idx}`,
        title: nameWithoutExt,
        artist: 'লোকাল অডিও ফাইল',
        album: 'My Device Audio',
        src: objectUrl,
        isLocal: true,
        category: 'local',
      };
    });

    if (newTracks.length > 0) {
      setPlaylist((prev) => [...newTracks, ...prev]);
      playTrack(newTracks[0]);
    }
  }, [playTrack]);

  const addTrackByUrl = useCallback((url: string, title?: string, artist?: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    const newTrack: AudioTrack = {
      id: `url-${Date.now()}`,
      title: title?.trim() || cleanUrl.split('/').pop()?.split('?')[0] || 'অনলাইন অডিও স্ট্রিম',
      artist: artist?.trim() || 'Online Audio Stream',
      src: cleanUrl,
      category: 'stream',
    };

    setPlaylist((prev) => [newTrack, ...prev]);
    playTrack(newTrack);
  }, [playTrack]);

  const playTTSVoice = useCallback((text: string, lang = 'bn') => {
    const clean = text.trim();
    if (!clean) return;

    const encoded = encodeURIComponent(clean.slice(0, 200));
    const ttsUrl = `/api/tts?text=${encoded}&lang=${lang}`;

    const ttsTrack: AudioTrack = {
      id: `tts-${Date.now()}`,
      title: clean.length > 35 ? clean.slice(0, 35) + '...' : clean,
      artist: 'AI Studio TTS ভয়েস',
      album: 'AI Spoken Audio',
      src: ttsUrl,
      category: 'tts',
    };

    setPlaylist((prev) => [ttsTrack, ...prev]);
    playTrack(ttsTrack);
  }, [playTrack]);

  const removeTrack = useCallback((id: string) => {
    setPlaylist((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      return filtered.length > 0 ? filtered : DEFAULT_PRESET_TRACKS;
    });
  }, []);

  const clearPlaylist = useCallback(() => {
    setPlaylist(DEFAULT_PRESET_TRACKS);
    setCurrentTrackIndex(0);
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
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
        isMinimized,
        audioElement: audioRef.current,
        analyserNode: analyserRef.current,
        openPlayer: () => {
          setIsModalOpen(true);
          setIsMinimized(false);
        },
        closePlayer: () => {
          setIsModalOpen(false);
          setIsMinimized(false);
        },
        minimizePlayer: () => {
          setIsModalOpen(false);
          setIsMinimized(true);
        },
        expandPlayer: () => {
          setIsModalOpen(true);
          setIsMinimized(false);
        },
        togglePlayer: () => {
          setIsModalOpen((prev) => !prev);
          setIsMinimized(false);
        },
        playTrack,
        playTrackByIndex,
        togglePlayPause,
        pause,
        resume,
        nextTrack: handleNextTrack,
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
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
