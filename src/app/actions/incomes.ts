"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getIncomes() {
    const supabase = await createClient() as any
    const { data } = await supabase.from("recurring_incomes").select("*").order("description")
    return (data || []) as Array<{
        id: string
        description: string
        amount: number
        is_active: boolean
        is_hidden: boolean
        created_at: string
    }>
}

export async function createIncome(formData: FormData, hiddenModeEnabled: boolean) {
    const supabase = await createClient() as any
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const is_active = formData.get("is_active") === 'true'
    // Security: only allow is_hidden=true if hidden mode is enabled server-side flag is passed
    const is_hidden = hiddenModeEnabled && formData.get("is_hidden") === 'true'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { error } = await supabase.from("recurring_incomes").insert({
        user_id: user.id,
        description,
        amount,
        is_active,
        is_hidden
    })

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/incomes')
    revalidatePath('/dashboard')
}

export async function deleteIncome(id: string) {
    const supabase = await createClient() as any
    const { error } = await supabase.from("recurring_incomes").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/incomes')
    revalidatePath('/dashboard')
}

export async function toggleIncome(id: string, currentStatus: boolean) {
    const supabase = await createClient() as any
    const { error } = await supabase.from("recurring_incomes").update({ is_active: !currentStatus }).eq("id", id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/incomes')
    revalidatePath('/dashboard')
}

export async function updateIncome(id: string, formData: FormData, hiddenModeEnabled: boolean) {
    const supabase = await createClient() as any
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const is_active = formData.get("is_active") === 'true'
    // Only allow toggling is_hidden when hidden mode is enabled
    const is_hidden = hiddenModeEnabled && formData.get("is_hidden") === 'true'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const payload: Record<string, any> = { description, amount, is_active }
    // Only update is_hidden when mode is ON (prevents accidental reveal of hidden incomes)
    if (hiddenModeEnabled) {
        payload.is_hidden = is_hidden
    }

    const { error } = await supabase.from("recurring_incomes").update(payload).eq("id", id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/incomes')
    revalidatePath('/dashboard')
}

