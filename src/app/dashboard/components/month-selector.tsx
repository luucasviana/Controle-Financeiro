"use client"

import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MonthData } from "@/app/actions/months"
import { Badge } from "@/components/ui/badge"

export default function MonthSelector({ months, currentMonthId }: { months: MonthData[], currentMonthId?: string }) {
    const router = useRouter()

    if (!months || months.length === 0) {
        return (
            <div className="text-sm text-muted-foreground flex items-center space-x-2">
                <span>Nenhum mês financeiro criado.</span>
                <span className="text-blue-500 cursor-pointer underline" onClick={() => router.push('/dashboard/months')}>Criar Mês</span>
            </div>
        )
    }

    return (
        <Select
            value={currentMonthId}
            onValueChange={(val) => {
                router.push(`/dashboard?monthId=${val}`)
            }}
        >
            <SelectTrigger className="w-[200px] bg-white text-black font-semibold shadow-sm border-gray-200">
                <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
                {months.map(m => (
                    <SelectItem key={m.id} value={m.id} className="capitalize flex justify-between">
                        {m.name}
                        {m.status === 'OPEN' ? <Badge className="ml-2 bg-green-500 scale-75">Aberto</Badge> : <Badge variant="secondary" className="ml-2 scale-75">Fechado</Badge>}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
