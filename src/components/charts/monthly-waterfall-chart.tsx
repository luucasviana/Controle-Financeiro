"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts"

interface WaterfallData {
    income: number
    cash_expenses: number
    cards_total: number
    projected_balance: number
}

interface MonthlyWaterfallChartProps {
    data: WaterfallData
    className?: string
}

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v)

function buildWaterfallSeries(data: WaterfallData) {
    const { income, cash_expenses, cards_total, projected_balance } = data
    return [
        {
            label: "Receita",
            base: 0,
            value: income,
            running: income,
            color: "#22c55e",
            isTotal: false,
        },
        {
            label: "À vista",
            base: income - cash_expenses,
            value: cash_expenses,
            running: income - cash_expenses,
            color: "#f97316",
            isTotal: false,
        },
        {
            label: "Cartões",
            base: income - cash_expenses - cards_total,
            value: cards_total,
            running: income - cash_expenses - cards_total,
            color: "#6366f1",
            isTotal: false,
        },
        {
            label: "Saldo",
            base: 0,
            value: projected_balance,
            running: projected_balance,
            color: projected_balance >= 0 ? "#14b8a6" : "#ef4444",
            isTotal: true,
        },
    ]
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        const entry = payload.find((p: any) => p.dataKey === "value")
        if (!entry) return null
        const item = payload[0]?.payload
        return (
            <div className="bg-white border rounded-lg shadow-md px-3 py-2 text-sm">
                <p className="font-semibold text-slate-700 mb-1">{label}</p>
                <p className="text-slate-600">Valor: <span className="font-medium">{fmt(entry.value)}</span></p>
                {!item?.isTotal && (
                    <p className="text-slate-400 text-xs">Acumulado: {fmt(item?.running)}</p>
                )}
            </div>
        )
    }
    return null
}

export function MonthlyWaterfallChart({ data, className = "" }: MonthlyWaterfallChartProps) {
    const series = buildWaterfallSeries(data)

    return (
        <Card className={`flex flex-col h-auto [@media(min-width:1200px)]:h-[420px] ${className}`}>
            <CardHeader className="shrink-0 pb-2">
                <CardTitle className="text-sm font-medium">Composição do mês</CardTitle>
                <p className="text-xs text-muted-foreground">Como a receita se converte no saldo projetado</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
                {/* Chart area — grows to fill */}
                <div className="flex-1 min-h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={series}
                            margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                            barCategoryGap="30%"
                        >
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                            <ReferenceLine y={0} stroke="#e2e8f0" />
                            <Bar dataKey="base" stackId="wf" fill="transparent" />
                            <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} maxBarSize={52}>
                                {series.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Summary tiles — fixed height at bottom */}
                <div className="grid grid-cols-2 gap-1.5 mt-3 shrink-0 sm:grid-cols-4">
                    <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-[10px] text-green-700 font-medium uppercase tracking-wide">Receita</p>
                        <p className="font-bold text-green-700 text-xs">{fmt(data.income)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2">
                        <p className="text-[10px] text-orange-700 font-medium uppercase tracking-wide">À vista</p>
                        <p className="font-bold text-orange-700 text-xs">−{fmt(data.cash_expenses)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-2">
                        <p className="text-[10px] text-indigo-700 font-medium uppercase tracking-wide">Cartões</p>
                        <p className="font-bold text-indigo-700 text-xs">−{fmt(data.cards_total)}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${data.projected_balance >= 0 ? 'bg-teal-50' : 'bg-red-50'}`}>
                        <p className={`text-[10px] font-medium uppercase tracking-wide ${data.projected_balance >= 0 ? 'text-teal-700' : 'text-red-700'}`}>Saldo</p>
                        <p className={`font-bold text-xs ${data.projected_balance >= 0 ? 'text-teal-700' : 'text-red-700'}`}>{fmt(data.projected_balance)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
