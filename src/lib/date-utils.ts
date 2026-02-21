import { format, parse, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"

export function getCurrentMonthStr() {
    return format(new Date(), "yyyy-MM", { locale: ptBR })
}

export function formatMonthStr(monthStr: string) {
    const date = parse(monthStr, "yyyy-MM", new Date())
    return format(date, "MMMM yyyy", { locale: ptBR })
}

export function getStartOfMonthFromStr(monthStr: string) {
    return parse(monthStr, "yyyy-MM", new Date())
}

export function getMonthRange(monthStr: string) {
    const date = parse(monthStr, "yyyy-MM", new Date())
    return {
        start: startOfMonth(date),
        end: endOfMonth(date),
    }
}
