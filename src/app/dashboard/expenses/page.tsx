import { format } from "date-fns"
import { PiggyBank, Receipt } from "lucide-react"

import { getDashboardData } from "@/app/actions/finance"
import { getCards } from "@/app/actions/cards"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/ui/kpi-card"
import { Surface } from "@/components/ui/surface"
import { formatCurrency } from "@/lib/utils"
import { ExpensesList } from "./expenses-list"
import { getDashboardContext } from "../data"
import { measureServerTiming } from "@/lib/server-timing"

export default async function ExpensesPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const { activeMonth } = await measureServerTiming("expenses-page", async () => {
        const searchParams = await props.searchParams
        return getDashboardContext(searchParams.monthId)
    })

    if (!activeMonth) {
        return <div className="p-8 text-center text-app-muted">Nenhum período ativo. Vá para o Dashboard para criar um.</div>
    }

    const [{ expenses, totalExpense, projectedBalance }, cards] = await Promise.all([
        getDashboardData(activeMonth),
        getCards(),
    ])

    const todayIso = format(new Date(), "yyyy-MM-dd")

    return (
        <div className="flex-1 space-y-6">
            <PageHeader
                title="Movimentações"
                description={`${activeMonth.name} · ${activeMonth.status === "OPEN" ? "Em aberto" : "Encerrado"}`}
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard
                    label="Despesas do Período"
                    value={formatCurrency(totalExpense)}
                    icon={Receipt}
                    footnote="Previstas + pagas"
                />
                <KpiCard
                    label="Saldo Projetado"
                    value={formatCurrency(projectedBalance)}
                    tone={projectedBalance >= 0 ? "positive" : "negative"}
                    icon={PiggyBank}
                    hint="Pode incluir receitas de fontes ocultas"
                />
            </div>

            <Surface className="p-4">
                <ExpensesList
                    data={expenses}
                    month={activeMonth}
                    cards={cards}
                    projectedBalance={projectedBalance}
                    todayIso={todayIso}
                />
            </Surface>
        </div>
    )
}
