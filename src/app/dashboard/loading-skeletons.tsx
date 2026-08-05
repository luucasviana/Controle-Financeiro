import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Surface } from "@/components/ui/surface"

function PageHeaderSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
        </div>
    )
}

function PanelSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <Card>
            <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
                {Array.from({ length: rows }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                ))}
            </CardContent>
        </Card>
    )
}

function OverviewCardSkeleton({ rows = 4, tall = false }: { rows?: number; tall?: boolean }) {
    return (
        <Surface className={tall ? "p-6" : "p-4"}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-56 max-w-full" />
            <div className="mt-4 space-y-3">
                {Array.from({ length: rows }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                ))}
            </div>
        </Surface>
    )
}

export function DashboardOverviewSkeleton() {
    return (
        <div className="flex-1 space-y-6">
            <PageHeaderSkeleton />

            <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Surface key={index} className="px-5 py-4">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="mt-3 h-7 w-32" />
                    </Surface>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)_336px]">
                <div className="flex flex-col gap-4">
                    <OverviewCardSkeleton rows={3} tall />
                    <OverviewCardSkeleton rows={2} tall />
                    <OverviewCardSkeleton rows={3} tall />
                </div>
                <div className="flex flex-col gap-4">
                    <OverviewCardSkeleton rows={4} tall />
                    <OverviewCardSkeleton rows={6} tall />
                </div>
                <div className="flex flex-col gap-4">
                    <OverviewCardSkeleton rows={4} tall />
                    <OverviewCardSkeleton rows={3} tall />
                </div>
            </div>
        </div>
    )
}

export function ExpensesPageSkeleton() {
    return (
        <div className="flex-1 space-y-6">
            <PageHeaderSkeleton />

            <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                    <Surface key={index} className="px-5 py-4">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="mt-3 h-7 w-32" />
                    </Surface>
                ))}
            </div>

            <Card>
                <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between gap-4">
                        <Skeleton className="h-10 w-72 max-w-full" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                    {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

export function ProjectionPageSkeleton() {
    return (
        <div className="flex-1 space-y-6">
            <PageHeaderSkeleton />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <PanelSkeleton key={index} rows={3} />
                ))}
            </div>
        </div>
    )
}

export function CardsPageSkeleton() {
    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <PageHeaderSkeleton />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-28" />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <PanelSkeleton key={index} rows={3} />
                ))}
            </div>
        </div>
    )
}
