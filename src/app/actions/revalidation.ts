import { revalidatePath } from "next/cache"

export function revalidateDashboardData() {
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard/parcelamentos")
    revalidatePath("/dashboard/cards")
    revalidatePath("/dashboard/projection")
}

export function revalidateDashboardShell() {
    revalidateDashboardData()
    revalidatePath("/dashboard/months")
}
