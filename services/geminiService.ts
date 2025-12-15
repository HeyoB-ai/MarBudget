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

export const analyzeReceipt = async (base64Image: string, availableCategories: string[]): Promise<ReceiptAnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Define the schema for the expected JSON output
  const schema = {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "The total amount of the receipt in Euro." },
      date: { type: Type.STRING, description: "The date on the receipt in YYYY-MM-DD format. If not found, use today's date." },
      category: { 
        type: Type.STRING, 
        enum: availableCategories,
        description: "The most appropriate category for this expense." 
      },
      description: { type: Type.STRING, description: "A short description of the purchase (e.g., store name)." }
    },
    required: ["amount", "date", "category", "description"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, works with PNG too usually
              data: base64Image
            }
          },
          {
            text: `Analyseer deze afbeelding van een bonnetje. Haal het totaalbedrag, de datum en de winkelnaam (als omschrijving) eruit. Wijs het toe aan exact één van de volgende categorieën: ${availableCategories.join(", ")}. Antwoord in JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2 // Low temperature for factual extraction
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text) as ReceiptAnalysisResult;
    return result;

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
};