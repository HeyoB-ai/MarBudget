import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS } from './constants';
import { postToGoogleSheet } from './services/sheetService';
import { Wallet, Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Users, Loader2, ShieldCheck, AlertCircle, Database, Terminal, Check, Copy, RefreshCcw, Info } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { LegacySync } from './components/LegacySync';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './lib/supabaseClient';

const Dashboard = () => {
  const { user, tenant, signOut } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [income, setIncome] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLegacySync, setShowLegacySync] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (localStorage.getItem('marbudget_expenses')) setShowLegacySync(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!tenant) return;
    setLoadingData(true);
    try {
      const { data: bData } = await supabase.from('budgets').select('category, limit_amount').eq('tenant_id', tenant.id);
      if (bData && bData.length > 0) {
        const bMap: Record<string, number> = {};
        bData.forEach((b: any) => { bMap[b.category] = Number(b.limit_amount); });
        setBudgets(bMap);
      } else {
        setBudgets(INITIAL_BUDGETS);
      }

      const { data: iData } = await supabase.from('incomes').select('amount').eq('tenant_id', tenant.id).maybeSingle();
      if (iData) setIncome(Number(iData.amount));

      const { data: eData } = await supabase.from('expenses').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false });
      if (eData) setExpenses(eData.map((e: any) => ({ ...e, amount: Number(e.amount), receiptImage: e.receipt_image })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  }, [tenant]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addExpense = async (expense: Expense) => {
    if (!tenant || !user) return;
    const safeExpense = { ...expense, amount: Number(expense.amount) };
    const tempId = expense.id;
    setExpenses(prev => [safeExpense, ...prev]);
    try {
      const { data, error } = await supabase.from('expenses').insert({
        tenant_id: tenant.id, user_id: user.id, amount: safeExpense.amount,
        description: safeExpense.description, category: safeExpense.category,
        date: safeExpense.date, receipt_image: safeExpense.receiptImage
      }).select();
      if (error) throw error;
      if (tenant.sheet_url) postToGoogleSheet(tenant.sheet_url, safeExpense);
      if (data && data[0]) setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: data[0].id } : e));
    } catch (error) {
      setExpenses(prev => prev.filter(e => e.id !== tempId));
      alert("Opslaan mislukt.");
    }
  };

  const removeExpense = async (id: string) => {
    const backup = [...expenses];
    setExpenses(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { alert("Kon niet verwijderen."); setExpenses(backup); }
  };

  const handleUpdateSettings = async (newB: Record<string, number>, newI: number, newS: string) => {
    if (!tenant) return;
    try {
      const { data: existingI } = await supabase.from('incomes').select('id').eq('tenant_id', tenant.id).maybeSingle();
      if (existingI) await supabase.from('incomes').update({ amount: newI }).eq('id', existingI.id);
      else await supabase.from('incomes').insert({ tenant_id: tenant.id, amount: newI });
      await supabase.from('tenants').update({ sheet_url: newS }).eq('id', tenant.id);
      await supabase.from('budgets').delete().eq('tenant_id', tenant.id);
      for (const [cat, limit] of Object.entries(newB)) await supabase.from('budgets').insert({ tenant_id: tenant.id, category: cat, limit_amount: limit });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const monthLabel = selectedMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const categoryList = Object.keys(budgets).length > 0 ? Object.keys(budgets).sort() : Object.keys(INITIAL_BUDGETS).sort();
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth.getMonth() && d.getFullYear() === selectedMonth.getFullYear();
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans animate-fade-in">
      {showLegacySync && <LegacySync onSyncComplete={() => { setShowLegacySync(false); fetchData(); }} />}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-white p-2 rounded-xl shadow-md"><Wallet size={24} /></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold tracking-tight text-gray-800 leading-tight">MarBudget</h1>
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-60">{tenant?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdmin(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"><Users size={20} /></button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"><Settings size={20} /></button>
            <button onClick={signOut} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><LogOut size={20} /></button>
          </div>
        </div>
        <div className="bg-white px-4 py-3 border-t border-gray-50 flex justify-between items-center max-w-3xl mx-auto">
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-2 text-gray-400"><ChevronLeft size={20} /></button>
          <span className="font-bold capitalize">{monthLabel}</span>
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-2 text-gray-400"><ChevronRight size={20} /></button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex space-x-4 mb-8">
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-2xl transition-all shadow-sm ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-100'}`}>Overzicht</button>
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-2xl transition-all shadow-sm ${activeTab === 'expenses' ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-100'}`}>Lijst ({currentMonthExpenses.length})</button>
        </div>
        {activeTab === 'dashboard' ? (
          <div className="animate-fade-in space-y-8">
            <ReceiptScanner onAddExpense={addExpense} categories={categoryList} currentMonth={selectedMonth} />
            {loadingData ? <div className="py-20 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" />Laden...</div> : <BudgetOverview expenses={currentMonthExpenses} budgets={budgets} income={income} currentMonth={selectedMonth} />}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {currentMonthExpenses.length === 0 ? <div className="text-center py-20 bg-white rounded-[2rem] border-dashed border-2 border-gray-100 text-gray-300">Nog geen uitgaven.</div> : currentMonthExpenses.map(e => (
              <div key={e.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center text-primary">{e.receiptImage ? <img src={e.receiptImage} className="w-full h-full object-cover" /> : <List size={20} />}</div>
                  <div><h4 className="font-bold text-gray-800 leading-tight">{e.description}</h4><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{e.category}</span></div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-extrabold text-gray-800">€{e.amount.toFixed(2).replace('.', ',')}</span>
                  <button onClick={() => removeExpense(e.id)} className="text-gray-300 hover:text-red-500 mt-1"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {showSettings && <BudgetSettings budgets={budgets} income={income} sheetUrl={tenant?.sheet_url || ""} allExpenses={expenses} onSave={handleUpdateSettings} onClose={() => setShowSettings(false)} />}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    </div>
  );
};

const AppContent = () => {
  const { session, loading, tenant, dbError, refreshUserData, signOut } = useAuth();
  const [copied, setCopied] = useState(false);

  const sqlFix = `-- 1. MAAK ALLE TABELLEN AAN
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'S',
  max_users INTEGER DEFAULT 5,
  sheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_members (
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  receipt_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount DECIMAL(12,2) NOT NULL,
  UNIQUE(tenant_id, category)
);

CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(tenant_id)
);

-- 2. ZET ALLE RECHTEN OPEN
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow All" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Allow All" ON public.%I FOR ALL USING (true);', t);
    END LOOP;
END $$;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlFix);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-primary w-10 h-10 mb-4" /><span className="text-xs font-bold uppercase tracking-widest text-gray-400">Database laden...</span></div>;
  if (!session) return <Auth />;
  
  if (!tenant) {
    return (
       <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center font-sans overflow-y-auto">
         <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-gray-100 relative my-8">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-primary"></div>
           
           <div className="bg-cyan-50 text-primary w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Database size={28} /></div>
           
           <h2 className="text-xl font-black text-center text-gray-800 mb-2 tracking-tight">Database Inrichten</h2>
           <p className="text-[11px] text-gray-400 text-center mb-8 uppercase font-bold tracking-widest">Stap 2 van 2</p>

           <div className="space-y-4">
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-4">
                <div className="bg-white w-6 h-6 rounded-lg shadow-sm flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">1</div>
                <p className="text-[11px] text-gray-500 leading-normal">Open de <b>SQL Editor</b> in je Supabase Dashboard.</p>
             </div>

             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-white w-6 h-6 rounded-lg shadow-sm flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">2</div>
                  <p className="text-[11px] text-gray-500 leading-normal">Kopieer en plak de code hieronder:</p>
                </div>
                
                <div className="relative group">
                  <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl">
                    <pre className="p-4 text-[9px] font-mono text-cyan-400 overflow-x-auto max-h-40 scrollbar-thin scrollbar-thumb-gray-700">
                      {sqlFix}
                    </pre>
                    <button 
                      onClick={handleCopy}
                      className="absolute top-2 right-2 bg-primary/90 hover:bg-primary text-white p-2 rounded-lg transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span className="text-[9px] font-black uppercase">{copied ? 'Klaar!' : 'Kopieer'}</span>
                    </button>
                  </div>
                </div>
             </div>

             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-4">
                <div className="bg-white w-6 h-6 rounded-lg shadow-sm flex items-center justify-center text-[10px] font-black text-primary flex-shrink-0">3</div>
                <p className="text-[11px] text-gray-500 leading-normal">Klik op <b>Run</b> in Supabase en kom hier terug.</p>
             </div>
           </div>

           <div className="mt-10 space-y-3">
             <button 
               onClick={refreshUserData}
               className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:bg-secondary active:scale-95 transition-all flex items-center justify-center group"
             >
               <RefreshCcw size={18} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
               Alles Uitgevoerd
             </button>
             
             <button onClick={signOut} className="w-full text-[10px] text-gray-300 font-bold uppercase tracking-widest py-2 hover:text-red-400 transition-colors">Log uit</button>
           </div>
           
           {dbError && (
             <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 animate-fade-in">
               <AlertCircle size={14} className="text-amber-500 mt-0.5" />
               <div className="flex-1">
                 <p className="text-[10px] text-amber-600 font-bold uppercase mb-1">Status Melding</p>
                 <p className="text-[10px] text-amber-700 leading-tight font-mono">{dbError}</p>
               </div>
             </div>
           )}
         </div>
         
         <div className="flex items-center gap-2 text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">
           <ShieldCheck size={12} /> Veilig Verbonden
         </div>
       </div>
    );
  }

  return <Dashboard />;
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;