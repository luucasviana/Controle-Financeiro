import { getCards } from "@/app/actions/cards"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { CardDialog } from "./card-dialog"
import { UpdateBalanceDialog } from "./update-balance-dialog"
import { Trash2 } from "lucide-react"
import { deleteCard } from "@/app/actions/cards"
import { format } from "date-fns"
import { getMonths, getOpenMonthOrLatest, getMonthById } from "@/app/actions/months"

export default async function CardsPage(props: { searchParams: Promise<{ monthId?: string }> }) {
    const searchParams = await props.searchParams
    const monthId = searchParams.monthId

    const months = await getMonths()
    const activeMonth = monthId ? await getMonthById(monthId) : await getOpenMonthOrLatest()

    const cards = await getCards()

    const consumptions: Record<string, { amount: number, updated_on: string | null }> = {}

    let balances: any[] = []
    if (activeMonth) {
        const supabase = await createClient() as any

        const { data: monthBalances } = await supabase
            .from("card_month_balances")
            .select("*")
            .eq("month_id", activeMonth.id)

        if (monthBalances) {
            balances = monthBalances
            monthBalances.forEach((balance: any) => {
                consumptions[balance.card_id] = { amount: balance.amount_current, updated_on: balance.updated_on }
            })
        }
    }

    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cartões</h2>
                    <p className="text-muted-foreground">Gerencie seus cartões de crédito e veja o consumo</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <UpdateBalanceDialog cards={cards} balances={balances} />
                    <CardDialog />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card: any) => {
                    const balanceData = consumptions[card.id] || { amount: 0, updated_on: null }
                    const consumo = balanceData.amount
                    const disponivel = card.limit_amount - consumo

                    return (
                        <Card key={card.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div>
                                    <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
                                    {balanceData.updated_on && (
                                        <CardDescription className="text-xs">
                                            Atualizado em: {format(new Date(balanceData.updated_on), "dd/MM/yyyy")}
                                        </CardDescription>
                                    )}
                                </div>
                                <form action={async () => {
                                    "use server"
                                    await deleteCard(card.id)
                                }}>
                                    <button type="submit" className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </form>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="mt-2">
                                    <p className="text-xs text-muted-foreground">Consumo no mês</p>
                                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(consumo)}</div>
                                </div>
                                <div className="pt-2 border-t flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Disponível</p>
                                        <div className="text-sm font-medium text-green-600">{formatCurrency(disponivel)}</div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Limite Total</p>
                                        <div className="text-sm font-medium">{formatCurrency(card.limit_amount)}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {!activeMonth && cards.length > 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                    Nenhum mês ativo. O consumo exibido está zerado até que você crie um mês.
                </p>
            )}
        </div>
    )
}
