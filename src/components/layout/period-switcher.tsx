"use client"

import Link from "next/link"
import { useState } from "react"
import { useMonth } from "@/components/providers/month-provider"
import { Tag } from "@/components/ui/tag"
import type { MonthData } from "@/app/actions/months"
import { ChevronDown } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PeriodSwitcher({ months }: { months: MonthData[] }) {
    const { monthId, setMonthId } = useMonth()
    const [open, setOpen] = useState(false)

    if (months.length === 0) {
        return (
            <Link
                href="/dashboard/months"
                className="text-sm font-semibold text-app-link hover:underline"
            >
                Criar primeiro período
            </Link>
        )
    }

    const active = months.find((month) => month.id === monthId) ?? months[0]

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex h-[34px] items-center gap-2 rounded-control border border-app-border bg-app-surface px-3 text-app-ink transition-colors hover:border-app-muted"
                >
                    <span className="font-semibold">{active.name}</span>
                    <Tag tone={active.status === "OPEN" ? "positive" : "neutral"}>
                        {active.status === "OPEN" ? "Aberto" : "Fechado"}
                    </Tag>
                    <ChevronDown className="h-3.5 w-3.5 text-app-faint" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-app-faint">
                    Períodos
                </DropdownMenuLabel>
                {months.map((month) => (
                    <DropdownMenuItem
                        key={month.id}
                        onClick={() => setMonthId(month.id)}
                        className="flex items-center justify-between gap-2"
                    >
                        <span className="font-medium">{month.name}</span>
                        <Tag tone={month.status === "OPEN" ? "positive" : "neutral"}>
                            {month.status === "OPEN" ? "Aberto" : "Fechado"}
                        </Tag>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/months" className="font-semibold text-app-link">
                        + Criar novo período
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
