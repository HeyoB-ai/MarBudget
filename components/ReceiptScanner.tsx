
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, AlertTriangle } from 'lucide-react';
import { analyzeReceipt, fileToGenerativePart } from '../services/geminiService';
import { ReceiptAnalysisResult, Expense } from '../types';
import { generateId } from '../constants';
import { Spinner } from './Spinner';

const scannerTranslations = {
  nl: {
    title: 'Nieuwe Uitgave',
    scan: 'Scan bonnetje',
    iaHint: 'AI leest details automatisch',
    analyzing: 'Bon analyseren...',
    duplicate: 'Let op: Dit lijkt een dubbele bon!',
    desc: 'Winkel / Omschrijving',
    amount: 'Bedrag (€)',
    date: 'Datum',
    category: 'Categorie',
    save: 'Opslaan'
  },
  es: {
    title: 'Nuevo Gasto',
    scan: 'Escanear ticket',
    iaHint: 'La IA lee los detalles automáticamente',
    analyzing: 'Analizando ticket...',
    duplicate: '¡Atención: Este ticket parece duplicado!',
    desc: 'Establecimiento / Descripción',
    amount: 'Importe (€)',
    date: 'Fecha',
    category: 'Categoría',
    save: 'Guardar'
  }
};

export const ReceiptScanner = ({ lang, onAddExpense, categories, existingExpenses }: any) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
  const [amountInput, setAmountInput] = useState<string>(""); 
  const [isDuplicate, setIsDuplicate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const st = scannerTranslations[lang as 'nl' | 'es'];

  useEffect(() => {
    if (analysisResult?.amount !== undefined) {
      setAmountInput(analysisResult.amount.toString().replace('.', ','));
      const duplicateFound = existingExpenses.some((e: any) => 
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
      const base64Data = await fileToGenerativePart(file);
      setPreview(`data:${file.type};base64,${base64Data}`);
      const result = await analyzeReceipt(base64Data, file.type, categories, lang);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (analysisResult) {
      const parsedAmount = parseFloat(amountInput.replace(',', '.'));
      if (isNaN(parsedAmount)) return;
      onAddExpense({
        id: generateId(),
        amount: parsedAmount,
        date: analysisResult.date,
        category: analysisResult.category,
        description: analysisResult.description,
        receiptImage: preview || undefined
      });
      setPreview(null); setAnalysisResult(null); setAmountInput("");
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm p-6 mb-6 border border-gray-100">
      <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center">
        <Camera className="w-5 h-5 mr-2 text-primary" />
        {st.title}
      </h2>
      {!preview ? (
        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all group text-center">
          <div className="bg-primary/5 p-5 rounded-3xl mb-4 group-hover:scale-110 transition-transform"><Camera className="w-10 h-10 text-primary" /></div>
          <p className="text-sm font-bold text-gray-600">{st.scan}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{st.iaHint}</p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="relative rounded-[2rem] overflow-hidden max-h-72 bg-gray-900 flex justify-center border border-gray-100 shadow-inner">
            <img src={preview} alt="Vista previa" className="h-full object-contain" />
            <button onClick={() => { setPreview(null); setAnalysisResult(null); }} className="absolute top-4 right-4 bg-white/90 text-gray-800 p-2 rounded-2xl"><X className="w-5 h-5" /></button>
          </div>
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-10 text-primary">
              <Spinner /><span className="mt-4 text-[10px] font-black uppercase tracking-widest">{st.analyzing}</span>
            </div>
          )}
          {analysisResult && !isAnalyzing && (
            <div className="bg-gray-50 p-6 rounded-[2rem] space-y-4 border border-gray-100 animate-fade-in">
              {isDuplicate && <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex items-center font-bold"><AlertTriangle className="w-5 h-5 mr-3 text-amber-500" />{st.duplicate}</div>}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{st.desc}</label>
                <input type="text" value={analysisResult.description} onChange={(e) => setAnalysisResult({...analysisResult, description: e.target.value})} className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-800 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{st.amount}</label>
                  <input type="text" inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-800 text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{st.date}</label>
                  <input type="date" value={analysisResult.date} onChange={(e) => setAnalysisResult({...analysisResult, date: e.target.value})} className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-800 text-sm outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{st.category}</label>
                <select value={analysisResult.category} onChange={(e) => setAnalysisResult({...analysisResult, category: e.target.value})} className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-800 text-sm outline-none">
                  {categories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-primary hover:bg-secondary text-white rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-[10px] shadow-lg transition-all"><Check className="w-4 h-4 mr-2" /> {st.save}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
