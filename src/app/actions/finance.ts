"use server"

import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"
import { revalidatePath } from "next/cache"
import { MonthData } from "./months"
import { sortExpenses } from "@/lib/utils"

export async function generateTemplatesForMonth(month: MonthData, userId: string) {
    const supabase = await createClient() as any

    const { data: templates } = await supabase.from("recurring_expense_templates").select("*").eq("is_active", true)
    if (!templates || templates.length === 0) return

    const { data: existingExpenses } = await supabase
        .from("month_expenses")
        .select("template_id")
        .eq("month_id", month.id)
        .not("template_id", "is", null)

    const existingTemplateIds = new Set((existingExpenses || []).map((e: any) => e.template_id))

    const newExpenses = []
    for (const template of templates) {
        if (!existingTemplateIds.has(template.id)) {
            const start = new Date(month.start_date + "T00:00:00")
            let dueYear = start.getFullYear()
            let dueMonth = start.getMonth() + 1
            let day = template.day_of_month

            const daysInMonth = new Date(dueYear, dueMonth, 0).getDate()
            if (day > daysInMonth) {
                day = daysInMonth
            }

            const dueStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

            newExpenses.push({
                user_id: userId,
                month_id: month.id,
                due_date: dueStr,
                description: template.description,
                amount: template.amount,
                status: 'PLANNED',
                payment_method: 'NONE',
                template_id: template.id
            })
        }
    }

    if (newExpenses.length > 0) {
        await supabase.from("month_expenses").insert(newExpenses)
    }
}

export async function getDashboardData(month: MonthData) {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    await generateTemplatesForMonth(month, user.id)

    // Receitas visíveis (não ocultas) — usadas para KPI "Receita do mês" e gráficos
    const { data: visibleIncomes } = await supabase
        .from("recurring_incomes")
        .select("amount")
        .eq("is_active", true)
        .eq("is_hidden", false)

    // Todas as receitas ativas — usadas apenas para calcular saldo projetado
    const { data: allIncomes } = await supabase
        .from("recurring_incomes")
        .select("amount")
        .eq("is_active", true)

    const incomeVisible = (visibleIncomes || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)
    const incomeTotalForBalance = (allIncomes || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)

    const { data: expenses } = await supabase
        .from("month_expenses")
        .select("*")
        .eq("month_id", month.id)

    const allExpenses = sortExpenses(expenses || [])

    // 1) Gastos não-cartão, excluindo os "fora do cálculo" (is_excluded=true)
    const expensesNonCardPaid = allExpenses.filter((e: any) =>
        !(e.status === 'PAID' && e.payment_method === 'CREDIT_CARD') && !e.is_excluded
    )
    const totalExpensesNonCardPaid = expensesNonCardPaid.reduce((acc: number, curr: any) => acc + curr.amount, 0)

    // 2) Gastos efetivos e lançados nos cartões via snapshot
    const { data: monthBalances } = await supabase.from("card_month_balances").select("amount_current").eq("month_id", month.id)
    const cardTotal = (monthBalances || []).reduce((acc: number, curr: any) => acc + curr.amount_current, 0)

    const totalExpense = totalExpensesNonCardPaid + cardTotal

    // Saldo inclui receitas ocultas; KPI Receita não inclui
    const projectedBalance = incomeTotalForBalance - totalExpense

    const cashExpenses = allExpenses.filter((e: any) => ["PIX", "DEBIT", "CASH"].includes(e.payment_method))
    const totalCashExpense = cashExpenses.reduce((acc: number, curr: any) => acc + curr.amount, 0)

    return {
        incomeVisible,              // KPI "Receita do mês" (não inclui ocultas)
        incomeTotalForBalance,      // usado apenas no saldo
        totalIncome: incomeVisible, // alias retrocompat
        totalExpense,
        projectedBalance,
        totalCashExpense,
        totalCreditCardExpense: cardTotal,
        expenses: allExpenses,
    }
}

export async function createMonthExpense(formData: FormData) {
    const supabase = await createClient() as any
    const month_id = formData.get("month_id") as string
    let due_date = formData.get("due_date") as string
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const status = formData.get("status") as 'PLANNED' | 'PAID'
    let payment_method = formData.get("payment_method") as 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
    let card_id = (formData.get("card_id") as string) || null
    let paid_at = (formData.get("paid_at") as string) || null
    let template_id = (formData.get("template_id") as string) || null
    // is_excluded: only allow true if hidden mode is enabled server-side (passed as form flag)
    const hiddenModeEnabled = formData.get("hidden_mode_enabled") === 'true'
    const is_excluded = hiddenModeEnabled && formData.get("is_excluded") === 'true'

    if (status === 'PLANNED') {
        payment_method = 'NONE'
        card_id = null
        paid_at = null
    } else {
        if (!payment_method || payment_method === 'NONE') {
            throw new Error("Método de pagamento é obrigatório para despesas pagas.")
        }
        if (payment_method === 'CREDIT_CARD' && !card_id) {
            throw new Error("O cartão é obrigatório para pagamentos via crédito.")
        }
        if (!paid_at) {
            paid_at = new Date().toISOString()
        }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    if (!due_date) {
        const { data: monthData } = await supabase.from("months").select("start_date").eq("id", month_id).single()
        if (monthData) {
            due_date = monthData.start_date
        } else {
            due_date = format(new Date(), "yyyy-MM-dd")
        }
    }

    const { data: expense, error } = await supabase.from("month_expenses").insert({
        user_id: user.id,
        month_id,
        due_date,
        description,
        amount,
        status,
        payment_method,
        card_id,
        paid_at,
        template_id,
        is_excluded
    }).select().single()

    if (error) throw new Error(error.message)

    // "card_transactions" has been deprecated and UI now relies on "card_month_balances" snapshot


    revalidatePath('/', 'layout')
}

export async function updateMonthExpense(formData: FormData) {
    const supabase = await createClient() as any
    const expenseId = formData.get("expense_id") as string
    const status = formData.get("status") as 'PLANNED' | 'PAID'
    let paymentMethod = formData.get("payment_method") as 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
    let cardId = (formData.get("card_id") as string) || null
    let paidAt = (formData.get("paid_at") as string) || null
    // is_excluded update: only when hidden_mode_enabled is explicitly passed as true
    const hiddenModeEnabled = formData.get("hidden_mode_enabled") === 'true'
    const isExcludedRaw = formData.get("is_excluded")
    const shouldUpdateExcluded = hiddenModeEnabled && isExcludedRaw !== null

    if (status === 'PLANNED') {
        paymentMethod = 'NONE'
        cardId = null
        paidAt = null
    } else {
        if (!paymentMethod || paymentMethod === 'NONE') {
            throw new Error("Método de pagamento é obrigatório para despesas pagas.")
        }
        if (paymentMethod === 'CREDIT_CARD' && !cardId) {
            throw new Error("O cartão é obrigatório para pagamentos via crédito.")
        }
        if (!paidAt) {
            paidAt = new Date().toISOString()
        }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: expense } = await supabase.from("month_expenses").select().eq("id", expenseId).single()
    if (!expense) throw new Error("Expense not found")

    const updatePayload: Record<string, any> = {
        status,
        payment_method: paymentMethod,
        card_id: cardId,
        paid_at: paidAt
    }
    // Only touch is_excluded when hidden mode is active — preserves the value otherwise
    if (shouldUpdateExcluded) {
        updatePayload.is_excluded = isExcludedRaw === 'true'
    }

    const { error } = await supabase.from("month_expenses").update(updatePayload).eq("id", expenseId)

    if (error) throw new Error(error.message)

    // "card_transactions" has been deprecated and UI now relies on "card_month_balances" snapshot

    revalidatePath('/', 'layout')
}

export async function deleteMonthExpense(expenseId: string) {
    const supabase = await createClient() as any
    const { error } = await supabase.from("month_expenses").delete().eq("id", expenseId)
    if (error) throw new Error(error.message)
    revalidatePath('/', 'layout')
}

export async function getMetricsForMonths(months: MonthData[]) {
    if (months.length === 0) return [];
    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Receitas visíveis (não ocultas) — para gráficos e KPI Receita
    const { data: visibleIncomes } = await supabase
        .from("recurring_incomes")
        .select("amount")
        .eq("is_active", true)
        .eq("is_hidden", false)
    const incomeVisible = (visibleIncomes || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)

    // Todas as receitas ativas — para saldo projetado
    const { data: allIncomes } = await supabase
        .from("recurring_incomes")
        .select("amount")
        .eq("is_active", true)
    const incomeTotalForBalance = (allIncomes || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)

    const monthIds = months.map(m => m.id);
    const { data: expenses } = await supabase
        .from("month_expenses")
        .select("month_id, amount, status, payment_method, is_excluded")
        .in("month_id", monthIds);

    const { data: monthBalances } = await supabase
        .from("card_month_balances")
        .select("month_id, amount_current")
        .in("month_id", monthIds);

    return months.map(m => {
        const monthExpenses = (expenses || []).filter((e: any) => e.month_id === m.id);
        // Exclude is_excluded=true from totals ("Fora do cálculo")
        const expensesNonCardPaid = monthExpenses.filter((e: any) =>
            !(e.status === 'PAID' && e.payment_method === 'CREDIT_CARD') && !e.is_excluded
        )
        const totalExpensesNonCardPaid = expensesNonCardPaid.reduce((acc: number, curr: any) => acc + curr.amount, 0)

        const mBalances = (monthBalances || []).filter((b: any) => b.month_id === m.id);
        const cardTotal = mBalances.reduce((acc: number, curr: any) => acc + curr.amount_current, 0)

        const totalExpense = totalExpensesNonCardPaid + cardTotal
        // Saldo usa income total (com ocultas); gráficos usam income_visible
        const projectedBalance = incomeTotalForBalance - totalExpense

        return {
            monthId: m.id,
            monthName: m.name,
            start_date: m.start_date,
            income_visible: incomeVisible,       // para gráfico e KPI Receita
            income_total: incomeTotalForBalance,  // para saldo
            total_expenses: totalExpense,
            projected_balance: projectedBalance
        }
    })
}

// ─────────────────────────────────────────────────────────────
// Totais acumulados por cartão (TODOS os meses, sem filtro)
// ─────────────────────────────────────────────────────────────
export async function getCardTotalsAllTime() {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Busca todos os snapshots do usuário com card name em join
    const { data: balances, error } = await supabase
        .from("card_month_balances")
        .select("card_id, amount_current, cards(name)")
        .eq("user_id", user.id)

    if (error) throw new Error(error.message)

    // Agrupa por card_id somando amount_current
    const totalsMap: Record<string, { card_id: string; card_name: string; total: number }> = {}

    for (const row of (balances || [])) {
        const cardId = row.card_id
        const cardName = row.cards?.name ?? "Sem nome"
        const amount = row.amount_current ?? 0

        if (!totalsMap[cardId]) {
            totalsMap[cardId] = { card_id: cardId, card_name: cardName, total: 0 }
        }
        totalsMap[cardId].total += amount
    }

    // Ordena DESC por total
    return Object.values(totalsMap).sort((a, b) => b.total - a.total)
}

// ─────────────────────────────────────────────────────────────
// Dados para Waterfall do mês selecionado
// ─────────────────────────────────────────────────────────────
export async function getWaterfallData(monthId: string) {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Todas as receitas ativas (inclui ocultas — igual à regra do saldo projetado)
    const { data: allIncomes } = await supabase
        .from("recurring_incomes")
        .select("amount")
        .eq("is_active", true)
    const income = (allIncomes || []).reduce((acc: number, curr: any) => acc + curr.amount, 0)

    // Despesas do mês (excluindo is_excluded e excluindo pagas no cartão)
    const { data: expenses } = await supabase
        .from("month_expenses")
        .select("amount, status, payment_method, is_excluded")
        .eq("month_id", monthId)

    const cashExpenses = (expenses || []).filter((e: any) =>
        !(e.status === 'PAID' && e.payment_method === 'CREDIT_CARD') && !e.is_excluded
    )
    const cash_expenses = cashExpenses.reduce((acc: number, curr: any) => acc + curr.amount, 0)

    // Cartões via snapshot
    const { data: cardBalances } = await supabase
        .from("card_month_balances")
        .select("amount_current")
        .eq("month_id", monthId)
        .eq("user_id", user.id)
    const cards_total = (cardBalances || []).reduce((acc: number, curr: any) => acc + curr.amount_current, 0)

    const projected_balance = income - cash_expenses - cards_total

    return { income, cash_expenses, cards_total, projected_balance }
}

