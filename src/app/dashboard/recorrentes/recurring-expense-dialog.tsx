"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Segmented } from "@/components/ui/segmented"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    createRecurringExpense,
    updateRecurringExpense,
    type RecurringExpenseSummary,
} from "@/app/actions/recurring-expenses"
import { getCards } from "@/app/actions/cards"
import { toast } from "sonner"
import { PlusCircle } from "lucide-react"

type CardOption = { id: string; name: string }
type SuggestedPaymentMethod = "NONE" | "PIX" | "DEBIT" | "CASH" | "CREDIT_CARD"

interface RecurringExpenseDialogProps {
    mode?: "create" | "edit"
    plan?: RecurringExpenseSummary
    onSuccess?: () => void
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (value: boolean) => void
}

type DurationMode = "deadline" | "open-ended"

export function RecurringExpenseDialog({
    mode = "create",
    plan,
    onSuccess,
    trigger,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
}: RecurringExpenseDialogProps) {
    const isControlled = externalOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? externalOpen : internalOpen
    const [loading, setLoading] = useState(false)

    const [description, setDescription] = useState("")
    const [amountValue, setAmountValue] = useState<number | undefined>(undefined)
    const [dueDay, setDueDay] = useState(1)
    const [durationMode, setDurationMode] = useState<DurationMode>("deadline")
    const [totalOccurrences, setTotalOccurrences] = useState(12)
    const [startsInCurrentMonth, setStartsInCurrentMonth] = useState(true)
    const [paymentMethod, setPaymentMethod] = useState<SuggestedPaymentMethod>("NONE")
    const [cardId, setCardId] = useState("")
    const [cards, setCards] = useState<CardOption[]>([])

    const isEdit = mode === "edit"
    const hasDeadline = durationMode === "deadline"

    useEffect(() => {
        if (!open) return

        if (plan) {
            setDescription(plan.description)
            setAmountValue(plan.amount)
            setDueDay(plan.due_day)
            setDurationMode(plan.total_occurrences !== null ? "deadline" : "open-ended")
            setTotalOccurrences(plan.total_occurrences ?? 12)
            setStartsInCurrentMonth(plan.starts_in_current_month)
            setPaymentMethod(plan.payment_method || "NONE")
            setCardId(plan.card_id || "")
        } else {
            setDescription("")
            setAmountValue(undefined)
            setDueDay(1)
            setDurationMode("deadline")
            setTotalOccurrences(12)
            setStartsInCurrentMonth(true)
            setPaymentMethod("NONE")
            setCardId("")
        }

        getCards().then(setCards)
    }, [open, plan])

    function handleOpenChange(value: boolean) {
        if (!isControlled) setInternalOpen(value)
        externalOnOpenChange?.(value)
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append("starts_in_current_month", String(startsInCurrentMonth))
        formData.append("has_deadline", String(hasDeadline))
        formData.append("payment_method", paymentMethod)
        if (paymentMethod === "CREDIT_CARD" && cardId) {
            formData.append("card_id", cardId)
        }

        try {
            if (isEdit && plan) {
                await updateRecurringExpense(plan.id, formData)
                toast.success("Despesa recorrente atualizada!")
            } else {
                await createRecurringExpense(formData)
                toast.success("Despesa recorrente criada!")
            }

            handleOpenChange(false)
            onSuccess?.()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = isEdit ? null : (
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Despesa Recorrente
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {(trigger || defaultTrigger) && (
                <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
            )}
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Editar Despesa Recorrente" : "Nova Despesa Recorrente"}
                    </DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                            id="description"
                            name="description"
                            required
                            placeholder="Ex: Aluguel, Internet, Televisão..."
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor por mês</Label>
                            <CurrencyInput
                                id="amount"
                                name="amount"
                                required
                                placeholder="R$ 0,00"
                                key={`recurring-amount-${amountValue ?? "empty"}`}
                                defaultValue={amountValue}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_day">Dia de vencimento</Label>
                            <Input
                                id="due_day"
                                name="due_day"
                                type="number"
                                min={1}
                                max={31}
                                required
                                value={dueDay}
                                onChange={(event) => setDueDay(Number(event.target.value))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recurring_payment_method">Como você costuma pagar</Label>
                        <Select
                            value={paymentMethod}
                            onValueChange={(value) => {
                                setPaymentMethod(value as SuggestedPaymentMethod)
                                if (value !== "CREDIT_CARD") setCardId("")
                            }}
                        >
                            <SelectTrigger id="recurring_payment_method" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">Não definir agora</SelectItem>
                                <SelectItem value="PIX">Pix</SelectItem>
                                <SelectItem value="DEBIT">Débito</SelectItem>
                                <SelectItem value="CASH">Dinheiro</SelectItem>
                                <SelectItem value="CREDIT_CARD">Cartão de crédito</SelectItem>
                            </SelectContent>
                        </Select>

                        {paymentMethod === "CREDIT_CARD" && (
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

                        <p className="text-xs text-app-muted">
                            É só uma sugestão para agilizar: quando você marcar um lançamento como
                            pago, ele já vem com isso preenchido, mas dá para trocar na hora.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Duração</Label>
                        <Segmented
                            options={[
                                { value: "deadline", label: "Por um número de meses" },
                                { value: "open-ended", label: "Sem prazo definido" },
                            ]}
                            value={durationMode}
                            onChange={setDurationMode}
                        />
                    </div>

                    {hasDeadline ? (
                        <div className="space-y-2">
                            <Label htmlFor="total_occurrences">Quantidade de meses</Label>
                            <Input
                                id="total_occurrences"
                                name="total_occurrences"
                                type="number"
                                min={1}
                                required
                                value={totalOccurrences}
                                onChange={(event) => setTotalOccurrences(Number(event.target.value))}
                            />
                            <p className="text-xs text-app-muted">
                                Uma parcela é lançada a cada período novo que você criar, até
                                completar {totalOccurrences}.
                            </p>
                        </div>
                    ) : (
                        <p className="rounded-control border border-app-border bg-app-hairline px-3 py-2.5 text-xs text-app-muted">
                            A despesa será lançada em todo período novo que você criar, sem data
                            para acabar. Use <strong>Pausar</strong> quando quiser interromper.
                        </p>
                    )}

                    <div className="flex items-start gap-3 rounded-control border border-app-border bg-app-hairline px-3 py-2.5">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={startsInCurrentMonth}
                            onClick={() => setStartsInCurrentMonth((value) => !value)}
                            className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${startsInCurrentMonth ? "bg-app-ink" : "bg-app-border"}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${startsInCurrentMonth ? "translate-x-4" : "translate-x-0.5"}`}
                            />
                        </button>
                        <div className="space-y-1">
                            <Label className="cursor-pointer text-sm font-medium text-app-ink">
                                Já lançar no período atual
                            </Label>
                            <p className="text-xs text-app-muted">
                                Desligue se a primeira cobrança só cai no próximo período.
                            </p>
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
