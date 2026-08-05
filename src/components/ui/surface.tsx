import { cn } from "@/lib/utils"

export function Surface({
    className,
    children,
}: {
    className?: string
    children: React.ReactNode
}) {
    return (
        <div
            className={cn(
                "rounded-card border border-app-border bg-app-surface shadow-card",
                className
            )}
        >
            {children}
        </div>
    )
}
