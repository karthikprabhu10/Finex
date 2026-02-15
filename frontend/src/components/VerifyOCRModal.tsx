import React, { useState, useEffect } from 'react';
import { X, Check, Edit2, Calendar, DollarSign, Store, CheckCircle, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  category?: string;
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
  'Other'
];

interface VerifyOCRModalProps {
  isOpen: boolean;
  data: {
    storeName: string;
    date: string;
    totalAmount: number;
    taxAmount: number;
    items: ReceiptItem[];
    ocrStatus: string;
    ocrMessage?: string;
  };
  onConfirm: (data: OCRDataType) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type OCRDataType = {
  storeName: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  items: ReceiptItem[];
  ocrStatus: string;
  ocrMessage?: string;
};

export const VerifyOCRModal: React.FC<VerifyOCRModalProps> = ({
  isOpen,
  data,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(data);

  // Update editedData when data prop changes
  useEffect(() => {
    setEditedData(data);
  }, [data]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string | number) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...editedData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setEditedData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const handleDeleteItem = (index: number) => {
    const newItems = editedData.items.filter((_, i) => i !== index);
    setEditedData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const handleAddItem = () => {
    setEditedData((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: 0, total: 0, category: 'Other' }],
    }));
  };

  const handleConfirm = () => {
    onConfirm(editedData);
    setEditMode(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end pointer-events-none">
        <div className="w-full pointer-events-auto">
          <div className="bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Verify Receipt Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {data.ocrStatus === 'success' ? '✅ OCR Extracted Successfully' : '⚠️ Please verify details'}
                </p>
              </div>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Error Status Badge */}
              {data.ocrStatus === 'error' && (
                <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-sm font-medium text-red-700 mb-1">❌ OCR Processing Failed</p>
                  {data.ocrMessage && (
                    <p className="text-xs text-red-600">{data.ocrMessage}</p>
                  )}
                </div>
              )}

              {/* OCR Status Badge */}
              {data.ocrStatus === 'success' && (
                <div className="p-3 bg-green-50 border border-green-300 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">OCR processing completed successfully</p>
                </div>
              )}

              {/* Store Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Store className="w-4 h-4 text-blue-600" />
                  Store Name
                </label>
                <input
                  type="text"
                  value={editedData.storeName}
                  onChange={(e) => handleInputChange('storeName', e.target.value)}
                  readOnly={!editMode}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border-2 text-gray-900 font-medium text-base',
                    editMode
                      ? 'border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'border-gray-200 bg-gray-50 cursor-default'
                  )}
                  placeholder="Store name"
                />
              </div>

              {/* Date and Total Amount in Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={editedData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    readOnly={!editMode}
                    className={cn(
                      'w-full px-4 py-3 rounded-lg border-2 text-gray-900 font-medium',
                      editMode
                        ? 'border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                        : 'border-gray-200 bg-gray-50 cursor-default'
                    )}
                  />
                </div>

                {/* Total Amount */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedData.totalAmount}
                    onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                    readOnly={!editMode}
                    className={cn(
                      'w-full px-4 py-3 rounded-lg border-2 text-gray-900 font-bold text-lg',
                      editMode
                        ? 'border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                        : 'border-gray-200 bg-green-50 cursor-default'
                    )}
                  />
                </div>
              </div>

              {/* Tax Amount */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Tax Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedData.taxAmount}
                  onChange={(e) => handleInputChange('taxAmount', parseFloat(e.target.value) || 0)}
                  readOnly={!editMode}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border-2 text-gray-900',
                    editMode
                      ? 'border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'border-gray-200 bg-gray-50 cursor-default'
                  )}
                />
              </div>

              {/* Summary Row */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Subtotal</p>
                    <p className="text-lg font-bold text-blue-900">
                      ${(editedData.totalAmount - editedData.taxAmount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Items Count</p>
                    <p className="text-lg font-bold text-blue-900">{editedData.items.length}</p>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              {editedData.items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900">
                      Items ({editedData.items.length})
                    </label>
                    {editMode && (
                      <button
                        onClick={handleAddItem}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        + Add Item
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {editedData.items.map((item, idx) => (
                      <div key={idx} className={cn(
                        'p-4 rounded-lg border-2 space-y-3 transition-colors relative',
                        editMode
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      )}>
                        {/* Delete button */}
                        {editMode && (
                          <button
                            onClick={() => handleDeleteItem(idx)}
                            className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded transition-colors"
                            title="Delete item"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                        <div>
                          <label className="text-xs font-medium text-gray-600">Item Name</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            readOnly={!editMode}
                            className={cn(
                              'w-full mt-2 px-3 py-2 rounded border text-sm font-medium',
                              editMode
                                ? 'border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400'
                                : 'border-gray-300 bg-gray-100 cursor-default'
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Qty</label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                              readOnly={!editMode}
                              className={cn(
                                'w-full mt-1 px-2 py-2 rounded border text-sm',
                                editMode
                                  ? 'border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400'
                                  : 'border-gray-300 bg-gray-100 cursor-default'
                              )}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Price</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                              readOnly={!editMode}
                              className={cn(
                                'w-full mt-1 px-2 py-2 rounded border text-sm',
                                editMode
                                  ? 'border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400'
                                  : 'border-gray-300 bg-gray-100 cursor-default'
                              )}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Total</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.total}
                              readOnly
                              className="w-full mt-1 px-2 py-2 rounded border text-sm font-semibold border-gray-300 bg-gray-100"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                            <Tag className="w-3 h-3" />
                            Category
                          </label>
                          <select
                            value={item.category || 'Other'}
                            onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                            disabled={!editMode}
                            className={cn(
                              'w-full px-2 py-2 rounded border text-sm',
                              editMode
                                ? 'border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer'
                                : 'border-gray-300 bg-gray-100 cursor-default'
                            )}
                          >
                            {ITEM_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty Items Message */}
              {editedData.items.length === 0 && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ No items detected. Please verify the receipt image quality or add items manually.
                    </p>
                  </div>
                  {editMode ? (
                    <button
                      onClick={handleAddItem}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg text-sm transition-colors"
                    >
                      + Add Item
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg text-sm transition-colors"
                    >
                      Edit & Add Items
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              {!editMode ? (
                <>
                  <button
                    onClick={onCancel}
                    className="px-6 py-2 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    disabled={data.ocrStatus === 'error'}
                    className="px-6 py-2 rounded-lg font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || data.ocrStatus === 'error'}
                    className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {isLoading ? 'Verifying...' : 'Verify & Save'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditedData(data);
                    }}
                    className="px-6 py-2 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancel Edit
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {isLoading ? 'Saving...' : 'Save Changes & Verify'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
