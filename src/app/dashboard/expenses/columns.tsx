"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { ExpenseActions } from "./expense-actions"

export type Expense = {
    id: string
    description: string
    amount: number
    due_date: string
    status: 'PLANNED' | 'PAID'
    payment_method: string
    card_id: string | null
    template_id: string | null
    installment_plan_id: string | null
    installment_number: number | null
    installment_total: number | null
    paid_at: string | null
    is_excluded: boolean
    month_id: string
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
