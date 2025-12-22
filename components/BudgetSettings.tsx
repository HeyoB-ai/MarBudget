import React, { useState } from 'react';
import { formatCurrency } from '../constants';
import { Save, Plus, AlertTriangle, Trash2, Sheet, UploadCloud, Copy, Check, ChevronDown, ChevronUp, X, ExternalLink, FileSpreadsheet, Info, MousePointer2, AlertCircle, HelpCircle } from 'lucide-react';
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
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  
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
      alert('Verbinding geslaagd! De data is zichtbaar in je sheet.');
    } else {
      setShowTroubleshooting(true);
    }
  };

  const scriptCode = `// --- MARBUDGET GOOGLE SHEETS SCRIPT ---

/**
 * 1. TEST FUNCTIE
 * Klik op de 'Run' knop bovenin om te kijken of je sheet werkt.
 * Er wordt dan een test-regel toegevoegd aan je Google Sheet.
 */
function testVerbinding() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  sheet.appendRow([new Date(), "TEST (HANDMATIG)", "Test", 0, "2024-01-01", "Nee"]);
  Logger.log("Succes! Er is een test-regel toegevoegd aan je spreadsheet.");
}

/**
 * 2. HOOFDFUNCTIE (doPost)
 * Deze functie wordt aangeroepen door de MarBudget app.
 */
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  
  if (!e || !e.postData) {
    return ContentService.createTextOutput("Fout: Geen data ontvangen.").setMimeType(ContentService.MimeType.TEXT);
  }

  var data = JSON.parse(e.postData.contents);
  var items = Array.isArray(data) ? data : [data];
  
  items.forEach(function(item) {
    sheet.appendRow([
      new Date(), 
      item.description || "Onbekend", 
      item.category || "Overig", 
      item.amount || 0, 
      item.date || "", 
      item.receiptImage ? "Ja" : "Nee"
    ]);
  });
  
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
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
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">MarBudget Configuratie</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 transition-colors">
            <X size={24} />
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

          {/* Google Sheets Sectie */}
          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-blue-700">
                <Sheet className="w-5 h-5 mr-3" />
                <label className="text-[10px] font-black uppercase tracking-[0.2em]">Google Sheet Koppeling</label>
              </div>
              <button 
                onClick={() => setShowGuide(!showGuide)}
                className="text-[9px] font-black uppercase text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors flex items-center"
              >
                {showGuide ? <ChevronUp size={12} className="mr-1" /> : <ChevronDown size={12} className="mr-1" />}
                {showGuide ? 'Sluit hulp' : 'Stappenplan'}
              </button>
            </div>

            {showGuide && (
              <div className="bg-white border border-blue-100 p-5 rounded-2xl animate-fade-in space-y-5 shadow-sm">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-gray-800 mb-2 leading-tight">Code Kopiëren & Plakken</p>
                      <button 
                        onClick={copyScript}
                        className="w-full py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black text-gray-500 uppercase flex items-center justify-center hover:bg-white hover:border-blue-300 transition-all"
                      >
                        {scriptCopied ? <Check size={14} className="text-green-500 mr-2" /> : <Copy size={14} className="mr-2" />}
                        {scriptCopied ? 'Gekopieerd!' : 'Kopieer Script Code'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-gray-800 mb-2 leading-tight">De Juiste URL vinden</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Klik in Google op <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">Deploy</span> &rarr; "New Deployment" &rarr; Kies <strong>Web App</strong>.
                      </p>
                      <div className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100 text-[10px] font-bold text-amber-800">
                        <AlertCircle size={14} className="mb-1" />
                        Cruciaal: Zet "Who has access" op <strong>Anyone</strong> (Iedereen). Zonder dit krijgt de app geen toegang.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Plak hier de Web App URL (/exec)"
                  value={localSheetUrl}
                  onChange={(e) => setLocalSheetUrl(e.target.value)}
                  className="w-full p-4 bg-white border border-blue-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-[11px] font-mono text-gray-600 shadow-sm transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleSyncAll}
                  disabled={isSyncing || !localSheetUrl}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSyncing ? 'Testen...' : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      Test Verbinding
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  className="bg-white border border-blue-200 p-4 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all"
                  title="Hulp bij fouten"
                >
                  <HelpCircle size={20} />
                </button>
              </div>

              {showTroubleshooting && (
                <div className="bg-red-50 border border-red-100 p-5 rounded-[1.5rem] space-y-3 animate-fade-in">
                  <h4 className="text-[10px] font-black text-red-800 uppercase tracking-widest">Verbinding mislukt? Check dit:</h4>
                  <ul className="text-[10px] text-red-700 font-bold space-y-2">
                    <li className="flex gap-2">
                      <span className="text-red-300">•</span>
                      <span>De URL moet eindigen op <strong>/exec</strong> (niet op /edit).</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-300">•</span>
                      <span>Heb je op "Nieuwe Implementatie" geklikt na het plakken van de code?</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-300">•</span>
                      <span>Staat "Toegang" echt op <strong>Iedereen</strong> (Anyone)?</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-300">•</span>
                      <span>Ververs de pagina in Google en probeer een nieuwe Deploy.</span>
                    </li>
                  </ul>
                </div>
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