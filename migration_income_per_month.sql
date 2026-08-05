-- ============================================================
-- Migração 1/2 — Receita por mês (histórico real)
-- Rodar UMA VEZ no SQL Editor do Supabase.
-- Reversível apenas por restore: faça backup antes.
--
-- NOTA: esta versão da migração NÃO derruba a coluna
-- public.income_sources.amount. O comando que faria isso está
-- comentado no bloco "COMANDOS DESTRUTIVOS PENDENTES DE AVAL" no
-- final deste arquivo, aguardando aprovação explícita do dono do
-- projeto antes de ser executado. Até lá, o banco real terá a
-- coluna `amount` a mais em relação ao schema-alvo descrito em
-- `supabase.sql` (que já reflete o estado sem essa coluna). Essa
-- divergência é intencional e documentada.
-- ============================================================

begin;

-- 1. A tabela de receitas passa a representar só a FONTE (quem paga),
--    não o valor. O valor vira histórico mês a mês.
alter table public.recurring_incomes rename to income_sources;

alter index if exists public.idx_recurring_incomes_user_active_hidden
    rename to idx_income_sources_user_active_hidden;

-- 2. Valor de cada fonte em cada mês.
create table if not exists public.month_incomes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    month_id uuid not null references public.months(id) on delete cascade,
    source_id uuid not null references public.income_sources(id) on delete cascade,
    amount numeric(12,2) not null default 0,
    created_at timestamptz not null default now(),
    unique (user_id, month_id, source_id)
);

create index if not exists idx_month_incomes_user_month
    on public.month_incomes (user_id, month_id);
create index if not exists idx_month_incomes_source
    on public.month_incomes (source_id);

alter table public.month_incomes enable row level security;

drop policy if exists "Users can manage their own month incomes" on public.month_incomes;
create policy "Users can manage their own month incomes"
    on public.month_incomes
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- 3. BACKFILL. Cada mês que já existe recebe uma cópia do valor atual de
--    cada fonte ATIVA. Só as ativas, porque só elas contam no dashboard
--    hoje — assim os números depois da migração ficam idênticos aos de antes.
insert into public.month_incomes (user_id, month_id, source_id, amount)
select m.user_id, m.id, s.id, s.amount
from public.months m
join public.income_sources s
    on s.user_id = m.user_id
   and s.is_active = true
on conflict (user_id, month_id, source_id) do nothing;

-- 4. A limpeza de dados precisa conhecer as tabelas novas.
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
    delete from public.month_incomes where user_id = v_user_id;
    delete from public.income_sources where user_id = v_user_id;
    delete from public.cards where user_id = v_user_id;
    delete from public.months where user_id = v_user_id;
end;
$$;

commit;

-- ============================================================
-- COMANDOS DESTRUTIVOS PENDENTES DE AVAL — NÃO EXECUTAR SEM
-- CONFIRMAÇÃO EXPLÍCITA DO DONO DO PROJETO.
--
-- O passo abaixo derrubaria a coluna `amount` de
-- `public.income_sources` (o valor já foi copiado para
-- `month_incomes` no backfill acima, então a coluna fica
-- redundante, mas apagar uma coluna é uma perda de dado
-- irreversível fora de um backup). Ninguém rodou este comando
-- ainda. Descomente e execute manualmente só depois de validar o
-- backfill com a query de CONFERÊNCIA abaixo e de ter um backup.
-- ============================================================
-- alter table public.income_sources drop column if exists amount;

-- ============================================================
-- CONFERÊNCIA (rodar depois do commit, fora da transação):
-- O total de cada mês deve bater com a "Receita do Mês" que o
-- dashboard mostrava antes da migração.
-- ============================================================
-- select m.name, m.start_date, sum(mi.amount) as receita
-- from public.months m
-- left join public.month_incomes mi on mi.month_id = m.id
-- group by m.id, m.name, m.start_date
-- order by m.start_date;
