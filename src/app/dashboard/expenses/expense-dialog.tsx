"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calculator } from "lucide-react"
import { toast } from "sonner"

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
import { Tag } from "@/components/ui/tag"
import { createMonthExpense, updateMonthExpense } from "@/app/actions/finance"
import { getCards } from "@/app/actions/cards"
import type { MonthData } from "@/app/actions/months"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import { cn, formatCurrency } from "@/lib/utils"
import type { Expense } from "./types"

type CardOption = { id: string; name: string }
type PaymentMethod = "NONE" | "PIX" | "DEBIT" | "CASH" | "CREDIT_CARD"
type Status = "PLANNED" | "PAID"

function isIncludedInTotals(status: Status, paymentMethod: PaymentMethod, isExcluded: boolean) {
    return !(status === "PAID" && paymentMethod === "CREDIT_CARD") && !isExcluded
}

export function ExpenseDialog({
    month,
    projectedBalance,
    mode = "create",
    expense,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
    trigger,
}: {
    month?: MonthData
    /** Saldo projetado do período `month`, hoje — base para o preview de sobra. */
    projectedBalance?: number
    mode?: "create" | "edit" | "duplicate"
    expense?: Expense
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}) {
    const isControlled = externalOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? externalOpen : internalOpen

    function setOpen(val: boolean) {
        if (!isControlled) setInternalOpen(val)
        if (externalOnOpenChange) externalOnOpenChange(val)
    }

    const { hiddenModeEnabled } = useHiddenMode()

    const [cards, setCards] = useState<CardOption[]>([])
    const [months, setMonths] = useState<MonthData[]>([])

    const isDuplicate = mode === "duplicate"
    const isEdit = mode === "edit"
    const initialMonthId = expense?.month_id || month?.id || ""

    const [selectedMonthId, setSelectedMonthId] = useState("")
    const [description, setDescription] = useState("")
    const [amountValue, setAmountValue] = useState<number | undefined>(undefined)

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("NONE")
    const [status, setStatus] = useState<Status>("PLANNED")
    const [paidAt, setPaidAt] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [cardId, setCardId] = useState("")
    const [keepRecurringLink, setKeepRecurringLink] = useState(false)
    const [isExcluded, setIsExcluded] = useState(false)

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) return

        if (expense && (isDuplicate || isEdit)) {
            setSelectedMonthId(initialMonthId)
            setDescription(expense.description || "")
            setAmountValue(expense.amount)
            setStatus(expense.status)
            setPaymentMethod(expense.payment_method || "NONE")
            setPaidAt(
                expense.paid_at
                    ? format(new Date(expense.paid_at), "yyyy-MM-dd")
                    : format(new Date(), "yyyy-MM-dd")
            )
            setDueDate(expense.due_date || format(new Date(), "yyyy-MM-dd"))
            setCardId(expense.card_id || "")
            setKeepRecurringLink(false)
            setIsExcluded(!!expense.is_excluded)
        } else {
            setSelectedMonthId(month ? month.id : "")
            setDescription("")
            setAmountValue(undefined)
            setStatus("PLANNED")
            setPaymentMethod("NONE")
            setPaidAt(format(new Date(), "yyyy-MM-dd"))
            setDueDate(format(new Date(), "yyyy-MM-dd"))
            setCardId("")
            setIsExcluded(false)
        }

        getCards().then(setCards)
        import("@/app/actions/months").then((module) =>
            module.getMonths().then(setMonths)
        )
    }, [open, month, expense, isDuplicate, isEdit, initialMonthId])

    function handleStatusChange(newStatus: Status) {
        setStatus(newStatus)
        if (newStatus === "PLANNED") {
            setPaymentMethod("NONE")
            setPaidAt("")
            setCardId("")
        } else {
            setPaymentMethod((current) => (current === "NONE" ? "PIX" : current))
            setPaidAt(format(new Date(), "yyyy-MM-dd"))
        }
    }

    function handleMonthChange(newMonthId: string) {
        setSelectedMonthId(newMonthId)
        if (!isDuplicate || !expense?.due_date) return

        const targetMonth = months.find((m) => m.id === newMonthId)
        if (targetMonth) {
            const [, , oDay] = expense.due_date.split("-").map(Number)
            const [tYear, tMonth] = targetMonth.start_date.split("-").map(Number)

            const daysInTargetMonth = new Date(tYear, tMonth, 0).getDate()
            const adjustedDay = Math.min(oDay, daysInTargetMonth)
            const newDueDateStr = `${tYear}-${String(tMonth).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`

            setDueDate(newDueDateStr)
        }
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append("month_id", selectedMonthId)
        formData.append("status", status)
        formData.append("payment_method", paymentMethod)

        if (status === "PAID" && paidAt) {
            formData.append("paid_at", new Date(paidAt).toISOString())
        }
        if (status === "PAID" && paymentMethod === "CREDIT_CARD" && cardId) {
            formData.append("card_id", cardId)
        }

        if (isDuplicate && keepRecurringLink && expense?.recurring_expense_id) {
            formData.append("recurring_expense_id", expense.recurring_expense_id)
        }

        formData.append("hidden_mode_enabled", String(hiddenModeEnabled))
        if (hiddenModeEnabled) {
            formData.append("is_excluded", String(isExcluded))
        }

        try {
            if (isEdit && expense) {
                formData.append("expense_id", expense.id)
                await updateMonthExpense(formData)
                toast.success("Despesa atualizada com sucesso!")
            } else {
                await createMonthExpense(formData)
                if (status === "PAID" && paymentMethod === "CREDIT_CARD") {
                    toast.success(
                        isDuplicate
                            ? "Despesa duplicada! (Valor considerado na fatura do cartão)"
                            : "Despesa adicionada! (Valor considerado na fatura do cartão)",
                        { duration: 6000 }
                    )
                } else {
                    toast.success(isDuplicate ? "Despesa duplicada com sucesso!" : "Despesa adicionada com sucesso!")
                }
            }
            setOpen(false)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Não foi possível salvar a despesa.")
        } finally {
            setLoading(false)
        }
    }

    const submitLabel = isEdit ? "Salvar alterações" : isDuplicate ? "Duplicar" : "Salvar"
    const titleLabel = isEdit ? "Editar despesa" : isDuplicate ? "Duplicar despesa" : "Nova despesa"

    // Prévia de sobra: recalcula o saldo projetado do período `month` levando em
    // conta este lançamento. Só faz sentido quando conhecemos o saldo atual desse
    // período e o lançamento (editado, criado ou duplicado) está indo para ele —
    // duplicar para outro período não muda a sobra do período atual.
    const targetsKnownMonth = !!month && selectedMonthId === month.id
    const currentAmount = amountValue ?? 0
    const newIncluded = targetsKnownMonth && isIncludedInTotals(status, paymentMethod, isExcluded)
    const newContribution = newIncluded ? currentAmount : 0

    const originalIncluded =
        isEdit &&
        !!expense &&
        !!month &&
        expense.month_id === month.id &&
        isIncludedInTotals(expense.status, expense.payment_method, expense.is_excluded)
    const originalContribution = originalIncluded ? expense!.amount : 0

    const previewAvailable = typeof projectedBalance === "number" && !!month
    const previewBalance = previewAvailable
        ? (projectedBalance as number) + originalContribution - newContribution
        : 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger ? trigger : <Button>Nova despesa</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{titleLabel}</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    {isDuplicate ? (
                        <div className="space-y-2">
                            <Label htmlFor="month_id">Período de destino</Label>
                            <Select value={selectedMonthId} onValueChange={handleMonthChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione o período" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{m.name}</span>
                                                <Tag tone={m.status === "OPEN" ? "positive" : "neutral"}>
                                                    {m.status === "OPEN" ? "Aberto" : "Encerrado"}
                                                </Tag>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="month_id">Período de referência</Label>
                            <Select value={selectedMonthId} onValueChange={handleMonthChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione o período" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                            id="description"
                            name="description"
                            required
                            placeholder="Ex: Mercado"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor</Label>
                            <CurrencyInput
                                id="amount"
                                name="amount"
                                required
                                placeholder="R$ 0,00"
                                key={`amt-${expense?.id ?? "new"}-${open}`}
                                defaultValue={amountValue}
                                onValueChange={setAmountValue}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date">Vencimento</Label>
                            <Input
                                id="due_date"
                                name="due_date"
                                type="date"
                                required
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Segmented
                            options={[
                                { value: "PLANNED", label: "Prevista" },
                                { value: "PAID", label: "Paga" },
                            ]}
                            value={status}
                            onChange={handleStatusChange}
                        />
                    </div>

                    {status === "PAID" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="payment_method_select">Método de pagamento</Label>
                                <Select
                                    value={paymentMethod === "NONE" ? "" : paymentMethod}
                                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                                >
                                    <SelectTrigger id="payment_method_select" className="w-full">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PIX">Pix</SelectItem>
                                        <SelectItem value="DEBIT">Débito</SelectItem>
                                        <SelectItem value="CASH">Dinheiro</SelectItem>
                                        <SelectItem value="CREDIT_CARD">Cartão de crédito</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="paid_at">Pago em</Label>
                                <Input
                                    id="paid_at"
                                    type="date"
                                    required
                                    value={paidAt}
                                    onChange={(e) => setPaidAt(e.target.value)}
                                />
                            </div>

                            {paymentMethod === "CREDIT_CARD" && (
                                <div className="col-span-full space-y-2">
                                    <Label htmlFor="card_id_select">Cartão de crédito</Label>
                                    <Select value={cardId} onValueChange={setCardId}>
                                        <SelectTrigger id="card_id_select" className="w-full">
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
                                </div>
                            )}
                        </div>
                    )}

                    {isDuplicate && expense?.recurring_expense_id && (
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-app-border bg-app-hairline px-3 py-2.5">
                            <input
                                type="checkbox"
                                checked={keepRecurringLink}
                                onChange={(e) => setKeepRecurringLink(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-app-border accent-app-accent"
                            />
                            <span className="text-sm text-app-ink">
                                Manter vínculo com a despesa recorrente original
                            </span>
                        </label>
                    )}

                    {hiddenModeEnabled && (
                        <div className="flex items-center gap-3 rounded-control border border-app-border bg-app-hairline px-3 py-2.5">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isExcluded}
                                onClick={() => setIsExcluded((value) => !value)}
                                className={cn(
                                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                                    isExcluded ? "bg-app-ink" : "bg-app-border"
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                                        isExcluded ? "translate-x-4" : "translate-x-0.5"
                                    )}
                                />
                            </button>
                            <div className="flex items-center gap-1.5">
                                <Calculator className="h-4 w-4 text-app-muted" />
                                <div>
                                    <Label className="cursor-pointer text-sm font-medium text-app-ink">
                                        Fora do cálculo
                                    </Label>
                                    <p className="text-xs text-app-muted">
                                        Aparece na lista, mas não entra nos totais do período.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {previewAvailable && (
                        <div className="flex items-center justify-between gap-3 rounded-control border border-app-border px-3 py-2.5">
                            <span className="text-app-muted">Sobra do período depois deste lançamento</span>
                            <span
                                className={cn(
                                    "font-medium tabular-nums",
                                    previewBalance >= 0 ? "text-app-ink" : "text-app-accent"
                                )}
                            >
                                {formatCurrency(previewBalance)}
                            </span>
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Salvando..." : submitLabel}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
