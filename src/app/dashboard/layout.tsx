import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MonthProvider } from "@/components/providers/month-provider"
import { HiddenModeProvider } from "@/components/providers/hidden-mode-provider"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getOpenMonthOrLatest, getMonths } from "@/app/actions/months"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const defaultMonth = await getOpenMonthOrLatest()
    const months = await getMonths()

    return (
        <HiddenModeProvider>
            <MonthProvider defaultMonthId={defaultMonth?.id || null}>
                <div className="h-full relative">
                    <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-10 bg-gray-900">
                        <Sidebar />
                    </div>
                    <main className="md:pl-72 flex flex-col h-full bg-slate-50 min-h-screen">
                        <Header months={months} />
                        <div className="p-4 md:p-8 flex-1">
                            {children}
                        </div>
                    </main>
                </div>
            </MonthProvider>
        </HiddenModeProvider>
    )
}
