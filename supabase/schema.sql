
-- Schakel extensies in
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS (De omgeving van een Coach of een gezin)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'S',
  max_users INTEGER DEFAULT 5,
  sheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES (Gebruikersgegevens)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TENANT_MEMBERS (Koppeling tussen gebruiker en omgeving)
-- Toegevoegd: ON DELETE CASCADE zorgt voor automatische opschoning
CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id UUID REFERENCES tenants ON DELETE CASCADE,
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'sub_user',
  PRIMARY KEY (tenant_id, user_id)
);

-- 4. EXPENSES (De bonnetjes/uitgaven)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants ON DELETE CASCADE,
  user_id UUID REFERENCES profiles ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BUDGETS (De limieten per categorie)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount DECIMAL(12,2) NOT NULL,
  UNIQUE(tenant_id, category)
);

-- 6. INCOMES (Totaal budget/inkomen per tenant)
CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants ON DELETE CASCADE UNIQUE,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Basis configuratie
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- Voorbeeld policy: Gebruikers kunnen alleen data zien van hun eigen tenant
-- Let op: In een productie-omgeving moeten deze policies specifieker worden ingesteld.
