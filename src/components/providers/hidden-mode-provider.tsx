"use client"

import { createContext, useContext, useEffect, useState } from "react"

type HiddenModeContextType = {
    hiddenModeEnabled: boolean
    toggleHiddenMode: () => void
    setHiddenMode: (val: boolean) => void
}

const HiddenModeContext = createContext<HiddenModeContextType>({
    hiddenModeEnabled: false,
    toggleHiddenMode: () => { },
    setHiddenMode: () => { },
})

const STORAGE_KEY = "cf_hidden_mode"

export function HiddenModeProvider({ children }: { children: React.ReactNode }) {
    const [hiddenModeEnabled, setHiddenModeEnabled] = useState(false)

    // Load from localStorage on mount (client only)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored === "true") setHiddenModeEnabled(true)
        } catch { }
    }, [])

    const setHiddenMode = (val: boolean) => {
        setHiddenModeEnabled(val)
        try { localStorage.setItem(STORAGE_KEY, String(val)) } catch { }
    }

    const toggleHiddenMode = () => setHiddenMode(!hiddenModeEnabled)

    return (
        <HiddenModeContext.Provider value={{ hiddenModeEnabled, toggleHiddenMode, setHiddenMode }}>
            {children}
        </HiddenModeContext.Provider>
    )
}

export const useHiddenMode = () => useContext(HiddenModeContext)
