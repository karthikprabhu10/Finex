import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Calendar,
  DollarSign,
  Edit2,
  Check,
  Trash2,
  Tag,
  FileText,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn, formatCurrency } from '../../lib/utils';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  category?: string;
}

type ReceiptData = {
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
};

interface ReceiptDetailModalProps {
  isOpen: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
  onSave?: (updatedReceipt: ReceiptData) => Promise<void>;
  onDelete?: (receiptId: string) => Promise<void>;
}

const ITEM_CATEGORIES = [
  'Dining',
  'Groceries',
  'Transport',
  'Entertainment',
  'Shopping',
  'Medical',
  'Utilities',
  'Education',
  'Home',
  'Other',
];

const MAIN_CATEGORIES = [
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
  'Other',
];

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  isOpen,
  receipt,
  onClose,
  onSave,
  onDelete,
}) => {
  const { isDarkMode } = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<ReceiptData | null>(receipt);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setEditedReceipt(receipt);
    setEditMode(false);
  }, [receipt]);

  if (!isOpen || !receipt) return null;

  const handleInputChange = (field: string, value: string | number) => {
    setEditedReceipt((prev: ReceiptData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...(editedReceipt?.items || [])];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setEditedReceipt((prev: ReceiptData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: newItems,
      };
    });
  };

  const handleDeleteItem = (index: number) => {
    const newItems = (editedReceipt?.items || []).filter((_: ReceiptItem, i: number) => i !== index);
    setEditedReceipt((prev: ReceiptData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: newItems,
      };
    });
  };

  const handleSave = async () => {
    if (!onSave || !editedReceipt) return;
    
    setIsSaving(true);
    try {
      await onSave(editedReceipt);
      setEditMode(false);
    } catch (error) {
      console.error('Error saving receipt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || !receipt) return;
    
    setIsDeleting(true);
    try {
      await onDelete(receipt.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting receipt:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const displayReceipt = editMode ? editedReceipt : receipt;

  return (
    <>
      {/* Backdrop */}
      <div
        className={isDarkMode ? 'fixed inset-0 bg-black/70 z-40 transition-opacity duration-300' : 'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300'}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container - iOS style */}
      <div className="fixed inset-0 z-50 flex items-end">
        <div
          className={cn(
            'w-full rounded-t-3xl shadow-2xl transition-all duration-300',
            'max-h-[90vh] overflow-y-auto',
            'animate-in slide-in-from-bottom-10',
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          )}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Handle bar and header */}
          <div className={isDarkMode ? 'sticky top-0 bg-gray-800 border-b border-gray-700 rounded-t-3xl' : 'sticky top-0 bg-white border-b border-gray-200 rounded-t-3xl'}>
            {/* Handle indicator */}
            <div className="flex justify-center pt-3">
              <div className={isDarkMode ? 'w-12 h-1 bg-gray-600 rounded-full' : 'w-12 h-1 bg-gray-300 rounded-full'} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className={isDarkMode ? 'text-xl font-semibold text-white' : 'text-xl font-semibold text-gray-900'}>Receipt Details</h2>
              <button
                onClick={onClose}
                className={isDarkMode ? 'p-2 hover:bg-gray-700 rounded-full transition-colors' : 'p-2 hover:bg-gray-100 rounded-full transition-colors'}
                aria-label="Close modal"
              >
                <X className={isDarkMode ? 'w-6 h-6 text-gray-400' : 'w-6 h-6 text-gray-600'} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            {/* Main Info Section */}
            <div className="space-y-4 mb-6">
              {/* Store Name */}
              <div className="space-y-2">
                <label className={isDarkMode ? 'flex items-center text-sm font-semibold text-gray-300' : 'flex items-center text-sm font-semibold text-gray-700'}>
                  <Store className="w-4 h-4 mr-2" />
                  Store Name
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={displayReceipt?.storeName || ''}
                    onChange={(e) => handleInputChange('storeName', e.target.value)}
                    className={isDarkMode ? 'w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                  />
                ) : (
                  <p className={isDarkMode ? 'text-white text-lg font-medium' : 'text-gray-900 text-lg font-medium'}>{displayReceipt?.storeName}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className={isDarkMode ? 'flex items-center text-sm font-semibold text-gray-300' : 'flex items-center text-sm font-semibold text-gray-700'}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Date
                </label>
                {editMode ? (
                  <input
                    type="date"
                    value={displayReceipt?.date || ''}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className={isDarkMode ? 'w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                  />
                ) : (
                  <p className={isDarkMode ? 'text-white text-lg font-medium' : 'text-gray-900 text-lg font-medium'}>
                    {new Date(displayReceipt?.date || '').toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className={isDarkMode ? 'flex items-center text-sm font-semibold text-gray-300' : 'flex items-center text-sm font-semibold text-gray-700'}>
                  <Tag className="w-4 h-4 mr-2" />
                  Category
                </label>
                {editMode ? (
                  <select
                    value={displayReceipt?.category || 'Other'}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className={isDarkMode ? 'w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                  >
                    {MAIN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={isDarkMode ? 'text-white text-lg font-medium' : 'text-gray-900 text-lg font-medium'}>{displayReceipt?.category}</p>
                )}
              </div>

              {/* Total Amount */}
              <div className="space-y-2">
                <label className={isDarkMode ? 'flex items-center text-sm font-semibold text-gray-300' : 'flex items-center text-sm font-semibold text-gray-700'}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Total Amount
                </label>
                {editMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={displayReceipt?.totalAmount || 0}
                    onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value))}
                    className={isDarkMode ? 'w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                  />
                ) : (
                  <p className={isDarkMode ? 'text-2xl font-bold text-blue-400' : 'text-gray-900 text-2xl font-bold text-blue-600'}>
                    {formatCurrency(displayReceipt?.totalAmount || 0)}
                  </p>
                )}
              </div>

              {/* Tax Amount */}
              {(displayReceipt?.taxAmount || editMode) && (
                <div className="space-y-2">
                  <label className={isDarkMode ? 'text-sm font-semibold text-gray-300' : 'text-sm font-semibold text-gray-700'}>Tax Amount</label>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={displayReceipt?.taxAmount || 0}
                      onChange={(e) => handleInputChange('taxAmount', parseFloat(e.target.value))}
                      className={isDarkMode ? 'w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                    />
                  ) : (
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{formatCurrency(displayReceipt?.taxAmount || 0)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Items Section */}
            {displayReceipt?.items && displayReceipt.items.length > 0 && (
              <div className="mb-6">
                <h3 className={isDarkMode ? 'text-sm font-semibold text-gray-300 mb-3' : 'text-sm font-semibold text-gray-700 mb-3'}>Items</h3>
                <div className="space-y-3">
                  {displayReceipt.items.map((item: ReceiptItem, index: number) => (
                    <div key={index} className={isDarkMode ? 'bg-gray-700 rounded-lg p-4' : 'bg-gray-50 rounded-lg p-4'}>
                      {editMode ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            className={isDarkMode ? 'w-full px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(index, 'quantity', parseFloat(e.target.value))
                              }
                              className={isDarkMode ? 'px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' : 'px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                              className={isDarkMode ? 'px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' : 'px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Total"
                              value={item.total}
                              onChange={(e) => handleItemChange(index, 'total', parseFloat(e.target.value))}
                              className={isDarkMode ? 'px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' : 'px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            />
                          </div>
                          {item.category && (
                            <select
                              value={item.category}
                              onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                              className={isDarkMode ? 'w-full px-3 py-2 border border-gray-600 rounded bg-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            >
                              {ITEM_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => handleDeleteItem(index)}
                            className={isDarkMode ? 'w-full text-red-400 text-sm font-medium hover:text-red-300 py-1' : 'w-full text-red-600 text-sm font-medium hover:text-red-700 py-1'}
                          >
                            Delete Item
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <p className={isDarkMode ? 'font-medium text-white' : 'font-medium text-gray-900'}>{item.name}</p>
                            <p className={isDarkMode ? 'font-semibold text-white' : 'font-semibold text-gray-900'}>{formatCurrency(item.total)}</p>
                          </div>
                          <div className={isDarkMode ? 'text-sm text-gray-400' : 'text-sm text-gray-600'}>
                            {item.quantity} × {formatCurrency(item.price)}
                            {item.category && ` • ${item.category}`}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {(displayReceipt?.notes || editMode) && (
              <div className="mb-6 space-y-2">
                <label className={isDarkMode ? 'flex items-center text-sm font-semibold text-gray-300' : 'flex items-center text-sm font-semibold text-gray-700'}>
                  <FileText className="w-4 h-4 mr-2" />
                  Notes
                </label>
                {editMode ? (
                  <textarea
                    value={displayReceipt?.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any notes..."
                    rows={3}
                    className={isDarkMode ? 'w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500' : 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                  />
                ) : (
                  displayReceipt?.notes && (
                    <p className={isDarkMode ? 'text-gray-400 text-sm whitespace-pre-wrap' : 'text-gray-600 text-sm whitespace-pre-wrap'}>{displayReceipt.notes}</p>
                  )
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className={isDarkMode ? 'flex-1 px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50' : 'flex-1 px-4 py-3 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50'}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={isSaving}
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  {onDelete && (
                    <button
                      onClick={handleDeleteClick}
                      className={isDarkMode ? 'px-4 py-3 bg-red-900/40 text-red-400 font-semibold rounded-lg hover:bg-red-900/60 transition-colors disabled:opacity-50 flex items-center justify-center gap-2' : 'px-4 py-3 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {onSave && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-[60]"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className={cn(
                'w-full max-w-sm rounded-2xl p-6 shadow-xl',
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className={cn(
                  'mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4',
                  isDarkMode ? 'bg-red-900/40' : 'bg-red-100'
                )}>
                  <Trash2 className={isDarkMode ? 'w-6 h-6 text-red-400' : 'w-6 h-6 text-red-600'} />
                </div>
                <h3 className={cn(
                  'text-lg font-semibold mb-2',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  Delete Receipt
                </h3>
                <p className={cn(
                  'text-sm mb-6',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                )}>
                  Are you sure you want to delete this receipt? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={cn(
                    'flex-1 px-4 py-3 font-semibold rounded-lg transition-colors',
                    isDarkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  )}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
