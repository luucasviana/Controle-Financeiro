"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import {
    Calculator,
    CheckCircle2,
    Circle,
    Copy,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { Tag } from "@/components/ui/tag"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteMonthExpense } from "@/app/actions/finance"
import type { MonthData } from "@/app/actions/months"
import type { Database } from "@/lib/database.types"
import { cn, formatCurrency } from "@/lib/utils"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import { ExpenseDialog } from "./expenses/expense-dialog"

type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    PIX: "Pix",
    DEBIT: "Débito",
    CASH: "Dinheiro",
    CREDIT_CARD: "Cartão de crédito",
    NONE: "",
}

function buildMeta(expense: ExpenseRow, cardsMap: Record<string, string>) {
    const parts: string[] = []

    const methodLabel = PAYMENT_METHOD_LABELS[expense.payment_method] || ""
    if (expense.status === "PAID" && methodLabel) parts.push(methodLabel)

    if (expense.payment_method === "CREDIT_CARD" && expense.card_id && cardsMap[expense.card_id]) {
        parts.push(cardsMap[expense.card_id])
    }

    if (expense.occurrence_number && expense.occurrence_total) {
        parts.push(`Parcela ${expense.occurrence_number}/${expense.occurrence_total}`)
    }

    return parts.join(" · ")
}

function RowActions({
    expense,
    onEdit,
}: {
    expense: ExpenseRow
    onEdit: () => void
}) {
    const [openDuplicate, setOpenDuplicate] = useState(false)

    async function handleDelete() {
        if (!confirm("Deseja realmente excluir esta despesa?")) return
        try {
            await deleteMonthExpense(expense.id)
            toast.success("Despesa excluída com sucesso!")
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível excluir.")
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
                    <DropdownMenuItem onClick={onEdit}>
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

            <ExpenseDialog mode="duplicate" expense={expense} open={openDuplicate} onOpenChange={setOpenDuplicate} />
        </>
    )
}

function ExpenseRowItem({
    expense,
    cardsMap,
    todayIso,
}: {
    expense: ExpenseRow
    cardsMap: Record<string, string>
    todayIso: string
}) {
    const { hiddenModeEnabled } = useHiddenMode()
    const [openEdit, setOpenEdit] = useState(false)

    const isPaid = expense.status === "PAID"
    const excludedVisual = hiddenModeEnabled && expense.is_excluded
    const isOverdue = !isPaid && expense.due_date < todayIso
    const meta = buildMeta(expense, cardsMap)
    const dueLabel = format(parseISO(expense.due_date), "dd/MM")

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-control px-2 py-2 hover:bg-app-hairline",
                isPaid && "opacity-55 hover:opacity-100"
            )}
        >
            <button
                type="button"
                onClick={() => setOpenEdit(true)}
                title={isPaid ? "Editar despesa paga" : "Marcar como paga"}
                className="shrink-0 text-app-faint hover:text-app-accent"
            >
                {isPaid ? <CheckCircle2 className="h-5 w-5 text-app-muted" /> : <Circle className="h-5 w-5" />}
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={cn("truncate text-app-ink", isPaid && "line-through")}>
                        {expense.description}
                    </span>
                    {excludedVisual && (
                        <Tag tone="warn" className="shrink-0 gap-1">
                            <Calculator className="h-3 w-3" /> Fora do cálculo
                        </Tag>
                    )}
                </div>
                {meta && <div className="truncate text-[11px] text-app-muted">{meta}</div>}
            </div>

            {!isPaid && (
                <span className={cn("shrink-0 text-[11px]", isOverdue ? "text-app-accent" : "text-app-muted")}>
                    {dueLabel}
                </span>
            )}

            <span className="min-w-[88px] shrink-0 text-right font-medium tabular-nums text-app-ink">
                {formatCurrency(expense.amount)}
            </span>

            <RowActions expense={expense} onEdit={() => setOpenEdit(true)} />

            <ExpenseDialog mode="edit" expense={expense} open={openEdit} onOpenChange={setOpenEdit} />
        </div>
    )
}

export function PendingExpensesCard({
    month,
    pending,
    paid,
    cardsMap,
    todayIso,
}: {
    month: MonthData
    pending: ExpenseRow[]
    paid: ExpenseRow[]
    cardsMap: Record<string, string>
    todayIso: string
}) {
    const [showPaid, setShowPaid] = useState(false)

    const pendingTotal = pending.reduce((acc, expense) => acc + expense.amount, 0)
    const paidTotal = paid.reduce((acc, expense) => acc + expense.amount, 0)

    return (
        <Surface className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-app-hairline p-4">
                <div>
                    <div className="text-[13px] font-medium text-app-ink">A pagar em {month.name}</div>
                    <div className="text-app-muted">
                        {pending.length} {pending.length === 1 ? "despesa" : "despesas"} · {formatCurrency(pendingTotal)}
                    </div>
                </div>
                <div className="flex-1" />
                <ExpenseDialog
                    month={month}
                    trigger={
                        <Button variant="secondary" size="sm">
                            <Plus className="h-4 w-4" />
                            Adicionar
                        </Button>
                    }
                />
            </div>

            <div className="flex flex-col gap-1 p-2">
                {pending.map((expense) => (
                    <ExpenseRowItem key={expense.id} expense={expense} cardsMap={cardsMap} todayIso={todayIso} />
                ))}
                {pending.length === 0 && (
                    <p className="py-8 text-center text-app-muted">Nenhuma despesa prevista para este período.</p>
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
                    paid.map((expense) => (
                        <ExpenseRowItem key={expense.id} expense={expense} cardsMap={cardsMap} todayIso={todayIso} />
                    ))}
            </div>
        </Surface>
    )
}
