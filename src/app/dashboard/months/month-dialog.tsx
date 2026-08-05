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
import { Edit2, PlusCircle } from "lucide-react"

interface MonthDialogProps {
    activeMonth?: MonthData
    /**
     * Período de origem ao duplicar. Quando presente e `activeMonth` está ausente,
     * o diálogo é de criação (nome e datas vazios), mas as receitas iniciais vêm
     * desse período.
     */
    duplicateFrom?: MonthData
    /** Elemento que abre o modal. Passe `null` para um modal totalmente controlado (sem trigger próprio). */
    trigger?: React.ReactNode | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function MonthDialog({ activeMonth, duplicateFrom, trigger, open: externalOpen, onOpenChange: externalOnOpenChange }: MonthDialogProps) {
    const isControlled = externalOpen !== undefined
    const [internalOpen, setInternalOpen] = useState(false)
    const open = isControlled ? externalOpen! : internalOpen
    const [loading, setLoading] = useState(false)
    const [rows, setRows] = useState<IncomeEditorRow[]>([])
    const [values, setValues] = useState<Record<string, number>>({})

    function handleOpenChange(value: boolean) {
        if (!isControlled) setInternalOpen(value)
        externalOnOpenChange?.(value)
    }

    useEffect(() => {
        if (!open) return

        let cancelled = false

        getIncomeEditorRows(activeMonth?.id ?? duplicateFrom?.id)
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
    }, [open, activeMonth?.id, duplicateFrom?.id])

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
            handleOpenChange(false)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = activeMonth ? (
        <Button variant="ghost" size="icon-sm" className="text-app-accent">
            <Edit2 className="h-4 w-4" />
        </Button>
    ) : (
        <Button>
            <PlusCircle className="h-4 w-4" />
            Criar novo período
        </Button>
    )
    const triggerNode = trigger === null ? null : (trigger ?? defaultTrigger)

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {triggerNode && <DialogTrigger asChild>{triggerNode}</DialogTrigger>}
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>
                        {activeMonth
                            ? "Editar Período"
                            : duplicateFrom
                              ? "Duplicar Período"
                              : "Criar Período Financeiro"}
                    </DialogTitle>
                    {!activeMonth && duplicateFrom && (
                        <p className="text-xs text-app-muted">
                            Receitas copiadas de <strong>{duplicateFrom.name}</strong>. Defina um novo
                            nome e novas datas.
                        </p>
                    )}
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

                    <MonthIncomeFields
                        rows={rows}
                        values={values}
                        onChange={handleIncomeChange}
                        helperText={
                            duplicateFrom && !activeMonth
                                ? `Os valores vêm de "${duplicateFrom.name}". Ajuste o que mudou.`
                                : undefined
                        }
                    />

                    {!activeMonth && (
                        <p className="text-xs text-app-muted">
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
