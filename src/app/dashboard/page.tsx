import { format } from "date-fns"
import Link from "next/link"

import { getCardBalancesByMonth, getCards } from "@/app/actions/cards"
import { getDashboardData, getMetricsForMonths, getWaterfallData } from "@/app/actions/finance"
import { getIncomeSources } from "@/app/actions/income-sources"
import { getIncomeEditorRows } from "@/app/actions/month-incomes"
import { getProjection } from "@/app/actions/projection"
import { getPaymentSuggestions } from "@/app/actions/recurring-expenses"
import { Button } from "@/components/ui/button"
import { InfoPopover } from "@/components/ui/info-popover"
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

    const [
        dashboardData,
        cards,
        balances,
        waterfallData,
        projection,
        incomeEditorRows,
        incomeSources,
        paymentSuggestions,
    ] = await Promise.all([
        getDashboardData(activeMonth),
        getCards(),
        getCardBalancesByMonth(activeMonth.id),
        getWaterfallData(activeMonth.id),
        getProjection(activeMonth.id),
        getIncomeEditorRows(activeMonth.id),
        getIncomeSources(),
        getPaymentSuggestions(),
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

    const balVar = previousChartMetrics && currentChartMetrics
        ? calcVar(currentChartMetrics.projected_balance, previousChartMetrics.projected_balance)
        : undefined

    const cardsMap: Record<string, string> = {}
    cardsList.forEach((card) => {
        cardsMap[card.id] = card.name
    })

    const expenseRows: ExpenseRow[] = expenses
    // Card "A pagar" quer a lista por vencimento mais próximo primeiro. due_date é string
    // yyyy-MM-dd, então a comparação lexicográfica já é cronológica (sem conversão para Date).
    // Desempate: mesmo dia, maior valor primeiro. sortExpenses (utils.ts) não é usada aqui de
    // propósito — ela ordena por status/valor e é compartilhada com outras telas.
    const pendingExpenses = expenseRows
        .filter((expense) => expense.status === "PLANNED")
        .sort((a, b) => a.due_date.localeCompare(b.due_date) || b.amount - a.amount)
    const paidExpenses = expenseRows.filter((expense) => expense.status === "PAID")
    const jaPago = paidExpenses
        .filter((expense) => !expense.is_excluded)
        .reduce((acc, expense) => acc + expense.amount, 0)
    // totalExpense contabiliza o cartão pelo valor da fatura informada em card_month_balances,
    // não pela soma das despesas individuais pagas no cartão. Se a fatura for digitada abaixo
    // do que já foi lançado em compras, jaPago pode superar totalExpense; o piso em zero evita
    // exibir "Falta pagar" negativo nesse cenário de inconsistência de dados.
    const aPagar = Math.max(0, totalExpense - jaPago)

    // Reaproveita a mesma busca usada pelo card de Receitas (getIncomeSources) — sem
    // consulta nova. Alimenta a ressalva do popover de "Sobra projetada": o número
    // grande do card usa a receita total (incluindo fontes ocultas), enquanto a
    // linha "Receita" logo abaixo mostra só a visível. Só vale a pena avisar disso
    // quando existe de fato uma fonte oculta e ativa — senão os dois valores batem.
    const hasHiddenActiveIncomeSource = incomeSources.some((source) => source.is_hidden && source.is_active)

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

    // Composição do período: à vista x cartões, o que já efetivamente saiu.
    // "Parcelas" não entra — no nosso modelo o consumo do cartão é o valor da fatura
    // digitado em card_month_balances, não uma soma de despesas parceladas.
    // Largura da barra e percentual exibido usam o MESMO denominador (compositionTotal),
    // senão a barra e o rótulo contam histórias diferentes.
    const compositionTotal = waterfallData.cash_expenses + waterfallData.cards_total
    const cashSharePct = compositionTotal > 0 ? (waterfallData.cash_expenses / compositionTotal) * 100 : 0
    const cardsSharePct = compositionTotal > 0 ? (waterfallData.cards_total / compositionTotal) * 100 : 0
    const cashWidthPct = cashSharePct
    const cardsWidthPct = cardsSharePct

    const todayIso = format(new Date(), "yyyy-MM-dd")
    const isBalancePositive = projectedBalance >= 0

    const projectionPreview = projection.slice(0, 6)
    const projectionMax = projectionPreview.reduce((acc, item) => Math.max(acc, Math.abs(item.balance)), 1)
    const projectionAccumulated = projectionPreview.reduce((acc, item) => acc + item.balance, 0)

    return (
        <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)_336px]">
                {/* Coluna esquerda */}
                <div className="flex flex-col gap-4">
                    <Surface className="p-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase tracking-wider text-app-accent">
                                    Sobra projetada do período
                                </span>
                                <InfoPopover title="Sobra projetada do período">
                                    <div className="space-y-1.5">
                                        <p className="font-medium text-app-ink">Sobra projetada do período</p>
                                        <p>
                                            Quanto sobra da receita depois de pagar tudo que está previsto para o
                                            período: a receita menos as despesas (previstas e pagas), já contando o
                                            valor das faturas dos cartões.
                                        </p>
                                        <p>
                                            Exemplo: receita de <span className="text-app-ink">R$ 5.950</span> e
                                            despesas de <span className="text-app-ink">R$ 5.610</span> deixam uma
                                            sobra de <span className="text-app-ink">R$ 340</span>.
                                        </p>
                                        {hasHiddenActiveIncomeSource && (
                                            <p>
                                                Esse valor considera também as receitas de fontes ocultas. A
                                                &quot;Receita&quot; mostrada logo abaixo é só a visível — por isso os
                                                dois números podem ser diferentes.
                                            </p>
                                        )}
                                    </div>
                                </InfoPopover>
                            </div>
                            <Tag tone={isBalancePositive ? "positive" : "negative"}>
                                {isBalancePositive ? "No azul" : "No vermelho"}
                            </Tag>
                        </div>

                        <div
                            className={cn(
                                "mt-2 text-4xl font-bold tabular-nums",
                                isBalancePositive ? "text-app-ink" : "text-app-accent"
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
                        <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-app-ink">Composição do período</span>
                            <InfoPopover title="Composição do período">
                                <div className="space-y-1.5">
                                    <p className="font-medium text-app-ink">Composição do período</p>
                                    <p>
                                        Como se divide o dinheiro que já saiu: o que foi pago à vista mais o valor
                                        das faturas de cartão informadas.
                                    </p>
                                    <p>
                                        Despesas ainda previstas não entram aqui — por isso essa soma costuma ser
                                        menor que o total de despesas do período.
                                    </p>
                                </div>
                            </InfoPopover>
                        </div>
                        <p className="mt-1 mb-4 text-app-muted">
                            O que já saiu até agora — à vista e fatura dos cartões, sem incluir despesas previstas
                        </p>

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
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-app-ink">Cartões</span>
                                <InfoPopover title="Cartões">
                                    <div className="space-y-1.5">
                                        <p className="font-medium text-app-ink">Cartões</p>
                                        <p>
                                            Quanto de cada cartão já foi comprometido no período, segundo o valor
                                            da fatura que você informou. A barra mostra a fração do limite usada.
                                        </p>
                                    </div>
                                </InfoPopover>
                            </div>
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
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-app-ink">Comparativo mensal</span>
                                <InfoPopover title="Comparativo mensal">
                                    <div className="space-y-1.5">
                                        <p className="font-medium text-app-ink">Comparativo mensal</p>
                                        <p>
                                            Receita e despesa realizadas em cada período, para acompanhar a
                                            evolução.
                                        </p>
                                        <p>
                                            Uma barra de despesa destacada indica um período em que se gastou mais
                                            do que se recebeu.
                                        </p>
                                    </div>
                                </InfoPopover>
                            </div>
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
                        cards={cardsList}
                        paymentSuggestions={paymentSuggestions}
                        projectedBalance={projectedBalance}
                        todayIso={todayIso}
                    />
                </div>

                {/* Coluna direita */}
                <div className="flex flex-col gap-4">
                    <Surface className="p-6">
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-app-ink">Próximos períodos</span>
                                <InfoPopover title="Próximos períodos">
                                    <div className="space-y-1.5">
                                        <p className="font-medium text-app-ink">Próximos períodos</p>
                                        <p>
                                            A sobra projetada de cada período daqui em diante: receita menos as
                                            despesas já lançadas, as faturas de cartão informadas e as recorrências
                                            que ainda serão lançadas.
                                        </p>
                                        <p>
                                            Períodos futuros que ainda não têm fatura informada entram sem essa
                                            parcela — nenhum valor de cartão é estimado.
                                        </p>
                                    </div>
                                </InfoPopover>
                            </div>
                            <Link href="/dashboard/projection" className="text-app-accent hover:underline">
                                Planejar
                            </Link>
                        </div>
                        <p className="mb-4 text-app-muted">Lançamentos, faturas de cartão e recorrências</p>

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
