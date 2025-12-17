import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS } from './constants';
import { postToGoogleSheet } from './services/sheetService';
import { Wallet, Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Users } from 'lucide-react';
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
      // 1. Fetch Budgets & Force Numbers
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('category, limit_amount')
        .eq('tenant_id', tenant.id);

      if (budgetData && budgetData.length > 0) {
        const budgetMap: Record<string, number> = {};
        budgetData.forEach((b: any) => {
           // Ensure we work with clean numbers
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

      // 3. Fetch Expenses & Force Numbers (Ordered by date)
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('date', { ascending: false }); // Sort newest first
        
      if (expenseData) {
        const formattedExpenses = expenseData.map((e: any) => ({
          ...e,
          amount: Number(e.amount) // Critical fix: ensure DB strings become JS numbers
        }));
        setExpenses(formattedExpenses);
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
    if (!tenant || !user) {
      alert("Geen verbinding met huishouden. Ververs de pagina.");
      return;
    }

    // Force amount to be a number locally
    const safeExpense = { ...expense, amount: Number(expense.amount) };
    const tempId = expense.id;

    // Optimistic Update (Direct op scherm tonen)
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
      
      // Post to Coach Sheet (Fire & Forget)
      if (tenant.sheet_url) {
        postToGoogleSheet(tenant.sheet_url, safeExpense);
      }

      // Update local state with real ID from DB
      if (data && data[0]) {
         setExpenses(prev => prev.map(e => e.id === tempId ? { ...e, id: data[0].id } : e));
      } else {
         fetchData();
      }
    } catch (error: any) {
      console.error("Save error:", error);
      alert("Opslaan mislukt. Controleer je verbinding.");
      // Rollback optimistic update
      setExpenses(prev => prev.filter(e => e.id !== tempId));
    }
  };

  const removeExpense = async (id: string) => {
    const backup = [...expenses];
    setExpenses(prev => prev.filter(e => e.id !== id));
    
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
       alert("Kon niet verwijderen.");
       setExpenses(backup);
    } else {
      fetchData();
    }
  };

  const handleUpdateSettings = async (newBudgets: Record<string, number>, newIncome: number, newSheetUrl: string) => {
    setBudgets(newBudgets);
    setIncome(newIncome);

    if (!tenant) return;

    try {
      const { data: existingIncome } = await supabase.from('incomes').select('id').eq('tenant_id', tenant.id).maybeSingle();
      
      if (existingIncome) {
        await supabase.from('incomes').update({ amount: newIncome }).eq('id', existingIncome.id);
      } else {
        await supabase.from('incomes').insert({ tenant_id: tenant.id, amount: newIncome });
      }

      await supabase.from('tenants').update({ sheet_url: newSheetUrl }).eq('id', tenant.id);

      // Clean slate sync voor budgetten
      await supabase.from('budgets').delete().eq('tenant_id', tenant.id);
      
      for (const [cat, limit] of Object.entries(newBudgets)) {
        await supabase.from('budgets').insert({ 
            tenant_id: tenant.id, 
            category: cat, 
            limit_amount: limit 
        });
      }
      
      fetchData();

    } catch (err: any) {
      console.error("Error saving settings:", err);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const prevMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return (
      expenseDate.getMonth() === selectedMonth.getMonth() &&
      expenseDate.getFullYear() === selectedMonth.getFullYear()
    );
  });

  const categoryList = Object.keys(budgets).length > 0 ? Object.keys(budgets).sort() : Object.keys(INITIAL_BUDGETS).sort();
  const monthLabel = selectedMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20">
      {showLegacySync && (
        <LegacySync onSyncComplete={() => {
          setShowLegacySync(false);
          fetchData();
        }} />
      )}

      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-primary text-white p-2 rounded-lg">
               <Wallet size={24} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-secondary leading-tight">MarBudget</h1>
              <span className="text-xs text-gray-400 font-medium truncate max-w-[150px]">
                {tenant?.name || 'Mijn Huishouden'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowAdmin(true)}
              className="p-2 text-primary bg-primary/5 hover:bg-primary/10 rounded-full transition-colors"
              title="Gezinsleden"
            >
              <Users size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              title="Instellingen"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Uitloggen"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        <div className="bg-white border-t border-gray-100">
           <div className="max-w-3xl mx-auto px-4 py-2 flex justify-between items-center">
             <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600">
               <ChevronLeft size={20} />
             </button>
             <span className="font-semibold capitalize text-gray-800">{monthLabel}</span>
             <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600">
               <ChevronRight size={20} />
             </button>
           </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Overzicht & Scan
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'expenses' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Lijst ({currentMonthExpenses.length})
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-6">
             <ReceiptScanner 
                onAddExpense={addExpense} 
                categories={categoryList} 
                currentMonth={selectedMonth}
             />
             
             {loadingData ? (
                <div className="py-10 text-center text-gray-400">Gegevens laden...</div>
             ) : (
                <BudgetOverview 
                    expenses={currentMonthExpenses} 
                    budgets={budgets} 
                    income={income}
                    currentMonth={selectedMonth}
                />
             )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-fade-in">
            {currentMonthExpenses.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <List className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Geen uitgaven gevonden in {monthLabel}.</p>
              </div>
            ) : (
              currentMonthExpenses
                .map(expense => (
                <div key={expense.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                  <div className="flex gap-4">
                     {expense.receiptImage && (
                       <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                         <img src={expense.receiptImage} alt="Bon" className="w-full h-full object-cover" />
                       </div>
                     )}
                     <div>
                       <h4 className="font-semibold text-gray-800">{expense.description}</h4>
                       <p className="text-xs text-gray-500 mb-1">{new Date(expense.date).toLocaleDateString('nl-NL')}</p>
                       <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                         {expense.category}
                       </span>
                     </div>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full gap-2">
                    <span className="font-bold text-gray-800">{formatCurrency(expense.amount)}</span>
                    <button 
                      onClick={() => removeExpense(expense.id)}
                      className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {showSettings && (
        <BudgetSettings 
          budgets={budgets}
          income={income}
          sheetUrl={tenant?.sheet_url || ""}
          allExpenses={expenses}
          onSave={handleUpdateSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {showAdmin && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
};

const AppContent = () => {
  const { session, loading, tenant } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }
  
  // Extra safeguard: user is logged in but tenant logic failed to attach
  if (!tenant) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
         <h2 className="text-xl font-bold mb-2">Huishouden laden...</h2>
         <p className="text-gray-500">Of je account is nog niet correct gekoppeld.</p>
         <button onClick={() => window.location.reload()} className="mt-4 text-primary font-bold">Herlaad Pagina</button>
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
