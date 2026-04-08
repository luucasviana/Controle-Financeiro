"use server"

import { cache } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import type { MonthData } from "./months"
import { sortExpenses } from "@/lib/utils"
import { revalidateDashboardData } from "./revalidation"
import { Database } from "@/lib/database.types"
import { measureServerTiming } from "@/lib/server-timing"
import {
    buildInstallmentRowsToInsert,
    type InstallmentExpenseRow,
    type InstallmentPlanRow,
} from "./installment-scheduling"

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

const getCurrentUserId = cache(async () => {
    const supabase = await createClient() as any
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    return user.id
})

const getIncomeSummary = cache(async (userId: string): Promise<IncomeSummary> => {
    const supabase = await createClient() as any
    const [{ data: visibleIncomes }, { data: allIncomes }] = await Promise.all([
        supabase
            .from("recurring_incomes")
            .select("amount")
            .eq("user_id", userId)
            .eq("is_active", true)
            .eq("is_hidden", false),
        supabase
            .from("recurring_incomes")
            .select("amount")
            .eq("user_id", userId)
            .eq("is_active", true),
    ])

    return {
        incomeVisible: (visibleIncomes || []).reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0),
        incomeTotalForBalance: (allIncomes || []).reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0),
    }
})

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
        getIncomeSummary(userId),
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

async function generateTemplatesForMonth(month: MonthData, userId: string) {
    const supabase = await createClient() as any

    const [{ data: templates }, { data: existingExpenses }] = await Promise.all([
        supabase
            .from("recurring_expense_templates")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true),
        supabase
            .from("month_expenses")
            .select("template_id")
            .eq("user_id", userId)
            .eq("month_id", month.id)
            .not("template_id", "is", null),
    ])

    if (!templates || templates.length === 0) {
        return 0
    }

    const existingTemplateIds = new Set((existingExpenses || []).map((expense: { template_id: string | null }) => expense.template_id))
    const newExpenses = []

    for (const template of templates) {
        if (existingTemplateIds.has(template.id)) {
            continue
        }

        const start = new Date(`${month.start_date}T00:00:00`)
        const dueYear = start.getFullYear()
        const dueMonth = start.getMonth() + 1
        const daysInMonth = new Date(dueYear, dueMonth, 0).getDate()
        const adjustedDay = Math.min(template.day_of_month, daysInMonth)
        const dueDate = `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`

        newExpenses.push({
            user_id: userId,
            month_id: month.id,
            due_date: dueDate,
            description: template.description,
            amount: template.amount,
            status: "PLANNED",
            payment_method: "NONE",
            template_id: template.id,
        })
    }

    if (newExpenses.length === 0) {
        return 0
    }

    const { error } = await supabase.from("month_expenses").insert(newExpenses)

    if (error) {
        throw new Error(error.message)
    }

    return newExpenses.length
}

export async function syncInstallmentPlansForUser(userId: string) {
    return measureServerTiming("sync-installment-plans", async () => {
        const supabase = await createClient() as any
        const [{ data: months }, { data: plans }, { data: installments }] = await Promise.all([
            supabase
                .from("months")
                .select("*")
                .eq("user_id", userId)
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

        const insertRows = buildInstallmentRowsToInsert(
            (months || []) as MonthData[],
            (plans || []) as InstallmentPlanRow[],
            (installments || []) as InstallmentExpenseRow[]
        )

        if (insertRows.length === 0) {
            return 0
        }

        const { error } = await supabase.from("month_expenses").insert(insertRows)

        if (error) {
            throw new Error(error.message)
        }

        revalidateDashboardData()
        return insertRows.length
    })
}

export async function syncRecurringExpensesForMonth(monthId: string) {
    return measureServerTiming("sync-recurring-expenses", async () => {
        const userId = await getCurrentUserId()
        const supabase = await createClient() as any
        const { data: month, error } = await supabase
            .from("months")
            .select("*")
            .eq("user_id", userId)
            .eq("id", monthId)
            .maybeSingle()

        if (error) {
            throw new Error(error.message)
        }

        if (!month) {
            return { insertedCount: 0 }
        }

        const [templateCount, installmentCount] = await Promise.all([
            generateTemplatesForMonth(month as MonthData, userId),
            syncInstallmentPlansForUser(userId),
        ])
        const insertedCount = templateCount + installmentCount

        if (insertedCount > 0) {
            revalidateDashboardData()
        }

        return { insertedCount }
    })
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
    const supabase = await createClient() as any
    const month_id = formData.get("month_id") as string
    let due_date = formData.get("due_date") as string
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const status = formData.get("status") as "PLANNED" | "PAID"
    let payment_method = formData.get("payment_method") as "NONE" | "PIX" | "DEBIT" | "CASH" | "CREDIT_CARD"
    let card_id = (formData.get("card_id") as string) || null
    let paid_at = (formData.get("paid_at") as string) || null
    const template_id = (formData.get("template_id") as string) || null
    const hiddenModeEnabled = formData.get("hidden_mode_enabled") === "true"
    const is_excluded = hiddenModeEnabled && formData.get("is_excluded") === "true"

    if (status === "PLANNED") {
        payment_method = "NONE"
        card_id = null
        paid_at = null
    } else {
        if (!payment_method || payment_method === "NONE") {
            throw new Error("MÃ©todo de pagamento Ã© obrigatÃ³rio para despesas pagas.")
        }
        if (payment_method === "CREDIT_CARD" && !card_id) {
            throw new Error("O cartÃ£o Ã© obrigatÃ³rio para pagamentos via crÃ©dito.")
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
        template_id,
        is_excluded,
    })

    if (error) {
        throw new Error(error.message)
    }

    revalidateDashboardData()
}

export async function updateMonthExpense(formData: FormData) {
    const supabase = await createClient() as any
    const expenseId = formData.get("expense_id") as string
    const month_id = formData.get("month_id") as string
    const due_date = formData.get("due_date") as string
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
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
            throw new Error("MÃ©todo de pagamento Ã© obrigatÃ³rio para despesas pagas.")
        }
        if (paymentMethod === "CREDIT_CARD" && !cardId) {
            throw new Error("O cartÃ£o Ã© obrigatÃ³rio para pagamentos via crÃ©dito.")
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

    const updatePayload: Record<string, unknown> = {
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

    const { error } = await supabase.from("month_expenses").update(updatePayload).eq("id", expenseId)

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
        const { incomeVisible, incomeTotalForBalance } = await getIncomeSummary(userId)
        const monthIds = months.map((month) => month.id)
        const supabase = await createClient() as any
        const [{ data: expenses }, { data: monthBalances }] = await Promise.all([
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

        return months.map((month) => {
            const monthExpenses = expensesByMonth.get(month.id) || []
            const includedExpenses = monthExpenses.filter((expense) =>
                !(expense.status === "PAID" && expense.payment_method === "CREDIT_CARD") && !expense.is_excluded
            )
            const totalExpensesNonCard = includedExpenses.reduce((acc, curr) => acc + curr.amount, 0)
            const monthCardBalances = balancesByMonth.get(month.id) || []
            const cardTotal = monthCardBalances.reduce((acc, curr) => acc + curr.amount_current, 0)
            const totalExpense = totalExpensesNonCard + cardTotal

            return {
                monthId: month.id,
                monthName: month.name,
                start_date: month.start_date,
                income_visible: incomeVisible,
                income_total: incomeTotalForBalance,
                total_expenses: totalExpense,
                projected_balance: incomeTotalForBalance - totalExpense,
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
