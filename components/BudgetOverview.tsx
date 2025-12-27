
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '../types';
import { formatCurrency } from '../constants';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface BudgetOverviewProps {
  expenses: Expense[];
  budgets: Record<string, number>;
  income: number;
  currentMonth: Date;
  onCategoryClick?: (category: string) => void;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ expenses, budgets, income, currentMonth, onCategoryClick }) => {
  
  const safeNum = (val: any) => {
    if (val === null || val === undefined) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const calculateStats = (category: string) => {
    const limit = safeNum(budgets[category]);
    
    const categoryExpenses = expenses.filter(e => 
      e.category.trim().toLowerCase() === category.trim().toLowerCase()
    );

    const spent = categoryExpenses.reduce((sum, e) => sum + safeNum(e.amount), 0);
      
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);
    
    return { limit, spent, remaining, percentage };
  };

  const totalBudgeted = (Object.values(budgets) as number[]).reduce((a, b) => a + safeNum(b), 0);
  const effectiveTotalLimit = income > 0 ? income : totalBudgeted;
  
  const totalSpent = expenses.reduce((a, b) => a + safeNum(b.amount), 0);
  const totalRemaining = effectiveTotalLimit - totalSpent;
  
  const categoriesList = Object.keys(budgets);
  const monthName = currentMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  const chartData = categoriesList.map(cat => {
    const { spent } = calculateStats(cat);
    return { name: cat, value: spent };
  }).filter(d => d.value > 0);

  const COLORS = ['#0e7490', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-6">
      
      {/* Totaal Kaart */}
      <div className="bg-gradient-to-br from-primary to-secondary rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl"></div>

        <h3 className="text-cyan-100 font-black mb-1 uppercase tracking-widest text-[10px] relative z-10">
          Resterend {monthName}
        </h3>
        
        <div className="flex justify-between items-end relative z-10 mt-2">
          <div>
             <span className="text-4xl font-black block tracking-tighter">{formatCurrency(totalRemaining)}</span>
             <span className="text-cyan-200 text-[10px] font-bold uppercase tracking-widest mt-1 block">
               van {formatCurrency(effectiveTotalLimit)} budget
             </span>
          </div>
          <div className="text-right">
             <span className="block text-xl font-bold opacity-90">{formatCurrency(totalSpent)}</span>
             <span className="text-cyan-200 text-[10px] font-bold uppercase tracking-widest">totaal op {expenses.length} bonnen</span>
          </div>
        </div>
        
        <div className="mt-8 bg-black/20 rounded-full h-3 overflow-hidden relative z-10 p-0.5 border border-white/10">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-inner ${totalSpent > effectiveTotalLimit ? 'bg-red-400' : 'bg-white'}`}
            style={{ width: `${Math.min((totalSpent / effectiveTotalLimit) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {chartData.length > 0 && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col items-center">
            <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] w-full mb-4">Uitgaven Verdeling</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value: number) => formatCurrency(value)} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">Budget per Categorie</h3>
             <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">Tik voor details</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoriesList.map((cat) => {
              const { limit, spent, remaining, percentage } = calculateStats(cat);
              const isOverBudget = remaining < 0;
              
              let barColor = 'bg-primary';
              if (percentage > 85) barColor = 'bg-accent';
              if (isOverBudget) barColor = 'bg-danger';

              return (
                <div 
                  key={cat} 
                  onClick={() => onCategoryClick?.(cat)}
                  className={`bg-white p-6 rounded-[2rem] shadow-sm border group cursor-pointer active:scale-95 hover:shadow-md hover:border-primary/20 transition-all flex flex-col justify-between ${isOverBudget ? 'border-red-100' : 'border-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-gray-800 truncate pr-2 group-hover:text-primary transition-colors" title={cat}>{cat}</h4>
                    {isOverBudget ? (
                      <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 animate-pulse" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  
                  <div className="mb-5">
                    <span className={`text-2xl font-black block tracking-tight ${isOverBudget ? 'text-danger' : 'text-gray-800'}`}>
                      {formatCurrency(remaining)}
                    </span>
                    <span className={`text-[10px] uppercase font-black tracking-[0.2em] ${isOverBudget ? 'text-red-400' : 'text-gray-400'}`}>
                      {isOverBudget ? 'Tekort' : 'Resterend'}
                    </span>
                  </div>
                  
                  <div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>{formatCurrency(spent)}</span>
                      <span>Budget {formatCurrency(limit)}</span>
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
