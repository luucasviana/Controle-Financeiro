create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

do $$ begin
    create type public.month_status as enum ('OPEN', 'CLOSED');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.expense_status as enum ('PLANNED', 'PAID');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.payment_method as enum ('NONE', 'PIX', 'DEBIT', 'CASH', 'CREDIT_CARD');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.months (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    start_date date not null,
    end_date date not null,
    status public.month_status not null default 'OPEN',
    created_at timestamptz not null default now()
);

create table if not exists public.recurring_incomes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    description text not null,
    amount numeric(12,2) not null default 0,
    is_active boolean not null default true,
    is_hidden boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.recurring_expense_templates (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    description text not null,
    amount numeric(12,2) not null default 0,
    day_of_month int not null check (day_of_month >= 1 and day_of_month <= 31),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.expense_installment_plans (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    description text not null,
    amount numeric(12,2) not null default 0,
    due_day int not null check (due_day >= 1 and due_day <= 31),
    total_installments int not null check (total_installments >= 1),
    starts_in_current_month boolean not null default false,
    is_active boolean not null default true,
    is_archived boolean not null default false,
    base_month_id uuid null references public.months(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.cards (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    limit_amount numeric(12,2) not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.month_expenses (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    month_id uuid not null references public.months(id) on delete cascade,
    due_date date not null,
    description text not null,
    amount numeric(12,2) not null default 0,
    status public.expense_status not null default 'PLANNED',
    payment_method public.payment_method not null default 'NONE',
    card_id uuid null references public.cards(id) on delete set null,
    template_id uuid null references public.recurring_expense_templates(id) on delete set null,
    installment_plan_id uuid null references public.expense_installment_plans(id) on delete set null,
    installment_number int null check (installment_number >= 1),
    installment_total int null check (installment_total >= 1),
    paid_at timestamptz null,
    is_excluded boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.card_month_balances (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    card_id uuid not null references public.cards(id) on delete cascade,
    month_id uuid not null references public.months(id) on delete cascade,
    amount_current numeric(12,2) not null default 0,
    updated_on date not null default current_date,
    updated_at timestamptz not null default now(),
    unique (user_id, card_id, month_id)
);

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

create index if not exists idx_months_user_status_start_date on public.months (user_id, status, start_date desc);
create index if not exists idx_months_user_start_date on public.months (user_id, start_date desc);
create index if not exists idx_recurring_incomes_user_active_hidden on public.recurring_incomes (user_id, is_active, is_hidden);
create index if not exists idx_recurring_expense_templates_user on public.recurring_expense_templates (user_id);
create index if not exists idx_expense_installment_plans_user_active_archived on public.expense_installment_plans (user_id, is_active, is_archived);
create index if not exists idx_cards_user on public.cards (user_id);
create index if not exists idx_month_expenses_user_month on public.month_expenses (user_id, month_id);
create index if not exists idx_month_expenses_user_month_template on public.month_expenses (user_id, month_id, template_id);
create unique index if not exists idx_month_expenses_user_month_template_unique
    on public.month_expenses (user_id, month_id, template_id)
    where template_id is not null;
create index if not exists idx_month_expenses_user_month_installment on public.month_expenses (user_id, month_id, installment_plan_id);
create unique index if not exists idx_month_expenses_user_month_installment_unique
    on public.month_expenses (user_id, month_id, installment_plan_id)
    where installment_plan_id is not null;
create index if not exists idx_month_expenses_user_month_excluded on public.month_expenses (user_id, month_id, is_excluded);
create index if not exists idx_month_expenses_due_date on public.month_expenses (due_date);
create index if not exists idx_card_month_balances_card_month on public.card_month_balances (card_id, month_id);
create index if not exists idx_card_month_balances_user_month on public.card_month_balances (user_id, month_id);
create index if not exists idx_card_transactions_user_card on public.card_transactions (user_id, card_id);
create index if not exists idx_card_transactions_occurred_at on public.card_transactions (occurred_at);

alter table public.months enable row level security;
alter table public.recurring_incomes enable row level security;
alter table public.recurring_expense_templates enable row level security;
alter table public.expense_installment_plans enable row level security;
alter table public.cards enable row level security;
alter table public.month_expenses enable row level security;
alter table public.card_month_balances enable row level security;
alter table public.card_transactions enable row level security;

drop policy if exists "Users can manage their own months" on public.months;
create policy "Users can manage their own months"
    on public.months
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own recurring incomes" on public.recurring_incomes;
create policy "Users can manage their own recurring incomes"
    on public.recurring_incomes
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own expense templates" on public.recurring_expense_templates;
create policy "Users can manage their own expense templates"
    on public.recurring_expense_templates
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own installment plans" on public.expense_installment_plans;
create policy "Users can manage their own installment plans"
    on public.expense_installment_plans
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own cards" on public.cards;
create policy "Users can manage their own cards"
    on public.cards
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own month expenses" on public.month_expenses;
create policy "Users can manage their own month expenses"
    on public.month_expenses
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own card balances" on public.card_month_balances;
create policy "Users can manage their own card balances"
    on public.card_month_balances
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own card transactions" on public.card_transactions;
create policy "Users can manage their own card transactions"
    on public.card_transactions
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create or replace function public.clean_user_data()
returns void
language plpgsql
security definer
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Não autenticado';
    end if;

    delete from public.card_transactions where user_id = v_user_id;
    delete from public.card_month_balances where user_id = v_user_id;
    delete from public.month_expenses where user_id = v_user_id;
    delete from public.recurring_expense_templates where user_id = v_user_id;
    delete from public.expense_installment_plans where user_id = v_user_id;
    delete from public.recurring_incomes where user_id = v_user_id;
    delete from public.cards where user_id = v_user_id;
    delete from public.months where user_id = v_user_id;
end;
$$;
