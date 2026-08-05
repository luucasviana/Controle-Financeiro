import { describe, expect, it } from "vitest"
import {
    buildInstallmentRowsToInsert,
    getMonthDueDate,
    type InstallmentExpenseRow,
    type InstallmentPlanRow,
    type SchedulingMonth,
} from "./installment-scheduling"

const JAN: SchedulingMonth = { id: "m-jan", start_date: "2026-01-01" }
const FEV: SchedulingMonth = { id: "m-fev", start_date: "2026-02-01" }
const MAR: SchedulingMonth = { id: "m-mar", start_date: "2026-03-01" }
const ABR: SchedulingMonth = { id: "m-abr", start_date: "2026-04-01" }
const TODOS_OS_MESES = [JAN, FEV, MAR, ABR]

function plano(overrides: Partial<InstallmentPlanRow> = {}): InstallmentPlanRow {
    return {
        id: "p1",
        user_id: "u1",
        description: "Televisão",
        amount: 400,
        due_day: 10,
        total_installments: 3,
        starts_in_current_month: false,
        is_active: true,
        is_archived: false,
        base_month_id: JAN.id,
        created_at: "2026-01-05T00:00:00Z",
        ...overrides,
    }
}

function gerada(monthId: string, numero: number): InstallmentExpenseRow {
    return { month_id: monthId, installment_plan_id: "p1", installment_number: numero }
}

describe("getMonthDueDate", () => {
    it("usa o dia pedido quando ele cabe no mês", () => {
        expect(getMonthDueDate(JAN, 10)).toBe("2026-01-10")
    })

    it("encolhe o dia até o último dia do mês", () => {
        expect(getMonthDueDate(FEV, 31)).toBe("2026-02-28")
    })

    it("nunca devolve dia menor que 1", () => {
        expect(getMonthDueDate(JAN, 0)).toBe("2026-01-01")
    })
})

describe("buildInstallmentRowsToInsert", () => {
    it("começa no mês seguinte ao mês base por padrão", () => {
        const linhas = buildInstallmentRowsToInsert(TODOS_OS_MESES, [plano()], [])

        expect(linhas.map((l) => [l.month_id, l.installment_number])).toEqual([
            [FEV.id, 1],
            [MAR.id, 2],
            [ABR.id, 3],
        ])
    })

    it("começa no próprio mês base quando starts_in_current_month é true", () => {
        const linhas = buildInstallmentRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true })],
            []
        )

        expect(linhas.map((l) => [l.month_id, l.installment_number])).toEqual([
            [JAN.id, 1],
            [FEV.id, 2],
            [MAR.id, 3],
        ])
    })

    it("para ao atingir o total de parcelas", () => {
        const linhas = buildInstallmentRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true, total_installments: 2 })],
            []
        )

        expect(linhas).toHaveLength(2)
    })

    it("continua a numeração de onde as parcelas já geradas pararam", () => {
        const linhas = buildInstallmentRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true })],
            [gerada(JAN.id, 1), gerada(FEV.id, 2)]
        )

        expect(linhas.map((l) => [l.month_id, l.installment_number])).toEqual([[MAR.id, 3]])
    })

    it("não gera nada quando todas as parcelas já existem", () => {
        const linhas = buildInstallmentRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true })],
            [gerada(JAN.id, 1), gerada(FEV.id, 2), gerada(MAR.id, 3)]
        )

        expect(linhas).toEqual([])
    })

    it("ignora plano cujo mês base não está na lista de meses", () => {
        const linhas = buildInstallmentRowsToInsert(
            [MAR, ABR],
            [plano({ starts_in_current_month: true })],
            []
        )

        expect(linhas).toEqual([])
    })

    it("ignora plano sem mês base", () => {
        const linhas = buildInstallmentRowsToInsert(
            TODOS_OS_MESES,
            [plano({ base_month_id: null })],
            []
        )

        expect(linhas).toEqual([])
    })

    it("preenche descrição, valor e vencimento a partir do plano", () => {
        const [linha] = buildInstallmentRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true, due_day: 25 })],
            []
        )

        expect(linha).toMatchObject({
            user_id: "u1",
            month_id: JAN.id,
            due_date: "2026-01-25",
            description: "Televisão",
            amount: 400,
            status: "PLANNED",
            payment_method: "NONE",
            installment_plan_id: "p1",
            installment_number: 1,
            installment_total: 3,
        })
    })
})
