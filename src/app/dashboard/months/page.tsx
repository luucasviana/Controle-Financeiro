import { getMonths, setMonthStatus, deleteMonth } from "@/app/actions/months"
import { MonthDialog } from "./month-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Trash2, AlertCircle, PlayCircle, StopCircle } from "lucide-react"

export default async function MonthsPage() {
    const months = await getMonths()

    return (
        <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Meses / Períodos</h2>
                    <p className="text-muted-foreground">Crie e controle a duração de cada período financeiro.</p>
                </div>
                <MonthDialog />
            </div>

            <div className="grid gap-4">
                {months.map(month => (
                    <Card key={month.id} className={month.status === 'OPEN' ? 'border-green-500 shadow-sm relative overflow-hidden' : 'relative overflow-hidden opacity-80 hover:opacity-100 transition'}>
                        {month.status === 'OPEN' && (
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
                        )}
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pl-6">
                            <div className="space-y-1">
                                <CardTitle className="text-xl inline-flex items-center gap-2">
                                    {month.name}
                                    {month.status === 'OPEN'
                                        ? <Badge className="bg-green-500">Aberto</Badge>
                                        : <Badge variant="secondary">Fechado</Badge>
                                    }
                                </CardTitle>
                                <CardDescription>
                                    Início: {format(new Date(month.start_date + "T00:00:00"), "dd/MMM/yyyy", { locale: ptBR })} &bull;
                                    Fim: {format(new Date(month.end_date + "T00:00:00"), "dd/MMM/yyyy", { locale: ptBR })}
                                </CardDescription>
                            </div>
                            <div className="flex space-x-2">
                                {month.status === 'OPEN' ? (
                                    <form action={async () => {
                                        "use server"
                                        await setMonthStatus(month.id, 'CLOSED')
                                    }}>
                                        <button title="Fechar Mês" className="bg-orange-100 p-2 rounded hover:bg-orange-200 text-orange-600">
                                            <StopCircle className="h-5 w-5" />
                                        </button>
                                    </form>
                                ) : (
                                    <form action={async () => {
                                        "use server"
                                        await setMonthStatus(month.id, 'OPEN')
                                    }}>
                                        <button title="Re-abrir Mês" className="bg-blue-100 p-2 rounded hover:bg-blue-200 text-blue-600">
                                            <PlayCircle className="h-5 w-5" />
                                        </button>
                                    </form>
                                )}

                                <div><MonthDialog activeMonth={month} /></div>

                                <form action={async () => {
                                    "use server"
                                    await deleteMonth(month.id)
                                }}>
                                    <button title="Excluir Mês" className="bg-red-100 p-2 rounded hover:bg-red-200 text-red-600">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </form>
                            </div>
                        </CardHeader>
                    </Card>
                ))}

                {months.length === 0 && (
                    <div className="text-center p-8 border rounded-lg bg-gray-50 flex flex-col items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhum mês financeiro cadastrado</h3>
                        <p className="text-sm text-gray-500 mb-4">Comece adicionando seu mês atual para lançar as receitas e despesas.</p>
                        <MonthDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
