import type { Database } from "@/lib/database.types"
import type { PaymentSuggestion } from "@/app/actions/recurring-expenses"

type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]

/**
 * Rótulos de método de pagamento e helpers de exibição compartilhados entre
 * `expense-item.tsx` (Movimentações) e `pending-expenses-card.tsx` (Visão
 * geral) — as duas telas mostram a mesma despesa e não podiam divergir na
 * forma de apresentar ocorrência/atraso.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    PIX: "Pix",
    DEBIT: "Débito",
    CASH: "Dinheiro",
    CREDIT_CARD: "Cartão de crédito",
    NONE: "",
}

/**
 * Rótulo do badge de ocorrência: "N/total" quando o plano recorrente tem
 * prazo definido, "Recorrente" quando é sem prazo (`occurrence_total` nulo).
 * Despesas avulsas (sem `recurring_expense_id`) não têm badge — checar só
 * `occurrence_total === null` marcaria toda despesa avulsa como "Recorrente".
 */
export function getOccurrenceLabel(
    expense: Pick<ExpenseRow, "recurring_expense_id" | "occurrence_number" | "occurrence_total">
) {
    if (!expense.recurring_expense_id) return null
    if (expense.occurrence_total) return `${expense.occurrence_number}/${expense.occurrence_total}`
    return "Recorrente"
}

/**
 * Atrasada = ainda prevista e o vencimento já passou. Comparação só de data
 * (`due_date` é "yyyy-MM-dd", sem hora) — senão uma despesa que vence hoje
 * seria marcada como atrasada.
 */
export function isExpenseOverdue(expense: Pick<ExpenseRow, "status" | "due_date">, todayIso: string) {
    return expense.status === "PLANNED" && expense.due_date < todayIso
}

/**
 * Rótulo do badge de sugestão de método da recorrência, mostrado ao lado do
 * badge de ocorrência. Só faz sentido em despesas ainda previstas: uma
 * despesa paga já exibe o método realmente usado, e repetir a sugestão da
 * recorrência ali seria redundante (e potencialmente contraditório, já que o
 * usuário pode ter pago de outro jeito).
 *
 * Quando o método é cartão de crédito, tenta anexar o nome do cartão via
 * `cardsMap`; se o cartão sugerido não existir mais, cai para o rótulo
 * genérico do método.
 */
export function getSuggestionBadgeLabel(
    expense: Pick<ExpenseRow, "recurring_expense_id" | "status">,
    paymentSuggestions: Record<string, PaymentSuggestion>,
    cardsMap: Record<string, string>
) {
    if (!expense.recurring_expense_id) return null
    if (expense.status !== "PLANNED") return null

    const suggestion = paymentSuggestions[expense.recurring_expense_id]
    if (!suggestion || suggestion.payment_method === "NONE") return null

    const methodLabel = PAYMENT_METHOD_LABELS[suggestion.payment_method] || suggestion.payment_method
    const cardName = suggestion.card_id ? cardsMap[suggestion.card_id] : null

    if (suggestion.payment_method === "CREDIT_CARD" && cardName) {
        return `${methodLabel} · ${cardName}`
    }

    return methodLabel
}
