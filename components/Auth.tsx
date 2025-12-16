import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Wallet, AlertTriangle, Wrench } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  
  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [debugUrl, setDebugUrl] = useState('');
  const [debugKey, setDebugKey] = useState('');

  useEffect(() => {
    // Check configuratie via global config
    // @ts-ignore
    const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
    
    const url = config.VITE_SUPABASE_URL;
    const key = config.VITE_SUPABASE_ANON_KEY;
    
    // Check of URL of Key ontbreekt of placeholder is
    if (!url || url === "undefined" || url.includes('placeholder') || !key || key === "undefined" || key === 'placeholder-key' || key.length < 10) {
      setIsConfigured(false);
    } else {
      // Pre-fill debug fields met huidige config (masked in UI niet mogelijk, maar hier voor gemak)
      setDebugUrl(url);
      setDebugKey(key);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Bepaal welke client we gebruiken: de globale of een test-client
    let client = supabase;
    
    // Als debug mode open is en waarden zijn ingevuld, gebruik die
    if (showDebug && debugUrl && debugKey) {
       try {
         client = createClient(debugUrl.trim(), debugKey.trim(), {
            global: { headers: { 'apikey': debugKey.trim() } }
         });
         console.log("Gebruik debug client...");
       } catch (err) {
         setError("Ongeldige debug configuratie.");
         setLoading(false);
         return;
       }
    } else if (!isConfigured) {
        return;
    }

    try {
      if (isSignUp) {
        const { error } = await client.auth.signUp({
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
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Bij succes met debug client: reload pagina om de sessie (die in storage wordt gezet) op te pakken
        if (showDebug) {
            window.location.reload();
        }
      }
    } catch (error: any) {
      console.error("Auth error details:", error);
      
      let msg = error.message || "Er is een fout opgetreden.";
      
      if (msg.includes("Invalid API key") || (error.status === 401 && !msg.includes("Email not confirmed") && !msg.includes("Invalid login credentials"))) {
        msg = "Fout: Ongeldige API Sleutel (401). De sleutel hoort waarschijnlijk niet bij deze URL.";
      } else if (msg.includes("Invalid login credentials")) {
        msg = "Ongeldig e-mailadres of wachtwoord.";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured && !showDebug) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border-l-4 border-amber-500">
          <div className="flex items-center mb-4 text-amber-600">
            <AlertTriangle className="w-8 h-8 mr-3" />
            <h1 className="text-xl font-bold">Setup Vereist</h1>
          </div>
          <p className="text-gray-600 mb-4">
            De applicatie kan de database sleutels niet vinden.
          </p>
          <button 
            onClick={() => setShowDebug(true)}
            className="text-sm text-primary underline mt-2"
          >
            Ik wil handmatig sleutels invoeren (Debug)
          </button>
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
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
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

          {showDebug && (
            <div className="bg-gray-100 p-3 rounded border border-gray-200 text-xs space-y-2 animate-fade-in">
              <div className="font-bold text-gray-700 flex items-center">
                <Wrench className="w-3 h-3 mr-1" /> Handmatige Configuratie
              </div>
              <input 
                placeholder="Supabase URL (https://...supabase.co)"
                value={debugUrl}
                onChange={e => setDebugUrl(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input 
                placeholder="Supabase Anon Key (ey...)"
                value={debugKey}
                onChange={e => setDebugKey(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <p className="text-gray-500 italic">Deze waarden overschrijven tijdelijk de server instellingen.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-secondary transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Laden...' : (isSignUp ? 'Account Aanmaken' : 'Inloggen')}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary hover:underline block w-full"
          >
            {isSignUp ? 'Heb je al een account? Log in' : 'Nog geen account? Registreer hier'}
          </button>
          
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center w-full mt-4"
          >
            <Wrench className="w-3 h-3 mr-1" />
            {showDebug ? 'Verberg debug opties' : 'Problemen met inloggen? Check configuratie'}
          </button>
        </div>
      </div>
    </div>
  );
};