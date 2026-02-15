export interface Receipt {
  id: string;
  storeName: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  category: ReceiptCategory;
  items: ReceiptItem[];
  imageUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  category?: string;
}

export const ReceiptCategories = {
  FOOD_DINING: 'Food & Dining',
  GROCERIES: 'Groceries',
  FUEL_TRANSPORT: 'Fuel & Transport',
  MEDICAL: 'Medical',
  ENTERTAINMENT: 'Entertainment',
  SHOPPING: 'Shopping',
  UTILITIES: 'Utilities',
  EDUCATION: 'Education',
  HOME: 'Home & Garden',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other',
} as const;

export type ReceiptCategory =
  typeof ReceiptCategories[keyof typeof ReceiptCategories];

export interface ReceiptStats {
  totalReceipts: number;
  totalAmount: number;
  thisMonth: number;
  lastMonth: number;
  categoryBreakdown: CategoryBreakdown[];
  topStores: StoreStats[];
}

export interface CategoryBreakdown {
  category: ReceiptCategory;
  amount: number;
  count: number;
  percentage: number;
}

export interface StoreStats {
  storeName: string;
  totalAmount: number;
  visitCount: number;
}

export interface ReceiptFilters {
  searchQuery?: string;
  category?: ReceiptCategory; // ✅ now works
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}
