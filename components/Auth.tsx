
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, ArrowRight, Mail, Loader2, RotateCcw, ChevronLeft, UserPlus, Briefcase, TrendingUp } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_coach' | 'register_client'>('login');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password 
        });
        if (loginError) throw loginError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { 
            data: { 
              full_name: fullName,
              pending_role: mode === 'register_coach' ? 'master_admin' : 'sub_user',
              pending_family_code: mode === 'register_client' ? familyCode : null
            }
          },
        });

        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already registered')) {
            throw new Error("Dit e-mailadres is al gekoppeld aan een account.");
          }
          throw signUpError;
        }

        if (data.user && !data.session) {
          setSuccessInfo("Bevestigingsmail verstuurd naar " + cleanEmail + ". Activeer je account via de link in de mail.");
        }
      }
    } catch (err: any) {
      let friendlyMessage = err.message;
      if (err.message.includes('Invalid login credentials')) {
        friendlyMessage = "E-mail of wachtwoord onjuist.";
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md animate-fade-in border border-gray-100">
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-[#1a202c] text-primary p-5 rounded-[2rem] shadow-xl mb-6 flex items-center justify-center ring-4 ring-primary/10">
            <TrendingUp size={40} />
          </div>
          <h1 className="text-4xl font-black text-[#1a202c] tracking-tighter mb-1">Numera</h1>
          <div className="flex items-center gap-2">
            <span className="w-8 h-px bg-gray-200"></span>
            <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] italic">inzicht, overzicht, rust</p>
            <span className="w-8 h-px bg-gray-200"></span>
          </div>
        </div>

        {successInfo ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="bg-primary/5 p-8 rounded-[2.5rem] mb-8 border border-primary/10">
              <Mail className="w-14 h-14 text-primary mx-auto mb-5" />
              <h3 className="font-black text-[#1a202c] text-xl mb-2">Check je inbox</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">{successInfo}</p>
            </div>
            <button 
              onClick={() => { setMode('login'); setSuccessInfo(null); }} 
              className="text-[#1a202c] font-black text-[10px] uppercase tracking-widest flex items-center justify-center mx-auto hover:text-primary transition-colors bg-gray-50 px-6 py-3 rounded-2xl"
            >
              <RotateCcw size={14} className="mr-2" /> Terug naar inloggen
            </button>
          </div>
        ) : (
          <>
            <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] mb-8">
              <button onClick={() => setMode('login')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[1.2rem] transition-all ${mode === 'login' ? 'bg-white text-[#1a202c] shadow-sm' : 'text-gray-400'}`}>Inloggen</button>
              <button onClick={() => setMode('register_select')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[1.2rem] transition-all ${mode.startsWith('register') ? 'bg-white text-[#1a202c] shadow-sm' : 'text-gray-400'}`}>Aanmelden</button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-[1.5rem] mb-6 text-xs border border-red-100 flex items-center animate-shake">
                <AlertTriangle className="w-4 h-4 mr-3 flex-shrink-0" />
                <p className="font-bold">{error}</p>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-4 tracking-[0.2em]">E-mailadres</label>
                  <input type="email" required placeholder="naam@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold text-gray-700 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-4 tracking-[0.2em]">Wachtwoord</label>
                  <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold text-gray-700 transition-all" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#1a202c] text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all flex justify-center items-center active:scale-95 disabled:opacity-70 mt-4">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Starten <ArrowRight className="ml-3 w-4 h-4 text-primary" /></>}
                </button>
              </form>
            ) : mode === 'register_select' ? (
              <div className="space-y-4 animate-fade-in">
                <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">Maak een keuze</p>
                <button onClick={() => setMode('register_coach')} className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center group shadow-sm">
                  <div className="bg-[#1a202c] p-4 rounded-2xl text-primary group-hover:scale-110 transition-transform mr-5"><Briefcase size={28} /></div>
                  <div>
                    <div className="font-black text-gray-800 text-sm">Ik ben een Coach</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 italic">inzicht & begeleiding</div>
                  </div>
                </button>
                <button onClick={() => setMode('register_client')} className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center group shadow-sm">
                  <div className="bg-[#1a202c] p-4 rounded-2xl text-primary group-hover:scale-110 transition-transform mr-5"><UserPlus size={28} /></div>
                  <div>
                    <div className="font-black text-gray-800 text-sm">Ik ben een Cliënt</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 italic">overzicht & rust</div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3 animate-fade-in">
                <button type="button" onClick={() => setMode('register_select')} className="text-[9px] font-black text-primary flex items-center mb-5 uppercase tracking-widest hover:translate-x-[-4px] transition-transform"><ChevronLeft size={14} className="mr-1" /> Terug</button>
                
                {mode === 'register_client' && (
                  <div className="space-y-1 mb-2">
                    <label className="text-[9px] font-black text-primary uppercase ml-4 tracking-widest">Unieke Coach Code</label>
                    <input type="text" required placeholder="Ontvangen van je coach" value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} className="w-full p-4 bg-primary/5 border-2 border-primary/10 rounded-2xl font-mono text-xs text-center focus:ring-4 focus:ring-primary/10 outline-none font-bold" />
                  </div>
                )}

                <input type="text" required placeholder="Naam" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" />
                <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" />
                <input type="password" required placeholder="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" />
                
                <button type="submit" disabled={loading} className="w-full bg-[#1a202c] text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl mt-6 active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Account Activeren"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
