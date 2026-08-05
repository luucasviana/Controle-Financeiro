import { describe, expect, it } from "vitest"
import {
    buildRecurringExpenseRowsToInsert,
    getMonthDueDate,
    type GeneratedOccurrenceRow,
    type RecurringExpenseRow,
    type SchedulingMonth,
} from "./recurring-expense-scheduling"

const JAN: SchedulingMonth = { id: "m-jan", start_date: "2026-01-01", end_date: "2026-01-31" }
const FEV: SchedulingMonth = { id: "m-fev", start_date: "2026-02-01", end_date: "2026-02-28" }
const MAR: SchedulingMonth = { id: "m-mar", start_date: "2026-03-01", end_date: "2026-03-31" }
const ABR: SchedulingMonth = { id: "m-abr", start_date: "2026-04-01", end_date: "2026-04-30" }
const TODOS_OS_MESES = [JAN, FEV, MAR, ABR]

function plano(overrides: Partial<RecurringExpenseRow> = {}): RecurringExpenseRow {
    return {
        id: "p1",
        user_id: "u1",
        description: "Televisão",
        amount: 400,
        due_day: 10,
        total_occurrences: 3,
        starts_in_current_month: false,
        is_active: true,
        is_archived: false,
        base_month_id: JAN.id,
        payment_method: "NONE",
        card_id: null,
        created_at: "2026-01-05T00:00:00Z",
        ...overrides,
    }
}

function gerada(monthId: string, numero: number): GeneratedOccurrenceRow {
    return { month_id: monthId, recurring_expense_id: "p1", occurrence_number: numero }
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

    describe("período não alinhado ao calendário (ex.: 10 a 09 do mês seguinte)", () => {
        const PERIODO_AGO_SET: SchedulingMonth = {
            id: "m-periodo",
            start_date: "2026-08-10",
            end_date: "2026-09-09",
        }

        it("dia que só existe no mês seguinte ao início rola para lá, sem cair antes do período (bug original)", () => {
            expect(getMonthDueDate(PERIODO_AGO_SET, 9)).toBe("2026-09-09")
        })

        it("dia que cabe dentro do mês de início não regride: continua no mês de início", () => {
            expect(getMonthDueDate(PERIODO_AGO_SET, 15)).toBe("2026-08-15")
        })

        it("dia igual ao início do período é o limite inferior exato", () => {
            expect(getMonthDueDate(PERIODO_AGO_SET, 10)).toBe("2026-08-10")
        })

        it("período de calendário (mês cheio) continua funcionando como antes", () => {
            const periodoCalendario: SchedulingMonth = {
                id: "m-fev-calendario",
                start_date: "2026-02-01",
                end_date: "2026-02-28",
            }

            expect(getMonthDueDate(periodoCalendario, 15)).toBe("2026-02-15")
        })

        it("dia 31 num período que atravessa fevereiro é recortado para o último dia válido, sem sair do período", () => {
            const periodoAtravessaFevereiro: SchedulingMonth = {
                id: "m-fev-marco",
                start_date: "2026-02-05",
                end_date: "2026-03-04",
            }

            expect(getMonthDueDate(periodoAtravessaFevereiro, 31)).toBe("2026-02-28")
        })
    })
})

describe("buildRecurringExpenseRowsToInsert", () => {
    it("começa no mês seguinte ao mês base por padrão", () => {
        const linhas = buildRecurringExpenseRowsToInsert(TODOS_OS_MESES, [plano()], [])

        expect(linhas.map((l) => [l.month_id, l.occurrence_number])).toEqual([
            [FEV.id, 1],
            [MAR.id, 2],
            [ABR.id, 3],
        ])
    })

    it("começa no próprio mês base quando starts_in_current_month é true", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true })],
            []
        )

        expect(linhas.map((l) => [l.month_id, l.occurrence_number])).toEqual([
            [JAN.id, 1],
            [FEV.id, 2],
            [MAR.id, 3],
        ])
    })

    it("para ao atingir o total de parcelas", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true, total_occurrences: 2 })],
            []
        )

        expect(linhas).toHaveLength(2)
    })

    it("continua a numeração de onde as parcelas já geradas pararam", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true })],
            [gerada(JAN.id, 1), gerada(FEV.id, 2)]
        )

        expect(linhas.map((l) => [l.month_id, l.occurrence_number])).toEqual([[MAR.id, 3]])
    })

    it("não gera nada quando todas as parcelas já existem", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ starts_in_current_month: true })],
            [gerada(JAN.id, 1), gerada(FEV.id, 2), gerada(MAR.id, 3)]
        )

        expect(linhas).toEqual([])
    })

    it("ignora plano cujo mês base não está na lista de meses", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            [MAR, ABR],
            [plano({ starts_in_current_month: true })],
            []
        )

        expect(linhas).toEqual([])
    })

    it("ignora plano sem mês base", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ base_month_id: null })],
            []
        )

        expect(linhas).toEqual([])
    })

    it("preenche descrição, valor e vencimento a partir do plano", () => {
        const [linha] = buildRecurringExpenseRowsToInsert(
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
            recurring_expense_id: "p1",
            occurrence_number: 1,
            occurrence_total: 3,
        })
    })
})

describe("recorrência sem prazo (total_occurrences null)", () => {
    it("gera em todos os meses elegíveis, sem limite", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ total_occurrences: null, starts_in_current_month: true })],
            []
        )

        expect(linhas.map((l) => [l.month_id, l.occurrence_number])).toEqual([
            [JAN.id, 1],
            [FEV.id, 2],
            [MAR.id, 3],
            [ABR.id, 4],
        ])
    })

    it("deixa occurrence_total nulo nas linhas geradas", () => {
        const [linha] = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ total_occurrences: null, starts_in_current_month: true })],
            []
        )

        expect(linha.occurrence_total).toBeNull()
    })

    it("continua de onde parou, sem regerar meses já lançados", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ total_occurrences: null, starts_in_current_month: true })],
            [gerada(JAN.id, 1), gerada(FEV.id, 2)]
        )

        expect(linhas.map((l) => [l.month_id, l.occurrence_number])).toEqual([
            [MAR.id, 3],
            [ABR.id, 4],
        ])
    })

    it("não gera nada quando a recorrência sem prazo está sem mês base", () => {
        const linhas = buildRecurringExpenseRowsToInsert(
            TODOS_OS_MESES,
            [plano({ total_occurrences: null, base_month_id: null })],
            []
        )

        expect(linhas).toEqual([])
    })
})
