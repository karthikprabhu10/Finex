import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi } from '../services/api';
import { Wallet, Home, ShoppingCart, Zap, PiggyBank, TrendingUp, Save } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#007AFF', '#FF9500', '#34C759', '#FF3B30', '#5856D6'];

export const BudgetPlanner: React.FC = () => {
  const queryClient = useQueryClient();
  const [monthlyIncome, setMonthlyIncome] = useState<number>(50000);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Smart allocation percentages
  const allocations = [
    { name: 'Rent', percentage: 30, icon: Home, color: '#007AFF' },
    { name: 'Groceries', percentage: 20, icon: ShoppingCart, color: '#FF9500' },
    { name: 'Bills & Utilities', percentage: 15, icon: Zap, color: '#34C759' },
    { name: 'Savings', percentage: 20, icon: PiggyBank, color: '#5856D6' },
    { name: 'Others', percentage: 15, icon: TrendingUp, color: '#FF3B30' },
  ];

  // Fetch existing budget
  const { data: existingBudget } = useQuery({
    queryKey: ['budget'],
    queryFn: budgetApi.getBudget,
  });

  // Load existing budget data when available
  useEffect(() => {
    if (existingBudget && existingBudget.monthlyIncome) {
      setMonthlyIncome(existingBudget.monthlyIncome);
      setHasChanges(false);
    }
  }, [existingBudget]);

  // Save budget mutation
  const saveBudgetMutation = useMutation({
    mutationFn: async () => {
      const budgetData = {
        monthlyIncome,
        allocations: allocations.map(a => ({
          category: a.name,
          percentage: a.percentage,
          amount: calculateAmount(a.percentage)
        }))
      };
      return budgetApi.saveBudget(budgetData);
    },
    onSuccess: () => {
      toast.success('Budget saved successfully!');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
    onError: () => {
      toast.error('Failed to save budget');
    },
  });

  const handleIncomeChange = (value: number) => {
    setMonthlyIncome(value);
    setHasChanges(true);
  };

  const handleSaveBudget = () => {
    saveBudgetMutation.mutate();
  };

  const calculateAmount = (percentage: number) => {
    return (monthlyIncome * percentage) / 100;
  };

  const chartData = allocations.map((item) => ({
    name: item.name,
    value: calculateAmount(item.percentage),
  }));

  const totalSavings = calculateAmount(20);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-ios-3xl font-bold text-ios-gray-900">Budget Planner</h1>
          <p className="text-sm md:text-ios-base text-ios-gray-500 mt-1">
            Smart income allocation and savings calculator
          </p>
        </div>
        <Wallet className="hidden sm:block w-8 h-8 text-ios-blue" />
      </div>

      {/* Income Input */}
      <div className="glass-card p-4 md:p-6 rounded-ios-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 md:mb-4 gap-3">
          <label className="block text-sm md:text-ios-sm font-medium text-ios-gray-700">
            Monthly Income
          </label>
          {hasChanges && (
            <button
              onClick={handleSaveBudget}
              disabled={saveBudgetMutation.isPending}
              className={`
                flex items-center gap-3 px-6 py-3.5 rounded-2xl font-semibold text-sm
                transition-all duration-300 shadow-lg border
                ${saveBudgetMutation.isPending 
                  ? 'bg-gray-400 text-white border-gray-400/30 cursor-not-allowed opacity-75' 
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-blue-400/30 hover:shadow-xl hover:scale-105 active:scale-95'
                }
                backdrop-blur-xl
              `}
            >
              <Save className={`w-4 h-4 ${saveBudgetMutation.isPending ? '' : 'drop-shadow-sm'}`} />
              <span className="tracking-wide">
                {saveBudgetMutation.isPending ? 'Saving...' : 'Save Budget'}
              </span>
            </button>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray-500 text-base md:text-ios-lg">
            ₹
          </span>
          <input
            type="number"
            value={monthlyIncome}
            onChange={(e) => handleIncomeChange(Number(e.target.value))}
            className="w-full pl-8 md:pl-10 pr-4 py-3 md:py-4 text-lg md:text-ios-2xl font-bold border border-ios-gray-300 rounded-ios-lg focus:ring-2 focus:ring-ios-blue focus:border-transparent"
            placeholder="Enter your monthly income"
          />
        </div>
        <p className="mt-2 text-xs md:text-ios-sm text-ios-gray-500">
          Enter your total monthly income to get personalized budget recommendations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <Wallet className="w-4 h-4 md:w-5 md:h-5 text-ios-blue" />
            <span className="text-xs md:text-ios-sm text-ios-gray-500">Monthly Income</span>
          </div>
          <p className="text-lg md:text-ios-2xl font-bold text-ios-gray-900">₹{monthlyIncome.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <PiggyBank className="w-4 h-4 md:w-5 md:h-5 text-ios-green" />
            <span className="text-xs md:text-ios-sm text-ios-gray-500">Monthly Savings</span>
          </div>
          <p className="text-lg md:text-ios-2xl font-bold text-ios-gray-900">₹{totalSavings.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-ios-purple" />
            <span className="text-xs md:text-ios-sm text-ios-gray-500">Annual Savings</span>
          </div>
          <p className="text-lg md:text-ios-2xl font-bold text-ios-gray-900">₹{(totalSavings * 12).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Budget Breakdown */}
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <h2 className="text-base md:text-ios-lg font-semibold text-ios-gray-900 mb-4 md:mb-6">
            Budget Breakdown
          </h2>
          <div className="space-y-3 md:space-y-4">
            {allocations.map((item) => {
              const Icon = item.icon;
              const amount = calculateAmount(item.percentage);
              
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div
                      className="w-8 h-8 md:w-10 md:h-10 rounded-ios flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm md:text-ios-base font-medium text-ios-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs md:text-ios-sm text-ios-gray-500">
                        {item.percentage}% of income
                      </p>
                    </div>
                  </div>
                  <p className="text-base md:text-ios-lg font-bold text-ios-gray-900">
                    ₹{amount.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <h2 className="text-base md:text-ios-lg font-semibold text-ios-gray-900 mb-4 md:mb-6">
            Visual Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ₹${entry.value.toLocaleString()}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tips */}
      <div className="glass-card p-4 md:p-6 rounded-ios-lg">
        <h2 className="text-base md:text-ios-lg font-semibold text-ios-gray-900 mb-3 md:mb-4">
          💡 Smart Budgeting Tips
        </h2>
        <ul className="space-y-2 text-sm md:text-ios-base text-ios-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-ios-green font-bold">•</span>
            <span>Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ios-green font-bold">•</span>
            <span>Keep rent/housing costs below 30% of your income</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ios-green font-bold">•</span>
            <span>Build an emergency fund of 3-6 months of expenses</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ios-green font-bold">•</span>
            <span>Review and adjust your budget monthly based on actual spending</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
