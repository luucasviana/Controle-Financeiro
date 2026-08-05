import { getRecurringExpenses } from "@/app/actions/recurring-expenses"
import { RecurringExpensesClient } from "./recurring-expenses-client"
import { measureServerTiming } from "@/lib/server-timing"

export default async function RecurringExpensesPage() {
    const plans = await measureServerTiming("recorrentes-page", async () => getRecurringExpenses())

    return <RecurringExpensesClient plans={plans} />
}
