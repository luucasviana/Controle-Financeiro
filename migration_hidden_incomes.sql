-- Migration: Adicionar suporte a Receitas Ocultas
-- Data: 2026-02-21

-- 1) Adicionar coluna is_hidden à tabela recurring_incomes
ALTER TABLE recurring_incomes
    ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- 2) Índice para performance nas queries de dashboard
CREATE INDEX IF NOT EXISTS idx_recurring_incomes_user_active_hidden
    ON recurring_incomes (user_id, is_active, is_hidden);

-- Nenhuma alteração de RLS necessária:
-- A política existente já cobre user_id = auth.uid() para todas as colunas.
