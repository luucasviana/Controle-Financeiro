import { getMonths } from "@/app/actions/months"
import { PageHeader } from "@/components/layout/page-header"
import { Surface } from "@/components/ui/surface"
import { MonthDialog } from "./month-dialog"
import { PeriodsPanel } from "./periods-panel"
import { CalendarPlus } from "lucide-react"

export default async function MonthsPage() {
    const months = await getMonths()

    return (
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 pb-10">
            <PageHeader
                title="Períodos"
                description="Crie e controle a duração de cada período financeiro."
                actions={<MonthDialog />}
            />

            <Surface className="p-6">
                {months.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <CalendarPlus className="h-8 w-8 text-app-faint" />
                        <div>
                            <h3 className="text-[13px] font-medium text-app-ink">
                                Nenhum período financeiro cadastrado
                            </h3>
                            <p className="mt-1 text-app-muted">
                                Comece adicionando seu período atual para lançar receitas e despesas.
                            </p>
                        </div>
                        <MonthDialog />
                    </div>
                ) : (
                    <PeriodsPanel months={months} showDates emptyMessage="Nenhum período cadastrado." />
                )}
            </Surface>
        </div>
    )
}
