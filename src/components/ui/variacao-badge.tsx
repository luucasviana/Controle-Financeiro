import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

export function VariacaoBadge({ valor, inverted }: { valor?: number | null, inverted?: boolean }) {
    if (valor === undefined) return null;
    if (valor === null) return <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Novo</span>

    const isPositive = valor > 0;
    const isZero = valor === 0;

    // Inverted means "positive is bad" (for expenses).
    const isGood = isZero ? true : inverted ? !isPositive : isPositive;

    // Color logic
    const colorClass = isZero ? 'text-slate-500 bg-slate-100' : isGood ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
    const Icon = isZero ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

    return (
        <span className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${colorClass}`}>
            <Icon className="w-3 h-3 mr-0.5" />
            {isZero ? '0%' : `${isPositive ? '+' : ''}${valor.toFixed(1).replace('.', ',')}%`}
        </span>
    )
}
