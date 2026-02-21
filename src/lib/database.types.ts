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
            }
            recurring_incomes: {
                Row: {
                    id: string
                    user_id: string
                    description: string
                    amount: number
                    is_active: boolean
                    is_hidden: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    description: string
                    amount: number
                    is_active?: boolean
                    is_hidden?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    description?: string
                    amount?: number
                    is_active?: boolean
                    is_hidden?: boolean
                    created_at?: string
                }
            }
            recurring_expense_templates: {
                Row: {
                    id: string
                    user_id: string
                    description: string
                    amount: number
                    day_of_month: number
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    description: string
                    amount: number
                    day_of_month: number
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    description?: string
                    amount?: number
                    day_of_month?: number
                    is_active?: boolean
                    created_at?: string
                }
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
                    template_id: string | null
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
                    template_id?: string | null
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
                    template_id?: string | null
                    paid_at?: string | null
                    is_excluded?: boolean
                    created_at?: string
                }
            }
            card_transactions: {
                Row: {
                    id: string
                    user_id: string
                    card_id: string
                    expense_id: string | null
                    occurred_at: string
                    description: string
                    amount: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    card_id: string
                    expense_id?: string | null
                    occurred_at: string
                    description: string
                    amount: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    card_id?: string
                    expense_id?: string | null
                    occurred_at?: string
                    description?: string
                    amount?: number
                    created_at?: string
                }
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
