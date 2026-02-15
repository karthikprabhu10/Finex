import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Edit3,
  Save,
  X,
  Shield,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { profileApi } from '../services/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  avatar_url: string;
}

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
    avatar_url: '',
  });

  const [editedData, setEditedData] = useState<ProfileData>(profileData);

  // Load profile from MongoDB on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileApi.getProfile();
        const loaded: ProfileData = {
          full_name: data.full_name || user?.user_metadata?.full_name || '',
          email: user?.email || '',
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        };
        setProfileData(loaded);
        setEditedData(loaded);
        
        // Also update localStorage for navbar to use
        localStorage.setItem(`profile_${user?.id}`, JSON.stringify({
          full_name: loaded.full_name,
          phone: loaded.phone,
          location: loaded.location,
          bio: loaded.bio,
          avatar_url: loaded.avatar_url,
        }));
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleEdit = () => {
    setEditedData(profileData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData(profileData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const profileToSave = {
        full_name: editedData.full_name,
        phone: editedData.phone,
        location: editedData.location,
        bio: editedData.bio,
        avatar_url: editedData.avatar_url,
      };

      // Save to MongoDB
      await profileApi.updateProfile(profileToSave);
      
      // Also update localStorage for navbar to use immediately
      localStorage.setItem(`profile_${user?.id}`, JSON.stringify(profileToSave));

      setProfileData(editedData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Convert to data URL and save to MongoDB
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setEditedData(prev => ({ ...prev, avatar_url: dataUrl }));
        
        if (!isEditing) {
          // Direct save if not in edit mode
          try {
            await profileApi.updateProfile({ avatar_url: dataUrl });
            const newProfileData = { ...profileData, avatar_url: dataUrl };
            // Update localStorage for navbar
            localStorage.setItem(`profile_${user?.id}`, JSON.stringify({
              full_name: newProfileData.full_name,
              phone: newProfileData.phone,
              location: newProfileData.location,
              bio: newProfileData.bio,
              avatar_url: dataUrl,
            }));
            setProfileData(newProfileData);
            toast.success('Avatar updated!');
          } catch (error) {
            console.error('Error saving avatar:', error);
            toast.error('Failed to save avatar');
          }
        }
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
      setIsUploadingAvatar(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn(
            "text-2xl md:text-ios-3xl font-bold",
            isDarkMode ? "text-white" : "text-ios-gray-900"
          )}>Profile</h1>
          <p className={cn(
            "text-sm md:text-ios-base mt-1",
            isDarkMode ? "text-gray-400" : "text-ios-gray-500"
          )}>
            Manage your personal information
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className={cn(
              "flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-semibold text-sm transition-all duration-300 self-start sm:self-auto",
              "bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
              "text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            )}
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2 md:gap-3 self-start sm:self-auto">
            <button
              onClick={handleCancel}
              className={cn(
                "flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-semibold text-sm transition-all duration-300",
                isDarkMode 
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200" 
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              )}
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-semibold text-sm transition-all duration-300",
                "bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
                "text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className={cn(
        "glass-card rounded-2xl md:rounded-3xl overflow-hidden p-4 md:p-6",
        isDarkMode && "bg-gray-800/50 border-gray-700"
      )}>
        {/* Avatar & Basic Info */}
        <div>
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4 md:gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div 
                onClick={handleAvatarClick}
                className={cn(
                  "w-20 h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group-hover:scale-105",
                  "shadow-lg",
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                )}
              >
                {isUploadingAvatar ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : profileData.avatar_url || editedData.avatar_url ? (
                  <img 
                    src={isEditing ? editedData.avatar_url : profileData.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                    <span className="text-3xl font-bold text-white">
                      {getInitials(profileData.full_name)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                className={cn(
                  "absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center",
                  "bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all duration-300",
                  "hover:scale-110 active:scale-95"
                )}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Name & Email */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className={cn(
                  "text-xl font-bold",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  {profileData.full_name || 'Your Name'}
                </h2>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-[11px] font-semibold text-green-500">Verified</span>
                </div>
              </div>
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                {profileData.email}
              </p>
              <p className={cn(
                "text-xs mt-0.5",
                isDarkMode ? "text-gray-500" : "text-gray-400"
              )}>
                Member since {memberSince}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className={cn(
          "glass-card p-6 rounded-3xl",
          isDarkMode && "bg-gray-800/50 border-gray-700"
        )}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className={cn(
              "text-lg font-semibold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>Personal Information</h3>
          </div>

          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label className={cn(
                "text-sm font-medium mb-2 block",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.full_name}
                  onChange={(e) => setEditedData(prev => ({ ...prev, full_name: e.target.value }))}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                    "border",
                    isDarkMode 
                      ? "bg-gray-700 text-white placeholder-gray-500 border-gray-600"
                      : "bg-white text-gray-900 placeholder-gray-400 border-gray-200"
                  )}
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <User className={cn("w-5 h-5", isDarkMode ? "text-gray-500" : "text-gray-400")} />
                  <span className={cn(
                    "text-base font-medium",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>{profileData.full_name || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={cn(
                "text-sm font-medium mb-2 block",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Email Address
              </label>
              <div className="flex items-center gap-3">
                <Mail className={cn("w-5 h-5", isDarkMode ? "text-gray-500" : "text-gray-400")} />
                <span className={cn(
                  "text-base font-medium",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>{profileData.email}</span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                  Verified
                </span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={cn(
                "text-sm font-medium mb-2 block",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedData.phone}
                  onChange={(e) => setEditedData(prev => ({ ...prev, phone: e.target.value }))}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                    "border",
                    isDarkMode 
                      ? "bg-gray-700 text-white placeholder-gray-500 border-gray-600"
                      : "bg-white text-gray-900 placeholder-gray-400 border-gray-200"
                  )}
                  placeholder="Enter your phone number"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Phone className={cn("w-5 h-5", isDarkMode ? "text-gray-500" : "text-gray-400")} />
                  <span className={cn(
                    "text-base font-medium",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>{profileData.phone || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className={cn(
                "text-sm font-medium mb-2 block",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.location}
                  onChange={(e) => setEditedData(prev => ({ ...prev, location: e.target.value }))}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                    "border",
                    isDarkMode 
                      ? "bg-gray-700 text-white placeholder-gray-500 border-gray-600"
                      : "bg-white text-gray-900 placeholder-gray-400 border-gray-200"
                  )}
                  placeholder="Enter your location"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <MapPin className={cn("w-5 h-5", isDarkMode ? "text-gray-500" : "text-gray-400")} />
                  <span className={cn(
                    "text-base font-medium",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>{profileData.location || 'Not set'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio & Security */}
        <div className="space-y-6">
          {/* Bio */}
          <div className={cn(
            "glass-card p-6 rounded-3xl",
            isDarkMode && "bg-gray-800/50 border-gray-700"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className={cn(
                "text-lg font-semibold",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>About Me</h3>
            </div>
            {isEditing ? (
              <textarea
                value={editedData.bio}
                onChange={(e) => setEditedData(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                  "border",
                  isDarkMode 
                    ? "bg-gray-700 text-white placeholder-gray-500 border-gray-600"
                    : "bg-white text-gray-900 placeholder-gray-400 border-gray-200"
                )}
                placeholder="Write something about yourself..."
              />
            ) : (
              <p className={cn(
                "text-base leading-relaxed",
                isDarkMode ? "text-gray-300" : "text-gray-600"
              )}>
                {profileData.bio || 'No bio added yet. Click "Edit Profile" to add one.'}
              </p>
            )}
          </div>

          {/* Account Security */}
          <div className={cn(
            "glass-card p-6 rounded-3xl",
            isDarkMode && "bg-gray-800/50 border-gray-700"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <h3 className={cn(
                "text-lg font-semibold",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>Account Security</h3>
            </div>

            <div className="space-y-4">
              <div className={cn(
                "flex items-center justify-between p-4 rounded-2xl",
                isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
              )}>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>Email Verified</p>
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>Your email is verified</p>
                  </div>
                </div>
                <span className="text-green-500 text-sm font-semibold">Active</span>
              </div>

              <div className={cn(
                "flex items-center justify-between p-4 rounded-2xl",
                isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
              )}>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>Last Login</p>
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>
                      {user?.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
