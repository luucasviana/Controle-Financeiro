"use client"

import { useState } from "react"
import Link from "next/link"
import { Edit, MoreHorizontal, Power, Trash2, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InfoPopover } from "@/components/ui/info-popover"
import { Surface } from "@/components/ui/surface"
import { Tag } from "@/components/ui/tag"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import {
    deleteIncomeSource,
    getIncomeSources,
    toggleIncomeSource,
    type IncomeSource,
} from "@/app/actions/income-sources"
import { getIncomeEditorRows } from "@/app/actions/month-incomes"
import { IncomeDialog } from "./incomes/income-dialog"
import { cn, formatCurrency } from "@/lib/utils"

export type IncomeSourceOverviewRow = IncomeSource & { amount: number }

async function fetchOverviewRows(monthId: string): Promise<IncomeSourceOverviewRow[]> {
    const [rows, sources] = await Promise.all([getIncomeEditorRows(monthId), getIncomeSources()])
    const sourceById = new Map(sources.map((source) => [source.id, source]))

    return rows.map((row) => {
        const source = sourceById.get(row.source_id)
        return {
            id: row.source_id,
            description: row.description,
            is_hidden: row.is_hidden,
            is_active: source?.is_active ?? true,
            created_at: source?.created_at ?? "",
            amount: row.amount,
        }
    })
}

export function IncomeSourcesCard({
    monthId,
    initialRows,
}: {
    monthId: string
    initialRows: IncomeSourceOverviewRow[]
}) {
    const { hiddenModeEnabled } = useHiddenMode()
    const [rows, setRows] = useState(initialRows)
    const [editingSource, setEditingSource] = useState<IncomeSourceOverviewRow | null>(null)

    const visibleRows = hiddenModeEnabled ? rows : rows.filter((row) => !row.is_hidden)
    const total = visibleRows.reduce((acc, row) => acc + row.amount, 0)

    async function handleRefresh() {
        setRows(await fetchOverviewRows(monthId))
    }

    async function handleDelete(row: IncomeSourceOverviewRow) {
        const confirmed = confirm(
            `Excluir "${row.description}"?\n\nO valor dessa fonte será apagado de TODOS os períodos, inclusive os já fechados. Se a intenção é só parar de receber, use Desativar.`
        )
        if (!confirmed) return

        try {
            await deleteIncomeSource(row.id)
            setRows((previous) => previous.filter((item) => item.id !== row.id))
            toast.success("Fonte de receita excluída.")
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível excluir.")
        }
    }

    async function handleToggle(row: IncomeSourceOverviewRow) {
        try {
            await toggleIncomeSource(row.id, row.is_active)
            setRows((previous) =>
                previous.map((item) => (item.id === row.id ? { ...item, is_active: !item.is_active } : item))
            )
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível alterar.")
        }
    }

    return (
        <Surface className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-app-ink">Receitas</span>
                    <InfoPopover title="Receitas">
                        <div className="space-y-1.5">
                            <p className="font-medium text-app-ink">Receitas</p>
                            <p>
                                As fontes de receita deste período e quanto cada uma trouxe. Os valores são por
                                período: alterar um valor aqui não muda os períodos anteriores.
                            </p>
                        </div>
                    </InfoPopover>
                </div>
                <Link href="/dashboard/incomes" className="text-app-accent hover:underline">
                    Gerenciar fontes
                </Link>
            </div>

            <div className="flex flex-col gap-1">
                {visibleRows.map((row) => {
                    const isHiddenVisible = hiddenModeEnabled && row.is_hidden

                    return (
                        <div
                            key={row.id}
                            className={cn(
                                "flex items-center gap-3 rounded-control px-2 py-1.5 hover:bg-app-hairline",
                                (!row.is_active || isHiddenVisible) && "opacity-60"
                            )}
                        >
                            <Wallet className="h-4 w-4 shrink-0 text-app-faint" />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-app-ink">{row.description}</div>
                                <div className="flex gap-1">
                                    {!row.is_active && (
                                        <Tag tone="neutral" className="text-[9px]">
                                            Inativa
                                        </Tag>
                                    )}
                                    {isHiddenVisible && (
                                        <Tag tone="warn" className="text-[9px]">
                                            Oculta
                                        </Tag>
                                    )}
                                </div>
                            </div>
                            <span className="shrink-0 font-medium tabular-nums text-app-ink">
                                {formatCurrency(row.amount)}
                            </span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" className="shrink-0">
                                        <span className="sr-only">Abrir menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingSource(row)}>
                                        <Edit className="h-4 w-4" />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggle(row)}>
                                        <Power className="h-4 w-4" />
                                        {row.is_active ? "Desativar" : "Ativar"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row)}>
                                        <Trash2 className="h-4 w-4" />
                                        Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                })}

                {visibleRows.length === 0 && (
                    <p className="py-6 text-center text-app-muted">Nenhuma fonte de receita neste período.</p>
                )}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-app-hairline pt-3">
                <span className="text-app-muted">Total do período</span>
                <span className="text-[15px] font-medium text-app-ink">{formatCurrency(total)}</span>
            </div>

            {editingSource && (
                <IncomeDialog
                    mode="edit"
                    source={editingSource}
                    open
                    onOpenChange={(value) => {
                        if (!value) setEditingSource(null)
                    }}
                    onSuccess={async () => {
                        await handleRefresh()
                        setEditingSource(null)
                    }}
                />
            )}
        </Surface>
    )
}
