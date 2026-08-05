export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            months: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    start_date: string
                    end_date: string
                    status: 'OPEN' | 'CLOSED'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    start_date: string
                    end_date: string
                    status?: 'OPEN' | 'CLOSED'
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    start_date?: string
                    end_date?: string
                    status?: 'OPEN' | 'CLOSED'
                    created_at?: string
                }
                Relationships: []
            }
            income_sources: {
                Row: {
                    id: string
                    user_id: string
                    description: string
                    is_active: boolean
                    is_hidden: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    description: string
                    is_active?: boolean
                    is_hidden?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    description?: string
                    is_active?: boolean
                    is_hidden?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            month_incomes: {
                Row: {
                    id: string
                    user_id: string
                    month_id: string
                    source_id: string
                    amount: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    month_id: string
                    source_id: string
                    amount?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    month_id?: string
                    source_id?: string
                    amount?: number
                    created_at?: string
                }
                Relationships: []
            }
            recurring_expenses: {
                Row: {
                    id: string
                    user_id: string
                    description: string
                    amount: number
                    due_day: number
                    total_occurrences: number | null
                    starts_in_current_month: boolean
                    is_active: boolean
                    is_archived: boolean
                    base_month_id: string | null
                    payment_method: 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
                    card_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    description: string
                    amount: number
                    due_day: number
                    total_occurrences?: number | null
                    starts_in_current_month?: boolean
                    is_active?: boolean
                    is_archived?: boolean
                    base_month_id?: string | null
                    payment_method?: 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
                    card_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    description?: string
                    amount?: number
                    due_day?: number
                    total_occurrences?: number | null
                    starts_in_current_month?: boolean
                    is_active?: boolean
                    is_archived?: boolean
                    base_month_id?: string | null
                    payment_method?: 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
                    card_id?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            cards: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    limit_amount: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    limit_amount?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    limit_amount?: number
                    created_at?: string
                }
                Relationships: []
            }
            card_month_balances: {
                Row: {
                    id: string
                    user_id: string
                    card_id: string
                    month_id: string
                    amount_current: number
                    updated_on: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    card_id: string
                    month_id: string
                    amount_current?: number
                    updated_on?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    card_id?: string
                    month_id?: string
                    amount_current?: number
                    updated_on?: string
                    updated_at?: string
                }
                Relationships: []
            }
            month_expenses: {
                Row: {
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
                Insert: {
                    id?: string
                    user_id: string
                    month_id: string
                    due_date: string
                    description: string
                    amount: number
                    status?: 'PLANNED' | 'PAID'
                    payment_method?: 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
                    card_id?: string | null
                    recurring_expense_id?: string | null
                    occurrence_number?: number | null
                    occurrence_total?: number | null
                    paid_at?: string | null
                    is_excluded?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    month_id?: string
                    due_date?: string
                    description?: string
                    amount?: number
                    status?: 'PLANNED' | 'PAID'
                    payment_method?: 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
                    card_id?: string | null
                    recurring_expense_id?: string | null
                    occurrence_number?: number | null
                    occurrence_total?: number | null
                    paid_at?: string | null
                    is_excluded?: boolean
                    created_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            month_status: 'OPEN' | 'CLOSED'
            expense_status: 'PLANNED' | 'PAID'
            payment_method: 'NONE' | 'PIX' | 'DEBIT' | 'CASH' | 'CREDIT_CARD'
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
