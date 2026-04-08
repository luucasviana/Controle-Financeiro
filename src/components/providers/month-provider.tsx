"use client"

import { createContext, startTransition, useContext, useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { isMonthScopedPath } from "@/lib/month-scoped-routes"

type MonthContextType = {
    monthId: string | null;
    setMonthId: (id: string | null) => void;
}

const MonthContext = createContext<MonthContextType>({ monthId: null, setMonthId: () => { } })

export function MonthProvider({ children, defaultMonthId }: { children: React.ReactNode, defaultMonthId: string | null }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const urlMonthId = searchParams.get("monthId")
    const isEligiblePath = isMonthScopedPath(pathname)

    const [monthId, setMonthIdState] = useState<string | null>(urlMonthId || defaultMonthId)

    useEffect(() => {
        const stored = localStorage.getItem("selectedMonthId")
        if (urlMonthId) {
            localStorage.setItem("selectedMonthId", urlMonthId)
            setMonthIdState(urlMonthId)
        } else if (isEligiblePath && stored && stored !== 'null') {
            const params = new URLSearchParams(searchParams.toString())
            params.set("monthId", stored)
            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            })
            setMonthIdState(stored)
        } else if (defaultMonthId) {
            setMonthIdState(defaultMonthId)
        }
    }, [defaultMonthId, isEligiblePath, pathname, router, searchParams, urlMonthId])

    const setMonthId = (id: string | null) => {
        setMonthIdState(id)
        if (!isEligiblePath) {
            return
        }

        if (id) {
            localStorage.setItem("selectedMonthId", id)
            const params = new URLSearchParams(searchParams.toString())
            params.set("monthId", id)
            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            })
        } else {
            localStorage.removeItem("selectedMonthId")
            const params = new URLSearchParams(searchParams.toString())
            params.delete("monthId")
            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            })
        }
    }

    return (
        <MonthContext.Provider value={{ monthId, setMonthId }}>
            {children}
        </MonthContext.Provider>
    )
}

export const useMonth = () => useContext(MonthContext)
