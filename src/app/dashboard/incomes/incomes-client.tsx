"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { Tag } from "@/components/ui/tag"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/layout/page-header"
import { IncomeDialog } from "./income-dialog"
import { Edit, EyeOff, MoreHorizontal, Power, Trash2, Wallet } from "lucide-react"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"
import {
    deleteIncomeSource,
    getIncomeSources,
    toggleIncomeSource,
    type IncomeSource,
} from "@/app/actions/income-sources"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function IncomeSourcesClient({ sources: initialSources }: { sources: IncomeSource[] }) {
    const { hiddenModeEnabled } = useHiddenMode()
    const [sources, setSources] = useState<IncomeSource[]>(initialSources)
    const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)

    useEffect(() => {
        getIncomeSources().then(setSources).catch(() => undefined)
    }, [hiddenModeEnabled])

    const visibleSources = hiddenModeEnabled
        ? sources
        : sources.filter((source) => !source.is_hidden)

    async function handleRefresh() {
        setSources(await getIncomeSources())
    }

    async function handleDelete(source: IncomeSource) {
        const confirmed = confirm(
            `Excluir "${source.description}"?\n\nO valor dessa fonte será apagado de TODOS os períodos, inclusive os já fechados. Se a intenção é só parar de receber, use Desativar.`
        )
        if (!confirmed) return

        try {
            await deleteIncomeSource(source.id)
            setSources((previous) => previous.filter((item) => item.id !== source.id))
            toast.success("Fonte de receita excluída.")
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível excluir.")
        }
    }

    async function handleToggle(source: IncomeSource) {
        try {
            await toggleIncomeSource(source.id, source.is_active)
            setSources((previous) =>
                previous.map((item) =>
                    item.id === source.id ? { ...item, is_active: !item.is_active } : item
                )
            )
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível alterar.")
        }
    }

    return (
        <div className="flex-1 space-y-6">
            <PageHeader
                title="Fontes de Receita"
                description="De onde vem o dinheiro. O valor de cada período é informado ao criar ou editar o período em Meses."
                actions={<IncomeDialog mode="create" onSuccess={handleRefresh} />}
            />

            {hiddenModeEnabled && (
                <div className="flex items-center gap-2 rounded-control border border-app-warn-border bg-app-warn-bg px-3 py-2 text-sm text-app-warn">
                    <EyeOff className="h-4 w-4" />
                    <span>Modo oculto ativo — fontes ocultas estão visíveis abaixo.</span>
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {visibleSources.map((source) => {
                    const isHiddenVisible = hiddenModeEnabled && source.is_hidden

                    return (
                        <Surface
                            key={source.id}
                            className={cn(
                                "px-4 py-3",
                                !source.is_active && "opacity-60",
                                isHiddenVisible && "opacity-70"
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <Wallet className="h-4 w-4 shrink-0 text-app-pos" />
                                    <span className="truncate text-sm font-medium text-app-ink">
                                        {source.description}
                                    </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        onClick={() => handleToggle(source)}
                                        className="rounded p-1.5 text-app-faint hover:bg-app-hairline hover:text-app-pos"
                                        title={source.is_active ? "Desativar" : "Ativar"}
                                    >
                                        <Power
                                            className={cn(
                                                "h-4 w-4",
                                                source.is_active ? "text-app-pos" : "text-app-faint"
                                            )}
                                        />
                                    </button>

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
                                            <DropdownMenuItem onClick={() => setEditingSource(source)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() => handleDelete(source)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <Tag tone={source.is_active ? "positive" : "neutral"}>
                                    {source.is_active ? "Ativa" : "Inativa"}
                                </Tag>
                                {isHiddenVisible && (
                                    <Tag tone="warn" className="gap-1">
                                        <EyeOff className="h-3 w-3" /> Oculta
                                    </Tag>
                                )}
                            </div>
                        </Surface>
                    )
                })}

                {visibleSources.length === 0 && (
                    <div className="col-span-full rounded-card border border-dashed border-app-border py-12 text-center text-app-muted">
                        Nenhuma fonte de receita cadastrada.
                    </div>
                )}
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
        </div>
    )
}
