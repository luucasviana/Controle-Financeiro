"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useMonth } from "@/components/providers/month-provider"
import { buildMonthScopedHref } from "@/lib/month-scoped-routes"

const TABS = [
    { label: "Visão geral", href: "/dashboard" },
    { label: "Movimentações", href: "/dashboard/expenses" },
    { label: "Recorrentes", href: "/dashboard/recorrentes" },
    { label: "Cartões", href: "/dashboard/cards" },
    { label: "Planejamento", href: "/dashboard/projection" },
]

export function AppTabs({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) {
    const pathname = usePathname()
    const { monthId } = useMonth()

    return (
        <nav
            className={cn(
                "flex gap-0.5",
                orientation === "vertical" ? "flex-col" : "items-center"
            )}
        >
            {TABS.map((tab) => {
                const isActive =
                    tab.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === tab.href || pathname.startsWith(tab.href + "/")

                return (
                    <Link
                        key={tab.href}
                        href={buildMonthScopedHref(tab.href, monthId)}
                        className={cn(
                            "rounded-control px-3 py-1.5 text-sm font-semibold transition-colors",
                            orientation === "vertical" && "w-full",
                            isActive
                                ? "text-app-accent"
                                : "text-app-muted hover:text-app-ink"
                        )}
                    >
                        {tab.label}
                    </Link>
                )
            })}
        </nav>
    )
}
