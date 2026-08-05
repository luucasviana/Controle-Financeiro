import { formatCurrency } from "@/lib/utils"

type HistoryMetric = {
    monthId: string
    monthName: string
    income_visible: number
    total_expenses: number
}

interface DashboardChartsProps {
    historicalMetrics: HistoryMetric[]
    className?: string
}

const CHART_HEIGHT = 140

function formatAxisLabel(value: number) {
    if (value <= 0) return "0"
    if (value >= 1000) {
        const thousands = value / 1000
        return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
    }
    return String(Math.round(value))
}

export function DashboardCharts({ historicalMetrics, className = "" }: DashboardChartsProps) {
    const maxValue = historicalMetrics.reduce(
        (acc, metric) => Math.max(acc, metric.income_visible, metric.total_expenses),
        0
    )
    const axisTop = maxValue > 0 ? Math.ceil(maxValue / 1000) * 1000 : 1000

    return (
        <div className={className}>
            <div className="flex items-center justify-end gap-4 text-[11px] text-app-muted">
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-app-muted" /> Receita
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-app-border" /> Despesa
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-app-accent" /> Acima da receita
                </span>
            </div>

            <div className="relative mt-6 border-b border-app-border pl-9" style={{ height: CHART_HEIGHT }}>
                <div className="absolute inset-x-9 top-0 border-t border-app-hairline" />
                <div className="absolute inset-x-9 top-1/2 border-t border-app-hairline" />
                <span className="absolute left-0 top-0 -translate-y-1/2 text-[10px] text-app-muted">
                    {formatAxisLabel(axisTop)}
                </span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-app-muted">
                    {formatAxisLabel(axisTop / 2)}
                </span>
                <span className="absolute bottom-0 left-0 translate-y-1/2 text-[10px] text-app-muted">0</span>

                <div className="flex h-full items-end gap-1">
                    {historicalMetrics.map((metric) => {
                        const incomeHeight = Math.min(
                            CHART_HEIGHT,
                            (metric.income_visible / axisTop) * CHART_HEIGHT
                        )
                        const normalExpense = Math.min(metric.total_expenses, metric.income_visible)
                        const excessExpense = Math.max(0, metric.total_expenses - metric.income_visible)
                        const normalHeight = Math.min(CHART_HEIGHT, (normalExpense / axisTop) * CHART_HEIGHT)
                        const excessHeight = Math.min(CHART_HEIGHT, (excessExpense / axisTop) * CHART_HEIGHT)

                        return (
                            <div
                                key={metric.monthId}
                                className="flex h-full flex-1 items-end justify-center gap-[3px]"
                            >
                                <div
                                    className="w-2.5 rounded-t-xs bg-app-muted"
                                    style={{ height: incomeHeight }}
                                    title={`Receita: ${formatCurrency(metric.income_visible)}`}
                                />
                                <div
                                    className="flex w-2.5 flex-col-reverse overflow-hidden rounded-t-xs"
                                    style={{ height: normalHeight + excessHeight }}
                                    title={`Despesa: ${formatCurrency(metric.total_expenses)}`}
                                >
                                    <div className="bg-app-border" style={{ height: normalHeight }} />
                                    {excessHeight > 0 && (
                                        <div className="bg-app-accent" style={{ height: excessHeight }} />
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="mt-2 flex gap-1 pl-9">
                {historicalMetrics.map((metric) => (
                    <div key={metric.monthId} className="flex-1 truncate text-center text-[10px] text-app-muted">
                        {metric.monthName}
                    </div>
                ))}
            </div>
        </div>
    )
}
