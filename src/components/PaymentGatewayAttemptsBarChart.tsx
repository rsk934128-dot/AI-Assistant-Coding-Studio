import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Filter,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export interface GatewayAttemptMetric {
  gatewayId: string;
  gatewayName: string;
  successful: number;
  failed: number;
  totalAttempts: number;
  successRate: number;
  volumeBDT: number;
  currency: 'BDT' | 'USD' | 'AED';
  primaryFailureReason: string;
  color: string;
}

const BASELINE_DATA: GatewayAttemptMetric[] = [
  {
    gatewayId: 'bohudurpay',
    gatewayName: 'BohudurPay',
    successful: 36,
    failed: 1,
    totalAttempts: 37,
    successRate: 97.3,
    volumeBDT: 118400,
    currency: 'BDT',
    primaryFailureReason: 'সেশন টাইমআউট',
    color: '#06b6d4', // cyan-500
  },
  {
    gatewayId: 'rubelpay',
    gatewayName: 'RubelPay',
    successful: 26,
    failed: 0,
    totalAttempts: 26,
    successRate: 100.0,
    volumeBDT: 130000,
    currency: 'BDT',
    primaryFailureReason: 'কোনো ব্যর্থতা নেই',
    color: '#10b981', // emerald-500
  },
  {
    gatewayId: 'wise',
    gatewayName: 'Wise Business',
    successful: 21,
    failed: 1,
    totalAttempts: 22,
    successRate: 95.5,
    volumeBDT: 64050,
    currency: 'USD',
    primaryFailureReason: 'B2B ইনভ্যালিড IBAN',
    color: '#84cc16', // lime-500
  },
  {
    gatewayId: 'stripe',
    gatewayName: 'Stripe Global',
    successful: 34,
    failed: 2,
    totalAttempts: 36,
    successRate: 94.4,
    volumeBDT: 103700,
    currency: 'USD',
    primaryFailureReason: '3D-Secure ভেরিফিকেশন ফেইল',
    color: '#6366f1', // indigo-500
  },
  {
    gatewayId: 'bkash',
    gatewayName: 'bKash PGW',
    successful: 45,
    failed: 3,
    totalAttempts: 48,
    successRate: 93.8,
    volumeBDT: 54000,
    currency: 'BDT',
    primaryFailureReason: 'গ্রাহকের OTP বিলম্ব',
    color: '#ec4899', // pink-500
  },
  {
    gatewayId: 'nagad',
    gatewayName: 'Nagad Direct',
    successful: 29,
    failed: 2,
    totalAttempts: 31,
    successRate: 93.5,
    volumeBDT: 43500,
    currency: 'BDT',
    primaryFailureReason: 'পিন (PIN) ভুল প্রদান',
    color: '#f59e0b', // amber-500
  },
  {
    gatewayId: 'sslcommerz',
    gatewayName: 'SSLCommerz',
    successful: 24,
    failed: 2,
    totalAttempts: 26,
    successRate: 92.3,
    volumeBDT: 48000,
    currency: 'BDT',
    primaryFailureReason: 'ব্যাংক পেমেন্ট গেটওয়ে ড্রপ',
    color: '#3b82f6', // blue-500
  },
];

interface PaymentGatewayAttemptsBarChartProps {
  onOpenPaymentGateway?: () => void;
}

export const PaymentGatewayAttemptsBarChart: React.FC<PaymentGatewayAttemptsBarChartProps> = ({
  onOpenPaymentGateway,
}) => {
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked'>('grouped');
  const [sortBy, setSortBy] = useState<'successRate' | 'totalAttempts' | 'volume'>('totalAttempts');

  // Load and merge live transactions from localStorage if any
  const metricsData = useMemo(() => {
    let extraByGateway: Record<string, { success: number; failed: number }> = {};
    try {
      const saved = localStorage.getItem('rubelpay_payment_transactions_v1');
      if (saved) {
        const txns = JSON.parse(saved);
        if (Array.isArray(txns)) {
          txns.forEach((t) => {
            const gw = t.gateway || 'rubelpay';
            if (!extraByGateway[gw]) extraByGateway[gw] = { success: 0, failed: 0 };
            if (t.status === 'failed') {
              extraByGateway[gw].failed += 1;
            } else {
              extraByGateway[gw].success += 1;
            }
          });
        }
      }
    } catch {
      // ignore
    }

    const merged = BASELINE_DATA.map((base) => {
      const extra = extraByGateway[base.gatewayId] || { success: 0, failed: 0 };
      const successful = base.successful + extra.success;
      const failed = base.failed + extra.failed;
      const totalAttempts = successful + failed;
      const successRate = totalAttempts > 0 ? Number(((successful / totalAttempts) * 100).toFixed(1)) : 100;
      return {
        ...base,
        successful,
        failed,
        totalAttempts,
        successRate,
      };
    });

    return [...merged].sort((a, b) => {
      if (sortBy === 'successRate') return b.successRate - a.successRate;
      if (sortBy === 'volume') return b.volumeBDT - a.volumeBDT;
      return b.totalAttempts - a.totalAttempts;
    });
  }, [sortBy]);

  // Aggregate high-level KPIs
  const summary = useMemo(() => {
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalVolumeBDT = 0;

    metricsData.forEach((m) => {
      totalSuccessful += m.successful;
      totalFailed += m.failed;
      totalVolumeBDT += m.volumeBDT;
    });

    const totalAttempts = totalSuccessful + totalFailed;
    const overallSuccessRate = totalAttempts > 0 ? ((totalSuccessful / totalAttempts) * 100).toFixed(1) : '100';

    return {
      totalSuccessful,
      totalFailed,
      totalAttempts,
      overallSuccessRate,
      totalVolumeBDT,
    };
  }, [metricsData]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold">মোট পেমেন্ট প্রচেষ্টা</span>
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {summary.totalAttempts}টি
          </p>
          <span className="text-[10px] text-stone-500 dark:text-stone-400">
            ৭টি গেটওয়ে চ্যানেলের সমন্বিত ডেটা
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-1">
            <span className="text-xs font-semibold">সফল পেমেন্ট</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary.totalSuccessful}টি
          </p>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
            সাকসেস রেট: {summary.overallSuccessRate}%
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 mb-1">
            <span className="text-xs font-semibold">ব্যর্থ প্রচেষ্টা (Failed)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {summary.totalFailed}টি
          </p>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
            ব্যর্থতার হার: {(100 - Number(summary.overallSuccessRate)).toFixed(1)}% (সহনীয়)
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold">মোট সংগৃহীত আনুমানিক ভলিউম</span>
            <TrendingUp className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            ৳{summary.totalVolumeBDT.toLocaleString()}
          </p>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
            স্বয়ংক্রিয় সেটেলমেন্ট ও Webhook সিঙ্ক
          </span>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BarChart className="w-4 h-4 text-indigo-500" />
              <span>পেমেন্ট গেটওয়ে ভিত্তিক সফল বনাম ব্যর্থ প্রচেষ্টার বিশ্লেষণ (Recharts Bar Chart)</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Breakdown of successful vs. failed payment attempts by payment gateway type
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart Mode Toggle */}
            <div className="flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setChartMode('grouped')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMode === 'grouped'
                    ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                পাশাপাশি (Grouped)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('stacked')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMode === 'stacked'
                    ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                একত্রে (Stacked)
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="totalAttempts">মোট প্রচেষ্টা অনুযায়ী</option>
                <option value="successRate">সফলতার হার (%) অনুযায়ী</option>
                <option value="volume">রাজস্ব ভলিউম অনুযায়ী</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart Area */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={metricsData}
              margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="gatewayName"
                tick={{ fontSize: 11, fill: '#78716c' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#78716c' }}
                label={{ value: 'প্রচেষ্টার সংখ্যা (Attempts)', angle: -90, position: 'insideLeft', offset: 15, style: { fontSize: '10px', fill: '#a8a29e' } }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as GatewayAttemptMetric;
                    return (
                      <div className="p-3 rounded-xl bg-stone-900/95 border border-stone-700 text-white shadow-xl text-xs space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                          <span className="font-bold text-sm text-stone-100">{data.gatewayName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                            {data.successRate}% সাকসেস
                          </span>
                        </div>
                        <div className="space-y-1 pt-1 font-mono text-[11px]">
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>✅ সফল পেমেন্ট:</span>
                            <span className="font-bold">{data.successful}টি</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-400">
                            <span>❌ ব্যর্থ প্রচেষ্টা:</span>
                            <span className="font-bold">{data.failed}টি</span>
                          </div>
                          <div className="flex justify-between items-center text-stone-300 border-t border-stone-800 pt-1">
                            <span>মোট অ্যাটেম্পট:</span>
                            <span className="font-bold">{data.totalAttempts}টি</span>
                          </div>
                          <div className="flex justify-between items-center text-amber-300">
                            <span>প্রধান কারণ:</span>
                            <span className="font-sans text-[10px]">{data.primaryFailureReason}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              />
              <Bar
                dataKey="successful"
                name="সফল লেনদেন (Successful)"
                fill="#10b981"
                stackId={chartMode === 'stacked' ? 'a' : undefined}
                radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [5, 5, 0, 0]}
              />
              <Bar
                dataKey="failed"
                name="ব্যর্থ প্রচেষ্টা (Failed Attempts)"
                fill="#f43f5e"
                stackId={chartMode === 'stacked' ? 'a' : undefined}
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gateway Breakdown Table & Reliability Index */}
      <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>গেটওয়ে ভিত্তিক রিয়েল-টাইম স্বাস্থ্য ও ব্যর্থতা ডায়াগনস্টিক রিপোর্ট</span>
          </h4>
          {onOpenPaymentGateway && (
            <button
              type="button"
              onClick={onOpenPaymentGateway}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>পেমেন্ট গেটওয়ে হাব খুলুন</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-semibold text-[11px]">
                <th className="pb-2.5">গেটওয়ে টাইপ</th>
                <th className="pb-2.5">সফল</th>
                <th className="pb-2.5">ব্যর্থ</th>
                <th className="pb-2.5">মোট প্রচেষ্টা</th>
                <th className="pb-2.5">সফলতার হার (%)</th>
                <th className="pb-2.5">প্রধান ব্যর্থতার কারণ</th>
                <th className="pb-2.5">নিরাপত্তা স্তর</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
              {metricsData.map((row) => (
                <tr key={row.gatewayId} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                  <td className="py-2.5 font-bold flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-sans text-stone-900 dark:text-stone-100">{row.gatewayName}</span>
                  </td>
                  <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    {row.successful}
                  </td>
                  <td className="py-2.5 text-rose-500 font-bold">
                    {row.failed}
                  </td>
                  <td className="py-2.5 text-stone-700 dark:text-stone-300">
                    {row.totalAttempts}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${row.successRate}%` }}
                        />
                      </div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {row.successRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 font-sans text-stone-500 dark:text-stone-400 text-[11px]">
                    {row.primaryFailureReason}
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-sans">
                      <ShieldCheck className="w-3 h-3" />
                      HMAC ভেরিফাইড
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
