export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string
    description?: string
    actions?: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
                <h2 className="text-[17px] font-medium tracking-tight text-app-ink">{title}</h2>
                {description && <p className="text-app-muted">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
