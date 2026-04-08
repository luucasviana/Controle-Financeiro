import { deleteCard } from "@/app/actions/cards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { Pencil, Trash2 } from "lucide-react"
import { UpdateBalanceDialog } from "./update-balance-dialog"

type CreditCardItem = {
    id: string
    name: string
    limit_amount: number
}

type CardBalanceItem = {
    card_id: string
    amount_current: number
    updated_on: string | null
}

type CardConsumptionListProps = {
    cards: CreditCardItem[]
    balances: CardBalanceItem[]
    variant?: "default" | "compact"
    emptyMessage?: string
}

function formatUpdatedOn(updatedOn: string | null) {
    if (!updatedOn) return "Sem atualização"
    return `Atualizado em: ${format(parseISO(updatedOn), "dd/MM/yyyy")}`
}

export function CardConsumptionList({
    cards,
    balances,
    variant = "default",
    emptyMessage = "Nenhum cartão cadastrado ainda.",
}: CardConsumptionListProps) {
    const consumptions = new Map<string, { amount: number, updated_on: string | null }>()

    balances.forEach((balance) => {
        consumptions.set(balance.card_id, {
            amount: balance.amount_current,
            updated_on: balance.updated_on,
        })
    })

    if (cards.length === 0) {
        return <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    }

    return (
        <div
            className={cn(
                variant === "compact" ? "space-y-3" : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            )}
        >
            {cards.map((card) => {
                const balanceData = consumptions.get(card.id) || { amount: 0, updated_on: null }
                const consumo = balanceData.amount
                const disponivel = card.limit_amount - consumo

                if (variant === "compact") {
                    return (
                        <Card key={card.id} className="gap-3 py-4">
                            <CardHeader className="px-4 pb-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {formatUpdatedOn(balanceData.updated_on)}
                                        </CardDescription>
                                    </div>
                                    <UpdateBalanceDialog
                                        cards={cards}
                                        balances={balances}
                                        initialCardId={card.id}
                                        lockCardSelection
                                        trigger={
                                            <button
                                                type="button"
                                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Editar
                                            </button>
                                        }
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pt-0">
                                <p className="text-xs text-muted-foreground">Consumo do mês</p>
                                <div className="text-lg font-semibold text-orange-600">{formatCurrency(consumo)}</div>
                            </CardContent>
                        </Card>
                    )
                }

                return (
                    <Card key={card.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
                                <CardDescription className="text-xs">{formatUpdatedOn(balanceData.updated_on)}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <UpdateBalanceDialog
                                    cards={cards}
                                    balances={balances}
                                    initialCardId={card.id}
                                    lockCardSelection
                                    trigger={
                                        <button
                                            type="button"
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Editar
                                        </button>
                                    }
                                />
                                <form
                                    action={async () => {
                                        "use server"
                                        await deleteCard(card.id)
                                    }}
                                >
                                    <button type="submit" className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="mt-2">
                                <p className="text-xs text-muted-foreground">Consumo no mês</p>
                                <div className="text-2xl font-bold text-orange-600">{formatCurrency(consumo)}</div>
                            </div>
                            <div className="flex items-center justify-between border-t pt-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">Disponível</p>
                                    <div className="text-sm font-medium text-green-600">{formatCurrency(disponivel)}</div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Limite total</p>
                                    <div className="text-sm font-medium">{formatCurrency(card.limit_amount)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
