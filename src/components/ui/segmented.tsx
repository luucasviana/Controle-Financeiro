"use client"

import { cn } from "@/lib/utils"

export function Segmented<T extends string>({
    options,
    value,
    onChange,
    className,
}: {
    options: Array<{ value: T; label: string }>
    value: T
    onChange: (value: T) => void
    className?: string
}) {
    return (
        <div className={cn("flex rounded-control border border-app-border p-1", className)}>
            {options.map((option) => {
                const isActive = option.value === value

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex-1 rounded-md px-3 py-1.5 text-sm transition-all",
                            isActive
                                ? "text-app-accent shadow-[inset_0_0_0_1px_var(--color-app-accent)]"
                                : "text-app-muted hover:text-app-ink"
                        )}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
