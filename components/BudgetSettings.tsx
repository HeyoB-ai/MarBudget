
import React, { useState } from 'react';
import { formatCurrency } from '../constants';
// Added FileSpreadsheet to the imports from lucide-react
import { Save, Plus, AlertTriangle, Trash2, Sheet, UploadCloud, BookOpen, Copy, Check, ChevronDown, ChevronUp, X, ExternalLink, FileSpreadsheet } from 'lucide-react';
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
  const [localBudgets, setLocalBudgets] = useState<Record<string, string>>(() => {
    const formatted: Record<string, string> = {};
    Object.entries(budgets).forEach(([key, value]) => {
      formatted[key] = value.toString().replace('.', ',');
    });
    return formatted;
  });
  
  const [localIncomeStr, setLocalIncomeStr] = useState<string>(
    income > 0 ? income.toString().replace('.', ',') : ''
  );
  
  const [localSheetUrl, setLocalSheetUrl] = useState<string>(sheetUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');

  const isValidNumberInput = (val: string) => /^[\d,.]*$/.test(val);

  const parseValue = (val: string) => {
    if (!val) return 0;
    let clean = val.toString();
    clean = clean.replace(/\./g, '');
    clean = clean.replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const handleBudgetChange = (category: string, value: string) => {
    if (isValidNumberInput(value)) {
      setLocalBudgets(prev => ({
        ...prev,
        [category]: value
      }));
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const amountStr = newCategoryAmount === '' ? '0' : newCategoryAmount;
      setLocalBudgets(prev => ({
        ...prev,
        [newCategoryName.trim()]: amountStr
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
    let finalBudgetsMap = { ...localBudgets };
    if (newCategoryName.trim()) {
       const amountStr = newCategoryAmount === '' ? '0' : newCategoryAmount;
       finalBudgetsMap[newCategoryName.trim()] = amountStr;
    }

    const finalIncome = parseValue(localIncomeStr);

    const finalBudgets: Record<string, number> = {};
    Object.entries(finalBudgetsMap).forEach(([key, value]) => {
      const cleanKey = key.trim();
      if (cleanKey) {
        finalBudgets[cleanKey] = parseValue(value);
      }
    });

    onSave(finalBudgets, finalIncome, localSheetUrl);
    onClose();
  };

  const handleSyncAll = async () => {
    if (!localSheetUrl) return;
    setIsSyncing(true);
    const success = await postToGoogleSheet(localSheetUrl, allExpenses);
    setIsSyncing(false);
    if (success) {
      alert('Alle uitgaven zijn naar de Budgetcoach verzonden!');
    } else {
      alert('Fout bij verzenden. Controleer of de URL eindigt op /exec');
    }
  };

  const googleScriptCode = `/** 
 * MARBUDGET CONNECTOR
 */
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data = JSON.parse(e.postData.contents);
  var items = Array.isArray(data) ? data : [data];
  items.forEach(function(item) {
    sheet.appendRow([new Date(), item.description, item.category, item.amount, item.date, item.receiptImage ? "Ja" : "Nee"]);
  });
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}`;

  const copyScriptCode = () => {
    navigator.clipboard.writeText(googleScriptCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const totalBudget = Object.values(localBudgets).reduce((sum, val) => sum + parseValue(val), 0);
  const currentIncomeNum = parseValue(localIncomeStr);
  const isOverBudget = totalBudget > currentIncomeNum;
  
  const categories = Object.keys(localBudgets).sort();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-fade-in">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Instellingen</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Personaliseer MarBudget</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 transition-colors">
            <X size={24} className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-8 space-y-10 flex-1">
          
          <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-2 ml-1">Maandinkomen</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">€</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={localIncomeStr}
                onChange={(e) => {
                  if (isValidNumberInput(e.target.value)) setLocalIncomeStr(e.target.value);
                }}
                className="w-full pl-9 pr-4 py-4 bg-white border border-primary/20 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none font-black text-gray-800 transition-all"
              />
            </div>
          </div>

          {/* Coach Link */}
          <div className="bg-green-50/50 p-8 rounded-[2rem] border border-green-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-green-700">
                <Sheet className="w-5 h-5 mr-3" />
                <label className="text-[10px] font-black uppercase tracking-[0.2em]">Externe Export (Optioneel)</label>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
                Wil je uitgaven automatisch exporteren naar Google Sheets? Gebruik onze master template of koppel je eigen script.
              </p>
              
              <a 
                href="https://docs.google.com/spreadsheets/d/1YourTemplateID/copy" 
                target="_blank" 
                className="w-full bg-white border border-green-200 p-4 rounded-2xl flex items-center justify-between group hover:border-green-400 transition-all"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-xs font-bold text-gray-800 tracking-tight">Open Master Template</span>
                </div>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-green-600" />
              </a>

              <div className="relative group">
                <input
                  type="text"
                  placeholder="Plak hier je Google Web App URL (/exec)"
                  value={localSheetUrl}
                  onChange={(e) => setLocalSheetUrl(e.target.value)}
                  className="w-full p-4 bg-white border border-green-200 rounded-2xl focus:ring-4 focus:ring-green-100 outline-none text-[11px] font-mono text-gray-600 shadow-sm transition-all"
                />
              </div>

              {localSheetUrl && localSheetUrl.includes('/exec') && (
                <button 
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSyncing ? 'Bezig met synchroniseren...' : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Test Verbinding
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Budget per categorie</h3>
            <div className="space-y-3">
              {categories.map(category => (
                <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 gap-3 group hover:border-primary/20 transition-all">
                  <label className="text-sm font-bold text-gray-700 flex-1 truncate">{category}</label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={localBudgets[category]}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleBudgetChange(category, e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-right font-black text-gray-800 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveCategory(category)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-100/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nieuwe categorie</h3>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Naam" 
                 value={newCategoryName}
                 onChange={(e) => setNewCategoryName(e.target.value)}
                 className="flex-1 p-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10"
               />
               <input 
                 type="text" 
                 inputMode="decimal"
                 placeholder="€ 0" 
                 value={newCategoryAmount}
                 onChange={(e) => {
                   if (isValidNumberInput(e.target.value)) setNewCategoryAmount(e.target.value);
                 }}
                 className="w-24 p-3.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-right outline-none focus:ring-2 focus:ring-primary/10"
               />
               <button 
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()} 
                className="bg-gray-800 text-white p-3.5 rounded-xl hover:bg-black disabled:opacity-30 transition-all active:scale-90"
               >
                 <Plus size={20} />
               </button>
             </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50/80 space-y-4">
          <div className={`p-5 rounded-2xl flex items-center justify-between shadow-inner ${isOverBudget ? 'bg-red-50 text-red-700' : 'bg-primary/5 text-primary'}`}>
            <div className="flex items-center gap-2">
              {isOverBudget && <AlertTriangle className="w-5 h-5" />}
              <span className="text-[10px] font-black uppercase tracking-widest">Totaal Gepland</span>
            </div>
            <span className="font-black text-lg">{formatCurrency(totalBudget)}</span>
          </div>

          <button 
            onClick={handleSave}
            className={`w-full font-black uppercase tracking-[0.2em] text-xs py-5 rounded-[2rem] flex items-center justify-center transition-all shadow-xl active:scale-95 ${
              isOverBudget 
                ? 'bg-gray-800 hover:bg-black text-white' 
                : 'bg-primary hover:bg-secondary text-white'
            }`}
          >
            <Save className="w-5 h-5 mr-3" />
            Opslaan & Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
