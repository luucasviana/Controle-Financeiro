"use client"

import * as React from "react"
import { Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MonthData } from "@/app/actions/months"
import { formatCurrency } from "@/lib/utils"
import { ExpenseDialog } from "./expense-dialog"
import { ExpenseItem } from "./expense-item"
import type { Expense } from "./types"

type CardOption = { id: string; name: string }

interface ExpensesListProps {
    data: Expense[]
    month: MonthData
    cards: CardOption[]
    projectedBalance: number
    todayIso: string
}

export function ExpensesList({
    data,
    month,
    cards,
    projectedBalance,
    todayIso,
}: ExpensesListProps) {
    const [search, setSearch] = React.useState("")
    const [showPaid, setShowPaid] = React.useState(false)

    const filteredData = React.useMemo(() => {
        if (!search) return data
        const query = search.toLowerCase()
        return data.filter((item) => item.description.toLowerCase().includes(query))
    }, [data, search])

    const pending = React.useMemo(
        () => filteredData.filter((item) => item.status === "PLANNED"),
        [filteredData]
    )
    const paid = React.useMemo(
        () => filteredData.filter((item) => item.status === "PAID"),
        [filteredData]
    )
    const paidTotal = React.useMemo(() => paid.reduce((acc, item) => acc + item.amount, 0), [paid])

    const cardsMap = React.useMemo(() => {
        const map: Record<string, string> = {}
        cards.forEach((card) => (map[card.id] = card.name))
        return map
    }, [cards])

    const itemProps = { cardsMap, cards, month, projectedBalance, todayIso }

    return (
        <div>
            <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-app-faint" />
                    <Input
                        placeholder="Buscar descrição..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-8"
                    />
                </div>
                <ExpenseDialog
                    month={month}
                    projectedBalance={projectedBalance}
                    trigger={
                        <Button>
                            <Plus className="h-4 w-4" />
                            Nova despesa
                        </Button>
                    }
                />
            </div>

            <div className="hidden items-center gap-3 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-app-faint sm:flex">
                <span className="w-5 shrink-0" />
                <span className="min-w-0 flex-1">Descrição</span>
                <span className="w-[150px] shrink-0">Forma</span>
                <span className="w-[76px] shrink-0">Vence</span>
                <span className="w-[104px] shrink-0 text-right">Valor</span>
                <span className="w-8 shrink-0" />
            </div>

            <div className="flex flex-col gap-1">
                {pending.length > 0 ? (
                    pending.map((expense) => <ExpenseItem key={expense.id} expense={expense} {...itemProps} />)
                ) : (
                    <div className="rounded-control border border-app-border bg-app-hairline py-10 text-center text-app-muted">
                        Zero despesas encontradas.
                    </div>
                )}

                <div className="flex items-center gap-3 px-2 pt-4 pb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-app-faint">Pagas</span>
                    <span className="text-app-muted">
                        {paid.length} {paid.length === 1 ? "despesa" : "despesas"} · {formatCurrency(paidTotal)}
                    </span>
                    <span className="h-px flex-1 bg-app-hairline" />
                    <Button variant="ghost" size="sm" onClick={() => setShowPaid((value) => !value)}>
                        {showPaid ? "Ocultar" : "Mostrar"}
                    </Button>
                </div>

                {showPaid &&
                    (paid.length > 0 ? (
                        paid.map((expense) => <ExpenseItem key={expense.id} expense={expense} {...itemProps} />)
                    ) : (
                        <div className="rounded-control border border-app-border bg-app-hairline py-6 text-center text-app-muted">
                            Nenhuma despesa paga neste período.
                        </div>
                    ))}
            </div>
        </div>
    )
}
