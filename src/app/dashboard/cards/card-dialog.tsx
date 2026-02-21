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
import { createCard } from "@/app/actions/cards"
import { toast } from "sonner"
import { PlusCircle } from "lucide-react"

export function CardDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(formData: FormData) {
        setLoading(true)
        try {
            await createCard(formData)
            toast.success("Cartão adicionado com sucesso!")
            setOpen(false)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600"><PlusCircle className="mr-2 h-4 w-4" /> Novo Cartão</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Cartão</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Cartão (ex: Nubank)</Label>
                        <Input id="name" name="name" required placeholder="Ex: Cartão Inter Nubank" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="limit_amount">Limite</Label>
                        <CurrencyInput id="limit_amount" name="limit_amount" required placeholder="R$ 0,00" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full mt-4">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
