import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, ArrowRight, ShieldCheck, Key, ChevronLeft, CheckCircle, Mail, Loader2, RefreshCw, Info, ExternalLink, Settings2, HelpCircle } from 'lucide-react';

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
  const [showRedirectHelp, setShowRedirectHelp] = useState(false);

  const currentOrigin = window.location.origin.replace(/\/$/, ""); // Zorg voor een schone URL zonder slash aan het eind

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

    const emailTrimmed = email.trim().toLowerCase();

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ 
          email: emailTrimmed, 
          password 
        });
        if (loginError) {
          if (loginError.message.toLowerCase().includes('confirm')) {
             setSuccessInfo(`Bevestig eerst je e-mail voor ${emailTrimmed}.`);
             setLoading(false);
             return;
          }
          throw loginError;
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailTrimmed,
          password,
          options: { 
            data: { 
              full_name: fullName,
              pending_role: mode === 'register_new' ? 'master_admin' : 'sub_user',
              pending_family_code: mode === 'register_join' ? familyCode : null
            },
            emailRedirectTo: currentOrigin 
          },
        });

        if (authError) {
          if (authError.status === 429) throw new Error("Wacht even 60 seconden.");
          throw authError;
        }
        
        if (authData.user && !authData.session) {
          setSuccessInfo(`Mail verstuurd naar ${emailTrimmed}.`);
          setLoading(false);
          return;
        }

        if (authData.session) window.location.reload(); 
      }
    } catch (err: any) {
      setError({ message: err.message || "Fout bij inloggen.", code: err.status });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) return;
    setResending(true);
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: emailTrimmed,
        options: { emailRedirectTo: currentOrigin }
      });
      if (resendError) throw resendError;
      alert(`Nieuwe mail gestuurd naar ${emailTrimmed}.`);
    } catch (err: any) {
      setError({ message: err.message || "Wacht 60 seconden." });
    } finally {
      setResending(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Supabase niet gekoppeld</h1>
          <p className="text-gray-500 text-sm">Controleer je omgevingsvariabelen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-fade-in relative border border-gray-100 overflow-hidden">
        
        {/* Progress header */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-6 transform -rotate-2">
            <Wallet size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-1 tracking-tight">MarBudget</h1>
          <p className="text-gray-400 text-sm font-medium">Financieel overzicht, simpel gemaakt.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs border border-red-100 flex items-start">
            <AlertTriangle className="w-4 h-4 mr-3 flex-shrink-0 mt-0.5" />
            <p className="font-medium">{error.message}</p>
          </div>
        )}

        {successInfo ? (
          <div className="animate-fade-in space-y-6">
            <div className="bg-cyan-50 text-primary p-8 rounded-[2.5rem] border border-cyan-100 flex flex-col items-center text-center">
              <div className="bg-primary text-white p-3 rounded-full mb-4 shadow-lg">
                <Mail size={24} />
              </div>
              <h3 className="font-bold text-xl mb-3 text-primary tracking-tight">Bevestig je email</h3>
              <p className="text-sm leading-relaxed mb-6 opacity-80">{successInfo}</p>
              
              <div className="space-y-3 w-full">
                <button 
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="w-full bg-white text-primary py-3 rounded-2xl font-bold text-xs shadow-sm border border-cyan-200 flex items-center justify-center hover:bg-cyan-100 transition-all"
                >
                  {resending ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
                  Stuur mail opnieuw
                </button>

                <button 
                  onClick={() => setShowRedirectHelp(!showRedirectHelp)}
                  className="w-full text-[10px] text-primary/60 font-bold uppercase tracking-wider flex items-center justify-center py-2"
                >
                  <HelpCircle size={12} className="mr-1" /> Kom je op localhost terecht?
                </button>

                {showRedirectHelp && (
                  <div className="bg-white p-5 rounded-2xl text-left border border-cyan-200 shadow-inner mt-2 animate-fade-in">
                    <h4 className="text-[11px] font-bold text-gray-800 uppercase mb-3 flex items-center">
                      <Settings2 size={12} className="mr-1 text-primary" /> Zo los je het op:
                    </h4>
                    <ol className="text-[10px] text-gray-600 space-y-3 list-decimal ml-4 leading-relaxed">
                      <li>Ga naar je <strong>Supabase Dashboard</strong>.</li>
                      <li>Ga naar <strong>Authentication</strong> → <strong>URL Configuration</strong>.</li>
                      <li>Verander de <strong>Site URL</strong> naar:<br/>
                        <code className="bg-gray-100 p-1 rounded font-mono text-primary break-all select-all block mt-1">{currentOrigin}</code>
                      </li>
                      <li>Druk onderaan op <strong>Save</strong>.</li>
                      <li>Klik daarna pas op de link in de mail (of stuur een nieuwe).</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => { setSuccessInfo(null); setMode('login'); }}
              className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-gray-200 transition-all text-sm shadow-sm"
            >
              <ChevronLeft size={18} className="mr-2" /> Terug naar start
            </button>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            {(mode === 'login' || mode === 'register_select') && (
              <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-10">
                <button onClick={() => { setMode('login'); setError(null); }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-primary shadow-md' : 'text-gray-500'}`}
                >Inloggen</button>
                <button onClick={() => { setMode('register_select'); setError(null); }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'register_select' ? 'bg-white text-primary shadow-md' : 'text-gray-500'}`}
                >Registreren</button>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleAuth} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">E-mail</label>
                  <input type="email" required placeholder="naam@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Wachtwoord</label>
                  <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg flex items-center justify-center disabled:opacity-70 active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : "Inloggen"}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </button>
              </form>
            )}

            {mode === 'register_select' && (
              <div className="space-y-4 animate-fade-in">
                <button onClick={() => setMode('register_new')}
                  className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary hover:bg-cyan-50/30 transition-all text-left flex items-center group"
                >
                  <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors text-primary"><ShieldCheck size={32} /></div>
                  <div><h3 className="font-bold text-gray-800">Beheerder</h3><p className="text-xs text-gray-400">Ik start een nieuw huishouden</p></div>
                </button>
                <button onClick={() => setMode('register_join')}
                  className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary hover:bg-cyan-50/30 transition-all text-left flex items-center group"
                >
                  <div className="bg-primary/10 p-3 rounded-2xl mr-4 group-hover:bg-primary group-hover:text-white transition-colors text-primary"><Users size={32} /></div>
                  <div><h3 className="font-bold text-gray-800">Gezinslid</h3><p className="text-xs text-gray-400">Ik sluit me aan bij een ander</p></div>
                </button>
              </div>
            )}

            {(mode === 'register_new' || mode === 'register_join') && (
              <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
                <button type="button" onClick={() => setMode('register_select')} className="text-xs text-primary font-bold flex items-center mb-4"><ChevronLeft size={14} className="mr-1" /> Terug naar keuze</button>
                {mode === 'register_join' && (
                  <div className="bg-cyan-50 p-5 rounded-2xl border border-primary/10">
                    <label className="block text-[10px] font-bold text-primary uppercase mb-2 tracking-widest flex items-center"><Key size={12} className="mr-1" /> Gezins Code</label>
                    <input type="text" required placeholder="CODE VAN BEHEERDER" value={familyCode} onChange={(e) => setFamilyCode(e.target.value)}
                      className="w-full p-3 bg-white border border-primary/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none font-mono text-xs uppercase text-center"
                    />
                  </div>
                )}
                <div className="space-y-3">
                  <input type="text" required placeholder="Je Naam" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                  <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                  <input type="password" required placeholder="Wachtwoord (min. 6 tekens)" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-secondary transition-all font-bold shadow-lg mt-4 flex justify-center items-center active:scale-95 disabled:opacity-70">
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : (mode === 'register_new' ? "Account aanmaken" : "Word lid")}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};