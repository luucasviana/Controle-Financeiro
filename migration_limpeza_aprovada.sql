-- ============================================================
-- Limpeza aprovada pelo dono do projeto.
--
-- As duas migrações anteriores deixaram sobras de propósito, porque a
-- regra na época era não apagar nada sem consentimento explícito. Ele
-- revisou e liberou. Este arquivo executa o que estava pendente.
--
-- Estado verificado imediatamente antes de rodar:
--   recurring_expense_templates ............ 0 linhas
--   month_expenses.template_id ............. nulo em todas as linhas
--   income_sources.amount .................. só a conta de teste tinha
--                                            valor; salvo em
--                                            RESTORE-income_sources-amount.txt
--
-- Rodar UMA VEZ. É irreversível.
-- ============================================================

begin;

-- 1. A etiqueta antiga nas despesas e seus índices.
--    A ordem importa: a coluna tem chave estrangeira para a tabela que
--    será derrubada no passo 2, então ela precisa sair primeiro.
drop index if exists public.idx_month_expenses_user_month_template_unique;
drop index if exists public.idx_month_expenses_user_month_template;
alter table public.month_expenses drop column if exists template_id;

-- 2. A gaveta antiga de despesas fixas, absorvida por recurring_expenses.
drop table if exists public.recurring_expense_templates;

-- 3. O valor antigo da receita, que hoje mora em month_incomes por período.
alter table public.income_sources drop column if exists amount;

-- 4. A função de limpar dados não pode mais citar a tabela derrubada —
--    sem isto, o botão "Limpar meus dados" quebraria em tempo de execução.
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

commit;

-- ============================================================
-- CONFERÊNCIA (rodar depois do commit):
--
-- select count(*) from information_schema.tables
--  where table_schema='public' and table_name='recurring_expense_templates';
-- -> 0
--
-- select count(*) from information_schema.columns
--  where table_schema='public'
--    and ((table_name='month_expenses' and column_name='template_id')
--      or (table_name='income_sources' and column_name='amount'));
-- -> 0
--
-- E os dados preservados:
-- select (select count(*) from public.months) as periodos,
--        (select count(*) from public.month_incomes) as receitas,
--        (select count(*) from public.income_sources) as fontes;
-- -> 6, 16, 4
-- ============================================================
