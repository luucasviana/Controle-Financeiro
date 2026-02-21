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
import { toast } from "sonner"
import { CreditCard } from "lucide-react"
import { upsertCardMonthBalance } from "@/app/actions/cards"
import { format } from "date-fns"
import { useMonth } from "@/components/providers/month-provider"

export function UpdateBalanceDialog({ cards, balances, trigger }: { cards: any[], balances: any[], trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { monthId } = useMonth()

    const [selectedCardId, setSelectedCardId] = useState<string>("")
    const [amountCurrent, setAmountCurrent] = useState<number>(0)
    const [updatedOn, setUpdatedOn] = useState<string>(format(new Date(), "yyyy-MM-dd"))

    // Controlled reset when changing select or opening dialog
    useEffect(() => {
        if (!open) {
            setSelectedCardId("")
            setAmountCurrent(0)
            setUpdatedOn(format(new Date(), "yyyy-MM-dd"))
        }
    }, [open])

    useEffect(() => {
        if (selectedCardId) {
            const balanceData = balances.find(b => b.card_id === selectedCardId)
            if (balanceData) {
                setAmountCurrent(balanceData.amount_current)
                setUpdatedOn(balanceData.updated_on)
            } else {
                setAmountCurrent(0)
                setUpdatedOn(format(new Date(), "yyyy-MM-dd"))
            }
        }
    }, [selectedCardId, balances])

    async function onSubmit(formData: FormData) {
        if (!monthId) {
            toast.error("Selecione um mês ativo primeiro.")
            return
        }

        setLoading(true)
        formData.append("month_id", monthId)

        try {
            await upsertCardMonthBalance(formData)
            toast.success("Valor do cartão atualizado com sucesso!")
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
                {trigger || <Button variant="outline"><CreditCard className="mr-2 h-4 w-4" /> Atualizar valor do cartão</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Atualizar valor do cartão</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2 flex flex-col">
                        <Label htmlFor="card_id">Cartão</Label>
                        <Select name="card_id" required value={selectedCardId} onValueChange={setSelectedCardId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o cartão..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cards.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount_current">Valor atual</Label>
                        {/* CurrencyInput expects defaultValue or value? CurrencyInput internal state handles defaultValue but usually we need to reset it, so we use a key to force re-render */}
                        <CurrencyInput key={`amount-${selectedCardId}-${amountCurrent}`} id="amount_current" name="amount_current" required placeholder="R$ 0,00" defaultValue={amountCurrent} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="updated_on">Data de atualização</Label>
                        <Input id="updated_on" name="updated_on" type="date" required value={updatedOn} onChange={e => setUpdatedOn(e.target.value)} />
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                        O valor informado será o novo total considerado como gasto no mês.
                    </p>

                    <Button type="submit" disabled={loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
