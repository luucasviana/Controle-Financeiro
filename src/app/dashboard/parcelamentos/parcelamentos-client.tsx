"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, cn } from "@/lib/utils"
import {
    archiveInstallmentPlan,
    deleteInstallmentPlan,
    getInstallmentPlans,
    toggleInstallmentPlan,
} from "@/app/actions/installments"
import { ParcelamentoDialog } from "./parcelamento-dialog"
import { toast } from "sonner"
import { Archive, Edit, MoreHorizontal, PauseCircle, PlayCircle, Trash2, Wallet2 } from "lucide-react"
import type { InstallmentPlanSummary } from "@/app/actions/installments"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type InstallmentPlan = InstallmentPlanSummary

export function ParcelamentosClient({ plans: initialPlans }: { plans: InstallmentPlan[] }) {
    const [plans, setPlans] = useState<InstallmentPlan[]>(initialPlans)
    const [search, setSearch] = useState("")
    const [showArchived, setShowArchived] = useState(false)
    const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null)

    useEffect(() => {
        getInstallmentPlans().then(setPlans)
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
            remainingInstallments: activePlans.reduce((acc, plan) => acc + plan.remainingInstallments, 0),
            remainingAmount: activePlans.reduce((acc, plan) => acc + plan.remainingAmount, 0),
        }
    }, [plans])

    async function handleRefresh() {
        const fresh = await getInstallmentPlans()
        setPlans(fresh)
    }

    async function handleToggle(planId: string, currentStatus: boolean) {
        try {
            await toggleInstallmentPlan(planId, currentStatus)
            setPlans((prev) => prev.map((plan) => plan.id === planId ? { ...plan, is_active: !currentStatus } : plan))
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function handleArchive(planId: string) {
        if (!confirm("Deseja arquivar este parcelamento? O histórico das parcelas já geradas será mantido.")) {
            return
        }

        try {
            await archiveInstallmentPlan(planId)
            setPlans((prev) => prev.map((plan) => plan.id === planId ? { ...plan, is_archived: true, is_active: false } : plan))
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    async function handleDelete(planId: string) {
        if (!confirm("Deseja excluir este parcelamento? As parcelas geradas por ele também serão apagadas.")) {
            return
        }

        try {
            await deleteInstallmentPlan(planId)
            setPlans((prev) => prev.filter((plan) => plan.id !== planId))
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Parcelamentos</h2>
                    <p className="text-muted-foreground">
                        Controle compras parceladas e acompanhe o progresso de pagamento.
                    </p>
                </div>
                <ParcelamentoDialog onSuccess={handleRefresh} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs uppercase text-muted-foreground">Parcelamentos ativos</p>
                        <p className="mt-2 text-2xl font-bold">{summary.activeCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs uppercase text-muted-foreground">Parcelas restantes</p>
                        <p className="mt-2 text-2xl font-bold">{summary.remainingInstallments}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs uppercase text-muted-foreground">Valor em aberto</p>
                        <p className="mt-2 text-2xl font-bold">{formatCurrency(summary.remainingAmount)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    placeholder="Buscar parcelamento..."
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
                        <Card
                            key={plan.id}
                            className={cn(
                                "overflow-hidden transition",
                                plan.is_archived ? "opacity-60 border-dashed" : "",
                                !plan.is_active && !plan.is_archived ? "border-amber-300" : ""
                            )}
                        >
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-lg font-semibold">{plan.description}</h3>
                                            {plan.is_archived && <Badge variant="secondary">Arquivado</Badge>}
                                            {!plan.is_archived && !plan.is_active && <Badge variant="outline">Pausado</Badge>}
                                            {plan.starts_in_current_month && <Badge className="bg-blue-600">Começa no mês atual</Badge>}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">{formatCurrency(plan.amount)}</span>
                                            <span>•</span>
                                            <span>{plan.total_installments} parcelas</span>
                                            <span>•</span>
                                            <span>Vence todo dia {plan.due_day}</span>
                                            {plan.nextDueDate && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        Próxima: {new Date(`${plan.nextDueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Progresso de pagamento</span>
                                                <span>
                                                    {plan.paidInstallments} de {plan.total_installments} parcelas pagas
                                                </span>
                                            </div>
                                            <Progress value={plan.progressPercent} />
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <Badge variant="secondary">Restam {plan.remainingInstallments}</Badge>
                                                <Badge variant="outline">Pago {formatCurrency(plan.paidAmount)}</Badge>
                                                <Badge variant="outline">Total {formatCurrency(plan.totalAmount)}</Badge>
                                            </div>
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
                                                {plan.is_active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
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
                                                        <Edit className="mr-2 h-4 w-4 text-blue-500" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                )}
                                                {!plan.is_archived && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleArchive(plan.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Arquivar
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(plan.id)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {visiblePlans.length === 0 && (
                    <div className="rounded-lg border bg-white py-10 text-center text-muted-foreground">
                        <Wallet2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <p>Nenhum parcelamento encontrado.</p>
                    </div>
                )}
            </div>

            {editingPlan && (
                <ParcelamentoDialog
                    mode="edit"
                    plan={editingPlan}
                    open={true}
                    onOpenChange={(val) => {
                        if (!val) setEditingPlan(null)
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
