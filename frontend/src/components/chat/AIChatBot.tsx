import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { receiptApi, budgetApi, billApi } from '../../services/api';
import { sendMessage, isGeminiConfigured, type ChatMessage, type UserFinancialContext } from '../../services/gemini';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

export const AIChatBot: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch user financial data
  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptApi.getReceipts(),
    enabled: isOpen,
  });

  const { data: budget } = useQuery({
    queryKey: ['budget'],
    queryFn: () => budgetApi.getBudget(),
    enabled: isOpen,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billApi.getBills(),
    enabled: isOpen,
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

  // Build user context for AI
  const buildUserContext = (): UserFinancialContext => {
    const subscriptions = getSubscriptions();
    
    return {
      userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
      userEmail: user?.email,
      subscriptions: subscriptions.map((s: any) => ({
        name: s.name,
        amount: s.amount,
        frequency: s.frequency,
        category: s.category,
        status: s.status,
        nextBilling: s.nextBilling,
      })),
      budget: budget ? {
        monthlyIncome: budget.monthlyIncome,
        allocations: budget.allocations || [],
      } : undefined,
      recentReceipts: receipts.slice(0, 10).map((r: any) => ({
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
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Add welcome message when chat opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
      setMessages([{
        role: 'assistant',
        content: `Hi ${userName}! 👋 I'm Finex AI, your personal finance assistant. I can help you with:\n\n• Analyzing your spending patterns\n• Managing subscriptions and bills\n• Budget planning advice\n• Financial tips and recommendations\n\nHow can I help you today?`,
        timestamp: new Date(),
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const context = buildUserContext();
      const response = await sendMessage(userMessage.content, messages, context);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "How much am I spending monthly?",
    "Which subscriptions should I cancel?",
    "How can I save more money?",
    "Show my budget summary",
  ];

  if (!isGeminiConfigured()) {
    return null; // Don't render if API key is not configured
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-8 right-8 z-[9999] w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-500 ease-out',
          'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600',
          'hover:shadow-3xl hover:scale-105 active:scale-95',
          'backdrop-blur-xl border border-white/20',
          isOpen && 'hidden'
        )}
        style={{
          boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3), 0 8px 25px rgba(0, 0, 0, 0.12)'
        }}
        aria-label="Open AI Chat"
      >
        <Bot className="w-7 h-7 text-white drop-shadow-sm" />
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-lg">
          <div className="w-full h-full bg-green-400 rounded-full animate-pulse" />
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            'fixed bottom-8 right-8 z-[9999] w-[420px] h-[650px] max-h-[85vh] rounded-[28px] flex flex-col overflow-hidden',
            'transition-all duration-700 ease-out animate-fade-in',
            'backdrop-blur-3xl border border-white/10',
            isDarkMode 
              ? 'bg-gray-900/95 shadow-black/50' 
              : 'bg-white/95 shadow-black/20'
          )}
          style={{
            boxShadow: isDarkMode 
              ? '0 32px 64px rgba(0, 0, 0, 0.5), 0 16px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 32px 64px rgba(0, 0, 0, 0.2), 0 16px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl tracking-tight drop-shadow-sm">Finex AI</h3>
                  <p className="text-white/80 text-sm font-medium">Your Finance Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 hover:bg-white/25 flex items-center justify-center transition-all duration-300 active:scale-90"
              >
                <X className="w-5 h-5 text-white drop-shadow-sm" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={cn(
            'flex-1 overflow-y-auto p-5 space-y-6',
            'scrollbar-hide',
            isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50/80'
          )}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-end gap-3',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border-2',
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300/30' 
                    : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 border-purple-300/30'
                )}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white drop-shadow-sm" />
                  ) : (
                    <Bot className="w-4 h-4 text-white drop-shadow-sm" />
                  )}
                </div>
                <div className={cn(
                  'max-w-[75%] px-5 py-4 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl rounded-br-lg shadow-lg border border-blue-400/20'
                    : isDarkMode 
                      ? 'bg-gray-800/80 text-gray-100 rounded-3xl rounded-bl-lg shadow-lg border border-gray-600/30 backdrop-blur-xl'
                      : 'bg-white/90 text-gray-800 rounded-3xl rounded-bl-lg shadow-lg border border-gray-200/50 backdrop-blur-xl'
                )}>
                  <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                  <span className={cn(
                    'text-xs mt-2 block font-medium opacity-70',
                    msg.role === 'user' ? 'text-blue-100' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-end gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 border-2 border-purple-300/30 flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white drop-shadow-sm" />
                </div>
                <div className={cn(
                  'rounded-3xl rounded-bl-lg px-5 py-4 shadow-lg border',
                  isDarkMode 
                    ? 'bg-gray-800/80 border-gray-600/30 backdrop-blur-xl' 
                    : 'bg-white/90 border-gray-200/50 backdrop-blur-xl'
                )}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className={cn('w-2 h-2 rounded-full animate-pulse', isDarkMode ? 'bg-gray-400' : 'bg-gray-500')} style={{ animationDelay: '0ms' }} />
                      <div className={cn('w-2 h-2 rounded-full animate-pulse', isDarkMode ? 'bg-gray-400' : 'bg-gray-500')} style={{ animationDelay: '150ms' }} />
                      <div className={cn('w-2 h-2 rounded-full animate-pulse', isDarkMode ? 'bg-gray-400' : 'bg-gray-500')} style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className={cn(
                      'text-sm font-medium',
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    )}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (show when few messages) */}
          {messages.length <= 1 && !isLoading && (
            <div className={cn(
              'px-6 py-4 border-t backdrop-blur-xl',
              isDarkMode ? 'border-gray-700/50 bg-gray-800/50' : 'border-gray-200/50 bg-white/50'
            )}>
              <p className={cn(
                'text-sm font-semibold mb-3 tracking-wide',
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              )}>Quick questions:</p>
              <div className="flex flex-wrap gap-2.5">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputValue(question);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      'text-sm px-4 py-2.5 rounded-2xl transition-all duration-300 font-medium border',
                      'hover:scale-105 active:scale-95 shadow-sm',
                      isDarkMode 
                        ? 'bg-gray-700/80 text-gray-200 hover:bg-gray-600/80 border-gray-600/50 backdrop-blur-xl'
                        : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 border-gray-200/50 backdrop-blur-xl'
                    )}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className={cn(
            'p-6 pt-4 border-t backdrop-blur-xl',
            isDarkMode ? 'border-gray-700/50 bg-gray-900/50' : 'border-gray-200/50 bg-white/50'
          )}>
            {error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl flex items-center gap-3 backdrop-blur-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your finances..."
                  disabled={isLoading}
                  className={cn(
                    'w-full px-5 py-4 rounded-3xl text-sm font-medium transition-all duration-300',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:scale-[1.02]',
                    'border backdrop-blur-xl shadow-lg',
                    isDarkMode 
                      ? 'bg-gray-800/80 text-white placeholder-gray-400 border-gray-600/50'
                      : 'bg-white/80 text-gray-900 placeholder-gray-500 border-gray-300/50',
                    isLoading && 'opacity-50'
                  )}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg border',
                  'active:scale-90',
                  inputValue.trim() && !isLoading
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-blue-400/30 hover:shadow-xl hover:scale-105'
                    : isDarkMode 
                      ? 'bg-gray-700/80 text-gray-500 border-gray-600/50'
                      : 'bg-gray-200/80 text-gray-400 border-gray-300/50'
                )}
              >
                <Send className={cn(
                  'transition-transform duration-300',
                  inputValue.trim() && !isLoading ? 'w-5 h-5 rotate-0' : 'w-5 h-5 -rotate-45'
                )} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
