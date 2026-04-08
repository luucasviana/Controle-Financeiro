import { getCardBalancesByMonth, getCards } from "@/app/actions/cards"
import { measureServerTiming } from "@/lib/server-timing"
import { CardDialog } from "./card-dialog"
import { CardConsumptionList } from "./card-consumption-list"
import { UpdateBalanceDialog } from "./update-balance-dialog"
import { getDashboardContext } from "../data"

export default async function CardsPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const { activeMonth } = await measureServerTiming("cards-page", async () => {
        const searchParams = await props.searchParams
        return getDashboardContext(searchParams.monthId)
    })

    const cards = await getCards()
    const balances = activeMonth ? await getCardBalancesByMonth(activeMonth.id) : []

    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cartões</h2>
                    <p className="text-muted-foreground">Gerencie seus cartões de crédito e veja o consumo</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <UpdateBalanceDialog cards={cards} balances={balances} />
                    <CardDialog />
                </div>
            </div>

            <CardConsumptionList cards={cards} balances={balances} />

            {!activeMonth && cards.length > 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum mês ativo. O consumo exibido está zerado até que você crie um mês.
                </p>
            )}
        </div>
    )
}
