
import { Category } from './types';

export const CATEGORIES_LIST = [
  Category.HUUR_HYPOTHEEK,
  Category.ENERGIE,
  Category.BOODSCHAPPEN,
  Category.VERVOER,
  Category.TELEFOON_INTERNET,
  Category.VERZEKERINGEN,
  Category.UITJES,
  Category.OVERIG,
];

export const formatCurrency = (amount: number, lang: 'nl' | 'es' = 'nl'): string => {
  const locale = lang === 'nl' ? 'nl-NL' : 'es-ES';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const INITIAL_BUDGETS: Record<Category, number> = {
  [Category.HUUR_HYPOTHEEK]: 1200,
  [Category.ENERGIE]: 150,
  [Category.BOODSCHAPPEN]: 400,
  [Category.VERVOER]: 150,
  [Category.TELEFOON_INTERNET]: 60,
  [Category.VERZEKERINGEN]: 120,
  [Category.UITJES]: 100,
  [Category.OVERIG]: 100,
};
