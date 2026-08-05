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
