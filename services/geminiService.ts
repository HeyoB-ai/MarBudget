
import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptAnalysisResult } from "../types";

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeReceipt = async (base64Image: string, mimeType: string, availableCategories: string[], lang: 'nl' | 'es' = 'nl'): Promise<ReceiptAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const schema = {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "The total amount of the receipt in Euro." },
      date: { type: Type.STRING, description: "The date on the receipt in YYYY-MM-DD format." },
      category: { type: Type.STRING, description: "The category of the expense." },
      description: { type: Type.STRING, description: "Store name or short description." }
    },
    required: ["amount", "date", "category", "description"],
  };

  const prompts = {
    nl: `Analyseer deze bon.
    1. Vind het totaalbedrag (amount).
    2. Vind de datum (date) in YYYY-MM-DD formaat.
    3. Bepaal de categorie (category). Kies EXACT één uit deze lijst: ${JSON.stringify(availableCategories)}.
    4. Vind de winkelnaam (description).`,
    es: `Analiza este recibo.
    1. Encuentra el importe total (amount).
    2. Encuentra la fecha (date) en formato YYYY-MM-DD.
    3. Determina la categoría (category). Elige EXACTAMENTE una de esta lista: ${JSON.stringify(availableCategories)}.
    4. Encuentra el nombre del establecimiento (description).`
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Image } },
          { text: `${prompts[lang]}\nRespond ONLY with JSON.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1
      }
    });

    const result = JSON.parse(response.text || '{}') as ReceiptAnalysisResult;
    
    if (!availableCategories.includes(result.category)) {
       const found = availableCategories.find(c => c.toLowerCase() === result.category.toLowerCase());
       result.category = found || (lang === 'nl' ? "Overig" : "Otros");
    }
    
    return result;
  } catch (error: any) {
    throw new Error(lang === 'nl' ? "Bonanalyse mislukt." : "Análisis fallido.");
  }
};
