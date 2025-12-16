import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../constants';
import { Save, Plus, AlertTriangle, Trash2, Sheet, UploadCloud } from 'lucide-react';
import { Expense } from '../types';
import { postToGoogleSheet } from '../services/sheetService';

interface BudgetSettingsProps {
  budgets: Record<string, number>;
  income: number;
  sheetUrl: string;
  allExpenses: Expense[];
  onSave: (newBudgets: Record<string, number>, newIncome: number, newSheetUrl: string) => void;
  onClose: () => void;
}

export const BudgetSettings: React.FC<BudgetSettingsProps> = ({ budgets, income, sheetUrl, allExpenses, onSave, onClose }) => {
  // We gebruiken strings voor lokale state zodat inputs makkelijk leeggemaakt kunnen worden
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>({ ...budgets });
  
  // Als income 0 is, maken we het veld leeg voor betere UX, anders string waarde
  const [localIncomeStr, setLocalIncomeStr] = useState<string>(income > 0 ? income.toString() : '');
  const [localSheetUrl, setLocalSheetUrl] = useState<string>(sheetUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // New category state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');

  // Handle changes for existing budget categories
  const handleBudgetChange = (category: string, value: string) => {
    // Sta toe dat gebruiker typt, converteer pas naar nummer bij opslaan in state object
    // We vervangen komma door punt voor parsing
    const normalized = value.replace(',', '.');
    const numberVal = parseFloat(normalized);
    
    setLocalBudgets(prev => ({
      ...prev,
      [category]: isNaN(numberVal) ? 0 : numberVal
    }));
  };

  const handleAddCategory = () => {
    if (newCategoryName && newCategoryAmount) {
      const normalizedAmount = newCategoryAmount.replace(',', '.');
      const amount = parseFloat(normalizedAmount) || 0;

      setLocalBudgets(prev => ({
        ...prev,
        [newCategoryName]: amount
      }));
      setNewCategoryName('');
      setNewCategoryAmount('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setLocalBudgets(prev => {
      const newState = { ...prev };
      delete newState[category];
      return newState;
    });
  };

  const handleSave = () => {
    // Parse income string to float
    const finalIncome = parseFloat(localIncomeStr.replace(',', '.')) || 0;
    onSave(localBudgets, finalIncome, localSheetUrl);
    onClose();
  };

  const handleSyncAll = async () => {
    if (!localSheetUrl) return;
    setIsSyncing(true);
    await postToGoogleSheet(localSheetUrl, allExpenses);
    setIsSyncing(false);
    alert('Alle uitgaven zijn naar de Sheet verstuurd!');
  };

  const totalBudget = (Object.values(localBudgets) as number[]).reduce((a, b) => a + b, 0);
  // Bereken huidige income nummer voor validatie
  const currentIncomeNum = parseFloat(localIncomeStr.replace(',', '.')) || 0;
  const isOverBudget = totalBudget > currentIncomeNum;
  const categories = Object.keys(localBudgets);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Instellingen</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Sluiten</button>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-6 flex-1">
          
          {/* Income Section */}
          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
            <label className="text-sm font-bold text-cyan-900 block mb-1">Maandelijkse Inkomsten</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={localIncomeStr}
                onChange={(e) => {
                  // Alleen cijfers, komma en punt toestaan
                  if (/^[\d,.]*$/.test(e.target.value)) {
                    setLocalIncomeStr(e.target.value);
                  }
                }}
                className="w-full pl-7 pr-3 py-2 border border-cyan-200 rounded-md focus:ring-primary focus:border-primary font-semibold text-gray-800"
              />
            </div>
          </div>

          {/* Google Sheets Integration */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <div className="flex items-center mb-2 text-green-800">
              <Sheet className="w-4 h-4 mr-2" />
              <label className="text-sm font-bold block">Google Sheets Koppeling</label>
            </div>
            <p className="text-xs text-green-700 mb-2">Plak hier de Web App URL van je Google Apps Script.</p>
            <input
              type="text"
              placeholder="https://script.google.com/..."
              value={localSheetUrl}
              onChange={(e) => setLocalSheetUrl(e.target.value)}
              className="w-full p-2 border border-green-200 rounded-md focus:ring-green-500 focus:border-green-500 text-xs mb-3"
            />
            {localSheetUrl && (
              <button 
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-3 rounded flex items-center justify-center transition-colors"
              >
                {isSyncing ? 'Bezig met versturen...' : (
                  <>
                    <UploadCloud className="w-3 h-3 mr-2" />
                    Sync alle huidige data nu
                  </>
                )}
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Budget per categorie</h3>
            <p className="text-xs text-gray-400 mb-2">Zet een budget op €0,00 om de categorie te kunnen verwijderen.</p>
            <div className="space-y-3">
              {categories.map(category => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3">
                  <label className="text-sm font-medium text-gray-700 flex-1 break-words">{category}</label>
                  
                  <div className="relative w-32 flex-shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    <input
                      type="number"
                      value={localBudgets[category]}
                      onFocus={(e) => e.target.select()} // Selecteer alles bij klik
                      onChange={(e) => handleBudgetChange(category, e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-right"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleRemoveCategory(category)}
                    disabled={localBudgets[category] > 0}
                    className={`p-2 rounded-md transition-colors ${localBudgets[category] > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                    title={localBudgets[category] > 0 ? "Zet budget op 0 om te verwijderen" : "Verwijder categorie"}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Category Section */}
          <div className="border-t border-gray-100 pt-4">
             <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Nieuwe categorie toevoegen</h3>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Naam" 
                 value={newCategoryName}
                 onChange={(e) => setNewCategoryName(e.target.value)}
                 className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
               />
               <input 
                 type="text" 
                 inputMode="decimal"
                 placeholder="Bedrag" 
                 value={newCategoryAmount}
                 onChange={(e) => {
                   if (/^[\d,.]*$/.test(e.target.value)) setNewCategoryAmount(e.target.value);
                 }}
                 className="w-24 p-2 border border-gray-300 rounded-md text-sm"
               />
               <button 
                onClick={handleAddCategory}
                disabled={!newCategoryName || !newCategoryAmount}
                className="bg-gray-800 text-white p-2 rounded-md hover:bg-black disabled:opacity-50"
               >
                 <Plus size={20} />
               </button>
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
          
          {/* Validation Feedback */}
          <div className={`p-3 rounded-lg flex items-center justify-between ${isOverBudget ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            <div className="flex items-center">
              {isOverBudget && <AlertTriangle className="w-5 h-5 mr-2" />}
              <span className="text-sm font-medium">Totaal Budget:</span>
            </div>
            <span className="font-bold">{formatCurrency(totalBudget)}</span>
          </div>

          {isOverBudget && (
            <p className="text-xs text-red-600 text-center">
              Let op: Je budget is {formatCurrency(totalBudget - currentIncomeNum)} hoger dan je inkomsten!
            </p>
          )}

          <button 
            onClick={handleSave}
            className={`w-full font-medium py-3 rounded-lg flex items-center justify-center transition-colors ${
              isOverBudget 
                ? 'bg-gray-800 hover:bg-black text-white' // Allow save even if over budget, user choice
                : 'bg-primary hover:bg-secondary text-white'
            }`}
          >
            <Save className="w-5 h-5 mr-2" />
            {isOverBudget ? 'Toch Opslaan' : 'Opslaan & Sluiten'}
          </button>
        </div>
      </div>
    </div>
  );
};