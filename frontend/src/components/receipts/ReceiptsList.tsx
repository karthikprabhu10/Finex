import React from 'react';
import { Calendar, Store, ChevronRight, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn, formatCurrency } from '../../lib/utils';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  category?: string;
}

interface Receipt {
  id: string;
  storeName: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  category: string;
  items: ReceiptItem[];
  tags: string[];
  notes: string;
  imageUrl?: string;
  createdAt?: string;
}

interface ReceiptsListProps {
  receipts: Receipt[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onReceiptClick: (receipt: Receipt) => void;
  emptyMessage?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Food & Dining': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Groceries': { bg: 'bg-green-100', text: 'text-green-700' },
  'Fuel & Transport': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Medical': { bg: 'bg-red-100', text: 'text-red-700' },
  'Entertainment': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Shopping': { bg: 'bg-pink-100', text: 'text-pink-700' },
  'Utilities': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Education': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'Home & Garden': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Maintenance': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'Other': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export const ReceiptsList: React.FC<ReceiptsListProps> = ({
  receipts,
  isLoading,
  isError,
  error,
  onReceiptClick,
  emptyMessage = 'No receipts found. Upload one to get started!',
}) => {
  const { isDarkMode } = useTheme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={isDarkMode ? 'bg-red-900/20 border border-red-700 rounded-lg p-6 text-center' : 'bg-red-50 border border-red-200 rounded-lg p-6 text-center'}>
        <p className={isDarkMode ? 'text-red-400 font-medium' : 'text-red-700 font-medium'}>Error loading receipts</p>
        {error && <p className={isDarkMode ? 'text-red-300 text-sm mt-1' : 'text-red-600 text-sm mt-1'}>{error.message}</p>}
      </div>
    );
  }

  if (!receipts || receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <Store className={isDarkMode ? 'w-12 h-12 text-gray-600 mx-auto mb-4' : 'w-12 h-12 text-gray-300 mx-auto mb-4'} />
        <p className={isDarkMode ? 'text-gray-400 text-lg' : 'text-gray-600 text-lg'}>{emptyMessage}</p>
      </div>
    );
  }

  // Group receipts by date
  const groupedReceipts = receipts.reduce(
    (groups: Record<string, Receipt[]>, receipt) => {
      const date = new Date(receipt.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(receipt);
      return groups;
    },
    {}
  );

  const sortedDates = Object.keys(groupedReceipts).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date Header */}
          <div className="px-2 mb-3">
            <p className={isDarkMode ? 'text-sm font-semibold text-gray-500 uppercase tracking-wide' : 'text-sm font-semibold text-gray-500 uppercase tracking-wide'}>{date}</p>
          </div>

          {/* Receipts for this date */}
          <div className="space-y-2">
            {groupedReceipts[date].map((receipt) => (
              <button
                key={receipt.id}
                onClick={() => onReceiptClick(receipt)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-all active:scale-95',
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Store name and category */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={isDarkMode ? 'font-semibold text-white truncate' : 'font-semibold text-gray-900 truncate'}>{receipt.storeName}</h3>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                          isDarkMode 
                            ? 'bg-blue-900/40 text-blue-300'
                            : (CATEGORY_COLORS[receipt.category]?.bg || 'bg-gray-100'),
                          !isDarkMode && (CATEGORY_COLORS[receipt.category]?.text || 'text-gray-700')
                        )}
                      >
                        {receipt.category}
                      </span>
                    </div>

                    {/* Items preview */}
                    {receipt.items && receipt.items.length > 0 && (
                      <p className={isDarkMode ? 'text-sm text-gray-400 truncate' : 'text-sm text-gray-600 truncate'}>
                        {receipt.items.map((item) => item.name).join(', ')}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className={isDarkMode ? 'flex items-center gap-1 text-xs text-gray-500' : 'flex items-center gap-1 text-xs text-gray-500'}>
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(receipt.date).toLocaleDateString()}
                      </div>
                      <div className={isDarkMode ? 'flex items-center gap-1 text-xs text-gray-500' : 'flex items-center gap-1 text-xs text-gray-500'}>
                        <Store className="w-3.5 h-3.5" />
                        {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Right content - Amount and arrow */}
                  <div className="flex flex-col items-end gap-2">
                    <p className={isDarkMode ? 'font-bold text-lg text-white' : 'font-bold text-lg text-gray-900'}>
                      {formatCurrency(receipt.totalAmount)}
                    </p>
                    <ChevronRight className={isDarkMode ? 'w-5 h-5 text-gray-600' : 'w-5 h-5 text-gray-400'} />
                  </div>
                </div>

                {/* Tags - if any */}
                {receipt.tags && receipt.tags.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {receipt.tags.map((tag) => (
                      <span
                        key={tag}
                        className={isDarkMode ? 'text-xs px-2 py-1 bg-blue-900/40 text-blue-300 rounded-full' : 'text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full'}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
