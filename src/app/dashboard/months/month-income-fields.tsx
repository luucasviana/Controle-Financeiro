"use client"

import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { EyeOff, Wallet } from "lucide-react"
import type { IncomeEditorRow } from "@/app/actions/month-incomes"

export function MonthIncomeFields({
    rows,
    values,
    onChange,
}: {
    rows: IncomeEditorRow[]
    values: Record<string, number>
    onChange: (sourceId: string, amount: number) => void
}) {
    const total = rows.reduce((acc, row) => acc + (values[row.source_id] ?? 0), 0)

    if (rows.length === 0) {
        return (
            <div className="rounded-card border border-dashed border-app-border bg-app-hairline px-3 py-4 text-center text-sm text-app-muted">
                Nenhuma fonte de receita cadastrada. Cadastre em{" "}
                <span className="font-medium text-app-ink">Fontes de Receita</span> para informar
                os valores do período.
            </div>
        )
    }

    return (
        <div className="space-y-3 rounded-card border border-app-border bg-app-hairline p-3">
            <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-app-accent" />
                <Label className="text-sm font-medium text-app-ink">Receitas do período</Label>
            </div>

            <p className="text-xs text-app-muted">
                Os valores vêm do período anterior. Ajuste o que mudou.
            </p>

            <div className="space-y-2">
                {rows.map((row) => (
                    <div key={row.source_id} className="flex items-center gap-3">
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-app-ink">
                            <span className="truncate">{row.description}</span>
                            {row.is_hidden && (
                                <EyeOff className="h-3.5 w-3.5 shrink-0 text-app-faint" />
                            )}
                        </span>
                        <CurrencyInput
                            name={`income-${row.source_id}`}
                            className="w-36 bg-app-surface"
                            aria-label={`Valor de ${row.description}`}
                            defaultValue={row.amount}
                            onValueChange={(amount) => onChange(row.source_id, amount)}
                        />
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between border-t border-app-border pt-2 text-sm">
                <span className="text-app-muted">Total</span>
                <span className="font-medium text-app-ink">{formatCurrency(total)}</span>
            </div>
        </div>
    )
}
