"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Trash2 } from "lucide-react"
import { clearAllUserData } from "@/app/actions/settings"
import { toast } from "sonner"

export default function SettingsPage() {
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleClearData() {
        if (confirmText !== "APAGAR TUDO") {
            toast.error("Você precisa digitar APAGAR TUDO para confirmar.")
            return
        }

        setLoading(true)
        try {
            await clearAllUserData()
            toast.success("Todos os seus dados foram apagados.")
            setConfirmText("")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                <p className="text-muted-foreground">Gerencie sua conta e preferências do Controle Financeiro.</p>
            </div>

            <Card className="border-red-200 shadow-sm bg-red-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center text-red-600 gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Zona de Perigo (Avançado)
                    </CardTitle>
                    <CardDescription>
                        Esta ação irá limpar completamente TODOS os seus dados financeiros (Despesas, Receitas, Cartões, Meses, Transações).
                        Esta ação NÃO pode ser desfeita. Recomendada apenas durante o período de desenvolvimento e testes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-red-100 p-4 rounded-md border border-red-300">
                        <p className="text-sm text-red-800 font-medium mb-2">Para confirmar, digite APAGAR TUDO na caixa abaixo:</p>
                        <div className="flex max-w-sm items-center space-x-2">
                            <Input
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="APAGAR TUDO"
                                className="border-red-300 focus-visible:ring-red-500"
                            />
                        </div>
                        <Button
                            variant="destructive"
                            className="mt-4"
                            disabled={loading || confirmText !== "APAGAR TUDO"}
                            onClick={handleClearData}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Limpar Meu Banco de Dados
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
