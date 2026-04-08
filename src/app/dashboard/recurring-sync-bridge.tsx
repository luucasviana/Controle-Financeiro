"use client"

import { useEffect, useRef, startTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { syncRecurringExpensesForMonth } from "@/app/actions/finance"
import { useMonth } from "@/components/providers/month-provider"
import { isMonthScopedPath } from "@/lib/month-scoped-routes"

export function RecurringSyncBridge() {
    const pathname = usePathname()
    const router = useRouter()
    const { monthId } = useMonth()
    const syncedMonthIds = useRef(new Set<string>())

    useEffect(() => {
        if (!monthId || !isMonthScopedPath(pathname) || syncedMonthIds.current.has(monthId)) {
            return
        }

        let cancelled = false
        const currentMonthId = monthId
        syncedMonthIds.current.add(currentMonthId)

        async function syncMonth() {
            try {
                const result = await syncRecurringExpensesForMonth(currentMonthId)

                if (!cancelled && result.insertedCount > 0) {
                    startTransition(() => {
                        router.refresh()
                    })
                }
            } catch (error) {
                syncedMonthIds.current.delete(currentMonthId)
                console.error("Failed to sync recurring expenses", error)
            }
        }

        void syncMonth()

        return () => {
            cancelled = true
        }
    }, [monthId, pathname, router])

    return null
}
