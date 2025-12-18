import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS } from './constants';
import { postToGoogleSheet } from './services/sheetService';
import { Wallet, Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Users, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
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
    if (localStorage.getItem('marbudget_expenses')) {
      setShowLegacySync(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!tenant) return;
    setLoadingData(true);

    try {
      // 1. Fetch Budgets
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('category, limit_amount')
        .eq('tenant_id', tenant.id);

      if (budgetData && budgetData.length > 0) {
        const budgetMap: Record<string, number> = {};
        budgetData.forEach((b: any) => {
           budgetMap[b.category] = Number(b.limit_amount);
        });
        setBudgets(budgetMap);
      } else {
        setBudgets(INITIAL_BUDGETS);
      }

      // 2. Fetch Income
      const { data: incomeData } = await supabase
        .from('incomes')
        .select('amount')
        .eq('tenant_id', tenant.id)
        .maybeSingle();
      
      if (incomeData) setIncome(Number(incomeData.amount));

      // 3. Fetch Expenses
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('date', { ascending: false });
        
      if (expenseData) {
        setExpenses(expenseData.map((e: any) => ({
          ...e,
          amount: Number(e.amount),
          receiptImage: e.receipt_image
        })));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [tenant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addExpense = async (expense: Expense) => {
    if (!tenant || !user) return;
    const safeExpense = { ...expense, amount: Number(expense.amount) };
    const tempId = expense.id;

    setExpenses(prev => [safeExpense, ...prev]);

    try {
      const { data, error } = await supabase.from('expenses').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        amount: safeExpense.amount,
        description: safeExpense.description,
        category: safeExpense.category,
        date: safeExpense.date,
        receipt_image: safeExpense.receiptImage
      }).select();

      if (error) throw error;
      if (tenant.sheet_url) postToGoogleSheet(tenant.sheet_url, safeExpense);

      if (data && data[0]) {
         setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: data[0].id } : e));
      }
    } catch (error) {
      setExpenses(prev => prev.filter(e => e.id !== tempId));
      alert("Opslaan mislukt.");
    }
  };

  const removeExpense = async (id: string) => {
    const backup = [...expenses];
    setExpenses(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
       alert("Kon niet verwijderen.");
       setExpenses(backup);
    }
  };

  const handleUpdateSettings = async (newBudgets: Record<string, number>, newIncome: number, newSheetUrl: string) => {
    if (!tenant) return;
    setBudgets(newBudgets);
    setIncome(newIncome);

    try {
      const { data: existingIncome } = await supabase.from('incomes').select('id').eq('tenant_id', tenant.id).maybeSingle();
      if (existingIncome) {
        await supabase.from('incomes').update({ amount: newIncome }).eq('id', existingIncome.id);
      } else {
        await supabase.from('incomes').insert({ tenant_id: tenant.id, amount: newIncome });
      }

      await supabase.from('tenants').update({ sheet_url: newSheetUrl }).eq('id', tenant.id);
      await supabase.from('budgets').delete().eq('tenant_id', tenant.id);
      
      for (const [cat, limit] of Object.entries(newBudgets)) {
        await supabase.from('budgets').insert({ tenant_id: tenant.id, category: cat, limit_amount: limit });
      }
      fetchData();
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  const prevMonth = () => setSelectedMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)));
  const nextMonth = () => setSelectedMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)));

  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === selectedMonth.getMonth() && expenseDate.getFullYear() === selectedMonth.getFullYear();
  });

  const categoryList = Object.keys(budgets).length > 0 ? Object.keys(budgets).sort() : Object.keys(INITIAL_BUDGETS).sort();
  const monthLabel = selectedMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 font-sans">
      {showLegacySync && <LegacySync onSyncComplete={() => { setShowLegacySync(false); fetchData(); }} />}

      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-white p-2 rounded-xl shadow-md">
               <Wallet size={24} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold tracking-tight text-gray-800 leading-tight">MarBudget</h1>
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-60">
                {tenant?.name || 'Laden...'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdmin(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"><Users size={20} /></button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"><Settings size={20} /></button>
            <button onClick={signOut} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><LogOut size={20} /></button>
          </div>
        </div>
        
        <div className="bg-white">
           <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
             <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronLeft size={20} /></button>
             <span className="font-bold capitalize text-gray-800 tracking-wide">{monthLabel}</span>
             <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronRight size={20} /></button>
           </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex space-x-4 mb-8">
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-2xl transition-all shadow-sm ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>Overzicht</button>
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-2xl transition-all shadow-sm ${activeTab === 'expenses' ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>Lijst ({currentMonthExpenses.length})</button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-8">
             <ReceiptScanner onAddExpense={addExpense} categories={categoryList} currentMonth={selectedMonth} />
             {loadingData ? (
                <div className="py-20 flex flex-col items-center text-gray-400"><Loader2 className="animate-spin mb-2" /><span>Laden...</span></div>
             ) : (
                <BudgetOverview expenses={currentMonthExpenses} budgets={budgets} income={income} currentMonth={selectedMonth} />
             )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-fade-in">
            {currentMonthExpenses.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200 text-gray-400"><List className="w-12 h-12 mx-auto mb-3 opacity-10" /><p className="font-medium">Nog geen uitgaven voor deze maand.</p></div>
            ) : (
              currentMonthExpenses.map(expense => (
                <div key={expense.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex justify-between items-center hover:shadow-md transition-shadow">
                  <div className="flex gap-4 items-center">
                     {expense.receiptImage ? (
                       <div className="w-14 h-14 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100"><img src={expense.receiptImage} alt="Bon" className="w-full h-full object-cover" /></div>
                     ) : (
                       <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"><List size={20} /></div>
                     )}
                     <div>
                       <h4 className="font-bold text-gray-800 leading-tight">{expense.description}</h4>
                       <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(expense.date).toLocaleDateString('nl-NL')}</span>
                         <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">{expense.category}</span>
                       </div>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-extrabold text-gray-800 text-lg">€{expense.amount.toFixed(2).replace('.', ',')}</span>
                    <button onClick={() => removeExpense(expense.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {showSettings && <BudgetSettings budgets={budgets} income={income} sheetUrl={tenant?.sheet_url || ""} allExpenses={expenses} onSave={handleUpdateSettings} onClose={() => setShowSettings(false)} />}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    </div>
  );
};

const AppContent = () => {
  const { session, loading, tenant } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">MarBudget laden...</span>
      </div>
    );
  }

  if (!session) return <Auth />;
  
  if (!tenant) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center space-y-6">
         <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md">
           <div className="bg-cyan-50 text-primary w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><AlertCircle size={40} /></div>
           <h2 className="text-2xl font-extrabold text-gray-800 mb-4 tracking-tight">Geen huishouden gevonden</h2>
           <p className="text-gray-500 text-sm mb-8 leading-relaxed">
             Je bent ingelogd, maar je bent nog niet gekoppeld aan een huishouden. 
             <br/><br/>
             Mogelijk zijn de database tabellen nog niet aangemaakt in Supabase (404/401 fouten).
           </p>
           <button onClick={() => window.location.reload()} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
             Probeer Opnieuw
           </button>
           <button onClick={() => supabase.auth.signOut()} className="mt-4 text-xs text-gray-400 hover:text-red-500 transition-colors">Log Uit</button>
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