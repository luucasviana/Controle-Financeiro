import { getDashboardData } from "@/app/actions/finance"
import { getCards } from "@/app/actions/cards"
import { ExpensesList } from "./expenses-list"
import { getDashboardContext } from "../data"
import { measureServerTiming } from "@/lib/server-timing"

export default async function ExpensesPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const { activeMonth } = await measureServerTiming("expenses-page", async () => {
        const searchParams = await props.searchParams
        return getDashboardContext(searchParams.monthId)
    })

    if (!activeMonth) {
        return <div className="p-8 text-center text-muted-foreground">Nenhum mês ativo. Vá para o Dashboard para criar um.</div>
    }

    const { expenses } = await getDashboardData(activeMonth)
    const cards = await getCards()

    return (
        <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Despesas</h2>
            </div>

            <div className="bg-white rounded-md shadow-sm border p-4">
                <ExpensesList data={expenses} month={activeMonth} cards={cards} />
            </div>
        </div>
    )
}
