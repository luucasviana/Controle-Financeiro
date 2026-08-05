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
    items: Array<{ label: string; value: React.ReactNode; tone?: StatTone }>
    className?: string
}) {
    return (
        <div
            className={cn(
                "grid grid-cols-3 gap-4 border-t border-app-hairline pt-4",
                className
            )}
        >
            {items.map((item) => (
                <div key={item.label}>
                    <div className="text-[11px] text-app-muted">{item.label}</div>
                    <div
                        className={cn(
                            "mt-0.5 text-[15px] font-medium tabular-nums",
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
