export type SchedulingMonth = {
    id: string
    start_date: string
}

export type InstallmentPlanRow = {
    id: string
    user_id: string
    description: string
    amount: number
    due_day: number
    total_installments: number
    starts_in_current_month: boolean
    is_active: boolean
    is_archived: boolean
    base_month_id: string | null
    created_at: string
}

export type InstallmentExpenseRow = {
    month_id: string
    installment_plan_id: string | null
    installment_number: number | null
}

export type InstallmentExpenseInsert = {
    user_id: string
    month_id: string
    due_date: string
    description: string
    amount: number
    status: "PLANNED"
    payment_method: "NONE"
    installment_plan_id: string
    installment_number: number
    installment_total: number
}

export function getMonthDueDate(month: SchedulingMonth, dueDay: number) {
    const start = new Date(`${month.start_date}T00:00:00`)
    const year = start.getFullYear()
    const monthIndex = start.getMonth() + 1
    const daysInMonth = new Date(year, monthIndex, 0).getDate()
    const adjustedDay = Math.min(Math.max(dueDay, 1), daysInMonth)

    return `${year}-${String(monthIndex).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`
}

export function buildInstallmentRowsToInsert(
    months: SchedulingMonth[],
    plans: InstallmentPlanRow[],
    existingInstallments: InstallmentExpenseRow[]
) {
    const monthById = new Map(months.map((month) => [month.id, month]))
    const existingByPlan = new Map<string, InstallmentExpenseRow[]>()

    for (const expense of existingInstallments) {
        if (!expense.installment_plan_id) continue

        const current = existingByPlan.get(expense.installment_plan_id) || []
        current.push(expense)
        existingByPlan.set(expense.installment_plan_id, current)
    }

    const insertRows: InstallmentExpenseInsert[] = []

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
            const installmentNumber = expense.installment_number || 0
            return installmentNumber > max ? installmentNumber : max
        }, 0)

        let nextInstallmentNumber = highestExistingNumber + 1
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

            if (nextInstallmentNumber > plan.total_installments) {
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
                installment_plan_id: plan.id,
                installment_number: nextInstallmentNumber,
                installment_total: plan.total_installments,
            })

            existingMonthIds.add(month.id)
            lastGeneratedMonthStart = month.start_date
            nextInstallmentNumber += 1
        }
    }

    return insertRows
}
