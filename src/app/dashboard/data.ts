import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { MonthData } from "@/app/actions/months"

type DashboardShellData = {
    userId: string
    months: MonthData[]
    defaultMonth: MonthData | null
}

const getDashboardShellDataCached = cache(async (): Promise<DashboardShellData> => {
    const supabase = await createClient() as any
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const [{ data: months }, { data: openMonth }, { data: latestMonth }] = await Promise.all([
        supabase
            .from("months")
            .select("*")
            .eq("user_id", user.id)
            .order("start_date", { ascending: false }),
        supabase
            .from("months")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "OPEN")
            .maybeSingle(),
        supabase
            .from("months")
            .select("*")
            .eq("user_id", user.id)
            .order("start_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])

    return {
        userId: user.id,
        months: (months || []) as MonthData[],
        defaultMonth: (openMonth || latestMonth || null) as MonthData | null,
    }
})

const getMonthByIdCached = cache(async (userId: string, monthId: string) => {
    const supabase = await createClient() as any
    const { data } = await supabase
        .from("months")
        .select("*")
        .eq("user_id", userId)
        .eq("id", monthId)
        .maybeSingle()

    return (data || null) as MonthData | null
})

export async function getDashboardShellData() {
    return getDashboardShellDataCached()
}

export async function getDashboardContext(monthId?: string) {
    const shell = await getDashboardShellDataCached()
    const activeMonth = monthId
        ? (await getMonthByIdCached(shell.userId, monthId)) || shell.defaultMonth
        : shell.defaultMonth

    return {
        ...shell,
        activeMonth,
    }
}
