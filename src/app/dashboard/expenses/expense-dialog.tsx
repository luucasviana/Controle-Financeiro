"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createMonthExpense, updateMonthExpense } from "@/app/actions/finance"
import { getCards } from "@/app/actions/cards"
import { toast } from "sonner"
import { MonthData } from "@/app/actions/months"
import { format } from "date-fns"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import { Calculator } from "lucide-react"

export function ExpenseDialog({
    month,
    mode = "create",
    expense,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
    trigger,
}: {
    month?: MonthData
    mode?: "create" | "edit" | "duplicate"
    expense?: any
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

    const [cards, setCards] = useState<any[]>([])
    const [months, setMonths] = useState<MonthData[]>([])

    const isDuplicate = mode === "duplicate"
    const isEdit = mode === "edit"
    const initialMonthId = expense?.month_id || month?.id || ""

    const [selectedMonthId, setSelectedMonthId] = useState("")
    const [description, setDescription] = useState("")
    const [amountValue, setAmountValue] = useState<number | undefined>(undefined)

    const [paymentMethod, setPaymentMethod] = useState("NONE")
    const [status, setStatus] = useState<"PLANNED" | "PAID">("PLANNED")
    const [paidAt, setPaidAt] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [cardId, setCardId] = useState("")
    const [keepTemplate, setKeepTemplate] = useState(false)
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
            setKeepTemplate(false)
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

    function handleStatusChange(newStatus: "PLANNED" | "PAID") {
        setStatus(newStatus)
        if (newStatus === "PLANNED") {
            setPaymentMethod("NONE")
            setPaidAt("")
            setCardId("")
        } else {
            setPaymentMethod(paymentMethod === "NONE" ? "" : paymentMethod)
            setPaidAt(format(new Date(), "yyyy-MM-dd"))
        }
    }

    function handleMonthChange(newMonthId: string) {
        setSelectedMonthId(newMonthId)
        if (!isDuplicate || !expense?.due_date) return

        const targetMonth = months.find((m) => m.id === newMonthId)
        if (targetMonth) {
            const [, oMonth, oDay] = expense.due_date.split("-").map(Number)
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

        if (isDuplicate && keepTemplate && expense?.template_id) {
            formData.append("template_id", expense.template_id)
        }

        formData.append("hidden_mode_enabled", String(hiddenModeEnabled))
        if (hiddenModeEnabled) {
            formData.append("is_excluded", String(isExcluded))
        }

        try {
            if (isEdit) {
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
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const submitLabel = isEdit ? "Salvar Alterações" : isDuplicate ? "Duplicar" : "Salvar"
    const titleLabel = isEdit ? "Editar Despesa" : isDuplicate ? "Duplicar Despesa" : "Registrar Despesa"

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger ? trigger : <Button className="bg-blue-600">Nova Despesa</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{titleLabel}</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="grid grid-cols-2 gap-4">
                    {isDuplicate && (
                        <div className="col-span-2 space-y-2 rounded-lg border bg-slate-50 p-3">
                            <Label htmlFor="month_id" className="font-semibold text-blue-600">
                                Mês de Destino
                            </Label>
                            <Select value={selectedMonthId} onValueChange={handleMonthChange}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione o mês" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{m.name}</span>
                                                <span
                                                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${m.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}
                                                >
                                                    {m.status === "OPEN" ? "OPEN" : "CLOSED"}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {!isDuplicate && (
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="month_id">Mês de Referência</Label>
                            <Select value={selectedMonthId} onValueChange={handleMonthChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o mês" />
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

                    <div className="col-span-2 space-y-2">
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

                    <div className="col-span-1 space-y-2">
                        <Label htmlFor="amount">Valor</Label>
                        <CurrencyInput
                            id="amount"
                            name="amount"
                            required
                            placeholder="R$ 0,00"
                            key={`amt-${amountValue}`}
                            defaultValue={amountValue}
                        />
                    </div>

                    <div className="col-span-1 space-y-2">
                        <Label htmlFor="due_date">Data de Vencimento</Label>
                        <Input
                            id="due_date"
                            name="due_date"
                            type="date"
                            required
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    {(isEdit ? status === "PAID" : status === "PAID") && (
                        <>
                            <div className="col-span-1 space-y-2">
                                <Label htmlFor="payment_method">Método de Pagamento</Label>
                                <Select required value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PIX">Pix</SelectItem>
                                        <SelectItem value="DEBIT">Cartão de Débito</SelectItem>
                                        <SelectItem value="CASH">Dinheiro / À Vista</SelectItem>
                                        <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-1 space-y-2">
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
                                <div className="col-span-2 flex flex-col space-y-2">
                                    <Label htmlFor="card_id">Cartão de Crédito</Label>
                                    <Select required value={cardId} onValueChange={setCardId}>
                                        <SelectTrigger>
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
                        </>
                    )}

                    <div className="col-span-2 space-y-2">
                        <Label>Status</Label>
                        <div className="flex rounded-lg bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => handleStatusChange("PLANNED")}
                                className={`flex-1 rounded-md py-1.5 text-sm transition-all ${status === "PLANNED" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Prevista
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusChange("PAID")}
                                className={`flex-1 rounded-md py-1.5 text-sm transition-all ${status === "PAID" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Paga
                            </button>
                        </div>
                    </div>

                    {isDuplicate && expense?.template_id && (
                        <div className="col-span-2 mt-2 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-2 text-sm text-yellow-800">
                            <input
                                type="checkbox"
                                id="keepTemplate"
                                checked={keepTemplate}
                                onChange={(e) => setKeepTemplate(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="keepTemplate" className="cursor-pointer font-medium">
                                Manter vínculo com o item fixo original
                            </Label>
                        </div>
                    )}

                    {hiddenModeEnabled && (
                        <div className="col-span-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isExcluded}
                                onClick={() => setIsExcluded((value) => !value)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isExcluded ? "bg-slate-700" : "bg-slate-300"}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isExcluded ? "translate-x-4" : "translate-x-0.5"}`}
                                />
                            </button>
                            <div className="flex items-center gap-1.5">
                                <Calculator className="h-4 w-4 text-slate-500" />
                                <div>
                                    <Label className="cursor-pointer text-sm font-medium text-slate-700">
                                        Fora do cálculo
                                    </Label>
                                    <p className="text-[11px] text-slate-500">
                                        Aparece na lista, mas não entra nos totais do mês.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="col-span-2 mt-2">
                        <Button type="submit" disabled={loading} className="w-full">
                            {submitLabel}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
