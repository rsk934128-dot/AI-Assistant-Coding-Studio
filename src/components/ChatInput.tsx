import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Send, 
  Square, 
  Globe, 
  Code2, 
  PenTool, 
  GraduationCap, 
  Search, 
  Sparkles,
  Paperclip,
  X,
  Mic,
  MicOff,
  Languages,
  AlertCircle,
  ShieldCheck,
  Youtube,
  Play,
  Maximize2,
  HardDrive
} from 'lucide-react';
import { AssistantMode } from '../types';
import { useVoiceInput, VoiceLanguage } from '../hooks/useVoiceInput';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { extractYouTubeVideoId } from '../utils/youtube';
import { AudioFrequencyWave } from './AudioFrequencyWave';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSend: (textOverride?: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  enableSearch: boolean;
  setEnableSearch: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  mode: AssistantMode;
  setMode: (mode: AssistantMode) => void;
  onOpenGoogleDrive?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isGenerating,
  enableSearch,
  setEnableSearch,
  mode,
  setMode,
  onOpenGoogleDrive,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicPlayer = useMusicPlayer();
  const detectedYouTubeId = extractYouTubeVideoId(input);

  const {
    isListening,
    language,
    setLanguage,
    toggleListening,
    stopListening,
    errorMessage,
    setErrorMessage,
    audioLevel,
    frequencyData,
    interimText,
  } = useVoiceInput({
    defaultLang: 'bn-BD',
    onTranscriptUpdate: (transcript) => {
      setInput(transcript);
    },
    onSendVoiceCommand: (finalText) => {
      setInput(finalText);
      setTimeout(() => {
        onSend(finalText);
      }, 100);
    },
    onClearVoiceCommand: () => {
      setInput('');
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${Math.max(newHeight, 48)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && input.trim()) {
        if (isListening) stopListening();
        onSend();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInput(
          prev =>
            `${prev ? prev + '\n\n' : ''}[ফাইল: ${file.name}]\n\`\`\`\n${text.slice(0, 10000)}\n\`\`\`\nএই ফাইলের কোড/তথ্য বিশ্লেষণ করো:`
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleVoiceToggle = () => {
    setErrorMessage(null);
    toggleListening(input);
  };

  const modeButtons: Array<{ id: AssistantMode; label: string; icon: any }> = [
    { id: 'general', label: 'সাধারণ', icon: Sparkles },
    { id: 'citizen', label: 'জনসেবা ও A-Z সমাধান', icon: ShieldCheck },
    { id: 'coding', label: 'কোডিং ও ডেভেলপমেন্ট', icon: Code2 },
    { id: 'writing', label: 'লেখালেখি ও অনুবাদ', icon: PenTool },
    { id: 'research', label: 'গবেষণা ও ফ্যাক্ট-চেক', icon: Search },
    { id: 'learning', label: 'পড়াশোনা ও কনসেপ্ট', icon: GraduationCap },
  ];

  return (
    <div className="border-t border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-3 pt-2 pb-3.5 sm:px-6 md:px-8 md:pt-2.5 md:pb-6 lg:pb-7 transition-all shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Error notification if microphone is blocked */}
        {errorMessage && (
          <div
            id="voice-mic-error-banner"
            className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-amber-200/50 dark:hover:bg-amber-900/60 rounded text-amber-700 dark:text-amber-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Real-time Visual Audio Frequency Wave Visualizer Animation */}
        <AudioFrequencyWave
          frequencyData={frequencyData}
          audioLevel={audioLevel}
          isListening={isListening}
          language={language}
          interimText={interimText}
          onStop={stopListening}
          onSend={() => {
            if (input.trim()) {
              stopListening();
              onSend();
            }
          }}
          onLanguageChange={(newLang) => setLanguage(newLang)}
        />

        {/* Mode & Tool Toggles */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            {modeButtons.map((btn) => {
              const Icon = btn.icon;
              const isActive = mode === btn.id;
              return (
                <button
                  key={btn.id}
                  id={`mode-btn-${btn.id}`}
                  onClick={() => setMode(btn.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Google Search Grounding toggle */}
          <button
            id="toggle-search-grounding-btn"
            onClick={() => setEnableSearch((prev: boolean) => !prev)}
            title="Google Search ডেটা দিয়ে রিয়েল-টাইম তথ্য পাওয়ার জন্য সক্রিয় করুন"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shrink-0 border transition-all ${
              enableSearch
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-blue-600 dark:text-blue-400' : 'text-stone-400'}`} />
            <span>Google Search: {enableSearch ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}</span>
          </button>
        </div>

        {/* Instant Detected YouTube Link Chip */}
        {detectedYouTubeId && (
          <div className="mb-2.5 p-2.5 rounded-xl bg-gradient-to-r from-red-600/15 via-rose-600/10 to-transparent border border-red-500/40 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-md bg-red-600 text-white shrink-0 shadow-xs">
                <Youtube className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                ইউটিউব ভিডিও লিঙ্ক শনাক্ত হয়েছে (ID: {detectedYouTubeId})
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  musicPlayer.playVideoId(detectedYouTubeId, 'ইউটিউব ভিডিও / গান', {
                    autoPlay: true,
                    startMinimized: true,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-300 font-semibold text-xs border border-emerald-500/40 transition-all cursor-pointer"
                title="চ্যাট চালিয়ে যান, গান ব্যাকগ্রাউন্ডে চলবে"
              >
                <span>ব্যাকগ্রাউন্ডে চালান</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  musicPlayer.playVideoId(detectedYouTubeId, 'ইউটিউব ভিডিও / গান', {
                    autoPlay: true,
                    startMinimized: false,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ফুলস্ক্রিন প্লেয়ার</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Text Box */}
        <div className={`relative rounded-2xl border bg-white dark:bg-stone-950 shadow-xs transition-all ${
          isListening 
            ? 'border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/30 shadow-[0_0_16px_rgba(244,63,94,0.25)]'
            : 'border-stone-300 dark:border-stone-700 focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20'
        }`}>
          <textarea
            id="chat-textarea-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'কথা বলুন... আপনার কণ্ঠস্বর টেক্সট আকারে এখানে লেখা হচ্ছে...'
                : 'গান বা ইউটিউব ভিডিও লিঙ্ক, ওয়েবসাইট সন্ধান, কোডিং বা যেকোনো প্রশ্ন লিখুন...'
            }
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-11 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none leading-relaxed"
          />

          {/* Bottom Bar inside Input */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.js,.ts,.tsx,.jsx,.py,.html,.css,.json,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                id="attach-file-btn"
                onClick={() => fileInputRef.current?.click()}
                title="টেক্সট বা কোড ফাইল যুক্ত করুন"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Google Drive Import Button */}
              {onOpenGoogleDrive && (
                <button
                  id="chat-google-drive-btn"
                  type="button"
                  onClick={onOpenGoogleDrive}
                  title="Google Drive থেকে ফাইল বা কোড ইম্পোর্ট করুন"
                  className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                >
                  <HardDrive className="w-4 h-4" />
                </button>
              )}

              {/* Microphone Voice Command Toggle Button with Visual Pulse Animation */}
              <div className="relative inline-flex items-center">
                {isListening && (
                  <>
                    {/* Multi-layered expanding ripple pulse rings */}
                    <span className="absolute -inset-1 rounded-xl bg-rose-500/35 animate-ping pointer-events-none" />
                    <span className="absolute -inset-2 rounded-xl bg-rose-500/15 animate-pulse blur-xs pointer-events-none" />
                  </>
                )}

                <motion.button
                  id="voice-input-mic-btn"
                  onClick={handleVoiceToggle}
                  title={
                    isListening
                      ? 'ভয়েস ইনপুট বন্ধ করুন'
                      : `ভয়েস কমান্ড / মুখে বলুন (${language === 'bn-BD' ? 'বাংলা' : 'English'})`
                  }
                  animate={
                    isListening
                      ? {
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(244, 63, 94, 0.5), 0 2px 8px rgba(244, 63, 94, 0.3)',
                            '0 0 0 6px rgba(244, 63, 94, 0), 0 2px 12px rgba(244, 63, 94, 0.4)',
                            '0 0 0 0 rgba(244, 63, 94, 0.5), 0 2px 8px rgba(244, 63, 94, 0.3)',
                          ],
                        }
                      : { scale: 1, boxShadow: 'none' }
                  }
                  transition={
                    isListening
                      ? {
                          repeat: Infinity,
                          duration: 1.4,
                          ease: 'easeInOut',
                        }
                      : { duration: 0.2 }
                  }
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      {/* Active recording beacon */}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>

                      <MicOff className="w-3.5 h-3.5" />
                      <span>রেকর্ডিং হচ্ছে...</span>

                      {/* Mini Live Audio Equalizer Bars */}
                      <div className="flex items-center gap-0.5 h-3 ml-0.5">
                        {[0.4, 0.9, 0.6, 1, 0.5].map((factor, i) => {
                          const freq = frequencyData[i * 4] || audioLevel;
                          const heightScale = Math.min(1.4, Math.max(0.35, ((freq || 20) / 45) * factor));
                          return (
                            <motion.span
                              key={i}
                              animate={{
                                scaleY: [0.35, heightScale, 0.35],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.35 + i * 0.08,
                                ease: 'easeInOut',
                              }}
                              className="w-0.5 h-3 bg-white/95 rounded-full origin-bottom"
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">ভয়েস</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Quick Language Toggle Pill (Bengali / English) */}
              <button
                id="voice-language-quick-toggle"
                type="button"
                onClick={() => setLanguage(language === 'bn-BD' ? 'en-US' : 'bn-BD')}
                title={`ভয়েস ইনপুট ভাষা: ${language === 'bn-BD' ? 'বাংলা (bn-BD)' : 'English (en-US)'} - পরিবর্তন করতে ক্লিক করুন`}
                className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-all border ${
                  language === 'bn-BD'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-100'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{language === 'bn-BD' ? 'বাং' : 'EN'}</span>
              </button>

              {input && (
                <button
                  id="clear-input-btn"
                  onClick={() => setInput('')}
                  title="লেখা মুছুন"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline text-[11px] text-stone-400">
                Enter পাঠাতে | 'পাঠাও' ভয়েস কমান্ড
              </span>

              {isGenerating ? (
                <button
                  id="stop-generating-btn"
                  onClick={onStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>থামাও</span>
                </button>
              ) : (
                <button
                  id="send-message-btn"
                  onClick={() => {
                    if (isListening) stopListening();
                    onSend();
                  }}
                  disabled={!input.trim()}
                  className={`p-2 rounded-xl transition-all ${
                    input.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                  }`}
                  title="মেসেজ পাঠান"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
