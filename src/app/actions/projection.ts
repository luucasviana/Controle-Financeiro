"use server"

import { createClient } from "@/lib/supabase/server"
import { getDashboardShellData } from "@/app/dashboard/data"
import { measureServerTiming } from "@/lib/server-timing"
import type { MonthData } from "./months"
import { buildInstallmentRowsToInsert, type InstallmentExpenseRow, type InstallmentPlanRow } from "./installment-scheduling"

export async function getProjection() {
    return measureServerTiming("get-projection", async () => {
        const supabase = await createClient() as any
        const { defaultMonth, userId } = await getDashboardShellData()
        if (!defaultMonth) return []

        const [{ data: incomes }, { data: templates }, { data: futureMonths }, { data: installmentPlans }, { data: installmentRows }] = await Promise.all([
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
            supabase
                .from("expense_installment_plans")
                .select("*")
                .eq("user_id", userId)
                .eq("is_active", true)
                .eq("is_archived", false)
                .order("created_at", { ascending: true }),
            supabase
                .from("month_expenses")
                .select("month_id, installment_plan_id, installment_number")
                .eq("user_id", userId)
                .not("installment_plan_id", "is", null),
        ])

        const months = (futureMonths || []) as MonthData[]
        if (months.length === 0) return []

        const totalIncome = (incomes || []).reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0)
        const templateExpense = (templates || []).reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0)
        const pendingInstallmentRows = buildInstallmentRowsToInsert(
            months,
            (installmentPlans || []) as InstallmentPlanRow[],
            (installmentRows || []) as InstallmentExpenseRow[]
        )
        const pendingInstallmentAmountByMonth = new Map<string, number>()

        for (const row of pendingInstallmentRows) {
            pendingInstallmentAmountByMonth.set(row.month_id, (pendingInstallmentAmountByMonth.get(row.month_id) || 0) + row.amount)
        }

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
            const projectedInstallments = pendingInstallmentAmountByMonth.get(month.id) || 0
            const expense = (totals?.isolatedExpenseAmount || 0) + generatedTemplateExpense + projectedInstallments

            return {
                monthLabel: month.name,
                income: totalIncome,
                expense,
                balance: totalIncome - expense,
            }
        })
    })
}
