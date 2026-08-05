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
 * `filter: blur()` pinta além da caixa do próprio elemento borrado — o halo
 * vazaria para os vizinhos mesmo com raio pequeno. A primeira correção
 * recortava esse halo com `overflow-hidden` num wrapper externo, mas o
 * recorte corta o gradiente do blur no meio, trocando o desfoque suave por
 * um retângulo de bordas duras. Em vez de recortar, o `span` interno que
 * borra também recebe uma `mask-image` radial: opaca no centro, transparente
 * nas bordas. A borda da caixa cai exatamente na metade do raio da elipse
 * (`ellipse 100% 100% at center` faz o raio horizontal = largura e o raio
 * vertical = altura, então o contorno da caixa — a meia largura/altura —
 * corresponde sempre a 50% do raio, em qualquer proporção). Com a parada
 * opaca em 55%, o miolo da caixa (0%–50%) fica sempre 100% opaco — o valor
 * nunca fica legível, nem nas bordas — e só o halo que extrapola a caixa
 * (50%–100%) se dissolve gradualmente até sumir, sem linha de corte. Por
 * isso o wrapper externo não precisa mais de `overflow-hidden`: nada
 * transborda sem ser esmaecido primeiro. `-webkit-mask-image` replica o
 * mesmo gradiente para navegadores que só reconhecem a versão prefixada.
 *
 * O wrapper é `inline-flex` para se comportar como o conteúdo original —
 * não altera a altura da linha nem o alinhamento nas grades e linhas que o
 * usam. `select-none` no interno evita que o texto borrado seja selecionado
 * e copiado. Nenhum dos dois altera as dimensões do elemento, então o
 * layout não pula ao alternar.
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
        <span className={cn("inline-flex", className)} aria-hidden={valuesHidden}>
            <span
                className={cn(
                    "inline-block transition-[filter] duration-150",
                    valuesHidden &&
                        "blur-[0.35em] select-none [mask-image:radial-gradient(ellipse_100%_100%_at_center,black_55%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_100%_100%_at_center,black_55%,transparent_100%)]"
                )}
            >
                {children}
            </span>
        </span>
    )
}
