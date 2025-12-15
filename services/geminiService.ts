import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptAnalysisResult } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper function to wait for a specified time
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeReceipt = async (base64Image: string, mimeType: string, availableCategories: string[]): Promise<ReceiptAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const schema = {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "The total amount of the receipt in Euro." },
      date: { type: Type.STRING, description: "The date on the receipt in YYYY-MM-DD format. Use current date if not found." },
      category: { 
        type: Type.STRING, 
        description: "The category of the expense." 
      },
      description: { type: Type.STRING, description: "Store name or short description." }
    },
    required: ["amount", "date", "description"],
  };

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg", 
                data: base64Image
              }
            },
            {
              text: `Analyseer deze bon.
              
              Taken:
              1. Vind het Totaalbedrag (amount).
              2. Vind de Datum (date) in YYYY-MM-DD.
              3. Bepaal de Categorie (category). Kies EXACT één uit deze lijst: ${JSON.stringify(availableCategories)}.
              4. Vind de Winkelnaam (description).
              
              Antwoord ALLEEN met een JSON object.`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.1
        }
      });

      let text = response.text;
      if (!text) throw new Error("AI returned empty response.");

      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      try {
        const result = JSON.parse(text) as ReceiptAnalysisResult;
        
        if (!availableCategories.includes(result.category)) {
           const found = availableCategories.find(c => c.toLowerCase() === result.category.toLowerCase());
           result.category = found || "Overig";
        }
        
        return result; // Success! Return immediately.
      } catch (parseError) {
        console.error("JSON Parse Error. Raw Text:", text);
        throw new Error("Kon het antwoord van de AI niet verwerken (JSON fout).");
      }

    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      lastError = error;

      // Check if it's a 503 Service Unavailable or Overloaded error
      const isOverloaded = error.status === 503 || 
                           (error.message && error.message.includes('503')) || 
                           (error.message && error.message.toLowerCase().includes('overloaded'));

      // If overloaded and we have retries left, wait and continue
      if (isOverloaded && attempt < maxRetries) {
        // Exponential backoff: wait 2s, then 4s, etc.
        const waitTime = 2000 * attempt;
        console.log(`Google Gemini is busy. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }

      // If not overloaded or out of retries, throw the error
      throw new Error(error.message || "Er is een fout opgetreden bij het analyseren.");
    }
  }

  throw lastError;
};