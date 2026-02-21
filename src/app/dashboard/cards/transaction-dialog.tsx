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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Receipt } from "lucide-react"
import { createManualTransaction } from "@/app/actions/transactions"
import { format } from "date-fns"

export function TransactionDialog({ cards }: { cards: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append("auto_create_expense", "true")
        try {
            await createManualTransaction(formData)
            toast.success("Transação lançada com sucesso!")
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
                <Button variant="outline"><Receipt className="mr-2 h-4 w-4" /> Lançar Transação Gasto</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Compra no Cartão</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2 flex flex-col">
                        <Label htmlFor="card_id">Cartão</Label>
                        <Select name="card_id" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cards.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição do Gasto</Label>
                        <Input id="description" name="description" required placeholder="Ex: Ifood, Netflix..." />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor da Compra</Label>
                        <CurrencyInput id="amount" name="amount" required placeholder="R$ 0,00" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="occurred_at">Data da Compra</Label>
                        <Input id="occurred_at" name="occurred_at" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                        Aviso: Uma despesa será criada e marcada automaticamente como &quot;Paga no Cartão&quot; para manter seu saldo projetado exato sem perder o controle.
                    </p>

                    <Button type="submit" disabled={loading} className="w-full mt-4 bg-orange-600 hover:bg-orange-700">Lançar Compra</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
