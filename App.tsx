
import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS, formatCurrency } from './constants';
import { Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Users, Loader2, Search, X, Languages } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './lib/supabaseClient';
import { NumeraLogo } from './components/Logo';

// Centraal vertaalobject met bi-directionele mapping voor categorieën
export const translations = {
  nl: {
    slogan: 'inzicht, overzicht, rust',
    myBudget: 'MIJN BUDGET',
    dashboard: 'Dashboard',
    expenses: 'Uitgaven',
    loading: 'Data ophalen...',
    noTransactions: 'Geen transacties gevonden',
    prepEnv: 'Omgeving voorbereiden...',
    refresh: 'Ververs Pagina',
    loadingApp: 'Laden...',
    remaining: 'Resterend',
    categories: {
      // Mappen van zowel NL als ES keys naar NL display
      'Alquiler/Hipoteca': 'Huur/Hypotheek',
      'Huur/Hypotheek': 'Huur/Hypotheek',
      'Energía y Agua': 'Energie & Water',
      'Energie & Water': 'Energie & Water',
      'Comestibles': 'Boodschappen',
      'Boodschappen': 'Boodschappen',
      'Transporte y Gasolina': 'Vervoer & Benzine',
      'Vervoer & Benzine': 'Vervoer & Benzine',
      'Teléfono e Internet': 'Telefoon & Internet',
      'Telefoon & Internet': 'Telefoon & Internet',
      'Seguros': 'Verzekeringen',
      'Verzekeringen': 'Verzekeringen',
      'Ocio y Restauración': 'Uitjes & Horeca',
      'Uitjes & Horeca': 'Uitjes & Horeca',
      'Otros': 'Overig',
      'Overig': 'Overig'
    },
    settings: {
      title: 'Budget Instellingen',
      totalBudget: 'Totaal Inkomen / Budget',
      sheetTitle: 'Google Sheets Koppeling',
      sheetDesc: 'Kopieer dit script en plak het in de Google Apps Script editor van je spreadsheet.',
      copyScript: 'Kopieer Script',
      testConn: 'Test Verbinding',
      catBudget: 'Budget per Categorie',
      newCat: 'Nieuwe categorie...',
      save: 'Instellingen Opslaan'
    },
    admin: {
      title: 'Coach Dashboard',
      subtitle: 'Beheer cliënten en bekijk statistieken',
      close: 'Sluiten',
      codeTitle: 'Jouw Coach Code',
      codeDesc: 'Deel deze code met je cliënten zodat zij hun account aan jouw praktijk kunnen koppelen.',
      copy: 'Kopiëren',
      copied: 'Gekopieerd!',
      currentClients: 'Huidige Cliënten',
      noClients: 'Nog geen cliënten gekoppeld',
      spentMonth: 'Uitgegeven deze maand',
      ofBudget: 'van budget',
      overLimit: 'Over limiet!',
      tools: 'Coach Tools',
      sheetOverview: 'Sheets Overzicht',
      sheetSub: 'Bekijk alle ruwe data',
      analysis: 'Trend Analyse',
      analysisSub: 'Bekijk voortgang per cliënt'
    }
  },
  es: {
    slogan: 'visión, control, tranquilidad',
    myBudget: 'MI PRESUPUESTO',
    dashboard: 'Resumen',
    expenses: 'Gastos',
    loading: 'Cargando datos...',
    noTransactions: 'No se encontraron transacciones',
    prepEnv: 'Preparando entorno...',
    refresh: 'Refrescar Página',
    loadingApp: 'Cargando...',
    remaining: 'Restante',
    categories: {
      // Mappen van zowel NL als ES keys naar ES display
      'Alquiler/Hipoteca': 'Alquiler/Hipoteca',
      'Huur/Hypotheek': 'Alquiler/Hipoteca',
      'Energía y Agua': 'Energía y Agua',
      'Energie & Water': 'Energía y Agua',
      'Comestibles': 'Comestibles',
      'Boodschappen': 'Comestibles',
      'Transporte y Gasolina': 'Transporte y Gasolina',
      'Vervoer & Benzine': 'Transporte y Gasolina',
      'Teléfono e Internet': 'Teléfono e Internet',
      'Telefoon & Internet': 'Teléfono e Internet',
      'Seguros': 'Seguros',
      'Verzekeringen': 'Seguros',
      'Ocio y Restauración': 'Ocio y Restauración',
      'Uitjes & Horeca': 'Ocio y Restauración',
      'Otros': 'Otros',
      'Overig': 'Otros'
    },
    settings: {
      title: 'Ajustes de Presupuesto',
      totalBudget: 'Ingresos Totales / Presupuesto',
      sheetTitle: 'Sincronización con Google Sheets',
      sheetDesc: 'Copia este script y pégalo en el editor de Google Apps Script de tu hoja de cálculo.',
      copyScript: 'Copiar Script',
      testConn: 'Probar Conexión',
      catBudget: 'Presupuesto por Categoría',
      newCat: 'Nueva categoría...',
      save: 'Guardar Configuración'
    },
    admin: {
      title: 'Panel de Coach',
      subtitle: 'Gestiona clientes y visualiza estadísticas',
      close: 'Cerrar',
      codeTitle: 'Tu Código de Coach',
      codeDesc: 'Comparte este código con tus clientes para que puedan vincular su cuenta a tu práctica.',
      copy: 'Copiar',
      copied: '¡Copiado!',
      currentClients: 'Clientes Actuales',
      noClients: 'Aún no hay clientes vinculados',
      spentMonth: 'Gastado este mes',
      ofBudget: 'del presupuesto',
      overLimit: '¡Sobre el límite!',
      tools: 'Herramientas de Coach',
      sheetOverview: 'Vista de Sheets',
      sheetSub: 'Ver todos los datos brutos',
      analysis: 'Análisis de Tendencias',
      analysisSub: 'Ver progreso por cliente'
    }
  }
};

const Dashboard = ({ lang, setLang }: { lang: 'nl' | 'es', setLang: (l: 'nl' | 'es') => void }) => {
  const { user, profile, tenant, signOut, isCloudReady } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [income, setIncome] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const t = translations[lang];

  const fetchData = useCallback(async () => {
    if (!isCloudReady || !tenant || !user) return;
    setLoadingData(true);
    try {
      const { data: bData } = await supabase.from('budgets').select('category, limit_amount').eq('tenant_id', tenant.id);
      if (bData && bData.length > 0) {
        const bMap: Record<string, number> = {};
        bData.forEach((b: any) => { bMap[b.category] = Number(b.limit_amount); });
        setBudgets(bMap);
      } else { setBudgets(INITIAL_BUDGETS); }
      const { data: iData } = await supabase.from('incomes').select('amount').eq('tenant_id', tenant.id).maybeSingle();
      if (iData) setIncome(Number(iData.amount));
      const { data: eData } = await supabase.from('expenses').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false });
      if (eData) {
        const mapped = eData.map((e: any) => ({ ...e, amount: Number(e.amount), receiptImage: e.receipt_image }));
        setExpenses(mapped);
      }
    } catch (err) { console.warn("Sync error."); } finally { setLoadingData(false); }
  }, [tenant, isCloudReady, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addExpense = async (expense: Expense) => {
    const safeExpense = { ...expense, user_name: profile?.full_name || (lang === 'nl' ? 'Cliënt' : 'Cliente') };
    setExpenses(prev => [safeExpense, ...prev]);
    if (isCloudReady && tenant && user) {
      await supabase.from('expenses').insert({
        tenant_id: tenant.id, user_id: user.id, amount: safeExpense.amount,
        description: safeExpense.description, category: safeExpense.category,
        date: safeExpense.date, receipt_image: safeExpense.receiptImage
      });
    }
  };

  const monthLabel = selectedMonth.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'es-ES', { month: 'long', year: 'numeric' });
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth.getMonth() && d.getFullYear() === selectedMonth.getFullYear();
  });
  const filteredExpenses = selectedCategoryFilter ? currentMonthExpenses.filter(e => e.category === selectedCategoryFilter) : currentMonthExpenses;

  // Helper om categorie-naam te vertalen voor weergave
  const translateCat = (cat: string) => (t.categories as any)[cat] || cat;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans animate-fade-in">
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <NumeraLogo size={52} />
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tighter text-secondary leading-none">Numera</h1>
              <span className="text-[11px] font-extralight text-gray-400 tracking-tight leading-tight mt-1">{t.slogan}</span>
              <span className="text-[10px] text-primary font-black uppercase tracking-widest mt-1.5 leading-none">{tenant?.name || t.myBudget}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setLang(lang === 'nl' ? 'es' : 'nl')} 
              className="p-2.5 text-primary hover:bg-primary/5 rounded-2xl transition-all flex items-center gap-2"
              title="Switch Language"
            >
              <Languages size={20} />
              <span className="text-[10px] font-black uppercase">{lang}</span>
            </button>
            <div className="w-px h-6 bg-gray-100 mx-1"></div>
            <button onClick={() => setShowAdmin(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl"><Users size={20} /></button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl"><Settings size={20} /></button>
            <button onClick={signOut} className="p-2.5 text-gray-400 hover:text-red-500 rounded-2xl ml-1"><LogOut size={20} /></button>
          </div>
        </div>
        <div className="bg-white px-4 py-2 border-t border-gray-50 flex justify-between items-center max-w-3xl mx-auto">
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-2 text-gray-400 hover:text-primary"><ChevronLeft size={20} /></button>
          <span className="font-extrabold text-[11px] uppercase tracking-widest text-gray-700">{monthLabel}</span>
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-2 text-gray-400 hover:text-primary"><ChevronRight size={20} /></button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex space-x-3 mb-8">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedCategoryFilter(null); }} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-secondary text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>{t.dashboard}</button>
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'expenses' ? 'bg-secondary text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>{t.expenses} ({currentMonthExpenses.length})</button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <ReceiptScanner lang={lang} onAddExpense={addExpense} categories={Object.keys(budgets)} currentMonth={selectedMonth} existingExpenses={expenses} />
            {loadingData ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Loader2 className="animate-spin mb-3 w-8 h-8 text-primary opacity-30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">{t.loading}</span>
              </div>
            ) : <BudgetOverview lang={lang} expenses={currentMonthExpenses} budgets={budgets} income={income} currentMonth={selectedMonth} onCategoryClick={(cat) => { setSelectedCategoryFilter(cat); setActiveTab('expenses'); }} />}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedCategoryFilter && (
              <div className="bg-white p-5 rounded-[2rem] flex items-center justify-between border border-primary/20 shadow-sm">
                <div className="flex items-center gap-3"><div className="bg-primary/10 p-2 rounded-xl text-primary"><Search size={18} /></div><span className="font-black text-gray-800">{translateCat(selectedCategoryFilter)}</span></div>
                <button onClick={() => setSelectedCategoryFilter(null)} className="p-2 text-gray-400 hover:text-red-500"><X size={20} /></button>
              </div>
            )}
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100"><List size={40} className="mx-auto text-gray-200 mb-4" /><p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t.noTransactions}</p></div>
            ) : filteredExpenses.map(e => (
              <div key={e.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-50 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                    {e.receiptImage ? <img src={e.receiptImage} className="w-full h-full object-cover" /> : <List size={20} className="text-gray-200" />}
                  </div>
                  <div><h4 className="font-bold text-gray-800 text-sm leading-tight">{e.description}</h4><span className="text-[9px] font-black text-primary uppercase tracking-widest">{translateCat(e.category)}</span></div>
                </div>
                <div className="text-right flex flex-col items-end"><span className="font-black text-gray-800">{formatCurrency(e.amount, lang)}</span><button onClick={async () => { setExpenses(prev => prev.filter(ex => ex.id !== e.id)); await supabase.from('expenses').delete().eq('id', e.id); }} className="text-gray-200 hover:text-red-500 mt-1 transition-colors"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showSettings && (
        <BudgetSettings lang={lang} budgets={budgets} income={income} sheetUrl={tenant?.sheet_url || ""} allExpenses={expenses} onSave={async (nb, ni, nu) => {
            setBudgets(nb); setIncome(ni);
            await supabase.from('tenants').update({ sheet_url: nu }).eq('id', tenant?.id);
            setShowSettings(false);
          }} onClose={() => setShowSettings(false)} />
      )}
      {showAdmin && <AdminDashboard lang={lang} onClose={() => setShowAdmin(false)} />}
    </div>
  );
};

const MaintenanceScreen = ({ lang }: { lang: 'nl' | 'es' }) => {
  const t = translations[lang];
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center font-sans">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-sm:px-6 max-w-sm border border-gray-100 flex flex-col items-center">
        <NumeraLogo size={80} className="mb-6" />
        <h2 className="text-2xl font-black text-secondary tracking-tight">Numera</h2>
        <p className="text-[11px] text-gray-400 font-extralight tracking-tight mb-8">{t.slogan}</p>
        <div className="flex flex-col items-center mb-10"><Loader2 className="animate-spin text-primary w-8 h-8 mb-4 opacity-40" /><p className="text-sm text-gray-500 font-medium">{t.prepEnv}</p></div>
        <button onClick={() => window.location.reload()} className="w-full bg-secondary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">{t.refresh}</button>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { session, loading, isCloudReady, tenant } = useAuth();
  const [lang, setLang] = useState<'nl' | 'es'>('nl');
  const t = translations[lang];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 animate-fade-in">
      <NumeraLogo size={70} className="animate-pulse mb-6" />
      <div className="flex flex-col items-center"><span className="text-3xl font-black text-secondary tracking-tighter">Numera</span><span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 mt-1">{t.loadingApp}</span></div>
    </div>
  );
  if (!session) return <Auth lang={lang} setLang={setLang} />;
  if (!tenant && !isCloudReady) return <MaintenanceScreen lang={lang} />;
  return <Dashboard lang={lang} setLang={setLang} />;
};

const App = () => <AuthProvider><AppContent /></AuthProvider>;
export default App;
