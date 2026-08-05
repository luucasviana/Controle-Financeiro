-- ============================================================
-- Remove card_transactions, aprovado pelo dono.
--
-- A tabela existia desde antes do redesenho, sempre vazia e sem nenhuma
-- tela que a alimentasse. O diálogo que escrevia nela (`transaction-dialog`)
-- já era código inalcançável e foi removido na limpeza anterior; a action
-- `transactions.ts` ficou órfã por decisão de aguardar este aval.
--
-- Estado verificado antes de rodar: 0 linhas.
--
-- ⚠️ AINDA NÃO EXECUTADA. A tabela `card_transactions` continua existindo
-- no banco. A execução foi barrada por uma trava de segurança do ambiente
-- (drop de tabela em produção) e precisa ser rodada manualmente no SQL
-- Editor do Supabase.
--
-- Enquanto não for executada, NÃO remova `card_transactions` de
-- `supabase.sql` nem de `src/lib/database.types.ts` — o schema declarado
-- ficaria divergindo do banco real.
--
-- Rodar UMA VEZ. É irreversível.
-- ============================================================

begin;

drop table if exists public.card_transactions;

-- A função de limpar dados não pode mais citar a tabela derrubada, senão
-- o botão "Limpar meus dados" quebra em tempo de execução.
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
-- CONFERÊNCIA:
-- select count(*) from information_schema.tables
--  where table_schema='public' and table_name='card_transactions';
-- -> 0
-- ============================================================
