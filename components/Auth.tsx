import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, UserPlus, ArrowRight, ShieldCheck, Key } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  
  // mode determines what form is shown
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_new' | 'register_join'>('login');
  
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
        if (profileError) console.warn("Profile issue:", profileError);

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

          // Add as Master Admin (Superuser)
          const { error: memberError } = await supabase.from('tenant_members').insert({
            tenant_id: tenantId,
            user_id: userId,
            role: 'master_admin'
          });
          if (memberError) throw memberError;

        } else if (mode === 'register_join') {
          // --- CASE: JOIN EXISTING HOUSEHOLD (SUB-USER) ---
          if (!familyCode) throw new Error("Voer de Gezins Code in.");
          
          const { data: existingTenant, error: fetchError } = await supabase
            .from('tenants')
            .select('id')
            .eq('id', familyCode.trim())
            .maybeSingle();

          if (fetchError || !existingTenant) {
            throw new Error("Ongeldige Gezins Code. Controleer de code.");
          }

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
      setError(error.message || "Er is een fout opgetreden.");
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-amber-500">
          <h1 className="text-xl font-bold text-amber-600 mb-2 flex items-center">
            <AlertTriangle className="mr-2" /> Configuratie nodig
          </h1>
          <p className="text-gray-600 text-sm">Controleer je Supabase omgevingsvariabelen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in relative overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-4 transform -rotate-2 hover:rotate-0 transition-all">
            <Wallet size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">MarBudget</h1>
          <p className="text-gray-400 text-sm font-medium">Beheer je financiën, samen of alleen.</p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => setMode('login')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Inloggen
          </button>
          <button 
            onClick={() => setMode('register_select')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode !== 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Registreren
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs border border-red-100 flex items-start animate-fade-in">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* --- Path 1: Initial Login Form --- */}
        {mode === 'login' && (
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">E-mailadres</label>
              <input
                type="email"
                required
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Wachtwoord</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 px-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg shadow-primary/20 flex items-center justify-center disabled:opacity-70 mt-4 active:scale-95"
            >
              {loading ? "Inloggen..." : "Inloggen"} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        )}

        {/* --- Path 2: Registration Selection --- */}
        {mode === 'register_select' && (
          <div className="space-y-4 animate-fade-in">
            <button 
              onClick={() => setMode('register_new')}
              className="w-full p-5 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary hover:bg-cyan-50/30 transition-all text-left flex items-center group"
            >
              <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Ik ben de Beheerder</h3>
                <p className="text-xs text-gray-400">Start een nieuw huishouden (Superuser)</p>
              </div>
            </button>
            <button 
              onClick={() => setMode('register_join')}
              className="w-full p-5 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary hover:bg-cyan-50/30 transition-all text-left flex items-center group"
            >
              <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                <Users size={28} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Ik ben een Lid</h3>
                <p className="text-xs text-gray-400">Sluit je aan bij een bestaand gezin (Subuser)</p>
              </div>
            </button>
          </div>
        )}

        {/* --- Path 3: Registration Forms --- */}
        {(mode === 'register_new' || mode === 'register_join') && (
          <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <button 
                type="button" 
                onClick={() => setMode('register_select')}
                className="text-xs text-primary font-bold hover:underline flex items-center"
              >
                ← Terug naar keuze
              </button>
            </div>

            {mode === 'register_join' && (
              <div className="bg-cyan-50 p-4 rounded-2xl border border-primary/10 mb-2">
                <label className="block text-[10px] font-bold text-primary uppercase mb-1.5 ml-1 tracking-widest flex items-center">
                  <Key size={10} className="mr-1" /> Gezins Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="CODE VAN PARTNER"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value)}
                  className="w-full p-3 bg-white border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none font-mono text-xs uppercase text-center"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Naam</label>
              <input
                type="text"
                required
                placeholder="Voornaam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">E-mail</label>
              <input
                type="email"
                required
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Wachtwoord</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg mt-4 flex justify-center items-center"
            >
              {loading ? "Verwerken..." : (mode === 'register_new' ? "Start Huishouden" : "Account aanmaken")}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};