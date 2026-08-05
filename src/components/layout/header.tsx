"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MobileSidebar } from "./mobile-sidebar"
import { AppTabs } from "./app-tabs"
import { PeriodSwitcher } from "./period-switcher"
import { AccountMenu } from "./account-menu"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import { HiddenModeShortcut } from "@/components/hidden-mode-shortcut"
import { Tag } from "@/components/ui/tag"
import { isMonthScopedPath } from "@/lib/month-scoped-routes"
import type { MonthData } from "@/app/actions/months"
import { EyeOff } from "lucide-react"

export function Header({ months }: { months: MonthData[] }) {
    const pathname = usePathname()
    const { hiddenModeEnabled } = useHiddenMode()
    const showPeriod = isMonthScopedPath(pathname)

    return (
        <header className="sticky top-0 z-30 flex min-h-[54px] flex-wrap items-center gap-4 border-b border-app-border bg-app-surface px-4 md:px-5">
            <div className="md:hidden">
                <MobileSidebar />
            </div>

            <Link href="/dashboard" className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-md bg-app-ink" />
                <span className="text-[15px] font-semibold tracking-tight">Controle</span>
            </Link>

            <div className="hidden md:block">
                <AppTabs />
            </div>

            <div className="ml-auto flex items-center gap-2.5">
                {hiddenModeEnabled && (
                    <Tag tone="neutral" className="gap-1 bg-app-ink text-white">
                        <EyeOff className="h-3 w-3" />
                        Modo oculto
                    </Tag>
                )}
                {showPeriod && <PeriodSwitcher months={months} />}
                <AccountMenu />
            </div>

            <HiddenModeShortcut />
        </header>
    )
}
