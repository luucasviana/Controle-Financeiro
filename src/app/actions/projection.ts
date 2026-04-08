"use server"

import { createClient } from "@/lib/supabase/server"
import { getDashboardShellData } from "@/app/dashboard/data"
import { measureServerTiming } from "@/lib/server-timing"
import type { MonthData } from "./months"

export async function getProjection() {
    return measureServerTiming("get-projection", async () => {
        const supabase = await createClient() as any
        const { defaultMonth, userId } = await getDashboardShellData()
        if (!defaultMonth) return []

        const [{ data: incomes }, { data: templates }, { data: futureMonths }] = await Promise.all([
            supabase
                .from("recurring_incomes")
                .select("amount")
                .eq("user_id", userId)
                .eq("is_active", true),
            supabase
                .from("recurring_expense_templates")
                .select("amount")
                .eq("user_id", userId)
                .eq("is_active", true),
            supabase
                .from("months")
                .select("*")
                .eq("user_id", userId)
                .gte("start_date", defaultMonth.start_date)
                .order("start_date", { ascending: true }),
        ])

        const months = (futureMonths || []) as MonthData[]
        if (months.length === 0) return []

        const totalIncome = (incomes || []).reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0)
        const templateExpense = (templates || []).reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0)
        const monthIds = months.map((month: { id: string }) => month.id)
        const { data: expenses } = await supabase
            .from("month_expenses")
            .select("month_id, amount, template_id")
            .eq("user_id", userId)
            .in("month_id", monthIds)

        const expensesByMonth = new Map<string, { isolatedExpenseAmount: number; templateExpenseAmount: number; hasGeneratedTemplate: boolean }>()

        for (const month of months) {
            expensesByMonth.set(month.id, {
                isolatedExpenseAmount: 0,
                templateExpenseAmount: 0,
                hasGeneratedTemplate: false,
            })
        }

        for (const expense of expenses || []) {
            const current = expensesByMonth.get(expense.month_id)
            if (!current) continue

            if (expense.template_id) {
                current.templateExpenseAmount += expense.amount
                current.hasGeneratedTemplate = true
            } else {
                current.isolatedExpenseAmount += expense.amount
            }
        }

        return months.map((month) => {
            const totals = expensesByMonth.get(month.id)
            const generatedTemplateExpense = totals?.hasGeneratedTemplate ? totals.templateExpenseAmount : templateExpense
            const expense = (totals?.isolatedExpenseAmount || 0) + generatedTemplateExpense

            return {
                monthLabel: month.name,
                income: totalIncome,
                expense,
                balance: totalIncome - expense,
            }
        })
    })
}
