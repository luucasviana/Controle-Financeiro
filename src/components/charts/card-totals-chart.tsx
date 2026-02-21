"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis
} from "recharts"
import { Info } from "lucide-react"

interface CardTotal {
    card_id: string
    card_name: string
    total: number
}

interface CardTotalsChartProps {
    data: CardTotal[]
    className?: string
}

const COLORS = [
    "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6",
    "#ec4899", "#8b5cf6", "#f97316", "#0ea5e9", "#a3e635",
    "#fb923c", "#38bdf8", "#c084fc"
]

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v)

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
        const { name, value } = payload[0]
        return (
            <div className="bg-white border rounded-lg shadow-md px-3 py-2 text-sm">
                <p className="font-semibold text-slate-700">{name}</p>
                <p className="text-slate-500">{fmt(value)}</p>
            </div>
        )
    }
    return null
}

export function CardTotalsChart({ data, className = "" }: CardTotalsChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className={`flex flex-col h-auto [@media(min-width:1200px)]:h-[420px] ${className}`}>
                <CardHeader className="shrink-0 pb-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-sm font-medium">Cartões — total acumulado</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Soma de todos os meses</p>
                        </div>
                        <span title="Baseado nos valores atualizados por mês (snapshot)." className="cursor-help mt-0.5">
                            <Info className="h-4 w-4 text-slate-400" />
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Nenhum dado de cartão registrado ainda.
                </CardContent>
            </Card>
        )
    }

    const usePie = data.length <= 6

    const chartData = usePie
        ? data
        : [
            ...data.slice(0, 6),
            {
                card_id: "_others",
                card_name: "Outros",
                total: data.slice(6).reduce((a, c) => a + c.total, 0)
            }
        ]

    return (
        <Card className={`flex flex-col h-auto [@media(min-width:1200px)]:h-[420px] ${className}`}>
            <CardHeader className="shrink-0 pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-sm font-medium">Cartões — total acumulado</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Soma de todos os meses</p>
                    </div>
                    <span title="Baseado nos valores atualizados por mês (snapshot)." className="cursor-help mt-0.5">
                        <Info className="h-4 w-4 text-slate-400" />
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
                {usePie ? (
                    /* Pie: centered, fills available space */
                    <div className="flex-1 flex items-center justify-center min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="total"
                                    nameKey="card_name"
                                    cx="50%"
                                    cy="48%"
                                    outerRadius="52%"
                                    innerRadius="28%"
                                    paddingAngle={2}
                                >
                                    {chartData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    /* Horizontal bar ranking */
                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                            >
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="card_name"
                                    tick={{ fontSize: 10 }}
                                    width={80}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                <Bar
                                    dataKey="total"
                                    radius={[0, 4, 4, 0]}
                                    maxBarSize={22}
                                >
                                    {chartData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
