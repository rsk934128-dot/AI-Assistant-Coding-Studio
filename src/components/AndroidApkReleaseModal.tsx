import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  Github, 
  Check, 
  Copy, 
  ExternalLink, 
  X, 
  Terminal, 
  ShieldCheck, 
  Package, 
  Sparkles, 
  Layers, 
  Zap, 
  Play, 
  QrCode,
  AlertTriangle
} from 'lucide-react';

interface AndroidApkReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidApkReleaseModal: React.FC<AndroidApkReleaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'quick' | 'github_actions' | 'cli'>('quick');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const gitCommands = [
    'git add .',
    'git commit -m "Release v1.0.0 with Android APK"',
    'git push origin main',
    'git tag v1.0.0',
    'git push origin v1.0.0'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-stone-925 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  অ্যান্ড্রয়েড এপিকে (Android APK) ও গিটহাব রিলিজ
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                  GitHub CI/CD Ready
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                গিটহাব অ্যাকশনস ওয়ার্কফ্লো দ্বারা স্বয়ংক্রিয় এপিকে বিল্ড ও মোবাইল ইনস্টলেশন গাইড
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('quick')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'quick'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>১-ক্লিকে ইনস্টল ও রিলিজ</span>
          </button>

          <button
            onClick={() => setActiveTab('github_actions')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'github_actions'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Actions ওয়ার্কফ্লো</span>
          </button>

          <button
            onClick={() => setActiveTab('cli')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cli'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>গিট টার্মিনাল কমান্ড</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* TAB 1: QUICK DOWNLOAD & RELEASE OVERVIEW */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              {/* Feature highlight banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                      অটোমেটেড Android APK বিল্ডার সক্রিয় করা হয়েছে
                    </h4>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    আপনার রিপোজিটরির <code>.github/workflows/android-apk-release.yml</code> ফাইলটি স্বয়ংক্রিয়ভাবে গিটহাবে পুশ বা ট্যাগ দিলে APK কম্পাইল করে রিলিজ পেজে যুক্ত করে।
                  </p>
                </div>
              </div>

              {/* Steps to Install */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ১
                  </div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-white">GitHub Actions বিল্ড</h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    গিটহাবের <b>Actions</b> ট্যাবে গিয়ে <b>Run workflow</b> চাপুন অথবা নতুন ট্যাগ পুশ করুন।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    ২
                  </div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-white">Releases থেকে ডাউনলোড</h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    বিল্ড সম্পন্ন হলে GitHub Releases পেজ থেকে <b>AIAssistant-debug.apk</b> সরাসরি ফোনে ডাউনলোড করুন।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    ৩
                  </div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-white">অ্যান্ড্রয়েড ইনস্টলেশন</h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    মোবাইলে "Allow unknown sources" অনুমতি দিয়ে ১-ট্যাপে ইনস্টল করুন এবং নেটিভ অ্যাপের মতো উপভোগ করুন।
                  </p>
                </div>
              </div>

              {/* PWA Instant Install Alternative */}
              <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 dark:text-white">
                      তাৎক্ষণিক PWA অ্যান্ড্রয়েড ইনস্টলেশন
                    </h5>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      কোনো এপিকে ডাউনলোড ছাড়াও ক্রোম বা মোবাইল ব্রাউজারের "Add to Home screen" দিয়ে সরাসরি ইনস্টল করা যায়।
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>PWA রেডি</span>
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB ACTIONS WORKFLOW OVERVIEW */}
          {activeTab === 'github_actions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                  <span className="text-stone-400">.github/workflows/android-apk-release.yml</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">Active</span>
                </div>
                <div className="text-stone-300 space-y-1.5 text-[11px] leading-relaxed">
                  <p className="text-emerald-400"># পাইপলাইনের ধাপসমূহ (Pipeline Steps):</p>
                  <p>1. actions/checkout@v4 (কোড ডাউনলোড)</p>
                  <p>2. actions/setup-node@v4 (Node.js 20)</p>
                  <p>3. actions/setup-java@v4 (Java JDK 17)</p>
                  <p>4. android-actions/setup-android@v3 (Android SDK)</p>
                  <p>5. npm run build (ওয়েব বিল্ড)</p>
                  <p>6. npx cap sync android (ক্যাপাসিটর প্রজেক্ট সিঙ্ক)</p>
                  <p>7. ./gradlew assembleDebug (অ্যান্ড্রয়েড এপিকে কম্পাইল)</p>
                  <p>8. softprops/action-gh-release@v2 (GitHub Releases এ আপলোড)</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">গিটহাব অ্যাকশনস পারমিশন যাচাই:</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    GitHub Repo Settings {'>'} Actions {'>'} General {'>'} Workflow permissions এ গিয়ে "Read and write permissions" সক্রিয় নিশ্চিত করুন যাতে ওয়ার্কফ্লোটি স্বয়ংক্রিয়ভাবে Releases তৈরি করতে পারে।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLI & TERMINAL COMMANDS */}
          {activeTab === 'cli' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-600 dark:text-stone-300">
                নতুন ভার্সন রিলিজ করতে আপনার টার্মিনালে নিচের কমান্ডগুলো রান করুন:
              </p>

              <div className="space-y-2">
                {gitCommands.map((cmd, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-stone-900 text-emerald-400 font-mono text-xs border border-stone-800 group"
                  >
                    <span className="truncate pr-3">{cmd}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cmd, idx)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="কপি করুন"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-2">
                <p className="font-bold text-stone-900 dark:text-stone-200">
                  সম্পূর্ণ গাইডলাইন ফাইল:
                </p>
                <p>
                  রিপোজিটরির মূল ডিরেক্টরিতে <code>ANDROID_RELEASE_GUIDE.md</code> ফাইলে বিশদ বাংলা নির্দেশনা সংরক্ষিত রয়েছে।
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>অ্যান্ড্রয়েড ৬.০ থেকে ১৫ পর্যন্ত সাপোর্টেড</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs transition-colors cursor-pointer"
          >
            ঠিক আছে
          </button>
        </div>

      </div>
    </div>
  );
};
