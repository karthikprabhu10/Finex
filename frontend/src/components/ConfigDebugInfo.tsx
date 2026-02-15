import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export const ConfigDebugInfo: React.FC = () => {
  const [debug, setDebug] = useState<Record<string, any>>({});

  useEffect(() => {
    const info = {
      supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      apiUrl: import.meta.env.VITE_API_URL,
      nodeEnv: import.meta.env.MODE,
      hasSupabaseModule: !!window.__SUPABASE_LOADED__,
    };
    setDebug(info);
  }, []);

  const isConfigured = debug.supabaseUrl && debug.supabaseKey;

  return (
    <div className="fixed bottom-4 right-4 max-w-xs bg-gray-900 text-white rounded-lg shadow-lg p-4 text-sm font-mono z-50">
      <div className="flex items-start gap-2 mb-3">
        {isConfigured ? (
          <CheckCircle className="text-green-400 flex-shrink-0" size={16} />
        ) : (
          <AlertCircle className="text-yellow-400 flex-shrink-0" size={16} />
        )}
        <span className="font-bold">Configuration Status</span>
      </div>
      <div className="space-y-1 text-xs opacity-75">
        <div>Supabase URL: {debug.supabaseUrl ? '✓' : '✗'}</div>
        <div>Supabase Key: {debug.supabaseKey ? '✓' : '✗'}</div>
        <div>API URL: {debug.apiUrl}</div>
        <div>Environment: {debug.nodeEnv}</div>
        {!isConfigured && (
          <div className="mt-2 text-yellow-300">
            ⚠️ Create frontend/.env with credentials from https://supabase.com/dashboard
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigDebugInfo;
