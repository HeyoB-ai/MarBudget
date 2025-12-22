import { Expense } from '../types';

export const postToGoogleSheet = async (url: string, data: Expense | Expense[]) => {
  if (!url || !url.includes('/exec')) {
    console.warn("Ongeldige Google Script URL. Zorg dat je een 'Web App' deployment gebruikt die eindigt op /exec");
    return false;
  }

  try {
    // Gebruik AbortController om een timeout in te stellen (vangen van extreem trage verbindingen)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // We gebruiken 'no-cors' omdat Google Apps Script redirects gebruikt die CORS errors geven in de browser.
    // Met 'no-cors' is de response altijd 'opaque' (je ziet de inhoud niet, maar het verzoek wordt wel uitgevoerd).
    await fetch(url, {
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
    console.log("Verzoek succesvol verzonden naar Google Script.");
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("Netwerk timeout: Het duurde te lang om verbinding te maken met Google.");
    } else {
      console.error("Kritieke fout bij verzenden naar Google Sheet. Check je URL of ad-blocker:", error);
    }
    return false;
  }
};