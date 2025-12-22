import { Expense } from '../types';

export const postToGoogleSheet = async (url: string, data: Expense | Expense[]) => {
  if (!url || !url.includes('/exec')) {
    console.warn("Ongeldige Google Script URL. Zorg dat je een 'Web App' deployment gebruikt die eindigt op /exec");
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Longer timeout for bulk

    // Google Apps Script doPost requires data to be sent as string
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', 
      cache: 'no-cache',
      signal: controller.signal,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(data),
    });
    
    clearTimeout(timeoutId);
    console.log("Export naar Google Script voltooid.");
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("Netwerk timeout bij Google Sheet export.");
    } else {
      console.error("Fout bij verzenden naar Google Sheet:", error);
    }
    return false;
  }
};