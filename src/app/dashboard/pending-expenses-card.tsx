"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import {
    Calculator,
    Copy,
    Layers,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InfoPopover } from "@/components/ui/info-popover"
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
import type { PaymentSuggestion } from "@/app/actions/recurring-expenses"
import type { Database } from "@/lib/database.types"
import { cn, formatCurrency } from "@/lib/utils"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import { ExpenseDialog } from "./expenses/expense-dialog"
import { PayPopover } from "./expenses/pay-popover"
import {
    PAYMENT_METHOD_LABELS,
    getOccurrenceLabel,
    getSuggestionBadgeLabel,
    isExpenseOverdue,
} from "./expenses/expense-meta"

type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]
type CardRow = Database["public"]["Tables"]["cards"]["Row"]

function buildMeta(expense: ExpenseRow, cardsMap: Record<string, string>) {
    const parts: string[] = []

    const methodLabel = PAYMENT_METHOD_LABELS[expense.payment_method] || ""
    if (expense.status === "PAID" && methodLabel) parts.push(methodLabel)

    if (expense.payment_method === "CREDIT_CARD" && expense.card_id && cardsMap[expense.card_id]) {
        parts.push(cardsMap[expense.card_id])
    }

    // Ocorrência (N/total ou "Recorrente") vira badge ao lado da descrição —
    // ver ExpenseRowItem — para ficar igual ao tratamento de Movimentações,
    // não repetida aqui como texto.

    return parts.join(" · ")
}

const UNASSIGNED_MODALITY_LABEL = "Sem modalidade definida"

type ModalityGroup = {
    label: string
    total: number
    expenses: ExpenseRow[]
}

/**
 * Agrupa as despesas previstas pelo mesmo rótulo já exibido no badge da
 * linha (`getSuggestionBadgeLabel`), para que o grupo em que a despesa cai
 * seja sempre o mesmo texto que o usuário lê nela — inclusive separando
 * cartões diferentes, já que cada um é uma fatura distinta. Despesas sem
 * modalidade sugerida caem num grupo residual.
 *
 * `pending` já chega ordenada por vencimento mais próximo (ver page.tsx);
 * como cada despesa é empurrada no array do seu grupo na ordem em que é
 * percorrida, essa ordem é preservada dentro de cada grupo.
 *
 * Grupos são ordenados por subtotal decrescente, com o grupo residual
 * sempre por último — a soma dos subtotais é necessariamente igual à soma
 * de `pending`, pois toda despesa é contada em exatamente um grupo.
 */
function groupPendingByModality(
    pending: ExpenseRow[],
    paymentSuggestions: Record<string, PaymentSuggestion>,
    cardsMap: Record<string, string>
): ModalityGroup[] {
    const groups = new Map<string, ModalityGroup>()

    for (const expense of pending) {
        const label = getSuggestionBadgeLabel(expense, paymentSuggestions, cardsMap) || UNASSIGNED_MODALITY_LABEL
        const group = groups.get(label)
        if (group) {
            group.total += expense.amount
            group.expenses.push(expense)
        } else {
            groups.set(label, { label, total: expense.amount, expenses: [expense] })
        }
    }

    return Array.from(groups.values()).sort((a, b) => {
        if (a.label === UNASSIGNED_MODALITY_LABEL) return 1
        if (b.label === UNASSIGNED_MODALITY_LABEL) return -1
        return b.total - a.total
    })
}

function RowActions({
    expense,
    onEdit,
    month,
    projectedBalance,
}: {
    expense: ExpenseRow
    onEdit: () => void
    month: MonthData
    projectedBalance: number
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

function ExpenseRowItem({
    expense,
    cardsMap,
    cards,
    paymentSuggestions,
    month,
    projectedBalance,
    todayIso,
}: {
    expense: ExpenseRow
    cardsMap: Record<string, string>
    cards: CardRow[]
    paymentSuggestions: Record<string, PaymentSuggestion>
    month: MonthData
    projectedBalance: number
    todayIso: string
}) {
    const { hiddenModeEnabled } = useHiddenMode()
    const [openEdit, setOpenEdit] = useState(false)

    const isPaid = expense.status === "PAID"
    const excludedVisual = hiddenModeEnabled && expense.is_excluded
    const isOverdue = isExpenseOverdue(expense, todayIso)
    const meta = buildMeta(expense, cardsMap)
    const dueLabel = format(parseISO(expense.due_date), "dd/MM")
    const occurrenceLabel = getOccurrenceLabel(expense)
    const suggestionLabel = getSuggestionBadgeLabel(expense, paymentSuggestions, cardsMap)

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-control px-2 py-2 hover:bg-app-hairline",
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
                <div className="flex items-center gap-2">
                    <span className={cn("truncate text-app-ink", isPaid && "line-through")}>
                        {expense.description}
                    </span>
                    {occurrenceLabel && (
                        <Tag tone="neutral" className="shrink-0">
                            {occurrenceLabel}
                        </Tag>
                    )}
                    {suggestionLabel && (
                        // Escondido abaixo de `sm`, mesmo critério de expense-item.tsx: esta
                        // linha não tem flex-wrap e já concorre com descrição + badge de
                        // ocorrência + data + valor pelo espaço disponível.
                        <Tag tone="neutral" className="hidden shrink-0 sm:inline-flex">
                            {suggestionLabel}
                        </Tag>
                    )}
                    {excludedVisual && (
                        <Tag tone="warn" className="shrink-0 gap-1">
                            <Calculator className="h-3 w-3" /> Fora do cálculo
                        </Tag>
                    )}
                </div>
                {meta && <div className="truncate text-[11px] text-app-muted">{meta}</div>}
            </div>

            {!isPaid && (
                <span className="shrink-0">
                    {isOverdue ? (
                        <Tag tone="negative">venceu {dueLabel}</Tag>
                    ) : (
                        <span className="text-[11px] text-app-muted">{dueLabel}</span>
                    )}
                </span>
            )}

            <span className="min-w-[88px] shrink-0 text-right font-medium tabular-nums text-app-ink">
                {formatCurrency(expense.amount)}
            </span>

            <RowActions
                expense={expense}
                onEdit={() => setOpenEdit(true)}
                month={month}
                projectedBalance={projectedBalance}
            />

            <ExpenseDialog
                mode="edit"
                expense={expense}
                month={month}
                projectedBalance={projectedBalance}
                open={openEdit}
                onOpenChange={setOpenEdit}
            />
        </div>
    )
}

export function PendingExpensesCard({
    month,
    pending,
    paid,
    cardsMap,
    cards,
    paymentSuggestions,
    projectedBalance,
    todayIso,
}: {
    month: MonthData
    pending: ExpenseRow[]
    paid: ExpenseRow[]
    cardsMap: Record<string, string>
    cards: CardRow[]
    paymentSuggestions: Record<string, PaymentSuggestion>
    projectedBalance: number
    todayIso: string
}) {
    const [showPaid, setShowPaid] = useState(false)
    const [groupByMethod, setGroupByMethod] = useState(false)

    const pendingTotal = pending.reduce((acc, expense) => acc + expense.amount, 0)
    const paidTotal = paid.reduce((acc, expense) => acc + expense.amount, 0)

    const rowProps = { cardsMap, cards, paymentSuggestions, month, projectedBalance, todayIso }

    const modalityGroups = groupByMethod
        ? groupPendingByModality(pending, paymentSuggestions, cardsMap)
        : null

    return (
        <Surface className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-app-hairline p-4">
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-app-ink">A pagar em {month.name}</span>
                        <InfoPopover title={`A pagar em ${month.name}`}>
                            <div className="space-y-1.5">
                                <p className="font-medium text-app-ink">A pagar em {month.name}</p>
                                <p>
                                    As despesas ainda não pagas, da mais próxima de vencer para a mais distante.
                                </p>
                                <p>
                                    O total soma todas, inclusive as marcadas como{" "}
                                    <span className="text-app-ink">&quot;fora do cálculo&quot;</span> — a conta
                                    continua chegando, mesmo que você tenha escolhido não contá-la no orçamento. É
                                    por isso que esse total pode ser diferente do &quot;Falta pagar&quot; ali em
                                    cima.
                                </p>
                            </div>
                        </InfoPopover>
                    </div>
                    <div className="text-app-muted">
                        {pending.length} {pending.length === 1 ? "despesa" : "despesas"} · {formatCurrency(pendingTotal)}
                    </div>
                </div>
                <div className="flex-1" />
                <Button
                    variant={groupByMethod ? "default" : "secondary"}
                    size="icon-sm"
                    aria-pressed={groupByMethod}
                    aria-label={
                        groupByMethod
                            ? "Desagrupar lista por modalidade de pagamento"
                            : "Agrupar lista por modalidade de pagamento"
                    }
                    title="Agrupar por modalidade de pagamento"
                    onClick={() => setGroupByMethod((value) => !value)}
                >
                    <Layers className="h-4 w-4" />
                </Button>
                <ExpenseDialog
                    month={month}
                    projectedBalance={projectedBalance}
                    trigger={
                        <Button variant="secondary" size="sm">
                            <Plus className="h-4 w-4" />
                            Adicionar
                        </Button>
                    }
                />
            </div>

            <div className="flex flex-col gap-1 p-2">
                {modalityGroups
                    ? modalityGroups.map((group, index) => (
                          <div key={group.label} className="flex flex-col gap-1">
                              <div className={cn("flex items-center gap-3 px-2 pb-1", index === 0 ? "pt-1" : "pt-3")}>
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-app-faint">
                                      {group.label}
                                  </span>
                                  <span className="h-px flex-1 bg-app-hairline" />
                                  <span className="text-[11px] font-medium tabular-nums text-app-muted">
                                      {formatCurrency(group.total)}
                                  </span>
                              </div>
                              {group.expenses.map((expense) => (
                                  <ExpenseRowItem key={expense.id} expense={expense} {...rowProps} />
                              ))}
                          </div>
                      ))
                    : pending.map((expense) => (
                          <ExpenseRowItem key={expense.id} expense={expense} {...rowProps} />
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
                        <ExpenseRowItem key={expense.id} expense={expense} {...rowProps} />
                    ))}
            </div>
        </Surface>
    )
}
