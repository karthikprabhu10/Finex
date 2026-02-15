import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receiptApi } from '../services/api';
import type { Receipt } from '../types/receipt';

/**
 * Hook for fetching all receipts
 */
export const useReceipts = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const receipts = await receiptApi.getReceipts();
      // If single object, wrap in array; if already array, return as is
      return Array.isArray(receipts) ? receipts : [];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for fetching a single receipt
 */
export const useReceipt = (id: string | null, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      if (!id) return null;
      return receiptApi.getReceipt(id);
    },
    enabled: enabled && !!id,
  });
};

/**
 * Hook for updating a receipt
 */
export const useUpdateReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Receipt> }) => {
      return receiptApi.updateReceipt(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};

/**
 * Hook for deleting a receipt
 */
export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return receiptApi.deleteReceipt(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};

/**
 * Hook for getting receipt stats
 */
export const useReceiptStats = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['receiptStats', startDate, endDate],
    queryFn: () => receiptApi.getStats(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook for uploading a single receipt
 */
export const useUploadReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => receiptApi.uploadReceipt(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};

/**
 * Hook for batch uploading receipts
 */
export const useUploadReceiptsBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) => receiptApi.uploadBatch(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};

/**
 * Hook for verifying OCR data
 */
export const useVerifyOCRReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (receiptData: {
      storeName: string;
      date: string;
      totalAmount: number;
      taxAmount: number;
      items: Array<{ name: string; quantity: number; price: number; total: number }>;
      ocrStatus?: string;
      imageUrl?: string;
    }) => receiptApi.verifyOCRReceipt(receiptData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
};
