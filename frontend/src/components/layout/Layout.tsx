import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../../services/api';
import {
  LayoutDashboard,
  Upload,
  Receipt,
  PieChart,
  Settings,
  Bell,
  Menu,
  User,
  LogOut,
  MoreVertical,
  Lightbulb,
  Calendar,
  CreditCard,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AIChatBot } from '../chat/AIChatBot';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', badge: null },
  { icon: Upload, label: 'Upload', path: '/upload', badge: null },
  { icon: Receipt, label: 'Receipts', path: '/receipts', badge: null },
  { icon: PieChart, label: 'Analytics', path: '/analytics', badge: null },
  { icon: Lightbulb, label: 'AI Suggestions', path: '/ai-suggestions', badge: null },
  { icon: Calendar, label: 'Subscription Calendar', path: '/subscriptions', badge: null },
  { icon: Bell, label: 'Bill Reminders', path: '/bill-reminders', badge: null },
  { icon: Wallet, label: 'Budget Planner', path: '/budget-planner', badge: null },
  { icon: Settings, label: 'Settings', path: '/settings', badge: null },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isDarkMode } = useTheme();
  
  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth >= 768);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [dismissedNotifications, setDismissedNotifications] = React.useState<Record<string, number>>({});
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  // Handle window resize for mobile detection
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when navigating on mobile
  React.useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Load dismissed notifications from localStorage on mount
  React.useEffect(() => {
    const dismissed = localStorage.getItem('dismissedNotifications');
    if (!dismissed) return;
    const parsed = JSON.parse(dismissed);
    // Clean up expired dismissals (older than 24 hours)
    const now = Date.now();
    const filtered = Object.fromEntries(
      Object.entries(parsed).filter(([_, timestamp]: [string, any]) => now - timestamp < 24 * 60 * 60 * 1000)
    );
    localStorage.setItem('dismissedNotifications', JSON.stringify(filtered));
    setDismissedNotifications(filtered);
  }, []);

  const dismissNotification = (notificationId: string) => {
    const now = Date.now();
    const updated = { ...dismissedNotifications, [notificationId]: now };
    setDismissedNotifications(updated);
    localStorage.setItem('dismissedNotifications', JSON.stringify(updated));
  };

  // Fetch notifications
  const { data: allNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.getNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter out dismissed notifications
  const notifications = allNotifications.filter((n: any) => !dismissedNotifications[n.id]);

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  // Get profile data from localStorage (synced with Profile page)
  const getStoredProfile = () => {
    try {
      const stored = localStorage.getItem(`profile_${user?.id}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };
  const storedProfile = getStoredProfile();

  // Get user initials from email or full name
  const displayName = storedProfile.full_name || user?.user_metadata?.full_name || user?.email || 'User';
  const userInitial = displayName[0]?.toUpperCase() || 'U';
  const userName = displayName;
  const userEmail = user?.email || '';
  const userAvatar = storedProfile.avatar_url || user?.user_metadata?.avatar_url || '';

  const handleLogout = async () => {
    try {
      await signOut();
      setIsProfileMenuOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      setIsProfileMenuOpen(false);
      navigate('/login', { replace: true });
    }
  };

  // Close profile menu when clicking outside
  React.useEffect(() => {
    if (!isProfileMenuOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  return (
    <div className={cn('flex h-screen overflow-hidden', isDarkMode ? 'dark bg-gradient-to-br from-gray-950 to-gray-900' : 'bg-gradient-to-br from-[#F5F7FA] to-[#EEF1F5]')}>
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Premium iOS-style Sidebar */}
      <aside
        className={cn(
          'transition-all duration-300 backdrop-blur-xl flex-shrink-0',
          isDarkMode 
            ? 'bg-gradient-to-b from-gray-900/95 to-gray-900/90 border-r border-gray-800/50 shadow-ios-xl' 
            : 'bg-gradient-to-b from-white/95 to-white/90 border-r border-gray-200/50 shadow-ios-lg',
          // Mobile: fixed overlay, Desktop: normal sidebar
          isMobile 
            ? cn('fixed left-0 top-0 h-full z-50', isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden')
            : cn(isSidebarOpen ? 'w-48' : 'w-0 overflow-hidden')
        )}
      >
        {/* Premium Sidebar Header */}
        <div className={cn(
          'flex items-center justify-between h-14 px-4 border-b backdrop-blur-sm',
          isDarkMode ? 'border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-transparent' : 'border-gray-200/30 bg-gradient-to-r from-white/50 to-transparent'
        )}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-ios-blue to-blue-600 shadow-md flex items-center justify-center">
              <img src="/finex.png" alt="Finex Logo" className="w-5 h-5 object-contain" />
            </div>
            <h1 className={cn('text-ios-lg font-bold tracking-tight bg-gradient-to-r from-ios-blue to-blue-600 bg-clip-text text-transparent', isDarkMode && 'from-white to-gray-300')}>
              Finex
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-ios-sm font-semibold transition-all duration-300 group relative overflow-hidden',
                  isActive
                    ? 'text-white shadow-ios-lg'
                    : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-800/50 hover:shadow-ios-sm'
                    : 'text-ios-gray-700 hover:bg-gradient-to-r hover:from-ios-gray-50 hover:to-white hover:shadow-ios-sm active-scale'
                )}
                style={isActive ? { 
                  background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                  boxShadow: '0 8px 24px rgba(0, 122, 255, 0.25), 0 2px 8px rgba(0, 122, 255, 0.15)'
                } : {}}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50" />
                )}
                
                <div className="flex items-center gap-2 relative z-10">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
                    isActive 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gradient-to-br from-ios-gray-100/80 to-ios-gray-50/50 group-hover:from-ios-blue/10 group-hover:to-ios-blue/5 group-hover:shadow-md'
                  )}>
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-all duration-300',
                        isActive 
                          ? 'scale-110' 
                          : 'group-hover:scale-110 group-hover:text-ios-blue'
                      )}
                    />
                  </div>
                  <span className="font-semibold tracking-tight">{item.label}</span>
                </div>
                {item.badge && (
                  <span 
                    className="ios-badge w-5 h-5 flex items-center justify-center rounded-full relative z-10 font-bold text-[10px]"
                    style={{ 
                      background: 'linear-gradient(135deg, #FF3B30 0%, #D32F2F 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(255, 59, 48, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer - REMOVED (moved to top-right header) */}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-visible relative">
        {/* Premium Top Navigation Bar */}
        <header className={cn(
          'h-14 md:h-16 backdrop-blur-xl px-3 md:px-6 flex items-center justify-between shadow-ios-sm relative z-30',
          isDarkMode 
            ? 'border-b border-gray-800/50 bg-gradient-to-r from-gray-900/80 to-gray-900/70' 
            : 'border-b border-gray-200/30 bg-gradient-to-r from-white/80 to-white/70'
        )}>
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                'p-2 md:p-2.5 rounded-xl active-scale transition-all duration-200',
                isDarkMode 
                  ? 'hover:bg-gray-800/60 text-gray-400 hover:shadow-md' 
                  : 'hover:bg-gradient-to-br hover:from-ios-gray-100 hover:to-ios-gray-50 hover:shadow-sm'
              )}
            >
              <Menu className="w-5 h-5" />
            </button>

          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* Premium Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={cn(
                  'relative p-2.5 rounded-xl active-scale transition-all duration-200',
                  isDarkMode 
                    ? 'hover:bg-gray-800/60 text-gray-400 hover:shadow-md' 
                    : 'hover:bg-gradient-to-br hover:from-ios-gray-100 hover:to-ios-gray-50 hover:shadow-sm'
                )}>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div 
                  className={cn(
                    'absolute right-0 mt-3 w-72 md:w-80 rounded-2xl shadow-ios-xl border backdrop-blur-xl overflow-hidden animate-slide-up max-h-96 overflow-y-auto',
                    'z-[9999]',
                    isDarkMode 
                      ? 'bg-gray-800/95 border-gray-700/50' 
                      : 'bg-white/95 border-gray-200/30'
                  )}>
                  <div className={cn(
                    'p-4 border-b font-semibold sticky top-0',
                    isDarkMode 
                      ? 'border-gray-700/50 bg-gray-800/95' 
                      : 'border-gray-100/50 bg-white/95'
                  )}>
                    <div className="flex items-center justify-between">
                      <h3 className={cn(
                        'text-base font-bold',
                        isDarkMode ? 'text-gray-100' : 'text-ios-gray-900'
                      )}>
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-ios-blue font-semibold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200/30">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className={cn(
                          'w-12 h-12 mx-auto mb-3 opacity-30',
                          isDarkMode ? 'text-gray-400' : 'text-ios-gray-400'
                        )} />
                        <p className={cn(
                          'text-sm',
                          isDarkMode ? 'text-gray-400' : 'text-ios-gray-500'
                        )}>
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification: any) => (
                        <div
                          key={notification.id}
                          className={cn(
                            'p-4 transition-colors relative group',
                            !notification.read && (isDarkMode ? 'bg-gray-700/30' : 'bg-ios-blue/5'),
                            isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-ios-gray-50'
                          )}
                        >
                          <div className="flex gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                              notification.type === 'bill_reminder' 
                                ? 'bg-ios-orange/10' 
                                : 'bg-ios-blue/10'
                            )}>
                              <Bell className={cn(
                                'w-5 h-5',
                                notification.type === 'bill_reminder' 
                                  ? 'text-ios-orange' 
                                  : 'text-ios-blue'
                              )} />
                            </div>
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => {
                                if (notification.billId) {
                                  navigate('/bill-reminders');
                                  setIsNotificationOpen(false);
                                }
                              }}
                            >
                              <p className={cn(
                                'text-sm font-semibold mb-1',
                                isDarkMode ? 'text-gray-100' : 'text-ios-gray-900'
                              )}>
                                {notification.title}
                              </p>
                              <p className={cn(
                                'text-xs line-clamp-2',
                                isDarkMode ? 'text-gray-400' : 'text-ios-gray-600'
                              )}>
                                {notification.message}
                              </p>
                              <p className={cn(
                                'text-xs mt-1',
                                isDarkMode ? 'text-gray-500' : 'text-ios-gray-400'
                              )}>
                                {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all opacity-0 group-hover:opacity-100',
                                isDarkMode 
                                  ? 'hover:bg-gray-600/50 text-gray-400 hover:text-gray-200' 
                                  : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
                              )}
                              title="Dismiss for 24 hours"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-ios-blue rounded-full flex-shrink-0 mt-2 absolute top-4 right-4"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Premium Quick Actions */}
            <Link
              to="/upload"
              className="btn-primary flex items-center gap-1.5 md:gap-2 text-ios-sm px-3 md:px-5 py-2 md:py-2.5"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </Link>

            {/* Premium Account Profile Menu */}
            <div className="relative ml-2" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 rounded-full shadow-lg hover:shadow-xl overflow-hidden"
                title="Account"
                style={{
                  width: '42px',
                  height: '42px',
                  background: userAvatar ? 'transparent' : 'linear-gradient(135deg, #AF52DE 0%, #FF2D55 100%)',
                  boxShadow: '0 4px 16px rgba(175, 82, 222, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold drop-shadow-sm">{userInitial}</span>
                )}
              </button>

              {/* Premium Dropdown Menu */}
              {isProfileMenuOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={cn(
                    'absolute right-0 mt-3 w-64 rounded-2xl shadow-ios-xl border backdrop-blur-xl overflow-hidden animate-slide-up',
                    'z-[9999] pointer-events-auto',
                    isDarkMode 
                      ? 'bg-gray-800/95 border-gray-700/50' 
                      : 'bg-white/95 border-gray-200/30'
                  )}>
                  {/* Premium Profile Header */}
                  <div className={cn(
                    'p-5 border-b',
                    isDarkMode 
                      ? 'border-gray-700/50 bg-gradient-to-r from-gray-700/50 to-transparent' 
                      : 'border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-transparent'
                  )}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-lg overflow-hidden" 
                        style={{ 
                          background: userAvatar ? 'transparent' : 'linear-gradient(135deg, #AF52DE 0%, #FF2D55 100%)',
                          boxShadow: '0 8px 20px rgba(175, 82, 222, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        {userAvatar ? (
                          <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          userInitial
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-bold truncate tracking-tight', isDarkMode ? 'text-white' : 'text-gray-900')}>
                          {userName}
                        </p>
                        <p className={cn('text-xs truncate mt-0.5', isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                          {userEmail}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Premium Menu Items */}
                  <div className="py-2 px-2">
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={cn(
                        'w-full px-4 py-3 text-sm flex items-center gap-3 transition-all duration-200 text-left rounded-xl font-medium',
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700/50 active:scale-[0.98]' 
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 active:scale-[0.98]'
                      )}
                    >
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={cn(
                        'w-full px-4 py-3 text-sm flex items-center gap-3 transition-all duration-200 text-left rounded-xl font-medium',
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700/50 active:scale-[0.98]' 
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 active:scale-[0.98]'
                      )}
                    >
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  {/* Premium Divider */}
                  <div className={cn('mx-4 border-t', isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50')}></div>

                  {/* Premium Logout */}
                  <div className="py-2 px-2">
                    <button 
                      onClick={(e) => {
                        console.log('LOGOUT CLICKED!');
                        e.preventDefault();
                        e.stopPropagation();
                        handleLogout();
                      }}
                      onMouseDown={(e) => {
                        console.log('LOGOUT MOUSEDOWN!');
                      }}
                      type="button"
                      className={cn(
                        'w-full px-4 py-3 text-sm flex items-center gap-3 transition-all duration-200 font-semibold text-left rounded-xl',
                        'pointer-events-auto cursor-pointer relative z-[100]',
                        isDarkMode 
                          ? 'text-red-400 hover:bg-red-900/20 active:scale-[0.98]' 
                          : 'text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 active:scale-[0.98]'
                      )}
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Premium Page Content */}
        <main className={cn(
          'flex-1 overflow-auto ios-scroll p-4 md:p-6 lg:p-8',
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-950 to-gray-900' 
            : 'bg-gradient-to-br from-[#F5F7FA] to-[#EEF1F5]'
        )}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* AI Chatbot */}
      <AIChatBot />
    </div>
  );
};