import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, UserPlus, ArrowRight, ShieldCheck, Key, ChevronLeft } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  
  // mode determines what form or step is shown
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_new' | 'register_join'>('login');
  
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    // Check configuration
    // @ts-ignore
    const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
    if (!config.VITE_SUPABASE_URL || config.VITE_SUPABASE_URL.includes('placeholder')) {
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

        // 2. Create Profile
        await supabase.from('profiles').upsert({
          id: userId,
          email: email,
          full_name: fullName
        });

        // 3. Handle Household (Tenant)
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

          // Link as Master Admin
          await supabase.from('tenant_members').insert({
            tenant_id: tenantData.id,
            user_id: userId,
            role: 'master_admin'
          });

        } else if (mode === 'register_join') {
          // --- CASE: JOIN EXISTING HOUSEHOLD (SUB-USER) ---
          if (!familyCode) throw new Error("Voer de Gezins Code in.");
          
          const { data: existingTenant, error: fetchError } = await supabase
            .from('tenants')
            .select('id')
            .eq('id', familyCode.trim())
            .maybeSingle();

          if (fetchError || !existingTenant) {
            throw new Error("Ongeldige Gezins Code. Vraag de beheerder om de code.");
          }

          // Link as Sub User
          await supabase.from('tenant_members').insert({
            tenant_id: existingTenant.id,
            user_id: userId,
            role: 'sub_user'
          });
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border-t-4 border-amber-500 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Supabase niet ingesteld</h1>
          <p className="text-gray-500 text-sm">Zorg ervoor dat de VITE_SUPABASE_URL en KEY correct zijn ingevuld.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md animate-fade-in relative overflow-hidden">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-4 transform -rotate-2 hover:rotate-0 transition-all duration-300">
            <Wallet size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">MarBudget</h1>
          <p className="text-gray-400 text-sm font-medium">Beheer je financiën, samen of alleen.</p>
        </div>

        {/* Auth Mode Toggle (Only visible if not in sub-registration mode) */}
        {(mode === 'login' || mode === 'register_select') && (
          <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Inloggen
            </button>
            <button 
              onClick={() => setMode('register_select')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'register_select' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Registreren
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs border border-red-100 flex items-start animate-fade-in">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* --- 1. LOGIN FORM --- */}
        {mode === 'login' && (
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">E-mailadres</label>
              <input
                type="email"
                required
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Wachtwoord</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 px-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg shadow-primary/20 flex items-center justify-center disabled:opacity-70 mt-4"
            >
              {loading ? "Inloggen..." : "Inloggen"} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        )}

        {/* --- 2. REGISTER SELECTION (Super vs Sub) --- */}
        {mode === 'register_select' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Kies je rol</h3>
            
            <button 
              onClick={() => setMode('register_new')}
              className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary hover:bg-cyan-50/30 transition-all text-left flex items-center group"
            >
              <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Beheerder</h3>
                <p className="text-xs text-gray-400">Ik start een nieuw huishouden</p>
              </div>
            </button>

            <button 
              onClick={() => setMode('register_join')}
              className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary hover:bg-cyan-50/30 transition-all text-left flex items-center group"
            >
              <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                <Users size={32} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Gezinslid</h3>
                <p className="text-xs text-gray-400">Ik sluit me aan bij een ander</p>
              </div>
            </button>
          </div>
        )}

        {/* --- 3. REGISTRATION FORMS --- */}
        {(mode === 'register_new' || mode === 'register_join') && (
          <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
            <button 
              type="button" 
              onClick={() => setMode('register_select')}
              className="text-xs text-primary font-bold hover:underline flex items-center mb-2"
            >
              <ChevronLeft size={14} className="mr-1" /> Terug naar keuze
            </button>

            <h2 className="text-lg font-bold text-gray-800 mb-2">
              {mode === 'register_new' ? 'Nieuw Huishouden Starten' : 'Aansluiten bij Gezin'}
            </h2>

            {mode === 'register_join' && (
              <div className="bg-cyan-50 p-5 rounded-2xl border border-primary/10 mb-2">
                <label className="block text-[10px] font-bold text-primary uppercase mb-2 ml-1 tracking-widest">
                  Gezins Code (van beheerder)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kopieer de code hier"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value)}
                  className="w-full p-3.5 bg-white border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none font-mono text-sm uppercase text-center"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Je Naam</label>
              <input
                type="text"
                required
                placeholder="Voor- en achternaam"
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
                placeholder="Minimaal 6 tekens"
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
              {loading ? "Account maken..." : (mode === 'register_new' ? "Start als Beheerder" : "Start als Lid")}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};