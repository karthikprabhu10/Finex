import React from 'react';
import { Lightbulb, TrendingDown, AlertCircle, Sparkles, CreditCard, PieChart, RefreshCw, Clock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { receiptApi, budgetApi, billApi } from '../services/api';
import { generateAISuggestions, type AISuggestion } from '../services/aiSuggestions';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

const iconMap: Record<string, React.ElementType> = {
  TrendingDown,
  AlertCircle,
  Sparkles,
  CreditCard,
  PieChart,
  Clock,
};

export const AISuggestions: React.FC = () => {
  const queryClient = useQueryClient();
  const { isDarkMode } = useTheme();
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => {
    const stored = localStorage.getItem('dismissedSuggestions');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Fetch user data for context
  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptApi.getReceipts(),
  });

  const { data: budget } = useQuery({
    queryKey: ['budget'],
    queryFn: () => budgetApi.getBudget(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billApi.getBills(),
  });

  // Get subscriptions from localStorage
  const getSubscriptions = () => {
    try {
      const stored = localStorage.getItem('subscriptions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Generate AI suggestions
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['ai-suggestions-groq', receipts.length, budget, bills.length],
    queryFn: async () => {
      const subscriptions = getSubscriptions();
      
      const userData = {
        subscriptions: subscriptions.map((s: any) => ({
          name: s.name,
          amount: s.amount,
          frequency: s.frequency,
          category: s.category,
          status: s.status,
        })),
        budget: budget ? {
          monthlyIncome: budget.monthlyIncome,
          allocations: budget.allocations || [],
        } : undefined,
        recentReceipts: receipts.slice(0, 20).map((r: any) => ({
          storeName: r.storeName || r.store_name || 'Unknown',
          totalAmount: r.totalAmount || r.total_amount || 0,
          date: r.date || r.created_at,
          category: r.category || 'Uncategorized',
        })),
        bills: bills.map((b: any) => ({
          name: b.name,
          amount: b.amount,
          dueDate: b.dueDate || b.due_date,
          status: b.status,
          category: b.category,
        })),
      };

      return generateAISuggestions(userData);
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));

  const handleDismiss = (suggestionId: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(suggestionId);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedSuggestions', JSON.stringify([...newDismissed]));
    toast.success('Suggestion dismissed');
  };

  const handleRefresh = () => {
    // Clear dismissed suggestions on refresh
    setDismissedIds(new Set());
    localStorage.removeItem('dismissedSuggestions');
    queryClient.invalidateQueries({ queryKey: ['ai-suggestions-groq'] });
    refetch();
    toast.info('Refreshing suggestions...');
  };

  const handleApplySuggestion = (suggestion: AISuggestion) => {
    // Navigate based on suggestion type
    if (suggestion.title.toLowerCase().includes('subscription')) {
      window.location.href = '/subscriptions';
    } else if (suggestion.title.toLowerCase().includes('budget')) {
      window.location.href = '/budget-planner';
    } else if (suggestion.title.toLowerCase().includes('bill')) {
      window.location.href = '/bill-reminders';
    } else if (suggestion.title.toLowerCase().includes('track') || suggestion.title.toLowerCase().includes('receipt')) {
      window.location.href = '/upload';
    } else {
      toast.info('Suggestion applied! Check relevant sections for updates.');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={cn(
            "text-xl md:text-ios-3xl font-bold",
            isDarkMode ? "text-white" : "text-ios-gray-900"
          )}>AI Suggestions</h1>
          <p className={cn(
            "text-sm md:text-ios-base mt-1",
            isDarkMode ? "text-gray-400" : "text-ios-gray-500"
          )}>
            Personalized insights to optimize your spending
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-full transition-colors disabled:opacity-50",
              isDarkMode ? "hover:bg-gray-700" : "hover:bg-ios-gray-100"
            )}
            title="Refresh suggestions"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-ios-blue ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Lightbulb className="w-6 h-6 md:w-8 md:h-8 text-ios-blue" />
        </div>
      </div>

      {isLoading ? (
        <div className={cn(
          "glass-card p-8 md:p-12 rounded-ios-lg text-center",
          isDarkMode && "bg-gray-800/50 border-gray-700"
        )}>
          <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-ios-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={cn("text-sm md:text-base", isDarkMode ? "text-gray-400" : "text-ios-gray-500")}>Generating AI suggestions...</p>
        </div>
      ) : visibleSuggestions.length === 0 ? (
        <div className={cn(
          "glass-card p-8 md:p-12 rounded-ios-lg text-center",
          isDarkMode && "bg-gray-800/50 border-gray-700"
        )}>
          <Lightbulb className={cn(
            "w-12 h-12 md:w-16 md:h-16 mx-auto mb-4",
            isDarkMode ? "text-gray-600" : "text-ios-gray-300"
          )} />
          <h3 className={cn(
            "text-base md:text-ios-lg font-semibold mb-2",
            isDarkMode ? "text-white" : "text-ios-gray-900"
          )}>
            No suggestions yet
          </h3>
          <p className={isDarkMode ? "text-gray-400" : "text-ios-gray-500"}>
            Add more receipts and financial data to get personalized AI-powered insights
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 btn-primary"
          >
            Generate Suggestions
          </button>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {visibleSuggestions.map((suggestion: AISuggestion) => {
            const Icon = iconMap[suggestion.icon] || Sparkles;
            return (
              <div
                key={suggestion.id}
                className={cn(
                  "glass-card p-4 md:p-6 rounded-ios-lg transition-all duration-300",
                  isDarkMode 
                    ? "bg-gray-800/50 border-gray-700 hover:bg-gray-800/70" 
                    : "hover:shadow-ios-lg"
                )}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 rounded-ios flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${suggestion.color}20` }}
                  >
                    <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: suggestion.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <h3 className={cn(
                        "text-base md:text-ios-lg font-semibold",
                        isDarkMode ? "text-white" : "text-ios-gray-900"
                      )}>
                        {suggestion.title}
                      </h3>
                      <span
                        className={cn(
                          "px-2 md:px-3 py-1 rounded-full text-xs md:text-ios-xs font-semibold whitespace-nowrap self-start",
                          suggestion.impact === 'High Impact'
                            ? 'bg-red-500/10 text-red-500'
                            : suggestion.impact === 'Medium Impact'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-green-500/10 text-green-500'
                        )}
                      >
                        {suggestion.impact}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm md:text-ios-base mb-3 md:mb-4",
                      isDarkMode ? "text-gray-300" : "text-ios-gray-600"
                    )}>
                      {suggestion.description}
                    </p>
                    <div className="flex gap-2 md:gap-3">
                      <button 
                        onClick={() => handleApplySuggestion(suggestion)}
                        className={cn(
                          "text-xs md:text-ios-sm font-semibold transition-colors",
                          isDarkMode 
                            ? "text-blue-400 hover:text-blue-300" 
                            : "text-ios-blue hover:text-blue-600"
                        )}
                      >
                        Apply Suggestion
                      </button>
                      <button
                        onClick={() => handleDismiss(suggestion.id)}
                        className={cn(
                          "text-xs md:text-ios-sm font-semibold transition-colors",
                          isDarkMode 
                            ? "text-gray-400 hover:text-gray-300" 
                            : "text-ios-gray-500 hover:text-ios-gray-700"
                        )}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
