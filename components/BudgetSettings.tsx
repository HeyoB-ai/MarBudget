import React, { useState } from 'react';
import { formatCurrency } from '../constants';
import { Save, Plus, AlertTriangle, Trash2, Sheet, UploadCloud, Copy, Check, ChevronDown, ChevronUp, X, ExternalLink, FileSpreadsheet, Info, MousePointer2, AlertCircle, HelpCircle, Loader2, Send } from 'lucide-react';
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

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

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
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
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
    setTestStatus('testing');
    setShowTroubleshooting(false);
    
    // Test signal with enriched data
    const success = await postToGoogleSheet(localSheetUrl, {
      id: 'test',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Verbindingstest',
      description: 'Signaal vanuit MarBudget App',
      user_name: 'Systeem Test',
      remaining_budget: 100
    } as any);

    if (success) {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 5000);
    } else {
      setTestStatus('error');
      setShowTroubleshooting(true);
    }
  };

  const scriptCode = `// --- MARBUDGET GOOGLE SHEETS SCRIPT v2 ---

function testVerbinding() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  // Voeg kopteksten toe als de sheet leeg is
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Scan Datum", "Winkel/Omschr", "Categorie", "Bedrag (€)", "Bon Datum", "Gebruiker", "Budget Resterend (€)"]);
  }
  sheet.appendRow([new Date(), "TEST HANDMATIG", "Test", 0, "2024-01-01", "Systeem", 0]);
  Logger.log("Test-regel toegevoegd!");
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  
  if (!e || !e.postData) {
    return ContentService.createTextOutput("Fout: Geen data").setMimeType(ContentService.MimeType.TEXT);
  }

  var data = JSON.parse(e.postData.contents);
  var items = Array.isArray(data) ? data : [data];
  
  // Headers toevoegen indien leeg
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Scan Datum", "Winkel/Omschr", "Categorie", "Bedrag (€)", "Bon Datum", "Gebruiker", "Budget Resterend (€)"]);
  }

  items.forEach(function(item) {
    sheet.appendRow([
      new Date(), 
      item.description || "Onbekend", 
      item.category || "Overig", 
      item.amount || 0, 
      item.date || "", 
      item.user_name || "Anoniem",
      item.remaining_budget || 0
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

          {/* Google Sheets Section */}
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
                      <p className="text-[11px] font-bold text-gray-800 mb-2 leading-tight">Code Kopiëren (v2)</p>
                      <button 
                        onClick={copyScript}
                        className="w-full py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black text-gray-500 uppercase flex items-center justify-center hover:bg-white hover:border-blue-300 transition-all"
                      >
                        {scriptCopied ? <Check size={14} className="text-green-500 mr-2" /> : <Copy size={14} className="mr-2" />}
                        {scriptCopied ? 'Gekopieerd!' : 'Kopieer Script Code'}
                      </button>
                      <p className="text-[8px] text-gray-400 mt-2 italic">Deze nieuwe versie ondersteunt namen van cliënten en het resterende budget per categorie.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 border-t border-gray-50 pt-4">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-gray-800 mb-2 leading-tight">Correcte Implementatie (Deploy)</p>
                      <div className="mt-2 bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-800">
                            "Who has access" MOET staan op <strong>"Anyone"</strong>.
                          </span>
                        </div>
                        
                        <div className="pl-6 space-y-2">
                          <p className="text-[9px] text-amber-700 leading-tight">
                            ❌ Kies <strong>NIET</strong> voor "Anyone with Google Account" of "Me". Dat blokkeert de verbinding van de cliënten.
                          </p>
                          <p className="text-[9px] text-amber-700 leading-tight">
                            ℹ️ Als "Anyone" niet verschijnt, gebruik dan een privé Gmail-account in plaats van een zakelijk account.
                          </p>
                        </div>
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

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSyncAll}
                  disabled={testStatus === 'testing' || !localSheetUrl}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest ${
                    testStatus === 'success' ? 'bg-green-500 text-white' : 
                    testStatus === 'error' ? 'bg-red-500 text-white' : 
                    'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {testStatus === 'testing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {testStatus === 'success' && <Check className="w-4 h-4 mr-2" />}
                  {testStatus === 'error' && <AlertCircle className="w-4 h-4 mr-2" />}
                  {testStatus === 'idle' && <Send className="w-4 h-4 mr-2" />}
                  
                  {testStatus === 'testing' ? 'Verbinding testen...' : 
                   testStatus === 'success' ? 'Verzonden!' : 
                   testStatus === 'error' ? 'Fout opgetreden' : 
                   'Test Verbinding'}
                </button>

                {testStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-2xl animate-fade-in flex items-start gap-3">
                    <Check className="text-green-500 w-5 h-5 shrink-0" />
                    <p className="text-[10px] font-bold text-green-800 leading-tight">
                      Signaal succesvol verzonden! Kijk nu in je Google Sheet of er een nieuwe regel is verschenen met de naam "Systeem Test".
                    </p>
                  </div>
                )}
              </div>
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