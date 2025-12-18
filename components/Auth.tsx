import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, ArrowRight, ShieldCheck, Key, ChevronLeft, CheckCircle, Mail, Loader2, RefreshCw } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_new' | 'register_join'>('login');
  const [error, setError] = useState<{message: string, code?: string} | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
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
    setSuccessInfo(null);

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      } else {
        // --- REGISTRATIE FLOW ---
        const signupOptions = { 
          data: { 
            full_name: fullName,
            pending_role: mode === 'register_new' ? 'master_admin' : 'sub_user',
            pending_family_code: mode === 'register_join' ? familyCode : null
          },
          emailRedirectTo: window.location.origin 
        };

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: signupOptions,
        });

        if (authError) {
          if (authError.status === 429) {
            throw new Error("Supabase stuurt niet vaker dan één keer per minuut een mail naar hetzelfde adres. Wacht even of check je spam.");
          }
          throw authError;
        }
        
        if (authData.user && !authData.session) {
          setSuccessInfo(`We hebben een bevestigingsmail gestuurd naar ${email}. Klik op de link in de mail om door te gaan.`);
          setLoading(false);
          return;
        }

        if (authData.session) {
          window.location.reload(); 
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError({ 
        message: err.message || "Er is iets misgegaan bij het verbinden met de server.",
        code: err.status || err.code 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;
    setResending(true);
    setError(null);
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (resendError) throw resendError;
      
      alert("Nieuwe mail is verstuurd! Check je inbox.");
    } catch (err: any) {
      setError({ 
        message: err.message || "Kon de mail niet opnieuw versturen. Wacht een minuutje.",
        code: err.status 
      });
    } finally {
      setResending(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Configuratie Fout</h1>
          <p className="text-gray-500 text-sm">Geen verbinding met de database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-fade-in relative overflow-hidden border border-gray-100">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-6 transform -rotate-2">
            <Wallet size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-1">MarBudget</h1>
          <p className="text-gray-400 text-sm font-medium">Beheer je financiën, samen of alleen.</p>
        </div>

        {/* Status Meldingen */}
        {error && (
          <div className="bg-red-50 text-red-600 p-5 rounded-2xl mb-8 text-xs border border-red-100 animate-fade-in flex items-start">
            <AlertTriangle className="w-4 h-4 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Oeps!</p>
              <p>{error.message}</p>
            </div>
          </div>
        )}

        {successInfo ? (
          <div className="animate-fade-in text-center py-4">
            <div className="bg-green-50 text-green-700 p-8 rounded-[2.5rem] mb-6 border border-green-100 flex flex-col items-center">
              <div className="bg-green-500 text-white p-3 rounded-full mb-4 shadow-lg shadow-green-200">
                <Mail size={24} />
              </div>
              <h3 className="font-bold text-xl mb-3 text-green-800 tracking-tight">Check je e-mail!</h3>
              <p className="text-sm leading-relaxed text-green-700/80 mb-6">{successInfo}</p>
              
              <button 
                onClick={handleResendEmail}
                disabled={resending}
                className="text-[11px] bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-full font-bold uppercase tracking-wider transition-all flex items-center"
              >
                {resending ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
                Nog geen mail? Stuur opnieuw
              </button>
            </div>
            
            <button 
              onClick={() => { setSuccessInfo(null); setMode('login'); }}
              className="bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl font-bold flex items-center hover:bg-gray-200 transition-all text-sm mx-auto shadow-sm active:scale-95"
            >
              <ChevronLeft size={18} className="mr-2" /> Terug naar Inloggen
            </button>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            {(mode === 'login' || mode === 'register_select') && (
              <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-10">
                <button 
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Inloggen
                </button>
                <button 
                  onClick={() => { setMode('register_select'); setError(null); }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'register_select' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Registreren
                </button>
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
                  className="w-full bg-primary text-white py-4 px-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg shadow-primary/20 flex items-center justify-center disabled:opacity-70 mt-4 active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                  {loading ? "Inloggen..." : "Inloggen"} {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
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
                  <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
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
                  <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
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

                <div className="space-y-3">
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
                </div>

                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg mt-4 flex justify-center items-center active:scale-95 disabled:opacity-70">
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                  {loading ? "Verwerken..." : (mode === 'register_new' ? "Start als Beheerder" : "Start als Lid")}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};