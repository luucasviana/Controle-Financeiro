-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Custom Types (Enums)
create type expense_status as enum ('PLANNED', 'PAID');
create type payment_method as enum ('NONE', 'PIX', 'DEBIT', 'CASH', 'CREDIT_CARD');

-- Tables
-- 1. recurring_incomes
create table if not exists public.recurring_incomes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. recurring_expense_templates
create table if not exists public.recurring_expense_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null default 0,
  day_of_month int not null check (day_of_month >= 1 and day_of_month <= 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. cards
create table if not exists public.cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  limit_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- 4. month_expenses
create table if not exists public.month_expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, -- must be the first day of the month
  due_date date not null,
  description text not null,
  amount numeric(12,2) not null default 0,
  status expense_status not null default 'PLANNED',
  payment_method payment_method not null default 'NONE',
  card_id uuid null references public.cards(id) on delete set null,
  template_id uuid null references public.recurring_expense_templates(id) on delete set null,
  paid_at timestamptz null,
  created_at timestamptz not null default now()
);

-- 5. card_transactions
create table if not exists public.card_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  expense_id uuid null references public.month_expenses(id) on delete set null,
  occurred_at date not null,
  description text not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_recurring_incomes_user on public.recurring_incomes(user_id);
create index if not exists idx_recurring_expense_templates_user on public.recurring_expense_templates(user_id);
create index if not exists idx_month_expenses_user_month on public.month_expenses(user_id, month);
create index if not exists idx_cards_user on public.cards(user_id);
create index if not exists idx_card_transactions_user_card on public.card_transactions(user_id, card_id);
create index if not exists idx_card_transactions_occurred_at on public.card_transactions(occurred_at);
create index if not exists idx_month_expenses_due_date on public.month_expenses(due_date);

-- Enable Row Level Security (RLS)
alter table public.recurring_incomes enable row level security;
alter table public.recurring_expense_templates enable row level security;
alter table public.month_expenses enable row level security;
alter table public.cards enable row level security;
alter table public.card_transactions enable row level security;

-- Policies
-- recurring_incomes
create policy "Users can manage their own recurring incomes"
  on public.recurring_incomes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- recurring_expense_templates
create policy "Users can manage their own expense templates"
  on public.recurring_expense_templates
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- month_expenses
create policy "Users can manage their own month expenses"
  on public.month_expenses
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- cards
create policy "Users can manage their own cards"
  on public.cards
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- card_transactions
create policy "Users can manage their own card transactions"
  on public.card_transactions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
