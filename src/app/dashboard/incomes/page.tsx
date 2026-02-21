import { getIncomes } from "@/app/actions/incomes"
import { IncomesClient } from "./incomes-client"

export default async function IncomesPage() {
    const incomes = await getIncomes()
    return <IncomesClient incomes={incomes} />
}
