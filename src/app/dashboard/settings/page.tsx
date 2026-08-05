"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Surface } from "@/components/ui/surface"
import { Tag } from "@/components/ui/tag"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Trash2 } from "lucide-react"
import { clearAllUserData } from "@/app/actions/settings"
import { toast } from "sonner"

const CONFIRM_PHRASE = "APAGAR TUDO"

export default function SettingsPage() {
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleClearData() {
        if (confirmText !== CONFIRM_PHRASE) {
            toast.error(`Você precisa digitar ${CONFIRM_PHRASE} para confirmar.`)
            return
        }

        setLoading(true)
        try {
            await clearAllUserData()
            toast.success("Todos os seus dados foram apagados.")
            setConfirmText("")
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Não foi possível apagar os dados.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
            <PageHeader
                title="Configurações"
                description="Gerencie sua conta e preferências do Lastro."
            />

            <Surface className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-app-accent" />
                    <h3 className="text-[15px] font-medium text-app-ink">Zona de risco</h3>
                    <Tag tone="warn">Irreversível</Tag>
                </div>

                <p className="text-app-muted">
                    Esta ação apaga completamente todos os seus dados financeiros — despesas, receitas,
                    cartões, períodos e transações. Não pode ser desfeita. Recomendada apenas durante o
                    desenvolvimento e testes do app.
                </p>

                <div className="rounded-card border border-app-warn-border bg-app-warn-bg p-4 space-y-3">
                    <div>
                        <Label htmlFor="confirm-clear-data" className="text-app-ink font-medium">
                            Para confirmar, digite {CONFIRM_PHRASE} na caixa abaixo
                        </Label>
                        <p className="text-app-faint text-[13px] mt-1">
                            Isso remove seus dados permanentemente do banco de dados.
                        </p>
                    </div>

                    <div className="flex max-w-sm items-center gap-2">
                        <Input
                            id="confirm-clear-data"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={CONFIRM_PHRASE}
                            className="border-app-border bg-app-surface text-app-ink"
                        />
                    </div>

                    <Button
                        variant="outline"
                        className="border-app-accent text-app-accent hover:bg-app-accent/12"
                        disabled={loading || confirmText !== CONFIRM_PHRASE}
                        onClick={handleClearData}
                    >
                        <Trash2 className="h-4 w-4" />
                        Limpar meu banco de dados
                    </Button>
                </div>
            </Surface>
        </div>
    )
}
