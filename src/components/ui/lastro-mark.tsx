"use client"

import { useId } from "react"

const ASSINATURA_PATH =
    "M9.20 100.00H58.32V82.27H27.74V0.00H9.20Z M66.49 100.00H86.92L98.02 74.15H133.60L144.29 100.00H164.73L122.78 0.00H108.17ZM104.78 56.43 115.47 26.12 126.16 56.43Z M173.57 71.45C175.19 90.39 188.86 101.76 206.45 101.76C224.45 101.76 238.39 87.82 238.39 69.69C238.39 56.16 232.84 47.36 212.54 39.78C203.07 36.27 202.80 36.13 201.45 35.32C197.79 33.02 195.90 29.91 195.90 26.25C195.90 20.30 200.09 16.10 206.18 16.10C212.41 16.10 216.19 19.89 216.74 26.66H235.95C235.00 9.07 222.42 -1.76 206.32 -1.76C190.21 -1.76 177.22 10.83 177.22 26.66C177.22 39.24 184.67 48.85 198.06 53.86C211.32 58.86 212.41 59.27 215.38 61.57C218.36 63.87 219.98 67.66 219.98 71.72C219.98 78.89 214.44 83.90 206.45 83.90C198.20 83.90 193.73 79.84 192.92 71.45Z M248.99 17.73H267.53V100.00H286.06V17.73H304.60V0.00H248.99Z M320.08 100.00H338.61V61.71L364.87 100.00H387.73L360.67 63.06C378.67 58.59 386.79 47.63 386.79 32.07C386.79 21.92 383.13 13.26 376.23 7.44C369.74 1.89 362.57 0.00 348.90 0.00H320.08ZM338.61 47.77V17.73H346.87C364.46 17.73 368.11 23.68 368.11 32.61C368.11 43.17 362.02 47.77 347.68 47.77Z M399.42 50.07C399.42 78.89 422.69 101.76 452.06 101.76C481.15 101.76 503.61 79.16 503.61 49.93C503.61 21.38 480.74 -1.76 452.19 -1.76C422.42 -1.76 399.42 20.84 399.42 50.07ZM418.09 50.07C418.09 30.72 432.71 16.10 451.92 16.10C470.46 16.10 484.94 30.99 484.94 50.20C484.94 69.42 470.87 83.90 451.92 83.90C432.98 83.90 418.09 69.01 418.09 50.07Z"

const SELO_PATH = "M9.20 100.00H58.32V82.27H27.74V0.00H9.20Z"

type LastroMarkProps = {
    /** Fração de 0 a 1 do quanto já foi comprometido. Padrão do kit: 0.62. */
    level?: number
    className?: string
}

function clampLevel(level: number): number {
    return Math.min(1, Math.max(0, level))
}

/**
 * Assinatura da marca Lastro (a palavra LASTRO), com a linha d'água dinâmica.
 * Precisa ser renderizada inline (não dentro de <img>) para que os clipPath
 * funcionem. Os ids dos clipPath são únicos por instância via useId().
 */
export function LastroMark({ level = 0.62, className }: LastroMarkProps) {
    const id = useId()
    const cimaId = `${id}-lastro-cima`
    const baixoId = `${id}-lastro-baixo`
    const y = 100 * (1 - clampLevel(level))

    return (
        <svg
            viewBox="-24 -24 557 148"
            role="img"
            aria-label="Lastro"
            className={className}
        >
            <title>Lastro</title>
            <defs>
                <clipPath id={cimaId}>
                    <rect x="-600" width="2400" y="-600" height={600 + y} />
                </clipPath>
                <clipPath id={baixoId}>
                    <rect x="-600" width="2400" y={y} height="600" />
                </clipPath>
            </defs>
            <path d={ASSINATURA_PATH} fill="var(--color-app-faint)" clipPath={`url(#${cimaId})`} />
            <path d={ASSINATURA_PATH} fill="var(--color-app-ink)" clipPath={`url(#${baixoId})`} />
            <path
                d={`M-20 ${y} H-8 M517 ${y} H529`}
                stroke="var(--color-app-accent)"
                strokeWidth={5}
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    )
}

/**
 * Selo da marca Lastro (só o L), para espaços apertados. Tamanho mínimo: 20px.
 */
export function LastroSelo({ level = 0.62, className }: LastroMarkProps) {
    const id = useId()
    const cimaId = `${id}-selo-cima`
    const baixoId = `${id}-selo-baixo`
    const y = 100 * (1 - clampLevel(level))

    return (
        <svg
            viewBox="-61.2 -45 190 190"
            role="img"
            aria-label="Lastro"
            className={className}
        >
            <title>Lastro</title>
            <defs>
                <clipPath id={cimaId}>
                    <rect x="-600" y="-600" width="2400" height={600 + y} />
                </clipPath>
                <clipPath id={baixoId}>
                    <rect x="-600" y={y} width="2400" height="600" />
                </clipPath>
            </defs>
            <rect x="-61.2" y="-45" width="190" height="190" rx="42" fill="var(--color-app-surface)" />
            <path d={SELO_PATH} fill="var(--color-app-faint)" clipPath={`url(#${cimaId})`} />
            <path d={SELO_PATH} fill="var(--color-app-ink)" clipPath={`url(#${baixoId})`} />
            <path
                d={`M-39.2 ${y} H1.2 M66.3 ${y} H106.8`}
                stroke="var(--color-app-accent)"
                strokeWidth={7}
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    )
}
