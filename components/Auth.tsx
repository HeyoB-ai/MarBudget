import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Wallet, AlertTriangle, Users, ArrowRight, ShieldCheck, Mail, Loader2, RefreshCw, ChevronLeft, RotateCcw, UserPlus, Briefcase } from 'lucide-react';

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

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ 
          email: email.trim().toLowerCase(), 
          password 
        });
        if (loginError) throw loginError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { 
            data: { 
              full_name: fullName,
              pending_role: mode === 'register_coach' ? 'master_admin' : 'sub_user',
              pending_family_code: mode === 'register_client' ? familyCode : null
            }
          },
        });

        if (signUpError) throw signUpError;
        if (data.user && !data.session) {
          setSuccessInfo("Bevestigingsmail verstuurd naar " + email);
        }
      }
    } catch (err: any) {
      setError(err.message || "Er ging iets mis. Controleer je gegevens.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-fade-in border border-gray-100">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-lg mb-4">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">MarBudget</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Slimme Budgetcoach</p>
        </div>

        {successInfo ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="bg-primary/10 p-6 rounded-3xl mb-6">
              <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-800">Check je mail</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{successInfo}</p>
            </div>
            <button onClick={() => setMode('login')} className="text-primary font-bold text-sm flex items-center justify-center mx-auto hover:underline">
              <RotateCcw size={14} className="mr-2" /> Terug naar inloggen
            </button>
          </div>
        ) : (
          <>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
              <button onClick={() => setMode('login')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-primary shadow-md' : 'text-gray-400'}`}>Inloggen</button>
              <button onClick={() => setMode('register_select')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${mode.startsWith('register') ? 'bg-white text-primary shadow-md' : 'text-gray-400'}`}>Aanmelden</button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-xs border border-red-100 flex items-center animate-shake">
                <AlertTriangle className="w-4 h-4 mr-3 flex-shrink-0" />
                <p className="font-bold">{error}</p>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-4">E-mailadres</label>
                  <input type="email" required placeholder="naam@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-4">Wachtwoord</label>
                  <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-secondary transition-all flex justify-center items-center active:scale-95 disabled:opacity-70 mt-4">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Start Sessie <ArrowRight className="ml-2 w-4 h-4" /></>}
                </button>
              </form>
            ) : mode === 'register_select' ? (
              <div className="space-y-4 animate-fade-in">
                <p className="text-center text-gray-500 text-sm mb-4">Hoe wil je MarBudget gebruiken?</p>
                <button onClick={() => setMode('register_coach')} className="w-full p-6 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center group">
                  <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors mr-4"><Briefcase size={24} /></div>
                  <div>
                    <div className="font-bold text-gray-800">Ik ben een Coach</div>
                    <div className="text-[10px] text-gray-400 font-medium">Beheer meerdere cliënten en budgetten</div>
                  </div>
                </button>
                <button onClick={() => setMode('register_client')} className="w-full p-6 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center group">
                  <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors mr-4"><UserPlus size={24} /></div>
                  <div>
                    <div className="font-bold text-gray-800">Ik ben een Cliënt</div>
                    <div className="text-[10px] text-gray-400 font-medium">Koppel aan een coach en beheer je bonnen</div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3 animate-fade-in">
                <button type="button" onClick={() => setMode('register_select')} className="text-[10px] font-bold text-primary flex items-center mb-4 uppercase tracking-widest"><ChevronLeft size={12} className="mr-1" /> Terug naar keuze</button>
                
                {mode === 'register_client' && (
                  <div className="space-y-1 mb-2">
                    <label className="text-[10px] font-bold text-primary uppercase ml-4">Coach Code</label>
                    <input type="text" required placeholder="Plak hier de code van je coach" value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} className="w-full p-4 bg-primary/5 border border-primary/10 rounded-2xl font-mono text-xs text-center" />
                  </div>
                )}

                <input type="text" required placeholder="Volledige Naam" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm" />
                <input type="email" required placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm" />
                <input type="password" required placeholder="Wachtwoord (min. 6 tekens)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm" />
                
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg mt-4 flex justify-center active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (mode === 'register_coach' ? "Start Praktijk" : "Koppel met Coach")}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};