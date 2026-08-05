import { cn } from "@/lib/utils"

type StatTone = "neutral" | "positive" | "negative"

const TONES: Record<StatTone, string> = {
    neutral: "text-app-ink",
    positive: "text-app-pos",
    negative: "text-app-neg",
}

export function StatStrip({
    items,
    className,
}: {
    items: Array<{ label: string; value: string; tone?: StatTone }>
    className?: string
}) {
    return (
        <div
            className={cn(
                "grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-app-border bg-app-border sm:grid-cols-3",
                className
            )}
        >
            {items.map((item) => (
                <div key={item.label} className="bg-app-surface px-3 py-2.5">
                    <div className="mb-1 text-[11px] text-app-muted">{item.label}</div>
                    <div
                        className={cn(
                            "text-[15px] font-semibold tabular-nums",
                            TONES[item.tone ?? "neutral"]
                        )}
                    >
                        {item.value}
                    </div>
                </div>
            ))}
        </div>
    )
}
