"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2, Copy } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ExpenseDialog } from "./expense-dialog"
import { deleteMonthExpense } from "@/app/actions/finance"
import { toast } from "sonner"
import { Expense } from "./columns"

export function ExpenseActions({ expense }: { expense: Expense }) {
    const [openEdit, setOpenEdit] = useState(false)
    const [openDuplicate, setOpenDuplicate] = useState(false)

    async function handleDelete() {
        if (confirm("Deseja realmente excluir esta despesa?")) {
            try {
                await deleteMonthExpense(expense.id)
                toast.success("Despesa excluída com sucesso!")
            } catch (e: any) {
                toast.error(e.message)
            }
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                        <Edit className="mr-2 h-4 w-4 text-blue-500" />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenDuplicate(true)}>
                        <Copy className="mr-2 h-4 w-4 text-emerald-500" />
                        Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ExpenseDialog
                mode="edit"
                expense={expense}
                open={openEdit}
                onOpenChange={setOpenEdit}
            />

            <ExpenseDialog
                mode="duplicate"
                expense={expense}
                open={openDuplicate}
                onOpenChange={setOpenDuplicate}
            />
        </>
    )
}
