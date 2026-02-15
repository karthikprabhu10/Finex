import axios from 'axios';
import type { Receipt, ReceiptFilters, ReceiptStats } from '../types/receipt';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase_token');
  console.log('[API] Request to:', config.url);
  console.log('[API] Token available:', token ? 'Yes' : 'No');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[API] Authorization header set for', config.url);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Receipt APIs
export const receiptApi = {
  // Upload single receipt
  uploadReceipt: async (file: File): Promise<Receipt> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/receipts/upload', formData);
    return data as Receipt;
  },

  // Batch upload receipts
  uploadBatch: async (files: File[]): Promise<Receipt[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const { data } = await api.post('/receipts/upload-batch', formData);
    console.log('[API] uploadBatch response:', data);
    console.log('[API] data.uploaded:', data.uploaded);
    // Extract uploaded receipts from response
    return (data.uploaded || []) as Receipt[];
  },

  // Verify OCR extracted data and save to MongoDB
  verifyOCRReceipt: async (receiptData: {
    storeName: string;
    date: string;
    totalAmount: number;
    taxAmount: number;
    items: Array<{ name: string; quantity: number; price: number; total: number }>;
    ocrStatus?: string;
    imageUrl?: string;
  }): Promise<any> => {
    const { data } = await api.post('/receipts/verify', receiptData);
    return data;
  },

  // Get all receipts with filters
  getReceipts: async (filters?: ReceiptFilters): Promise<Receipt[]> => {
    const { data } = await api.get('/receipts', { params: filters });
    return (data.receipts || data || []) as Receipt[];
  },

  // Get single receipt
  getReceipt: async (id: string): Promise<Receipt> => {
    const { data } = await api.get(`/receipts/${id}`);
    return (data.receipt || data) as Receipt;
  },

  // Update receipt
  updateReceipt: async (id: string, updates: Partial<Receipt>): Promise<Receipt> => {
    const { data } = await api.put(`/receipts/${id}`, updates);
    return (data.receipt || data) as Receipt;
  },

  // Delete receipt
  deleteReceipt: async (id: string): Promise<void> => {
    await api.delete(`/receipts/${id}`);
  },

  // Get dashboard stats
  getStats: async (startDate?: string, endDate?: string): Promise<ReceiptStats> => {
    const { data } = await api.get('/receipts/stats', {
      params: { startDate, endDate },
    });
    return (data.stats || data) as ReceiptStats;
  },

  // Export receipts
  exportReceipts: async (format: 'excel' | 'csv', filters?: ReceiptFilters): Promise<Blob> => {
    const { data } = await api.get(`/receipts/export/${format}`, {
      params: filters,
      responseType: 'blob',
    });
    return data;
  },
};

// Budget APIs
export const budgetApi = {
  // Get user's budget
  getBudget: async (): Promise<any> => {
    const { data } = await api.get('/budget/');
    return data.data;
  },

  // Create or update budget
  saveBudget: async (budgetData: {
    monthlyIncome: number;
    allocations: Array<{ category: string; percentage: number; amount: number }>;
  }): Promise<any> => {
    const { data } = await api.post('/budget/', budgetData);
    return data;
  },

  // Update budget
  updateBudget: async (updates: {
    monthlyIncome?: number;
    allocations?: Array<{ category: string; percentage: number; amount: number }>;
  }): Promise<any> => {
    const { data } = await api.put('/budget/', updates);
    return data;
  },

  // Delete budget
  deleteBudget: async (): Promise<any> => {
    const { data } = await api.delete('/budget/');
    return data;
  },
};

// Bill APIs
export const billApi = {
  // Get all bills
  getBills: async (): Promise<any> => {
    const { data } = await api.get('/bills/');
    return data.data;
  },

  // Get bills total
  getBillsTotal: async (status?: string): Promise<any> => {
    const { data } = await api.get('/bills/total', {
      params: status ? { status } : {},
    });
    return data.data;
  },

  // Create bill
  createBill: async (billData: {
    name: string;
    amount: number;
    dueDate: string;
    category: string;
    recurring?: boolean;
    status?: 'pending' | 'upcoming' | 'paid';
  }): Promise<any> => {
    const { data } = await api.post('/bills/', billData);
    return data;
  },

  // Update bill
  updateBill: async (billId: string, updates: {
    name?: string;
    amount?: number;
    dueDate?: string;
    category?: string;
    recurring?: boolean;
    status?: 'pending' | 'upcoming' | 'paid';
  }): Promise<any> => {
    const { data } = await api.put(`/bills/${billId}`, updates);
    return data;
  },

  // Delete bill
  deleteBill: async (billId: string): Promise<any> => {
    const { data } = await api.delete(`/bills/${billId}`);
    return data;
  },

  // Set bill reminder
  setBillReminder: async (billId: string, reminderData: {
    reminderDate: string;
    message: string;
  }): Promise<any> => {
    const { data } = await api.post(`/bills/${billId}/reminder`, reminderData);
    return data;
  },

  // Mark bill as paid (creates receipt and updates status)
  markBillAsPaid: async (billId: string): Promise<any> => {
    const { data } = await api.post(`/bills/${billId}/mark-paid`);
    return data;
  },
};

// Notification APIs
export const notificationApi = {
  // Get all notifications
  getNotifications: async (): Promise<any> => {
    const { data } = await api.get('/notifications/');
    return data.data || [];
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<any> => {
    const { data } = await api.put(`/notifications/${notificationId}/read`);
    return data;
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<any> => {
    const { data } = await api.delete(`/notifications/${notificationId}`);
    return data;
  },
};

// Analytics API
export const analyticsApi = {
  // Get all analytics
  getAnalytics: async (startDate?: string, endDate?: string): Promise<any> => {
    const { data } = await api.get('/analytics/', {
      params: { startDate, endDate },
    });
    return data;
  },
};

// AI Suggestions API
export const aiSuggestionsApi = {
  // Get AI-generated suggestions
  getSuggestions: async (): Promise<any> => {
    const { data } = await api.get('/ai-suggestions');
    return data;
  },

  // Dismiss a suggestion
  dismissSuggestion: async (suggestionId: string): Promise<any> => {
    const { data } = await api.post(`/ai-suggestions/${suggestionId}/dismiss`);
    return data;
  },
};

// Subscription APIs
export const subscriptionApi = {
  // Get all subscriptions
  getSubscriptions: async (): Promise<any[]> => {
    const { data } = await api.get('/subscriptions/');
    return data.data || [];
  },

  // Create subscription
  createSubscription: async (subscription: {
    name: string;
    amount: number;
    frequency: string;
    nextBilling: string;
    category: string;
    color?: string;
    description?: string;
  }): Promise<any> => {
    const { data } = await api.post('/subscriptions/', subscription);
    return data.data;
  },

  // Update subscription
  updateSubscription: async (id: string, updates: {
    name?: string;
    amount?: number;
    frequency?: string;
    nextBilling?: string;
    category?: string;
    color?: string;
    description?: string;
  }): Promise<any> => {
    const { data } = await api.put(`/subscriptions/${id}`, updates);
    return data.data;
  },

  // Delete subscription
  deleteSubscription: async (id: string): Promise<void> => {
    await api.delete(`/subscriptions/${id}`);
  },

  // Get total monthly cost
  getTotal: async (): Promise<{ count: number; monthlyTotal: number }> => {
    const { data } = await api.get('/subscriptions/total');
    return data.data;
  },
};

// Profile APIs
export const profileApi = {
  // Get profile
  getProfile: async (): Promise<any> => {
    const { data } = await api.get('/profile/');
    return data.data;
  },

  // Update profile
  updateProfile: async (profile: {
    full_name?: string;
    phone?: string;
    location?: string;
    bio?: string;
    avatar_url?: string;
  }): Promise<any> => {
    const { data } = await api.put('/profile/', profile);
    return data.data;
  },

  // Update avatar only
  updateAvatar: async (avatar_url: string): Promise<any> => {
    const { data } = await api.post('/profile/avatar', { avatar_url });
    return data.data;
  },
};

export default api;