"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MobileSidebar } from "./mobile-sidebar"
import { AppTabs } from "./app-tabs"
import { PeriodSwitcher } from "./period-switcher"
import { AccountMenu } from "./account-menu"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import { useMonth } from "@/components/providers/month-provider"
import { usePrivacy } from "@/components/providers/privacy-provider"
import { HiddenModeShortcut } from "@/components/hidden-mode-shortcut"
import { Tag } from "@/components/ui/tag"
import { LastroMark, LastroSelo } from "@/components/ui/lastro-mark"
import { isMonthScopedPath } from "@/lib/month-scoped-routes"
import type { MonthData } from "@/app/actions/months"
import { Eye, EyeOff } from "lucide-react"

const DEFAULT_LASTRO_LEVEL = 0.62

export function Header({
    months,
    levelByMonth,
}: {
    months: MonthData[]
    levelByMonth: Record<string, number>
}) {
    const pathname = usePathname()
    const { hiddenModeEnabled } = useHiddenMode()
    const { valuesHidden, toggleValuesHidden } = usePrivacy()
    const { monthId } = useMonth()
    const showPeriod = isMonthScopedPath(pathname)
    const level = (monthId && levelByMonth[monthId] !== undefined)
        ? levelByMonth[monthId]
        : DEFAULT_LASTRO_LEVEL

    return (
        <header className="sticky top-0 z-30 flex min-h-[54px] flex-wrap items-center gap-4 bg-app-surface px-4 md:px-5">
            <div className="md:hidden">
                <MobileSidebar />
            </div>

            <Link href="/dashboard" className="flex shrink-0 items-center">
                <LastroSelo level={level} className="h-6 w-6 sm:hidden" />
                <LastroMark level={level} className="hidden h-auto w-[140px] min-w-[130px] sm:block" />
            </Link>

            <div className="hidden md:block">
                <AppTabs />
            </div>

            <div className="ml-auto flex items-center gap-2.5">
                {hiddenModeEnabled && (
                    <Tag tone="neutral" className="gap-1 bg-app-accent text-app-bg">
                        <EyeOff className="h-3 w-3" />
                        Modo oculto
                    </Tag>
                )}
                <button
                    type="button"
                    aria-pressed={!valuesHidden}
                    aria-label={valuesHidden ? "Mostrar valores" : "Ocultar valores"}
                    onClick={toggleValuesHidden}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-app-border bg-app-surface text-app-muted transition-colors hover:border-app-muted hover:text-app-ink"
                >
                    {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {showPeriod && <PeriodSwitcher months={months} />}
                <AccountMenu />
            </div>

            <HiddenModeShortcut />
        </header>
    )
}
