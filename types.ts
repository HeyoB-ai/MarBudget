export enum Category {
  HUUR_HYPOTHEEK = 'Huur/Hypotheek',
  ENERGIE = 'Energie & Water',
  BOODSCHAPPEN = 'Boodschappen',
  VERVOER = 'Vervoer & Benzine',
  TELEFOON_INTERNET = 'Telefoon & Internet',
  VERZEKERINGEN = 'Verzekeringen',
  UITJES = 'Uitjes & Horeca',
  OVERIG = 'Overig'
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: string; // Changed from Category to string to allow custom categories
  description: string;
  receiptImage?: string; 
}

export interface Budget {
  category: string;
  limit: number;
}

export interface ReceiptAnalysisResult {
  amount: number;
  date: string;
  category: string;
  description: string;
}