"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { CalendarDays, Copy, Edit, Eye, MoreHorizontal, StopCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tag } from "@/components/ui/tag"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMonth } from "@/components/providers/month-provider"
import { deleteMonth, setMonthStatus, type MonthData } from "@/app/actions/months"
import { buildMonthScopedHref } from "@/lib/month-scoped-routes"
import { MonthDialog } from "./month-dialog"
import { cn } from "@/lib/utils"

/**
 * Lista de períodos com ações (abrir, editar, fechar/reabrir, excluir).
 * Usada tanto no card "Períodos" da tela de Planejamento quanto na tela
 * dedicada `/dashboard/months` — mesmas ações, duas entradas.
 */
export function PeriodsPanel({
    months,
    showDates = false,
    emptyMessage = "Nenhum período cadastrado.",
}: {
    months: MonthData[]
    showDates?: boolean
    emptyMessage?: string
}) {
    const { monthId } = useMonth()
    const [editingMonth, setEditingMonth] = useState<MonthData | null>(null)
    const [duplicatingMonth, setDuplicatingMonth] = useState<MonthData | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    async function handleToggleStatus(month: MonthData) {
        setBusyId(month.id)
        try {
            await setMonthStatus(month.id, month.status === "OPEN" ? "CLOSED" : "OPEN")
            toast.success(month.status === "OPEN" ? "Período fechado." : "Período reaberto.")
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status.")
        } finally {
            setBusyId(null)
        }
    }

    async function handleDelete(month: MonthData) {
        const confirmed = confirm(
            `Excluir "${month.name}"?\n\nOs lançamentos e receitas desse período serão apagados. Essa ação não pode ser desfeita.`
        )
        if (!confirmed) return

        setBusyId(month.id)
        try {
            await deleteMonth(month.id)
            toast.success("Período excluído.")
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível excluir.")
        } finally {
            setBusyId(null)
        }
    }

    return (
        <>
            <div className="flex flex-col gap-1">
                {months.map((month) => (
                    <div
                        key={month.id}
                        className={cn(
                            "flex items-center gap-3 rounded-control px-2 py-2 hover:bg-app-hairline",
                            month.id === monthId && "bg-app-hairline"
                        )}
                    >
                        <CalendarDays className="h-4 w-4 shrink-0 text-app-faint" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-app-ink">{month.name}</div>
                            {showDates && (
                                <div className="truncate text-app-muted">
                                    {format(new Date(month.start_date + "T00:00:00"), "dd/MMM/yyyy", { locale: ptBR })}
                                    {" – "}
                                    {format(new Date(month.end_date + "T00:00:00"), "dd/MMM/yyyy", { locale: ptBR })}
                                </div>
                            )}
                        </div>
                        <Tag tone={month.status === "OPEN" ? "positive" : "neutral"}>
                            {month.status === "OPEN" ? "Aberto" : "Fechado"}
                        </Tag>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="shrink-0" disabled={busyId === month.id}>
                                    <span className="sr-only">Ações do período</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={buildMonthScopedHref("/dashboard", month.id)}>
                                        <Eye className="h-4 w-4" />
                                        Ver período
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditingMonth(month)}>
                                    <Edit className="h-4 w-4" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDuplicatingMonth(month)}>
                                    <Copy className="h-4 w-4" />
                                    Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(month)}>
                                    <StopCircle className="h-4 w-4" />
                                    {month.status === "OPEN" ? "Fechar" : "Reabrir"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(month)}>
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}

                {months.length === 0 && <p className="py-6 text-center text-app-muted">{emptyMessage}</p>}
            </div>

            {editingMonth && (
                <MonthDialog
                    activeMonth={editingMonth}
                    trigger={null}
                    open
                    onOpenChange={(value) => {
                        if (!value) setEditingMonth(null)
                    }}
                />
            )}

            {duplicatingMonth && (
                <MonthDialog
                    duplicateFrom={duplicatingMonth}
                    trigger={null}
                    open
                    onOpenChange={(value) => {
                        if (!value) setDuplicatingMonth(null)
                    }}
                />
            )}
        </>
    )
}
