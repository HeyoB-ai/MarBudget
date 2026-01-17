
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, ArrowRight, Mail, Loader2, ChevronLeft, UserPlus, Briefcase, Languages, RefreshCw, Edit3, Info, ChevronDown, ChevronUp, Clock, LogIn, ExternalLink, Copy, Check } from 'lucide-react';
import { NumeraLogo } from './Logo';

export const Auth = ({ lang, setLang }: { lang: 'nl' | 'es', setLang: (l: 'nl' | 'es') => void }) => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [mode, setMode] = useState<'login' | 'register_select' | 'register_coach' | 'register_client'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isExistingUserError, setIsExistingUserError] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showConfigHint, setShowConfigHint] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // De URL waar de gebruiker naar terugkeert na het klikken op de bevestigingsmail.
  // We gebruiken window.location.origin zodat dit altijd klopt, of je nu op localhost, Netlify of numeraplatform.nl zit.
  const redirectUrl = window.location.origin;

  const t = {
    nl: {
      slogan: 'inzicht, overzicht, rust', 
      login: 'INLOGGEN', 
      register: 'AANMELDEN',
      nameLabel: 'Volledige naam',
      emailLabel: 'E-mailadres', 
      passLabel: 'Wachtwoord', 
      startBtn: 'STARTEN', 
      backBtn: 'Terug',
      coach: 'Ik ben een Coach', 
      client: 'Ik ben een Cliënt', 
      coachSub: 'inzicht & begeleiding', 
      clientSub: 'overzicht & rust',
      activate: 'Account Activeren', 
      codeLabel: 'Unieke Coach Code', 
      checkInbox: 'Check je inbox',
      checkInboxSub: 'We hebben een bevestigingsmail gestuurd naar',
      resendBtn: 'Opnieuw sturen',
      resendSuccess: 'Verzoek verzonden!',
      tryDifferent: 'Ander e-mailadres proberen',
      rateLimitHint: 'Supabase stuurt max. 3 mails per uur.',
      configHintTitle: 'Configuratie URL in Supabase',
      configHintDesc: 'Zorg dat onderstaande URL in je Supabase Dashboard staat onder Authentication > URL Configuration > Redirect URLs:',
      copyUrl: 'Kopieer URL',
      alreadyExists: 'Dit account bestaat al.',
      tryLoginInstead: 'Probeer in te loggen'
    },
    es: {
      slogan: 'visión, control, tranquilidad', 
      login: 'INICIAR SESIÓN', 
      register: 'REGISTRARSE',
      nameLabel: 'Nombre completo',
      emailLabel: 'Correo electrónico', 
      passLabel: 'Contraseña', 
      startBtn: 'ENTRAR', 
      backBtn: 'Volver',
      coach: 'Soy Coach', 
      client: 'Soy Cliente', 
      coachSub: 'Visión y Guía', 
      clientSub: 'Control y Paz',
      activate: 'Activar Cuenta', 
      codeLabel: 'Código de Coach', 
      checkInbox: 'Revisa tu correo',
      checkInboxSub: 'Hemos enviado un correo a',
      resendBtn: 'Reenviar',
      resendSuccess: '¡Enviado!',
      tryDifferent: 'Probar otro correo',
      rateLimitHint: 'Máx. 3 correos por hora.',
      configHintTitle: 'Configuración de URL',
      configHintDesc: 'Asegúrate de que esta URL esté en tu panel de Supabase (Authentication > URL Configuration):',
      copyUrl: 'Copiar URL',
      alreadyExists: 'Esta cuenta ya existe.',
      tryLoginInstead: 'Intenta iniciar sesión'
    }
  }[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsExistingUserError(false);
    
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (loginError) throw loginError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { 
            data: { 
              full_name: fullName, 
              pending_role: mode === 'register_coach' ? 'master_admin' : 'sub_user', 
              pending_family_code: familyCode 
            },
            emailRedirectTo: redirectUrl
          }
        });

        if (signUpError) throw signUpError;

        const isExisting = data.user && data.user.identities && data.user.identities.length === 0;
        
        if (isExisting) {
          setIsExistingUserError(true);
          setError(t.alreadyExists);
        } else if (data.user) {
          setSuccessInfo(cleanEmail);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!successInfo) return;
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: successInfo,
        options: { emailRedirectTo: redirectUrl }
      });
      if (resendError) throw resendError;
      alert(t.resendSuccess);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const copyRedirectUrl = () => {
    navigator.clipboard.writeText(redirectUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans animate-fade-in relative">
      <button 
        onClick={() => setLang(lang === 'nl' ? 'es' : 'nl')} 
        className="absolute top-6 right-6 p-3 bg-white shadow-sm rounded-2xl flex items-center gap-2 text-primary font-black text-[10px] uppercase border border-gray-100 hover:bg-gray-50 transition-all z-50"
      >
        <Languages size={18} /> {lang}
      </button>
      
      <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl w-full max-w-md border border-gray-100 flex flex-col items-center">
        <div className="flex flex-col items-center mb-12 text-center">
          <NumeraLogo size={80} className="mb-6 drop-shadow-xl" />
          <h1 className="text-4xl font-black text-secondary tracking-tighter leading-none">MarBudget</h1>
          <p className="text-[13px] text-gray-400 font-extralight tracking-tight mt-1 leading-tight italic">{t.slogan}</p>
        </div>

        {successInfo ? (
          <div className="text-center w-full animate-fade-in space-y-6">
             <div className="bg-primary/10 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-primary" />
             </div>
             
             <div>
               <h3 className="font-black text-secondary text-2xl mb-2">{t.checkInbox}</h3>
               <p className="text-sm text-gray-500 font-medium">
                 {t.checkInboxSub} <br/>
                 <span className="font-black text-secondary block mt-1">{successInfo}</span>
               </p>
             </div>

             <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 text-left">
                <button 
                  onClick={() => setShowConfigHint(!showConfigHint)}
                  className="flex items-center justify-between w-full text-amber-700 font-black text-[10px] uppercase tracking-widest"
                >
                  <span className="flex items-center gap-2"><Info size={14} /> {t.configHintTitle}</span>
                  {showConfigHint ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {showConfigHint && (
                  <div className="mt-4 animate-fade-in">
                    <p className="text-[10px] text-amber-600 font-bold mb-3 leading-relaxed italic">{t.configHintDesc}</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white p-3 rounded-xl border border-amber-200 text-[9px] font-mono text-amber-800 break-all select-all">
                        {redirectUrl}
                      </div>
                      <button 
                        onClick={copyRedirectUrl}
                        className="bg-amber-100 p-3 rounded-xl text-amber-700 hover:bg-amber-200 transition-colors shrink-0"
                      >
                        {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                )}
             </div>

             <div className="flex flex-col gap-3 pt-2">
               <button onClick={handleResend} disabled={resending} className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white border border-gray-200 text-secondary rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                 {resending ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                 {t.resendBtn}
               </button>
               <button onClick={() => { setSuccessInfo(null); setError(null); }} className="w-full text-gray-400 font-black uppercase text-[10px] tracking-widest py-2 hover:text-secondary transition-all">
                 {t.tryDifferent}
               </button>
             </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] mb-10">
              <button onClick={() => { setMode('login'); setError(null); setIsExistingUserError(false); }} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${mode === 'login' ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'}`}>
                {t.login}
              </button>
              <button onClick={() => { setMode('register_select'); setError(null); setIsExistingUserError(false); }} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${mode.startsWith('register') ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'}`}>
                {t.register}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-[1.5rem] mb-6 border border-red-100 animate-shake">
                <p className="text-xs font-bold mb-3">{error}</p>
                {isExistingUserError && (
                  <button 
                    onClick={() => { setMode('login'); setError(null); setIsExistingUserError(false); }}
                    className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                  >
                    <LogIn size={14} /> {t.tryLoginInstead}
                  </button>
                )}
              </div>
            )}
            
            {mode === 'login' ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" required placeholder={t.emailLabel} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner text-center focus:ring-2 focus:ring-primary/20 transition-all" />
                <input type="password" required placeholder={t.passLabel} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner text-center focus:ring-2 focus:ring-primary/20 transition-all" />
                <button type="submit" disabled={loading} className="w-full bg-secondary text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black transition-all flex justify-center items-center active:scale-95">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>{t.startBtn} <ArrowRight className="ml-3 w-4 h-4 text-primary" /></>}
                </button>
              </form>
            ) : mode === 'register_select' ? (
              <div className="space-y-4">
                <button onClick={() => setMode('register_coach')} className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] hover:border-primary flex items-center shadow-sm text-left group transition-all active:scale-95">
                  <div className="bg-secondary p-4 rounded-2xl text-primary mr-5 group-hover:scale-110 transition-transform"><Briefcase size={28} /></div>
                  <div>
                    <div className="font-black text-gray-800 text-sm uppercase">{t.coach}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">{t.coachSub}</div>
                  </div>
                </button>
                <button onClick={() => setMode('register_client')} className="w-full p-6 bg-white border-2 border-gray-50 rounded-[2.5rem] hover:border-primary flex items-center shadow-sm text-left group transition-all active:scale-95">
                  <div className="bg-secondary p-4 rounded-2xl text-primary mr-5 group-hover:scale-110 transition-transform"><UserPlus size={28} /></div>
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
                  <input type="text" required placeholder={t.codeLabel} value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} className="w-full p-4 bg-primary/5 border-2 border-primary/10 rounded-2xl text-center font-bold text-sm mb-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                )}
                <input type="text" required placeholder={t.nameLabel} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all" />
                <input type="email" required placeholder={t.emailLabel} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all" />
                <input type="password" required placeholder={t.passLabel} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all" />
                <button type="submit" disabled={loading} className="w-full bg-secondary text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl mt-8 transition-all hover:bg-black active:scale-95">
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
