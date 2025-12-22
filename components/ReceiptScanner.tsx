import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { analyzeReceipt, fileToGenerativePart } from '../services/geminiService';
import { ReceiptAnalysisResult, Expense } from '../types';
import { generateId } from '../constants';
import { Spinner } from './Spinner';

interface ReceiptScannerProps {
  onAddExpense: (expense: Expense) => void;
  categories: string[];
  currentMonth: Date;
  existingExpenses: Expense[];
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onAddExpense, categories, currentMonth, existingExpenses }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
  
  const [amountInput, setAmountInput] = useState<string>(""); 
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (analysisResult?.amount !== undefined) {
      setAmountInput(analysisResult.amount.toString().replace('.', ','));
      
      // Check for duplicates
      const duplicateFound = existingExpenses.some(e => 
        e.amount === analysisResult.amount && 
        e.date === analysisResult.date && 
        e.description.toLowerCase().trim() === analysisResult.description.toLowerCase().trim()
      );
      setIsDuplicate(duplicateFound);
    }
  }, [analysisResult, existingExpenses]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);
      setAmountInput("");
      setIsDuplicate(false);

      const base64Data = await fileToGenerativePart(file);
      setPreview(`data:${file.type};base64,${base64Data}`);

      const result = await analyzeReceipt(base64Data, file.type, categories);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Kon het bonnetje niet lezen. Probeer een duidelijkere foto.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (analysisResult) {
      const parsedAmount = parseFloat(amountInput.replace(',', '.'));
      
      if (isNaN(parsedAmount)) {
        alert("Ongeldig bedrag. Controleer de invoer.");
        return;
      }

      const newExpense: Expense = {
        id: generateId(),
        amount: parsedAmount,
        date: analysisResult.date,
        category: analysisResult.category,
        description: analysisResult.description,
        receiptImage: preview || undefined
      };
      onAddExpense(newExpense);
      resetScanner();
    }
  };

  const resetScanner = () => {
    setPreview(null);
    setAnalysisResult(null);
    setAmountInput("");
    setError(null);
    setIsDuplicate(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateResult = (field: keyof ReceiptAnalysisResult, value: string | number) => {
    if (!analysisResult) return;
    setAnalysisResult({ ...analysisResult, [field]: value });
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[\d,.]*$/.test(val)) {
       setAmountInput(val);
       const parsed = parseFloat(val.replace(',', '.'));
       if (!isNaN(parsed) && analysisResult) {
         setAnalysisResult({ ...analysisResult, amount: parsed });
       }
    }
  };

  const isDateMismatch = () => {
    if (!analysisResult?.date) return false;
    const expenseDate = new Date(analysisResult.date);
    return (
      expenseDate.getMonth() !== currentMonth.getMonth() ||
      expenseDate.getFullYear() !== currentMonth.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm p-6 mb-6 border border-gray-100">
      <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center">
        <Camera className="w-5 h-5 mr-2 text-primary" />
        Nieuwe Uitgave
      </h2>

      {!preview ? (
        <div 
          onClick={triggerCamera}
          className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all group"
        >
          <div className="bg-primary/5 p-5 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
            <Camera className="w-10 h-10 text-primary" />
          </div>
          <p className="text-sm font-bold text-gray-600">Scan bonnetje</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">AI leest automatisch de details</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="relative rounded-[2rem] overflow-hidden max-h-72 bg-gray-900 flex justify-center border border-gray-100 shadow-inner">
            <img src={preview} alt="Receipt Preview" className="h-full object-contain" />
            <button 
              onClick={resetScanner}
              className="absolute top-4 right-4 bg-white/90 text-gray-800 p-2 rounded-2xl shadow-lg hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-10 text-primary">
              <Spinner />
              <span className="mt-4 text-xs font-black uppercase tracking-[0.2em]">Bonnetje analyseren...</span>
            </div>
          )}

          {error && (
             <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-xs border border-red-100 flex items-start animate-shake">
               <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
               <div className="flex-1">
                 <strong className="block mb-1">Analyse mislukt</strong>
                 <p className="opacity-80">{error}</p>
                 <button onClick={resetScanner} className="mt-3 font-bold underline uppercase tracking-widest text-[9px]">Opnieuw proberen</button>
               </div>
             </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="bg-gray-50 p-6 rounded-[2rem] space-y-4 border border-gray-100 animate-fade-in">
              
              {isDuplicate && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex items-center mb-2 animate-bounce-short">
                   <AlertTriangle className="w-5 h-5 mr-3 text-amber-500 flex-shrink-0" />
                   <div className="font-bold">Let op: Dit bonnetje lijkt al eens gescand te zijn!</div>
                </div>
              )}

              {isDateMismatch() && (
                <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-2xl text-[10px] flex items-start font-medium">
                   <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-blue-400" />
                   <span>De datum ({new Date(analysisResult.date).toLocaleDateString('nl-NL')}) valt buiten de huidige maand.</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Winkel / Omschrijving</label>
                <input 
                  type="text" 
                  value={analysisResult.description} 
                  onChange={(e) => handleUpdateResult('description', e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none font-bold text-gray-800 text-sm transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bedrag (€)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amountInput} 
                    onChange={handleAmountInputChange}
                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none font-black text-gray-800 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Datum</label>
                  <input 
                    type="date" 
                    value={analysisResult.date} 
                    onChange={(e) => handleUpdateResult('date', e.target.value)}
                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none font-bold text-gray-800 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categorie</label>
                <select 
                  value={analysisResult.category} 
                  onChange={(e) => handleUpdateResult('category', e.target.value)}
                  className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none font-bold text-gray-800 text-sm transition-all appearance-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {!categories.includes(analysisResult.category) && (
                    <option value={analysisResult.category}>{analysisResult.category}</option>
                  )}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                {isDuplicate && (
                  <button 
                    onClick={resetScanner}
                    className="flex-1 py-4 px-6 rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-[10px] border-2 border-amber-200 text-amber-600 hover:bg-amber-50 transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Niet Opslaan
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className={`flex-[2] py-4 px-6 rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 ${isDuplicate ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-secondary'} text-white`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isDuplicate ? 'Toch Opslaan' : 'Toevoegen aan Lijst'}
                </button>
              </div>
              
              {!isDuplicate && (
                <button 
                  onClick={resetScanner}
                  className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
                >
                  Annuleren
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};