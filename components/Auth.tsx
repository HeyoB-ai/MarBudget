import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState(''); // Essential for joining existing household
  
  const [mode, setMode] = useState<'login' | 'register_new' | 'register_join'>('login');
  
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    // Check if Supabase is properly configured
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
        // --- REGISTRATION FLOW ---
        
        // 1. Sign Up Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registratie mislukt. Probeer het later opnieuw.");

        const userId = authData.user.id;
        let tenantId = "";

        // 2. Create Profile record
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          email: email,
          full_name: fullName
        });
        if (profileError) console.warn("Profile mapping issue:", profileError);

        // 3. Handle Tenant (Household) Logic
        if (mode === 'register_new') {
          // --- CASE: CREATE NEW HOUSEHOLD (SUPERUSER) ---
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .insert({
              name: `Huishouden van ${fullName.split(' ')[0]}`,
              subscription_tier: 'S',
              max_users: 5
            })
            .select()
            .single();
          
          if (tenantError) throw tenantError;
          tenantId = tenantData.id;

          // Add as Master Admin
          const { error: memberError } = await supabase.from('tenant_members').insert({
            tenant_id: tenantId,
            user_id: userId,
            role: 'master_admin'
          });
          if (memberError) throw memberError;

        } else if (mode === 'register_join') {
          // --- CASE: JOIN EXISTING HOUSEHOLD (SUB-USER) ---
          if (!familyCode) throw new Error("Voer de Gezins Code in van het huishouden.");
          
          // Verify tenant exists
          const { data: existingTenant, error: fetchError } = await supabase
            .from('tenants')
            .select('id')
            .eq('id', familyCode.trim())
            .maybeSingle();

          if (fetchError || !existingTenant) {
            throw new Error("Gezins Code niet herkend. Controleer of de code exact klopt.");
          }

          tenantId = existingTenant.id;

          // Add as Sub User
          const { error: memberError } = await supabase.from('tenant_members').insert({
            tenant_id: tenantId,
            user_id: userId,
            role: 'sub_user'
          });
          if (memberError) {
             if (memberError.message.includes("unique")) {
               throw new Error("Je bent al lid van dit huishouden.");
             }
             throw memberError;
          }
        }
      }
    } catch (error: any) {
      console.error("Auth process error:", error);
      let msg = error.message || "Er is een onverwachte fout opgetreden.";
      if (msg.includes("Invalid login credentials")) msg = "E-mailadres of wachtwoord is onjuist.";
      if (msg.includes("User already registered")) msg = "Dit e-mailadres is al bekend bij ons.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-amber-500">
          <div className="flex items-center mb-4 text-amber-600">
            <AlertTriangle className="w-10 h-10 mr-3" />
            <h1 className="text-xl font-bold">Database Connectie Vereist</h1>
          </div>
          <p className="text-gray-600 mb-6">De VITE_SUPABASE variabelen ontbreken in je omgeving. Configureer deze om verder te gaan.</p>
          <div className="bg-gray-100 p-3 rounded-lg text-xs font-mono text-gray-500">
            Check VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
        
        {/* Header Logo Section */}
        <div className="flex justify-center mb-4">
           <div className="bg-primary text-white p-4 rounded-2xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
             <Wallet size={32} />
           </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-1 tracking-tight">MarBudget</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">Slim financieel beheer voor gezinnen.</p>

        {/* Main Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Inloggen
          </button>
          <button 
            onClick={() => setMode('register_new')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode !== 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Registreren
          </button>
        </div>

        {/* Sub-Tabs for Registration Paths */}
        {mode !== 'login' && (
           <div className="grid grid-cols-2 gap-3 mb-6">
             <button
               type="button"
               onClick={() => setMode('register_new')}
               className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all duration-200 ${mode === 'register_new' ? 'border-primary bg-cyan-50 text-primary' : 'border-gray-100 hover:border-gray-200 text-gray-400'}`}
             >
               <ShieldCheck size={24} className="mb-1" />
               <span className="text-[10px] uppercase font-bold tracking-wider">Beheerder</span>
               <span className="text-[9px] opacity-70">Nieuw Gezin</span>
             </button>
             <button
               type="button"
               onClick={() => setMode('register_join')}
               className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all duration-200 ${mode === 'register_join' ? 'border-primary bg-cyan-50 text-primary' : 'border-gray-100 hover:border-gray-200 text-gray-400'}`}
             >
               <Users size={24} className="mb-1" />
               <span className="text-[10px] uppercase font-bold tracking-wider">Lid</span>
               <span className="text-[9px] opacity-70">Sluit je aan</span>
             </button>
           </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-xs border border-red-100 flex items-start animate-fade-in">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {mode !== 'login' && (
            <div className="animate-fade-in">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 tracking-widest">Je Naam</label>
              <input
                type="text"
                required
                placeholder="Voor- en achternaam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
              />
            </div>
          )}

          {mode === 'register_join' && (
            <div className="animate-fade-in">
              <label className="block text-[10px] font-bold text-primary uppercase mb-1 ml-1 tracking-widest">Gezins Code</label>
              <input
                type="text"
                required
                placeholder="Plak de code van je partner"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value)}
                className="w-full p-3 bg-cyan-50 border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-mono text-xs uppercase text-center"
              />
              <p className="text-[9px] text-gray-400 mt-2 text-center">
                De beheerder vindt deze code bij <strong>Gezinsleden</strong> in de app.
              </p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 tracking-widest">E-mailadres</label>
            <input
              type="email"
              required
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 tracking-widest">Wachtwoord</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 px-4 rounded-xl hover:bg-secondary transition-all font-bold shadow-lg shadow-primary/20 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-6 active:scale-95"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verwerken...
              </div>
            ) : (
              <>
                {mode === 'login' ? 'Inloggen' : 
                 mode === 'register_new' ? 'Start nieuw Huishouden' : 'Sluit je aan'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};