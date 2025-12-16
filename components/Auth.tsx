import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    // Check configuratie via global config
    // @ts-ignore
    const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
    
    const url = config.VITE_SUPABASE_URL;
    const key = config.VITE_SUPABASE_ANON_KEY;
    
    console.log("Auth Config Check - URL configured:", !!url, "Key configured:", !!key);

    // Check of URL of Key ontbreekt of placeholder is
    if (!url || url === "undefined" || url.includes('placeholder') || !key || key === "undefined" || key === 'placeholder-key' || key.length < 10) {
      setIsConfigured(false);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;
    
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        alert('Account aangemaakt! Controleer je e-mail voor de bevestigingslink (of log direct in als e-mailbevestiging uit staat).');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setError(error.message || "Er is een fout opgetreden.");
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border-l-4 border-amber-500">
          <div className="flex items-center mb-4 text-amber-600">
            <AlertTriangle className="w-8 h-8 mr-3" />
            <h1 className="text-xl font-bold">Setup Vereist</h1>
          </div>
          <p className="text-gray-600 mb-4">
            De applicatie kan de database sleutels niet vinden in Netlify.
          </p>
          <div className="bg-gray-100 p-4 rounded text-sm mb-4">
            <h3 className="font-bold mb-2">Controleer je Netlify Instellingen:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Environment Variable <code>VITE_SUPABASE_URL</code> moet bestaan.</li>
              <li>Environment Variable <code>VITE_SUPABASE_ANON_KEY</code> moet bestaan.</li>
            </ul>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Belangrijk: Na het aanpassen van variabelen moet je via het "Deploys" tabblad kiezen voor "Trigger deploy" -&gt; "Clear cache and deploy site".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <div className="flex justify-center mb-6">
           <div className="bg-primary text-white p-3 rounded-xl">
             <Wallet size={32} />
           </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isSignUp ? 'Maak een Master Account' : 'Inloggen bij MarBudget'}
        </h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Volledige Naam</label>
              <input
                type="text"
                required={isSignUp}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mailadres</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Wachtwoord</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-secondary transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Laden...' : (isSignUp ? 'Account Aanmaken' : 'Inloggen')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary hover:underline"
          >
            {isSignUp ? 'Heb je al een account? Log in' : 'Nog geen account? Registreer hier'}
          </button>
        </div>
      </div>
    </div>
  );
};