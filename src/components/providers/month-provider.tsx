"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

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

    const [monthId, setMonthIdState] = useState<string | null>(urlMonthId || defaultMonthId)

    useEffect(() => {
        const stored = localStorage.getItem("selectedMonthId")
        if (urlMonthId) {
            localStorage.setItem("selectedMonthId", urlMonthId)
            setMonthIdState(urlMonthId)
        } else if (stored && stored !== 'null') {
            const params = new URLSearchParams(searchParams.toString())
            params.set("monthId", stored)
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            setMonthIdState(stored)
        } else if (defaultMonthId) {
            setMonthIdState(defaultMonthId)
        }
    }, [urlMonthId, pathname, searchParams, router, defaultMonthId])

    const setMonthId = (id: string | null) => {
        setMonthIdState(id)
        if (id) {
            localStorage.setItem("selectedMonthId", id)
            const params = new URLSearchParams(searchParams.toString())
            params.set("monthId", id)
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        } else {
            localStorage.removeItem("selectedMonthId")
            const params = new URLSearchParams(searchParams.toString())
            params.delete("monthId")
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }

    return (
        <MonthContext.Provider value={{ monthId, setMonthId }}>
            {children}
        </MonthContext.Provider>
    )
}

export const useMonth = () => useContext(MonthContext)
