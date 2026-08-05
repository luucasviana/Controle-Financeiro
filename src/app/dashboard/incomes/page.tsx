import { getIncomeSources } from "@/app/actions/income-sources"
import { IncomeSourcesClient } from "./incomes-client"

export default async function IncomeSourcesPage() {
    const sources = await getIncomeSources()
    return <IncomeSourcesClient sources={sources} />
}
