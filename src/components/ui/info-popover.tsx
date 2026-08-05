"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * Ícone "(i)" clicável ao lado do título de um card, que abre um popover
 * explicando o que aquele card representa. Reusa o Popover (Radix) já usado
 * pelo PayPopover — abre no clique, não no hover, e é navegável por teclado
 * (o gatilho é um <button> real).
 *
 * `title` alimenta só o aria-label do gatilho ("Sobre este card: {title}");
 * o conteúdo visível do popover é `children`.
 */
export function InfoPopover({
    title,
    children,
    align = "start",
    className,
}: {
    title: string
    children: ReactNode
    align?: "start" | "center" | "end"
    className?: string
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`Sobre este card: ${title}`}
                    className={cn(
                        "shrink-0 text-app-faint transition-colors hover:text-app-muted",
                        className
                    )}
                >
                    <Info className="h-3.5 w-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align={align}
                collisionPadding={16}
                className="w-80 max-w-[calc(100vw-2rem)] border-app-border bg-app-surface p-3 text-app-muted shadow-menu"
            >
                {children}
            </PopoverContent>
        </Popover>
    )
}
