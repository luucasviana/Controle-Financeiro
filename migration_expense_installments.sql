-- Migration: Parcelamentos de despesas

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

alter table if exists public.month_expenses
    add column if not exists installment_plan_id uuid null references public.expense_installment_plans(id) on delete set null;

alter table if exists public.month_expenses
    add column if not exists installment_number int null check (installment_number >= 1);

alter table if exists public.month_expenses
    add column if not exists installment_total int null check (installment_total >= 1);

create index if not exists idx_expense_installment_plans_user_active_archived
    on public.expense_installment_plans (user_id, is_active, is_archived);

create index if not exists idx_month_expenses_user_month_installment
    on public.month_expenses (user_id, month_id, installment_plan_id);

create unique index if not exists idx_month_expenses_user_month_installment_unique
    on public.month_expenses (user_id, month_id, installment_plan_id)
    where installment_plan_id is not null;

alter table if exists public.expense_installment_plans enable row level security;

drop policy if exists "Users can manage their own installment plans" on public.expense_installment_plans;
create policy "Users can manage their own installment plans"
    on public.expense_installment_plans
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
    delete from public.expense_installment_plans where user_id = v_user_id;
    delete from public.recurring_expense_templates where user_id = v_user_id;
    delete from public.recurring_incomes where user_id = v_user_id;
    delete from public.cards where user_id = v_user_id;
    delete from public.months where user_id = v_user_id;
end;
$$;
