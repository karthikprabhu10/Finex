import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Receipt,
  ShoppingBag, Calendar, Target, AlertCircle, Activity,
  PieChart as PieChartIcon, BarChart3, Store
} from 'lucide-react';

// iOS-style colors for charts
const COLORS = [
  '#007AFF', // iOS Blue
  '#34C759', // iOS Green
  '#FF9500', // iOS Orange
  '#FF3B30', // iOS Red
  '#AF52DE', // iOS Purple
  '#FF2D55', // iOS Pink
  '#5856D6', // iOS Indigo
  '#32ADE6', // iOS Light Blue
  '#FFD60A', // iOS Yellow
  '#BF5AF2', // iOS Lavender
];

export const Analytics: React.FC = () => {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsApi.getAnalytics,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Debug logging
  React.useEffect(() => {
    if (analytics) {
      console.log('[Analytics] Data received:', analytics);
      console.log('[Analytics] Category breakdown:', analytics.categoryBreakdown);
      console.log('[Analytics] Top Spendings:', analytics.topMerchants);
    }
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800 font-semibold text-center">Failed to load analytics</p>
        </div>
      </div>
    );
  }

  const monthComparison = analytics?.monthlyComparison || {};
  const categoryBreakdown = analytics?.categoryBreakdown || [];
  const spendingTrends = analytics?.spendingTrends || [];
  const dailySpending = analytics?.dailySpending || [];
  const topMerchants = analytics?.topMerchants || [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)}`;
  };

  // Get trend icon and color
  const getTrendInfo = (trend: string) => {
    switch (trend) {
      case 'up':
        return { icon: TrendingUp, color: 'text-red-500', bgColor: 'bg-red-50', label: 'Increased' };
      case 'down':
        return { icon: TrendingDown, color: 'text-green-500', bgColor: 'bg-green-50', label: 'Decreased' };
      default:
        return { icon: Minus, color: 'text-gray-500', bgColor: 'bg-gray-50', label: 'Stable' };
    }
  };

  const trendInfo = getTrendInfo(monthComparison.trend);
  const TrendIcon = trendInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">Analytics</h1>
          <p className="text-sm md:text-base text-gray-600">Comprehensive financial insights and trends</p>
        </div>

        {/* Monthly Comparison - Hero Section */}
        <div className="mb-6 md:mb-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl md:rounded-3xl p-4 md:p-8 text-white shadow-2xl">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <Activity className="w-6 h-6 md:w-8 md:h-8" />
            <h2 className="text-lg md:text-2xl font-bold">Monthly Comparison</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            {/* Current Month */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
              <p className="text-white/70 text-xs md:text-sm font-semibold mb-1 md:mb-2">This Month</p>
              <p className="text-2xl md:text-4xl font-bold">{formatCurrency(monthComparison.currentMonth || 0)}</p>
            </div>

            {/* Last Month */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
              <p className="text-white/70 text-xs md:text-sm font-semibold mb-1 md:mb-2">Last Month</p>
              <p className="text-2xl md:text-4xl font-bold">{formatCurrency(monthComparison.lastMonth || 0)}</p>
            </div>

            {/* Change */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20">
              <p className="text-white/70 text-xs md:text-sm font-semibold mb-1 md:mb-2">Change</p>
              <div className="flex items-center gap-2 md:gap-3">
                <TrendIcon className="w-6 h-6 md:w-8 md:h-8" />
                <div>
                  <p className="text-2xl md:text-4xl font-bold">
                    {monthComparison.percentageChange > 0 ? '+' : ''}
                    {monthComparison.percentageChange?.toFixed(1)}%
                  </p>
                  <p className="text-white/70 text-xs md:text-sm mt-1">{trendInfo.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {/* Total Receipts */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg md:rounded-xl">
                <Receipt className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <p className="text-xs md:text-sm font-semibold text-gray-600">Receipts</p>
            </div>
            <p className="text-xl md:text-3xl font-bold text-gray-900">{analytics?.totalReceipts || 0}</p>
          </div>

          {/* Average Receipt */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-green-50 rounded-lg md:rounded-xl">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              </div>
              <p className="text-xs md:text-sm font-semibold text-gray-600">Avg Receipt</p>
            </div>
            <p className="text-xl md:text-3xl font-bold text-gray-900">{formatCurrency(analytics?.averageReceiptAmount || 0)}</p>
          </div>

          {/* Pending Bills */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-orange-50 rounded-lg md:rounded-xl">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
              </div>
              <p className="text-xs md:text-sm font-semibold text-gray-600">Bills Due</p>
            </div>
            <p className="text-xl md:text-3xl font-bold text-gray-900">{analytics?.pendingBillsCount || 0}</p>
          </div>

          {/* Budget Usage */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="p-1.5 md:p-2 bg-purple-50 rounded-lg md:rounded-xl">
                <Target className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              </div>
              <p className="text-xs md:text-sm font-semibold text-gray-600">Budget Used</p>
            </div>
            <p className="text-xl md:text-3xl font-bold text-gray-900">{analytics?.budgetUtilization?.toFixed(0) || 0}%</p>
          </div>
        </div>

        {/* Charts Row 1: Month Comparison Bar Chart + Spending Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Monthly Comparison Bar Chart */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              <h3 className="text-base md:text-xl font-bold text-gray-900">Month Comparison</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Last Month', amount: monthComparison.lastMonth || 0 },
                  { name: 'This Month', amount: monthComparison.currentMonth || 0 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '14px', fontWeight: 600 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '14px' }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="amount" fill="#007AFF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 6-Month Spending Trend */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
              <h3 className="text-base md:text-xl font-bold text-gray-900">6-Month Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={spendingTrends}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '14px' }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#007AFF"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Category Pie Chart + Daily Spending */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Category Breakdown Pie Chart */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <PieChartIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              <h3 className="text-base md:text-xl font-bold text-gray-900">Category Breakdown</h3>
            </div>
            {categoryBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category} ${percentage.toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {categoryBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Category Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {categoryBreakdown.slice(0, 6).map((cat: any, index: number) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700 font-medium">{cat.category}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                <p>No category data available</p>
              </div>
            )}
          </div>

          {/* Daily Spending Line Chart */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              <h3 className="text-base md:text-xl font-bold text-gray-900">Daily Spending (This Month)</h3>
            </div>
            {dailySpending.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(date) => new Date(date).getDate().toString()}
                  />
                  <YAxis stroke="#6B7280" style={{ fontSize: '14px' }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '2px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#34C759"
                    strokeWidth={3}
                    dot={{ fill: '#34C759', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                <Calendar className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-semibold">No spending data for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                <p className="text-sm mt-1">Upload receipts to see daily trends</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Spendings */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100 mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <Store className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            <h3 className="text-base md:text-xl font-bold text-gray-900">Top Spendings</h3>
          </div>
          
          {topMerchants.length > 0 ? (
            <div className="space-y-2 md:space-y-3">
              {topMerchants.slice(0, 5).map((merchant: any, index: number) => (
                <div key={merchant.storeName} className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg md:rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-bold text-gray-900">{merchant.storeName}</p>
                      <p className="text-xs md:text-sm text-gray-600">{merchant.receiptCount} receipts</p>
                    </div>
                  </div>
                  <p className="text-base md:text-xl font-bold text-blue-600">{formatCurrency(merchant.totalSpent)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No merchant data available</p>
            </div>
          )}
        </div>

        {/* Detailed Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Transaction Stats */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <h4 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Transaction Stats</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Highest</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(analytics?.highestTransaction || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Lowest</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(analytics?.lowestTransaction || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Average</span>
                <span className="text-lg font-bold text-purple-600">{formatCurrency(analytics?.averageReceiptAmount || 0)}</span>
              </div>
            </div>
          </div>

          {/* Bills Overview */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <h4 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Bills Overview</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Total Due</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(analytics?.totalBillsDue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Pending</span>
                <span className="text-lg font-bold text-orange-600">{analytics?.pendingBillsCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Upcoming</span>
                <span className="text-lg font-bold text-yellow-600">{analytics?.upcomingBillsCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Projections */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <h4 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Projections</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Daily Avg</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(analytics?.averageDailySpending || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Month-End</span>
                <span className="text-lg font-bold text-purple-600">{formatCurrency(analytics?.projectedMonthEnd || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Total Budget</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(analytics?.totalBudget || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Details Table */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-pink-600" />
              <h3 className="text-base md:text-xl font-bold text-gray-900">Category Details</h3>
            </div>
            
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="min-w-[500px] px-4 md:px-0">
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <tr>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-900">Category</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-gray-900">Items</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-gray-900">Amount</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-gray-900">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {categoryBreakdown.map((cat: any, index: number) => (
                        <tr key={cat.category} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 md:px-6 py-3 md:py-4">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div
                                className="w-3 h-3 md:w-4 md:h-4 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm md:text-base font-semibold text-gray-900">{cat.category}</span>
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4 text-right text-sm text-gray-600 font-medium">{cat.itemCount}</td>
                          <td className="px-3 md:px-6 py-3 md:py-4 text-right text-sm md:text-base font-bold text-gray-900">{formatCurrency(cat.amount)}</td>
                          <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                            <span className="inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs md:text-sm">
                              {cat.percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
