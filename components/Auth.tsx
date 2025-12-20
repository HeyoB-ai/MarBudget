import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, ArrowRight, ShieldCheck, Key, ChevronLeft, Mail, Loader2, RefreshCw, HelpCircle, Clock, Check, RotateCcw } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_new' | 'register_join'>('login');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);

  const currentUrl = window.location.origin + window.location.pathname;
  const cleanUrl = currentUrl.replace(/\/$/, "");

  // Timer voor de beveiligingspauze
  useEffect(() => {
    if (rateLimitSeconds > 0) {
      const timer = setInterval(() => {
        setRateLimitSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitSeconds]);

  useEffect(() => {
    // @ts-ignore
    const config = typeof __APP_CONFIG__ !== 'undefined' ? __APP_CONFIG__ : { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
    if (!config.VITE_SUPABASE_URL || config.VITE_SUPABASE_URL.includes('placeholder')) {
      setIsConfigured(false);
    }
  }, []);

  const handleAuthError = (err: any) => {
    const msg = err.message || "";
    // Zoek naar getallen in de foutmelding (bijv. "14 seconds")
    const match = msg.match(/\d+/);
    if (match && (msg.includes("security") || msg.includes("limit") || msg.includes("after"))) {
      setRateLimitSeconds(parseInt(match[0]));
      return `Te veel pogingen. Wacht ${match[0]} seconden.`;
    }
    if (msg.includes("Invalid login credentials")) return "E-mail of wachtwoord klopt niet.";
    if (msg.includes("Email not confirmed")) return "E-mail is nog niet bevestigd. Klik op de link in je mail!";
    if (msg.includes("already registered")) return "Dit account bestaat al. Probeer in te loggen.";
    return "Er ging iets mis. Probeer het opnieuw.";
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured || rateLimitSeconds > 0) return;
    
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ 
          email: email.trim().toLowerCase(), 
          password 
        });
        if (loginError) throw loginError;
        window.location.reload();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { 
            data: { 
              full_name: fullName,
              pending_role: mode === 'register_new' ? 'master_admin' : 'sub_user',
              pending_family_code: mode === 'register_join' ? familyCode : null
            },
            emailRedirectTo: cleanUrl 
          },
        });

        if (signUpError) throw signUpError;
        
        if (data.user && !data.session) {
          setSuccessInfo("Bevestigingsmail verstuurd!");
        } else if (data.session) {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setError(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (rateLimitSeconds > 0) return;
    setResending(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: cleanUrl }
      });
      if (resendError) throw resendError;
      alert("Nieuwe mail is onderweg!");
    } catch (err: any) {
      setError(handleAuthError(err));
    } finally {
      setResending(false);
    }
  };

  const resetAll = () => {
    setError(null);
    setSuccessInfo(null);
    setMode('login');
    setLoading(false);
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Supabase Fout</h1>
          <p className="text-gray-500 text-sm">Controleer de API instellingen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-fade-in border border-gray-100 relative">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-4">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">MarBudget</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs border border-red-100 flex items-center animate-shake">
            <AlertTriangle className="w-4 h-4 mr-3 flex-shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {successInfo ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="bg-cyan-50 p-8 rounded-[2rem] border border-cyan-100">
              <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Check je inbox</h3>
              <p className="text-sm text-gray-500 mb-6">We hebben een mail gestuurd naar <b>{email}</b>.</p>
              
              <button 
                onClick={handleResend}
                disabled={resending || rateLimitSeconds > 0}
                className="w-full bg-white text-primary border border-primary/20 py-3 rounded-xl text-xs font-bold flex items-center justify-center mb-3 hover:bg-cyan-100 transition-all disabled:opacity-50"
              >
                {rateLimitSeconds > 0 ? <Clock size={14} className="mr-2" /> : <RefreshCw size={14} className="mr-2" />}
                {rateLimitSeconds > 0 ? `Wacht ${rateLimitSeconds}s...` : "Stuur opnieuw"}
              </button>

              <button 
                onClick={resetAll}
                className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center mx-auto"
              >
                <RotateCcw size={10} className="mr-1" /> Toch inloggen?
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
              <button onClick={() => { setMode('login'); setError(null); }} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-primary shadow-md' : 'text-gray-400'}`}>Inloggen</button>
              <button onClick={() => { setMode('register_select'); setError(null); }} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode.startsWith('register') ? 'bg-white text-primary shadow-md' : 'text-gray-400'}`}>Registreren</button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                <input type="password" required placeholder="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-secondary transition-all flex justify-center items-center active:scale-95 disabled:opacity-70">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Inloggen <ArrowRight className="ml-2 w-4 h-4" /></>}
                </button>
              </form>
            ) : mode === 'register_select' ? (
              <div className="space-y-3">
                <button onClick={() => setMode('register_new')} className="w-full p-5 bg-white border border-gray-100 rounded-2xl hover:border-primary transition-all text-left flex items-center"><ShieldCheck className="text-primary mr-4" /> <div><div className="font-bold text-sm">Beheerder</div><div className="text-[10px] text-gray-400">Nieuw huishouden starten</div></div></button>
                <button onClick={() => setMode('register_join')} className="w-full p-5 bg-white border border-gray-100 rounded-2xl hover:border-primary transition-all text-left flex items-center"><Users className="text-primary mr-4" /> <div><div className="font-bold text-sm">Gezinslid</div><div className="text-[10px] text-gray-400">Word lid van bestaand huishouden</div></div></button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3 animate-fade-in">
                <button type="button" onClick={() => setMode('register_select')} className="text-[10px] font-bold text-primary flex items-center mb-2 uppercase tracking-wider"><ChevronLeft size={12} /> Terug</button>
                {mode === 'register_join' && <input type="text" required placeholder="Gezins Code" value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} className="w-full p-4 bg-cyan-50 border border-primary/10 rounded-2xl font-mono text-xs text-center" />}
                <input type="text" required placeholder="Je Naam" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm" />
                <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm" />
                <input type="password" required placeholder="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm" />
                <button type="submit" disabled={loading || rateLimitSeconds > 0} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg mt-2 flex justify-center">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (rateLimitSeconds > 0 ? `Wacht ${rateLimitSeconds}s` : "Account maken")}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};