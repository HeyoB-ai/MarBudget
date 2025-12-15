import { Expense } from '../types';

export const postToGoogleSheet = async (url: string, data: Expense | Expense[]) => {
  if (!url) return;

  try {
    // We gebruiken 'no-cors' omdat Google Apps Script redirects gebruikt die CORS errors kunnen geven in browser JS.
    // Met 'no-cors' kunnen we wel sturen, maar krijgen we geen leesbaar antwoord terug. 
    // Voor "fire and forget" logging is dit prima.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    console.log("Data verzonden naar Google Sheet");
    return true;
  } catch (error) {
    console.error("Fout bij verzenden naar Google Sheet:", error);
    return false;
  }
};