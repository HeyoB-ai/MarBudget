import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, ArrowRight, ShieldCheck, Key, ChevronLeft } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  
  // Standen: inloggen, keuze maken (beheerder/lid), of formulier invullen
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_new' | 'register_join'>('login');
  
  const [error, setError] = useState<{message: string, code?: string} | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // --- REGISTRATIE FLOW ---
        
        // 1. Maak de gebruiker aan in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registratie mislukt. Probeer het later opnieuw.");

        // Als er geen sessie is, moet de gebruiker waarschijnlijk eerst e-mail bevestigen
        if (!authData.session) {
          throw new Error("Account aangemaakt! Bevestig je e-mailadres om in te kunnen loggen.");
        }

        const userId = authData.user.id;

        // 2. Metadata wegschrijven (Profiel & Huishouden)
        // Let op: Als dit faalt met 404, bestaan de tabellen niet in Supabase.
        const { error: pError } = await supabase.from('profiles').upsert({
          id: userId, email, full_name: fullName
        });
        if (pError) {
          console.error("Profiel fout:", pError);
          if (pError.code === '42P01') throw new Error("Database tabel 'profiles' niet gevonden. Neem contact op met support.");
        }

        if (mode === 'register_new') {
          // SUPERUSER: Maak nieuw huishouden
          const { data: tData, error: tError } = await supabase.from('tenants').insert({
            name: `Gezin ${fullName.split(' ')[0]}`,
            subscription_tier: 'S',
            max_users: 5
          }).select().single();
          
          if (tError) throw tError;

          await supabase.from('tenant_members').insert({
            tenant_id: tData.id,
            user_id: userId,
            role: 'master_admin'
          });
        } else if (mode === 'register_join') {
          // SUBUSER: Sluit aan bij bestaand huishouden
          if (!familyCode) throw new Error("Voer een geldige Gezins Code in.");
          
          const { data: tenant, error: fError } = await supabase.from('tenants')
            .select('id').eq('id', familyCode.trim()).maybeSingle();

          if (fError || !tenant) throw new Error("Gezins Code niet gevonden. Controleer de code.");

          await supabase.from('tenant_members').insert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'sub_user'
          });
        }
      }
    } catch (err: any) {
      console.error("Auth error details:", err);
      setError({ 
        message: err.message || "Er is een onbekende fout opgetreden.",
        code: err.code || err.status 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Configuratie Fout</h1>
          <p className="text-gray-500 text-sm">De verbinding met Supabase is niet ingesteld.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-fade-in relative">
        
        {/* Header exact volgens screenshot */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-6 transform -rotate-2">
            <Wallet size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-1">MarBudget</h1>
          <p className="text-gray-400 text-sm font-medium">Beheer je financiën, samen of alleen.</p>
        </div>

        {/* Tab Switcher */}
        {(mode === 'login' || mode === 'register_select') && (
          <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-10">
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
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-xs border border-red-100 animate-fade-in">
            <div className="flex items-start">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Fout {error.code && `(${error.code})`}</p>
                <p>{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* 1. INLOGGEN */}
        {mode === 'login' && (
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">E-mailadres</label>
              <input
                type="email"
                required
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
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
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
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

        {/* 2. REGISTRATIE KEUZE */}
        {mode === 'register_select' && (
          <div className="space-y-4 animate-fade-in">
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

        {/* 3. REGISTRATIE FORMULIEREN */}
        {(mode === 'register_new' || mode === 'register_join') && (
          <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
            <button type="button" onClick={() => setMode('register_select')} className="text-xs text-primary font-bold hover:underline flex items-center mb-4">
              <ChevronLeft size={14} className="mr-1" /> Terug naar keuze
            </button>

            {mode === 'register_join' && (
              <div className="bg-cyan-50 p-5 rounded-2xl border border-primary/10 mb-4">
                <label className="block text-[10px] font-bold text-primary uppercase mb-2 ml-1 tracking-widest flex items-center">
                  <Key size={12} className="mr-1" /> Gezins Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="CODE VAN BEHEERDER"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value)}
                  className="w-full p-3.5 bg-white border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none font-mono text-xs uppercase text-center"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Je Naam</label>
              <input type="text" required placeholder="Voornaam" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">E-mail</label>
              <input type="email" required placeholder="naam@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Wachtwoord</label>
              <input type="password" required placeholder="Minimaal 6 tekens" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg mt-4 flex justify-center items-center">
              {loading ? "Account maken..." : (mode === 'register_new' ? "Start als Beheerder" : "Start als Lid")}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};