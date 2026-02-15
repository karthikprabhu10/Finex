import { create } from 'zustand';
import type { Receipt, ReceiptFilters } from '../types/receipt';

interface ReceiptStore {
  receipts: Receipt[];
  selectedReceipt: Receipt | null;
  filters: ReceiptFilters;
  isUploading: boolean;
  uploadProgress: number;
  
  setReceipts: (receipts: Receipt[]) => void;
  addReceipt: (receipt: Receipt) => void;
  updateReceipt: (id: string, updates: Partial<Receipt>) => void;
  deleteReceipt: (id: string) => void;
  setSelectedReceipt: (receipt: Receipt | null) => void;
  setFilters: (filters: ReceiptFilters) => void;
  clearFilters: () => void;
  setUploadProgress: (progress: number) => void;
  setIsUploading: (isUploading: boolean) => void;
}

export const useReceiptStore = create<ReceiptStore>((set) => ({
  receipts: [],
  selectedReceipt: null,
  filters: {},
  isUploading: false,
  uploadProgress: 0,

  setReceipts: (receipts) => set({ receipts }),
  
  addReceipt: (receipt) => 
    set((state) => ({ receipts: [receipt, ...state.receipts] })),
  
  updateReceipt: (id, updates) =>
    set((state) => ({
      receipts: state.receipts.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),
  
  deleteReceipt: (id) =>
    set((state) => ({
      receipts: state.receipts.filter((r) => r.id !== id),
    })),
  
  setSelectedReceipt: (receipt) => set({ selectedReceipt: receipt }),
  
  setFilters: (filters) => set({ filters }),
  
  clearFilters: () => set({ filters: {} }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  setIsUploading: (isUploading) => set({ isUploading }),
}));