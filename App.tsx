import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS } from './constants';
import { postToGoogleSheet } from './services/sheetService';
import { Wallet, Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Users, Loader2, ShieldCheck, AlertCircle, Database, Terminal, Check, Copy } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
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

  const sqlFix = `-- PLAK DEZE CODE IN DE SUPABASE SQL EDITOR EN DRUK OP RUN
-- Hiermee zet je alle rechten in één keer goed.

DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
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

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400 space-y-4"><Loader2 className="animate-spin text-primary w-10 h-10" /><span className="text-xs font-bold uppercase tracking-widest">Laden...</span></div>;
  if (!session) return <Auth />;
  
  if (!tenant) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
         <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-xl w-full border border-gray-100 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-amber-400"></div>
           <div className="bg-red-50 text-red-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertCircle size={32} /></div>
           
           <h2 className="text-2xl font-extrabold text-center text-gray-800 mb-2 tracking-tight">Database Rechten Fix Nodig</h2>
           <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
             Je bent ingelogd, maar de app mag nog niets in je database schrijven. 
             Volg deze stappen om je lege tabellen te activeren:
           </p>

           <div className="space-y-4">
             <div className="flex items-start gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="bg-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-primary shadow-sm flex-shrink-0">1</div>
                <p className="text-xs text-gray-600">Ga naar je <b>Supabase Dashboard</b> en klik op <b>SQL Editor</b>.</p>
             </div>

             <div className="flex items-start gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="bg-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-primary shadow-sm flex-shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-3">Klik op <b>New Query</b> en plak deze code:</p>
                  <div className="relative group">
                    <pre className="bg-gray-900 text-cyan-400 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 border border-gray-800 shadow-inner">
                      {sqlFix}
                    </pre>
                    <button 
                      onClick={handleCopy}
                      className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all backdrop-blur-sm"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
             </div>

             <div className="flex items-start gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="bg-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-primary shadow-sm flex-shrink-0">3</div>
                <p className="text-xs text-gray-600">Klik op de blauwe knop <b>Run</b> in Supabase. Kom daarna hier terug.</p>
             </div>
           </div>

           <div className="mt-10 flex flex-col gap-3">
             <button 
               onClick={refreshUserData}
               className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center"
             >
               <Check size={18} className="mr-2" /> Ik heb de SQL uitgevoerd
             </button>
             <button onClick={signOut} className="text-xs text-gray-400 font-bold uppercase tracking-widest py-2 hover:text-red-500 transition-colors">Log Uit</button>
           </div>
           
           {dbError && (
             <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-400 font-mono">
               Log: {dbError}
             </div>
           )}
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