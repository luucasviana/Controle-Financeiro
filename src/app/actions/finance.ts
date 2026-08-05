"use server"

import { cache } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "./auth-context"
import type { MonthData } from "./months"
import { sortExpenses } from "@/lib/utils"
import { revalidateDashboardData } from "./revalidation"
import { Database } from "@/lib/database.types"
import { measureServerTiming } from "@/lib/server-timing"
import {
    buildRecurringExpenseRowsToInsert,
    type RecurringExpenseRow,
} from "./recurring-expense-scheduling"

type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]
type CardBalanceRow = {
    id: string
    user_id: string
    card_id: string
    month_id: string
    amount_current: number
    updated_on: string
    updated_at: string
}

type IncomeSummary = {
    incomeVisible: number
    incomeTotalForBalance: number
}

type MonthFinanceSnapshot = IncomeSummary & {
    expenses: ExpenseRow[]
    totalExpense: number
    totalCashExpense: number
    totalCreditCardExpense: number
    projectedBalance: number
}

const getHiddenSourceIds = cache(async (userId: string): Promise<Set<string>> => {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("income_sources")
        .select("id")
        .eq("user_id", userId)
        .eq("is_hidden", true)

    if (error) throw new Error(error.message)

    return new Set((data ?? []).map((source) => source.id))
})

const getIncomeSummaryForMonth = cache(
    async (userId: string, monthId: string): Promise<IncomeSummary> => {
        const supabase = await createClient()
        const [hiddenSourceIds, { data: rows, error }] = await Promise.all([
            getHiddenSourceIds(userId),
            supabase
                .from("month_incomes")
                .select("source_id, amount")
                .eq("user_id", userId)
                .eq("month_id", monthId),
        ])

        if (error) throw new Error(error.message)

        let incomeVisible = 0
        let incomeTotalForBalance = 0

        for (const row of rows ?? []) {
            incomeTotalForBalance += row.amount
            if (!hiddenSourceIds.has(row.source_id)) {
                incomeVisible += row.amount
            }
        }

        return { incomeVisible, incomeTotalForBalance }
    }
)

const getMonthRows = cache(async (userId: string, monthId: string) => {
    const supabase = await createClient() as any
    const [{ data: expenses }, { data: monthBalances }] = await Promise.all([
        supabase
            .from("month_expenses")
            .select("*")
            .eq("user_id", userId)
            .eq("month_id", monthId),
        supabase
            .from("card_month_balances")
            .select("*")
            .eq("user_id", userId)
            .eq("month_id", monthId),
    ])

    return {
        expenses: (expenses || []) as ExpenseRow[],
        monthBalances: (monthBalances || []) as CardBalanceRow[],
    }
})

const getMonthFinanceSnapshot = cache(async (userId: string, monthId: string): Promise<MonthFinanceSnapshot> => {
    const [{ incomeVisible, incomeTotalForBalance }, { expenses, monthBalances }] = await Promise.all([
        getIncomeSummaryForMonth(userId, monthId),
        getMonthRows(userId, monthId),
    ])

    const sortedExpenses = sortExpenses(expenses)
    const includedExpenses = sortedExpenses.filter((expense) =>
        !(expense.status === "PAID" && expense.payment_method === "CREDIT_CARD") && !expense.is_excluded
    )
    const totalExpensesNonCard = includedExpenses.reduce((acc, curr) => acc + curr.amount, 0)
    const totalCreditCardExpense = monthBalances.reduce((acc, curr) => acc + curr.amount_current, 0)
    const totalExpense = totalExpensesNonCard + totalCreditCardExpense
    const totalCashExpense = sortedExpenses
        .filter((expense) =>
            ["PIX", "DEBIT", "CASH"].includes(expense.payment_method) && !expense.is_excluded
        )
        .reduce((acc, curr) => acc + curr.amount, 0)

    return {
        incomeVisible,
        incomeTotalForBalance,
        expenses: sortedExpenses,
        totalExpense,
        totalCashExpense,
        totalCreditCardExpense,
        projectedBalance: incomeTotalForBalance - totalExpense,
    }
})

export async function syncRecurringExpensesForUser(userId: string) {
    return measureServerTiming("sync-recurring-expenses", async () => {
        const supabase = await createClient()
        const [{ data: months }, { data: plans }, { data: generated }] = await Promise.all([
            supabase
                .from("months")
                .select("id, start_date, end_date")
                .eq("user_id", userId)
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

        const insertRows = buildRecurringExpenseRowsToInsert(
            months ?? [],
            (plans ?? []) as RecurringExpenseRow[],
            generated ?? []
        )

        if (insertRows.length === 0) {
            return 0
        }

        // ignoreDuplicates: duas abas podem sincronizar ao mesmo tempo. O índice
        // único (user_id, month_id, recurring_expense_id) barra a duplicata; sem
        // isso um único conflito derrubaria o lote inteiro.
        const { error } = await supabase
            .from("month_expenses")
            .upsert(insertRows, {
                onConflict: "user_id,month_id,recurring_expense_id",
                ignoreDuplicates: true,
            })

        if (error) {
            throw new Error(error.message)
        }

        revalidateDashboardData()
        return insertRows.length
    })
}

export async function syncRecurringExpensesForMonth(_monthId: string) {
    const userId = await getCurrentUserId()
    const insertedCount = await syncRecurringExpensesForUser(userId)

    return { insertedCount }
}

export async function getDashboardData(month: MonthData) {
    return measureServerTiming("get-dashboard-data", async () => {
        const userId = await getCurrentUserId()
        const snapshot = await getMonthFinanceSnapshot(userId, month.id)

        return {
            incomeVisible: snapshot.incomeVisible,
            incomeTotalForBalance: snapshot.incomeTotalForBalance,
            totalIncome: snapshot.incomeVisible,
            totalExpense: snapshot.totalExpense,
            projectedBalance: snapshot.projectedBalance,
            totalCashExpense: snapshot.totalCashExpense,
            totalCreditCardExpense: snapshot.totalCreditCardExpense,
            expenses: snapshot.expenses,
        }
    })
}

export async function createMonthExpense(formData: FormData) {
    const supabase = await createClient()
    const month_id = formData.get("month_id") as string
    let due_date = formData.get("due_date") as string
    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))

    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Informe um valor de despesa válido.")
    }
    const status = formData.get("status") as "PLANNED" | "PAID"
    let payment_method = formData.get("payment_method") as "NONE" | "PIX" | "DEBIT" | "CASH" | "CREDIT_CARD"
    let card_id = (formData.get("card_id") as string) || null
    let paid_at = (formData.get("paid_at") as string) || null
    const recurring_expense_id = (formData.get("recurring_expense_id") as string) || null
    const hiddenModeEnabled = formData.get("hidden_mode_enabled") === "true"
    const is_excluded = hiddenModeEnabled && formData.get("is_excluded") === "true"

    if (status === "PLANNED") {
        payment_method = "NONE"
        card_id = null
        paid_at = null
    } else {
        if (!payment_method || payment_method === "NONE") {
            throw new Error("Método de pagamento é obrigatório para despesas pagas.")
        }
        if (payment_method === "CREDIT_CARD" && !card_id) {
            throw new Error("O cartão é obrigatório para pagamentos via crédito.")
        }
        if (!paid_at) {
            paid_at = new Date().toISOString()
        }
    }

    const userId = await getCurrentUserId()

    if (!due_date) {
        const { data: monthData } = await supabase
            .from("months")
            .select("start_date")
            .eq("user_id", userId)
            .eq("id", month_id)
            .single()

        due_date = monthData ? monthData.start_date : format(new Date(), "yyyy-MM-dd")
    }

    const { error } = await supabase.from("month_expenses").insert({
        user_id: userId,
        month_id,
        due_date,
        description,
        amount,
        status,
        payment_method,
        card_id,
        paid_at,
        recurring_expense_id,
        is_excluded,
    })

    if (error) {
        throw new Error(error.message)
    }

    revalidateDashboardData()
}

export async function updateMonthExpense(formData: FormData) {
    const supabase = await createClient()
    const expenseId = formData.get("expense_id") as string
    const month_id = formData.get("month_id") as string
    const due_date = formData.get("due_date") as string
    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))

    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Informe um valor de despesa válido.")
    }
    const status = formData.get("status") as "PLANNED" | "PAID"
    let paymentMethod = formData.get("payment_method") as "NONE" | "PIX" | "DEBIT" | "CASH" | "CREDIT_CARD"
    let cardId = (formData.get("card_id") as string) || null
    let paidAt = (formData.get("paid_at") as string) || null
    const hiddenModeEnabled = formData.get("hidden_mode_enabled") === "true"
    const isExcludedRaw = formData.get("is_excluded")
    const shouldUpdateExcluded = hiddenModeEnabled && isExcludedRaw !== null

    if (status === "PLANNED") {
        paymentMethod = "NONE"
        cardId = null
        paidAt = null
    } else {
        if (!paymentMethod || paymentMethod === "NONE") {
            throw new Error("Método de pagamento é obrigatório para despesas pagas.")
        }
        if (paymentMethod === "CREDIT_CARD" && !cardId) {
            throw new Error("O cartão é obrigatório para pagamentos via crédito.")
        }
        if (!paidAt) {
            paidAt = new Date().toISOString()
        }
    }

    const userId = await getCurrentUserId()
    const { data: expense } = await supabase
        .from("month_expenses")
        .select("id")
        .eq("user_id", userId)
        .eq("id", expenseId)
        .single()

    if (!expense) {
        throw new Error("Expense not found")
    }

    const updatePayload: Database["public"]["Tables"]["month_expenses"]["Update"] = {
        month_id,
        due_date,
        description,
        amount,
        status,
        payment_method: paymentMethod,
        card_id: cardId,
        paid_at: paidAt,
    }

    if (shouldUpdateExcluded) {
        updatePayload.is_excluded = isExcludedRaw === "true"
    }

    const { error } = await supabase
        .from("month_expenses")
        .update(updatePayload)
        .eq("id", expenseId)
        .eq("user_id", userId)

    if (error) {
        throw new Error(error.message)
    }

    revalidateDashboardData()
}

export async function deleteMonthExpense(expenseId: string) {
    const supabase = await createClient() as any
    const userId = await getCurrentUserId()
    const { error } = await supabase
        .from("month_expenses")
        .delete()
        .eq("user_id", userId)
        .eq("id", expenseId)

    if (error) {
        throw new Error(error.message)
    }

    revalidateDashboardData()
}

export async function getMetricsForMonths(months: MonthData[]) {
    return measureServerTiming("get-metrics-for-months", async () => {
        if (months.length === 0) {
            return []
        }

        const userId = await getCurrentUserId()
        const monthIds = months.map((month) => month.id)
        const supabase = await createClient()
        const [hiddenSourceIds, { data: expenses }, { data: monthBalances }, { data: incomeRows }] =
            await Promise.all([
                getHiddenSourceIds(userId),
                supabase
                    .from("month_expenses")
                    .select("month_id, amount, status, payment_method, is_excluded")
                    .eq("user_id", userId)
                    .in("month_id", monthIds),
                supabase
                    .from("card_month_balances")
                    .select("month_id, amount_current")
                    .eq("user_id", userId)
                    .in("month_id", monthIds),
                supabase
                    .from("month_incomes")
                    .select("month_id, source_id, amount")
                    .eq("user_id", userId)
                    .in("month_id", monthIds),
            ])

        const expensesByMonth = new Map<string, Array<Pick<ExpenseRow, "month_id" | "amount" | "status" | "payment_method" | "is_excluded">>>()
        const balancesByMonth = new Map<string, Array<{ amount_current: number }>>()

        for (const expense of expenses || []) {
            const current = expensesByMonth.get(expense.month_id) || []
            current.push(expense)
            expensesByMonth.set(expense.month_id, current)
        }

        for (const balance of monthBalances || []) {
            const current = balancesByMonth.get(balance.month_id) || []
            current.push(balance)
            balancesByMonth.set(balance.month_id, current)
        }

        const incomeByMonth = new Map<string, { visible: number; total: number }>()

        for (const row of incomeRows ?? []) {
            const current = incomeByMonth.get(row.month_id) ?? { visible: 0, total: 0 }
            current.total += row.amount
            if (!hiddenSourceIds.has(row.source_id)) {
                current.visible += row.amount
            }
            incomeByMonth.set(row.month_id, current)
        }

        return months.map((month) => {
            const monthExpenses = expensesByMonth.get(month.id) || []
            const includedExpenses = monthExpenses.filter((expense) =>
                !(expense.status === "PAID" && expense.payment_method === "CREDIT_CARD") && !expense.is_excluded
            )
            const totalExpensesNonCard = includedExpenses.reduce((acc, curr) => acc + curr.amount, 0)
            const monthCardBalances = balancesByMonth.get(month.id) || []
            const cardTotal = monthCardBalances.reduce((acc, curr) => acc + curr.amount_current, 0)
            const totalExpense = totalExpensesNonCard + cardTotal
            const monthIncome = incomeByMonth.get(month.id) ?? { visible: 0, total: 0 }

            return {
                monthId: month.id,
                monthName: month.name,
                start_date: month.start_date,
                income_visible: monthIncome.visible,
                income_total: monthIncome.total,
                total_expenses: totalExpense,
                projected_balance: monthIncome.total - totalExpense,
            }
        })
    })
}

export async function getCardTotalsAllTime() {
    const userId = await getCurrentUserId()
    const supabase = await createClient() as any
    const { data: balances, error } = await supabase
        .from("card_month_balances")
        .select("card_id, amount_current, cards(name)")
        .eq("user_id", userId)

    if (error) {
        throw new Error(error.message)
    }

    const totalsMap: Record<string, { card_id: string; card_name: string; total: number }> = {}

    for (const row of balances || []) {
        const cardId = row.card_id
        const cardName = row.cards?.name ?? "Sem nome"
        const amount = row.amount_current ?? 0

        if (!totalsMap[cardId]) {
            totalsMap[cardId] = { card_id: cardId, card_name: cardName, total: 0 }
        }

        totalsMap[cardId].total += amount
    }

    return Object.values(totalsMap).sort((a, b) => b.total - a.total)
}

export async function getWaterfallData(monthId: string) {
    const userId = await getCurrentUserId()
    const snapshot = await getMonthFinanceSnapshot(userId, monthId)

    return {
        income: snapshot.incomeTotalForBalance,
        cash_expenses: snapshot.totalCashExpense,
        cards_total: snapshot.totalCreditCardExpense,
        projected_balance: snapshot.projectedBalance,
    }
}
