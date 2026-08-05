"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "./auth-context"

export type MonthIncomeEntry = {
    source_id: string
    amount: number
}

export type IncomeEditorRow = {
    source_id: string
    description: string
    is_hidden: boolean
    amount: number
}

export async function getIncomeEditorRows(monthId?: string): Promise<IncomeEditorRow[]> {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const [sourcesResult, monthsResult, incomesResult] = await Promise.all([
        supabase
            .from("income_sources")
            .select("id, description, is_active, is_hidden")
            .eq("user_id", userId)
            .order("description"),
        supabase
            .from("months")
            .select("id, start_date")
            .eq("user_id", userId),
        supabase
            .from("month_incomes")
            .select("month_id, source_id, amount")
            .eq("user_id", userId),
    ])

    if (sourcesResult.error) throw new Error(sourcesResult.error.message)
    if (monthsResult.error) throw new Error(monthsResult.error.message)
    if (incomesResult.error) throw new Error(incomesResult.error.message)

    const sources = sourcesResult.data ?? []
    const incomes = incomesResult.data ?? []
    const startDateByMonthId = new Map((monthsResult.data ?? []).map((m) => [m.id, m.start_date]))

    // Valor da fonte no mês pedido.
    const amountInTargetMonth = new Map<string, number>()
    // Valor da fonte no mês mais recente em que ela apareceu (fallback do "puxa do último").
    const latestKnown = new Map<string, { startDate: string; amount: number }>()

    for (const row of incomes) {
        if (monthId && row.month_id === monthId) {
            amountInTargetMonth.set(row.source_id, row.amount)
        }

        const startDate = startDateByMonthId.get(row.month_id)
        if (!startDate) continue
        if (monthId && row.month_id === monthId) continue

        const current = latestKnown.get(row.source_id)
        if (!current || startDate > current.startDate) {
            latestKnown.set(row.source_id, { startDate, amount: row.amount })
        }
    }

    return sources
        .filter((source) => source.is_active || amountInTargetMonth.has(source.id))
        .map((source) => ({
            source_id: source.id,
            description: source.description,
            is_hidden: source.is_hidden,
            amount:
                amountInTargetMonth.get(source.id) ??
                latestKnown.get(source.id)?.amount ??
                0,
        }))
}

export async function saveMonthIncomes(monthId: string, entries: MonthIncomeEntry[]) {
    if (entries.length === 0) return

    const supabase = await createClient()
    const userId = await getCurrentUserId()

    for (const entry of entries) {
        if (!Number.isFinite(entry.amount) || entry.amount < 0) {
            throw new Error("Informe um valor de receita válido (zero ou positivo).")
        }
    }

    const { error } = await supabase.from("month_incomes").upsert(
        entries.map((entry) => ({
            user_id: userId,
            month_id: monthId,
            source_id: entry.source_id,
            amount: entry.amount,
        })),
        { onConflict: "user_id,month_id,source_id" }
    )

    if (error) throw new Error(error.message)
}
