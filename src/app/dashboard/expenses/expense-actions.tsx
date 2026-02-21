"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2, Copy, Calculator } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ExpenseDialog } from "./expense-dialog"
import { deleteMonthExpense, updateMonthExpense } from "@/app/actions/finance"
import { getCards } from "@/app/actions/cards"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Expense } from "./columns"
import { format } from "date-fns"
import { useHiddenMode } from "@/components/providers/hidden-mode-provider"

export function ExpenseActions({ expense }: { expense: Expense }) {
    const [openEdit, setOpenEdit] = useState(false)
    const [openDuplicate, setOpenDuplicate] = useState(false)
    const [loading, setLoading] = useState(false)
    const [cards, setCards] = useState<any[]>([])
    const { hiddenModeEnabled } = useHiddenMode()

    const [status, setStatus] = useState<'PLANNED' | 'PAID'>(expense.status)
    const [paymentMethod, setPaymentMethod] = useState<string>(expense.payment_method || 'NONE')
    const [paidAt, setPaidAt] = useState<string>(
        expense.paid_at ? format(new Date(expense.paid_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
    )
    const [isExcluded, setIsExcluded] = useState<boolean>(!!expense.is_excluded)

    function handleStatusChange(newStatus: 'PLANNED' | 'PAID') {
        setStatus(newStatus)
        if (newStatus === 'PLANNED') {
            setPaymentMethod('NONE')
            setPaidAt("")
        } else {
            setPaymentMethod('')
            setPaidAt(expense.paid_at ? format(new Date(expense.paid_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"))
        }
    }

    useEffect(() => {
        if (openEdit) {
            getCards().then(setCards)
        }
    }, [openEdit])

    async function handleDelete() {
        if (confirm("Deseja realmente excluir esta despesa?")) {
            try {
                await deleteMonthExpense(expense.id)
                toast.success("Despesa excluída com sucesso!")
            } catch (e: any) {
                toast.error(e.message)
            }
        }
    }

    async function onEdit(formData: FormData) {
        setLoading(true)
        formData.append("expense_id", expense.id)
        formData.append("status", status)
        formData.append("payment_method", paymentMethod)
        if (status === 'PAID' && paidAt) {
            formData.append("paid_at", new Date(paidAt).toISOString())
        }
        // Pass hidden mode — server only updates is_excluded when hidden_mode_enabled=true
        formData.append("hidden_mode_enabled", String(hiddenModeEnabled))
        if (hiddenModeEnabled) {
            formData.append("is_excluded", String(isExcluded))
        }

        try {
            await updateMonthExpense(formData)
            if (status === 'PAID' && paymentMethod === 'CREDIT_CARD') {
                toast.success("Despesa atualizada! Este item não será somado nas despesas do mês, pois será considerado no Valor atual do cartão. Atualize o cartão na aba Cartões.", { duration: 6000 })
            } else {
                toast.success("Despesa atualizada com sucesso!")
            }
            setOpenEdit(false)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                        <Edit className="mr-2 h-4 w-4 text-blue-500" />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenDuplicate(true)}>
                        <Copy className="mr-2 h-4 w-4 text-emerald-500" />
                        Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Despesa</DialogTitle>
                    </DialogHeader>
                    <form action={onEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange('PLANNED')}
                                    className={`flex-1 text-sm py-1.5 rounded-md transition-all ${status === 'PLANNED' ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Prevista
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange('PAID')}
                                    className={`flex-1 text-sm py-1.5 rounded-md transition-all ${status === 'PAID' ? 'bg-white shadow-sm font-medium text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Paga
                                </button>
                            </div>
                        </div>

                        {status === 'PAID' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="payment_method">Método de Pagamento</Label>
                                    <Select required value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PIX">Pix</SelectItem>
                                            <SelectItem value="DEBIT">Cartão de Débito</SelectItem>
                                            <SelectItem value="CASH">Dinheiro / À Vista</SelectItem>
                                            <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="paid_at">Pago em</Label>
                                    <Input id="paid_at" type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                                </div>

                                {paymentMethod === 'CREDIT_CARD' && (
                                    <div className="space-y-2 flex flex-col">
                                        <Label htmlFor="card_id">Cartão</Label>
                                        <Select name="card_id" required defaultValue={expense.card_id || undefined}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o cartão..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {cards.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </>
                        )}

                        <Button type="submit" disabled={loading} className="w-full mt-4">Salvar Alterações</Button>

                        {hiddenModeEnabled && (
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isExcluded}
                                    onClick={() => setIsExcluded(v => !v)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isExcluded ? 'bg-slate-700' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isExcluded ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <Calculator className="h-4 w-4 text-slate-500" />
                                    <div>
                                        <Label className="cursor-pointer text-sm font-medium text-slate-700">Fora do cálculo</Label>
                                        <p className="text-[11px] text-slate-500">Aparece na lista, mas não entra nos totais.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </DialogContent>
            </Dialog>

            <ExpenseDialog
                mode="duplicate"
                expense={expense}
                open={openDuplicate}
                onOpenChange={setOpenDuplicate}
            />
        </>
    )
}
