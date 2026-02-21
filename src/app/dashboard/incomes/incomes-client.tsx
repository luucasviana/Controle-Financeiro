"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils"
import { IncomeDialog } from "./income-dialog"
import { Trash2, Power, EyeOff, MoreHorizontal, Edit } from "lucide-react"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import { getIncomes, deleteIncome, toggleIncome } from "@/app/actions/incomes"
import { toast } from "sonner"

type Income = {
    id: string
    description: string
    amount: number
    is_active: boolean
    is_hidden: boolean
    created_at: string
}

export function IncomesClient({ incomes: initialIncomes }: { incomes: Income[] }) {
    const { hiddenModeEnabled } = useHiddenMode()
    const [incomes, setIncomes] = useState<Income[]>(initialIncomes)
    const [editingIncome, setEditingIncome] = useState<Income | null>(null)

    // Re-fetch whenever hidden mode changes
    useEffect(() => {
        getIncomes().then(setIncomes)
    }, [hiddenModeEnabled])

    const visibleIncomes = hiddenModeEnabled
        ? incomes
        : incomes.filter(i => !i.is_hidden)

    // Total from non-hidden active incomes — mirrors dashboard KPI
    const totalVisible = incomes
        .filter(i => i.is_active && !i.is_hidden)
        .reduce((acc, curr) => acc + curr.amount, 0)

    async function handleRefresh() {
        const fresh = await getIncomes()
        setIncomes(fresh)
    }

    async function handleDelete(id: string) {
        if (!confirm("Deseja realmente excluir esta receita?")) return
        try {
            await deleteIncome(id)
            setIncomes(prev => prev.filter(i => i.id !== id))
            toast.success("Receita excluída!")
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function handleToggle(id: string, currentStatus: boolean) {
        try {
            await toggleIncome(id, currentStatus)
            setIncomes(prev => prev.map(i => i.id === id ? { ...i, is_active: !currentStatus } : i))
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Receitas</h2>
                    <p className="text-muted-foreground">Suas fontes de renda recorrentes</p>
                </div>
                <div className="flex items-center gap-4 text-xl font-bold bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                    Total Visível: {formatCurrency(totalVisible)}
                </div>
                <IncomeDialog mode="create" onSuccess={handleRefresh} />
            </div>

            {hiddenModeEnabled && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <EyeOff className="h-4 w-4" />
                    <span>Modo oculto ativo — receitas ocultas estão visíveis abaixo.</span>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleIncomes.map((income) => {
                    const isHiddenVisible = hiddenModeEnabled && income.is_hidden
                    return (
                        <Card
                            key={income.id}
                            className={[
                                !income.is_active ? "opacity-50" : "",
                                isHiddenVisible ? "opacity-60" : "",
                            ].filter(Boolean).join(" ")}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <CardTitle className="text-sm font-medium truncate">{income.description}</CardTitle>
                                    {isHiddenVisible && (
                                        <Badge variant="secondary" className="text-[10px] shrink-0 flex items-center gap-1">
                                            <EyeOff className="h-3 w-3" /> Oculta
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {/* Ativar/Desativar Button */}
                                    <button
                                        onClick={() => handleToggle(income.id, income.is_active)}
                                        className="text-gray-500 hover:text-green-700 p-1.5 rounded hover:bg-slate-100"
                                        title="Ativar/Desativar"
                                    >
                                        <Power className={`h-4 w-4 ${income.is_active ? 'text-green-500' : 'text-gray-400'}`} />
                                    </button>

                                    {/* Actions dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setEditingIncome(income)}>
                                                <Edit className="mr-2 h-4 w-4 text-blue-500" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(income.id)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(income.amount)}</div>
                                <p className="text-xs text-muted-foreground">Mensal • {income.is_active ? 'Ativa' : 'Inativa'}</p>
                            </CardContent>
                        </Card>
                    )
                })}

                {visibleIncomes.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Nenhuma receita encontrada.
                    </div>
                )}
            </div>

            {/* Edit Dialog — rendered outside the card loop, controlled externally */}
            {editingIncome && (
                <IncomeDialog
                    mode="edit"
                    income={editingIncome}
                    open={true}
                    onOpenChange={(val) => {
                        if (!val) setEditingIncome(null)
                    }}
                    onSuccess={async () => {
                        await handleRefresh()
                        setEditingIncome(null)
                    }}
                />
            )}
        </div>
    )
}
