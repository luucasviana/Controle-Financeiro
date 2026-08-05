-- ============================================================
-- Método de pagamento provável na despesa recorrente.
--
-- Ao cadastrar uma recorrência, o usuário informa como pretende pagá-la.
-- Isso NÃO é gravado na despesa gerada: ela continua nascendo prevista e
-- sem método, porque a "Composição do período" mede o que já saiu, e uma
-- despesa prevista com método definido entraria em "À vista" antes da
-- hora (o cálculo de à vista não filtra por status).
--
-- O valor guardado aqui serve só para pré-selecionar o método quando o
-- usuário marca a despesa como paga.
--
-- Rodar UMA VEZ. Aditivo — não apaga nada.
-- ============================================================

begin;

alter table public.recurring_expenses
    add column if not exists payment_method public.payment_method not null default 'NONE';

-- on delete set null: apagar um cartão não pode derrubar a recorrência,
-- só esvaziar a sugestão. O usuário escolhe o cartão na hora de pagar.
alter table public.recurring_expenses
    add column if not exists card_id uuid null references public.cards(id) on delete set null;

commit;

-- ============================================================
-- CONFERÊNCIA:
-- select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--  where table_schema='public' and table_name='recurring_expenses'
--    and column_name in ('payment_method','card_id');
-- ============================================================
