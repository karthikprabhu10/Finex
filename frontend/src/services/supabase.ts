import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('[Supabase] URL configured:', !!SUPABASE_URL);
console.log('[Supabase] Key configured:', !!SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase credentials not configured!');
  console.error('Please create frontend/.env with:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key');
  console.error('See SUPABASE_AUTH_SETUP.md for instructions');
}

export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_ANON_KEY || 'dummy-key');

// Auth functions
export const authApi = {
  // Sign up with email and password
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  getCurrentUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  // Get session
  getSession: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data;
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },

  // Update password
  updatePassword: async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });
    return { data, error };
  },

  // OTP Functions
  requestOtp: async (email: string) => {
    const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');
    try {
      const response = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          purpose: 'signup',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: error.detail || 'Failed to request OTP',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message,
        otp_id: data.otp_id,
        expires_in_seconds: data.expires_in_seconds,
      };
    } catch (error) {
      console.error('OTP request error:', error);
      return {
        success: false,
        message: 'Failed to request OTP',
      };
    }
  },

  verifyOtp: async (email: string, otp: string) => {
    const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          purpose: 'signup',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: error.detail || 'OTP verification failed',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message,
        otp_id: data.otp_id,
      };
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        message: 'Failed to verify OTP',
      };
    }
  },

  getOtpStatus: async (email: string) => {
    const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');
    try {
      const response = await fetch(
        `${API_URL}/api/auth/otp-status?email=${encodeURIComponent(email)}&purpose=signup`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return { has_valid_otp: false };
      }

      return await response.json();
    } catch (error) {
      console.error('OTP status check error:', error);
      return { has_valid_otp: false };
    }
  },

  completeSignup: async (email: string, password: string, fullName: string, otpVerified: boolean) => {
    const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');
    try {
      const response = await fetch(`${API_URL}/api/auth/signup-with-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          otp_verified: otpVerified,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: error.detail || 'Failed to complete signup',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error('Complete signup error:', error);
      return {
        success: false,
        message: 'Failed to complete signup',
      };
    }
  },
};

export type Session = typeof supabase.auth.session;