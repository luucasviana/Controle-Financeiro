"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
    className,
    value = 0,
    ...props
}: React.ComponentProps<"div"> & { value?: number }) {
    return (
        <div
            data-slot="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, value))}
            className={cn("relative h-3 w-full overflow-hidden rounded-full bg-app-hairline", className)}
            {...props}
        >
            <div
                data-slot="progress-indicator"
                className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    )
}

export { Progress }
