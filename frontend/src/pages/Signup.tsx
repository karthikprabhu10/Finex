import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { authApi } from '../services/supabase';

type SignupStep = 'form' | 'otp' | 'success';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { error: authError, clearError } = useAuth();

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP fields
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState(600);
  const [otpAttempts, setOtpAttempts] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<SignupStep>('form');

  const validateForm = (): boolean => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (fullName.trim().length < 2) {
      setError('Please enter your full name');
      return false;
    }

    return true;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const result = await authApi.requestOtp(email);

      if (!result.success) {
        setError(result.message || 'Failed to request OTP');
        return;
      }

      // Move to OTP step
      setStep('otp');
      setOtpTimeLeft(600); // Reset timer
      setOtpAttempts(0);
      setOtp('');
      setOtpError(null);
    } catch (err) {
      const error = err as { message?: string };
      setError(error?.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setOtpError(null);

    if (otp.length !== 6) {
      setOtpError('Please enter a 6-digit code');
      return;
    }

    try {
      setOtpLoading(true);
      const result = await authApi.verifyOtp(email, otp);

      if (!result.success) {
        setOtpError(result.message || 'OTP verification failed');
        setOtpAttempts(prev => prev + 1);
        setOtp('');
        return;
      }

      // OTP verified, now sign up to Supabase
      const signupResult = await authApi.signUp(email, password, fullName);

      if (signupResult.error) {
        setOtpError(signupResult.error.message || 'Failed to create account');
        return;
      }

      // After successful Supabase signup, mark email as confirmed in backend
      try {
        await authApi.completeSignup(email, password, fullName, true);
      } catch (completeError) {
        console.warn('Warning: Could not mark email as confirmed:', completeError);
        // Don't fail the signup - proceed anyway
      }

      // Success!
      setStep('success');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('OTP verification error:', err);
      setOtpError('Failed to verify OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError(null);
    try {
      setLoading(true);
      const result = await authApi.requestOtp(email);

      if (!result.success) {
        setOtpError(result.message || 'Failed to resend OTP');
        return;
      }

      setOtpTimeLeft(600);
      setOtp('');
      setOtpAttempts(0);
    } catch (err) {
      console.error('Resend OTP error:', err);
      setOtpError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || authError;

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-600 mb-6">Your email has been verified. Redirecting...</p>
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 animate-pulse" style={{ width: '66%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // OTP verification step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-600">We sent a 6-digit code to</p>
            <p className="text-gray-900 font-semibold text-center mt-1 bg-gray-50 rounded-lg p-3 border border-gray-200">{email}</p>
          </div>

          {otpError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-6">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-800 font-medium text-sm">{otpError}</p>
                {otpAttempts > 0 && <p className="text-red-700 text-xs mt-1">{5 - otpAttempts} attempts remaining</p>}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <form onSubmit={handleVerifyOtp}>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Enter 6-digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-3xl tracking-widest font-semibold border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50"
                disabled={otpLoading}
              />

              <button
                type="submit"
                disabled={otpLoading || otp.length !== 6}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {otpLoading && <Loader2 size={20} className="animate-spin" />}
                {otpLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <p className="text-gray-600 text-sm text-center mb-4">Didn't receive the code?</p>
            <button
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm disabled:text-gray-400 transition mb-4"
            >
              Send new code
            </button>
            <button
              onClick={() => {
                setStep('form');
                setOtp('');
                setOtpError(null);
              }}
              className="w-full text-gray-600 hover:text-gray-700 font-medium text-sm"
            >
              Back to signup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial signup form
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join Finex to manage your finances</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-4">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-800 font-medium text-sm">{displayError}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-50"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-50"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-50"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-50"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading && <Loader2 size={20} className="animate-spin" />}
              {loading ? 'Continue...' : 'Continue to Verification'}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-sm mb-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
