"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface DashboardChartsProps {
    monthName: string
    currentMetrics: {
        income_visible: number
        total_expenses: number
        projected_balance: number
    }
    historicalMetrics: any[]
    className?: string
}

export function DashboardCharts({ historicalMetrics, className = "" }: DashboardChartsProps) {
    const barData = historicalMetrics.map(m => ({
        name: m.monthName,
        Receita: m.income_visible,
        Despesa: m.total_expenses,
    }))

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded-lg shadow-sm text-sm">
                    <p className="font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-600">{entry.name}:</span>
                            <span className="font-semibold">{formatCurrency(entry.value)}</span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <Card className={`flex flex-col h-auto [@media(min-width:1200px)]:h-[420px] ${className}`}>
            <CardHeader className="shrink-0">
                <CardTitle className="text-sm font-medium">Comparativo Mensal (Receita vs Despesa)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
                <div className="flex-1 min-h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => `R$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                            <Bar dataKey="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            <Bar dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
