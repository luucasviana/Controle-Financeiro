import { getCardBalancesByMonth, getCards } from "@/app/actions/cards"
import { getDashboardData, getMetricsForMonths, getWaterfallData } from "@/app/actions/finance"
import { MonthlyWaterfallChart } from "@/components/charts/monthly-waterfall-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { measureServerTiming } from "@/lib/server-timing"
import { DollarSign, Info, Wallet } from "lucide-react"
import Link from "next/link"
import { CardConsumptionList } from "./cards/card-consumption-list"
import { getDashboardContext } from "./data"
import { DashboardCharts } from "./dashboard-charts"
import { ExpenseDialog } from "./expenses/expense-dialog"
import { ExpenseItem } from "./expenses/expense-item"
import { VariacaoBadge } from "@/components/ui/variacao-badge"

export default async function DashboardPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const { activeMonth, months } = await measureServerTiming("dashboard-page", async () => {
        const searchParams = await props.searchParams
        return getDashboardContext(searchParams.monthId)
    })

    if (!activeMonth) {
        return (
            <div className="flex-1 space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 p-20 text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Bem-vindo(a)!</h2>
                    <p className="text-muted-foreground">Você ainda não criou nenhum mês financeiro.</p>
                    <Button asChild>
                        <Link href="/dashboard/months">Configurar meu primeiro mês</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const [dashboardData, cards, balances, waterfallData] = await Promise.all([
        getDashboardData(activeMonth),
        getCards(),
        getCardBalancesByMonth(activeMonth.id),
        getWaterfallData(activeMonth.id),
    ])

    const { incomeVisible, totalExpense, projectedBalance, expenses } = dashboardData

    const pastMonths = months.filter((month: any) => month.start_date <= activeMonth.start_date)
    const previousMonth = pastMonths.length > 1 ? pastMonths[1] : null

    let historyMetrics: any[] = []
    if (months.length > 0) {
        historyMetrics = await getMetricsForMonths(months.slice(0, 8).reverse())
    }

    const currentChartMetrics = historyMetrics.find((metric: any) => metric.monthId === activeMonth.id)
    const previousChartMetrics = previousMonth
        ? historyMetrics.find((metric: any) => metric.monthId === previousMonth.id)
        : null

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
    cards.forEach((card: any) => {
        cardsMap[card.id] = card.name
    })

    const plannedExpenses = expenses.filter((expense: any) => expense.status === "PLANNED")

    return (
        <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
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
                        <p className="mt-1 text-xs text-slate-400 text-muted-foreground">(Previstas + Pagas)</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">Saldo Projetado</CardTitle>
                            <span title="Pode incluir receitas ocultas." className="cursor-help">
                                <Info className="h-3.5 w-3.5 text-slate-400" />
                            </span>
                        </div>
                        <DollarSign className={`h-4 w-4 ${projectedBalance >= 0 ? "text-green-500" : "text-red-500"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className={`text-2xl font-bold ${projectedBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(projectedBalance)}
                            </div>
                            <VariacaoBadge valor={balVar} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div
                className="
                    grid grid-cols-1 items-stretch gap-4
                    [@media(min-width:1200px)]:grid-cols-2
                "
            >
                {currentChartMetrics && (
                    <DashboardCharts
                        monthName={activeMonth.name}
                        currentMetrics={currentChartMetrics}
                        historicalMetrics={historyMetrics}
                    />
                )}

                <MonthlyWaterfallChart data={waterfallData} />
            </div>

            <div
                className="
                    grid grid-cols-1 items-start gap-4
                    [@media(min-width:1200px)]:grid-cols-2
                "
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Despesas do Cartão</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardConsumptionList
                            cards={cards}
                            balances={balances}
                            variant="compact"
                            emptyMessage="Nenhum cartão cadastrado ainda."
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 lg:items-center">
                        <div>
                            <CardTitle>Próximas Despesas</CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2">
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
                                <p className="py-8 text-center text-muted-foreground">
                                    Nenhuma despesa prevista para este mês.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
