"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/lib/database.types"
import { revalidateDashboardShell } from "./revalidation"

export type MonthData = Database['public']['Tables']['months']['Row']

export async function getMonths() {
    const supabase = await createClient() as any
    const { data } = await supabase.from("months").select("*").order("start_date", { ascending: false })
    return (data || []) as MonthData[]
}

export async function getOpenMonthOrLatest() {
    const supabase = await createClient() as any
    // Try to get OPEN month
    const { data: openMonth } = await supabase.from("months").select("*").eq("status", "OPEN").maybeSingle()
    if (openMonth) return openMonth as MonthData

    // fallback to latest
    const { data: latestMonth } = await supabase.from("months").select("*").order("start_date", { ascending: false }).limit(1).maybeSingle()
    return (latestMonth || null) as MonthData | null
}

export async function getMonthById(id: string) {
    const supabase = await createClient() as any
    const { data } = await supabase.from("months").select("*").eq("id", id).maybeSingle()
    return (data || null) as MonthData | null
}

export async function createMonth(formData: FormData) {
    const supabase = await createClient() as any
    const name = formData.get("name") as string
    const start_date = formData.get("start_date") as string
    const end_date = formData.get("end_date") as string

    // Convert status to boolean to check, actually it's OPEN or CLOSED
    // When creating a new month, usually we want it to be OPEN
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // If making this one OPEN, we should probably close others first.
    await supabase.from("months").update({ status: 'CLOSED' }).eq("user_id", user.id).eq("status", 'OPEN')

    const { error } = await supabase.from("months").insert({
        user_id: user.id,
        name,
        start_date,
        end_date,
        status: 'OPEN'
    })

    if (error) throw new Error(error.message)
    revalidateDashboardShell()
}

export async function updateMonth(id: string, formData: FormData) {
    const supabase = await createClient() as any
    const name = formData.get("name") as string
    const start_date = formData.get("start_date") as string
    const end_date = formData.get("end_date") as string

    const { error } = await supabase.from("months").update({
        name,
        start_date,
        end_date
    }).eq("id", id)

    if (error) throw new Error(error.message)
    revalidateDashboardShell()
}

export async function setMonthStatus(id: string, status: 'OPEN' | 'CLOSED') {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    if (status === 'OPEN') {
        // Close others
        await supabase.from("months").update({ status: 'CLOSED' }).eq("user_id", user.id).eq("status", 'OPEN')
    }

    const { error } = await supabase.from("months").update({ status }).eq("id", id)
    if (error) throw new Error(error.message)

    revalidateDashboardShell()
}

export async function deleteMonth(id: string) {
    const supabase = await createClient() as any
    const { error } = await supabase.from("months").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidateDashboardShell()
}
