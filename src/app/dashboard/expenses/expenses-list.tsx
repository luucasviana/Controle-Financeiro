"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { ExpenseDialog } from "./expense-dialog"
import { ExpenseItem } from "./expense-item"
import { Expense } from "./columns"

interface ExpensesListProps {
    data: Expense[]
    month: any
    cards: any[]
}

export function ExpensesList({
    data,
    month,
    cards
}: ExpensesListProps) {
    const [search, setSearch] = React.useState("")

    const filteredData = React.useMemo(() => {
        if (!search) return data
        return data.filter(item => item.description.toLowerCase().includes(search.toLowerCase()))
    }, [data, search])

    const cardsMap: Record<string, string> = {}
    cards.forEach(c => cardsMap[c.id] = c.name)

    return (
        <div>
            <div className="flex items-center justify-between pb-4">
                <Input
                    placeholder="Buscar descrição..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="max-w-sm"
                />
                <ExpenseDialog month={month} />
            </div>

            <div className="space-y-3">
                {filteredData.length > 0 ? (
                    filteredData.map(expense => (
                        <ExpenseItem key={expense.id} expense={expense} cardsMap={cardsMap} />
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-500 border rounded-lg bg-slate-50">
                        Zero despesas encontradas.
                    </div>
                )}
            </div>
        </div>
    )
}
