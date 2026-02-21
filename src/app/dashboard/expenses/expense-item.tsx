"use client"

import { formatCurrency } from "@/lib/utils"
import { CheckCircle2, Circle, CreditCard, Calculator } from "lucide-react"
import { ExpenseActions } from "./expense-actions"
import { Expense } from "./columns"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"

const paymentMethodsMap: Record<string, string> = {
    PIX: "Pix",
    DEBIT: "Débito",
    CASH: "Dinheiro",
    CREDIT_CARD: "Cartão de Crédito",
    NONE: "Nenhum"
}

export function ExpenseItem({ expense, cardsMap }: { expense: Expense, cardsMap?: Record<string, string> }) {
    const { hiddenModeEnabled } = useHiddenMode()
    const isPaid = expense.status === 'PAID'

    // Visual indicators only shown when hidden mode is active
    const excludedVisual = hiddenModeEnabled && expense.is_excluded

    const Icon = isPaid ? CheckCircle2 : Circle

    const paidDate = expense.paid_at ? new Date(expense.paid_at) : null
    const paidDateStr = paidDate ? format(paidDate, "dd/MM/yyyy") : ''

    const methodStr = paymentMethodsMap[expense.payment_method] || expense.payment_method
    const cardName = expense.card_id && cardsMap ? cardsMap[expense.card_id] : null

    return (
        <div className={`flex flex-col p-4 bg-white rounded-lg shadow-sm hover:bg-slate-50 transition-colors ${excludedVisual ? 'border border-dashed border-slate-400' : 'border'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-5 w-5 shrink-0 ${isPaid ? 'text-green-500' : 'text-slate-300'}`} />
                    <span className="font-medium text-slate-800 truncate">
                        {expense.description}
                    </span>
                    {excludedVisual && (
                        <Badge variant="secondary" className="text-[10px] shrink-0 flex items-center gap-1 text-slate-500">
                            <Calculator className="h-3 w-3" />
                            Fora do cálculo
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {!isPaid && (
                        <span className="font-semibold text-red-500">
                            {formatCurrency(expense.amount)}
                        </span>
                    )}
                    <ExpenseActions expense={expense} />
                </div>
            </div>

            {isPaid && (
                <div className="mt-2 ml-8 flex items-center flex-wrap gap-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{formatCurrency(expense.amount)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{methodStr}</span>
                    {expense.payment_method === 'CREDIT_CARD' && cardName && (
                        <>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1">
                                <CreditCard className="h-4 w-4" />
                                {cardName}
                            </span>
                        </>
                    )}
                    {paidDateStr && (
                        <>
                            <span className="text-slate-300">•</span>
                            <span>Pago em {paidDateStr}</span>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
