"use server"

import { createClient } from "@/lib/supabase/server"
import { getDashboardContext } from "@/app/dashboard/data"
import { measureServerTiming } from "@/lib/server-timing"
import type { MonthData } from "./months"
import {
    buildRecurringExpenseRowsToInsert,
    type RecurringExpenseRow,
} from "./recurring-expense-scheduling"

export async function getProjection(monthId?: string) {
    return measureServerTiming("get-projection", async () => {
        const supabase = await createClient()
        const { activeMonth, userId } = await getDashboardContext(monthId)
        if (!activeMonth) return []

        const [{ data: futureMonths }, { data: plans }, { data: generated }] = await Promise.all([
            supabase
                .from("months")
                .select("*")
                .eq("user_id", userId)
                .gte("start_date", activeMonth.start_date)
                .order("start_date", { ascending: true }),
            supabase
                .from("recurring_expenses")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .eq("is_archived", false)
                .order("created_at", { ascending: true }),
            supabase
                .from("month_expenses")
                .select("month_id, recurring_expense_id, occurrence_number")
                .eq("user_id", userId)
                .not("recurring_expense_id", "is", null),
        ])

        const months = (futureMonths ?? []) as MonthData[]
        if (months.length === 0) return []

        const monthIds = months.map((month) => month.id)

        const [{ data: incomeRows }, { data: expenses }] = await Promise.all([
            supabase
                .from("month_incomes")
                .select("month_id, amount")
                .eq("user_id", userId)
                .in("month_id", monthIds),
            supabase
                .from("month_expenses")
                .select("month_id, amount, is_excluded")
                .eq("user_id", userId)
                .in("month_id", monthIds),
        ])

        const incomeByMonth = new Map<string, number>()
        for (const row of incomeRows ?? []) {
            incomeByMonth.set(row.month_id, (incomeByMonth.get(row.month_id) ?? 0) + row.amount)
        }

        // Despesas já lançadas. Respeita "fora do cálculo", igual ao dashboard.
        const expenseByMonth = new Map<string, number>()
        for (const row of expenses ?? []) {
            if (row.is_excluded) continue
            expenseByMonth.set(row.month_id, (expenseByMonth.get(row.month_id) ?? 0) + row.amount)
        }

        // Recorrências que ainda não viraram lançamento nesses meses.
        const pendingByMonth = new Map<string, number>()
        for (const row of buildRecurringExpenseRowsToInsert(
            months,
            (plans ?? []) as RecurringExpenseRow[],
            generated ?? []
        )) {
            pendingByMonth.set(row.month_id, (pendingByMonth.get(row.month_id) ?? 0) + row.amount)
        }

        return months.map((month) => {
            const income = incomeByMonth.get(month.id) ?? 0
            const expense =
                (expenseByMonth.get(month.id) ?? 0) + (pendingByMonth.get(month.id) ?? 0)

            return {
                monthLabel: month.name,
                income,
                expense,
                balance: income - expense,
            }
        })
    })
}
