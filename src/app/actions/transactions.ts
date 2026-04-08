"use server"

import { createClient } from "@/lib/supabase/server"
import { getOpenMonthOrLatest } from "./months"
import { revalidateDashboardData } from "./revalidation"

export async function createManualTransaction(formData: FormData) {
    const supabase = await createClient() as any
    const card_id = formData.get("card_id") as string
    const occurred_at = formData.get("occurred_at") as string
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const autoCreateExpense = formData.get("auto_create_expense") === "true"

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    let expenseId = null

    if (autoCreateExpense) {
        // Find which month to assign this expense. Try to find the month that matches the occurred_at date
        let targetMonthId = null
        const { data: matchingMonth } = await supabase
            .from("months")
            .select("id")
            .eq("user_id", user.id)
            .lte("start_date", occurred_at)
            .gte("end_date", occurred_at)
            .maybeSingle()

        if (matchingMonth) {
            targetMonthId = matchingMonth.id
        } else {
            // fallback to open month
            const openMonth = await getOpenMonthOrLatest()
            if (!openMonth) throw new Error("Ops! Você precisa ter pelo menos um mês financeiro criado para lançar despesas.")
            targetMonthId = openMonth.id
        }

        const { data: expense, error: expError } = await supabase.from("month_expenses").insert({
            user_id: user.id,
            month_id: targetMonthId,
            due_date: occurred_at,
            description,
            amount,
            status: 'PAID',
            payment_method: 'CREDIT_CARD',
            card_id,
            paid_at: new Date().toISOString()
        }).select().single()

        if (expError) throw new Error(expError.message)
        expenseId = expense.id
    }

    const { error: txError } = await supabase.from("card_transactions").insert({
        user_id: user.id,
        card_id,
        expense_id: expenseId,
        occurred_at,
        description,
        amount
    })

    if (txError) throw new Error(txError.message)

    revalidateDashboardData()
}
