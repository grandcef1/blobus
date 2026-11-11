export function DashboardSkeleton() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <div className="mb-5">
                    <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
                </div>

                <div className="space-y-5">
                    <div className="h-28 animate-pulse rounded-2xl bg-[#111113]" />

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 animate-pulse rounded-xl bg-[#141416]" />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <div className="h-96 animate-pulse rounded-2xl bg-[#111113]" />
                        <div className="h-72 animate-pulse rounded-2xl bg-[#111113]" />
                    </div>
                </div>
            </div>
        </div>
    );
}