"use server"

import { createClient } from "@/lib/supabase/server"
import { getOpenMonthOrLatest } from "./months"

export async function getProjection() {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Get incomes
    const { data: incomes } = await supabase.from("recurring_incomes").select("amount").eq("is_active", true)
    const totalIncome = (incomes || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)

    // Get templates
    const { data: templates } = await supabase.from("recurring_expense_templates").select("amount").eq("is_active", true)
    const templateExpense = (templates || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)

    const openMonth = await getOpenMonthOrLatest()
    if (!openMonth) return []

    // Get all months >= openMonth.start_date
    const { data: futureMonths } = await supabase
        .from("months")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_date", openMonth.start_date)
        .order("start_date", { ascending: true })

    const projection = []

    for (const m of (futureMonths || [])) {
        const { data: specificExpenses } = await supabase
            .from("month_expenses")
            .select("amount")
            .eq("month_id", m.id)
            .is("template_id", null)

        const isolatedExpenseAmount = (specificExpenses || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)

        let projectedExpense = isolatedExpenseAmount

        // Count generated expenses
        const { data: templateExpenses } = await supabase
            .from("month_expenses")
            .select("amount")
            .eq("month_id", m.id)
            .not("template_id", "is", null)

        if (templateExpenses && templateExpenses.length > 0) {
            projectedExpense += templateExpenses.reduce((acc: number, curr: any) => acc + curr.amount, 0)
        } else {
            // If templates weren't generated yet for this valid future month, just use current templates baseline
            projectedExpense += templateExpense
        }

        projection.push({
            monthLabel: m.name,
            income: totalIncome,
            expense: projectedExpense,
            balance: totalIncome - projectedExpense
        })
    }

    return projection
}
