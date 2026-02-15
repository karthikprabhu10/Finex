import React, { useState, useEffect } from 'react';
import {
  Bell,
  Lock,
  Eye,
  Globe,
  Database,
  Shield,
  ChevronRight,
  Download,
  Trash2,
  Save,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'button' | 'input';
  value?: boolean | string;
  options?: { label: string; value: string }[];
  action?: () => void;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, setDarkMode } = useTheme();
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyDigest: true,
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analyticsTracking: true,
    },
    display: {
      darkMode: isDarkMode,
      compactView: false,
      currencySymbol: 'USD',
    },
  });

  // Sync dark mode setting with theme context
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      display: { ...prev.display, darkMode: isDarkMode },
    }));
  }, [isDarkMode]);

  const handleToggle = (category: keyof typeof settings, key: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof settings],
        [key]: !prev[category as keyof typeof settings][key as keyof typeof prev[keyof typeof settings]],
      },
    }));

    // Special handling for dark mode
    if (category === 'display' && key === 'darkMode') {
      const newDarkMode = !settings.display.darkMode;
      setDarkMode(newDarkMode);
      toast.success(newDarkMode ? 'Dark mode enabled' : 'Light mode enabled');
    } else {
      toast.success('Setting updated');
    }
  };

  const handleSelectChange = (category: keyof typeof settings, key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof settings],
        [key]: value,
      },
    }));
    toast.success('Setting updated');
  };

  const handleDownloadData = () => {
    toast.success('Preparing your data download...');
    // TODO: Implement data download
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion initiated');
      // TODO: Implement account deletion
    }
  };

  const settingsSections: SettingsSection[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-6 h-6 text-blue-500" />,
      items: [
        {
          id: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive emails about your account activity',
          type: 'toggle',
          value: settings.notifications.emailNotifications,
        },
        {
          id: 'pushNotifications',
          label: 'Push Notifications',
          description: 'Get instant alerts on your device',
          type: 'toggle',
          value: settings.notifications.pushNotifications,
        },
        {
          id: 'weeklyDigest',
          label: 'Weekly Digest',
          description: 'Get a summary of your spending weekly',
          type: 'toggle',
          value: settings.notifications.weeklyDigest,
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: <Shield className="w-6 h-6 text-green-500" />,
      items: [
        {
          id: 'profileVisibility',
          label: 'Profile Visibility',
          description: 'Control who can see your profile',
          type: 'select',
          value: settings.privacy.profileVisibility,
          options: [
            { label: 'Private', value: 'private' },
            { label: 'Friends Only', value: 'friends' },
            { label: 'Public', value: 'public' },
          ],
        },
        {
          id: 'dataSharing',
          label: 'Data Sharing',
          description: 'Allow sharing anonymized data for analytics',
          type: 'toggle',
          value: settings.privacy.dataSharing,
        },
        {
          id: 'analyticsTracking',
          label: 'Analytics Tracking',
          description: 'Help us improve by tracking usage patterns',
          type: 'toggle',
          value: settings.privacy.analyticsTracking,
        },
      ],
    },
    {
      id: 'display',
      title: 'Display & Preferences',
      icon: <Eye className="w-6 h-6 text-purple-500" />,
      items: [
        {
          id: 'darkMode',
          label: 'Dark Mode',
          description: 'Use dark theme for the interface',
          type: 'toggle',
          value: settings.display.darkMode,
        },
        {
          id: 'compactView',
          label: 'Compact View',
          description: 'Show more items with smaller spacing',
          type: 'toggle',
          value: settings.display.compactView,
        },
        {
          id: 'currencySymbol',
          label: 'Currency',
          description: 'Choose your preferred currency',
          type: 'select',
          value: settings.display.currencySymbol,
          options: [
            { label: 'INR (₹)', value: 'INR' }
            
          ],
        },
      ],
    },
    {
      id: 'data',
      title: 'Data Management',
      icon: <Database className="w-6 h-6 text-orange-500" />,
      items: [
        {
          id: 'downloadData',
          label: 'Download Your Data',
          description: 'Export all your receipts and data',
          type: 'button',
          action: handleDownloadData,
        },
        {
          id: 'deleteAccount',
          label: 'Delete Account',
          description: 'Permanently delete your account and all data',
          type: 'button',
          action: handleDeleteAccount,
        },
      ],
    },
  ];

  return (
    <div className={isDarkMode ? 'flex-1 overflow-auto bg-gradient-to-b from-gray-950 to-gray-900' : 'flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-white'}>
      {/* Header */}
      <div className={isDarkMode ? 'sticky top-0 bg-gray-900 border-b border-gray-800 z-10' : 'sticky top-0 bg-white border-b border-gray-200 z-10'}>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <h1 className={isDarkMode ? 'text-2xl md:text-3xl font-bold text-white' : 'text-2xl md:text-3xl font-bold text-gray-900'}>Settings</h1>
          <p className={isDarkMode ? 'text-sm md:text-base text-gray-400 mt-1' : 'text-sm md:text-base text-gray-600 mt-1'}>Manage your account and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Account Info Card */}
        <div className={isDarkMode ? 'bg-gray-800 rounded-lg border border-gray-700 p-4 md:p-6 mb-6 md:mb-8' : 'bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6 md:mb-8'}>
          <h2 className={isDarkMode ? 'text-base md:text-lg font-semibold text-white mb-3 md:mb-4' : 'text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4'}>Account</h2>
          <div className="space-y-2 md:space-y-3">
            <div>
              <p className={isDarkMode ? 'text-sm text-gray-400 mb-1' : 'text-sm text-gray-600 mb-1'}>Email</p>
              <p className={isDarkMode ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{user?.email}</p>
            </div>
            <div>
              <p className={isDarkMode ? 'text-sm text-gray-400 mb-1' : 'text-sm text-gray-600 mb-1'}>Member Since</p>
              <p className={isDarkMode ? 'text-white font-medium' : 'text-gray-900 font-medium'}>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <div key={section.id} className="mb-6 md:mb-8">
            {/* Section Header */}
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              {section.icon}
              <h2 className={isDarkMode ? 'text-base md:text-lg font-semibold text-white' : 'text-base md:text-lg font-semibold text-gray-900'}>{section.title}</h2>
            </div>

            {/* Settings Cards */}
            <div className="space-y-2 md:space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={isDarkMode ? 'bg-gray-800 rounded-lg border border-gray-700 p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-gray-600 transition-colors' : 'bg-white rounded-lg border border-gray-200 p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-gray-300 transition-colors'}
                >
                  <div className="flex-1">
                    <p className={isDarkMode ? 'text-sm md:text-base font-medium text-white' : 'text-sm md:text-base font-medium text-gray-900'}>{item.label}</p>
                    {item.description && (
                      <p className={isDarkMode ? 'text-sm text-gray-400 mt-1' : 'text-sm text-gray-600 mt-1'}>{item.description}</p>
                    )}
                  </div>

                  {/* Toggle */}
                  {item.type === 'toggle' && (
                    <button
                      onClick={() =>
                        handleToggle(
                          section.id as keyof typeof settings,
                          item.id
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        item.value ? 'bg-blue-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          item.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}

                  {/* Select */}
                  {item.type === 'select' && item.options && (
                    <select
                      value={item.value as string}
                      onChange={(e) =>
                        handleSelectChange(
                          section.id as keyof typeof settings,
                          item.id,
                          e.target.value
                        )
                      }
                      className={isDarkMode ? 'px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0' : 'px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0'}
                    >
                      {item.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Button */}
                  {item.type === 'button' && (
                    <button
                      onClick={item.action}
                      className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                        item.id === 'deleteAccount'
                          ? isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          : isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {item.id === 'downloadData' && <Download className="w-4 h-4" />}
                      {item.id === 'deleteAccount' && <Trash2 className="w-4 h-4" />}
                      {item.label.split(' ')[0]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Save Button */}
        <div className="flex gap-3 mt-8 md:mt-12 pb-8 md:pb-12">
          <button className={isDarkMode ? 'flex-1 bg-blue-600 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base' : 'flex-1 bg-blue-600 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base'}>
            <Save className="w-4 h-4 md:w-5 md:h-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
