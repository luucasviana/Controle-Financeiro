import { Header } from "@/components/layout/header"
import { ClosedPeriodBanner } from "@/components/layout/closed-period-banner"
import { MonthProvider } from "@/components/providers/month-provider"
import { HiddenModeProvider } from "@/components/providers/hidden-mode-provider"
import { PrivacyProvider } from "@/components/providers/privacy-provider"
import { getDashboardShellData } from "./data"
import { getMetricsForMonths } from "@/app/actions/finance"
import { measureServerTiming } from "@/lib/server-timing"
import { RecurringSyncBridge } from "./recurring-sync-bridge"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { defaultMonth, months } = await measureServerTiming("dashboard-layout", async () =>
        getDashboardShellData()
    )

    // Nível da linha d'água da marca Lastro por período: quanto da receita do
    // período já está comprometida (total_expenses / income_total). Calculado
    // aqui porque o layout não recebe searchParams e não sabe qual período o
    // Header (client component) vai exibir — o Header escolhe pelo useMonth().
    const monthMetrics = months.length > 0 ? await getMetricsForMonths(months) : []
    const levelByMonth: Record<string, number> = {}
    for (const metric of monthMetrics) {
        // Sem receita: se há despesas (totalmente comprometido) → nível = 1;
        // sem despesas → nível = 0. Com receita, nível = despesas / receita.
        // Este tratamento especial é crítico: um período sem receita mas com
        // despesas está totalmente comprometido, não vazio.
        const rawLevel = metric.income_total > 0
            ? metric.total_expenses / metric.income_total
            : metric.total_expenses > 0 ? 1 : 0
        levelByMonth[metric.monthId] = Math.min(1, Math.max(0, rawLevel))
    }

    return (
        <HiddenModeProvider>
            <PrivacyProvider>
                <MonthProvider defaultMonthId={defaultMonth?.id || null}>
                    <RecurringSyncBridge />
                    <div className="min-h-screen bg-app-bg text-[13px] text-app-ink tabular-nums">
                        <Header months={months} levelByMonth={levelByMonth} />
                        <ClosedPeriodBanner month={defaultMonth} />
                        <main className="p-4 md:p-5">{children}</main>
                    </div>
                </MonthProvider>
            </PrivacyProvider>
        </HiddenModeProvider>
    )
}
