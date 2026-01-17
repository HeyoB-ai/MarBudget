
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, ArrowRight, Mail, Loader2, ChevronLeft, UserPlus, Briefcase, Languages, RefreshCw, Edit3, Info, ChevronDown, ChevronUp, Clock } from 'lucide-react';
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
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const redirectUrl = window.location.origin.replace(/\/$/, ""); 

  const t = {
    nl: {
      slogan: 'inzicht, overzicht, rust', 
      login: 'INLOGGEN', 
      register: 'AANMELDEN',
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
      noMail: 'Geen mail ontvangen?',
      resendBtn: 'Opnieuw sturen',
      resendSuccess: 'Verzoek verzonden! Check je mail over een minuut.',
      tryDifferent: 'Ander e-mailadres proberen',
      spamHint: 'Check ook je ongewenste e-mail of spam-folder.',
      rateLimitHint: 'Supabase stuurt maximaal 3 mails per uur per adres. Wacht even als het niet lukt.',
      siteNotFoundHint: 'Krijg je "Site not found" na het klikken? De link werkt wel, maar de terugkeer-URL in Supabase staat verkeerd.',
      nameLabel: 'Volledige Naam',
      alreadyExistsHint: 'Als je geen mail krijgt, bestaat dit account mogelijk nog in de "identities" tabel van Supabase.'
    },
    es: {
      slogan: 'visión, control, tranquilidad', 
      login: 'INICIAR SESIÓN', 
      register: 'REGISTRARSE',
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
      checkInboxSub: 'Hemos enviado un correo de confirmación a',
      noMail: '¿No has recibido el correo?',
      resendBtn: 'Reenviar correo',
      resendSuccess: '¡Solicitud enviada! Revisa tu correo en un minuto.',
      tryDifferent: 'Probar con otro correo',
      spamHint: 'Revisa también tu carpeta de correo no deseado o spam.',
      rateLimitHint: 'Supabase envía un máximo de 3 correos por hora. Espera un momento si no llega.',
      siteNotFoundHint: '¿Ves "Site not found"? El enlace funciona, maar de URL de retorno en Supabase es incorrecta.',
      nameLabel: 'Nombre completo',
      alreadyExistsHint: 'Si no llega el correo, es posible que la cuenta aún exista en la tabla "identities" de Supabase.'
    }
  }[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (loginError) throw loginError;
      } else {
        console.log(`[Auth] Registratiepoging voor: ${cleanEmail} met redirect: ${redirectUrl}`);
        
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

        // Logging voor debugging
        console.log("[Auth] Supabase response:", data);

        if (data.session) {
          console.log("[Auth] Directe login gedetecteerd (geen e-mailbevestiging nodig)");
          return;
        }

        // Check of de gebruiker al bestond (Supabase geeft dan geen error maar lege identities)
        const isExistingUser = data.user && data.user.identities && data.user.identities.length === 0;
        
        if (isExistingUser) {
          console.warn("[Auth] Gebruiker bestaat al volgens identities. Er wordt geen mail gestuurd.");
          setError(lang === 'nl' ? "Dit e-mailadres is al in gebruik of onlangs gewist. Wacht 15 min." : "Este correo ya está en uso o fue borrado recientemente. Espera 15 min.");
        } else if (data.user) {
          setSuccessInfo(cleanEmail);
        }
      }
    } catch (err: any) {
      console.error("[Auth] Fout:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!successInfo) return;
    setResending(true);
    setError(null);
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
          <h1 className="text-4xl font-black text-secondary tracking-tighter leading-none">Numera</h1>
          <p className="text-[13px] text-gray-400 font-extralight tracking-tight mt-1 leading-tight italic">{t.slogan}</p>
        </div>

        {successInfo ? (
          <div className="text-center w-full animate-fade-in space-y-6">
             <div className="bg-primary/10 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-primary" />
             </div>
             <div>
               <h3 className="font-black text-secondary text-2xl mb-2">{t.checkInbox}</h3>
               <p className="text-sm text-gray-500 font-medium px-4">
                 {t.checkInboxSub} <br/>
                 <span className="font-black text-secondary block mt-1">{successInfo}</span>
               </p>
             </div>
             
             <div className="space-y-3">
               <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-[10px] text-amber-700 font-bold leading-relaxed italic text-left">
                 <div className="flex items-start gap-2 mb-2">
                   <Clock size={14} className="mt-0.5 shrink-0" />
                   <span>{t.rateLimitHint}</span>
                 </div>
                 <div className="flex items-start gap-2">
                   <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                   <span>{t.siteNotFoundHint}</span>
                 </div>
               </div>
               
               <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-[10px] text-gray-400 font-medium text-left">
                 {t.spamHint}
               </div>
             </div>

             <div className="space-y-3 pt-4">
               <button 
                onClick={handleResend} 
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white border border-gray-200 text-secondary rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
               >
                 {resending ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                 {t.resendBtn}
               </button>
               
               <button 
                onClick={() => { setSuccessInfo(null); setError(null); }} 
                className="w-full flex items-center justify-center gap-2 py-4 px-6 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-secondary transition-all"
               >
                 <Edit3 className="w-4 h-4" />
                 {t.tryDifferent}
               </button>

               <button 
                  onClick={() => setShowDebug(!showDebug)} 
                  className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-500 mx-auto mt-4"
               >
                 {showDebug ? <ChevronUp size={10} /> : <ChevronDown size={10} />} Debug Config
               </button>
               
               {showDebug && (
                 <div className="w-full p-4 bg-gray-900 rounded-xl text-[8px] font-mono text-green-400 text-left break-all animate-fade-in">
                   REDIRECT_URL: {redirectUrl}<br/>
                   HOST: {window.location.hostname}<br/>
                   TIME: {new Date().toLocaleTimeString()}
                 </div>
               )}
             </div>
             
             {error && <div className="mt-4 text-[10px] text-red-500 font-bold uppercase">{error}</div>}
          </div>
        ) : (
          <div className="w-full">
            <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] mb-10">
              <button 
                onClick={() => { setMode('login'); setError(null); }} 
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${mode === 'login' ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'}`}
              >
                {t.login}
              </button>
              <button 
                onClick={() => { setMode('register_select'); setError(null); }} 
                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.5rem] transition-all ${mode.startsWith('register') ? 'bg-white text-secondary shadow-sm' : 'text-gray-400'}`}
              >
                {t.register}
              </button>
            </div>
            
            {error && <div className="bg-red-50 text-red-600 p-5 rounded-[1.5rem] mb-6 text-xs font-bold border border-red-100 animate-shake">{error}</div>}
            
            {mode === 'login' ? (
              <form onSubmit={handleAuth} className="space-y-4">
                <input 
                  type="email" 
                  required 
                  placeholder={t.emailLabel} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner text-center focus:ring-2 focus:ring-primary/20 transition-all" 
                />
                <input 
                  type="password" 
                  required 
                  placeholder={t.passLabel} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner text-center focus:ring-2 focus:ring-primary/20 transition-all" 
                />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-secondary text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-black transition-all flex justify-center items-center active:scale-95"
                >
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
                  <input 
                    type="text" 
                    required 
                    placeholder={t.codeLabel} 
                    value={familyCode} 
                    onChange={(e) => setFamilyCode(e.target.value)} 
                    className="w-full p-4 bg-primary/5 border-2 border-primary/10 rounded-2xl text-center font-bold text-sm mb-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                )}
                <input 
                  type="text" 
                  required 
                  placeholder={t.nameLabel} 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all" 
                />
                <input 
                  type="email" 
                  required 
                  placeholder={t.emailLabel} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all" 
                />
                <input 
                  type="password" 
                  required 
                  placeholder={t.passLabel} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-4 bg-gray-50 border-0 rounded-2xl text-sm font-bold outline-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all" 
                />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-secondary text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl mt-8 transition-all hover:bg-black active:scale-95"
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
