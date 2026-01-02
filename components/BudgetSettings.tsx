
import React, { useState } from 'react';
import { formatCurrency } from '../constants';
import { Save, Plus, AlertTriangle, Trash2, Sheet, Copy, Check, ChevronDown, ChevronUp, X, Loader2, Send } from 'lucide-react';
import { Expense } from '../types';
import { postToGoogleSheet } from '../services/sheetService';

interface BudgetSettingsProps {
  // Add lang property to match usage in App.tsx
  lang: 'nl' | 'es';
  budgets: Record<string, number>;
  income: number;
  sheetUrl: string;
  allExpenses: Expense[];
  onSave: (newBudgets: Record<string, number>, newIncome: number, newSheetUrl: string) => void;
  onClose: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

// Destructure lang from props
export const BudgetSettings: React.FC<BudgetSettingsProps> = ({ lang, budgets, income, sheetUrl, onSave, onClose }) => {
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
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [showGuide, setShowGuide] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');

  const isValidNumberInput = (val: string) => /^[\d,.]*$/.test(val);

  const parseValue = (val: string) => {
    if (!val) return 0;
    let clean = val.toString();
    clean = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const handleBudgetChange = (category: string, value: string) => {
    if (isValidNumberInput(value)) {
      setLocalBudgets(prev => ({ ...prev, [category]: value }));
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const amountStr = newCategoryAmount === '' ? '0' : newCategoryAmount;
      setLocalBudgets(prev => ({ ...prev, [newCategoryName.trim()]: amountStr }));
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
       finalBudgetsMap[newCategoryName.trim()] = newCategoryAmount === '' ? '0' : newCategoryAmount;
    }

    const finalBudgets: Record<string, number> = {};
    Object.entries(finalBudgetsMap).forEach(([key, value]) => {
      finalBudgets[key.trim()] = parseValue(value);
    });

    onSave(finalBudgets, parseValue(localIncomeStr), localSheetUrl);
    onClose();
  };

  const handleSyncAll = async () => {
    if (!localSheetUrl) return;
    setTestStatus('testing');
    
    const success = await postToGoogleSheet(localSheetUrl, {
      id: 'test',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Verbindingstest',
      description: 'Signaal vanuit Numera App (v2.2)',
      user_name: 'Systeem Test',
      remaining_budget: 100
    } as any);

    setTestStatus(success ? 'success' : 'error');
    if (success) setTimeout(() => setTestStatus('idle'), 5000);
  };

  const scriptCode = `// --- NUMERA GOOGLE SHEETS SCRIPT v2.2 ---
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var headers = ["Datum gescand", "Omschrijving", "Categorie", "Bedrag", "Datum gekocht", "Cliënt", "Rest Budget"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f8fafc");
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  if (!e || !e.postData) return ContentService.createTextOutput("Fout").setMimeType(ContentService.MimeType.TEXT);
  var data = JSON.parse(e.postData.contents);
  var items = Array.isArray(data) ? data : [data];
  if (sheet.getLastRow() === 0) setupSheet();
  items.forEach(function(item) {
    sheet.appendRow([new Date(), item.description || "Onbekend", item.category || "Overig", item.amount || 0, item.date || "", item.user_name || "Cliënt", item.remaining_budget || 0]);
  });
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}`;

  const categories = Object.keys(localBudgets).sort();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-[#1a202c]">Numera Instellingen</h2>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 italic">inzicht, overzicht, rust</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-[#1a202c] transition-colors"><X size={24} /></button>
        </div>
        
        <div className="overflow-y-auto p-8 space-y-10 flex-1">
          <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
            <label className="text-[9px] font-black text-primary uppercase tracking-[0.2em] block mb-2 ml-1">Totaal Maandbudget</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">€</span>
              <input type="text" inputMode="decimal" placeholder="0,00" value={localIncomeStr} onChange={(e) => isValidNumberInput(e.target.value) && setLocalIncomeStr(e.target.value)} className="w-full pl-9 pr-4 py-4 bg-white border border-primary/20 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none font-black text-[#1a202c]" />
            </div>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-blue-700">
                <Sheet className="w-5 h-5 mr-3" />
                <label className="text-[9px] font-black uppercase tracking-widest">Google Sheets v2.2</label>
              </div>
              <button onClick={() => setShowGuide(!showGuide)} className="text-[8px] font-black uppercase text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full">
                {showGuide ? 'Sluit hulp' : 'Instructies'}
              </button>
            </div>

            {showGuide && (
              <div className="bg-white border border-blue-100 p-5 rounded-2xl animate-fade-in space-y-4">
                <p className="text-[9px] font-bold text-gray-500 leading-relaxed uppercase">1. Kopieer script &gt; 2. Plak in Google Script &gt; 3. Implementeer als Web App &gt; 4. Plak URL hieronder.</p>
                <button onClick={() => { navigator.clipboard.writeText(scriptCode); setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000); }} className="w-full py-2 bg-gray-50 rounded-xl text-[9px] font-black text-gray-400 uppercase border border-gray-200 flex items-center justify-center">
                  {scriptCopied ? <Check size={14} className="text-green-500 mr-2" /> : 'Kopieer Script v2.2'}
                </button>
              </div>
            )}

            <div className="space-y-3">
              <input type="text" placeholder="Web App URL (/exec)" value={localSheetUrl} onChange={(e) => setLocalSheetUrl(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none text-[10px] font-mono text-gray-500" />
              <button onClick={handleSyncAll} disabled={testStatus === 'testing' || !localSheetUrl} className={`w-full py-4 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest text-white shadow-md ${testStatus === 'success' ? 'bg-green-500' : testStatus === 'error' ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {testStatus === 'testing' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {testStatus === 'testing' ? 'Testen...' : 'Test Koppeling'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Budget per Categorie</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-3 group">
                  <label className="text-sm font-bold text-gray-700 flex-1 truncate">{cat}</label>
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]">€</span>
                    <input type="text" inputMode="decimal" value={localBudgets[cat]} onChange={(e) => handleBudgetChange(cat, e.target.value)} className="w-full pl-6 pr-3 py-2 bg-white border border-gray-200 rounded-xl outline-none text-right font-black text-gray-800 text-sm" />
                  </div>
                  <button onClick={() => handleRemoveCategory(cat)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
             <div className="flex gap-2">
               <input type="text" placeholder="Nieuwe Categorie" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 p-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none" />
               <input type="text" inputMode="decimal" placeholder="€ 0" value={newCategoryAmount} onChange={(e) => isValidNumberInput(e.target.value) && setNewCategoryAmount(e.target.value)} className="w-20 p-3.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-right outline-none" />
               <button onClick={handleAddCategory} disabled={!newCategoryName.trim()} className="bg-[#1a202c] text-white p-3.5 rounded-xl disabled:opacity-30 transition-all active:scale-95"><Plus size={20} /></button>
             </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-50 bg-gray-50/50">
          <button onClick={handleSave} className="w-full bg-[#1a202c] text-white font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-[2rem] flex items-center justify-center hover:bg-black transition-all shadow-xl active:scale-95">
            <Save className="w-4 h-4 mr-3 text-primary" />
            Configuratie Opslaan
          </button>
        </div>
      </div>
    </div>
  );
};
