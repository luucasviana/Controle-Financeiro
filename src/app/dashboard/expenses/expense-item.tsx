"use client"

import { format, parseISO } from "date-fns"
import { Calculator } from "lucide-react"

import { Tag } from "@/components/ui/tag"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import type { MonthData } from "@/app/actions/months"
import { cn, formatCurrency } from "@/lib/utils"
import { ExpenseActions } from "./expense-actions"
import { PayPopover } from "./pay-popover"
import type { Expense } from "./columns"

type CardOption = { id: string; name: string }

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    PIX: "Pix",
    DEBIT: "Débito",
    CASH: "Dinheiro",
    CREDIT_CARD: "Cartão de crédito",
    NONE: "",
}

function buildFormaLabel(expense: Expense, cardsMap: Record<string, string>) {
    if (expense.status !== "PAID") return "—"

    const methodLabel = PAYMENT_METHOD_LABELS[expense.payment_method] || expense.payment_method
    const cardName = expense.card_id ? cardsMap[expense.card_id] : null

    if (expense.payment_method === "CREDIT_CARD" && cardName) {
        return `${methodLabel} · ${cardName}`
    }

    return methodLabel
}

export function ExpenseItem({
    expense,
    cardsMap,
    cards,
    month,
    projectedBalance,
    todayIso,
}: {
    expense: Expense
    cardsMap: Record<string, string>
    cards: CardOption[]
    month: MonthData
    projectedBalance: number
    todayIso: string
}) {
    const { hiddenModeEnabled } = useHiddenMode()
    const isPaid = expense.status === "PAID"
    const excludedVisual = hiddenModeEnabled && expense.is_excluded
    // Comparação só de data (due_date é "yyyy-MM-dd"), sem hora — senão uma
    // despesa que vence hoje seria marcada como atrasada.
    const isOverdue = !isPaid && expense.due_date < todayIso

    const dueLabel = format(parseISO(expense.due_date), "dd/MM")
    const formaLabel = buildFormaLabel(expense, cardsMap)

    const occurrenceLabel = expense.recurring_expense_id
        ? expense.occurrence_total
            ? `${expense.occurrence_number}/${expense.occurrence_total}`
            : "Recorrente"
        : null

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-control px-2 py-2.5 hover:bg-app-hairline",
                isPaid && "opacity-55 hover:opacity-100"
            )}
        >
            <PayPopover expense={expense} cards={cards} />

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("truncate text-app-ink", isPaid && "line-through")}>
                        {expense.description}
                    </span>
                    {occurrenceLabel && (
                        <Tag tone="neutral" className="shrink-0">
                            {occurrenceLabel}
                        </Tag>
                    )}
                    {excludedVisual && (
                        <Tag tone="warn" className="shrink-0 gap-1">
                            <Calculator className="h-3 w-3" /> Fora do cálculo
                        </Tag>
                    )}
                </div>
            </div>

            <span className="w-[150px] shrink-0 truncate text-app-muted">{formaLabel}</span>

            <span className="w-[76px] shrink-0">
                {isOverdue ? (
                    <Tag tone="negative">venceu {dueLabel}</Tag>
                ) : (
                    <span className="text-app-muted">{dueLabel}</span>
                )}
            </span>

            <span className="w-[104px] shrink-0 text-right font-medium tabular-nums text-app-ink">
                {formatCurrency(expense.amount)}
            </span>

            <ExpenseActions expense={expense} month={month} projectedBalance={projectedBalance} />
        </div>
    )
}
