import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function sortExpenses(expenses: any[]) {
  return [...expenses].sort((a, b) => {
    // 1. Status: 'PLANNED' antes de 'PAID'
    if (a.status !== b.status) {
      return a.status === 'PLANNED' ? -1 : 1
    }

    // 2. Valor: maior -> menor (DESC)
    if (a.amount !== b.amount) {
      return b.amount - a.amount
    }

    // 3. Desempate: datas
    if (a.status === 'PLANNED') {
      // Previstas: due_date ASC
      const dateA = new Date(a.due_date || 0).getTime()
      const dateB = new Date(b.due_date || 0).getTime()
      if (dateA !== dateB) return dateA - dateB
    } else {
      // Pagas: paid_at DESC (ou due_date DESC como fallback)
      const dateA = new Date(a.paid_at || a.due_date || 0).getTime()
      const dateB = new Date(b.paid_at || b.due_date || 0).getTime()
      if (dateA !== dateB) return dateB - dateA
    }

    // 4. Último fallback: created_at DESC
    const createdA = new Date(a.created_at || 0).getTime()
    const createdB = new Date(b.created_at || 0).getTime()
    return createdB - createdA
  })
}
