import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS } from './constants';
import { postToGoogleSheet } from './services/sheetService';
import { Wallet, Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Users, Loader2, CloudOff, Cloud, ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './lib/supabaseClient';

const Dashboard = () => {
  const { user, tenant, signOut, isCloudReady, role } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [income, setIncome] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!isCloudReady || !tenant || !user) return;

    setLoadingData(true);
    try {
      // 1. Budgetten ophalen
      const { data: bData } = await supabase.from('budgets').select('category, limit_amount').eq('tenant_id', tenant.id);
      if (bData && bData.length > 0) {
        const bMap: Record<string, number> = {};
        bData.forEach((b: any) => { bMap[b.category] = Number(b.limit_amount); });
        setBudgets(bMap);
      } else {
        setBudgets(INITIAL_BUDGETS);
      }

      // 2. Inkomen ophalen
      const { data: iData } = await supabase.from('incomes').select('amount').eq('tenant_id', tenant.id).maybeSingle();
      if (iData) setIncome(Number(iData.amount));

      // 3. Uitgaven ophalen
      const { data: eData } = await supabase.from('expenses').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false });
      if (eData) {
        const mapped = eData.map((e: any) => ({ ...e, amount: Number(e.amount), receiptImage: e.receipt_image }));
        setExpenses(mapped);
      }
    } catch (err) {
      console.warn("Synchronisatie met cloud vertraagd.");
    } finally {
      setLoadingData(false);
    }
  }, [tenant, isCloudReady, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addExpense = async (expense: Expense) => {
    const safeExpense = { ...expense, amount: Number(expense.amount) };
    const newExpenses = [safeExpense, ...expenses];
    setExpenses(newExpenses);

    if (isCloudReady && tenant && user) {
      try {
        await supabase.from('expenses').insert({
          tenant_id: tenant.id, user_id: user.id, amount: safeExpense.amount,
          description: safeExpense.description, category: safeExpense.category,
          date: safeExpense.date, receipt_image: safeExpense.receiptImage
        });
        if (tenant.sheet_url) postToGoogleSheet(tenant.sheet_url, safeExpense);
      } catch (err) { console.error("Cloud opslag mislukt."); }
    }
  };

  const removeExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (isCloudReady && tenant) {
      await supabase.from('expenses').delete().eq('id', id);
    }
  };

  const handleUpdateSettings = async (newB: Record<string, number>, newI: number, newS: string) => {
    setBudgets(newB);
    setIncome(newI);
    if (isCloudReady && tenant) {
      try {
        const { data: existingI } = await supabase.from('incomes').select('id').eq('tenant_id', tenant.id).maybeSingle();
        if (existingI) await supabase.from('incomes').update({ amount: newI }).eq('id', existingI.id);
        else await supabase.from('incomes').insert({ tenant_id: tenant.id, amount: newI });
        
        await supabase.from('tenants').update({ sheet_url: newS }).eq('id', tenant.id);
        await supabase.from('budgets').delete().eq('tenant_id', tenant.id);
        for (const [cat, limit] of Object.entries(newB)) {
          await supabase.from('budgets').insert({ tenant_id: tenant.id, category: cat, limit_amount: limit });
        }
        fetchData();
      } catch (err) { console.error(err); }
    }
  };

  const monthLabel = selectedMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth.getMonth() && d.getFullYear() === selectedMonth.getFullYear();
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans animate-fade-in">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-white p-2.5 rounded-2xl shadow-md"><Wallet size={24} /></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-gray-800 leading-tight">MarBudget</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-60">
                  {role === 'master_admin' ? 'Coach' : 'Cliënt'}
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{tenant?.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowAdmin(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all" title="Team/Huishouden"><Users size={20} /></button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all" title="Instellingen"><Settings size={20} /></button>
            <div className="w-px h-6 bg-gray-100 mx-2"></div>
            <button onClick={signOut} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><LogOut size={20} /></button>
          </div>
        </div>
        <div className="bg-white px-4 py-3 border-t border-gray-50 flex justify-between items-center max-w-3xl mx-auto">
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-2 text-gray-400 hover:text-primary transition-colors"><ChevronLeft size={20} /></button>
          <span className="font-extrabold text-sm uppercase tracking-widest text-gray-700">{monthLabel}</span>
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-2 text-gray-400 hover:text-primary transition-colors"><ChevronRight size={20} /></button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex space-x-3 mb-8">
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3.5 px-4 text-sm font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 ${activeTab === 'dashboard' ? 'bg-primary text-white scale-[1.02]' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>Overzicht</button>
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3.5 px-4 text-sm font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 ${activeTab === 'expenses' ? 'bg-primary text-white scale-[1.02]' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>Uitgaven ({currentMonthExpenses.length})</button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="animate-fade-in space-y-8">
            <ReceiptScanner 
              onAddExpense={addExpense} 
              categories={Object.keys(budgets)} 
              currentMonth={selectedMonth}
              existingExpenses={expenses}
            />
            {loadingData ? <div className="py-20 text-center text-gray-400 flex flex-col items-center"><Loader2 className="animate-spin mb-3 w-8 h-8 opacity-20" /><span className="text-xs font-bold uppercase tracking-widest">Data ophalen...</span></div> : <BudgetOverview expenses={currentMonthExpenses} budgets={budgets} income={income} currentMonth={selectedMonth} />}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {currentMonthExpenses.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[3rem] border-dashed border-2 border-gray-100 flex flex-col items-center">
                <div className="bg-gray-50 p-6 rounded-full mb-4 text-gray-200"><List size={40} /></div>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nog geen bonnetjes deze maand</p>
              </div>
            ) : currentMonthExpenses.map(e => (
              <div key={e.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-50 flex justify-between items-center group hover:shadow-md transition-all">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 overflow-hidden flex items-center justify-center text-primary group-hover:scale-105 transition-transform border border-gray-100">
                    {e.receiptImage ? <img src={e.receiptImage} className="w-full h-full object-cover" /> : <List size={22} className="opacity-30" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 leading-tight">{e.description}</h4>
                    <span className="text-[9px] font-black text-primary/50 uppercase tracking-widest block mt-0.5">{e.category}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-black text-gray-800 text-lg">€{e.amount.toFixed(2).replace('.', ',')}</span>
                  <button onClick={() => removeExpense(e.id)} className="text-gray-200 hover:text-red-500 mt-1.5 transition-colors p-1"><Trash2 size={16} /></button>
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

const MaintenanceScreen = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center font-sans">
    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-sm border border-gray-100 animate-fade-in">
      <div className="bg-primary/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-gray-800 mb-4 tracking-tight">Even geduld...</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-10">
        We maken je persoonlijke budget-omgeving gereed in de cloud. Dit duurt slechts enkele seconden.
      </p>
      <button onClick={() => window.location.reload()} className="w-full bg-primary text-white py-4 rounded-2xl font-extrabold shadow-lg hover:bg-secondary active:scale-95 transition-all">Controleer Verbinding</button>
    </div>
  </div>
);

const AppContent = () => {
  const { session, loading, isCloudReady, tenant } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-primary text-white p-4 rounded-3xl shadow-xl animate-bounce mb-6"><Wallet size={32} /></div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">MarBudget Laadt...</span>
    </div>
  );
  if (!session) return <Auth />;
  if (!tenant && !isCloudReady) return <MaintenanceScreen />;
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