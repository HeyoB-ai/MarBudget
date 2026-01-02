
export enum Category {
  HUUR_HYPOTHEEK = 'Alquiler/Hipoteca',
  ENERGIE = 'Energía y Agua',
  BOODSCHAPPEN = 'Comestibles',
  VERVOER = 'Transporte y Gasolina',
  TELEFOON_INTERNET = 'Teléfono e Internet',
  VERZEKERINGEN = 'Seguros',
  UITJES = 'Ocio y Restauración',
  OVERIG = 'Otros'
}

export interface Expense {
  id: string; 
  tenant_id?: string;
  user_id?: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  receiptImage?: string; 
  created_at?: string;
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
