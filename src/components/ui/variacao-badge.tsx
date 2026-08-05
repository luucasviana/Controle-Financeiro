import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

export function VariacaoBadge({ valor, inverted }: { valor?: number | null, inverted?: boolean }) {
    if (valor === undefined) return null;
    if (valor === null) return <span className="text-xs font-medium text-app-muted bg-app-hairline px-1.5 py-0.5 rounded">Novo</span>

    const isPositive = valor > 0;
    const isZero = valor === 0;

    // Inverted means "positive is bad" (for expenses).
    const isGood = isZero ? true : inverted ? !isPositive : isPositive;

    // Color logic — mono scheme: favorable is normal ink, unfavorable is accent.
    const colorClass = isZero ? 'text-app-muted bg-app-hairline' : isGood ? 'text-app-muted bg-app-hairline' : 'text-app-accent bg-app-neg-bg';
    const Icon = isZero ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

    return (
        <span className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${colorClass}`}>
            <Icon className="w-3 h-3 mr-0.5" />
            {isZero ? '0%' : `${isPositive ? '+' : ''}${valor.toFixed(1).replace('.', ',')}%`}
        </span>
    )
}
