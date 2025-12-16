import React, { useState, useEffect } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense, Budget } from './types';
import { formatCurrency, INITIAL_BUDGETS } from './constants';
import { postToGoogleSheet } from './services/sheetService';
import { Wallet, Settings, List, Trash2, ChevronLeft, ChevronRight, LogOut, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { LegacySync } from './components/LegacySync';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './lib/supabaseClient';

// Inner App component that has access to Auth Context
const Dashboard = () => {
  const { user, tenant, role, signOut } = useAuth();
  
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [income, setIncome] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLegacySync, setShowLegacySync] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Check for legacy data on mount
  useEffect(() => {
    if (localStorage.getItem('marbudget_expenses')) {
      setShowLegacySync(true);
    }
  }, []);

  // Fetch Data from Supabase
  useEffect(() => {
    if (tenant) {
      fetchData();
    }
  }, [tenant, selectedMonth]); // Reload when tenant or month changes (if we paginate later)

  const fetchData = async () => {
    // 1. Fetch Budgets
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('category, limit_amount')
      .eq('tenant_id', tenant!.id);
    
    if (budgetData && budgetData.length > 0) {
      const budgetMap: Record<string, number> = {};
      budgetData.forEach((b: any) => budgetMap[b.category] = b.limit_amount);
      setBudgets(budgetMap);
    } else {
      // Fallback: Als er geen budgetten in de DB staan, laad de defaults
      console.log("Geen budgetten gevonden, laden defaults...");
      setBudgets(INITIAL_BUDGETS);
    }

    // 2. Fetch Income
    const { data: incomeData } = await supabase
      .from('incomes')
      .select('amount')
      .eq('tenant_id', tenant!.id)
      .maybeSingle();
    
    if (incomeData) setIncome(incomeData.amount);

    // 3. Fetch Expenses (Realtime subscription could be added here)
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('*');
      
    if (expenseData) setExpenses(expenseData as Expense[]);
  };

  const addExpense = async (expense: Expense) => {
    // Optimistic UI update
    setExpenses(prev => [expense, ...prev]);

    // Save to Supabase
    const { error } = await supabase.from('expenses').insert({
      tenant_id: tenant!.id,
      user_id: user!.id,
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: expense.date,
      receipt_image: expense.receiptImage
    });

    if (error) {
      console.error("Failed to save expense:", error);
      alert("Fout bij opslaan, probeer opnieuw.");
      // Rollback optimistic update
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
      return;
    }
    
    // Automatically push to Google Sheet if configured in Tenant
    if (tenant?.sheet_url) {
      postToGoogleSheet(tenant.sheet_url, expense);
    }
    
    // Check Date & Navigation Logic
    const expenseDate = new Date(expense.date);
    const currentMonthStr = `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`;
    const expenseMonthStr = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`;

    if (currentMonthStr !== expenseMonthStr) {
      setSelectedMonth(expenseDate);
    }
  };

  const removeExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) console.error("Error deleting:", error);
  };

  const handleUpdateSettings = async (newBudgets: Record<string, number>, newIncome: number, newSheetUrl: string) => {
    // Update local state
    setBudgets(newBudgets);
    setIncome(newIncome);

    // Update Income
    const { data: existingIncome } = await supabase.from('incomes').select('id').eq('tenant_id', tenant!.id).maybeSingle();
    if (existingIncome) {
      await supabase.from('incomes').update({ amount: newIncome }).eq('id', existingIncome.id);
    } else {
      await supabase.from('incomes').insert({ tenant_id: tenant!.id, amount: newIncome });
    }

    // Update Tenant Sheet URL (Admin only)
    if (role === 'master_admin') {
       await supabase.from('tenants').update({ sheet_url: newSheetUrl }).eq('id', tenant!.id);
    }

    // Update Budgets
    // We loopen door de nieuwe budgets en slaan ze op
    for (const [cat, limit] of Object.entries(newBudgets)) {
      const { error } = await supabase
        .from('budgets')
        .upsert(
           { tenant_id: tenant!.id, category: cat, limit_amount: limit }, 
           { onConflict: 'tenant_id, category' }
        );
      if (error) console.error("Budget update fail", error);
    }
    
    // Optioneel: Verwijder categorieën uit DB die niet meer in newBudgets staan
    // Voor nu laten we dit simpel (alleen update/insert)
  };

  // Date Navigation Handlers
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

  // Filter expenses for the current selected month
  const currentMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return (
      expenseDate.getMonth() === selectedMonth.getMonth() &&
      expenseDate.getFullYear() === selectedMonth.getFullYear()
    );
  });

  // Als er budgetten zijn, gebruik die keys als categorieën. Anders de fallback 'Overig' of de default keys.
  const categoryList = Object.keys(budgets).length > 0 ? Object.keys(budgets) : Object.keys(INITIAL_BUDGETS);
  const monthLabel = selectedMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20">
      {showLegacySync && (
        <LegacySync onSyncComplete={() => {
          setShowLegacySync(false);
          fetchData(); // Refresh data after sync
        }} />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-primary text-white p-2 rounded-lg">
               <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-secondary">MarBudget</h1>
              <span className="text-xs text-gray-400 font-medium block -mt-1">{tenant?.name} ({tenant?.subscription_tier})</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {role === 'master_admin' && (
              <button 
                onClick={() => setShowAdmin(true)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                title="Admin Dashboard"
              >
                <Shield size={22} />
              </button>
            )}
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              title="Instellingen"
            >
              <Settings size={22} />
            </button>
            <button 
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Uitloggen"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
        
        {/* Month Navigator */}
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
        
        {/* Navigation Tabs */}
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
            {monthLabel} ({currentMonthExpenses.length})
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
             <ReceiptScanner onAddExpense={addExpense} categories={categoryList} />
             <BudgetOverview 
                expenses={currentMonthExpenses} 
                budgets={budgets} 
                income={income}
                currentMonth={selectedMonth}
             />
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
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(expense => (
                <div key={expense.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                  <div className="flex gap-4">
                     {expense.receiptImage && (
                       <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
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
                  <div className="flex flex-col items-end justify-between h-full">
                    <span className="font-bold text-gray-800">{formatCurrency(expense.amount)}</span>
                    <button 
                      onClick={() => removeExpense(expense.id)}
                      className="text-gray-400 hover:text-danger mt-4 p-1"
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

      {/* Settings Modal */}
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

      {/* Admin Dashboard */}
      {showAdmin && role === 'master_admin' && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
};

// Root App Component containing Provider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Separate component to use the hook
const AppContent = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 text-primary rounded-full border-4 border-t-transparent border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return <Dashboard />;
};