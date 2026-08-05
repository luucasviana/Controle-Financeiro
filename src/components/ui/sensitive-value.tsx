"use client"

import { usePrivacy } from "@/components/providers/privacy-provider"
import { cn } from "@/lib/utils"

/**
 * Envolve um valor sensível (quanto o dono ganha ou quanto sobra) e aplica um
 * borrão quando o modo de privacidade está ativo. O raio do borrão é dado em
 * `em`, ou seja, proporcional ao tamanho da fonte de cada uso: sutil nos
 * textos pequenos (rótulos, listas) e forte no número grande de "Sobra
 * projetada", sem precisar de ajuste manual por lugar.
 *
 * `filter: blur()` não é recortado pelo `overflow-hidden` do próprio
 * elemento borrado — o halo vazaria para os vizinhos mesmo com raio pequeno.
 * Por isso a estrutura tem dois níveis: um wrapper externo que recorta
 * (`overflow-hidden`) e um `span` interno que borra. O wrapper é
 * `inline-flex` para se comportar como o conteúdo original — não altera a
 * altura da linha nem o alinhamento nas grades e linhas que o usam.
 * `select-none` no interno evita que o texto borrado seja selecionado e
 * copiado. Nenhum dos dois altera as dimensões do elemento, então o layout
 * não pula ao alternar.
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
            className={cn("inline-flex overflow-hidden", className)}
            aria-hidden={valuesHidden}
        >
            <span
                className={cn(
                    "inline-block transition-[filter] duration-150",
                    valuesHidden && "blur-[0.35em] select-none"
                )}
            >
                {children}
            </span>
        </span>
    )
}
