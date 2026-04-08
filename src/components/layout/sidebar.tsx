"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useMonth } from "@/components/providers/month-provider"
import { buildMonthScopedHref } from "@/lib/month-scoped-routes"
import {
    BarChart3,
    CreditCard,
    LayoutDashboard,
    LogOut,
    PieChart,
    Receipt,
    Settings,
    Wallet,
    Calendar
} from "lucide-react"

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
    },
    {
        label: "Despesas",
        icon: Receipt,
        href: "/dashboard/expenses",
    },
    {
        label: "Cartões",
        icon: CreditCard,
        href: "/dashboard/cards",
    },
    {
        label: "Receitas",
        icon: Wallet,
        href: "/dashboard/incomes",
    },
    {
        label: "Projeção",
        icon: BarChart3,
        href: "/dashboard/projection",
    },
    {
        label: "Meses",
        icon: Calendar,
        href: "/dashboard/months",
    },
    {
        label: "Configurações",
        icon: Settings,
        href: "/dashboard/settings",
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const { monthId } = useMonth()

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <PieChart className="h-8 w-8 text-blue-500 mr-2" />
                    <h1 className="text-2xl font-bold">Controle</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => {
                        const isActive = route.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname === route.href || pathname.startsWith(route.href + '/');

                        return (
                            <Link
                                key={route.href}
                                href={buildMonthScopedHref(route.href, monthId)}
                                className={cn(
                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                    isActive
                                        ? "text-white bg-white/10"
                                        : "text-zinc-400"
                                )}
                            >
                                <div className="flex items-center flex-1">
                                    <route.icon className={cn("h-5 w-5 mr-3", isActive ? "text-blue-500" : "")} />
                                    {route.label}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
            <div className="px-3 py-2">
                <form action="/auth/signout" method="post">
                    <button type="submit" className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400">
                        <div className="flex items-center flex-1">
                            <LogOut className="h-5 w-5 mr-3" />
                            Sair
                        </div>
                    </button>
                </form>
            </div>
        </div>
    )
}
