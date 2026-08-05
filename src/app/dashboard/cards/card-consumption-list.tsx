"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { CreditCard, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteCard } from "@/app/actions/cards"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Surface } from "@/components/ui/surface"
import { Tag } from "@/components/ui/tag"
import type { Database } from "@/lib/database.types"
import { formatCurrency } from "@/lib/utils"
import { UpdateBalanceDialog } from "./update-balance-dialog"

type CardRow = Database["public"]["Tables"]["cards"]["Row"]
type CardBalanceRow = Database["public"]["Tables"]["card_month_balances"]["Row"]
type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]

/**
 * Acima desse percentual do limite, o cartão ganha a tag "Limite apertado".
 * Constante fixa no código — não é preferência do usuário.
 */
const LIMITE_ALERTA_PCT = 75

type CardConsumptionListProps = {
    cards: CardRow[]
    balances: CardBalanceRow[]
    /** Despesas do mês — usadas só para listar lançamentos por cartão, não para calcular consumo. */
    expenses?: ExpenseRow[]
    variant?: "default" | "compact"
    emptyMessage?: string
}

function formatUpdatedOn(updatedOn: string | null) {
    if (!updatedOn) return "Sem atualização"
    return `Fatura atualizada em ${format(parseISO(updatedOn), "dd/MM/yyyy")}`
}

export function CardConsumptionList({
    cards,
    balances,
    expenses = [],
    variant = "default",
    emptyMessage = "Nenhum cartão cadastrado ainda.",
}: CardConsumptionListProps) {
    const consumptions = new Map<string, { amount: number; updated_on: string | null }>()

    balances.forEach((balance) => {
        consumptions.set(balance.card_id, {
            amount: balance.amount_current,
            updated_on: balance.updated_on,
        })
    })

    if (cards.length === 0) {
        return <p className="py-4 text-center text-sm text-app-muted">{emptyMessage}</p>
    }

    if (variant === "compact") {
        return (
            <div className="space-y-3">
                {cards.map((card) => {
                    const balanceData = consumptions.get(card.id) || { amount: 0, updated_on: null }
                    const consumo = balanceData.amount
                    const limit = card.limit_amount || 0
                    const pct = limit > 0 ? Math.min(100, (consumo / limit) * 100) : 0

                    return (
                        <div key={card.id}>
                            <div className="mb-2 flex items-baseline justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-app-ink">{card.name}</span>
                                    <UpdateBalanceDialog
                                        cards={cards}
                                        balances={balances}
                                        initialCardId={card.id}
                                        lockCardSelection
                                        trigger={
                                            <button
                                                type="button"
                                                title="Atualizar fatura"
                                                className="shrink-0 text-app-faint hover:text-app-accent"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        }
                                    />
                                </div>
                                <span className="shrink-0 font-medium tabular-nums text-app-ink">
                                    {formatCurrency(consumo)}
                                </span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                            <div className="mt-1 flex justify-between text-[11px] text-app-muted">
                                <span>{formatCurrency(Math.max(0, limit - consumo))} disponível</span>
                                <span>{pct.toFixed(0)}%</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
                const balanceData = consumptions.get(card.id) || { amount: 0, updated_on: null }
                const cardExpenses = expenses.filter(
                    (expense) => expense.card_id === card.id && expense.payment_method === "CREDIT_CARD"
                )

                return (
                    <CardTile
                        key={card.id}
                        card={card}
                        cards={cards}
                        balances={balances}
                        consumo={balanceData.amount}
                        updatedOn={balanceData.updated_on}
                        expenses={cardExpenses}
                    />
                )
            })}
        </div>
    )
}

function CardTile({
    card,
    cards,
    balances,
    consumo,
    updatedOn,
    expenses,
}: {
    card: CardRow
    cards: CardRow[]
    balances: CardBalanceRow[]
    consumo: number
    updatedOn: string | null
    expenses: ExpenseRow[]
}) {
    const [updateOpen, setUpdateOpen] = useState(false)

    const limit = card.limit_amount || 0
    const pct = limit > 0 ? (consumo / limit) * 100 : 0
    const disponivel = limit - consumo
    const isApertado = limit > 0 && pct > LIMITE_ALERTA_PCT

    async function handleDelete() {
        const confirmed = confirm(
            `Excluir "${card.name}"?\n\nO histórico de faturas desse cartão será apagado em TODOS os períodos, inclusive os já fechados.`
        )
        if (!confirmed) return

        try {
            await deleteCard(card.id)
            toast.success("Cartão excluído.")
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível excluir.")
        }
    }

    return (
        <Surface className="flex flex-col p-6">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium text-app-ink">{card.name}</div>
                    <div className="mt-0.5 text-xs text-app-muted">{formatUpdatedOn(updatedOn)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Tag tone={isApertado ? "negative" : "neutral"}>
                        {isApertado ? "Limite apertado" : "Saudável"}
                    </Tag>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="shrink-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setUpdateOpen(true)}>
                                <CreditCard className="h-4 w-4" />
                                Atualizar fatura
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                                Excluir cartão
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="mt-4 text-2xl font-bold tabular-nums text-app-ink">{formatCurrency(consumo)}</div>
            <div className="text-app-muted">de {formatCurrency(limit)} de limite</div>

            <Progress value={pct} className="mt-4" />
            <div className="mt-2 flex justify-between text-app-muted">
                <span>{formatCurrency(Math.max(0, disponivel))} disponível</span>
                <span>{pct.toFixed(0)}%</span>
            </div>

            <div className="mt-6 border-t border-app-hairline pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">
                    Lançamentos
                </div>
                <p className="mt-1 text-xs text-app-faint">
                    Só para conferência — o valor acima vem da fatura informada, não da soma destes itens.
                </p>
                <div className="mt-3 flex max-h-40 flex-col gap-1.5 overflow-auto">
                    {expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between gap-3">
                            <span className="truncate text-app-muted">{expense.description}</span>
                            <span className="shrink-0 tabular-nums text-app-ink">
                                {formatCurrency(expense.amount)}
                            </span>
                        </div>
                    ))}
                    {expenses.length === 0 && (
                        <p className="py-2 text-center text-xs text-app-faint">
                            Nenhum lançamento neste cartão no período.
                        </p>
                    )}
                </div>
            </div>

            <UpdateBalanceDialog
                cards={cards}
                balances={balances}
                initialCardId={card.id}
                lockCardSelection
                showTrigger={false}
                open={updateOpen}
                onOpenChange={setUpdateOpen}
            />
        </Surface>
    )
}
