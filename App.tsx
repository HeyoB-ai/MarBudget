-- 1. Eerst schoon schip maken (verwijdert eventuele halve tabellen)
drop table if exists public.incomes cascade;
drop table if exists public.budgets cascade;
drop table if exists public.expenses cascade;
drop table if exists public.tenant_members cascade;
drop table if exists public.tenants cascade;
drop table if exists public.profiles cascade;

-- 2. Alle tabellen aanmaken
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text
);

create table public.tenants (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  subscription_tier text default 'S',
  max_users int default 5,
  sheet_url text
);

create table public.tenant_members (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants not null,
  user_id uuid references public.profiles not null,
  role text check (role in ('master_admin', 'master_staff', 'sub_user')),
  unique(tenant_id, user_id)
);

create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants not null,
  user_id uuid references public.profiles not null,
  amount numeric not null,
  description text,
  category text,
  date date,
  receipt_image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants not null,
  category text not null,
  limit_amount numeric not null,
  unique(tenant_id, category)
);

create table public.incomes (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants not null,
  amount numeric not null
);

-- 3. Row Level Security (RLS) aanzetten
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.incomes enable row level security;

-- 4. Policies aanmaken (Nu bestaan alle tabellen, dus dit gaat goed)

-- Profiles
create policy "Users can insert their own profile" on profiles for insert with check ( auth.uid() = id );
create policy "Users can update their own profile" on profiles for update using ( auth.uid() = id );
create policy "Users can read any profile" on profiles for select using ( true );

-- Tenants
create policy "Auth users can create tenants" on tenants for insert with check ( auth.role() = 'authenticated' );
create policy "Anyone can find tenant" on tenants for select using ( true );
create policy "Members can update their tenant" on tenants for update using (
  exists (select 1 from tenant_members where tenant_members.tenant_id = tenants.id and tenant_members.user_id = auth.uid())
);

-- Tenant Members
create policy "Users can join tenants" on tenant_members for insert with check ( auth.uid() = user_id );
create policy "Members can view members" on tenant_members for select using (
  exists (
    select 1 from tenant_members tm where tm.tenant_id = tenant_members.tenant_id and tm.user_id = auth.uid()
  )
);

-- Expenses
create policy "Members can view expenses" on expenses for select using (
  exists (select 1 from tenant_members tm where tm.tenant_id = expenses.tenant_id and tm.user_id = auth.uid())
);
create policy "Members can insert expenses" on expenses for insert with check (
  exists (select 1 from tenant_members tm where tm.tenant_id = expenses.tenant_id and tm.user_id = auth.uid())
);
create policy "Members can delete expenses" on expenses for delete using (
  exists (select 1 from tenant_members tm where tm.tenant_id = expenses.tenant_id and tm.user_id = auth.uid())
);

-- Budgets
create policy "Members can view budgets" on budgets for select using (
  exists (select 1 from tenant_members tm where tm.tenant_id = budgets.tenant_id and tm.user_id = auth.uid())
);
create policy "Members can manage budgets" on budgets for all using (
  exists (select 1 from tenant_members tm where tm.tenant_id = budgets.tenant_id and tm.user_id = auth.uid())
);

-- Incomes
create policy "Members can view incomes" on incomes for select using (
  exists (select 1 from tenant_members tm where tm.tenant_id = incomes.tenant_id and tm.user_id = auth.uid())
);
create policy "Members can manage incomes" on incomes for all using (
  exists (select 1 from tenant_members tm where tm.tenant_id = incomes.tenant_id and tm.user_id = auth.uid())
);
