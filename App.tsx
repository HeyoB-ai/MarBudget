
import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS, formatCurrency } from './constants';
import { postToGoogleSheet } from './services/sheetService';
import { Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Users, Loader2, Share, CheckCircle2, X, Search } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './lib/supabaseClient';
import { NumeraLogo } from './components/Logo';

const Dashboard = () => {
  const { user, profile, tenant, signOut, isCloudReady, role } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [income, setIncome] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isSyncingBulk, setIsSyncingBulk] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isCloudReady || !tenant || !user) return;
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
      if (eData) {
        const mapped = eData.map((e: any) => ({ ...e, amount: Number(e.amount), receiptImage: e.receipt_image }));
        setExpenses(mapped);
      }
    } catch (err) {
      console.warn("Synchronisatie vertraagd.");
    } finally {
      setLoadingData(false);
    }
  }, [tenant, isCloudReady, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addExpense = async (expense: Expense) => {
    const safeExpense = { 
      ...expense, 
      amount: Number(expense.amount),
      user_name: profile?.full_name || 'Cliënt'
    };
    setExpenses(prev => [safeExpense, ...prev]);
    if (isCloudReady && tenant && user) {
      try {
        await supabase.from('expenses').insert({
          tenant_id: tenant.id, user_id: user.id, amount: safeExpense.amount,
          description: safeExpense.description, category: safeExpense.category,
          date: safeExpense.date, receipt_image: safeExpense.receiptImage
        });
        if (tenant.sheet_url) postToGoogleSheet(tenant.sheet_url, safeExpense);
      } catch (err) { console.error("Opslag mislukt."); }
    }
  };

  const monthLabel = selectedMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth.getMonth() && d.getFullYear() === selectedMonth.getFullYear();
  });

  const filteredExpenses = selectedCategoryFilter 
    ? currentMonthExpenses.filter(e => e.category.toLowerCase().trim() === selectedCategoryFilter.toLowerCase().trim())
    : currentMonthExpenses;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans animate-fade-in">
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <NumeraLogo size={38} />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-black tracking-tight text-secondary leading-tight">Numera</h1>
                <span className="text-[10px] font-bold text-gray-400 italic hidden sm:block">inzicht, overzicht, rust</span>
              </div>
              <span className="text-[9px] text-primary font-black uppercase tracking-widest">{tenant?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowAdmin(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"><Users size={20} /></button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"><Settings size={20} /></button>
            <div className="w-px h-6 bg-gray-100 mx-2"></div>
            <button onClick={signOut} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><LogOut size={20} /></button>
          </div>
        </div>
        <div className="bg-white px-4 py-2 border-t border-gray-50 flex justify-between items-center max-w-3xl mx-auto">
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-2 text-gray-400 hover:text-primary transition-colors"><ChevronLeft size={20} /></button>
          <span className="font-extrabold text-[11px] uppercase tracking-widest text-gray-700">{monthLabel}</span>
          <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-2 text-gray-400 hover:text-primary transition-colors"><ChevronRight size={20} /></button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex space-x-3 mb-8">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSelectedCategoryFilter(null); }} 
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm ${activeTab === 'dashboard' ? 'bg-secondary text-white' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('expenses')} 
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm ${activeTab === 'expenses' ? 'bg-secondary text-white' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Uitgaven ({currentMonthExpenses.length})
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <ReceiptScanner 
              onAddExpense={addExpense} categories={Object.keys(budgets)} currentMonth={selectedMonth} existingExpenses={expenses}
            />
            {loadingData ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Loader2 className="animate-spin mb-3 w-8 h-8 text-primary opacity-30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Data ophalen...</span>
              </div>
            ) : (
              <BudgetOverview 
                expenses={currentMonthExpenses} budgets={budgets} income={income} currentMonth={selectedMonth} 
                onCategoryClick={(cat) => { setSelectedCategoryFilter(cat); setActiveTab('expenses'); }}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedCategoryFilter && (
              <div className="bg-white p-5 rounded-[2rem] flex items-center justify-between border border-primary/20 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl text-primary"><Search size={18} /></div>
                  <span className="font-black text-gray-800">{selectedCategoryFilter}</span>
                </div>
                <button onClick={() => setSelectedCategoryFilter(null)} className="p-2 text-gray-400 hover:text-red-500"><X size={20} /></button>
              </div>
            )}
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                <List size={40} className="mx-auto text-gray-200 mb-4" />
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Geen transacties gevonden</p>
              </div>
            ) : filteredExpenses.map(e => (
              <div key={e.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-50 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                    {e.receiptImage ? <img src={e.receiptImage} className="w-full h-full object-cover" /> : <List size={20} className="text-gray-200" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm leading-tight">{e.description}</h4>
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">{e.category}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="font-black text-gray-800">{formatCurrency(e.amount)}</span>
                  <button onClick={async () => {
                    setExpenses(prev => prev.filter(ex => ex.id !== e.id));
                    await supabase.from('expenses').delete().eq('id', e.id);
                  }} className="text-gray-200 hover:text-red-500 mt-1 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showSettings && (
        <BudgetSettings 
          budgets={budgets} income={income} sheetUrl={tenant?.sheet_url || ""} allExpenses={expenses} 
          onSave={async (nb, ni, nu) => {
            setBudgets(nb); setIncome(ni);
            await supabase.from('tenants').update({ sheet_url: nu }).eq('id', tenant?.id);
            setShowSettings(false);
          }} 
          onClose={() => setShowSettings(false)} 
        />
      )}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    </div>
  );
};

const MaintenanceScreen = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center font-sans">
    <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-sm border border-gray-100 animate-fade-in flex flex-col items-center">
      <NumeraLogo size={80} className="mb-8" />
      <h2 className="text-2xl font-black text-secondary mb-2 tracking-tight">Numera</h2>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mb-8 italic">inzicht, overzicht, rust</p>
      <div className="flex flex-col items-center mb-10">
         <Loader2 className="animate-spin text-primary w-8 h-8 mb-4 opacity-40" />
         <p className="text-sm text-gray-500 font-medium">Omgeving voorbereiden...</p>
      </div>
      <button onClick={() => window.location.reload()} className="w-full bg-secondary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-black transition-all">Ververs Pagina</button>
    </div>
  </div>
);

const AppContent = () => {
  const { session, loading, isCloudReady, tenant } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 animate-fade-in">
      <NumeraLogo size={60} className="animate-bounce" />
      <div className="flex flex-col items-center mt-6">
        <span className="text-2xl font-black text-secondary tracking-tighter">Numera</span>
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300 mt-1">Laden...</span>
      </div>
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
