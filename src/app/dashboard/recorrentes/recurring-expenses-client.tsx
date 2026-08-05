"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Surface } from "@/components/ui/surface"
import { Tag } from "@/components/ui/tag"
import { KpiCard } from "@/components/ui/kpi-card"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency, cn } from "@/lib/utils"
import {
    archiveRecurringExpense,
    deleteRecurringExpense,
    getRecurringExpenses,
    toggleRecurringExpense,
    type RecurringExpenseSummary,
} from "@/app/actions/recurring-expenses"
import { RecurringExpenseDialog } from "./recurring-expense-dialog"
import { toast } from "sonner"
import {
    Archive,
    CalendarClock,
    CheckCircle2,
    Circle,
    Edit,
    MoreHorizontal,
    PauseCircle,
    PlayCircle,
    Repeat,
    Trash2,
    Wallet2,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function RecurringExpensesClient({
    plans: initialPlans,
}: {
    plans: RecurringExpenseSummary[]
}) {
    const [plans, setPlans] = useState<RecurringExpenseSummary[]>(initialPlans)
    const [search, setSearch] = useState("")
    const [showArchived, setShowArchived] = useState(false)
    const [editingPlan, setEditingPlan] = useState<RecurringExpenseSummary | null>(null)

    useEffect(() => {
        getRecurringExpenses().then(setPlans)
    }, [])

    const visiblePlans = useMemo(() => {
        const normalized = plans
            .filter((plan) => (showArchived ? true : !plan.is_archived))
            .filter((plan) => {
                if (!search) return true
                return plan.description.toLowerCase().includes(search.toLowerCase())
            })

        return [...normalized].sort((a, b) => {
            if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1
            if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
            return b.created_at.localeCompare(a.created_at)
        })
    }, [plans, search, showArchived])

    const summary = useMemo(() => {
        const activePlans = plans.filter((plan) => !plan.is_archived)

        return {
            activeCount: activePlans.filter((plan) => plan.is_active).length,
            openEndedCount: activePlans.filter((plan) => plan.total_occurrences === null).length,
            remainingOccurrences: activePlans.reduce(
                (acc, plan) => acc + (plan.remainingOccurrences ?? 0),
                0
            ),
            remainingAmount: activePlans.reduce(
                (acc, plan) => acc + (plan.remainingAmount ?? 0),
                0
            ),
        }
    }, [plans])

    async function handleRefresh() {
        const fresh = await getRecurringExpenses()
        setPlans(fresh)
    }

    async function handleToggle(planId: string, currentStatus: boolean) {
        try {
            await toggleRecurringExpense(planId, currentStatus)
            setPlans((prev) =>
                prev.map((plan) =>
                    plan.id === planId ? { ...plan, is_active: !currentStatus } : plan
                )
            )
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível alterar.")
        }
    }

    async function handleArchive(planId: string) {
        if (
            !confirm(
                "Deseja arquivar esta despesa recorrente? O histórico dos lançamentos já gerados será mantido."
            )
        ) {
            return
        }

        try {
            await archiveRecurringExpense(planId)
            setPlans((prev) =>
                prev.map((plan) =>
                    plan.id === planId ? { ...plan, is_archived: true, is_active: false } : plan
                )
            )
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível arquivar.")
        }
    }

    async function handleDelete(planId: string) {
        if (
            !confirm(
                "Deseja excluir esta despesa recorrente? Os lançamentos gerados por ela também serão apagados."
            )
        ) {
            return
        }

        try {
            await deleteRecurringExpense(planId)
            setPlans((prev) => prev.filter((plan) => plan.id !== planId))
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível excluir.")
        }
    }

    return (
        <div className="flex-1 space-y-6">
            <PageHeader
                title="Despesas Recorrentes"
                description="Despesas que se repetem a cada período — com prazo definido ou sem prazo."
                actions={<RecurringExpenseDialog onSuccess={handleRefresh} />}
            />

            <div className="grid gap-4 md:grid-cols-3">
                <KpiCard
                    label="Recorrentes ativas"
                    value={String(summary.activeCount)}
                    icon={Repeat}
                />
                <KpiCard
                    label="Lançamentos restantes"
                    value={String(summary.remainingOccurrences)}
                    icon={CalendarClock}
                    footnote={
                        summary.openEndedCount > 0
                            ? `+ ${summary.openEndedCount} sem prazo`
                            : undefined
                    }
                />
                <KpiCard
                    label="Valor em aberto"
                    value={formatCurrency(summary.remainingAmount)}
                    icon={Wallet2}
                    footnote={
                        summary.openEndedCount > 0
                            ? "Não inclui as despesas sem prazo"
                            : undefined
                    }
                />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    placeholder="Buscar despesa recorrente..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="sm:max-w-sm"
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowArchived((value) => !value)}
                >
                    {showArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
                </Button>
            </div>

            <div className="space-y-3">
                {visiblePlans.map((plan) => {
                    return (
                        <Surface
                            key={plan.id}
                            className={cn(
                                "overflow-hidden px-4 py-4 transition",
                                plan.is_archived && "border-dashed opacity-60",
                                !plan.is_active && !plan.is_archived && "border-app-warn-border"
                            )}
                        >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="truncate text-[15px] font-semibold text-app-ink">
                                            {plan.description}
                                        </h3>
                                        {plan.is_archived && <Tag tone="neutral">Arquivado</Tag>}
                                        {!plan.is_archived && !plan.is_active && (
                                            <Tag tone="warn">Pausado</Tag>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-sm text-app-muted">
                                        <span className="font-medium text-app-ink">
                                            {formatCurrency(plan.amount)}
                                        </span>
                                        <span>•</span>
                                        <span>
                                            {plan.total_occurrences === null
                                                ? "Sem prazo"
                                                : `${plan.total_occurrences} meses`}
                                        </span>
                                        <span>•</span>
                                        <span>Vence todo dia {plan.due_day}</span>
                                        {plan.nextDueDate && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    Próxima:{" "}
                                                    {new Date(
                                                        `${plan.nextDueDate}T00:00:00`
                                                    ).toLocaleDateString("pt-BR")}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-app-muted">
                                            <span>Progresso</span>
                                            <span>
                                                {plan.total_occurrences === null
                                                    ? `${plan.paidOccurrences} pago(s) • sem prazo`
                                                    : `${plan.paidOccurrences} de ${plan.total_occurrences} pagos`}
                                            </span>
                                        </div>

                                        {plan.progressPercent !== null && (
                                            <Progress value={plan.progressPercent} />
                                        )}

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-app-muted">
                                            {plan.remainingOccurrences !== null && (
                                                <Tag tone="neutral">
                                                    Restam {plan.remainingOccurrences}
                                                </Tag>
                                            )}
                                            <span>Pago {formatCurrency(plan.paidAmount)}</span>
                                            {plan.totalAmount !== null && (
                                                <span>Total {formatCurrency(plan.totalAmount)}</span>
                                            )}
                                        </div>

                                        {plan.occurrences.length > 0 && (
                                            <ul className="mt-2 divide-y divide-app-border rounded-control border border-app-border bg-app-surface">
                                                {plan.occurrences.map((occurrence) => (
                                                    <li
                                                        key={occurrence.id}
                                                        className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                                                    >
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            {occurrence.status === "PAID" ? (
                                                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-app-pos" />
                                                            ) : (
                                                                <Circle className="h-3.5 w-3.5 shrink-0 text-app-faint" />
                                                            )}
                                                            <span className="truncate text-app-ink">
                                                                {occurrence.number
                                                                    ? `${occurrence.number}. `
                                                                    : ""}
                                                                {occurrence.monthName}
                                                            </span>
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "shrink-0",
                                                                occurrence.status === "PAID"
                                                                    ? "text-app-faint line-through"
                                                                    : "font-medium text-app-ink"
                                                            )}
                                                        >
                                                            {formatCurrency(occurrence.amount)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start lg:self-center">
                                    {!plan.is_archived && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggle(plan.id, plan.is_active)}
                                            title={plan.is_active ? "Pausar" : "Reativar"}
                                        >
                                            {plan.is_active ? (
                                                <PauseCircle className="h-4 w-4" />
                                            ) : (
                                                <PlayCircle className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {!plan.is_archived && (
                                                <DropdownMenuItem onClick={() => setEditingPlan(plan)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                            )}
                                            {!plan.is_archived && (
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={() => handleArchive(plan.id)}
                                                >
                                                    <Archive className="mr-2 h-4 w-4" />
                                                    Arquivar
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() => handleDelete(plan.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </Surface>
                    )
                })}

                {visiblePlans.length === 0 && (
                    <div className="rounded-card border border-dashed border-app-border py-10 text-center text-app-muted">
                        <Wallet2 className="mx-auto mb-3 h-10 w-10 text-app-faint" />
                        <p>Nenhuma despesa recorrente encontrada.</p>
                    </div>
                )}
            </div>

            {editingPlan && (
                <RecurringExpenseDialog
                    mode="edit"
                    plan={editingPlan}
                    open
                    onOpenChange={(value) => {
                        if (!value) setEditingPlan(null)
                    }}
                    onSuccess={async () => {
                        await handleRefresh()
                        setEditingPlan(null)
                    }}
                />
            )}
        </div>
    )
}
