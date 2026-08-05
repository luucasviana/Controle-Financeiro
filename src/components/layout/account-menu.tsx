"use client"

import Link from "next/link"
import { signout } from "@/app/auth/actions"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarDays, LogOut, Settings, Wallet } from "lucide-react"

export function AccountMenu({ initials = "LK" }: { initials?: string }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Conta"
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-app-border bg-app-hairline text-[11px] font-bold text-app-muted transition-colors hover:border-app-muted"
                >
                    {initials}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4 text-app-muted" />
                        Configurações
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/months">
                        <CalendarDays className="mr-2 h-4 w-4 text-app-muted" />
                        Períodos
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/incomes">
                        <Wallet className="mr-2 h-4 w-4 text-app-muted" />
                        Fontes de Receita
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <form action={signout}>
                        <button type="submit" className="flex w-full items-center text-app-neg">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </button>
                    </form>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
