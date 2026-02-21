"use client"

import { useState } from "react"
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
import { createIncome, updateIncome } from "@/app/actions/incomes"
import { toast } from "sonner"
import { PlusCircle, EyeOff } from "lucide-react"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"

type Income = {
    id: string
    description: string
    amount: number
    is_active: boolean
    is_hidden: boolean
}

interface IncomeDialogProps {
    mode?: "create" | "edit"
    income?: Income
    onSuccess?: () => void
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (val: boolean) => void
}

export function IncomeDialog({ mode = "create", income, onSuccess, trigger, open: externalOpen, onOpenChange: externalOnOpenChange }: IncomeDialogProps) {
    const isControlled = externalOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? externalOpen! : internalOpen
    const [loading, setLoading] = useState(false)
    const [isHidden, setIsHidden] = useState(income?.is_hidden ?? false)
    const { hiddenModeEnabled } = useHiddenMode()

    const isEdit = mode === "edit"

    function handleOpenChange(val: boolean) {
        if (!isControlled) setInternalOpen(val)
        externalOnOpenChange?.(val)
        if (val && income) setIsHidden(income.is_hidden ?? false)
        if (!val) setIsHidden(income?.is_hidden ?? false)
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append("is_active", "true")
        if (hiddenModeEnabled && isHidden) {
            formData.append("is_hidden", "true")
        }
        try {
            if (isEdit && income) {
                await updateIncome(income.id, formData, hiddenModeEnabled)
                toast.success("Receita atualizada com sucesso!")
            } else {
                await createIncome(formData, hiddenModeEnabled)
                toast.success("Receita adicionada com sucesso!")
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
        <Button className="bg-green-600 hover:bg-green-700">
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Receita
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {(trigger || defaultTrigger) && (
                <DialogTrigger asChild>
                    {trigger || defaultTrigger}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Receita" : "Registrar Receita"}</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                            id="description"
                            name="description"
                            required
                            placeholder="Ex: Salário, Aluguel..."
                            defaultValue={income?.description}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor Mensal</Label>
                        <CurrencyInput
                            id="amount"
                            name="amount"
                            required
                            placeholder="R$ 0,00"
                            key={`amt-${income?.amount}`}
                            defaultValue={income?.amount}
                        />
                    </div>

                    {hiddenModeEnabled && (
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isHidden}
                                onClick={() => setIsHidden(v => !v)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${isHidden ? 'bg-slate-700' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isHidden ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                            <div className="flex items-center gap-1.5">
                                <EyeOff className="h-4 w-4 text-slate-500" />
                                <Label className="cursor-pointer text-sm font-medium text-slate-700">Receita oculta</Label>
                            </div>
                            {isHidden && (
                                <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">Oculta</span>
                            )}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full mt-2">
                        {isEdit ? "Salvar Alterações" : "Salvar"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
