"use client"

import { createContext, useContext, useEffect, useState } from "react"

type PrivacyContextType = {
    valuesHidden: boolean
    toggleValuesHidden: () => void
    setValuesHidden: (val: boolean) => void
}

const PrivacyContext = createContext<PrivacyContextType>({
    valuesHidden: true,
    toggleValuesHidden: () => { },
    setValuesHidden: () => { },
})

const STORAGE_KEY = "cf_privacy_hidden"

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    // O servidor não conhece o localStorage, então o valor inicial é sempre
    // "borrado" — igual no primeiro render do cliente, antes da hidratação.
    // Só depois de montar é que lemos a preferência salva e, se ela disser
    // para revelar, atualizamos o estado. Assim o pior caso possível é
    // "borrado por um instante e depois revela", nunca o contrário.
    const [valuesHidden, setValuesHiddenState] = useState(true)

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            // Sincroniza com o localStorage (sistema externo) só depois de montar —
            // é exatamente o padrão de hidratação segura que este provider exige.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (stored === "false") setValuesHiddenState(false)
        } catch { }
    }, [])

    const setValuesHidden = (val: boolean) => {
        setValuesHiddenState(val)
        try { localStorage.setItem(STORAGE_KEY, String(val)) } catch { }
    }

    const toggleValuesHidden = () => setValuesHidden(!valuesHidden)

    return (
        <PrivacyContext.Provider value={{ valuesHidden, toggleValuesHidden, setValuesHidden }}>
            {children}
        </PrivacyContext.Provider>
    )
}

export const usePrivacy = () => useContext(PrivacyContext)
