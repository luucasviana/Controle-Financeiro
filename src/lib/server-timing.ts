export async function measureServerTiming<T>(
    label: string,
    fn: () => Promise<T>
) {
    const start = performance.now()

    try {
        return await fn()
    } finally {
        if (process.env.NODE_ENV === "development") {
            const duration = (performance.now() - start).toFixed(1)
            console.log(`[perf] ${label}: ${duration}ms`)
        }
    }
}
