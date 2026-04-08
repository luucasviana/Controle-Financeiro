import { getInstallmentPlans } from "@/app/actions/installments"
import { ParcelamentosClient } from "./parcelamentos-client"
import { measureServerTiming } from "@/lib/server-timing"

export default async function ParcelamentosPage() {
    const plans = await measureServerTiming("parcelamentos-page", async () => getInstallmentPlans())

    return <ParcelamentosClient plans={plans} />
}
