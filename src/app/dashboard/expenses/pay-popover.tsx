"use client"

import { useState } from "react"
import { Banknote, CheckCircle2, Circle, CreditCard, Landmark, QrCode, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateMonthExpense } from "@/app/actions/finance"
import type { PaymentSuggestion } from "@/app/actions/recurring-expenses"
import type { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"

type ExpenseRow = Database["public"]["Tables"]["month_expenses"]["Row"]
type CardOption = { id: string; name: string }
type PayableMethod = "PIX" | "DEBIT" | "CASH" | "CREDIT_CARD"

const PAYMENT_METHODS: Array<{ value: PayableMethod; label: string; icon: LucideIcon }> = [
    { value: "PIX", label: "Pix", icon: QrCode },
    { value: "DEBIT", label: "Débito", icon: Landmark },
    { value: "CASH", label: "Dinheiro", icon: Banknote },
    { value: "CREDIT_CARD", label: "Cartão de crédito", icon: CreditCard },
]

function isPayableMethod(value: string): value is PayableMethod {
    return value === "PIX" || value === "DEBIT" || value === "CASH" || value === "CREDIT_CARD"
}

/**
 * Círculo clicável que marca uma despesa como paga ou volta ela para prevista.
 *
 * updateMonthExpense exige payment_method quando status=PAID (e card_id quando o
 * método é CREDIT_CARD), então marcar como paga precisa de um passo extra — daqui
 * o popover. Reverter para prevista não exige nada, então é um clique direto.
 *
 * Reutilizado pela tela de Movimentações e pela Visão geral: ambas devem se
 * comportar de forma idêntica ao marcar uma despesa como paga.
 *
 * `suggestion` vem da despesa recorrente que originou o lançamento (quando
 * existe) e só serve para pré-marcar o popover ao abrir — o usuário pode
 * trocar tudo antes de confirmar. Se o cartão sugerido não existir mais na
 * lista `cards`, nenhum cartão é pré-selecionado.
 */
export function PayPopover({
    expense,
    cards,
    suggestion,
    className,
}: {
    expense: ExpenseRow
    cards: CardOption[]
    suggestion?: PaymentSuggestion
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const [method, setMethod] = useState<PayableMethod | "">("")
    const [cardId, setCardId] = useState("")
    const [pending, setPending] = useState(false)

    const isPaid = expense.status === "PAID"

    function resetForm() {
        setMethod("")
        setCardId("")
    }

    function applySuggestion() {
        if (!suggestion || !isPayableMethod(suggestion.payment_method)) {
            resetForm()
            return
        }

        setMethod(suggestion.payment_method)

        const suggestedCardStillExists =
            suggestion.payment_method === "CREDIT_CARD" &&
            !!suggestion.card_id &&
            cards.some((card) => card.id === suggestion.card_id)

        setCardId(suggestedCardStillExists ? suggestion.card_id! : "")
    }

    async function submit(payload: {
        status: "PLANNED" | "PAID"
        paymentMethod?: PayableMethod
        selectedCardId?: string | null
    }) {
        setPending(true)
        try {
            const formData = new FormData()
            formData.append("expense_id", expense.id)
            formData.append("month_id", expense.month_id)
            formData.append("due_date", expense.due_date)
            formData.append("description", expense.description)
            formData.append("amount", String(expense.amount))
            formData.append("status", payload.status)

            if (payload.status === "PAID") {
                formData.append("payment_method", payload.paymentMethod ?? "")
                if (payload.paymentMethod === "CREDIT_CARD" && payload.selectedCardId) {
                    formData.append("card_id", payload.selectedCardId)
                }
                formData.append("paid_at", new Date().toISOString())
            }

            await updateMonthExpense(formData)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a despesa.")
        } finally {
            setPending(false)
        }
    }

    async function handleRevert() {
        await submit({ status: "PLANNED" })
    }

    async function handleConfirm() {
        if (!method) return
        if (method === "CREDIT_CARD" && !cardId) return

        await submit({
            status: "PAID",
            paymentMethod: method,
            selectedCardId: method === "CREDIT_CARD" ? cardId : null,
        })
        setOpen(false)
        resetForm()
    }

    if (isPaid) {
        return (
            <button
                type="button"
                onClick={handleRevert}
                disabled={pending}
                title="Marcar como prevista"
                className={cn(
                    "shrink-0 text-app-muted transition-colors hover:text-app-accent disabled:opacity-50",
                    className
                )}
            >
                <CheckCircle2 className="h-5 w-5" />
            </button>
        )
    }

    return (
        <Popover
            open={open}
            onOpenChange={(value) => {
                setOpen(value)
                if (value) {
                    applySuggestion()
                } else {
                    resetForm()
                }
            }}
        >
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={pending}
                    title="Marcar como paga"
                    className={cn(
                        "shrink-0 text-app-faint transition-colors hover:text-app-accent disabled:opacity-50",
                        className
                    )}
                >
                    <Circle className="h-5 w-5" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 border-app-border bg-app-surface p-3 shadow-menu">
                <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">
                        Marcar como paga
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map((item) => {
                            const Icon = item.icon
                            const isActive = method === item.value
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setMethod(item.value)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-control border px-2.5 py-2 text-left text-[13px] transition-colors",
                                        isActive
                                            ? "border-app-accent text-app-accent"
                                            : "border-app-border text-app-ink hover:bg-app-hairline"
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {item.label}
                                </button>
                            )
                        })}
                    </div>

                    {method === "CREDIT_CARD" && (
                        <Select value={cardId} onValueChange={setCardId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o cartão..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cards.map((card) => (
                                    <SelectItem key={card.id} value={card.id}>
                                        {card.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={pending || !method || (method === "CREDIT_CARD" && !cardId)}
                        onClick={handleConfirm}
                    >
                        Confirmar pagamento
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
