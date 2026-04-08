"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateDashboardData } from "./revalidation"
import { getOpenMonthOrLatest } from "./months"
import { syncInstallmentPlansForUser } from "./finance"
import type { Database } from "@/lib/database.types"

type InstallmentPlanRow = Database["public"]["Tables"]["expense_installment_plans"]["Row"]
type InstallmentExpenseRow = Pick<
    Database["public"]["Tables"]["month_expenses"]["Row"],
    "amount" | "status" | "due_date" | "installment_plan_id" | "installment_number" | "installment_total" | "paid_at"
>

export type InstallmentPlanSummary = InstallmentPlanRow & {
    paidInstallments: number
    remainingInstallments: number
    generatedInstallments: number
    progressPercent: number
    paidAmount: number
    remainingAmount: number
    totalAmount: number
    nextDueDate: string | null
}

export async function getInstallmentPlans(): Promise<InstallmentPlanSummary[]> {
    const supabase = await createClient() as any
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const [{ data: plans }, { data: expenses }] = await Promise.all([
        supabase
            .from("expense_installment_plans")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        supabase
            .from("month_expenses")
            .select("amount, status, due_date, installment_plan_id, installment_number, installment_total, paid_at")
            .eq("user_id", user.id)
            .not("installment_plan_id", "is", null)
            .order("due_date", { ascending: true }),
    ])

    const expensesByPlan = new Map<string, InstallmentExpenseRow[]>()

    for (const expense of (expenses || []) as InstallmentExpenseRow[]) {
        if (!expense.installment_plan_id) continue

        const current = expensesByPlan.get(expense.installment_plan_id) || []
        current.push(expense)
        expensesByPlan.set(expense.installment_plan_id, current)
    }

    return ((plans || []) as InstallmentPlanRow[]).map((plan) => {
        const planExpenses = [...(expensesByPlan.get(plan.id) || [])].sort((a, b) => {
            const numberA = a.installment_number || 0
            const numberB = b.installment_number || 0
            if (numberA !== numberB) return numberA - numberB
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        })

        const paidInstallments = planExpenses.filter((expense) => expense.status === "PAID").length
        const generatedInstallments = planExpenses.length
        const remainingInstallments = Math.max(plan.total_installments - paidInstallments, 0)
        const paidAmount = planExpenses
            .filter((expense) => expense.status === "PAID")
            .reduce((acc, curr) => acc + curr.amount, 0)
        const unpaidGeneratedAmount = planExpenses
            .filter((expense) => expense.status !== "PAID")
            .reduce((acc, curr) => acc + curr.amount, 0)
        const projectedFutureAmount = Math.max(plan.total_installments - generatedInstallments, 0) * plan.amount
        const remainingAmount = unpaidGeneratedAmount + projectedFutureAmount
        const totalAmount = paidAmount + remainingAmount
        const progressPercent = plan.total_installments > 0
            ? Math.min(100, Math.round((paidInstallments / plan.total_installments) * 100))
            : 0
        const nextDueDate = planExpenses.find((expense) => expense.status !== "PAID")?.due_date || null

        return {
            ...plan,
            paidInstallments,
            remainingInstallments,
            generatedInstallments,
            progressPercent,
            paidAmount,
            remainingAmount,
            totalAmount,
            nextDueDate,
        }
    })
}

export async function createInstallmentPlan(formData: FormData) {
    const supabase = await createClient() as any
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const due_day = parseInt(formData.get("due_day") as string, 10)
    const total_installments = parseInt(formData.get("total_installments") as string, 10)
    const starts_in_current_month = formData.get("starts_in_current_month") === "true"

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const currentMonth = await getOpenMonthOrLatest()
    if (!currentMonth) {
        throw new Error("Você precisa ter pelo menos um mês financeiro criado para cadastrar um parcelamento.")
    }

    const { error } = await supabase.from("expense_installment_plans").insert({
        user_id: user.id,
        description,
        amount,
        due_day,
        total_installments,
        starts_in_current_month,
        is_active: true,
        is_archived: false,
        base_month_id: currentMonth.id,
    })

    if (error) {
        throw new Error(error.message)
    }

    await syncInstallmentPlansForUser(user.id)
    revalidateDashboardData()
}

export async function updateInstallmentPlan(id: string, formData: FormData) {
    const supabase = await createClient() as any
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const due_day = parseInt(formData.get("due_day") as string, 10)
    const total_installments = parseInt(formData.get("total_installments") as string, 10)
    const starts_in_current_month = formData.get("starts_in_current_month") === "true"

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const [{ data: plan }, { data: existingExpenses }] = await Promise.all([
        supabase
            .from("expense_installment_plans")
            .select("*")
            .eq("user_id", user.id)
            .eq("id", id)
            .maybeSingle(),
        supabase
            .from("month_expenses")
            .select("installment_number")
            .eq("user_id", user.id)
            .eq("installment_plan_id", id),
    ])

    if (!plan) {
        throw new Error("Parcelamento não encontrado.")
    }

    const alreadyGenerated = (existingExpenses || []).length
    if (total_installments < alreadyGenerated) {
        throw new Error("A quantidade de parcelas não pode ser menor que as parcelas já geradas.")
    }

    const { error } = await supabase.from("expense_installment_plans").update({
        description,
        amount,
        due_day,
        total_installments,
        starts_in_current_month,
    }).eq("id", id)

    if (error) {
        throw new Error(error.message)
    }

    await syncInstallmentPlansForUser(user.id)
    revalidateDashboardData()
}

export async function toggleInstallmentPlan(id: string, currentStatus: boolean) {
    const supabase = await createClient() as any
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const { error } = await supabase
        .from("expense_installment_plans")
        .update({ is_active: !currentStatus })
        .eq("user_id", user.id)
        .eq("id", id)

    if (error) {
        throw new Error(error.message)
    }

    if (!currentStatus) {
        await syncInstallmentPlansForUser(user.id)
    }

    revalidateDashboardData()
}

export async function archiveInstallmentPlan(id: string) {
    const supabase = await createClient() as any
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const { error } = await supabase
        .from("expense_installment_plans")
        .update({ is_active: false, is_archived: true })
        .eq("user_id", user.id)
        .eq("id", id)

    if (error) {
        throw new Error(error.message)
    }

    revalidateDashboardData()
}

export async function deleteInstallmentPlan(id: string) {
    const supabase = await createClient() as any
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const { error: expensesError } = await supabase
        .from("month_expenses")
        .delete()
        .eq("user_id", user.id)
        .eq("installment_plan_id", id)

    if (expensesError) {
        throw new Error(expensesError.message)
    }

    const { error: planError } = await supabase
        .from("expense_installment_plans")
        .delete()
        .eq("user_id", user.id)
        .eq("id", id)

    if (planError) {
        throw new Error(planError.message)
    }

    revalidateDashboardData()
}
