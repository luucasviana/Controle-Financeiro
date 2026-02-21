"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "defaultValue"> {
    name: string
    defaultValue?: string | number
    onValueChange?: (value: number) => void
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ name, defaultValue, className, onValueChange, required, ...props }, ref) => {
        const [displayValue, setDisplayValue] = React.useState("")
        const [rawValue, setRawValue] = React.useState<number | "">("")

        React.useEffect(() => {
            if (defaultValue !== undefined && defaultValue !== "") {
                const parsed = typeof defaultValue === "string" ? parseFloat(defaultValue) : defaultValue
                if (!isNaN(parsed)) {
                    setRawValue(parsed)
                    setDisplayValue(formatCurrencyDisplay(parsed))
                }
            }
        }, [defaultValue])

        const formatCurrencyDisplay = (num: number) => {
            return new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
            }).format(num)
        }

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value.replace(/\D/g, "")

            if (!raw) {
                setDisplayValue("")
                setRawValue("")
                if (onValueChange) onValueChange(0)
                return
            }

            const numericValue = parseInt(raw, 10) / 100

            setRawValue(numericValue)
            setDisplayValue(formatCurrencyDisplay(numericValue))
            if (onValueChange) onValueChange(numericValue)
        }

        return (
            <>
                <Input
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleChange}
                    className={className}
                    ref={ref}
                    required={required && rawValue === ""}
                    {...props}
                />
                <input type="hidden" name={name} value={rawValue} />
            </>
        )
    }
)
CurrencyInput.displayName = "CurrencyInput"
