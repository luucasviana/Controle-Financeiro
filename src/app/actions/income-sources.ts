"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "./auth-context"
import { revalidateDashboardData } from "./revalidation"

export type IncomeSource = {
    id: string
    description: string
    is_active: boolean
    is_hidden: boolean
    created_at: string
}

function parseDescription(formData: FormData): string {
    const description = String(formData.get("description") ?? "").trim()

    if (!description) {
        throw new Error("Informe o nome da fonte de receita.")
    }

    return description
}

function revalidateIncomeViews() {
    revalidateDashboardData()
    revalidatePath("/dashboard/incomes")
    revalidatePath("/dashboard/months")
}

export async function getIncomeSources(): Promise<IncomeSource[]> {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
        .from("income_sources")
        .select("id, description, is_active, is_hidden, created_at")
        .eq("user_id", userId)
        .order("description")

    if (error) throw new Error(error.message)

    return data ?? []
}

export async function createIncomeSource(formData: FormData, hiddenModeEnabled: boolean) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { error } = await supabase.from("income_sources").insert({
        user_id: userId,
        description: parseDescription(formData),
        is_active: formData.get("is_active") !== "false",
        is_hidden: hiddenModeEnabled && formData.get("is_hidden") === "true",
    })

    if (error) throw new Error(error.message)

    revalidateIncomeViews()
}

export async function updateIncomeSource(
    id: string,
    formData: FormData,
    hiddenModeEnabled: boolean
) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const payload: { description: string; is_active: boolean; is_hidden?: boolean } = {
        description: parseDescription(formData),
        is_active: formData.get("is_active") !== "false",
    }

    // is_hidden só muda com o modo oculto ligado, senão editar uma fonte
    // qualquer revelaria as ocultas sem querer.
    if (hiddenModeEnabled) {
        payload.is_hidden = formData.get("is_hidden") === "true"
    }

    const { error } = await supabase
        .from("income_sources")
        .update(payload)
        .eq("user_id", userId)
        .eq("id", id)

    if (error) throw new Error(error.message)

    revalidateIncomeViews()
}

export async function toggleIncomeSource(id: string, currentStatus: boolean) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { error } = await supabase
        .from("income_sources")
        .update({ is_active: !currentStatus })
        .eq("user_id", userId)
        .eq("id", id)

    if (error) throw new Error(error.message)

    revalidateIncomeViews()
}

export async function deleteIncomeSource(id: string) {
    const supabase = await createClient()
    const userId = await getCurrentUserId()

    const { error } = await supabase
        .from("income_sources")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)

    if (error) throw new Error(error.message)

    revalidateIncomeViews()
}
