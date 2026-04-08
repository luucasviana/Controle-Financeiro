import { getDashboardData, getMetricsForMonths, getWaterfallData } from "@/app/actions/finance"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Wallet, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCards, getCardBalancesByMonth } from "@/app/actions/cards"
import { ExpenseItem } from "./expenses/expense-item"
import { DashboardCharts } from "./dashboard-charts"
import { VariacaoBadge } from "./variacao-badge"
import { ExpenseDialog } from "./expenses/expense-dialog"
import { UpdateBalanceDialog } from "./cards/update-balance-dialog"
import { MonthlyWaterfallChart } from "@/components/charts/monthly-waterfall-chart"
import { getDashboardContext } from "./data"
import { measureServerTiming } from "@/lib/server-timing"

export default async function DashboardPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const { activeMonth, months } = await measureServerTiming("dashboard-page", async () => {
        const searchParams = await props.searchParams
        return getDashboardContext(searchParams.monthId)
    })

    if (!activeMonth) {
        return (
            <div className="flex-1 space-y-6">
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight">Bem-vindo(a)!</h2>
                    <p className="text-muted-foreground">Você ainda não criou nenhum mês financeiro.</p>
                    <Button asChild><Link href="/dashboard/months">Configurar meu primeiro mês</Link></Button>
                </div>
            </div>
        )
    }

    // Fetch all data in parallel for performance
    const [
        dashboardData,
        cards,
        balances,
        waterfallData,
    ] = await Promise.all([
        getDashboardData(activeMonth),
        getCards(),
        getCardBalancesByMonth(activeMonth.id),
        getWaterfallData(activeMonth.id),
    ])

    const {
        incomeVisible,
        totalExpense,
        projectedBalance,
        expenses
    } = dashboardData

    // Historical metrics for charts and % variation
    const pastMonths = months.filter((m: any) => m.start_date <= activeMonth.start_date)
    const previousMonth = pastMonths.length > 1 ? pastMonths[1] : null

    let historyMetrics: any[] = []
    if (months.length > 0) {
        historyMetrics = await getMetricsForMonths(months.slice(0, 8).reverse()) // ascending
    }

    const currentChartMetrics = historyMetrics.find((m: any) => m.monthId === activeMonth.id)
    const previousChartMetrics = previousMonth ? historyMetrics.find((m: any) => m.monthId === previousMonth.id) : null

    function calcVar(curr: number, prev: number) {
        if (prev === 0) return curr === 0 ? 0 : null
        return ((curr - prev) / Math.abs(prev)) * 100
    }

    const incVar = previousChartMetrics && currentChartMetrics
        ? calcVar(currentChartMetrics.income_visible, previousChartMetrics.income_visible)
        : undefined
    const expVar = previousChartMetrics && currentChartMetrics
        ? calcVar(currentChartMetrics.total_expenses, previousChartMetrics.total_expenses)
        : undefined
    const balVar = previousChartMetrics && currentChartMetrics
        ? calcVar(currentChartMetrics.projected_balance, previousChartMetrics.projected_balance)
        : undefined

    const cardsMap: Record<string, string> = {}
    cards.forEach((c: any) => cardsMap[c.id] = c.name)

    // Only PLANNED expenses for dashboard list
    const plannedExpenses = expenses.filter((e: any) => e.status === 'PLANNED')

    return (
        <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            {/* ── Row 1: KPI Cards ── */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Receita visível (sem ocultas) */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
                        <Wallet className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(incomeVisible)}</div>
                            <VariacaoBadge valor={incVar} />
                        </div>
                    </CardContent>
                </Card>

                {/* Despesa */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Despesas do Mês ({activeMonth.name})</CardTitle>
                        <DollarSign className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
                            <VariacaoBadge valor={expVar} inverted />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-slate-400">(Previstas + Pagas)</p>
                    </CardContent>
                </Card>

                {/* Saldo projetado */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">Saldo Projetado</CardTitle>
                            <span title="Pode incluir receitas ocultas." className="cursor-help">
                                <Info className="h-3.5 w-3.5 text-slate-400" />
                            </span>
                        </div>
                        <DollarSign className={`h-4 w-4 ${projectedBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className={`text-2xl font-bold ${projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(projectedBalance)}
                            </div>
                            <VariacaoBadge valor={balVar} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Row 2 + 3: Gráficos ── */}
            <div className="
                grid gap-4 items-stretch
                grid-cols-1
                [@media(min-width:1200px)]:grid-cols-2
            ">
                {/* Comparativo Receita vs Despesa */}
                {currentChartMetrics && (
                    <DashboardCharts
                        monthName={activeMonth.name}
                        currentMetrics={currentChartMetrics}
                        historicalMetrics={historyMetrics}
                    />
                )}

                {/* Waterfall do mês */}
                <MonthlyWaterfallChart
                    data={waterfallData}
                />

                {/* Gráfico de cartões temporáriamente oculto */}
                {/* <CardTotalsChart data={cardTotals} /> */}
            </div>

            {/* ── Row 4: Próximas Despesas ── */}
            <Card>
                <CardHeader className="flex flex-row items-start lg:items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle>Próximas Despesas</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <UpdateBalanceDialog
                            cards={cards}
                            balances={balances}
                            trigger={<Button size="sm" variant="outline">Registrar Gasto no Cartão</Button>}
                        />
                        <ExpenseDialog
                            month={activeMonth}
                            trigger={<Button size="sm" className="bg-blue-600">Registrar Despesa</Button>}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {plannedExpenses.map((expense: any) => (
                            <ExpenseItem key={expense.id} expense={expense} cardsMap={cardsMap} />
                        ))}
                        {plannedExpenses.length === 0 && (
                            <p className="text-muted-foreground text-center py-8">Nenhuma despesa prevista para este mês.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
