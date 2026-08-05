"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "./auth-context"
import { revalidateDashboardData } from "./revalidation"
import { syncRecurringExpensesForUser } from "./finance"
import { getOpenMonthOrLatest } from "./months"
import type { RecurringExpenseRow } from "./recurring-expense-scheduling"

export type RecurringExpenseOccurrence = {
    id: string
    monthId: string
    monthName: string
    dueDate: string
    amount: number
    status: "PLANNED" | "PAID"
    number: number | null
}

export type RecurringExpenseSummary = RecurringExpenseRow & {
    paidOccurrences: number
    generatedOccurrences: number
    /** null quando a recorrência não tem prazo definido */
    remainingOccurrences: number | null
    progressPercent: number | null
    paidAmount: number
    remainingAmount: number | null
    totalAmount: number | null
    nextDueDate: string | null
    occurrences: RecurringExpenseOccurrence[]
}

type FormValues = {
    description: string
    amount: number
    due_day: number
    total_occurrences: number | null
    starts_in_current_month: boolean
}

function parseForm(formData: FormData): FormValues {
    const description = String(formData.get("description") ?? "").trim()
    const amount = Number(formData.get("amount"))
    const dueDay = Number(formData.get("due_day"))
    const hasDeadline = formData.get("has_deadline") !== "false"
    const rawTotal = formData.get("total_occurrences")

    if (!description) {
        throw new Error("Informe a descrição da despesa recorrente.")
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Informe um valor maior que zero.")
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        throw new Error("O dia de vencimento deve estar entre 1 e 31.")
    }

    let totalOccurrences: number | null = null

    if (hasDeadline) {
        totalOccurrences = Number(rawTotal)
        if (!Number.isInteger(totalOccurrences) || totalOccurrences < 1) {
            throw new Error("Informe quantas vezes a despesa se repete.")
        }
    }

    return {
        description,
        amount,
        due_day: dueDay,
        total_occurrences: totalOccurrences,
        starts_in_current_month: formData.get("starts_in_current_month") === "true",
    }
}

export async function getRecurringExpenses(): Promise<RecurringExpenseSummary[]> {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const [plansResult, occurrencesResult, monthsResult] = await Promise.all([
        supabase
            .from("recurring_expenses")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
        supabase
            .from("month_expenses")
            .select("id, month_id, amount, status, due_date, recurring_expense_id, occurrence_number")
            .eq("user_id", userId)
            .not("recurring_expense_id", "is", null)
            .order("due_date", { ascending: true }),
        supabase.from("months").select("id, name, start_date").eq("user_id", userId),
    ])

    if (plansResult.error) throw new Error(plansResult.error.message)
    if (occurrencesResult.error) throw new Error(occurrencesResult.error.message)
    if (monthsResult.error) throw new Error(monthsResult.error.message)

    const monthById = new Map((monthsResult.data ?? []).map((month) => [month.id, month]))
    const byPlan = new Map<string, RecurringExpenseOccurrence[]>()

    for (const row of occurrencesResult.data ?? []) {
        if (!row.recurring_expense_id) continue

        const month = monthById.get(row.month_id)
        const current = byPlan.get(row.recurring_expense_id) ?? []

        current.push({
            id: row.id,
            monthId: row.month_id,
            monthName: month?.name ?? "Período removido",
            dueDate: row.due_date,
            amount: row.amount,
            status: row.status,
            number: row.occurrence_number,
        })

        byPlan.set(row.recurring_expense_id, current)
    }

    return ((plansResult.data ?? []) as RecurringExpenseRow[]).map((plan) => {
        const occurrences = [...(byPlan.get(plan.id) ?? [])].sort((a, b) => {
            const numberA = a.number ?? 0
            const numberB = b.number ?? 0
            if (numberA !== numberB) return numberA - numberB
            return a.dueDate.localeCompare(b.dueDate)
        })

        const paid = occurrences.filter((occurrence) => occurrence.status === "PAID")
        const paidAmount = paid.reduce((acc, occurrence) => acc + occurrence.amount, 0)
        const unpaidGeneratedAmount = occurrences
            .filter((occurrence) => occurrence.status !== "PAID")
            .reduce((acc, occurrence) => acc + occurrence.amount, 0)

        const hasDeadline = plan.total_occurrences !== null
        const notYetGenerated = hasDeadline
            ? Math.max(plan.total_occurrences! - occurrences.length, 0)
            : null
        const remainingAmount =
            notYetGenerated === null ? null : unpaidGeneratedAmount + notYetGenerated * plan.amount

        return {
            ...plan,
            paidOccurrences: paid.length,
            generatedOccurrences: occurrences.length,
            remainingOccurrences: hasDeadline
                ? Math.max(plan.total_occurrences! - paid.length, 0)
                : null,
            progressPercent: hasDeadline
                ? Math.min(100, Math.round((paid.length / plan.total_occurrences!) * 100))
                : null,
            paidAmount,
            remainingAmount,
            totalAmount: remainingAmount === null ? null : paidAmount + remainingAmount,
            nextDueDate:
                occurrences.find((occurrence) => occurrence.status !== "PAID")?.dueDate ?? null,
            occurrences,
        }
    })
}

export async function createRecurringExpense(formData: FormData) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const values = parseForm(formData)

    const currentMonth = await getOpenMonthOrLatest()
    if (!currentMonth) {
        throw new Error(
            "Você precisa ter pelo menos um período financeiro criado para cadastrar uma despesa recorrente."
        )
    }

    const { error } = await supabase.from("recurring_expenses").insert({
        user_id: userId,
        ...values,
        is_active: true,
        is_archived: false,
        base_month_id: currentMonth.id,
    })

    if (error) throw new Error(error.message)

    await syncRecurringExpensesForUser(userId)
    revalidateDashboardData()
}

export async function updateRecurringExpense(id: string, formData: FormData) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const values = parseForm(formData)

    const [planResult, generatedResult] = await Promise.all([
        supabase
            .from("recurring_expenses")
            .select("id")
            .eq("user_id", userId)
            .eq("id", id)
            .maybeSingle(),
        supabase
            .from("month_expenses")
            .select("id")
            .eq("user_id", userId)
            .eq("recurring_expense_id", id),
    ])

    if (planResult.error) throw new Error(planResult.error.message)
    if (generatedResult.error) throw new Error(generatedResult.error.message)
    if (!planResult.data) throw new Error("Despesa recorrente não encontrada.")

    const alreadyGenerated = (generatedResult.data ?? []).length

    if (values.total_occurrences !== null && values.total_occurrences < alreadyGenerated) {
        throw new Error(
            `Esta despesa já foi lançada ${alreadyGenerated} vez(es). Para reduzir, apague os lançamentos primeiro.`
        )
    }

    const { error } = await supabase
        .from("recurring_expenses")
        .update(values)
        .eq("user_id", userId)
        .eq("id", id)

    if (error) throw new Error(error.message)

    const { error: occurrencesError } = await supabase
        .from("month_expenses")
        .update({ occurrence_total: values.total_occurrences })
        .eq("user_id", userId)
        .eq("recurring_expense_id", id)

    if (occurrencesError) throw new Error(occurrencesError.message)

    await syncRecurringExpensesForUser(userId)
    revalidateDashboardData()
}

export async function toggleRecurringExpense(id: string, currentStatus: boolean) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { error } = await supabase
        .from("recurring_expenses")
        .update({ is_active: !currentStatus })
        .eq("user_id", userId)
        .eq("id", id)

    if (error) throw new Error(error.message)

    if (!currentStatus) {
        await syncRecurringExpensesForUser(userId)
    }

    revalidateDashboardData()
}

export async function archiveRecurringExpense(id: string) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { error } = await supabase
        .from("recurring_expenses")
        .update({ is_active: false, is_archived: true })
        .eq("user_id", userId)
        .eq("id", id)

    if (error) throw new Error(error.message)

    revalidateDashboardData()
}

export async function deleteRecurringExpense(id: string) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { error: expensesError } = await supabase
        .from("month_expenses")
        .delete()
        .eq("user_id", userId)
        .eq("recurring_expense_id", id)

    if (expensesError) throw new Error(expensesError.message)

    const { error: planError } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)

    if (planError) throw new Error(planError.message)

    revalidateDashboardData()
}
