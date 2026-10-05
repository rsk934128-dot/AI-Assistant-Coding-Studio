import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MusicTrack } from '../types';
import { extractYouTubeVideoId } from '../utils/youtube';

export interface PlayVideoOptions {
  autoPlay?: boolean;
  startMinimized?: boolean;
  searchQuery?: string;
}

interface MusicPlayerContextType {
  currentTrack: MusicTrack | null;
  isOpen: boolean;
  isMinimized: boolean;
  isStreaming: boolean;
  playTrack: (track: MusicTrack, options?: PlayVideoOptions) => void;
  playVideoId: (videoIdOrUrl: string, title?: string, options?: PlayVideoOptions) => void;
  closePlayer: () => void;
  minimizePlayer: () => void;
  expandPlayer: () => void;
  toggleMinimize: () => void;
  stopStreaming: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  /**
   * Directly stream any YouTube Video ID or URL with automatic playback
   * and support for immediate background/minimized streaming mode.
   */
  const playVideoId = useCallback(
    (videoIdOrUrl: string, title?: string, options?: PlayVideoOptions) => {
      const raw = (videoIdOrUrl || '').trim();
      if (!raw) return;

      const detectedId = extractYouTubeVideoId(raw);
      const isDirectId = detectedId || (/^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : undefined);
      const resolvedTitle = title?.trim() || (isDirectId ? 'ইউটিউব মিউজিক স্ট্রিম' : raw);

      const track: MusicTrack = {
        videoId: isDirectId || '',
        title: resolvedTitle,
        originalUrl: isDirectId
          ? `https://www.youtube.com/watch?v=${isDirectId}`
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}`,
        searchQuery: options?.searchQuery || (isDirectId ? resolvedTitle : raw),
      };

      setCurrentTrack(track);
      setIsStreaming(true);
      setIsOpen(true);
      if (options?.startMinimized) {
        setIsMinimized(true);
      } else {
        setIsMinimized(false);
      }
    },
    []
  );

  const playTrack = useCallback((track: MusicTrack, options?: PlayVideoOptions) => {
    const cleanId = track.videoId
      ? extractYouTubeVideoId(track.videoId) || track.videoId
      : '';

    setCurrentTrack({
      ...track,
      videoId: cleanId,
    });
    setIsStreaming(true);
    setIsOpen(true);
    if (options?.startMinimized) {
      setIsMinimized(true);
    } else {
      setIsMinimized(false);
    }
  }, []);

  const closePlayer = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsStreaming(false);
    setCurrentTrack(null);
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    setIsOpen(false);
    setIsMinimized(false);
    setCurrentTrack(null);
  }, []);

  const minimizePlayer = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const expandPlayer = useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        isOpen,
        isMinimized,
        isStreaming,
        playTrack,
        playVideoId,
        closePlayer,
        minimizePlayer,
        expandPlayer,
        toggleMinimize,
        stopStreaming,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
