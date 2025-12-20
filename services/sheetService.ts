import { Expense } from '../types';

export const postToGoogleSheet = async (url: string, data: Expense | Expense[]) => {
  if (!url || !url.includes('/exec')) {
    console.warn("Ongeldige Google Script URL. Zorg dat je een 'Web App' deployment gebruikt die eindigt op /exec");
    return false;
  }

  try {
    // We gebruiken 'no-cors' omdat Google Apps Script redirects gebruikt die CORS errors geven.
    // Met 'no-cors' MOET de content-type een 'simple header' zijn (zoals text/plain).
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(data),
    });
    console.log("Data verzonden naar Google Script");
    return true;
  } catch (error) {
    console.error("Fout bij verzenden naar Google Sheet:", error);
    return false;
  }
};