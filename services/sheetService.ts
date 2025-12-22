import { Expense } from '../types';

export const postToGoogleSheet = async (url: string, data: Expense | Expense[]) => {
  if (!url || !url.includes('/exec')) {
    console.warn("Ongeldige Google Script URL. Zorg dat je een 'Web App' deployment gebruikt die eindigt op /exec");
    return false;
  }

  try {
    // We gebruiken 'no-cors' omdat Google Apps Script redirects gebruikt die CORS errors geven.
    // Met 'no-cors' MOET de content-type een 'simple header' zijn (zoals text/plain).
    // Let op: 'no-cors' geeft een 'opaque' response, waardoor we niet echt kunnen zien of het lukte.
    // Een succesvolle fetch betekent hier alleen dat het netwerkverzoek is verstuurd.
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', 
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(data),
    });
    
    console.log("Verzoek verstuurd naar Google Script. Status (opaque):", response.type);
    return true;
  } catch (error) {
    console.error("Kritieke fout bij verzenden naar Google Sheet. Check je URL of ad-blocker:", error);
    return false;
  }
};