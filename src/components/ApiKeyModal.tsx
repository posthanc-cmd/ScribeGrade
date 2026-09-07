import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl border border-stone-100">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100">
          <KeyRound className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-center text-2xl font-bold text-stone-900 tracking-tight">Enter API Key</h2>
        <p className="mt-2 text-center text-sm text-stone-500 leading-relaxed">
          Please provide your Gemini API key to enable the AI grading engine. This key is used locally and not stored on our servers.
        </p>
        
        <form onSubmit={handleSubmit} className="mt-8">
          <div>
            <label htmlFor="apiKey" className="sr-only">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="block w-full rounded-xl border border-stone-200 px-4 py-3.5 text-stone-900 placeholder-stone-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-stone-50 transition-colors"
              placeholder="AIzaSy..."
            />
          </div>
          <button
            type="submit"
            className="mt-6 flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
};
