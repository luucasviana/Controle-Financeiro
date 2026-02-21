-- Migration: Despesas "Fora do cálculo"
-- Data: 2026-02-21

-- 1) Adicionar coluna is_excluded à tabela month_expenses
ALTER TABLE month_expenses
    ADD COLUMN IF NOT EXISTS is_excluded boolean NOT NULL DEFAULT false;

-- 2) Índice para consultas de métricas (filtrará is_excluded=false)
CREATE INDEX IF NOT EXISTS idx_month_expenses_user_month_excluded
    ON month_expenses (user_id, month_id, is_excluded);

-- Nenhuma alteração de RLS necessária.
