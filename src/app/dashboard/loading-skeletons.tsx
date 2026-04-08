import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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

export function DashboardOverviewSkeleton() {
    return (
        <div className="flex-1 space-y-6">
            <PageHeaderSkeleton />
            <div className="grid gap-4 md:grid-cols-3">
                <PanelSkeleton rows={2} />
                <PanelSkeleton rows={2} />
                <PanelSkeleton rows={2} />
            </div>
            <div className="grid gap-4 [@media(min-width:1200px)]:grid-cols-2">
                <PanelSkeleton rows={5} />
                <PanelSkeleton rows={5} />
            </div>
            <PanelSkeleton rows={6} />
        </div>
    )
}

export function ExpensesPageSkeleton() {
    return (
        <div className="flex-1 space-y-6">
            <PageHeaderSkeleton />
            <Card>
                <CardContent className="space-y-4 p-6">
                    <div className="flex items-center justify-between gap-4">
                        <Skeleton className="h-10 w-72 max-w-full" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-20 w-full" />
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
