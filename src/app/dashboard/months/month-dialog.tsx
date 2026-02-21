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
import { createMonth, updateMonth, MonthData } from "@/app/actions/months"
import { toast } from "sonner"
import { Edit2 } from "lucide-react"

export function MonthDialog({ activeMonth }: { activeMonth?: MonthData }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(formData: FormData) {
        setLoading(true)
        try {
            if (activeMonth) {
                await updateMonth(activeMonth.id, formData)
                toast.success("Mês atualizado com sucesso!")
            } else {
                await createMonth(formData)
                toast.success("Mês criado com sucesso!")
            }
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
                {activeMonth ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button className="bg-blue-600">Criar Novo Período</Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{activeMonth ? 'Editar Mês' : 'Criar Mês Financeiro'}</DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Período</Label>
                        <Input id="name" name="name" required placeholder="Ex: Fevereiro 2026" defaultValue={activeMonth?.name || ''} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="start_date">Data de Início</Label>
                        <Input id="start_date" name="start_date" type="date" required defaultValue={activeMonth?.start_date || ''} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="end_date">Data de Fim</Label>
                        <Input id="end_date" name="end_date" type="date" required defaultValue={activeMonth?.end_date || ''} />
                    </div>

                    {!activeMonth && (
                        <p className="text-xs text-muted-foreground">
                            Atenção: Ao criar um novo mês, ele será automaticamente definido como estado `ABERTO` e será selecionado em todos os relatórios. Outros meses abertos serão fechados.
                        </p>
                    )}

                    <Button type="submit" disabled={loading} className="w-full mt-4">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
