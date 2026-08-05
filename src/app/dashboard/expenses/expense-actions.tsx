"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash2, Copy } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ExpenseDialog } from "./expense-dialog"
import { deleteMonthExpense } from "@/app/actions/finance"
import { toast } from "sonner"
import type { MonthData } from "@/app/actions/months"
import type { Expense } from "./types"

export function ExpenseActions({
    expense,
    month,
    projectedBalance,
}: {
    expense: Expense
    /** Período atualmente exibido — repassado ao ExpenseDialog para a prévia de sobra. */
    month?: MonthData
    projectedBalance?: number
}) {
    const [openEdit, setOpenEdit] = useState(false)
    const [openDuplicate, setOpenDuplicate] = useState(false)

    async function handleDelete() {
        if (confirm("Deseja realmente excluir esta despesa?")) {
            try {
                await deleteMonthExpense(expense.id)
                toast.success("Despesa excluída com sucesso!")
            } catch (error: unknown) {
                toast.error(error instanceof Error ? error.message : "Não foi possível excluir.")
            }
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="shrink-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenDuplicate(true)}>
                        <Copy className="h-4 w-4" />
                        Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ExpenseDialog
                mode="edit"
                expense={expense}
                month={month}
                projectedBalance={projectedBalance}
                open={openEdit}
                onOpenChange={setOpenEdit}
            />

            <ExpenseDialog
                mode="duplicate"
                expense={expense}
                month={month}
                projectedBalance={projectedBalance}
                open={openDuplicate}
                onOpenChange={setOpenDuplicate}
            />
        </>
    )
}
