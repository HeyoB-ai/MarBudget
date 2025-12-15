import React, { useState, useRef } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { analyzeReceipt, fileToGenerativePart } from '../services/geminiService';
import { ReceiptAnalysisResult, Expense } from '../types';
import { generateId } from '../constants';
import { Spinner } from './Spinner';

interface ReceiptScannerProps {
  onAddExpense: (expense: Expense) => void;
  categories: string[];
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onAddExpense, categories }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);

      // Create preview
      const base64Data = await fileToGenerativePart(file);
      setPreview(`data:${file.type};base64,${base64Data}`);

      // Analyze with Gemini
      const result = await analyzeReceipt(base64Data, file.type, categories);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
      // Show the actual error message if available, otherwise generic
      setError(err.message || "Kon het bonnetje niet lezen. Probeer een duidelijkere foto.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (analysisResult) {
      // Zeker weten dat amount een nummer is
      const finalAmount = Number(analysisResult.amount);
      if (isNaN(finalAmount)) {
        alert("Ongeldig bedrag. Controleer de invoer.");
        return;
      }

      const newExpense: Expense = {
        id: generateId(),
        amount: finalAmount,
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
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  // Allow manual editing of the result before saving
  const handleUpdateResult = (field: keyof ReceiptAnalysisResult, value: string | number) => {
    if (!analysisResult) return;
    setAnalysisResult({ ...analysisResult, [field]: value });
  };

  // Speciale handler voor het bedrag om komma's te ondersteunen
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!analysisResult) return;
    const val = e.target.value;
    // Vervang komma door punt voor parsing
    const normalizedVal = val.replace(',', '.');
    // We slaan het wel op in de state, ook als het nog 'typend' is
    // Maar we proberen te parsen
    const floatVal = parseFloat(normalizedVal);
    
    // Update de state met het geparste nummer (of 0 als het leeg is/ongeldig, zodat het input field werkt)
    // Als de gebruiker leegmaakt, willen we misschien een string toestaan in een echte form library, 
    // maar hier houden we het simpel:
    if (val === '') {
       // Tijdelijk hackje: we moeten het eigenlijk als string in de input houden en als number in het model.
       // Maar omdat analysisResult.amount een number is, doen we een best-effort.
       // In een productie app zou je lokale input state (string) scheiden van model state (number).
       // Voor nu: als NaN of leeg, laat 0 zien of behoudt de laatste waarde. 
       // Omdat dit complex is zonder grote refactor, accepteren we dat je valide getallen typt.
       setAnalysisResult({ ...analysisResult, amount: 0 });
    } else {
       if (!isNaN(floatVal)) {
         setAnalysisResult({ ...analysisResult, amount: floatVal });
       }
    }
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
            capture="environment" // Suggests back camera on mobile
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
                    type="number" 
                    step="0.01"
                    // We gebruiken defaultValue of value, maar bij controlled inputs moet onChange de juiste waarde zetten
                    value={analysisResult.amount} 
                    onChange={handleAmountChange}
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
                  {/* Fallback optie als de categorie van AI niet in de lijst staat */}
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
                Toevoegen aan Budget
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};