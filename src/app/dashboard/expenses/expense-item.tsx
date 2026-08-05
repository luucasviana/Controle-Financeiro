"use client"

import { format, parseISO } from "date-fns"
import { Calculator } from "lucide-react"

import { Tag } from "@/components/ui/tag"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import type { MonthData } from "@/app/actions/months"
import type { PaymentSuggestion } from "@/app/actions/recurring-expenses"
import { cn, formatCurrency } from "@/lib/utils"
import { ExpenseActions } from "./expense-actions"
import { PayPopover } from "./pay-popover"
import { PAYMENT_METHOD_LABELS, getOccurrenceLabel, isExpenseOverdue } from "./expense-meta"
import type { Expense } from "./types"

type CardOption = { id: string; name: string }

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
    paymentSuggestions,
    month,
    projectedBalance,
    todayIso,
}: {
    expense: Expense
    cardsMap: Record<string, string>
    cards: CardOption[]
    paymentSuggestions: Record<string, PaymentSuggestion>
    month: MonthData
    projectedBalance: number
    todayIso: string
}) {
    const { hiddenModeEnabled } = useHiddenMode()
    const isPaid = expense.status === "PAID"
    const excludedVisual = hiddenModeEnabled && expense.is_excluded
    const isOverdue = isExpenseOverdue(expense, todayIso)

    const dueLabel = format(parseISO(expense.due_date), "dd/MM")
    const formaLabel = buildFormaLabel(expense, cardsMap)
    const occurrenceLabel = getOccurrenceLabel(expense)

    // Abaixo de `sm` as colunas "Forma"/"Vence" (fixas em ~230px + gaps) estouram
    // a viewport de celular — o cabeçalho já se esconde nesse ponto
    // (expenses-list.tsx). Aqui elas somem e a mesma informação reaparece numa
    // segunda linha, abaixo da descrição, só visível em telas estreitas.
    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-control px-2 py-2.5 hover:bg-app-hairline",
                isPaid && "opacity-55 hover:opacity-100"
            )}
        >
            <PayPopover
                expense={expense}
                cards={cards}
                suggestion={
                    expense.recurring_expense_id
                        ? paymentSuggestions[expense.recurring_expense_id]
                        : undefined
                }
            />

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

                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-app-muted sm:hidden">
                    {formaLabel !== "—" && <span className="truncate">{formaLabel}</span>}
                    {formaLabel !== "—" && <span className="text-app-faint">·</span>}
                    {isOverdue ? (
                        <Tag tone="negative">venceu {dueLabel}</Tag>
                    ) : (
                        <span>{dueLabel}</span>
                    )}
                </div>
            </div>

            <span className="hidden w-[150px] shrink-0 truncate text-app-muted sm:block">{formaLabel}</span>

            <span className="hidden w-[76px] shrink-0 sm:block">
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
