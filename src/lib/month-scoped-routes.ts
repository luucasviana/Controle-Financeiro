const MONTH_SCOPED_ROUTES = [
    "/dashboard",
    "/dashboard/expenses",
    "/dashboard/cards",
    "/dashboard/projection",
] as const

export function isMonthScopedPath(pathname: string) {
    return MONTH_SCOPED_ROUTES.includes(pathname as (typeof MONTH_SCOPED_ROUTES)[number])
}

export function buildMonthScopedHref(pathname: string, monthId: string | null) {
    if (!monthId || !isMonthScopedPath(pathname)) {
        return pathname
    }

    return `${pathname}?monthId=${monthId}`
}
