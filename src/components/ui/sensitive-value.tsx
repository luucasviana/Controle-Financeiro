"use client"

import { usePrivacy } from "@/components/providers/privacy-provider"
import { cn } from "@/lib/utils"

/**
 * Envolve um valor sensível (quanto o dono ganha ou quanto sobra) e aplica um
 * borrão forte quando o modo de privacidade está ativo. `select-none` evita
 * que o texto borrado seja selecionado e copiado. O borrão é um filtro visual
 * puro — não altera as dimensões do elemento, então o layout não pula ao
 * alternar.
 */
export function SensitiveValue({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    const { valuesHidden } = usePrivacy()

    return (
        <span
            className={cn(
                "inline-block transition-[filter] duration-150",
                valuesHidden && "blur-lg select-none",
                className
            )}
            aria-hidden={valuesHidden}
        >
            {children}
        </span>
    )
}
