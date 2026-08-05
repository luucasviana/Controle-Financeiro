-- ============================================================
-- Migração 2/2 — Unificar despesas recorrentes
-- Rodar UMA VEZ no SQL Editor do Supabase, DEPOIS da migração 1.
-- Reversível apenas por restore: faça backup antes.
--
-- DESVIO DELIBERADO em relação à Task 9 original: os quatro comandos
-- destrutivos que apagavam `recurring_expense_templates` e a coluna
-- `template_id` foram MOVIDOS para um bloco comentado no fim deste
-- arquivo, pendente de aval explícito do dono do projeto. Esta
-- migração, como está, é puramente aditiva/renomeadora: não apaga
-- tabela, coluna nem dado nenhum. Por isso `clean_user_data()` abaixo
-- também mantém a linha `delete from public.recurring_expense_templates`
-- — a tabela continua existindo depois desta migração, e removê-la do
-- reset de dados deixaria lixo órfão para trás.
-- ============================================================

begin;

-- 1. O plano de parcelamento vira o conceito geral de despesa recorrente.
alter table public.expense_installment_plans rename to recurring_expenses;
alter table public.recurring_expenses rename column total_installments to total_occurrences;

-- null = sem prazo definido (repete para sempre)
alter table public.recurring_expenses alter column total_occurrences drop not null;

-- 2. As colunas geradas em month_expenses acompanham o vocabulário novo.
alter table public.month_expenses rename column installment_plan_id to recurring_expense_id;
alter table public.month_expenses rename column installment_number to occurrence_number;
alter table public.month_expenses rename column installment_total to occurrence_total;

alter index if exists public.idx_month_expenses_user_month_installment
    rename to idx_month_expenses_user_month_recurring;
alter index if exists public.idx_month_expenses_user_month_installment_unique
    rename to idx_month_expenses_user_month_recurring_unique;
alter index if exists public.idx_expense_installment_plans_user_active_archived
    rename to idx_recurring_expenses_user_active_archived;

-- idx_month_expenses_user_month_recurring_unique é PARCIAL (where recurring_expense_id
-- is not null), então o Postgres não aceita ele como árbitro de ON CONFLICT a menos que
-- o WHERE seja repetido na cláusula — o supabase-js não tem como expressar isso. Sem um
-- índice não-parcial, o upsert de syncRecurringExpensesForUser (finance.ts) falha com
-- 42P10 assim que a primeira despesa recorrente for gerada. Nulos são distintos em
-- índice único, então despesas avulsas (recurring_expense_id null) continuam livres.
create unique index if not exists idx_month_expenses_user_month_recurring_arbiter
    on public.month_expenses (user_id, month_id, recurring_expense_id);

-- 3. Migra os templates (recorrência infinita) para dentro da tabela unificada.
--    Reaproveita o id do template para que month_expenses.template_id continue
--    apontando para o registro certo.
--    base_month_id: o mês mais antigo em que o template já gerou despesa; se
--    nunca gerou, o mês mais antigo do usuário.
insert into public.recurring_expenses (
    id, user_id, description, amount, due_day, total_occurrences,
    starts_in_current_month, is_active, is_archived, base_month_id, created_at
)
select
    t.id,
    t.user_id,
    t.description,
    t.amount,
    t.day_of_month,
    null,
    true,
    t.is_active,
    false,
    coalesce(
        (
            select m.id
            from public.months m
            join public.month_expenses me
                on me.month_id = m.id
               and me.template_id = t.id
            where m.user_id = t.user_id
            order by m.start_date asc
            limit 1
        ),
        (
            select m2.id
            from public.months m2
            where m2.user_id = t.user_id
            order by m2.start_date asc
            limit 1
        )
    ),
    t.created_at
from public.recurring_expense_templates t;

-- 4. Reaponta as despesas já geradas por template.
update public.month_expenses
set recurring_expense_id = template_id
where template_id is not null
  and recurring_expense_id is null;

-- 5. Numera as ocorrências dessas despesas em ordem cronológica de mês.
--    Sem isso elas ficariam com occurrence_number nulo e a próxima geração
--    começaria do 1 de novo.
with numbered as (
    select
        me.id,
        row_number() over (
            partition by me.user_id, me.recurring_expense_id
            order by m.start_date asc
        ) as n
    from public.month_expenses me
    join public.months m on m.id = me.month_id
    where me.template_id is not null
)
update public.month_expenses me
set occurrence_number = numbered.n
from numbered
where numbered.id = me.id;

-- 6. A limpeza de dados passa a conhecer o conceito unificado de despesa
--    recorrente, mas AINDA precisa limpar `recurring_expense_templates`:
--    essa tabela não foi apagada nesta migração (ver bloco pendente de
--    aval no fim do arquivo), então removê-la do reset deixaria lixo
--    órfão para trás.
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
    delete from public.recurring_expenses where user_id = v_user_id;
    delete from public.month_incomes where user_id = v_user_id;
    delete from public.income_sources where user_id = v_user_id;
    delete from public.cards where user_id = v_user_id;
    delete from public.months where user_id = v_user_id;
end;
$$;

commit;

-- ============================================================
-- CONFERÊNCIA (rodar depois do commit):
-- 1) Nenhuma despesa gerada pode ter ficado órfã:
--    select count(*) from public.month_expenses me
--    left join public.recurring_expenses re on re.id = me.recurring_expense_id
--    where me.recurring_expense_id is not null and re.id is null;
--    -> tem que ser 0
--
-- 2) As recorrências sem prazo devem ter mês base:
--    select description, total_occurrences, base_month_id
--    from public.recurring_expenses where total_occurrences is null;
--    -> nenhum base_month_id nulo
-- ============================================================

-- ============================================================
-- PENDENTE DE AVAL — NÃO EXECUTAR sem aprovação explícita do dono do
-- projeto. Estes quatro comandos apagam de vez o conceito antigo de
-- template de recorrência (tabela e coluna). A ordem importa: derrubar
-- a coluna primeiro remove a foreign key que impediria o drop da
-- tabela. Só descomente e rode depois de confirmar, com a CONFERÊNCIA
-- acima, que a migração dos templates para `recurring_expenses` foi
-- bem-sucedida.
--
-- drop index if exists public.idx_month_expenses_user_month_template_unique;
-- drop index if exists public.idx_month_expenses_user_month_template;
-- alter table public.month_expenses drop column if exists template_id;
-- drop table if exists public.recurring_expense_templates;
-- ============================================================
