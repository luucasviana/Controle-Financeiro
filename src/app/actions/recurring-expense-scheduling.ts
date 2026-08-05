export type SchedulingMonth = {
    id: string
    start_date: string
}

export type RecurringExpenseRow = {
    id: string
    user_id: string
    description: string
    amount: number
    due_day: number
    /** null = recorrência sem prazo definido */
    total_occurrences: number | null
    starts_in_current_month: boolean
    is_active: boolean
    is_archived: boolean
    base_month_id: string | null
    created_at: string
}

export type GeneratedOccurrenceRow = {
    month_id: string
    recurring_expense_id: string | null
    occurrence_number: number | null
}

export type RecurringExpenseInsert = {
    user_id: string
    month_id: string
    due_date: string
    description: string
    amount: number
    status: "PLANNED"
    payment_method: "NONE"
    recurring_expense_id: string
    occurrence_number: number
    occurrence_total: number | null
}

export function getMonthDueDate(month: SchedulingMonth, dueDay: number) {
    const start = new Date(`${month.start_date}T00:00:00`)
    const year = start.getFullYear()
    const monthIndex = start.getMonth() + 1
    const daysInMonth = new Date(year, monthIndex, 0).getDate()
    const adjustedDay = Math.min(Math.max(dueDay, 1), daysInMonth)

    return `${year}-${String(monthIndex).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`
}

export function buildRecurringExpenseRowsToInsert(
    months: SchedulingMonth[],
    plans: RecurringExpenseRow[],
    existingOccurrences: GeneratedOccurrenceRow[]
) {
    const monthById = new Map(months.map((month) => [month.id, month]))
    const existingByPlan = new Map<string, GeneratedOccurrenceRow[]>()

    for (const expense of existingOccurrences) {
        if (!expense.recurring_expense_id) continue

        const current = existingByPlan.get(expense.recurring_expense_id) || []
        current.push(expense)
        existingByPlan.set(expense.recurring_expense_id, current)
    }

    const insertRows: RecurringExpenseInsert[] = []

    for (const plan of plans) {
        const baseMonth = plan.base_month_id ? monthById.get(plan.base_month_id) || null : null
        if (!baseMonth) continue

        const eligibleMonths = months.filter((month) => {
            if (plan.starts_in_current_month) {
                return month.start_date >= baseMonth.start_date
            }

            return month.start_date > baseMonth.start_date
        })

        if (eligibleMonths.length === 0) continue

        const planExpenses = existingByPlan.get(plan.id) || []
        const existingMonthIds = new Set(planExpenses.map((expense) => expense.month_id))
        const highestExistingNumber = planExpenses.reduce((max, expense) => {
            const occurrenceNumber = expense.occurrence_number || 0
            return occurrenceNumber > max ? occurrenceNumber : max
        }, 0)

        let nextOccurrenceNumber = highestExistingNumber + 1
        let lastGeneratedMonthStart: string | null = null

        for (const expense of planExpenses) {
            const expenseMonth = monthById.get(expense.month_id)
            if (!expenseMonth) continue

            if (!lastGeneratedMonthStart || expenseMonth.start_date > lastGeneratedMonthStart) {
                lastGeneratedMonthStart = expenseMonth.start_date
            }
        }

        for (const month of eligibleMonths) {
            if (existingMonthIds.has(month.id)) continue

            if (lastGeneratedMonthStart && month.start_date <= lastGeneratedMonthStart) {
                continue
            }

            if (plan.total_occurrences !== null && nextOccurrenceNumber > plan.total_occurrences) {
                break
            }

            insertRows.push({
                user_id: plan.user_id,
                month_id: month.id,
                due_date: getMonthDueDate(month, plan.due_day),
                description: plan.description,
                amount: plan.amount,
                status: "PLANNED",
                payment_method: "NONE",
                recurring_expense_id: plan.id,
                occurrence_number: nextOccurrenceNumber,
                occurrence_total: plan.total_occurrences,
            })

            existingMonthIds.add(month.id)
            lastGeneratedMonthStart = month.start_date
            nextOccurrenceNumber += 1
        }
    }

    return insertRows
}
