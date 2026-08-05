import type { Database } from "@/lib/database.types"

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
