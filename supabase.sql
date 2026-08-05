-- ============================================================
-- Schema-alvo (estado-alvo) do redesign de despesas recorrentes.
--
-- DIVERGÊNCIA INTENCIONAL: este arquivo já assume que os quatro
-- comandos destrutivos de `migration_unify_recurring_expenses.sql`
-- (drop da tabela `recurring_expense_templates`, da coluna
-- `template_id` e dos índices de template) foram aprovados e
-- executados. No banco real, esses comandos ainda estão comentados
-- pendente de aval — ou seja, hoje o banco real ainda tem
-- `recurring_expense_templates` e `month_expenses.template_id`, que
-- não aparecem aqui. Este arquivo serve como referência para
-- instalações novas (fresh install) e como destino final da migração,
-- não como retrato fiel do banco de produção atual.
--
-- ⚠️ NÃO rode este arquivo inteiro contra um banco já migrado enquanto
-- os comandos destrutivos pendentes (bloco "PENDENTE DE AVAL" no fim
-- de `migration_unify_recurring_expenses.sql`) não forem aprovados e
-- executados. O `create or replace function public.clean_user_data()`
-- daqui embaixo substituiria silenciosamente a versão criada pela
-- migração — que ainda limpa `recurring_expense_templates` — por esta
-- versão-alvo, que não a limpa. Enquanto a tabela ainda existir de
-- fato em produção, isso faria o reset de dados deixar linhas órfãs
-- nela.
-- ============================================================

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

create table if not exists public.income_sources (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    description text not null,
    is_active boolean not null default true,
    is_hidden boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.month_incomes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    month_id uuid not null references public.months(id) on delete cascade,
    source_id uuid not null references public.income_sources(id) on delete cascade,
    amount numeric(12,2) not null default 0,
    created_at timestamptz not null default now(),
    unique (user_id, month_id, source_id)
);

create table if not exists public.recurring_expenses (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    description text not null,
    amount numeric(12,2) not null default 0,
    due_day int not null check (due_day >= 1 and due_day <= 31),
    total_occurrences int null check (total_occurrences >= 1),
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
    recurring_expense_id uuid null references public.recurring_expenses(id) on delete set null,
    occurrence_number int null check (occurrence_number >= 1),
    occurrence_total int null check (occurrence_total >= 1),
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
create index if not exists idx_income_sources_user_active_hidden on public.income_sources (user_id, is_active, is_hidden);
create index if not exists idx_month_incomes_user_month on public.month_incomes (user_id, month_id);
create index if not exists idx_month_incomes_source on public.month_incomes (source_id);
create index if not exists idx_recurring_expenses_user_active_archived on public.recurring_expenses (user_id, is_active, is_archived);
create index if not exists idx_cards_user on public.cards (user_id);
create index if not exists idx_month_expenses_user_month on public.month_expenses (user_id, month_id);
create index if not exists idx_month_expenses_user_month_recurring on public.month_expenses (user_id, month_id, recurring_expense_id);
create unique index if not exists idx_month_expenses_user_month_recurring_unique
    on public.month_expenses (user_id, month_id, recurring_expense_id)
    where recurring_expense_id is not null;
-- Índice acima é PARCIAL (só cobre linhas com recurring_expense_id preenchido), então
-- o Postgres não aceita ele como árbitro de ON CONFLICT a menos que o WHERE seja repetido
-- na cláusula — algo que o supabase-js não tem como expressar. Este índice não-parcial
-- serve de árbitro para o upsert de syncRecurringExpensesForUser (finance.ts). Nulos são
-- distintos em índice único, então despesas avulsas (recurring_expense_id null) continuam
-- livres para se repetir por (user_id, month_id).
create unique index if not exists idx_month_expenses_user_month_recurring_arbiter
    on public.month_expenses (user_id, month_id, recurring_expense_id);
create index if not exists idx_month_expenses_user_month_excluded on public.month_expenses (user_id, month_id, is_excluded);
create index if not exists idx_month_expenses_due_date on public.month_expenses (due_date);
create index if not exists idx_card_month_balances_card_month on public.card_month_balances (card_id, month_id);
create index if not exists idx_card_month_balances_user_month on public.card_month_balances (user_id, month_id);
create index if not exists idx_card_transactions_user_card on public.card_transactions (user_id, card_id);
create index if not exists idx_card_transactions_occurred_at on public.card_transactions (occurred_at);

alter table public.months enable row level security;
alter table public.income_sources enable row level security;
alter table public.month_incomes enable row level security;
alter table public.recurring_expenses enable row level security;
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

drop policy if exists "Users can manage their own recurring incomes" on public.income_sources;
create policy "Users can manage their own recurring incomes"
    on public.income_sources
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own month incomes" on public.month_incomes;
create policy "Users can manage their own month incomes"
    on public.month_incomes
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own installment plans" on public.recurring_expenses;
drop policy if exists "Users can manage their own recurring expenses" on public.recurring_expenses;
create policy "Users can manage their own recurring expenses"
    on public.recurring_expenses
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
    delete from public.recurring_expenses where user_id = v_user_id;
    delete from public.month_incomes where user_id = v_user_id;
    delete from public.income_sources where user_id = v_user_id;
    delete from public.cards where user_id = v_user_id;
    delete from public.months where user_id = v_user_id;
end;
$$;
