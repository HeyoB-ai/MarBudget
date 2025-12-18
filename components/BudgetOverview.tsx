import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '../types';
import { formatCurrency } from '../constants';
import { AlertCircle } from 'lucide-react';

interface BudgetOverviewProps {
  expenses: Expense[];
  budgets: Record<string, number>;
  income: number;
  currentMonth: Date;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ expenses, budgets, income, currentMonth }) => {
  
  // Helper: Forceer alles naar een Javascript nummer, ook als het "12.50" (string) is.
  const safeNum = (val: any) => {
    if (val === null || val === undefined) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const calculateStats = (category: string) => {
    const limit = safeNum(budgets[category]);
    
    // Filter op categorie (hoofdletterongevoelig)
    const categoryExpenses = expenses.filter(e => 
      e.category.trim().toLowerCase() === category.trim().toLowerCase()
    );

    // Tel alles bij elkaar op
    const spent = categoryExpenses.reduce((sum, e) => sum + safeNum(e.amount), 0);
      
    const remaining = limit - spent;
    // Voorkom delen door nul
    const percentage = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);
    
    return { limit, spent, remaining, percentage };
  };

  // Bereken totalen voor de bovenste kaart
  const totalBudgeted = (Object.values(budgets) as number[]).reduce((a, b) => a + safeNum(b), 0);
  // Als er geen inkomen is ingevuld, gebruiken we het totaal van de budgetten als limiet
  const effectiveTotalLimit = income > 0 ? income : totalBudgeted;
  
  const totalSpent = expenses.reduce((a, b) => a + safeNum(b.amount), 0);
  const totalRemaining = effectiveTotalLimit - totalSpent;
  
  const categoriesList = Object.keys(budgets);
  const monthName = currentMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  // Data voor de cirkelgrafiek (alleen categorieën met uitgaven)
  const chartData = categoriesList.map(cat => {
    const { spent } = calculateStats(cat);
    return { name: cat, value: spent };
  }).filter(d => d.value > 0);

  const COLORS = ['#0e7490', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-6">
      
      {/* Totaal Kaart */}
      <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl"></div>

        <h3 className="text-cyan-100 font-medium mb-1 uppercase tracking-wider text-xs relative z-10">
          Resterend {monthName}
        </h3>
        
        <div className="flex justify-between items-end relative z-10">
          <div>
             <span className="text-3xl font-bold block tracking-tight">{formatCurrency(totalRemaining)}</span>
             <span className="text-cyan-200 text-sm font-medium">
               van {formatCurrency(effectiveTotalLimit)} budget
             </span>
          </div>
          <div className="text-right">
             <span className="block text-2xl font-semibold opacity-90">{formatCurrency(totalSpent)}</span>
             <span className="text-cyan-200 text-sm">uitgegeven</span>
          </div>
        </div>
        
        {/* Progress Bar Totaal */}
        <div className="mt-5 bg-black/20 rounded-full h-2.5 overflow-hidden relative z-10">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${totalSpent > effectiveTotalLimit ? 'bg-red-400' : 'bg-white/90'}`}
            style={{ width: `${Math.min((totalSpent / effectiveTotalLimit) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* Grafiek alleen tonen als er uitgaven zijn */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="font-bold text-gray-800 text-lg w-full mb-4">Uitgaven Verdeling</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Lijst met categorieën */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
             <h3 className="font-bold text-gray-800 text-lg">Per Categorie</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoriesList.map((cat) => {
              const { limit, spent, remaining, percentage } = calculateStats(cat);
              const isOverBudget = remaining < 0;
              
              let barColor = 'bg-primary';
              if (percentage > 85) barColor = 'bg-accent';
              if (isOverBudget) barColor = 'bg-danger';

              return (
                <div key={cat} className={`bg-white p-5 rounded-xl shadow-sm border ${isOverBudget ? 'border-red-100 ring-1 ring-red-50' : 'border-gray-100'} flex flex-col justify-between`}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-gray-800 truncate pr-2 text-lg" title={cat}>{cat}</h4>
                    {isOverBudget && <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />}
                  </div>
                  
                  <div className="mb-4">
                    <span className={`text-2xl font-bold block ${isOverBudget ? 'text-danger' : 'text-gray-700'}`}>
                      {formatCurrency(remaining)}
                    </span>
                    <span className={`text-xs uppercase font-semibold tracking-wide ${isOverBudget ? 'text-red-400' : 'text-gray-400'}`}>
                      {isOverBudget ? 'Tekort' : 'Over'}
                    </span>
                  </div>
                  
                  <div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
                      <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>{formatCurrency(spent)}</span>
                      <span>van {formatCurrency(limit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};