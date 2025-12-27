
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
  const safeNum = (val: any) => isNaN(parseFloat(val)) ? 0 : parseFloat(val);

  const calculateStats = (category: string) => {
    const limit = safeNum(budgets[category]);
    const spent = expenses.filter(e => e.category.trim().toLowerCase() === category.trim().toLowerCase())
                          .reduce((sum, e) => sum + safeNum(e.amount), 0);
    return { limit, spent, remaining: limit - spent, percentage: limit > 0 ? (spent / limit) * 100 : 0 };
  };

  const totalSpent = expenses.reduce((a, b) => a + safeNum(b.amount), 0);
  const totalLimit = income > 0 ? income : Object.values(budgets).reduce((a, b) => a + safeNum(b), 0);
  const totalRemaining = totalLimit - totalSpent;
  const categoriesList = Object.keys(budgets);

  const chartData = categoriesList.map(cat => ({ 
    name: cat, 
    value: calculateStats(cat).spent 
  })).filter(d => d.value > 0);

  // Kleuren uit het Numera palet: Teal, Navy, Cyan, Amber, etc.
  const COLORS = ['#14b8a6', '#2d3748', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899', '#ef4444', '#64748b', '#10b981', '#f97316'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100 outline-none animate-fade-in">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{payload[0].name}</p>
          <p className="text-sm font-black text-gray-800">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hoofdkaart met totaal overzicht */}
      <div className="bg-secondary rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <h3 className="text-primary font-black mb-1 uppercase tracking-widest text-[10px] relative z-10">Resterend Budget</h3>
        <div className="flex justify-between items-end relative z-10 mt-2">
          <div>
             <span className="text-4xl font-black block tracking-tighter">{formatCurrency(totalRemaining)}</span>
             <span className="text-cyan-200/50 text-[10px] font-bold uppercase tracking-widest mt-1 block">van {formatCurrency(totalLimit)} beschikbaar</span>
          </div>
          <div className="text-right">
             <span className="block text-xl font-bold opacity-90">{formatCurrency(totalSpent)}</span>
             <span className="text-cyan-200/50 text-[10px] font-bold uppercase tracking-widest">totaal uitgegeven</span>
          </div>
        </div>
        <div className="mt-8 bg-black/20 rounded-full h-3 overflow-hidden relative z-10 p-0.5 border border-white/5">
          <div className={`h-full rounded-full transition-all duration-1000 ${totalSpent > totalLimit ? 'bg-red-400' : 'bg-primary'}`} style={{ width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Uitgaven Verdeling (Donut Chart) */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 animate-fade-in">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Uitgaven Verdeling</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center text for the donut */}
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Totaal</span>
              <span className="text-xl font-black text-gray-800">{formatCurrency(totalSpent)}</span>
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid van categoriekaarten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categoriesList.map((cat) => {
          const { limit, spent, remaining, percentage } = calculateStats(cat);
          const isOver = remaining < 0;
          return (
            <div key={cat} onClick={() => onCategoryClick?.(cat)} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 group cursor-pointer active:scale-95 hover:border-primary/20 transition-all ${isOver ? 'border-red-50 bg-red-50/10' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-gray-800 truncate pr-2" title={cat}>{cat}</h4>
                {isOver ? <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" /> : <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary" />}
              </div>
              <div className="mb-5">
                <span className={`text-2xl font-black block tracking-tight ${isOver ? 'text-red-500' : 'text-gray-800'}`}>{formatCurrency(remaining)}</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">{isOver ? 'Tekort' : 'Over'}</span>
              </div>
              <div className="w-full bg-gray-50 rounded-full h-1.5 mb-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-red-500' : percentage > 85 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>{formatCurrency(spent)}</span>
                <span>Budget {formatCurrency(limit)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
