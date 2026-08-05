"use client"

import { useTransition } from "react"
import { setMonthStatus } from "@/app/actions/months"
import type { MonthData } from "@/app/actions/months"
import { toast } from "sonner"

export function ClosedPeriodBanner({ month }: { month: MonthData | null }) {
    const [pending, startTransition] = useTransition()

    if (!month || month.status !== "CLOSED") return null

    function handleReopen() {
        if (!month) return

        startTransition(async () => {
            try {
                await setMonthStatus(month.id, "OPEN")
                toast.success(`${month.name} voltou a ser o período ativo`)
            } catch (error: unknown) {
                toast.error(
                    error instanceof Error ? error.message : "Não foi possível reabrir o período."
                )
            }
        })
    }

    return (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-app-warn-border bg-app-warn-bg px-5 py-2 text-app-warn">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            <span className="font-medium">
                Período encerrado — os valores abaixo são de um período fechado.
            </span>
            <button
                type="button"
                onClick={handleReopen}
                disabled={pending}
                className="ml-auto h-[26px] rounded-lg border border-amber-300 bg-white px-2.5 font-semibold text-app-warn disabled:opacity-60"
            >
                {pending ? "Reabrindo..." : "Reabrir período"}
            </button>
        </div>
    )
}
