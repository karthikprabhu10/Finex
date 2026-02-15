import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { authApi } from '../services/supabase';

export const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await authApi.verifyOtp(email, otp);

      if (!result.success) {
        setError(result.message || 'OTP verification failed');
        setAttempts(prev => prev + 1);
        setOtp('');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify OTP');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await authApi.requestOtp(email);
      if (!result.success) {
        setError(result.message || 'Failed to resend OTP');
      } else {
        setOtp('');
        setAttempts(0);
      }
    } catch (err) {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verified!</h2>
          <p className="text-gray-600">Redirecting you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">We sent a 6-digit code to your email</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-6">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-medium text-sm">{error}</p>
              {attempts > 0 && <p className="text-red-700 text-xs mt-1">{5 - attempts} attempts remaining</p>}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <form onSubmit={handleVerify}>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-50 mb-4"
              disabled={loading}
            />

            <label className="block text-sm font-semibold text-gray-900 mb-3">6-Digit Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-3xl tracking-widest font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={20} className="animate-spin" />}
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <p className="text-gray-600 text-sm text-center mb-4">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm disabled:text-gray-400 transition"
          >
            Send new code
          </button>
        </div>
      </div>
    </div>
  );
}

export default OTPVerification;
