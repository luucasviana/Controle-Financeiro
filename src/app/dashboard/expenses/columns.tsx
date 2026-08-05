"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { ExpenseActions } from "./expense-actions"

export type Expense = {
    id: string
    user_id: string
    month_id: string
    due_date: string
    description: string
    amount: number
    status: 'PLANNED' | 'PAID'
    payment_method: 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
    card_id: string | null
    recurring_expense_id: string | null
    occurrence_number: number | null
    occurrence_total: number | null
    paid_at: string | null
    is_excluded: boolean
    created_at: string
}

export const columns: ColumnDef<Expense>[] = [
    {
        accessorKey: "due_date",
        header: "Vencim.",
    },
    {
        accessorKey: "description",
        header: "Descrição",
    },
    {
        accessorKey: "amount",
        header: "Valor",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))
            return <div className="font-medium">{formatCurrency(amount)}</div>
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <Badge variant={status === 'PAID' ? 'default' : 'secondary'} className={status === 'PAID' ? 'bg-green-500 hover:bg-green-600 font-bold' : ''}>
                    {status === 'PAID' ? 'Paga' : 'Prevista'}
                </Badge>
            )
        }
    },
    {
        accessorKey: "payment_method",
        header: "Método",
    },
    {
        id: "actions",
        cell: ({ row }) => <ExpenseActions expense={row.original} />,
    }
]
