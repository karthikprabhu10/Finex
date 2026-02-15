import React, { useState } from 'react';
import { Bell, Clock, CheckCircle, AlertTriangle, Plus, X, Calendar, DollarSign, Tag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billApi } from '../services/api';
import { toast } from 'sonner';

export const BillReminders: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [reminderModalOpen, setReminderModalOpen] = React.useState(false);
  const [selectedBillForReminder, setSelectedBillForReminder] = React.useState<any>(null);
  const [reminderDays, setReminderDays] = React.useState('1');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: '',
    category: 'Utilities',
    recurring: false,
    status: 'pending' as 'pending' | 'upcoming' | 'paid',
  });

  // Fetch bills from backend
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: billApi.getBills,
  });

  // Fetch bills total
  const { data: billsTotal } = useQuery({
    queryKey: ['bills-total'],
    queryFn: () => billApi.getBillsTotal(),
  });

  // Update bill status mutation
  const updateBillMutation = useMutation({
    mutationFn: ({ billId }: { billId: string }) =>
      billApi.markBillAsPaid(billId),
    onSuccess: () => {
      toast.success('Bill marked as paid and added to receipts!');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bills-total'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
    },
    onError: () => {
      toast.error('Failed to update bill');
    },
  });

  // Set reminder mutation
  const setReminderMutation = useMutatiwwon({
    mutationFn: ({ billId, reminderDate, message }: { billId: string; reminderDate: string; message: string }) =>
      billApi.setBillReminder(billId, { reminderDate, message }),
    onSuccess: () => {
      toast.success('Reminder set successfully!');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setReminderModalOpen(false);
      setSelectedBillForReminder(null);
      setReminderDays('1');
    },
    onError: () => {
      toast.error('Failed to set reminder');
    },
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: billApi.createBill,
    onSuccess: () => {
      toast.success('Bill created successfully!');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bills-total'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        amount: '',
        dueDate: '',
        category: 'Utilities',
        recurring: false,
        status: 'pending',
      });
    },
    onError: () => {
      toast.error('Failed to create bill');
    },
  });

  const handleMarkAsPaid = (billId: string) => {
    updateBillMutation.mutate({ billId });
  };

  const handleOpenReminderModal = (bill: any) => {
    setSelectedBillForReminder(bill);
    setReminderModalOpen(true);
  };

  const handleSetReminder = () => {
    if (!selectedBillForReminder) return;
    
    const daysBeforeDue = parseInt(reminderDays);
    const dueDate = new Date(selectedBillForReminder.dueDate);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBeforeDue);
    
    const message = `Reminder: "${selectedBillForReminder.name}" is due in ${daysBeforeDue} day${daysBeforeDue > 1 ? 's' : ''}. Amount: ₹${selectedBillForReminder.amount.toLocaleString('en-IN')}`;
    
    setReminderMutation.mutate({
      billId: selectedBillForReminder.id,
      reminderDate: reminderDate.toISOString(),
      message,
    });
  };

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amount || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    createBillMutation.mutate({
      name: formData.name,
      amount: parseFloat(formData.amount),
      dueDate: formData.dueDate,
      category: formData.category,
      recurring: formData.recurring,
      status: formData.status,
    });
  };

  // Determine actual status based on due date
  const getActualStatus = (bill: any) => {
    if (bill.status === 'paid') return 'paid';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    // If due date has passed, it's pending (overdue)
    if (dueDate < today) return 'pending';
    // If due date is today or in the future, it's upcoming
    return 'upcoming';
  };

  const pendingBills = bills.filter((b: any) => getActualStatus(b) === 'pending');
  const upcomingBills = bills.filter((b: any) => getActualStatus(b) === 'upcoming');
  const totalDue = billsTotal?.pending?.total || 0;

  const getStatusBadge = (bill: any) => {
    const status = getActualStatus(bill);
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-ios-orange/10 text-ios-orange text-ios-xs font-semibold">
            <AlertTriangle className="w-3 h-3" />
            Due Soon
          </span>
        );
      case 'upcoming':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-ios-blue/10 text-ios-blue text-ios-xs font-semibold">
            <Clock className="w-3 h-3" />
            Upcoming
          </span>
        );
      case 'paid':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-ios-green/10 text-ios-green text-ios-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Paid
          </span>
        );
      default:
        return null;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil(
      (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due Today';
    if (days === 1) return 'Due Tomorrow';
    return `${days} days left`;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl md:text-ios-3xl font-bold text-ios-gray-900">Bill Reminders</h1>
          <p className="text-sm md:text-ios-base text-ios-gray-500 mt-1">
            Never miss a payment deadline
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 self-start sm:self-auto text-sm md:text-base" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Bill
        </button>
      </div>

      {/* Add Bill Modal - iOS Style */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end pointer-events-none">
            <div className="w-full pointer-events-auto">
              <div className="bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
                {/* Handle bar */}
                <div className="flex justify-center pt-3">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add New Bill</h2>
                    <p className="text-sm text-gray-600 mt-1">Set up a bill reminder</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-white/50 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateBill} className="px-6 py-6 space-y-5">
                  {/* Bill Name */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-black">
                      <Bell className="w-4 h-4 text-blue-600" />
                      Bill Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-black font-medium text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                      placeholder="e.g., Electricity Bill"
                      required
                    />
                  </div>

                  {/* Amount and Due Date Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-black">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Amount
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-black font-bold text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                        placeholder="0.00"
                        step="0.01"
                        required
                      />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-black">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-black font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-black">
                      <Tag className="w-4 h-4 text-purple-600" />
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-black font-medium text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all appearance-none"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%234b5563\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                      <option value="Utilities">Utilities</option>
                      <option value="Finance">Finance</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Subscriptions">Subscriptions</option>
                      <option value="Rent">Rent</option>
                      <option value="Education">Education</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-black">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-black font-medium text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all appearance-none"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%234b5563\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {/* Recurring Toggle */}
                  <div 
                    className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => setFormData({ ...formData, recurring: !formData.recurring })}
                  >
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.recurring}
                      onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                      className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label htmlFor="recurring" className="text-base font-semibold text-black cursor-pointer select-none flex-1">
                      Recurring bill
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={createBillMutation.isPending}
                    >
                      {createBillMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </span>
                      ) : (
                        'Create Bill'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}


      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-ios-gray-500">Loading bills...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            <div className="glass-card p-4 md:p-6 rounded-ios-lg">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-ios-red" />
                <span className="text-xs md:text-ios-sm text-ios-gray-500">Overdue Bills</span>
              </div>
              <p className="text-xl md:text-ios-2xl font-bold text-ios-gray-900">
                {pendingBills.length}
              </p>
            </div>
            <div className="glass-card p-4 md:p-6 rounded-ios-lg">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Bell className="w-4 h-4 md:w-5 md:h-5 text-ios-orange" />
                <span className="text-xs md:text-ios-sm text-ios-gray-500">Total Overdue</span>
              </div>
              <p className="text-ios-2xl font-bold text-ios-gray-900">
                ₹{pendingBills.reduce((sum: number, b: any) => sum + b.amount, 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="glass-card p-6 rounded-ios-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-ios-blue" />
                <span className="text-ios-sm text-ios-gray-500">Upcoming Bills</span>
              </div>
              <p className="text-ios-2xl font-bold text-ios-gray-900">
                {upcomingBills.length}
              </p>
            </div>
          </div>

          <div className="glass-card rounded-ios-lg overflow-hidden">
            <div className="p-6 border-b border-ios-gray-200">
              <h2 className="text-ios-lg font-semibold text-ios-gray-900">All Bills</h2>
            </div>
            <div className="divide-y divide-ios-gray-200">
              {bills.filter((b: any) => getActualStatus(b) !== 'paid').length === 0 ? (
                <div className="p-6 text-center text-ios-gray-500">
                  No pending bills. Click "Add Bill" to create one.
                </div>
              ) : (
                bills.filter((b: any) => getActualStatus(b) !== 'paid').map((bill: any) => (
                  <div key={bill.id} className="p-6 hover:bg-ios-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-ios-base font-semibold text-ios-gray-900">
                            {bill.name}
                          </h3>
                          {getStatusBadge(bill)}
                        </div>
                        <p className="text-ios-sm text-ios-gray-500">
                          {bill.category} • {getDaysUntilDue(bill.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-ios-lg font-bold text-ios-gray-900">
                          ₹{bill.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-ios-sm text-ios-gray-500">
                          Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {getActualStatus(bill) !== 'paid' && (
                      <div className="mt-4 flex gap-3">
                        {getActualStatus(bill) === 'pending' && (
                          <button
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-95 shadow-ios-sm disabled:opacity-50 disabled:cursor-not-allowed text-ios-sm"
                            onClick={() => handleMarkAsPaid(bill.id)}
                            disabled={updateBillMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {updateBillMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                              </span>
                            ) : (
                              'Mark as Paid'
                            )}
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenReminderModal(bill)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-ios-gray-200 hover:bg-ios-gray-300 text-ios-gray-900 font-semibold rounded-xl transition-all duration-200 active:scale-95 shadow-sm text-ios-sm">
                          <Bell className="w-4 h-4" />
                          Set Reminder
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Reminder Modal */}
      {reminderModalOpen && selectedBillForReminder && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in"
            onClick={() => setReminderModalOpen(false)}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 animate-fade-in">
            <div 
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">Set Reminder</h2>
                  <button
                    onClick={() => setReminderModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-ios-blue/5 rounded-xl">
                    <p className="text-sm text-ios-gray-600 mb-1">Bill Details</p>
                    <p className="text-lg font-bold text-ios-gray-900">{selectedBillForReminder.name}</p>
                    <p className="text-sm text-ios-gray-600">
                      Due: {new Date(selectedBillForReminder.dueDate).toLocaleDateString('en-IN', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-ios-gray-600">
                      Amount: ₹{selectedBillForReminder.amount.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="reminderDays" className="block text-base font-semibold text-black mb-3">
                      Remind me before
                    </label>
                    <select
                      id="reminderDays"
                      value={reminderDays}
                      onChange={(e) => setReminderDays(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="1">1 day before</option>
                      <option value="2">2 days before</option>
                      <option value="3">3 days before</option>
                      <option value="5">5 days before</option>
                      <option value="7">1 week before</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setReminderModalOpen(false)}
                      className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSetReminder}
                      className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={setReminderMutation.isPending}
                    >
                      {setReminderMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Setting...
                        </span>
                      ) : (
                        'Set Reminder'
                      )}
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
