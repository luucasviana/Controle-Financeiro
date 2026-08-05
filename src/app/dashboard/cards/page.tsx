import { getCardBalancesByMonth, getCards } from "@/app/actions/cards"
import { getDashboardData } from "@/app/actions/finance"
import { PageHeader } from "@/components/layout/page-header"
import type { Database } from "@/lib/database.types"
import { measureServerTiming } from "@/lib/server-timing"
import { CardDialog } from "./card-dialog"
import { CardConsumptionList } from "./card-consumption-list"
import { UpdateBalanceDialog } from "./update-balance-dialog"
import { getDashboardContext } from "../data"

type CardBalanceRow = Database["public"]["Tables"]["card_month_balances"]["Row"]
type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]

export default async function CardsPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const { activeMonth } = await measureServerTiming("cards-page", async () => {
        const searchParams = await props.searchParams
        return getDashboardContext(searchParams.monthId)
    })

    const cards = await getCards()

    let balances: CardBalanceRow[] = []
    let expenses: ExpenseRow[] = []
    if (activeMonth) {
        const [balancesResult, dashboardData] = await Promise.all([
            getCardBalancesByMonth(activeMonth.id),
            getDashboardData(activeMonth),
        ])
        balances = balancesResult
        expenses = dashboardData.expenses
    }

    return (
        <div className="flex-1 space-y-6">
            <PageHeader
                title="Cartões"
                description="Limite, consumo do período (da fatura informada) e lançamentos de cada cartão"
                actions={
                    <>
                        <UpdateBalanceDialog cards={cards} balances={balances} />
                        <CardDialog />
                    </>
                }
            />

            {!activeMonth && cards.length > 0 && (
                <p className="text-sm text-app-muted">
                    Nenhum mês ativo. O consumo exibido está zerado até que você crie um mês.
                </p>
            )}

            <CardConsumptionList cards={cards} balances={balances} expenses={expenses} />
        </div>
    )
}
