import React, { useState } from 'react';
import { Calendar, CreditCard, AlertCircle, Plus, X, Edit, Trash2, Check, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subscriptionApi } from '../services/api';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'Monthly' | 'Yearly' | 'Weekly' | 'Quarterly';
  nextBilling: string;
  category: string;
  status: 'active' | 'paused' | 'cancelled';
  color: string;
  description?: string;
}

export const Subscriptions: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'Monthly' as 'Monthly' | 'Yearly' | 'Weekly',
    nextBilling: '',
    category: 'Entertainment',
    color: '#007AFF',
    description: '',
  });

  const [logoErrors, setLogoErrors] = useState<Record<string, boolean>>({});
  const [logoAttempts, setLogoAttempts] = useState<Record<string, number>>({});

  // Generate logo URL from subscription name using multiple sources with fallback
  const getLogoUrl = (name: string, attempt: number = 0) => {
    // Use full name with spaces replaced by hyphens for multi-word services
    const cleanName = name.toLowerCase().replace(/\s+/g, '');
    
    const sources = [
      `https://logo.clearbit.com/${cleanName}.com`,
      `https://icons.duckduckgo.com/ip3/${cleanName}.com.ico`,
      `https://www.google.com/s2/favicons?domain=${cleanName}.com&sz=128`,
    ];
    
    return sources[attempt] || sources[0];
  };

  // Check if logo is available by attempting to load it
  const handleLogoError = (subscriptionId: string, subscriptionName: string) => {
    const currentAttempt = logoAttempts[subscriptionId] || 0;
    
    if (currentAttempt < 2) {
      // Try next source
      setLogoAttempts(prev => ({ ...prev, [subscriptionId]: currentAttempt + 1 }));
    } else {
      // All sources failed, show letter
      setLogoErrors(prev => ({ ...prev, [subscriptionId]: true }));
    }
  };

  const handleLogoLoad = (subscriptionId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setLogoErrors(prev => ({ ...prev, [subscriptionId]: false }));
    }
  };

  // Load subscriptions from MongoDB
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const data = await subscriptionApi.getSubscriptions();
      // Add default status if not present
      return data.map((s: any) => ({
        ...s,
        status: s.status || 'active'
      }));
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (subscription: Omit<Subscription, 'id' | 'status'>) => 
      subscriptionApi.createSubscription(subscription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription added!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add subscription');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<Subscription>) => 
      subscriptionApi.updateSubscription(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription updated!');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => subscriptionApi.deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete subscription');
    },
  });

  const handleOpenModal = (subscription?: Subscription) => {
    if (subscription) {
      setEditingSubscription(subscription);
      setFormData({
        name: subscription.name,
        amount: subscription.amount.toString(),
        frequency: subscription.frequency,
        nextBilling: subscription.nextBilling,
        category: subscription.category,
        color: subscription.color,
        description: subscription.description || '',
      });
    } else {
      setEditingSubscription(null);
      setFormData({
        name: '',
        amount: '',
        frequency: 'Monthly',
        nextBilling: '',
        category: 'Entertainment',
        color: '#007AFF',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!formData.name || !formData.amount || !formData.nextBilling) {
      toast.error('Please fill in all required fields');
      return;
    }

    const subscriptionData = {
      name: formData.name,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      nextBilling: formData.nextBilling,
      category: formData.category,
      color: formData.color,
      description: formData.description,
    };

    if (editingSubscription) {
      updateMutation.mutate({ id: editingSubscription.id, ...subscriptionData });
    } else {
      createMutation.mutate(subscriptionData);
    }
  };

  const handleDeleteSubscription = (id: string) => {
    if (confirm('Are you sure you want to delete this subscription?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: string) => {
    const sub = subscriptions.find(s => s.id === id);
    if (sub) {
      const newStatus = sub.status === 'active' ? 'paused' : 'active';
      updateMutation.mutate({ id, status: newStatus } as any);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const totalMonthly = subscriptions
    .filter((s) => s.frequency === 'Monthly' && s.status === 'active')
    .reduce((sum, s) => sum + s.amount, 0);

  const dueThisWeek = subscriptions.filter((s) => {
    const days = Math.ceil(
      (new Date(s.nextBilling).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days >= 0 && days <= 7 && s.status === 'active';
  }).length;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-ios-3xl font-bold text-ios-gray-900">Subscription Calendar</h1>
          <p className="text-sm md:text-ios-base text-ios-gray-500 mt-1">
            Track and manage your recurring subscriptions
          </p>
        </div>
        <button className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" />
          <span className="sm:inline">Add Subscription</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-ios-blue" />
            <span className="text-xs md:text-ios-sm text-ios-gray-500">Monthly Total</span>
          </div>
          <p className="text-lg md:text-ios-2xl font-bold text-ios-gray-900">₹{totalMonthly.toLocaleString('en-IN')}</p>
        </div>
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-ios-green" />
            <span className="text-xs md:text-ios-sm text-ios-gray-500">Active Subscriptions</span>
          </div>
          <p className="text-lg md:text-ios-2xl font-bold text-ios-gray-900">
            {subscriptions.filter((s) => s.status === 'active').length}
          </p>
        </div>
        <div className="glass-card p-4 md:p-6 rounded-ios-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-ios-orange" />
            <span className="text-xs md:text-ios-sm text-ios-gray-500">Due This Week</span>
          </div>
          <p className="text-lg md:text-ios-2xl font-bold text-ios-gray-900">{dueThisWeek}</p>
        </div>
      </div>

      <div className="glass-card rounded-ios-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b border-ios-gray-200">
          <h2 className="text-base md:text-ios-lg font-semibold text-ios-gray-900">Your Subscriptions</h2>
        </div>
        {subscriptions.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Calendar className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-ios-gray-300" />
            <p className="text-sm md:text-base text-ios-gray-500 mb-4">No subscriptions yet</p>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              Add Your First Subscription
            </button>
          </div>
        ) : (
          <div className="divide-y divide-ios-gray-200">
            {subscriptions.map((sub) => {
              const daysUntilBilling = Math.ceil(
                (new Date(sub.nextBilling).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div key={sub.id} className="p-4 md:p-6 hover:bg-ios-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 md:gap-4 flex-1">
                      <div
                        className="w-10 h-10 md:w-12 md:h-12 rounded-ios flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden relative"
                      >
                        {!logoErrors[sub.id] ? (
                          <img
                            key={`${sub.id}-${logoAttempts[sub.id] || 0}`}
                            src={getLogoUrl(sub.name, logoAttempts[sub.id] || 0)}
                            alt={`${sub.name} logo`}
                            className="w-full h-full object-contain p-1"
                            onError={() => handleLogoError(sub.id, sub.name)}
                            onLoad={(e) => handleLogoLoad(sub.id, e)}
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: sub.color }}
                          >
                            <span className="text-white font-bold">{sub.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-ios-base font-semibold text-ios-gray-900 truncate">
                            {sub.name}
                          </h3>
                          {sub.status === 'paused' && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                              Paused
                            </span>
                          )}
                          {sub.status === 'active' && daysUntilBilling <= 3 && daysUntilBilling >= 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                              Due Soon
                            </span>
                          )}
                        </div>
                        <p className="text-ios-sm text-ios-gray-500">{sub.category}</p>
                        {sub.description && (
                          <p className="text-ios-xs text-ios-gray-400 mt-1 line-clamp-1">{sub.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 ml-0 sm:ml-auto">
                      <div className="text-left sm:text-right">
                        <p className="text-base md:text-ios-lg font-bold text-ios-gray-900">₹{sub.amount.toLocaleString('en-IN')}</p>
                        <p className="text-xs md:text-ios-sm text-ios-gray-500">
                          {sub.frequency} • {daysUntilBilling >= 0 ? `${daysUntilBilling} days` : 'Overdue'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <button
                          onClick={() => handleToggleStatus(sub.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            sub.status === 'active'
                              ? 'hover:bg-yellow-50 text-yellow-600'
                              : 'hover:bg-green-50 text-green-600'
                          }`}
                          title={sub.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(sub)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(sub.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 animate-fade-in">
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">
                    {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-base font-semibold text-black mb-2">
                      Subscription Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Netflix Premium"
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-medium text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="amount" className="block text-base font-semibold text-black mb-2">
                        Amount (₹) *
                      </label>
                      <input
                        type="number"
                        id="amount"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="649"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-medium text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="frequency" className="block text-base font-semibold text-black mb-2">
                        Frequency *
                      </label>
                      <select
                        id="frequency"
                        value={formData.frequency}
                        onChange={(e) =>
                          setFormData({ ...formData, frequency: e.target.value as 'Monthly' | 'Yearly' | 'Weekly' })
                        }
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                      >
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="nextBilling" className="block text-base font-semibold text-black mb-2">
                      Next Billing Date *
                    </label>
                    <input
                      type="date"
                      id="nextBilling"
                      value={formData.nextBilling}
                      onChange={(e) => setFormData({ ...formData, nextBilling: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-base font-semibold text-black mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                      >
                        <option value="Entertainment">Entertainment</option>
                        <option value="Productivity">Productivity</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Education">Education</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="color" className="block text-base font-semibold text-black mb-2">
                        Color
                      </label>
                      <input
                        type="color"
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-base font-semibold text-black mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add notes about this subscription..."
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-medium text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSubscription}
                      className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg"
                    >
                      {editingSubscription ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
