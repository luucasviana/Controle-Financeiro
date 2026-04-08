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
import { createInstallmentPlan, updateInstallmentPlan } from "@/app/actions/installments"
import { toast } from "sonner"
import { PlusCircle } from "lucide-react"

type InstallmentPlan = {
    id: string
    description: string
    amount: number
    due_day: number
    total_installments: number
    starts_in_current_month: boolean
}

interface ParcelamentoDialogProps {
    mode?: "create" | "edit"
    plan?: InstallmentPlan
    onSuccess?: () => void
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (val: boolean) => void
}

export function ParcelamentoDialog({
    mode = "create",
    plan,
    onSuccess,
    trigger,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
}: ParcelamentoDialogProps) {
    const isControlled = externalOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? externalOpen! : internalOpen
    const [loading, setLoading] = useState(false)

    const [description, setDescription] = useState("")
    const [amountValue, setAmountValue] = useState<number | undefined>(undefined)
    const [dueDay, setDueDay] = useState(1)
    const [totalInstallments, setTotalInstallments] = useState(1)
    const [startsInCurrentMonth, setStartsInCurrentMonth] = useState(false)

    const isEdit = mode === "edit"

    useEffect(() => {
        if (!open) return

        if (plan) {
            setDescription(plan.description || "")
            setAmountValue(plan.amount)
            setDueDay(plan.due_day || 1)
            setTotalInstallments(plan.total_installments || 1)
            setStartsInCurrentMonth(!!plan.starts_in_current_month)
        } else {
            setDescription("")
            setAmountValue(undefined)
            setDueDay(1)
            setTotalInstallments(1)
            setStartsInCurrentMonth(false)
        }
    }, [open, plan])

    function handleOpenChange(val: boolean) {
        if (!isControlled) setInternalOpen(val)
        externalOnOpenChange?.(val)
        if (!val) {
            setDescription(plan?.description || "")
            setAmountValue(plan?.amount)
            setDueDay(plan?.due_day || 1)
            setTotalInstallments(plan?.total_installments || 1)
            setStartsInCurrentMonth(!!plan?.starts_in_current_month)
        }
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append("starts_in_current_month", String(startsInCurrentMonth))

        try {
            if (isEdit && plan) {
                await updateInstallmentPlan(plan.id, formData)
                toast.success("Parcelamento atualizado com sucesso!")
            } else {
                await createInstallmentPlan(formData)
                toast.success("Parcelamento criado com sucesso!")
            }

            handleOpenChange(false)
            onSuccess?.()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = isEdit ? null : (
        <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Parcelamento
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {(trigger || defaultTrigger) && (
                <DialogTrigger asChild>
                    {trigger || defaultTrigger}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Parcelamento" : "Novo Parcelamento"}</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                            id="description"
                            name="description"
                            required
                            placeholder="Ex: Televisão, Notebook..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor da Parcela</Label>
                            <CurrencyInput
                                id="amount"
                                name="amount"
                                required
                                placeholder="R$ 0,00"
                                key={`installment-amount-${amountValue ?? "empty"}`}
                                defaultValue={amountValue}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_day">Dia de Vencimento</Label>
                            <Input
                                id="due_day"
                                name="due_day"
                                type="number"
                                min={1}
                                max={31}
                                required
                                value={dueDay}
                                onChange={(e) => setDueDay(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="total_installments">Quantidade de Parcelas</Label>
                        <Input
                            id="total_installments"
                            name="total_installments"
                            type="number"
                            min={1}
                            required
                            value={totalInstallments}
                            onChange={(e) => setTotalInstallments(Number(e.target.value))}
                        />
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border bg-slate-50 px-3 py-2.5">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={startsInCurrentMonth}
                            onClick={() => setStartsInCurrentMonth((value) => !value)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${startsInCurrentMonth ? "bg-blue-600" : "bg-slate-300"}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${startsInCurrentMonth ? "translate-x-4" : "translate-x-0.5"}`}
                            />
                        </button>
                        <div className="space-y-1">
                            <Label className="cursor-pointer text-sm font-medium text-slate-700">
                                Adicionar a primeira parcela ao mês atual
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Quando marcado, a primeira parcela entra no mês financeiro aberto agora.
                            </p>
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                        {isEdit ? "Salvar Alterações" : "Salvar"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
