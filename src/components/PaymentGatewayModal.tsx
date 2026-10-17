import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Code2,
  ShieldCheck,
  Terminal,
  ArrowRight,
  RefreshCw,
  Mail,
  FileText,
  Layers,
  Lock,
  Coins,
  DollarSign,
  Smartphone,
  Globe,
  Database,
  Send,
  Zap,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  Key,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { PaymentGatewayType, PaymentTransaction } from '../types';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (prompt: string) => void;
}

type ModalTab = 'checkout' | 'analytics' | 'transactions' | 'code' | 'docs';
type CodeSubTab = 'express_routes' | 'react_checkout' | 'webhook_handler' | 'dexie_offline' | 'bohudurpay_api' | 'wise_api';

const STORAGE_KEY = 'rubelpay_payment_transactions_v1';

const GATEWAY_COLORS: Record<PaymentGatewayType, string> = {
  rubelpay: '#10b981',
  bkash: '#ec4899',
  nagad: '#f59e0b',
  bohudurpay: '#06b6d4',
  stripe: '#6366f1',
  wise: '#84cc16',
  sslcommerz: '#3b82f6',
};

const GATEWAY_NAMES: Record<PaymentGatewayType, string> = {
  rubelpay: 'RubelPay',
  bkash: 'bKash PGW',
  nagad: 'Nagad Direct',
  bohudurpay: 'BohudurPay',
  stripe: 'Stripe Global',
  wise: 'Wise Business',
  sslcommerz: 'SSLCommerz',
};

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('checkout');
  const [codeSubTab, setCodeSubTab] = useState<CodeSubTab>('express_routes');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('rubelpay');

  // Checkout Simulator Form State
  const [amount, setAmount] = useState<number>(1500);
  const [currency, setCurrency] = useState<'BDT' | 'USD' | 'AED'>('BDT');
  const [customerName, setCustomerName] = useState<string>('শেখ ফরিদ');
  const [customerEmail, setCustomerEmail] = useState<string>('sheikhfaridvisa164@gmail.com');
  const [customerPhone, setCustomerPhone] = useState<string>('+8801700000000');
  const [description, setDescription] = useState<string>('AI Studio & Software Consulting License');

  // Processing & Audit States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [completedTransaction, setCompletedTransaction] = useState<PaymentTransaction | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
  const [reverifiedTxnId, setReverifiedTxnId] = useState<string | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'TXN-RB-984210',
        gateway: 'rubelpay',
        amount: 5000,
        currency: 'BDT',
        status: 'success',
        customerName: 'শেখ ফরিদ',
        customerEmail: 'sheikhfaridvisa164@gmail.com',
        customerPhone: '+8801700000000',
        transactionRef: 'RP-REF-849201',
        createdAt: Date.now() - 3600000 * 2,
        description: 'Hotel Al Sheikh Farid — প্রিমিয়াম রুম বুকিং ডিপোজিট',
        disbursedViaGmail: true,
      },
      {
        id: 'TXN-ST-512093',
        gateway: 'stripe',
        amount: 85,
        currency: 'USD',
        status: 'success',
        customerName: 'Dubai Global Travel Client',
        customerEmail: 'client.uae@example.com',
        transactionRef: 'pi_3Lkm092Klsdf01',
        createdAt: Date.now() - 3600000 * 6,
        description: 'UAE-Dubai-Visa-AI-Hub — প্রাক-আবেদন মূল্যায়ন ফি',
        disbursedViaGmail: true,
      },
      {
        id: 'TXN-BK-110294',
        gateway: 'bkash',
        amount: 1200,
        currency: 'BDT',
        status: 'success',
        customerName: 'আরিফুল ইসলাম',
        customerEmail: 'ariful.developer@example.com',
        customerPhone: '+8801811223344',
        transactionRef: 'BK-TRX-948102',
        createdAt: Date.now() - 3600000 * 18,
        description: 'AI Assistant & Coding Studio API ক্রেডিট টপ-আপ',
        disbursedViaGmail: false,
      },
      {
        id: 'TXN-BP-773190',
        gateway: 'bohudurpay',
        amount: 3200,
        currency: 'BDT',
        status: 'success',
        customerName: 'শেখ ফরিদ',
        customerEmail: 'sheikhfaridvisa164@gmail.com',
        customerPhone: '+8801700000000',
        transactionRef: 'BP-MERCHANT-88192',
        createdAt: Date.now() - 3600000 * 4,
        description: 'BohudurPay মার্চেন্ট গেটওয়ে ইন্টিগ্রেশন ও এপিআই সাবস্ক্রিপশন',
        disbursedViaGmail: true,
      },
      {
        id: 'TXN-WS-330192',
        gateway: 'wise',
        amount: 250,
        currency: 'USD',
        status: 'success',
        customerName: 'Dubai Corporate Travel LLC',
        customerEmail: 'finance@dubai-travel.ae',
        transactionRef: 'WISE-TRX-551923',
        createdAt: Date.now() - 3600000 * 12,
        description: 'Wise Business B2B আন্তর্জাতিক পেমেন্ট সেটেলমেন্ট (AED to USD)',
        disbursedViaGmail: true,
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      // ignore
    }
  }, [transactions]);

  // Analytics Computation
  const analyticsData = useMemo(() => {
    const totalTransactions = transactions.length;
    let totalBDT = 0;
    let totalUSD = 0;
    let totalAED = 0;

    const gatewayMap: Record<string, { count: number; volumeBDT: number; volumeUSD: number; volumeAED: number }> = {};

    transactions.forEach((t) => {
      if (!gatewayMap[t.gateway]) {
        gatewayMap[t.gateway] = { count: 0, volumeBDT: 0, volumeUSD: 0, volumeAED: 0 };
      }
      gatewayMap[t.gateway].count += 1;
      if (t.currency === 'BDT') {
        totalBDT += t.amount;
        gatewayMap[t.gateway].volumeBDT += t.amount;
      } else if (t.currency === 'USD') {
        totalUSD += t.amount;
        gatewayMap[t.gateway].volumeUSD += t.amount;
      } else if (t.currency === 'AED') {
        totalAED += t.amount;
        gatewayMap[t.gateway].volumeAED += t.amount;
      }
    });

    const barData = Object.entries(gatewayMap).map(([gw, data]) => {
      const approxBDT = data.volumeBDT + data.volumeUSD * 122 + data.volumeAED * 33;
      return {
        gateway: GATEWAY_NAMES[gw as PaymentGatewayType] || gw,
        key: gw,
        count: data.count,
        volumeBDT: data.volumeBDT,
        volumeUSD: data.volumeUSD,
        volumeAED: data.volumeAED,
        approxBDT,
      };
    });

    const pieData = Object.entries(gatewayMap).map(([gw, data]) => ({
      name: GATEWAY_NAMES[gw as PaymentGatewayType] || gw,
      key: gw,
      value: data.count,
      color: GATEWAY_COLORS[gw as PaymentGatewayType] || '#10b981',
    }));

    return {
      totalTransactions,
      totalBDT,
      totalUSD,
      totalAED,
      barData,
      pieData,
    };
  }, [transactions]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Simulator Flow
  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setCompletedTransaction(null);

    try {
      // Step 1: Initialize payment order
      setCurrentStep('১. অর্ডারের তথ্য নিয়ে পেমেন্ট ইনটেন্ট তৈরি হচ্ছে (/api/payments/create)...');
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Gateway Handshake
      setCurrentStep(`২. ${selectedGateway.toUpperCase()} সিকিউর গেটওয়েতে হ্যান্ডশেক ও সেশন ভ্যালিডেশন হচ্ছে...`);
      await new Promise((r) => setTimeout(r, 700));

      // Step 3: Webhook Verification
      setCurrentStep('৩. ব্যাকএন্ড HMAC Webhook সিগনেচার ভেরিফাই ও ডাটাবেজে কনফার্মেশন হচ্ছে...');
      await new Promise((r) => setTimeout(r, 600));

      // Step 4: Success Transaction Object
      const newTxn: PaymentTransaction = {
        id: `TXN-${selectedGateway.toUpperCase().slice(0, 2)}-${Math.floor(100000 + Math.random() * 900000)}`,
        gateway: selectedGateway,
        amount: Number(amount) || 100,
        currency,
        status: 'success',
        customerName: customerName || 'সম্মানিত ক্লায়েন্ট',
        customerEmail: customerEmail || 'client@example.com',
        customerPhone: customerPhone || undefined,
        transactionRef: `${selectedGateway.toUpperCase()}-REF-${Date.now().toString().slice(-6)}`,
        createdAt: Date.now(),
        description: description || 'সফটওয়্যার ডেভেলপমেন্ট ও এআই সার্ভিস ফি',
        disbursedViaGmail: true,
      };

      setTransactions((prev) => [newTxn, ...prev]);
      setCompletedTransaction(newTxn);
      setCurrentStep('পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!');
    } catch (err: any) {
      console.error('Payment simulation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  RubelPay ও ইউনিফাইড পেমেন্ট গেটওয়ে হাব
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  v2.4 Enterprise
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                bKash, Nagad, BohudurPay, Stripe, Wise ও SSLCommerz — রিয়েল-টাইম সিমুলেটর, Recharts অ্যানালিটিক্স ও সিকিউর অডিট লগ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('checkout')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'checkout'
                  ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>চেকআউট সিমুলেটর</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-stone-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>অ্যানালিটিক্স ড্যাশবোর্ড</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ট্রানজ্যাকশন ও অডিট ({transactions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>ডেভেলপার কোড ভল্ট</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'bg-white dark:bg-stone-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>নিরাপত্তা ও .env কী</span>
            </button>
          </div>

          {onSendToChat && (
            <button
              onClick={() => {
                onClose();
                onSendToChat('আমার প্রজেক্টের জন্য bKash এবং Stripe পেমেন্ট গেটওয়ে ইন্টিগ্রেশনের পূর্ণাঙ্গ গাইডলাইন ও কোড দিন।');
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
            >
              <span>এআই সহায়তায় কোড নিন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: CHECKOUT SIMULATOR */}
          {activeTab === 'checkout' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form & Gateway Selector */}
              <div className="lg:col-span-7 space-y-5">
                {/* Gateway Selector Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    ১. পেমেন্ট গেটওয়ে সিলেক্ট করুন:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* RubelPay */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('rubelpay');
                        setCurrency('BDT');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'rubelpay'
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                          RubelPay
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        শেখ ফরিদের ডিরেক্ট ডিসবার্সমেন্ট
                      </span>
                    </button>

                    {/* bKash */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('bkash');
                        setCurrency('BDT');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'bkash'
                          ? 'border-pink-500 bg-pink-50/60 dark:bg-pink-950/40 ring-2 ring-pink-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-pink-600 dark:text-pink-400">
                          bKash PGW
                        </span>
                        <span className="w-2 h-2 rounded-full bg-pink-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        সরাসরি মার্চেন্ট চেকআউট
                      </span>
                    </button>

                    {/* Nagad */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('nagad');
                        setCurrency('BDT');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'nagad'
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-600 dark:text-amber-400">
                          Nagad Direct
                        </span>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        ডিজিটাল ইনভয়েস গেটওয়ে
                      </span>
                    </button>

                    {/* Stripe */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('stripe');
                        setCurrency('USD');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'stripe'
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          Stripe (Global)
                        </span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        আন্তর্জাতিক ভিসা/মাস্টারকার্ড
                      </span>
                    </button>

                    {/* BohudurPay */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('bohudurpay');
                        setCurrency('BDT');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'bohudurpay'
                          ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 ring-2 ring-cyan-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-cyan-600 dark:text-cyan-400">
                          BohudurPay
                        </span>
                        <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        মার্চেন্ট এগ্রিগেটর ও এমএফএস
                      </span>
                    </button>

                    {/* Wise Business */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('wise');
                        setCurrency('USD');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'wise'
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          Wise Business
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        গ্লোবাল B2B ও ডিরহাম/ডলার
                      </span>
                    </button>

                    {/* SSLCommerz */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('sslcommerz');
                        setCurrency('BDT');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'sslcommerz'
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                          SSLCommerz
                        </span>
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        বাংলাদেশ ব্যাংক অনুমোদিত
                      </span>
                    </button>

                    {/* UAE Dirham / International */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGateway('stripe');
                        setCurrency('AED');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        selectedGateway === 'stripe' && currency === 'AED'
                          ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 ring-2 ring-teal-500/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-teal-600 dark:text-teal-400">
                          UAE Visa Pay (AED)
                        </span>
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        দুবাই ও ইউএই ডিরহাম গেটওয়ে
                      </span>
                    </button>
                  </div>
                  {/* BohudurPay Quick Registration Banner */}
                  {selectedGateway === 'bohudurpay' && (
                    <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>BohudurPay মার্চেন্ট পোর্টাল রেফারেল লিংক</span>
                        </div>
                        <p className="text-[11px] text-cyan-700 dark:text-cyan-300">
                          রেজিস্ট্রেশন করুন এবং সরাসরি এমএফএস ও কার্ড পেমেন্ট গ্রহণ শুরু করুন।
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy('https://marchant.bohudurpay.com/register?ref=d8FB6RVcgvx9', 'bohudur_ref')}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedKey === 'bohudur_ref' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'bohudur_ref' ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
                        </button>
                        <a
                          href="https://marchant.bohudurpay.com/register?ref=d8FB6RVcgvx9"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>পোর্টাল খুলুন</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount & Currency Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      পেমেন্ট পরিমাণ (Amount):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
                        placeholder="1500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400 font-mono">
                        {currency}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      কারেন্সি (Currency):
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="BDT">BDT (৳) — বাংলাদেশি টাকা</option>
                      <option value="USD">USD ($) — মার্কিন ডলার</option>
                      <option value="AED">AED (د.إ) — ইউএই দিরহাম</option>
                    </select>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                        গ্রাহকের নাম:
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                        ইমেইল (রিসিট যাবে):
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      পেমেন্ট বিবরণ বা ইনভয়েস টাইটেল:
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Submit Simulator Button */}
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:brightness-110 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{currentStep || 'প্রসেসিং হচ্ছে...'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {amount} {currency} পে করুন ({selectedGateway.toUpperCase()} টেস্ট মোড)
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Live Payment Receipt & Status */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="p-5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-3">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      লাইভ ইনভয়েস সামারি
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                      {selectedGateway}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 text-stone-500">
                      <span>মোট পরিশোধযোগ্য:</span>
                      <span className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
                        {amount} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-500 border-t border-stone-200 dark:border-stone-700/60">
                      <span>গেটওয়ে ফি:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">0.00 (ফ্রি টেস্ট)</span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-500 border-t border-stone-200 dark:border-stone-700/60">
                      <span>গ্রাহক:</span>
                      <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[150px]">
                        {customerName}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-500 border-t border-stone-200 dark:border-stone-700/60">
                      <span>ইমেইল:</span>
                      <span className="font-mono text-stone-800 dark:text-stone-200 truncate max-w-[160px]">
                        {customerEmail}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-500 border-t border-stone-200 dark:border-stone-700/60">
                      <span>নিরাপত্তা স্তর:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        256-bit TLS / Webhook
                      </span>
                    </div>
                  </div>

                  {completedTransaction && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold">পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে!</span>
                      </div>
                      <div className="text-[11px] font-mono text-stone-600 dark:text-stone-300 space-y-0.5">
                        <p>Txn ID: {completedTransaction.id}</p>
                        <p>Ref: {completedTransaction.transactionRef}</p>
                      </div>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        স্বয়ংক্রিয় রিসিট জিমেইল ডিসবার্সমেন্ট পাইপলাইনে রেজিস্টার্ড হয়েছে।
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800/40 text-stone-500 dark:text-stone-400 text-xs flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    অফলাইন-ফার্স্ট ক্যাশ সক্রিয়: ইন্টারনেট বিচ্ছিন্ন থাকলেও ট্রানজ্যাকশন লোকাল Dexie স্টোরেজে সংরক্ষিত থাকে।
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RECHARTS ANALYTICS & REVENUE DASHBOARD */}
          {activeTab === 'analytics' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Top KPI Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-semibold">মোট সফল ট্রানজ্যাকশন</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                    {analyticsData.totalTransactions}টি
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    সাকসেস রেট ১০০%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-semibold">সংগৃহীত BDT রাজস্ব</span>
                    <Coins className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                    ৳{analyticsData.totalBDT.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">
                    bKash, Nagad, BohudurPay
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-semibold">গ্লোবাল ভলিউম (USD/AED)</span>
                    <DollarSign className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                    ${analyticsData.totalUSD.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                    + {analyticsData.totalAED} AED (Wise/Stripe)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850">
                  <div className="flex items-center justify-between text-stone-500 mb-1">
                    <span className="text-[11px] font-semibold">সক্রিয় গেটওয়ে চ্যানেল</span>
                    <Zap className="w-4 h-4 text-cyan-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                    ৭টি চ্যানেল
                  </p>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                    HMAC Webhook সক্রিয়
                  </span>
                </div>
              </div>

              {/* 2 Grid Columns of Recharts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* BarChart: Volume Comparison */}
                <div className="lg:col-span-7 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        <span>গেটওয়ে ভিত্তিক রাজস্ব ও আনুমানিক ভলিউম (BDT ইকুইভ্যালেন্ট)</span>
                      </h3>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400">
                        লোকাল ও আন্তর্জাতিক গেটওয়ের সংগৃহীত পরিমাণের তুলনামূলক গ্রাফ
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.barData} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                          dataKey="gateway"
                          tick={{ fontSize: 10, fill: '#888' }}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1c1917',
                            borderColor: '#44403c',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            color: '#fff',
                          }}
                          formatter={(value: any, name: any, item: any) => [
                            `৳${Number(value).toLocaleString()} ইকুইভ্যালেন্ট (${item.payload.count}টি লেনদেন)`,
                            'ভলিউম',
                          ]}
                        />
                        <Bar dataKey="approxBDT" radius={[6, 6, 0, 0]}>
                          {analyticsData.barData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={GATEWAY_COLORS[entry.key as PaymentGatewayType] || '#10b981'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PieChart: Transaction Share */}
                <div className="lg:col-span-5 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <PieIcon className="w-4 h-4 text-emerald-500" />
                        <span>গেটওয়ে শেয়ার ও লেনদেন বণ্টন</span>
                      </h3>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400">
                        মোট ট্রানজ্যাকশন সংখ্যার ওপর শতাংশ
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {analyticsData.pieData.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1c1917',
                            borderColor: '#44403c',
                            borderRadius: '0.75rem',
                            fontSize: '11px',
                            color: '#fff',
                          }}
                          formatter={(value: any) => [`${value}টি ট্রানজ্যাকশন`, 'কাউন্ট']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Gateway Channel Breakdown Table */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-3">
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>গেটওয়ে পারফরম্যান্স মেট্রিক্স ও সেটেলমেন্ট সামারি</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-semibold text-[11px]">
                        <th className="pb-2">গেটওয়ে নাম</th>
                        <th className="pb-2">সফল লেনদেন</th>
                        <th className="pb-2">মোট ভলিউম</th>
                        <th className="pb-2">কারেন্সি</th>
                        <th className="pb-2">Webhook স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
                      {analyticsData.barData.map((row) => (
                        <tr key={row.key} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                          <td className="py-2.5 font-bold flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: GATEWAY_COLORS[row.key as PaymentGatewayType] || '#10b981' }}
                            />
                            <span className="font-sans text-stone-900 dark:text-stone-100">{row.gateway}</span>
                          </td>
                          <td className="py-2.5 text-stone-700 dark:text-stone-300">{row.count}টি</td>
                          <td className="py-2.5 font-bold text-stone-900 dark:text-stone-100">
                            {row.volumeBDT > 0 ? `৳${row.volumeBDT.toLocaleString()}` : ''}
                            {row.volumeUSD > 0 ? `$${row.volumeUSD.toLocaleString()}` : ''}
                            {row.volumeAED > 0 ? `${row.volumeAED.toLocaleString()} AED` : ''}
                          </td>
                          <td className="py-2.5 text-stone-500 font-sans">
                            {row.volumeBDT > 0 ? 'BDT' : row.volumeUSD > 0 ? 'USD' : 'AED'}
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-sans">
                              <ShieldCheck className="w-3 h-3" />
                              256-bit Verified
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEVELOPER CODE VAULT */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              {/* Code sub-tabs */}
              <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 overflow-x-auto">
                <button
                  onClick={() => setCodeSubTab('express_routes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    codeSubTab === 'express_routes'
                      ? 'bg-indigo-600 text-white'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  ১. Express API Routes
                </button>
                <button
                  onClick={() => setCodeSubTab('react_checkout')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    codeSubTab === 'react_checkout'
                      ? 'bg-indigo-600 text-white'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  ২. React Checkout Component
                </button>
                <button
                  onClick={() => setCodeSubTab('webhook_handler')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    codeSubTab === 'webhook_handler'
                      ? 'bg-indigo-600 text-white'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  ৩. Webhook & Signature Verifier
                </button>
                <button
                  onClick={() => setCodeSubTab('dexie_offline')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    codeSubTab === 'dexie_offline'
                      ? 'bg-indigo-600 text-white'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  ৪. Dexie.js Offline Cache
                </button>
                <button
                  onClick={() => setCodeSubTab('bohudurpay_api')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    codeSubTab === 'bohudurpay_api'
                      ? 'bg-cyan-600 text-white'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  ৫. BohudurPay Merchant API
                </button>
                <button
                  onClick={() => setCodeSubTab('wise_api')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    codeSubTab === 'wise_api'
                      ? 'bg-emerald-600 text-white'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  ৬. Wise Business Payout API
                </button>
              </div>

              {/* Code snippet display */}
              <div className="relative">
                <button
                  onClick={() => {
                    const code = getCodeSnippet(codeSubTab);
                    handleCopy(code, codeSubTab);
                  }}
                  className="absolute right-3 top-3 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer z-10"
                >
                  {copiedKey === codeSubTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কোড কপি করুন</span>
                    </>
                  )}
                </button>
                <pre className="p-4 rounded-xl bg-stone-950 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800 max-h-[500px]">
                  {getCodeSnippet(codeSubTab)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS AUDIT LOG */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  মোট সফল লেনদেন: {transactions.length}টি
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    setTransactions([]);
                  }}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  হিস্ট্রি ক্লিয়ার করুন
                </button>
              </div>

              <div className="space-y-2.5">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex flex-col gap-3 text-xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                            {txn.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                              txn.gateway === 'bkash'
                                ? 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300'
                                : txn.gateway === 'stripe'
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                : txn.gateway === 'bohudurpay'
                                ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                                : txn.gateway === 'wise'
                                ? 'bg-lime-100 dark:bg-lime-950 text-lime-700 dark:text-lime-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {txn.gateway}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            SUCCESS
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedTxnId(expandedTxnId === txn.id ? null : txn.id)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer ml-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{expandedTxnId === txn.id ? 'অডিট বন্ধ করুন' : 'অডিট লগ ও সিগনেচার'}</span>
                          </button>
                        </div>
                        <p className="text-stone-600 dark:text-stone-300 font-medium mt-1">
                          {txn.description}
                        </p>
                        <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-2">
                          <span>গ্রাহক: {txn.customerName}</span>
                          <span>•</span>
                          <span>{new Date(txn.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-bold font-mono text-stone-900 dark:text-stone-100">
                          {txn.amount.toLocaleString()} {txn.currency}
                        </span>
                        {txn.disbursedViaGmail && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>Gmail Receipt Sent</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable Audit Log & IPN Signature Verification */}
                    {expandedTxnId === txn.id && (
                      <div className="mt-2 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>অডিট ট্রেইল ও HMAC Webhook ভেরিফিকেশন ডাটা</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReverifiedTxnId(txn.id);
                              setTimeout(() => setReverifiedTxnId(null), 3000);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 text-indigo-500" />
                            <span>সিগনেচার রি-ভেরিফাই করুন</span>
                          </button>
                        </div>

                        {reverifiedTxnId === txn.id && (
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>HMAC-SHA256 সিগনেচার ভ্যালিডেশন সফল: সিক্রেট কী ও টাইমস্ট্যাম্প ১০০% ম্যাচ করেছে।</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                          <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                            <span className="text-[10px] text-stone-400 block font-sans">HMAC SHA-256 Signature</span>
                            <span className="text-stone-800 dark:text-stone-200 truncate block">
                              sha256:{Math.abs(txn.id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16).padEnd(20, 'a7e9')}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                            <span className="text-[10px] text-stone-400 block font-sans">Idempotency Key</span>
                            <span className="text-stone-800 dark:text-stone-200 truncate block">
                              idem_key_{txn.id.toLowerCase().replace('-', '_')}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                            <span className="text-[10px] text-stone-400 block font-sans">ডিসপুট ও রিফান্ড স্টেটাস</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold block font-sans">
                              0 Disputes / Clean Settlement
                            </span>
                          </div>
                        </div>

                        {/* Raw Webhook Payload Inspector */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-500">
                            <span>সার্ভার-টু-সার্ভার রিসিভড Webhook Payload (JSON):</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(JSON.stringify(txn, null, 2), `raw_${txn.id}`)}
                              className="text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `raw_${txn.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === `raw_${txn.id}` ? 'কপি হয়েছে' : 'JSON কপি'}</span>
                            </button>
                          </div>
                          <pre className="p-2.5 rounded-lg bg-stone-950 text-stone-300 font-mono text-[10px] overflow-x-auto border border-stone-800 max-h-24">
                            {JSON.stringify({
                              event: 'payment.completed',
                              transaction_id: txn.id,
                              ref: txn.transactionRef,
                              gateway: txn.gateway,
                              amount: txn.amount,
                              currency: txn.currency,
                              customer: { name: txn.customerName, email: txn.customerEmail, phone: txn.customerPhone },
                              verified_at: new Date(txn.createdAt).toISOString(),
                              signature_valid: true
                            }, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BEST PRACTICES & SECURITY DOCS */}
          {activeTab === 'docs' && (
            <div className="space-y-4 text-xs leading-relaxed max-w-3xl">
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 space-y-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>শেখ ফরিদের প্রোডাকশন পেমেন্ট স্ট্যান্ডার্ডস</span>
                </h3>
                <p>
                  পেমেন্ট গেটওয়ে ইন্টিগ্রেশনে নিরাপত্তা এবং ত্রুটিহীন ট্রানজ্যাকশন নিশ্চিত করতে নিচের ৪টি মূল নিয়ম মেনে চলতে হবে:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
                    ১. Webhook Signature Verification (অপরিহার্য):
                  </h4>
                  <p className="text-stone-600 dark:text-stone-300">
                    কখনোই ক্লায়েন্ট সাইড থেকে পাওয়া পেমেন্ট স্ট্যাটাসের ওপর ভিত্তি করে পণ্য ডেলিভারি বা ডাটাবেজ আপডেট করবেন না। সর্বদা সার্ভার-টু-সার্ভার Webhook কল রিসিভ করে গেটওয়ের সিক্রেট কি দিয়ে সিগনেচার যাচাই করতে হবে।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
                    ২. Idempotency Key ও ডাবল-চার্জিং রোধ:
                  </h4>
                  <p className="text-stone-600 dark:text-stone-300">
                    নেটওয়ার্ক ড্রপ বা ইউজার বারবার ক্লিক করলে যেন একই অর্ডারে একাধিকবার টাকা না কাটে, সেজন্য প্রতিটি রিকোয়েস্টে ইউনিক <code className="font-mono bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">idempotency_key</code> পাঠাতে হবে।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
                    ৩. অফলাইন-ফার্স্ট ও Dexie.js সিকিউরিটি:
                  </h4>
                  <p className="text-stone-600 dark:text-stone-300">
                    হোটেল বুকিং বা সার্ভিস অর্ডারের ক্ষেত্রে লোকাল ব্রাউজারে ট্রানজ্যাকশন লক করুন, যাতে রিলোড দিলেও অর্ডার হারিয়ে না যায়। ইন্টারনেট সংযোগ পুনঃস্থাপিত হলে ব্যাকএন্ডে সিঙ্ক করুন।
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-500" />
                      <span>৪. প্রোডাকশন এনভায়রনমেন্ট ভ্যারিয়েবল চেকলিস্ট (.env.production):</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const envTemplate = `# ========================================================
# Sheikh Farid AI Studio & Payment Gateway Hub (.env.production)
# ========================================================

# 1. BohudurPay Merchant Gateway
BOHUDURPAY_MERCHANT_ID=your_merchant_id_here
BOHUDURPAY_API_KEY=your_secret_api_key_here
BOHUDURPAY_BASE_URL=https://api.bohudurpay.com/api/v1

# 2. Stripe Global Payments
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_PUBLISHABLE_KEY=pk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# 3. bKash Merchant PGW
BKASH_APP_KEY=your_bkash_app_key
BKASH_APP_SECRET=your_bkash_app_secret
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password
BKASH_BASE_URL=https://tokenized.pay.bka.sh/v1.2.0-beta

# 4. Nagad Direct Gateway
NAGAD_MERCHANT_ID=your_nagad_merchant_id
NAGAD_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\\n...
NAGAD_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\\n...

# 5. Wise Business Cross-Border (AED/USD)
WISE_API_TOKEN=your_wise_api_live_token
WISE_PROFILE_ID=your_wise_profile_id
WISE_WEBHOOK_PUBLIC_KEY=your_wise_webhook_key

# 6. SSLCommerz Gateway
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASS=your_store_password
SSLCOMMERZ_IS_SANDBOX=false`;
                        handleCopy(envTemplate, 'env_prod_template');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedKey === 'env_prod_template' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>.env টেমপ্লেট কপি করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300">
                    সার্ভার হোস্ট করার সময় (যেমন Vercel, Cloud Run বা VPS) এই এনভায়রনমেন্ট ভ্যারিয়েবলগুলো ড্যাশবোর্ডে সেট করুন। ক্লায়েন্ট-সাইড বান্ডলে কখনোই সিক্রেট কি এক্সপোজ করবেন না।
                  </p>
                  <pre className="p-3 rounded-lg bg-stone-950 text-stone-300 font-mono text-[10px] overflow-x-auto border border-stone-800 max-h-40 leading-relaxed">
{`# 1. BohudurPay Merchant Gateway
BOHUDURPAY_MERCHANT_ID=your_merchant_id
BOHUDURPAY_API_KEY=your_secret_api_key

# 2. Stripe Global Payments
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Wise Business API
WISE_API_TOKEN=your_wise_api_live_token
WISE_PROFILE_ID=your_wise_profile_id

# 4. bKash / Nagad / SSLCommerz
BKASH_APP_KEY=...
NAGAD_MERCHANT_ID=...
SSLCOMMERZ_STORE_ID=...`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 text-xs text-stone-500">
          <span>RubelPay Payment Infrastructure • Sheikh Farid Ecosystem</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 font-semibold transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper code templates for the developer vault
function getCodeSnippet(type: CodeSubTab): string {
  switch (type) {
    case 'express_routes':
      return `// server/routes/payment.ts (Express.js / Node.js Backend)
import express from 'express';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

// 1. Create Stripe PaymentIntent
router.post('/api/payments/stripe/create-intent', async (req, res) => {
  try {
    const { amount, currency, customerEmail, description } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents/poisha
      currency: currency || 'usd',
      receipt_email: customerEmail,
      description: description || 'Software consulting fee',
      metadata: {
        platform: 'RubelPay / Sheikh-Farid-AI-Studio',
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. bKash Create Payment (PGW Tokenized API)
router.post('/api/payments/bkash/create', async (req, res) => {
  const { amount, orderId } = req.body;
  // Send POST to https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create
  res.json({
    paymentID: 'BKASH_PAYMENT_ID_DEMO',
    bkashURL: 'https://sandbox.payment.bkash.com/checkout?paymentID=BKASH_DEMO',
  });
});

export default router;`;

    case 'react_checkout':
      return `// src/components/CheckoutButton.tsx (React 19 / TypeScript)
import React, { useState } from 'react';

interface CheckoutProps {
  amount: number;
  currency: 'BDT' | 'USD';
  onSuccess: (txnId: string) => void;
}

export const CheckoutButton: React.FC<CheckoutProps> = ({ amount, currency, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        // Confirm Card Payment or redirect to Checkout
        onSuccess(data.id);
      }
    } catch (err) {
      alert('পেমেন্ট শুরু করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
    >
      {loading ? 'প্রসেসিং হচ্ছে...' : \`Pay \${amount} \${currency}\`}
    </button>
  );
};`;

    case 'webhook_handler':
      return `// server/webhooks/stripeWebhook.ts
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export const handleStripeWebhook = async (req: express.Request, res: express.Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Crucial: Must use raw body for signature verification!
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(\`⚠️ Webhook signature verification failed: \${err.message}\`);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  // Handle specific event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(\`✅ Payment Intent \${paymentIntent.id} succeeded!\`);
      // Update Firestore / PostgreSQL DB status to SUCCESS
      // Send Gmail Receipt via RubelPay auto-disbursement
      break;
    }
    case 'payment_intent.payment_failed': {
      console.warn('❌ Payment failed.');
      break;
    }
  }

  res.json({ received: true });
};`;

    case 'dexie_offline':
      return `// src/lib/offlinePaymentDb.ts (Dexie.js Offline Cache)
import Dexie, { Table } from 'dexie';

export interface OfflinePaymentRecord {
  id?: number;
  txnRef: string;
  amount: number;
  currency: string;
  status: 'cached_offline' | 'synced';
  createdAt: number;
}

export class OfflinePaymentDatabase extends Dexie {
  payments!: Table<OfflinePaymentRecord>;

  constructor() {
    super('RubelPayOfflineDB');
    this.version(1).stores({
      payments: '++id, txnRef, status, createdAt',
    });
  }
}

export const offlineDb = new OfflinePaymentDatabase();

// Sync when internet comes back online
window.addEventListener('online', async () => {
  const pending = await offlineDb.payments.where({ status: 'cached_offline' }).toArray();
  for (const record of pending) {
    try {
      await fetch('/api/payments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      await offlineDb.payments.update(record.id!, { status: 'synced' });
    } catch (e) {
      console.warn('Could not sync payment record:', record.txnRef);
    }
  }
});`;

    case 'bohudurpay_api':
      return `// server/routes/bohudurpay.ts (BohudurPay Merchant Gateway & IPN Webhook)
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const BOHUDURPAY_MERCHANT_ID = process.env.BOHUDURPAY_MERCHANT_ID || 'M_DEMO_84920';
const BOHUDURPAY_API_KEY = process.env.BOHUDURPAY_API_KEY || 'bp_secret_test_key';
const BOHUDURPAY_BASE_URL = 'https://api.bohudurpay.com/api/v1'; // Merchant API Endpoint

// 1. Create Checkout Payment URL
router.post('/api/payments/bohudurpay/create-order', async (req, res) => {
  try {
    const { amount, orderId, customerName, customerEmail, customerPhone } = req.body;

    const payload = {
      merchant_id: BOHUDURPAY_MERCHANT_ID,
      amount: amount,
      currency: 'BDT',
      order_id: orderId || \`ORD-\${Date.now()}\`,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      redirect_url: 'https://ais-assistant-studio.web.app/checkout/success',
      cancel_url: 'https://ais-assistant-studio.web.app/checkout/cancel',
      ipn_url: 'https://ais-assistant-studio.web.app/api/payments/bohudurpay/ipn',
    };

    // Generate SHA256 Signature for security
    const signString = \`\${BOHUDURPAY_MERCHANT_ID}\${payload.order_id}\${amount}\${BOHUDURPAY_API_KEY}\`;
    const signature = crypto.createHash('sha256').update(signString).digest('hex');

    const response = await fetch(\`\${BOHUDURPAY_BASE_URL}/checkout/initialize\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${BOHUDURPAY_API_KEY}\`,
        'X-Signature': signature,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.status === 'success' && data.payment_url) {
      return res.json({ success: true, paymentUrl: data.payment_url, orderId: payload.order_id });
    }
    return res.status(400).json({ success: false, error: data.message || 'Payment init failed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. IPN (Instant Payment Notification) Webhook Verification
router.post('/api/payments/bohudurpay/ipn', async (req, res) => {
  try {
    const { order_id, amount, status, signature, transaction_id } = req.body;

    // Verify incoming IPN HMAC signature
    const expectedSign = crypto
      .createHash('sha256')
      .update(\`\${BOHUDURPAY_MERCHANT_ID}\${order_id}\${amount}\${BOHUDURPAY_API_KEY}\`)
      .digest('hex');

    if (signature !== expectedSign) {
      console.error('⚠️ BohudurPay IPN signature mismatch!');
      return res.status(403).json({ error: 'Invalid IPN signature' });
    }

    if (status === 'COMPLETED') {
      console.log(\`✅ BohudurPay order \${order_id} verified! Txn: \${transaction_id}\`);
      // Update database status & trigger automated email receipt
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;`;

    case 'wise_api':
      return `// server/services/wiseService.ts (Wise Business Cross-Border API)
// Documentation: https://api-docs.wise.com/
import express from 'express';

const router = express.Router();
const WISE_API_TOKEN = process.env.WISE_API_TOKEN || 'wise_api_test_token';
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID || '12345678';
const WISE_API_URL = 'https://api.wise.com/v3';

// 1. Create Real-Time Exchange Rate & Transfer Quote
router.post('/api/payments/wise/create-quote', async (req, res) => {
  try {
    const { sourceCurrency = 'USD', targetCurrency = 'BDT', sourceAmount } = req.body;

    const response = await fetch(\`\${WISE_API_URL}/profiles/\${WISE_PROFILE_ID}/quotes\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${WISE_API_TOKEN}\`,
      },
      body: JSON.stringify({
        sourceCurrency,
        targetCurrency,
        sourceAmount: Number(sourceAmount) || 100,
        payOut: 'BANK_TRANSFER',
      }),
    });

    const quote = await response.json();
    res.json({
      success: true,
      quoteId: quote.id,
      exchangeRate: quote.rate,
      fee: quote.fee,
      estimatedDelivery: quote.deliveryEstimate,
      targetAmount: quote.targetAmount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Fund Transfer & Payout
router.post('/api/payments/wise/fund-transfer', async (req, res) => {
  try {
    const { transferId } = req.body;
    const response = await fetch(\`\${WISE_API_URL}/profiles/\${WISE_PROFILE_ID}/transfers/\${transferId}/payments\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${WISE_API_TOKEN}\`,
      },
      body: JSON.stringify({ type: 'BALANCE' }),
    });

    const result = await response.json();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;`;
  }
}
