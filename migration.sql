-- Migração: Transição para o modelo de "Snapshot" do consumo do cartão

-- 1) Criar nova tabela: card_month_balances (snapshot do consumo)
CREATE TABLE card_month_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    month_id UUID NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    amount_current NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_on DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, card_id, month_id)
);

-- 2) RLS Roles
ALTER TABLE card_month_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own card balances" 
ON card_month_balances FOR ALL 
USING (user_id = auth.uid());

-- 3) Índices para melhorar leitura em cards e dashboard
CREATE INDEX idx_card_month_balances_card_month ON card_month_balances (card_id, month_id);
CREATE INDEX idx_card_month_balances_user_month ON card_month_balances (user_id, month_id);

-- 4) Atualizar a função clean_user_data para cobrir a nova tabela
CREATE OR REPLACE FUNCTION clean_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    DELETE FROM card_transactions WHERE user_id = v_user_id;
    DELETE FROM card_month_balances WHERE user_id = v_user_id;
    DELETE FROM month_expenses WHERE user_id = v_user_id;
    DELETE FROM recurring_expense_templates WHERE user_id = v_user_id;
    DELETE FROM recurring_incomes WHERE user_id = v_user_id;
    DELETE FROM cards WHERE user_id = v_user_id;
    DELETE FROM months WHERE user_id = v_user_id;
END;
$$;

-- 5) (OPCIONAL) Migração best-effort para migrar histórico antigo das transações para o novo snapshot.
-- Execute caso queira que meses passados não fiquem zerados no histórico de cartões:
-- INSERT INTO card_month_balances (user_id, card_id, month_id, amount_current, updated_on)
-- SELECT 
--     user_id, 
--     card_id, 
--     (SELECT month_id FROM month_expenses WHERE id = ct.expense_id LIMIT 1),
--     SUM(amount),
--     MAX(occurred_at)
-- FROM card_transactions ct
-- WHERE expense_id IS NOT NULL 
-- GROUP BY user_id, card_id, (SELECT month_id FROM month_expenses WHERE id = ct.expense_id LIMIT 1);

