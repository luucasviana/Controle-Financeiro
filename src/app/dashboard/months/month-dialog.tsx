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
import { Label } from "@/components/ui/label"
import { createMonth, updateMonth, MonthData } from "@/app/actions/months"
import {
    getIncomeEditorRows,
    type IncomeEditorRow,
    type MonthIncomeEntry,
} from "@/app/actions/month-incomes"
import { MonthIncomeFields } from "./month-income-fields"
import { toast } from "sonner"
import { Edit2 } from "lucide-react"

export function MonthDialog({ activeMonth }: { activeMonth?: MonthData }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<IncomeEditorRow[]>([])
    const [values, setValues] = useState<Record<string, number>>({})

    useEffect(() => {
        if (!open) return

        let cancelled = false

        getIncomeEditorRows(activeMonth?.id)
            .then((editorRows) => {
                if (cancelled) return
                setRows(editorRows)
                setValues(Object.fromEntries(editorRows.map((row) => [row.source_id, row.amount])))
            })
            .catch((error: unknown) => {
                if (cancelled) return
                toast.error(
                    error instanceof Error ? error.message : "Não foi possível carregar as receitas."
                )
            })

        return () => {
            cancelled = true
        }
    }, [open, activeMonth?.id])

    function handleIncomeChange(sourceId: string, amount: number) {
        setValues((previous) => ({ ...previous, [sourceId]: amount }))
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)

        const incomes: MonthIncomeEntry[] = rows.map((row) => ({
            source_id: row.source_id,
            amount: values[row.source_id] ?? 0,
        }))

        try {
            if (activeMonth) {
                await updateMonth(activeMonth.id, formData, incomes)
                toast.success("Período atualizado com sucesso!")
            } else {
                await createMonth(formData, incomes)
                toast.success("Período criado com sucesso!")
            }
            setOpen(false)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {activeMonth ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-700"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button className="bg-blue-600">Criar Novo Período</Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>
                        {activeMonth ? "Editar Período" : "Criar Período Financeiro"}
                    </DialogTitle>
                </DialogHeader>
                <form action={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Período</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            placeholder="Ex: Fevereiro 2026"
                            defaultValue={activeMonth?.name || ""}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Data de Início</Label>
                            <Input
                                id="start_date"
                                name="start_date"
                                type="date"
                                required
                                defaultValue={activeMonth?.start_date || ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date">Data de Fim</Label>
                            <Input
                                id="end_date"
                                name="end_date"
                                type="date"
                                required
                                defaultValue={activeMonth?.end_date || ""}
                            />
                        </div>
                    </div>

                    <MonthIncomeFields rows={rows} values={values} onChange={handleIncomeChange} />

                    {!activeMonth && (
                        <p className="text-xs text-muted-foreground">
                            Ao criar um período novo ele fica <strong>aberto</strong> e passa a ser o
                            selecionado nos relatórios. Outros períodos abertos serão fechados. As
                            despesas recorrentes ativas são lançadas automaticamente.
                        </p>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Salvando..." : "Salvar"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
