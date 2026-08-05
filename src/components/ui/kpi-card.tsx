import { Surface } from "@/components/ui/surface"
import { VariacaoBadge } from "@/components/ui/variacao-badge"
import { Info, type LucideIcon } from "lucide-react"

type KpiTone = "positive" | "negative" | "neutral"

const TONE_CLASSES: Record<KpiTone, { value: string; icon: string }> = {
    positive: { value: "text-app-pos", icon: "text-app-pos" },
    negative: { value: "text-app-neg", icon: "text-app-neg" },
    neutral: { value: "text-app-ink", icon: "text-app-faint" },
}

export function KpiCard({
    label,
    value,
    tone = "neutral",
    icon: Icon,
    hint,
    trend,
    trendInverted,
    footnote,
}: {
    label: string
    value: string
    tone?: KpiTone
    icon?: LucideIcon
    hint?: string
    trend?: number | null
    trendInverted?: boolean
    footnote?: string
}) {
    const classes = TONE_CLASSES[tone]

    return (
        <Surface className="px-5 py-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-app-muted">
                        {label}
                    </span>
                    {hint && (
                        <span title={hint} className="cursor-help">
                            <Info className="h-3.5 w-3.5 shrink-0 text-app-faint" />
                        </span>
                    )}
                </div>
                {Icon && <Icon className={`h-4 w-4 shrink-0 ${classes.icon}`} />}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className={`text-2xl font-bold tabular-nums ${classes.value}`}>{value}</div>
                {trend !== undefined && <VariacaoBadge valor={trend} inverted={trendInverted} />}
            </div>
            {footnote && <p className="mt-1 text-xs text-app-muted">{footnote}</p>}
        </Surface>
    )
}
