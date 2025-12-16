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
  
  const calculateStats = (category: string) => {
    const limit = budgets[category] || 0;
    
    // We normaliseren de strings (trim en toLowerCase) om zeker te weten dat ze matchen
    // We forceren amount naar Number() om rekenfouten met strings te voorkomen
    const spent = expenses
      .filter(e => e.category.trim().toLowerCase() === category.trim().toLowerCase())
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    
    return { limit, spent, remaining, percentage };
  };

  const totalBudgeted = (Object.values(budgets) as number[]).reduce((a, b) => a + b, 0);
  
  // LOGIC CHANGE: 
  // Als income > 0 is, gebruiken we dat als het "Totaal".
  // Zo niet, vallen we terug op de som van de categorieën (totalBudgeted).
  const effectiveTotalLimit = income > 0 ? income : totalBudgeted;

  // Gebruik ook hier Number() casting voor veiligheid
  const totalSpent = expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  
  // Resterend van je totale pot (inkomsten)
  const totalRemaining = effectiveTotalLimit - totalSpent;
  
  const categoriesList = Object.keys(budgets);

  // Format month name for display
  const monthName = currentMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  // Data for Pie Chart
  const chartData = categoriesList.map(cat => {
    const { spent } = calculateStats(cat);
    return { name: cat, value: spent };
  }).filter(d => d.value > 0);

  const COLORS = ['#0e7490', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-6">
      
      {/* Total Card */}
      <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white shadow-lg">
        <h3 className="text-cyan-100 font-medium mb-1 uppercase tracking-wider text-xs">Totaal {monthName}</h3>
        <div className="flex justify-between items-end">
          <div>
             <span className="text-3xl font-bold block">{formatCurrency(totalRemaining)}</span>
             <span className="text-cyan-200 text-sm">
               beschikbaar van {formatCurrency(effectiveTotalLimit)}
             </span>
             {income > 0 && income !== totalBudgeted && (
                <span className="block text-xs text-cyan-300/80 mt-1">
                  (Gebudgetteerd: {formatCurrency(totalBudgeted)})
                </span>
             )}
          </div>
          <div className="text-right">
             <span className="block text-2xl font-semibold opacity-90">{formatCurrency(totalSpent)}</span>
             <span className="text-cyan-200 text-sm">uitgegeven</span>
          </div>
        </div>
        
        {/* Simple visual bar for total */}
        <div className="mt-4 bg-black/20 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-white/90 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((totalSpent / effectiveTotalLimit) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* Chart Section */}
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
            <div className="flex flex-wrap gap-2 justify-center mt-4">
               {chartData.map((entry, index) => (
                 <div key={entry.name} className="flex items-center text-xs text-gray-500">
                   <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                   {entry.name}
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Category Tiles Grid */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 text-lg">Per Categorie</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoriesList.map((cat) => {
              const { limit, spent, remaining, percentage } = calculateStats(cat);
              
              // We render the tile if it exists in budgets, even if limit is 0
              
              const isOverBudget = remaining < 0;
              let barColor = 'bg-primary';
              if (percentage > 85) barColor = 'bg-accent';
              if (isOverBudget) barColor = 'bg-danger';

              return (
                <div key={cat} className={`bg-white p-5 rounded-xl shadow-sm border ${isOverBudget ? 'border-red-100 ring-1 ring-red-50' : 'border-gray-100'} flex flex-col justify-between transition-shadow hover:shadow-md`}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-gray-800 truncate pr-2 text-lg" title={cat}>{cat}</h4>
                    {isOverBudget && (
                      <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <span className={`text-2xl font-bold block ${isOverBudget ? 'text-danger' : 'text-gray-700'}`}>
                      {formatCurrency(remaining)}
                    </span>
                    <span className={`text-xs uppercase font-semibold tracking-wide ${isOverBudget ? 'text-red-400' : 'text-gray-400'}`}>
                      {isOverBudget ? 'Tekort (Over budget)' : 'Over'}
                    </span>
                  </div>
                  
                  <div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full ${barColor} transition-all duration-500`} 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
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