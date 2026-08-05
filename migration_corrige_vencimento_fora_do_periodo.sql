-- ============================================================
-- Corrige lançamentos de recorrência com vencimento fora do período.
--
-- O cálculo antigo (`getMonthDueDate`) montava a data usando o mês em que
-- o período COMEÇA, ignorando que os períodos deste app não são meses de
-- calendário. Num período de 10/09 a 09/10, uma recorrência com dia 9
-- gerava 09/09 — um dia antes do período começar.
--
-- O código já foi corrigido: agora a data é a ocorrência do dia que cai
-- dentro de [start_date, end_date]. Este arquivo conserta o que já havia
-- sido gerado errado.
--
-- Estado verificado antes de rodar:
--   16 lançamentos com vencimento fora do período
--   todos gerados por recorrência (nenhum criado à mão)
--   todos ANTES do início (nenhum depois do fim)
--   nenhum já pago
--   somar 1 mês coloca os 16 dentro do período correto
--
-- Rodar UMA VEZ. É idempotente: depois da primeira execução nenhuma
-- linha casa mais com as condições.
-- ============================================================

begin;

update public.month_expenses e
set due_date = (e.due_date + interval '1 month')::date
from public.months m
where m.id = e.month_id
  -- Só o que a função gerou. Data escolhida à mão pelo usuário é intenção
  -- dele, mesmo que caia fora do período — não é nosso papel mexer.
  and e.recurring_expense_id is not null
  -- Só o sintoma do bug: a data ficou antes do período começar.
  and e.due_date < m.start_date
  -- Trava de segurança: só corrige se o resultado de fato cair dentro do
  -- período. Sem isto, um caso não previsto poderia trocar uma data errada
  -- por outra data errada.
  and (e.due_date + interval '1 month')::date between m.start_date and m.end_date;

commit;

-- ============================================================
-- CONFERÊNCIA (rodar depois do commit):
--
-- select count(*) as fora_do_periodo
--   from public.month_expenses e
--   join public.months m on m.id = e.month_id
--  where e.due_date < m.start_date or e.due_date > m.end_date;
-- -> 0
-- ============================================================
