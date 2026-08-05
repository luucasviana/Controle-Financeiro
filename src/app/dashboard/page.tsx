import { format } from "date-fns"
import Link from "next/link"
import { Info, PiggyBank, Receipt, Wallet } from "lucide-react"

import { getCardBalancesByMonth, getCards } from "@/app/actions/cards"
import { getDashboardData, getMetricsForMonths, getWaterfallData } from "@/app/actions/finance"
import { getIncomeSources } from "@/app/actions/income-sources"
import { getIncomeEditorRows } from "@/app/actions/month-incomes"
import { getProjection } from "@/app/actions/projection"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/ui/kpi-card"
import { StatStrip } from "@/components/ui/stat-strip"
import { Surface } from "@/components/ui/surface"
import { Tag } from "@/components/ui/tag"
import { VariacaoBadge } from "@/components/ui/variacao-badge"
import type { Database } from "@/lib/database.types"
import { measureServerTiming } from "@/lib/server-timing"
import { cn, formatCurrency } from "@/lib/utils"
import { CardConsumptionList } from "./cards/card-consumption-list"
import { getDashboardContext } from "./data"
import { DashboardCharts } from "./dashboard-charts"
import { IncomeSourcesCard, type IncomeSourceOverviewRow } from "./income-sources-card"
import { PendingExpensesCard } from "./pending-expenses-card"

type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]
type CardRow = Database["public"]["Tables"]["cards"]["Row"]
type CardBalanceRow = Database["public"]["Tables"]["card_month_balances"]["Row"]

export default async function DashboardPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const { activeMonth, months } = await measureServerTiming("dashboard-page", async () => {
        const searchParams = await props.searchParams
        return getDashboardContext(searchParams.monthId)
    })

    if (!activeMonth) {
        return (
            <div className="flex-1 space-y-6">
                <Surface className="flex flex-col items-center justify-center gap-4 p-20 text-center">
                    <h2 className="text-[17px] font-medium text-app-ink">Bem-vindo(a)!</h2>
                    <p className="text-app-muted">Você ainda não criou nenhum período financeiro.</p>
                    <Button asChild>
                        <Link href="/dashboard/months">Configurar meu primeiro período</Link>
                    </Button>
                </Surface>
            </div>
        )
    }

    const [dashboardData, cards, balances, waterfallData, projection, incomeEditorRows, incomeSources] =
        await Promise.all([
            getDashboardData(activeMonth),
            getCards(),
            getCardBalancesByMonth(activeMonth.id),
            getWaterfallData(activeMonth.id),
            getProjection(),
            getIncomeEditorRows(activeMonth.id),
            getIncomeSources(),
        ])

    const cardsList: CardRow[] = cards
    const balancesList: CardBalanceRow[] = balances

    const { incomeVisible, totalExpense, projectedBalance, expenses } = dashboardData

    const pastMonths = months.filter((month) => month.start_date <= activeMonth.start_date)
    const previousMonth = pastMonths.length > 1 ? pastMonths[1] : null

    let historyMetrics: Awaited<ReturnType<typeof getMetricsForMonths>> = []
    if (months.length > 0) {
        historyMetrics = await getMetricsForMonths(months.slice(0, 8).reverse())
    }

    const currentChartMetrics = historyMetrics.find((metric) => metric.monthId === activeMonth.id)
    const previousChartMetrics = previousMonth
        ? historyMetrics.find((metric) => metric.monthId === previousMonth.id)
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
    cardsList.forEach((card) => {
        cardsMap[card.id] = card.name
    })

    const expenseRows: ExpenseRow[] = expenses
    const pendingExpenses = expenseRows.filter((expense) => expense.status === "PLANNED")
    const paidExpenses = expenseRows.filter((expense) => expense.status === "PAID")
    // totalExpense (getMonthFinanceSnapshot) exclui de propósito as despesas PAID via
    // CREDIT_CARD — esse consumo já entra pelo valor da fatura em card_month_balances,
    // não pela despesa individual (senão contaria duas vezes). "Já pago" tem que usar o
    // mesmo filtro, senão "Falta pagar" subtrai um valor que totalExpense nunca incluiu.
    const jaPago = paidExpenses
        .filter((expense) => expense.payment_method !== "CREDIT_CARD" && !expense.is_excluded)
        .reduce((acc, expense) => acc + expense.amount, 0)
    const aPagar = totalExpense - jaPago

    const sourceById = new Map(incomeSources.map((source) => [source.id, source]))
    const incomeRows: IncomeSourceOverviewRow[] = incomeEditorRows.map((row) => {
        const source = sourceById.get(row.source_id)
        return {
            id: row.source_id,
            description: row.description,
            is_hidden: row.is_hidden,
            is_active: source?.is_active ?? true,
            created_at: source?.created_at ?? "",
            amount: row.amount,
        }
    })

    // Composição do período: à vista x cartões, escalados sobre max(receita, despesa total).
    // "Parcelas" não entra — no nosso modelo o consumo do cartão é o valor da fatura
    // digitado em card_month_balances, não uma soma de despesas parceladas.
    const compositionScale = Math.max(incomeVisible, totalExpense, 1)
    const cashWidthPct = Math.min(100, (waterfallData.cash_expenses / compositionScale) * 100)
    const cardsWidthPct = Math.min(100, (waterfallData.cards_total / compositionScale) * 100)
    const compositionTotal = waterfallData.cash_expenses + waterfallData.cards_total
    const cashSharePct = compositionTotal > 0 ? (waterfallData.cash_expenses / compositionTotal) * 100 : 0
    const cardsSharePct = compositionTotal > 0 ? (waterfallData.cards_total / compositionTotal) * 100 : 0

    const todayIso = format(new Date(), "yyyy-MM-dd")
    const isBalancePositive = projectedBalance >= 0

    const projectionPreview = projection.slice(0, 6)
    const projectionMax = projectionPreview.reduce((acc, item) => Math.max(acc, Math.abs(item.balance)), 1)
    const projectionAccumulated = projectionPreview.reduce((acc, item) => acc + item.balance, 0)

    return (
        <div className="flex-1 space-y-6">
            <PageHeader
                title="Visão geral"
                description={`${activeMonth.name} · ${activeMonth.status === "OPEN" ? "Em aberto" : "Encerrado"}`}
            />

            <div className="grid gap-4 md:grid-cols-3">
                <KpiCard
                    label="Receita do Período"
                    value={formatCurrency(incomeVisible)}
                    icon={Wallet}
                    trend={incVar}
                />
                <KpiCard
                    label={`Despesas de ${activeMonth.name}`}
                    value={formatCurrency(totalExpense)}
                    icon={Receipt}
                    trend={expVar}
                    trendInverted
                    footnote="Previstas + pagas"
                />
                <KpiCard
                    label="Saldo Projetado"
                    value={formatCurrency(projectedBalance)}
                    tone={isBalancePositive ? "positive" : "negative"}
                    icon={PiggyBank}
                    trend={balVar}
                    hint="Pode incluir receitas de fontes ocultas"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)_336px]">
                {/* Coluna esquerda */}
                <div className="flex flex-col gap-4">
                    <Surface className="p-6">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">
                                    Sobra projetada do período
                                </span>
                                <span title="Pode incluir receitas de fontes ocultas" className="cursor-help">
                                    <Info className="h-3.5 w-3.5 text-app-faint" />
                                </span>
                            </div>
                            <Tag tone={isBalancePositive ? "positive" : "negative"}>
                                {isBalancePositive ? "No azul" : "No vermelho"}
                            </Tag>
                        </div>

                        <div
                            className={cn(
                                "mt-2 text-4xl font-bold tabular-nums",
                                isBalancePositive ? "text-app-ink" : "text-app-warn"
                            )}
                        >
                            {formatCurrency(projectedBalance)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-app-muted">
                            <span>Depois de pagar tudo previsto para {activeMonth.name}</span>
                            <VariacaoBadge valor={balVar} />
                        </div>

                        <StatStrip
                            className="mt-6"
                            items={[
                                { label: "Receita", value: formatCurrency(incomeVisible) },
                                { label: "Já pago", value: formatCurrency(jaPago) },
                                { label: "Falta pagar", value: formatCurrency(aPagar) },
                            ]}
                        />
                    </Surface>

                    <Surface className="p-6">
                        <div className="text-[13px] font-medium text-app-ink">Composição do período</div>
                        <p className="mt-1 mb-4 text-app-muted">Como a despesa do período se divide</p>

                        <div className="flex h-3 overflow-hidden rounded-control bg-app-hairline">
                            <div className="bg-app-muted" style={{ width: `${cashWidthPct}%` }} />
                            <div className="bg-app-accent" style={{ width: `${cardsWidthPct}%` }} />
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-app-muted" />
                                <span className="text-app-ink">À vista</span>
                                <span className="flex-1" />
                                <span className="text-[11px] text-app-muted">{cashSharePct.toFixed(0)}%</span>
                                <span className="min-w-[84px] text-right text-app-ink">
                                    {formatCurrency(waterfallData.cash_expenses)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-app-accent" />
                                <span className="text-app-ink">Cartões</span>
                                <span className="flex-1" />
                                <span className="text-[11px] text-app-muted">{cardsSharePct.toFixed(0)}%</span>
                                <span className="min-w-[84px] text-right text-app-ink">
                                    {formatCurrency(waterfallData.cards_total)}
                                </span>
                            </div>
                        </div>
                    </Surface>

                    <Surface className="p-6">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <span className="text-[13px] font-medium text-app-ink">Cartões</span>
                            <Link href="/dashboard/cards" className="text-app-accent hover:underline">
                                Ver todos
                            </Link>
                        </div>
                        <CardConsumptionList
                            cards={cardsList}
                            balances={balancesList}
                            variant="compact"
                            emptyMessage="Nenhum cartão cadastrado ainda."
                        />
                    </Surface>
                </div>

                {/* Coluna central */}
                <div className="flex flex-col gap-4">
                    <Surface className="p-6">
                        <div>
                            <div className="text-[13px] font-medium text-app-ink">Comparativo mensal</div>
                            <p className="text-app-muted">Receita e despesa realizadas por período</p>
                        </div>
                        {historyMetrics.length > 0 ? (
                            <DashboardCharts historicalMetrics={historyMetrics} className="mt-2" />
                        ) : (
                            <p className="py-8 text-center text-app-muted">Sem histórico suficiente ainda.</p>
                        )}
                    </Surface>

                    <PendingExpensesCard
                        month={activeMonth}
                        pending={pendingExpenses}
                        paid={paidExpenses}
                        cardsMap={cardsMap}
                        todayIso={todayIso}
                    />
                </div>

                {/* Coluna direita */}
                <div className="flex flex-col gap-4">
                    <Surface className="p-6">
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[13px] font-medium text-app-ink">Próximos períodos</span>
                            <Link href="/dashboard/projection" className="text-app-accent hover:underline">
                                Planejar
                            </Link>
                        </div>
                        <p className="mb-4 text-app-muted">Projeção com receitas e gastos recorrentes</p>

                        <div className="flex flex-col gap-3">
                            {projectionPreview.map((item, index) => {
                                const positive = item.balance >= 0
                                const width = Math.min(100, (Math.abs(item.balance) / projectionMax) * 100)
                                return (
                                    <div key={index}>
                                        <div className="mb-1 flex items-baseline justify-between gap-2">
                                            <span className="truncate text-app-ink capitalize">{item.monthLabel}</span>
                                            <span
                                                className={cn(
                                                    "shrink-0 tabular-nums",
                                                    positive ? "text-app-ink" : "text-app-warn"
                                                )}
                                            >
                                                {formatCurrency(item.balance)}
                                            </span>
                                        </div>
                                        <div className="h-1 overflow-hidden rounded-control bg-app-hairline">
                                            <div
                                                className={cn("h-full", positive ? "bg-app-ink" : "bg-app-accent")}
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            {projectionPreview.length === 0 && (
                                <p className="py-6 text-center text-app-muted">
                                    Sem períodos futuros para projetar.
                                </p>
                            )}
                        </div>

                        {projectionPreview.length > 0 && (
                            <div className="mt-4 flex items-baseline justify-between border-t border-app-hairline pt-3">
                                <span className="text-app-muted">
                                    Acumulado em {projectionPreview.length}{" "}
                                    {projectionPreview.length === 1 ? "período" : "períodos"}
                                </span>
                                <span
                                    className={cn(
                                        "text-[15px] font-medium",
                                        projectionAccumulated >= 0 ? "text-app-ink" : "text-app-warn"
                                    )}
                                >
                                    {formatCurrency(projectionAccumulated)}
                                </span>
                            </div>
                        )}
                    </Surface>

                    <IncomeSourcesCard monthId={activeMonth.id} initialRows={incomeRows} />
                </div>
            </div>
        </div>
    )
}
