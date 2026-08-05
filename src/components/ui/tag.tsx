import { cn } from "@/lib/utils"

const TONES = {
    neutral: "bg-app-hairline text-app-muted",
    positive: "bg-app-pos-bg text-app-pos",
    negative: "bg-app-neg-bg text-app-neg",
    warn: "bg-app-warn-bg text-app-warn",
} as const

export function Tag({
    tone = "neutral",
    className,
    children,
}: {
    tone?: keyof typeof TONES
    className?: string
    children: React.ReactNode
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide",
                TONES[tone],
                className
            )}
        >
            {children}
        </span>
    )
}
