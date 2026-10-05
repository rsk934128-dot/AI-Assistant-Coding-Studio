import React, { useState } from 'react';
import { 
  X, 
  ArrowLeft, 
  ShieldCheck, 
  UserCheck, 
  Building, 
  Heart, 
  Code2, 
  Database, 
  Copy, 
  Check, 
  Layers, 
  Sparkles, 
  ExternalLink,
  Laptop,
  CheckCircle2,
  FileCode,
  Key
} from 'lucide-react';
import { FOUNDER_PROFILE } from '../data/founderProfile';

interface FounderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskAIAboutAdmin?: (query: string) => void;
}

export const FounderProfileModal: React.FC<FounderProfileModalProps> = ({
  isOpen,
  onClose,
  onAskAIAboutAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'admin_json' | 'sql_schema' | 'firestore_schema'>('profile');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const adminJsonText = JSON.stringify(FOUNDER_PROFILE.adminIdentity, null, 2);

  const postgresSqlSchema = `-- PostgreSQL Database Schema for Super Admin & Enterprise System
-- Founder: Sheikh Farid (Hotel Al Sheikh Farid / ScrollVerse)

-- 1. Roles & Permissions Table
CREATE TABLE IF NOT EXISTS system_roles (
    role_id VARCHAR(50) PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_roles (role_id, role_name, description)
VALUES 
    ('super_admin', 'Super Admin & Founder', 'Full unrestricted ownership and platform governance'),
    ('manager', 'Hotel & System Manager', 'Operational control of Hotel Al Sheikh Farid and branches')
ON CONFLICT (role_id) DO NOTHING;

-- 2. Master Owners / Admins Table
CREATE TABLE IF NOT EXISTS administrators (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30),
    role_id VARCHAR(50) REFERENCES system_roles(role_id),
    business_entity VARCHAR(200) NOT NULL DEFAULT 'Hotel Al Sheikh Farid',
    location VARCHAR(150) NOT NULL DEFAULT 'Sirajganj, Bangladesh',
    is_owner BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '["*"]'::jsonb,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Founder & Super Admin
INSERT INTO administrators (
    full_name, 
    role_id, 
    business_entity, 
    location, 
    is_owner, 
    metadata
)
VALUES (
    'Sheikh Farid', 
    'super_admin', 
    'Hotel Al Sheikh Farid', 
    'Sirajganj, Bangladesh', 
    TRUE,
    '{"spouse": "Khukumoni Begum", "ecosystem": ["ScrollVerse", "Sheikh Code Exchange", "RubelPay"]}'::jsonb
)
ON CONFLICT DO NOTHING;

-- 3. Hotel Al Sheikh Farid - Operations & Sweet Shop Ledger
CREATE TABLE IF NOT EXISTS hotel_ledger_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_branch VARCHAR(100) DEFAULT 'Hotel Al Sheikh Farid',
    category VARCHAR(50) NOT NULL, -- 'dining', 'sweets', 'supplies', 'hotel'
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    entry_type VARCHAR(10) CHECK (entry_type IN ('income', 'expense')),
    recorded_by VARCHAR(150) DEFAULT 'Sheikh Farid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

  const firestoreRulesAndSchema = `// Firestore Blueprint & Security Rules for Sheikh Farid Admin Panel
// Location: Sirajganj, Bangladesh | Entity: Hotel Al Sheikh Farid

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to identify Super Admin & Founder
    function isSuperAdmin() {
      return request.auth != null && (
        request.auth.token.email == "sheikhfaridvisa164@gmail.com" ||
        request.auth.token.role == "super_admin" ||
        request.auth.uid == "founder_sheikh_farid"
      );
    }

    // Admins Collection
    match /system_admins/{adminId} {
      allow read: if request.auth != null;
      allow write: if isSuperAdmin();
    }

    // Hotel Al Sheikh Farid Management Data
    match /hotel_al_sheikh_farid/{docId} {
      allow read, write: if isSuperAdmin();
    }

    // User chats and workspaces
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
    }
  }
}`;

  return (
    <div
      id="founder-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="founder-profile-modal-content"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  প্রতিষ্ঠাতা ও সুপার অ্যাডমিন প্রোফাইল
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Super Admin & Founder
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                শেখ ফরিদ (Sheikh Farid) — সফটওয়্যার আর্কিটেক্ট ও হোটেল আল শেখ ফরিদ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-all cursor-pointer shadow-xs border border-stone-300/60 dark:border-stone-700/60"
              title="চ্যাটে ফিরে যান (Back)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ফিরে যান</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            👤 ব্যক্তিগত ও প্রজেক্ট পরিচিতি
          </button>
          <button
            onClick={() => setActiveTab('admin_json')}
            className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'admin_json'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            🛡️ অ্যাডমিন আইডেন্টিটি JSON
          </button>
          <button
            onClick={() => setActiveTab('sql_schema')}
            className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'sql_schema'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            🗄️ PostgreSQL SQL স্কিমা
          </button>
          <button
            onClick={() => setActiveTab('firestore_schema')}
            className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'firestore_schema'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            🔥 Firebase Firestore রুলস
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Founder Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-amber-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span>{FOUNDER_PROFILE.personalInfo.fullNameBn}</span>
                      <span className="text-sm font-normal text-stone-500">
                        ({FOUNDER_PROFILE.personalInfo.fullNameEn})
                      </span>
                    </h3>
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {FOUNDER_PROFILE.personalInfo.designationBn}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs">
                      {FOUNDER_PROFILE.personalInfo.primaryRole}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-stone-700 dark:text-stone-300">
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">জন্মতারিখ ও বয়স</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      ১৫ জুন, ১৯৯৪ (৩২ বছর)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">মূল অবস্থান</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      সিরাজগঞ্জ, বাংলাদেশ 🇧🇩
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">পারিবারিক ব্যবসা</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      হোটেল আল শেখ ফরিদ
                    </span>
                  </div>
                </div>
              </div>

              {/* Family Context Card */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-2">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 text-xs">
                  <Heart className="w-4 h-4 text-rose-500" />
                  পারিবারিক পরিচয় (Family Context)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700 dark:text-stone-300">
                  <div>• <strong>পিতা:</strong> {FOUNDER_PROFILE.familyInfo.fatherName}</div>
                  <div>• <strong>মাতা:</strong> {FOUNDER_PROFILE.familyInfo.motherName}</div>
                  <div>• <strong>স্ত্রী:</strong> {FOUNDER_PROFILE.familyInfo.spouseName}</div>
                  <div>• <strong>সন্তান:</strong> {FOUNDER_PROFILE.familyInfo.children}</div>
                </div>
              </div>

              {/* Businesses & Ecosystems */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 text-xs">
                  <Building className="w-4 h-4 text-amber-500" />
                  ব্যবসা ও সফটওয়্যার ইকোসিস্টেম
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FOUNDER_PROFILE.businesses.map((b, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{b.name}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{b.category}</div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">{b.description}</p>
                    </div>
                  ))}
                  {FOUNDER_PROFILE.flagshipProjects.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{p.name}</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{p.type}</div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-2">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 text-xs">
                  <Code2 className="w-4 h-4 text-emerald-500" />
                  প্রযুক্তিগত দক্ষতা ও মূল স্ট্যাক (Tech Stack)
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ...FOUNDER_PROFILE.techStack.frontend,
                    ...FOUNDER_PROFILE.techStack.backend,
                    ...FOUNDER_PROFILE.techStack.mobile,
                    ...FOUNDER_PROFILE.techStack.database,
                    ...FOUNDER_PROFILE.techStack.aiAndTools,
                  ].map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono text-[10px]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin_json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-500" />
                  সুপার অ্যাডমিন কনফিগারেশন JSON
                </span>
                <button
                  onClick={() => handleCopy(adminJsonText, 'admin_json')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors cursor-pointer"
                >
                  {copiedKey === 'admin_json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'admin_json' ? 'কপি হয়েছে!' : 'JSON কপি করুন'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-stone-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-stone-800">
                {adminJsonText}
              </pre>
              <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                টিপস: যেকোনো সিস্টেম বা ব্যাকএন্ডের অ্যাডমিন প্যানেলে এই অবজেক্টটি ব্যবহার করে প্রতিষ্ঠাতা বা সুপার অ্যাডমিন হিসেবে স্বয়ংক্রিয় এক্সেস ও রোল নির্ধারণ করতে পারেন।
              </p>
            </div>
          )}

          {activeTab === 'sql_schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-500" />
                  PostgreSQL / Cloud SQL স্কিমা DDL
                </span>
                <button
                  onClick={() => handleCopy(postgresSqlSchema, 'sql')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors cursor-pointer"
                >
                  {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sql' ? 'কপি হয়েছে!' : 'SQL কোড কপি করুন'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-stone-950 text-blue-300 font-mono text-xs overflow-x-auto border border-stone-800 max-h-96">
                {postgresSqlSchema}
              </pre>
            </div>
          )}

          {activeTab === 'firestore_schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Firebase Firestore সিকিউরিটি রুলস ও স্ট্রাকচার
                </span>
                <button
                  onClick={() => handleCopy(firestoreRulesAndSchema, 'firestore')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors cursor-pointer"
                >
                  {copiedKey === 'firestore' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'firestore' ? 'কপি হয়েছে!' : 'রুলস কপি করুন'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-stone-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-stone-800 max-h-96">
                {firestoreRulesAndSchema}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/80 flex items-center justify-between shrink-0">
          <span className="text-stone-500 dark:text-stone-400 text-xs">
            👑 প্রতিষ্ঠাতা ও সুপার অ্যাডমিন: শেখ ফরিদ (সিরাজগঞ্জ, বাংলাদেশ)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white dark:bg-stone-700 dark:hover:bg-stone-600 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>চ্যাটে ফিরে যান (Back)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
