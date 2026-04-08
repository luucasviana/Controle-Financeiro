"use client"

import { MobileSidebar } from "./mobile-sidebar"
import { usePathname } from "next/navigation"
import { useMonth } from "../providers/month-provider"
import { useHiddenMode } from "../providers/hidden-mode-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MonthData } from "@/app/actions/months"
import { EyeOff } from "lucide-react"
import { HiddenModeShortcut } from "@/components/hidden-mode-shortcut"
import { isMonthScopedPath } from "@/lib/month-scoped-routes"

export function Header({ months }: { months: MonthData[] }) {
    const pathname = usePathname()
    const { monthId, setMonthId } = useMonth()
    const { hiddenModeEnabled } = useHiddenMode()

    const isEligible = isMonthScopedPath(pathname)

    return (
        <header className="sticky top-0 z-10 bg-white shadow-sm flex items-center justify-between p-4 min-h-[64px] border-b border-gray-100">
            {/* Register global keyboard shortcut */}
            <HiddenModeShortcut />

            <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <MobileSidebar />
                </div>
                <h1 className="text-xl font-bold md:hidden">Controle</h1>
            </div>

            <div className="flex items-center gap-3 ml-auto">
                {hiddenModeEnabled && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-slate-800 text-white hover:bg-slate-700">
                        <EyeOff className="h-3 w-3" />
                        Modo oculto
                    </Badge>
                )}

                {isEligible && months && months.length > 0 && (
                    <Select
                        value={monthId || ""}
                        onValueChange={(val) => setMonthId(val)}
                    >
                        <SelectTrigger className="w-[180px] md:w-[200px] bg-white text-black font-semibold shadow-xs border-gray-200">
                            <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => (
                                <SelectItem key={m.id} value={m.id} className="capitalize flex justify-between">
                                    <span>{m.name}</span>
                                    {m.status === 'OPEN' ? <Badge className="ml-2 bg-green-500 scale-75">Aberto</Badge> : <Badge variant="secondary" className="ml-2 scale-75">Fechado</Badge>}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </header>
    )
}
