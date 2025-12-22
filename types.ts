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
  id: string; // UUID
  tenant_id?: string;
  user_id?: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  receiptImage?: string; 
  created_at?: string;
  // Extra fields for rich export to sheets
  remaining_budget?: number;
  user_name?: string;
}

export interface Budget {
  id?: string;
  category: string;
  limit_amount: number;
}

export interface ReceiptAnalysisResult {
  amount: number;
  date: string;
  category: string;
  description: string;
}

export type UserRole = 'master_admin' | 'master_staff' | 'sub_user';
export type SubscriptionTier = 'S' | 'M' | 'L' | 'XL';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
}

export interface Tenant {
  id: string;
  name: string;
  subscription_tier: SubscriptionTier;
  max_users: number;
  sheet_url?: string;
}

export interface TenantMember {
  tenant_id: string;
  user_id: string;
  role: UserRole;
}