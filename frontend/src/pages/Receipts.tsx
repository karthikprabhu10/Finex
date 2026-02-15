import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Receipt } from '../types/receipt';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { receiptApi } from '../services/api';
import { ReceiptsList } from '../components/receipts/ReceiptsList';
import { ReceiptDetailModal } from '../components/receipts/ReceiptDetailModal';
import { Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  category?: string;
}

interface LocalReceipt {
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

const MAIN_CATEGORIES = [
  'All',
  'Other',
  'Food & Dining',
  'Groceries',
  'Fuel & Transport',
  'Medical',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Education',
  'Home & Garden',
  'Maintenance',
];

export const Receipts: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  const [selectedReceipt, setSelectedReceipt] = useState<LocalReceipt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch receipts
  const {
    data: receipts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['receipts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await receiptApi.getReceipts();
        console.log('[Receipts] Raw API response:', response);
        
        // Handle both direct array and nested response format
        let fetchedReceipts: LocalReceipt[] = [];
        if (Array.isArray(response)) {
          fetchedReceipts = response as LocalReceipt[];
        } else {
          const typedResponse = response as Record<string, unknown>;
          fetchedReceipts = ((typedResponse.receipts as LocalReceipt[]) || []) as LocalReceipt[];
        }
        
        console.log('[Receipts] Total fetched:', fetchedReceipts.length);
        console.log('[Receipts] First receipt sample:', fetchedReceipts[0]);
        
        if (fetchedReceipts.length > 0) {
          const categories = new Set(
            fetchedReceipts
              .map((r) => r.category)
              .filter((c) => c)
          );
          console.log('[Receipts] Categories found:', Array.from(categories));
        }
        
        return fetchedReceipts;
      } catch (err) {
        console.error('[Receipts] Error fetching:', err);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Update receipt mutation
  const updateReceiptMutation = useMutation({
    mutationFn: async (updatedReceipt: LocalReceipt) => {
      const updates: Partial<Receipt> = {
        storeName: updatedReceipt.storeName,
        date: updatedReceipt.date,
        totalAmount: updatedReceipt.totalAmount,
        taxAmount: updatedReceipt.taxAmount,
        category: updatedReceipt.category as Receipt['category'],
        items: updatedReceipt.items as Receipt['items'],
        tags: updatedReceipt.tags,
        notes: updatedReceipt.notes,
      };
      return receiptApi.updateReceipt(updatedReceipt.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt updated successfully');
      setIsModalOpen(false);
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError?.response?.data?.message || 'Failed to update receipt';
      toast.error(errorMessage);
    },
  });

  // Delete receipt mutation
  const deleteReceiptMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      return receiptApi.deleteReceipt(receiptId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt deleted successfully');
      setIsModalOpen(false);
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError?.response?.data?.message || 'Failed to delete receipt';
      toast.error(errorMessage);
    },
  });

  // Filter receipts based on search and category
  const filteredReceipts = receipts.filter((receipt) => {
    // Check search
    const matchesSearch =
      searchQuery === '' ||
      receipt.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.items.some((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Check category - show receipt if ANY item matches the category
    const filterCategory = selectedCategory.trim();
    const matchesCategory =
      selectedCategory === 'All' ||
      receipt.items.some((item) => {
        const itemCategory = (item.category || 'Other').trim();
        return itemCategory.toLowerCase() === filterCategory.toLowerCase();
      });

    // Detailed logging for debugging
    if (selectedCategory !== 'All') {
      console.log(
        `[Filter DEBUG] Receipt: "${receipt.storeName}" | Items with category: ${receipt.items.map(i => i.category).join(', ')} | Filter: "${filterCategory}" | Match: ${matchesCategory}`
      );
    }

    return matchesSearch && matchesCategory;
  });
  
  console.log(
    `[Filter] Selected: "${selectedCategory}", Found: ${filteredReceipts.length} of ${receipts.length}`
  );

  const handleReceiptClick = useCallback((receipt: LocalReceipt) => {
    setSelectedReceipt(receipt);
    setIsModalOpen(true);
  }, []);

  const handleSaveReceipt = useCallback(
    async (updatedReceipt: LocalReceipt) => {
      await updateReceiptMutation.mutateAsync(updatedReceipt);
      setSelectedReceipt(updatedReceipt);
    },
    [updateReceiptMutation]
  );

  const handleDeleteReceipt = useCallback(
    async (receiptId: string) => {
      await deleteReceiptMutation.mutateAsync(receiptId);
    },
    [deleteReceiptMutation]
  );

  return (
    <div className={isDarkMode ? 'flex-1 overflow-auto bg-gradient-to-b from-gray-950 to-gray-900' : 'flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-white'}>
      {/* Header */}
      <div className={isDarkMode ? 'sticky top-0 bg-gray-900 border-b border-gray-800 z-10' : 'sticky top-0 bg-white border-b border-gray-200 z-10'}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <h1 className={isDarkMode ? 'text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6' : 'text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6'}>Receipts</h1>

          {/* Search Bar */}
          <div className="relative mb-3 md:mb-4">
            <Search className={isDarkMode ? 'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500' : 'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400'} />
            <input
              type="text"
              placeholder="Search by store or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={isDarkMode ? 'w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' : 'w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'}
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 md:-mx-6 px-4 md:px-6 scrollbar-hide">
            {MAIN_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-full font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'All' && <Filter className="w-3 h-3 md:w-4 md:h-4" />}
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Summary stats */}
        {filteredReceipts.length > 0 && (
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-8">
            <div className={isDarkMode ? 'bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700' : 'bg-white p-3 md:p-4 rounded-lg border border-gray-200'}>
              <p className={isDarkMode ? 'text-xs md:text-sm text-gray-400 mb-0.5 md:mb-1' : 'text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1'}>Receipts</p>
              <p className={isDarkMode ? 'text-lg md:text-2xl font-bold text-white' : 'text-lg md:text-2xl font-bold text-gray-900'}>{filteredReceipts.length}</p>
            </div>
            <div className={isDarkMode ? 'bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700' : 'bg-white p-3 md:p-4 rounded-lg border border-gray-200'}>
              <p className={isDarkMode ? 'text-xs md:text-sm text-gray-400 mb-0.5 md:mb-1' : 'text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1'}>Spent</p>
              <p className={isDarkMode ? 'text-lg md:text-2xl font-bold text-blue-400' : 'text-lg md:text-2xl font-bold text-blue-600'}>
                ₹{filteredReceipts
                  .reduce((sum: number, receipt: LocalReceipt) => sum + receipt.totalAmount, 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className={isDarkMode ? 'bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700' : 'bg-white p-3 md:p-4 rounded-lg border border-gray-200'}>
              <p className={isDarkMode ? 'text-xs md:text-sm text-gray-400 mb-0.5 md:mb-1' : 'text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1'}>Average</p>
              <p className={isDarkMode ? 'text-lg md:text-2xl font-bold text-white' : 'text-lg md:text-2xl font-bold text-gray-900'}>
                ₹{(
                  filteredReceipts.reduce((sum: number, receipt: LocalReceipt) => sum + receipt.totalAmount, 0) /
                  filteredReceipts.length
                ).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Receipts List */}
        <ReceiptsList
          receipts={filteredReceipts}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onReceiptClick={handleReceiptClick}
          emptyMessage={
            receipts.length === 0
              ? 'No receipts found. Upload one to get started!'
              : 'No receipts match your search'
          }
        />
      </div>

      {/* Receipt Detail Modal */}
      <ReceiptDetailModal
        isOpen={isModalOpen}
        receipt={selectedReceipt}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReceipt(null);
        }}
        onSave={handleSaveReceipt}
        onDelete={handleDeleteReceipt}
      />
    </div>
  );
};
