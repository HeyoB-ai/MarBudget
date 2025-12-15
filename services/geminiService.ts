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

export const analyzeReceipt = async (base64Image: string, mimeType: string, availableCategories: string[]): Promise<ReceiptAnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define the schema for the expected JSON output
  // We make the category enum optional in strict validation to prevent API errors if the model 
  // slightly deviates, and handle the mapping via the prompt text more strongly.
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              // Default to jpeg if mimeType is empty/unknown, as Gemini handles JPEGs reliably
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
        temperature: 0.1 // Very low temperature for precision
      }
    });

    let text = response.text;
    if (!text) throw new Error("AI returned empty response.");

    // Clean up potential Markdown formatting (```json ... ```)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const result = JSON.parse(text) as ReceiptAnalysisResult;
      
      // Fallback: If category isn't in the list exactly, try to fix it or default to 'Overig'
      if (!availableCategories.includes(result.category)) {
         // Simple fuzzy match or default
         const found = availableCategories.find(c => c.toLowerCase() === result.category.toLowerCase());
         result.category = found || "Overig";
      }
      
      return result;
    } catch (parseError) {
      console.error("JSON Parse Error. Raw Text:", text);
      throw new Error("Kon het antwoord van de AI niet verwerken (JSON fout).");
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Return a more descriptive error message
    throw new Error(error.message || "Er is een fout opgetreden bij het analyseren.");
  }
};