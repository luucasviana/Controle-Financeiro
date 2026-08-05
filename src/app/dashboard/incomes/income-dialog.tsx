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
import { Label } from "@/components/ui/label"
import { Tag } from "@/components/ui/tag"
import {
    createIncomeSource,
    updateIncomeSource,
    type IncomeSource,
} from "@/app/actions/income-sources"
import { toast } from "sonner"
import { PlusCircle, EyeOff } from "lucide-react"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"

interface IncomeDialogProps {
    mode?: "create" | "edit"
    source?: IncomeSource
    onSuccess?: () => void
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (val: boolean) => void
}

export function IncomeDialog({
    mode = "create",
    source,
    onSuccess,
    trigger,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
}: IncomeDialogProps) {
    const isControlled = externalOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? externalOpen! : internalOpen
    const [loading, setLoading] = useState(false)
    const [isHidden, setIsHidden] = useState(source?.is_hidden ?? false)
    const { hiddenModeEnabled } = useHiddenMode()

    const isEdit = mode === "edit"

    function handleOpenChange(val: boolean) {
        if (!isControlled) setInternalOpen(val)
        externalOnOpenChange?.(val)
        if (val && source) setIsHidden(source.is_hidden ?? false)
        if (!val) setIsHidden(source?.is_hidden ?? false)
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append("is_active", "true")
        if (hiddenModeEnabled && isHidden) {
            formData.append("is_hidden", "true")
        }
        try {
            if (isEdit && source) {
                await updateIncomeSource(source.id, formData, hiddenModeEnabled)
                toast.success("Fonte de receita atualizada!")
            } else {
                await createIncomeSource(formData, hiddenModeEnabled)
                toast.success("Fonte de receita criada!")
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
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Fonte de Receita
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
                    <DialogTitle>
                        {isEdit ? "Editar Fonte de Receita" : "Nova Fonte de Receita"}
                    </DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Nome da fonte</Label>
                        <Input
                            id="description"
                            name="description"
                            required
                            placeholder="Ex: Salário Lucas, Salário Camile, Renda extra"
                            defaultValue={source?.description}
                        />
                    </div>

                    {hiddenModeEnabled && (
                        <div className="flex items-center gap-3 rounded-control border border-app-border bg-app-hairline px-3 py-2.5">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isHidden}
                                onClick={() => setIsHidden((v) => !v)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${isHidden ? "bg-app-ink" : "bg-app-border"}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isHidden ? "translate-x-4" : "translate-x-0.5"}`}
                                />
                            </button>
                            <div className="flex items-center gap-1.5">
                                <EyeOff className="h-4 w-4 text-app-muted" />
                                <Label className="cursor-pointer text-sm font-medium text-app-ink">
                                    Fonte oculta
                                </Label>
                            </div>
                            {isHidden && (
                                <Tag tone="neutral" className="ml-auto">
                                    Oculta
                                </Tag>
                            )}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="mt-2 w-full">
                        {isEdit ? "Salvar Alterações" : "Salvar"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
