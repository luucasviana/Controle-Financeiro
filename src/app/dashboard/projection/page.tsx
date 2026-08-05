import { getProjection } from "@/app/actions/projection"
import { getMonths } from "@/app/actions/months"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Surface } from "@/components/ui/surface"
import { MonthDialog } from "../months/month-dialog"
import { PeriodsPanel } from "../months/periods-panel"
import { cn, formatCurrency } from "@/lib/utils"
import { measureServerTiming } from "@/lib/server-timing"
import { PlusCircle } from "lucide-react"

export default async function ProjectionPage() {
    const [projection, months] = await measureServerTiming("projection-page", async () =>
        Promise.all([getProjection(), getMonths()])
    )

    const rows = projection.map((item, index) => ({
        ...item,
        accumulated: projection.slice(0, index + 1).reduce((sum, entry) => sum + entry.balance, 0),
    }))

    return (
        <div className="flex-1 space-y-6">
            <PageHeader
                title="Planejamento"
                description="Projeção de receita, despesa e sobra dos próximos períodos, com base nas recorrências ativas"
            />

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <Surface className="overflow-hidden p-0">
                    <div className="border-b border-app-hairline px-6 py-5">
                        <div className="text-[13px] font-medium text-app-ink">Projeção</div>
                        <p className="mt-1 text-app-muted">
                            Sobra e acumulado já contam as despesas recorrentes ainda não lançadas
                        </p>
                    </div>

                    {rows.length === 0 ? (
                        <p className="px-6 py-10 text-center text-app-muted">
                            Sem períodos futuros para planejar.
                        </p>
                    ) : (
                        <div className="overflow-x-auto px-6 py-4">
                            <table className="w-full min-w-[560px] border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-app-hairline text-[11px] font-semibold uppercase tracking-wider text-app-muted">
                                        <th className="py-2 pr-3 font-semibold">Período</th>
                                        <th className="px-3 py-2 text-right font-semibold">Receita</th>
                                        <th className="px-3 py-2 text-right font-semibold">Despesa</th>
                                        <th className="px-3 py-2 text-right font-semibold">Sobra</th>
                                        <th className="py-2 pl-3 text-right font-semibold">Acumulado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((item, index) => (
                                        <tr key={index} className="border-b border-app-hairline last:border-0">
                                            <td className="py-2.5 pr-3 capitalize text-app-ink">{item.monthLabel}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-app-muted">
                                                {formatCurrency(item.income)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-app-muted">
                                                {formatCurrency(item.expense)}
                                            </td>
                                            <td
                                                className={cn(
                                                    "px-3 py-2.5 text-right font-medium tabular-nums",
                                                    item.balance < 0 ? "text-app-accent" : "text-app-ink"
                                                )}
                                            >
                                                {formatCurrency(item.balance)}
                                            </td>
                                            <td
                                                className={cn(
                                                    "py-2.5 pl-3 text-right font-medium tabular-nums",
                                                    item.accumulated < 0 ? "text-app-accent" : "text-app-ink"
                                                )}
                                            >
                                                {formatCurrency(item.accumulated)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Surface>

                <Surface className="flex flex-col p-6">
                    <div className="text-[13px] font-medium text-app-ink">Períodos</div>
                    <p className="mt-1 mb-4 text-app-muted">
                        Abra, edite ou encerre um período sem sair da tela
                    </p>

                    <PeriodsPanel months={months} emptyMessage="Nenhum período cadastrado ainda." />

                    <div className="mt-4 border-t border-app-hairline pt-4">
                        <MonthDialog
                            trigger={
                                <Button className="w-full">
                                    <PlusCircle className="h-4 w-4" />
                                    Criar novo período
                                </Button>
                            }
                        />
                    </div>
                </Surface>
            </div>
        </div>
    )
}
