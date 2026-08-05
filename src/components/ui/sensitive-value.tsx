"use client"

import { usePrivacy } from "@/components/providers/privacy-provider"
import { cn } from "@/lib/utils"

/** Quantidade fixa de pontos usados no lugar do valor oculto. */
const HIDDEN_PLACEHOLDER = "●●●●"

/**
 * Envolve um valor sensível (quanto o dono ganha ou quanto sobra) e, quando o
 * modo de privacidade está ativo, troca o valor por uma sequência fixa de
 * pontos — nunca renderiza o número em si.
 *
 * As três tentativas anteriores usavam `filter: blur()`, que sempre esbarrou
 * no mesmo problema: o desfoque pinta além da caixa do elemento, então algo
 * precisa conter esse halo. Raio fixo vazou para os vizinhos; `overflow-hidden`
 * conteve o halo mas recortou o gradiente no meio, virando um retângulo de
 * bordas duras; trocar o recorte por `mask-image` não ajudou, porque
 * `mask-clip` também vale `border-box` por padrão — a máscara recorta na
 * borda da caixa do mesmo jeito, e a faixa de dissolução ficava fora da área
 * pintada. Qualquer correção era um remendo em cima do anterior.
 *
 * Pontos resolvem tudo isso de uma vez, porque não pintam nada fora da caixa:
 * não há halo, não há recorte, não há máscara, não há diferença entre
 * navegadores. A quantidade de pontos é sempre a mesma (4), independente do
 * valor — de propósito: o blur preservava a largura do texto original, então
 * um valor na casa dos milhares ficava visivelmente mais comprido que um na
 * casa das centenas, vazando a ordem de grandeza mesmo com os dígitos
 * escondidos. Um pequeno salto de largura ao alternar oculto/visível é
 * esperado e aceitável — não é compensado com largura fixa, que só trocaria
 * esse problema por outro pior nos valores longos.
 *
 * Também é mais seguro que o desfoque: com `blur()` o número continuava no
 * DOM, então dava pra selecionar e copiar o texto borrado mesmo sem
 * conseguir lê-lo. Aqui, quando oculto, o valor real simplesmente não é
 * renderizado — não existe para ser selecionado, copiado ou lido por um
 * leitor de tela. Os pontos recebem `aria-label` avisando que o valor está
 * oculto, então o leitor de tela anuncia isso em vez do conteúdo (que nem
 * está presente).
 *
 * O wrapper continua `inline-flex` para não alterar a altura da linha nem o
 * alinhamento nas grades e linhas onde é usado, e `tabular-nums` estabiliza
 * a largura junto dos números vizinhos. `select-none` impede a seleção dos
 * próprios pontos.
 */
export function SensitiveValue({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    const { valuesHidden } = usePrivacy()

    if (valuesHidden) {
        return (
            <span
                className={cn(
                    "inline-flex select-none tabular-nums text-app-faint transition-opacity duration-150",
                    className
                )}
                aria-label="Valor oculto"
            >
                {HIDDEN_PLACEHOLDER}
            </span>
        )
    }

    return (
        <span className={cn("inline-flex transition-opacity duration-150", className)}>
            {children}
        </span>
    )
}
