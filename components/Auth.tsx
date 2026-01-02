
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, ArrowRight, Mail, Loader2, ChevronLeft, UserPlus, Briefcase, Languages } from 'lucide-react';
import { NumeraLogo } from './Logo';

export const Auth = ({ lang, setLang }: { lang: 'nl' | 'es', setLang: (l: 'nl' | 'es') => void }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_coach' | 'register_client'>('login');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const t = {
    nl: {
      slogan: 'inzicht, overzicht, rust', 
      login: 'Inloggen', 
      register: 'Aanmelden',
      emailLabel: 'E-mailadres', 
      passLabel: 'Wachtwoord', 
      startBtn: 'Starten', 
      backBtn: 'Terug',
      coach: 'Ik ben een Coach', 
      client: 'Ik ben een Cliënt', 
      coachSub: 'inzicht & begeleiding', 
      clientSub: 'overzicht & rust',
      activate: 'Account Activeren', 
      codeLabel: 'Unieke Coach Code', 
      checkInbox: 'Check je inbox',
      nameLabel: 'Volledige Naam'
    },
    es: {
      slogan: 'visión, control, tranquilidad', 
      login: 'Iniciar Sesión', 
      register: 'Registrarse',
      emailLabel: 'Correo electrónico', 
      passLabel: 'Contraseña', 
      startBtn: 'Entrar', 
      backBtn: 'Volver',
      coach: 'Soy Coach', 
      client: 'Soy Cliente', 
      coachSub: 'Visión y Guía', 
      clientSub: 'Control y Paz',
      activate: 'Activar Cuenta', 
      codeLabel: 'Código de Coach', 
      checkInbox: 'Revisa tu correo',
      nameLabel: 'Nombre completo'
    }
  }[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (loginError) throw loginError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { data: { full_name: fullName, pending_role: mode === 'register_coach' ? 'master_admin' : 'sub_user', pending_family_code: familyCode } }
        });
        if (signUpError) throw signUpError;
        if (data.user && !data.session) setSuccessInfo(t.checkInbox);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans animate-fade-in relative">
      {/* Taalschakelaar */}
      <button 
        onClick={() => setLang(lang === 'nl' ? 'es' : 'nl')} 
        className="absolute top-6 right-6 p-3 bg-white shadow-sm rounded-2xl flex items-center gap-2 text-primary font-black text-[10px] uppercase border border-gray-100 hover:bg-gray-50 transition-all"
      >
        <Languages size={18} /> {lang}
      </button>
      
      <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl w-full max-w-md border border-gray-100 flex flex-col items-center">
        <div className="flex flex-col items-center mb-12 text-center">
          <NumeraLogo size={80} className="mb-6 drop-shadow-xl" />
          <h1 className="text-4xl font-black text-secondary tracking-tighter leading-none">Numera</h1>
          <p className="text-[13px] text-gray-400 font-extralight tracking-tight mt-1 leading-tight italic">{t.slogan}</p>
        </div>

        {successInfo ? (
          <div className="text-center w-full animate-fade-in">
             <Mail className="w-14 h-14 text-primary mx-auto mb-5" />
             <h3 className="font-black text-secondary text-xl mb-2">{t.checkInbox}</h3>
             <button onClick={() => setMode('login')} className="text-secondary font-black text-[10px] uppercase tracking-widest bg-gray-50 px-10 py-5 rounded-2xl mt-4">{t.backBtn}</button>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] mb-10">
              <button 
                onClick={() => setMode('login')} 
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${mode === 'login' ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'}`}
              >
                {t.login}
              </button>
              <button 
                onClick={() => setMode('register_select')} 
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${mode.startsWith('register') ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'}`}
              >
                {t.register}
              </button>
            </div>
            
            {error && <div className="bg-red-50 text-red-600 p-5 rounded-[1.5rem] mb-6 text-xs font-bold border border-red-100">{error}</div>}
            
            {mode === 'login' ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <input 
                  type="email" 
                  required 
                  placeholder={t.emailLabel} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner" 
                />
                <input 
                  type="password" 
                  required 
                  placeholder={t.passLabel} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner" 
                />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-secondary text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black transition-all flex justify-center items-center"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>{t.startBtn} <ArrowRight className="ml-3 w-4 h-4 text-primary" /></>}
                </button>
              </form>
            ) : mode === 'register_select' ? (
              <div className="space-y-4">
                <button onClick={() => setMode('register_coach')} className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] hover:border-primary flex items-center shadow-sm text-left">
                  <div className="bg-secondary p-4 rounded-2xl text-primary mr-5"><Briefcase size={28} /></div>
                  <div>
                    <div className="font-black text-gray-800 text-sm uppercase">{t.coach}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">{t.coachSub}</div>
                  </div>
                </button>
                <button onClick={() => setMode('register_client')} className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] hover:border-primary flex items-center shadow-sm text-left">
                  <div className="bg-secondary p-4 rounded-2xl text-primary mr-5"><UserPlus size={28} /></div>
                  <div>
                    <div className="font-black text-gray-800 text-sm uppercase">{t.client}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">{t.clientSub}</div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-3">
                <button type="button" onClick={() => setMode('register_select')} className="text-[9px] font-black text-primary flex items-center mb-6 uppercase tracking-widest">
                  <ChevronLeft size={14} className="mr-1" /> {t.backBtn}
                </button>
                {mode === 'register_client' && (
                  <input 
                    type="text" 
                    required 
                    placeholder={t.codeLabel} 
                    value={familyCode} 
                    onChange={(e) => setFamilyCode(e.target.value)} 
                    className="w-full p-4 bg-primary/5 border-2 border-primary/10 rounded-2xl text-center font-bold text-sm mb-4" 
                  />
                )}
                <input 
                  type="text" 
                  required 
                  placeholder={t.nameLabel} 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner" 
                />
                <input 
                  type="email" 
                  required 
                  placeholder={t.emailLabel} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner" 
                />
                <input 
                  type="password" 
                  required 
                  placeholder={t.passLabel} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner" 
                />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-secondary text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl mt-8 transition-all hover:bg-black"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : t.activate}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
