"use client"

import { useEffect, useState } from "react"
import { upsertCardMonthBalance } from "@/app/actions/cards"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMonth } from "@/components/providers/month-provider"
import { format } from "date-fns"
import { CreditCard } from "lucide-react"
import { toast } from "sonner"

type UpdateBalanceDialogProps = {
    cards: any[]
    balances: any[]
    trigger?: React.ReactNode
    initialCardId?: string
    lockCardSelection?: boolean
}

export function UpdateBalanceDialog({
    cards,
    balances,
    trigger,
    initialCardId,
    lockCardSelection = false,
}: UpdateBalanceDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { monthId } = useMonth()

    const [selectedCardId, setSelectedCardId] = useState<string>(initialCardId || "")
    const [amountCurrent, setAmountCurrent] = useState<number>(0)
    const [updatedOn, setUpdatedOn] = useState<string>(format(new Date(), "yyyy-MM-dd"))

    const activeCardId = lockCardSelection ? (initialCardId || "") : selectedCardId

    useEffect(() => {
        if (!open) {
            setSelectedCardId(initialCardId || "")
            setAmountCurrent(0)
            setUpdatedOn(format(new Date(), "yyyy-MM-dd"))
            return
        }

        if (!activeCardId) {
            setAmountCurrent(0)
            setUpdatedOn(format(new Date(), "yyyy-MM-dd"))
            return
        }

        const balanceData = balances.find((balance) => balance.card_id === activeCardId)
        if (balanceData) {
            setAmountCurrent(balanceData.amount_current)
            setUpdatedOn(balanceData.updated_on)
            return
        }

        setAmountCurrent(0)
        setUpdatedOn(format(new Date(), "yyyy-MM-dd"))
    }, [open, activeCardId, balances, initialCardId])

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
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Atualizar valor do cartão
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-[425px]"
                onOpenAutoFocus={(event) => event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Atualizar valor do cartão</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="flex flex-col space-y-2">
                        <Label htmlFor="card_id">Cartão</Label>
                        {lockCardSelection ? (
                            <>
                                <input type="hidden" name="card_id" value={activeCardId} />
                                <Select value={activeCardId} disabled>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Cartão selecionado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cards.map((card) => (
                                            <SelectItem key={card.id} value={card.id}>
                                                {card.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        ) : (
                            <Select name="card_id" required value={selectedCardId} onValueChange={setSelectedCardId}>
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
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount_current">Valor atual</Label>
                        <CurrencyInput
                            key={`amount-${activeCardId}-${amountCurrent}`}
                            id="amount_current"
                            name="amount_current"
                            required
                            placeholder="R$ 0,00"
                            defaultValue={amountCurrent}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="updated_on">Data de atualização</Label>
                        <Input
                            id="updated_on"
                            name="updated_on"
                            type="date"
                            required
                            value={updatedOn}
                            onChange={(event) => setUpdatedOn(event.target.value)}
                        />
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                        O valor informado será o novo total considerado como gasto no mês.
                    </p>

                    <Button type="submit" disabled={loading} className="mt-4 w-full bg-blue-600 hover:bg-blue-700">
                        Salvar
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
