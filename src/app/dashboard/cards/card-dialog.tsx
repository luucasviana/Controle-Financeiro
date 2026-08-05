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
import { createCard, updateCard } from "@/app/actions/cards"
import type { Database } from "@/lib/database.types"
import { toast } from "sonner"
import { PlusCircle } from "lucide-react"

type CardRow = Database["public"]["Tables"]["cards"]["Row"]

interface CardDialogProps {
    card?: CardRow
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function CardDialog({ card, trigger, open: externalOpen, onOpenChange: externalOnOpenChange }: CardDialogProps) {
    const isControlled = externalOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? externalOpen : internalOpen
    const [loading, setLoading] = useState(false)

    const isEdit = Boolean(card)

    function handleOpenChange(value: boolean) {
        if (!isControlled) setInternalOpen(value)
        externalOnOpenChange?.(value)
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        try {
            if (isEdit && card) {
                await updateCard(card.id, formData)
                toast.success("Cartão atualizado com sucesso!")
            } else {
                await createCard(formData)
                toast.success("Cartão adicionado com sucesso!")
            }
            handleOpenChange(false)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = isEdit ? null : (
        <Button>
            <PlusCircle className="h-4 w-4" /> Novo cartão
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
                    <DialogTitle>{isEdit ? "Editar cartão" : "Registrar cartão"}</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do cartão (ex: Nubank)</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            placeholder="Ex: Cartão Inter Nubank"
                            defaultValue={card?.name}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="limit_amount">Limite</Label>
                        <CurrencyInput
                            id="limit_amount"
                            name="limit_amount"
                            required
                            placeholder="R$ 0,00"
                            defaultValue={card?.limit_amount}
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="mt-4 w-full">
                        {isEdit ? "Salvar Alterações" : "Salvar"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
