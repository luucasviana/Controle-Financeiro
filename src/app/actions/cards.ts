"use server"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { revalidateDashboardData } from "./revalidation"

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

export async function getCards() {
    const supabase = await createClient() as any
    const userId = await getCurrentUserId()
    const { data } = await supabase.from("cards").select("*").eq("user_id", userId).order("name")
    return data || []
}

export async function createCard(formData: FormData) {
    const supabase = await createClient() as any
    const name = formData.get("name") as string
    const limit_amount = parseFloat(formData.get("limit_amount") as string)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { error } = await supabase.from("cards").insert({
        user_id: user.id,
        name,
        limit_amount
    })

    if (error) throw new Error(error.message)
    revalidateDashboardData()
}

export async function deleteCard(id: string) {
    const supabase = await createClient() as any
    const { error } = await supabase.from("cards").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidateDashboardData()
}

export async function getCardBalancesByMonth(monthId: string) {
    const supabase = await createClient() as any
    const userId = await getCurrentUserId()
    const { data } = await supabase
        .from("card_month_balances")
        .select("*")
        .eq("user_id", userId)
        .eq("month_id", monthId)
    return data || []
}

export async function upsertCardMonthBalance(formData: FormData) {
    const supabase = await createClient() as any
    const card_id = formData.get("card_id") as string
    const month_id = formData.get("month_id") as string
    const amount_current = parseFloat(formData.get("amount_current") as string)
    const updated_on = formData.get("updated_on") as string

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Upsert expects unique confict resolution on (user_id, card_id, month_id)
    const { error } = await supabase.from("card_month_balances").upsert(
        {
            user_id: user.id,
            card_id,
            month_id,
            amount_current,
            updated_on,
            updated_at: new Date().toISOString()
        },
        { onConflict: "user_id,card_id,month_id" }
    )

    if (error) throw new Error(error.message)
    revalidateDashboardData()
}
