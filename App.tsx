import React, { useState, useEffect } from 'react';
import { ReceiptScanner } from './components/ReceiptScanner';
import { BudgetOverview } from './components/BudgetOverview';
import { BudgetSettings } from './components/BudgetSettings';
import { Expense } from './types';
import { INITIAL_BUDGETS, formatCurrency } from './constants';
import { Wallet, Settings, List, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>(INITIAL_BUDGETS);
  const [income, setIncome] = useState<number>(2500); // Default income assumption
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Load from local storage on mount
  useEffect(() => {
    const savedExpenses = localStorage.getItem('marbudget_expenses');
    const savedBudgets = localStorage.getItem('marbudget_budgets');
    const savedIncome = localStorage.getItem('marbudget_income');
    
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedIncome) setIncome(parseFloat(savedIncome));
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('marbudget_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('marbudget_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('marbudget_income', income.toString());
  }, [income]);

  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
    
    // Check if the expense date is in a different month than currently selected
    const expenseDate = new Date(expense.date);
    const currentMonthStr = `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`;
    const expenseMonthStr = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`;

    if (currentMonthStr !== expenseMonthStr) {
      // Automatically switch to the month of the receipt so the user sees the result
      setSelectedMonth(expenseDate);
      // Optional: alert user
      // alert(`De weergave is verplaatst naar ${expenseDate.toLocaleDateString('nl-NL', { month: 'long' })} omdat de bon daar bij hoort.`);
    }
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateSettings = (newBudgets: Record<string, number>, newIncome: number) => {
    setBudgets(newBudgets);
    setIncome(newIncome);
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

  const categoryList = Object.keys(budgets);
  const monthLabel = selectedMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-primary text-white p-2 rounded-lg">
               <Wallet size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-secondary">MarBudget</h1>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            title="Instellingen"
          >
            <Settings size={24} />
          </button>
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
          onSave={handleUpdateSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
}