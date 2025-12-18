import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, AlertCircle } from 'lucide-react';
import { analyzeReceipt, fileToGenerativePart } from '../services/geminiService';
import { ReceiptAnalysisResult, Expense } from '../types';
import { generateId } from '../constants';
import { Spinner } from './Spinner';

interface ReceiptScannerProps {
  onAddExpense: (expense: Expense) => void;
  categories: string[];
  currentMonth: Date;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onAddExpense, categories, currentMonth }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
  
  const [amountInput, setAmountInput] = useState<string>(""); 
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (analysisResult?.amount !== undefined) {
      setAmountInput(analysisResult.amount.toString().replace('.', ','));
    }
  }, [analysisResult]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);
      setAmountInput("");

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
    // Allow digits, comma, dot
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
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Camera className="w-5 h-5 mr-2 text-primary" />
        Nieuwe Uitgave
      </h2>

      {!preview ? (
        <div 
          onClick={triggerCamera}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="bg-primary/10 p-4 rounded-full mb-3">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-medium text-gray-600">Maak foto of kies bestand</p>
          <p className="text-xs text-gray-400 mt-1">AI leest automatisch de details</p>
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
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden max-h-64 bg-black flex justify-center">
            <img src={preview} alt="Receipt Preview" className="h-full object-contain" />
            <button 
              onClick={resetScanner}
              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-8 text-primary">
              <Spinner />
              <span className="mt-3 text-sm font-medium">Bonnetje analyseren...</span>
            </div>
          )}

          {error && (
             <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm break-words">
               <strong>Fout:</strong> {error}
               <button onClick={resetScanner} className="block mt-2 font-medium underline">Probeer opnieuw</button>
             </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              
              {isDateMismatch() && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-xs flex items-start">
                   <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                   <span>
                     <strong>Let op:</strong> De datum van deze bon ({new Date(analysisResult.date).toLocaleDateString('nl-NL')}) valt buiten de maand die je nu bekijkt. 
                     Het bedrag wordt opgeslagen bij die maand.
                   </span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Winkel / Omschrijving</label>
                <input 
                  type="text" 
                  value={analysisResult.description} 
                  onChange={(e) => handleUpdateResult('description', e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Bedrag (€)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amountInput} 
                    onChange={handleAmountInputChange}
                    className="w-full mt-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Datum</label>
                  <input 
                    type="date" 
                    value={analysisResult.date} 
                    onChange={(e) => handleUpdateResult('date', e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Categorie</label>
                <select 
                  value={analysisResult.category} 
                  onChange={(e) => handleUpdateResult('category', e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {!categories.includes(analysisResult.category) && (
                    <option value={analysisResult.category}>{analysisResult.category}</option>
                  )}
                </select>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-primary hover:bg-secondary text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors mt-4"
              >
                <Check className="w-5 h-5 mr-2" />
                Opslaan & Toevoegen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};