import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, UserPlus, ArrowRight } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState(''); // For joining existing tenant
  
  const [mode, setMode] = useState<'login' | 'register_new' | 'register_join'>('login');
  
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    // @ts-ignore
    const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
    const url = config.VITE_SUPABASE_URL;
    const key = config.VITE_SUPABASE_ANON_KEY;
    
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
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // REGISTRATION FLOW
        
        // 1. Sign Up Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Gebruiker kon niet worden aangemaakt.");

        const userId = authData.user.id;
        let tenantId = "";

        // 2. Create Profile
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          email: email,
          full_name: fullName
        });
        if (profileError) console.error("Profile creation warning:", profileError);

        // 3. Handle Tenant Logic
        if (mode === 'register_new') {
          // Create new Tenant
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .insert({
              name: `${fullName}'s Huishouden`,
              subscription_tier: 'S',
              max_users: 5
            })
            .select()
            .single();
          
          if (tenantError) throw tenantError;
          tenantId = tenantData.id;

          // Add as Admin
          const { error: memberError } = await supabase.from('tenant_members').insert({
            tenant_id: tenantId,
            user_id: userId,
            role: 'master_admin'
          });
          if (memberError) throw memberError;

        } else if (mode === 'register_join') {
          // Join Existing Tenant
          if (!familyCode) throw new Error("Voer een geldige Gezins Code in.");
          
          // Verify tenant exists
          const { data: existingTenant, error: fetchError } = await supabase
            .from('tenants')
            .select('id')
            .eq('id', familyCode)
            .single();

          if (fetchError || !existingTenant) throw new Error("Gezins Code niet gevonden. Controleer de code.");

          tenantId = existingTenant.id;

          // Add as Sub User
          const { error: memberError } = await supabase.from('tenant_members').insert({
            tenant_id: tenantId,
            user_id: userId,
            role: 'sub_user'
          });
          if (memberError) throw memberError;
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let msg = error.message || "Er is een fout opgetreden.";
      if (msg.includes("Invalid login credentials")) msg = "Ongeldig e-mailadres of wachtwoord.";
      if (msg.includes("duplicate key")) msg = "Dit e-mailadres is al in gebruik.";
      setError(msg);
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
          <p className="text-gray-600">De applicatie mist database configuratie.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        
        {/* Header Logo */}
        <div className="flex justify-center mb-6">
           <div className="bg-gradient-to-br from-primary to-secondary text-white p-4 rounded-2xl shadow-lg transform -rotate-3">
             <Wallet size={32} />
           </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">MarBudget</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Beheer je financiën, samen of alleen.</p>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Inloggen
          </button>
          <button 
            onClick={() => setMode('register_new')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode !== 'login' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Registreren
          </button>
        </div>

        {mode !== 'login' && (
           <div className="flex gap-2 mb-6">
             <button
               type="button"
               onClick={() => setMode('register_new')}
               className={`flex-1 flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all ${mode === 'register_new' ? 'border-primary bg-cyan-50 text-primary' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}
             >
               <UserPlus size={20} className="mb-1" />
               <span className="text-xs font-bold">Nieuw Gezin</span>
             </button>
             <button
               type="button"
               onClick={() => setMode('register_join')}
               className={`flex-1 flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all ${mode === 'register_join' ? 'border-primary bg-cyan-50 text-primary' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}
             >
               <Users size={20} className="mb-1" />
               <span className="text-xs font-bold">Meedoen</span>
             </button>
           </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-100 flex items-start">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {mode !== 'login' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Volledige Naam</label>
              <input
                type="text"
                required
                placeholder="Voor- en achternaam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
          )}

          {mode === 'register_join' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gezins Code</label>
              <input
                type="text"
                required
                placeholder="Vraag de code aan de beheerder"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dit is de code van het huishouden waar je bij wilt horen.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mailadres</label>
            <input
              type="email"
              required
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wachtwoord</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 px-4 rounded-xl hover:bg-secondary transition-all font-bold shadow-lg shadow-primary/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Moment geduld...' : (
              mode === 'login' ? 'Inloggen' : 
              mode === 'register_new' ? 'Start mijn Huishouden' : 'Sluit aan bij Huishouden'
            )}
            {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
          </button>
        </form>
      </div>
    </div>
  );
};
