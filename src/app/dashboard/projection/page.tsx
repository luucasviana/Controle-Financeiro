import { getProjection } from "@/app/actions/projection"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

export default async function ProjectionPage() {
    const projection = await getProjection()

    return (
        <div className="flex-1 space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Projeção</h2>
                <p className="text-muted-foreground">Previsão pros próximos 6 meses baseada em suas receitas e despesas recorrentes</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projection.map((item, idx) => (
                    <Card key={idx}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg capitalize">{item.monthLabel}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="text-muted-foreground">Receitas Est.</span>
                                <span className="font-medium text-green-600">{formatCurrency(item.income)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="text-muted-foreground">Despesas Est.</span>
                                <span className="font-medium text-red-600">{formatCurrency(item.expense)}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold pt-2">
                                <span>Saldo Projetado</span>
                                <span className={item.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(item.balance)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
