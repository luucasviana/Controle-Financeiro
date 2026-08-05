import { Header } from "@/components/layout/header"
import { ClosedPeriodBanner } from "@/components/layout/closed-period-banner"
import { MonthProvider } from "@/components/providers/month-provider"
import { HiddenModeProvider } from "@/components/providers/hidden-mode-provider"
import { getDashboardShellData } from "./data"
import { measureServerTiming } from "@/lib/server-timing"
import { RecurringSyncBridge } from "./recurring-sync-bridge"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { defaultMonth, months } = await measureServerTiming("dashboard-layout", async () =>
        getDashboardShellData()
    )

    return (
        <HiddenModeProvider>
            <MonthProvider defaultMonthId={defaultMonth?.id || null}>
                <RecurringSyncBridge />
                <div className="min-h-screen bg-app-bg text-[13px] text-app-ink tabular-nums">
                    <Header months={months} />
                    <ClosedPeriodBanner month={defaultMonth} />
                    <main className="p-4 md:p-5">{children}</main>
                </div>
            </MonthProvider>
        </HiddenModeProvider>
    )
}
