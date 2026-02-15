import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500">Checking authentication</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('[ProtectedRoute] Auth error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="max-w-md">
          <div className="flex gap-3 mb-4">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Authentication Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Please check your configuration and try again.</p>
          <a href="/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    console.log('[ProtectedRoute] No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, show children
  return <>{children}</>;
};

export default ProtectedRoute;
