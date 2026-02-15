import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { receiptApi, analyticsApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import {
  Receipt,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Calendar,
  Store,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BarChart,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Bar,
} from 'recharts';

// Premium iOS colors matching stat card icons
const COLORS = [
  'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',  // iOS Blue
  'linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)',  // iOS Orange
  'linear-gradient(135deg, #34C759 0%, #248A3D 100%)',  // iOS Green
  'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)',  // iOS Purple
  'linear-gradient(135deg, #FF3B30 0%, #D70015 100%)',  // iOS Red
  'linear-gradient(135deg, #FF2D55 0%, #D70034 100%)',  // iOS Pink
  'linear-gradient(135deg, #00C7BE 0%, #008F88 100%)',  // iOS Teal
  'linear-gradient(135deg, #FFD60A 0%, #F7B500 100%)',  // iOS Yellow
];

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
}) => (
  <div className="glass-card p-3 md:p-6 rounded-ios-lg hover:shadow-ios-lg transition-all duration-300 active-scale cursor-pointer group relative overflow-hidden">
    {/* Subtle gradient overlay */}
    <div 
      className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
      style={{ 
        background: `linear-gradient(135deg, ${color}40 0%, transparent 50%, ${color}20 100%)` 
      }}
    />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-2 md:mb-4">
        <div
          className="w-9 h-9 md:w-12 md:h-12 rounded-ios flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
          style={{ 
            background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
            boxShadow: `0 4px 12px ${color}15`
          }}
        >
          <Icon className="w-4 h-4 md:w-6 md:h-6" style={{ color }} />
        </div>
      </div>
      <p className="text-[11px] md:text-ios-sm text-ios-gray-500 mb-0.5 md:mb-1">{title}</p>
      <p className="text-base md:text-ios-2xl font-bold text-ios-gray-900">{value}</p>
    </div>
  </div>
);

// Chart Card Component
interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, action }) => (
  <div className="glass-card p-4 md:p-6 rounded-ios-lg relative overflow-hidden">
    {/* Subtle gradient overlay */}
    <div 
      className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{ 
        background: 'linear-gradient(135deg, #007AFF 0%, transparent 30%, #34C759 70%, transparent 100%)' 
      }}
    />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-ios-lg font-semibold text-ios-gray-900">{title}</h3>
          {subtitle && <p className="text-xs md:text-ios-sm text-ios-gray-500 mt-0.5 md:mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30d');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  const timeRangeOptions = [
    { value: '1d', label: 'Last 1 day' },
    { value: '7d', label: 'Last 1 week' },
    { value: '30d', label: 'Last 1 month' },
    { value: '6m', label: 'Last 6 months' },
    { value: '1y', label: 'Last 1 year' },
    { value: 'all', label: 'Lifetime' },
  ];

  const selectedTimeLabel = timeRangeOptions.find(opt => opt.value === timeRange)?.label || 'Last 1 month';

  // Calculate date range based on selected time range
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        return { startDate: undefined, endDate: undefined };
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['receipt-stats', timeRange],
    queryFn: () => receiptApi.getStats(startDate, endDate),
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => analyticsApi.getAnalytics(startDate, endDate),
  });

  const topMerchants = analytics?.topMerchants || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ios-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ios-base text-ios-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Provide default values for stats
  const safeStats = stats || {
    totalAmount: 0,
    thisMonth: 0,
    lastMonth: 0,
    averagePerReceipt: 0,
    totalReceipts: 0,
    topStores: [],
    categoryBreakdown: [],
  };

  // Use analytics data for filtered views (category breakdown comes from analytics API)
  const analyticsData = analytics || {};
  
  // Use analytics category breakdown for filtered data
  let chartData = (analyticsData?.categoryBreakdown && analyticsData.categoryBreakdown.length > 0)
    ? analyticsData.categoryBreakdown.map((cat: any) => ({
        name: cat.category,
        value: cat.amount,
      }))
    : [];

  // Calculate total from analytics for pie chart center
  const filteredTotal = chartData.reduce((sum: number, item: any) => sum + item.value, 0);

  // Use analytics spending trends for the line chart
  const trendData = (analyticsData?.spendingTrends && analyticsData.spendingTrends.length > 0)
    ? analyticsData.spendingTrends
    : [];

  // Use analytics data for stats when filtered
  const displayStats = {
    totalReceipts: analyticsData?.totalReceipts ?? safeStats.totalReceipts ?? 0,
    totalAmount: filteredTotal || safeStats.totalAmount || 0,
    thisMonth: analyticsData?.monthlyComparison?.currentMonth ?? safeStats.thisMonth ?? 0,
    averageReceipt: analyticsData?.averageReceiptAmount ?? (safeStats?.totalReceipts ? safeStats.totalAmount / safeStats.totalReceipts : 0),
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-ios-3xl font-bold bg-gradient-to-r from-ios-gray-900 via-ios-blue to-ios-gray-900 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-sm md:text-ios-base text-ios-gray-500 mt-1">
            Track your expenses and financial insights
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
            className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-br from-ios-gray-100 to-ios-gray-50 rounded-ios text-xs md:text-ios-sm text-ios-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
            <span>{selectedTimeLabel}</span>
            <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isTimeDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsTimeDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-ios-lg shadow-ios-lg border border-ios-gray-200 py-2 z-20 animate-fade-in">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimeRange(option.value);
                      setIsTimeDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-ios-sm transition-colors",
                      timeRange === option.value
                        ? "bg-ios-blue/10 text-ios-blue font-semibold"
                        : "text-ios-gray-700 hover:bg-ios-gray-50"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Total Receipts"
          value={displayStats.totalReceipts?.toString() || '0'}
          icon={Receipt}
          color="#007AFF"
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(displayStats.totalAmount || 0)}
          icon={DollarSign}
          color="#FF9500"
        />
        <StatCard
          title="This Period"
          value={formatCurrency(displayStats.thisMonth || 0)}
          icon={ShoppingBag}
          color="#34C759"
        />
        <StatCard
          title="Avg. Receipt"
          value={formatCurrency(displayStats.averageReceipt || 0)}
          icon={TrendingUp}
          color="#5856D6"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Spending Trend */}
        <ChartCard
          title="Spending Trend"
          subtitle={selectedTimeLabel}
          action={
            <button 
              onClick={() => navigate('/analytics')}
              className="text-ios-sm text-ios-blue font-medium hover:underline"
            >
              View All
            </button>
          }
        >
          {trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#007AFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                  <filter id="shadow" height="200%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#007AFF" floodOpacity="0.3"/>
                  </filter>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 13, fill: '#8E8E93', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8E8E93', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                  width={60}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                    backdropFilter: 'blur(20px)',
                  }}
                  labelStyle={{ color: '#1C1C1E', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}
                  itemStyle={{ color: '#007AFF', fontWeight: 600, fontSize: '15px' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Spent']}
                  cursor={{ stroke: '#007AFF', strokeWidth: 2, strokeDasharray: '5 5', strokeOpacity: 0.3 }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="url(#lineGradient)"
                  strokeWidth={4}
                  dot={{ 
                    fill: '#FFFFFF', 
                    stroke: '#007AFF',
                    strokeWidth: 3,
                    r: 5,
                    filter: 'url(#shadow)'
                  }}
                  activeDot={{ 
                    r: 8, 
                    fill: '#007AFF',
                    stroke: '#FFFFFF',
                    strokeWidth: 3,
                    filter: 'url(#shadow)'
                  }}
                  fill="url(#colorAmount)"
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#007AFF" />
                    <stop offset="100%" stopColor="#0051D5" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-ios-gray-50 rounded-ios">
              <p className="text-ios-gray-500 text-center">
                <span className="text-ios-base font-medium">No spending data yet</span>
                <span className="text-ios-sm block mt-1">Add receipts to see your spending trends</span>
              </p>
            </div>
          )}
        </ChartCard>

        {/* Category Breakdown */}
        <ChartCard
          title="Category Breakdown"
          subtitle={`${selectedTimeLabel} distribution`}
        >
          {chartData && chartData.length > 0 ? (
            <>
              <div className="relative" style={{ width: '100%', height: '340px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {COLORS.map((gradient, index) => {
                        // Extract colors from gradient string
                        const colorMatch = gradient.match(/#[0-9a-fA-F]{6}/g);
                        const startColor = colorMatch?.[0] || '#667eea';
                        const endColor = colorMatch?.[1] || '#764ba2';
                        return (
                          <React.Fragment key={`gradients-${index}`}>
                            <linearGradient id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={startColor} stopOpacity={0.7} />
                              <stop offset="100%" stopColor={endColor} stopOpacity={0.6} />
                            </linearGradient>
                            <filter id={`glow${index}`} x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                              <feFlood floodColor={startColor} floodOpacity="0.2"/>
                              <feComposite in2="blur" operator="in" result="glowColor"/>
                              <feMerge>
                                <feMergeNode in="glowColor"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </React.Fragment>
                        );
                      })}
                    </defs>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={110}
                      paddingAngle={0}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1500}
                      animationEasing="ease-out"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (percent < 0.05) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            className="font-bold text-sm"
                            style={{ 
                              filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))',
                              fontSize: '14px',
                              fontWeight: 700
                            }}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#pieGradient${index % COLORS.length})`}
                          stroke="none"
                          style={{
                            filter: `drop-shadow(0px 6px 12px rgba(0, 0, 0, 0.2))`,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 250, 252, 0.95) 100%)',
                        border: 'none',
                        borderRadius: '18px',
                        padding: '14px 18px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(30px)',
                      }}
                      labelStyle={{ color: '#1C1C1E', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}
                      itemStyle={{ color: '#007AFF', fontWeight: 700, fontSize: '16px' }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-ios-xs text-ios-gray-500 font-semibold uppercase tracking-wide mb-1">Total Spent</p>
                    <p className="text-ios-2xl font-bold text-ios-gray-900">
                      {formatCurrency(filteredTotal || 0)}
                    </p>
                  </div>
                </div>
              </div>
              {/* Premium Legend with percentages */}
              <div className="mt-4 md:mt-6 grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {(() => {
                  const total = chartData.reduce((sum, item) => sum + item.value, 0);
                  return chartData.map((entry, index) => {
                    const percentage = ((entry.value / total) * 100).toFixed(1);
                    return (
                      <div 
                        key={`legend-${index}`} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl hover:shadow-ios-sm transition-all duration-200 cursor-pointer group",
                          isDarkMode
                            ? "bg-gradient-to-br from-gray-800/60 to-gray-800/40 hover:from-gray-800/80 hover:to-gray-800/60"
                            : "bg-gradient-to-br from-ios-gray-50 to-white"
                        )}
                      >
                        <div
                          className="w-4 h-4 rounded-lg shadow-md group-hover:scale-110 transition-transform"
                          style={{ 
                            background: COLORS[index % COLORS.length],
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)'
                          }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-ios-sm font-semibold truncate",
                            isDarkMode ? "text-gray-100" : "text-ios-gray-900"
                          )}>
                            {entry.name}
                          </p>
                          <p className={cn(
                            "text-ios-xs font-medium",
                            isDarkMode ? "text-gray-400" : "text-ios-gray-500"
                          )}>
                            {percentage}% • {formatCurrency(entry.value)}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-ios-gray-50 rounded-ios">
              <p className="text-ios-gray-500 text-center">
                <span className="text-ios-base font-medium">No category data yet</span>
                <span className="text-ios-sm block mt-1">Add receipts to see category breakdown</span>
              </p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Top Spendings */}
        <div className="lg:col-span-2">
          <ChartCard title="Top Spendings" subtitle={`${selectedTimeLabel} • Highest spending locations`}>
            {topMerchants.length > 0 ? (
              <div className="space-y-3">
                {topMerchants.slice(0, 5).map((merchant: any, index: number) => (
                  <div
                    key={merchant.storeName || index}
                    className="flex items-center justify-between p-4 bg-ios-gray-50 rounded-ios hover:bg-ios-gray-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-ios flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-ios-base font-semibold text-ios-gray-900">
                          {merchant.storeName}
                        </p>
                        <p className="text-ios-sm text-ios-gray-500">
                          {merchant.receiptCount} {merchant.receiptCount === 1 ? 'receipt' : 'receipts'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-ios-lg font-bold text-ios-gray-900">
                        {formatCurrency(merchant.totalSpent)}
                      </p>
                      <p className="text-ios-xs text-ios-gray-500">Total spent</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Store className="w-12 h-12 mx-auto mb-3 text-ios-gray-300" />
                <p className="text-ios-gray-500">No store data yet</p>
                <p className="text-ios-sm text-ios-gray-400 mt-1">Add receipts to see Top Spendings</p>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Quick Actions */}
        <ChartCard title="Quick Actions" subtitle="Common tasks">
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-ios-blue to-ios-indigo text-white rounded-ios hover:shadow-ios-lg transition-all active-scale">
              <Receipt className="w-5 h-5" />
              <span className="text-ios-base font-medium">Upload Receipt</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-ios-gray-100 text-ios-gray-900 rounded-ios hover:bg-ios-gray-200 transition-colors active-scale">
              <Store className="w-5 h-5" />
              <span className="text-ios-base font-medium">View All Receipts</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-ios-gray-100 text-ios-gray-900 rounded-ios hover:bg-ios-gray-200 transition-colors active-scale">
              <TrendingUp className="w-5 h-5" />
              <span className="text-ios-base font-medium">Analytics Report</span>
            </button>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};