'use client';

/**
 * FloodGuard — Reusable skeleton loaders for dashboard pages.
 * Use these instead of spinners for a premium loading experience.
 */

function SkeletonBox({ className = '' }: { className?: string }) {
    return (
        <div className={`bg-slate-800/60 rounded-lg animate-pulse ${className}`} />
    );
}

/** Full-page skeleton for admin/overview dashboards with metric cards + charts */
export function AdminDashboardSkeleton() {
    return (
        <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div className="space-y-2">
                    <SkeletonBox className="h-9 w-72" />
                    <SkeletonBox className="h-4 w-48" />
                </div>
                <SkeletonBox className="h-8 w-24 rounded-full" />
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
                        <SkeletonBox className="h-5 w-5 rounded-full" />
                        <SkeletonBox className="h-8 w-20" />
                        <SkeletonBox className="h-3 w-28" />
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-6 space-y-4">
                        <SkeletonBox className="h-5 w-48" />
                        <SkeletonBox className="h-3 w-32" />
                        <SkeletonBox className="h-56 w-full rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Table / list */}
            <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-6 space-y-4">
                <SkeletonBox className="h-5 w-40" />
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <SkeletonBox className="h-4 w-4 flex-shrink-0 rounded-full" />
                        <SkeletonBox className="h-3 flex-1" />
                        <SkeletonBox className="h-3 w-20" />
                        <SkeletonBox className="h-3 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Skeleton for list/table pages (broadcasts, alerts, delivery-reports, etc.) */
export function TablePageSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="space-y-2">
                    <SkeletonBox className="h-9 w-64" />
                    <SkeletonBox className="h-4 w-44" />
                </div>
                <SkeletonBox className="h-9 w-28 rounded-lg" />
            </div>

            {/* Table card */}
            <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 overflow-hidden">
                {/* Table header */}
                <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                    {[60, 100, 80, 60, 80].map((w, i) => (
                        <SkeletonBox key={i} className={`h-3 w-${w === 60 ? '16' : w === 80 ? '20' : '24'} flex-shrink-0`} />
                    ))}
                </div>
                {/* Rows */}
                {[...Array(rows)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-800/40">
                        <SkeletonBox className="h-8 w-8 rounded-full flex-shrink-0" />
                        <SkeletonBox className="h-3 flex-1" />
                        <SkeletonBox className="h-5 w-16 rounded-full" />
                        <SkeletonBox className="h-3 w-20" />
                        <SkeletonBox className="h-7 w-16 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Skeleton for disaster manager dashboard */
export function DisasterManagerDashboardSkeleton() {
    return (
        <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 overflow-auto">
            <div className="mb-8 flex items-center justify-between">
                <div className="space-y-2">
                    <SkeletonBox className="h-9 w-40" />
                    <SkeletonBox className="h-4 w-52" />
                </div>
                <SkeletonBox className="h-8 w-32 rounded-full" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-3">
                        <SkeletonBox className="h-5 w-5 rounded-full" />
                        <SkeletonBox className="h-8 w-16" />
                        <SkeletonBox className="h-3 w-28" />
                    </div>
                ))}
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-6 space-y-4">
                        <SkeletonBox className="h-5 w-40" />
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <SkeletonBox className="h-10 w-10 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <SkeletonBox className="h-3 w-3/4" />
                                    <SkeletonBox className="h-2.5 w-1/2" />
                                </div>
                                <SkeletonBox className="h-8 w-20 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-6 space-y-4">
                        <SkeletonBox className="h-5 w-32" />
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <SkeletonBox className="h-6 w-6 rounded-full flex-shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-1.5">
                                    <SkeletonBox className="h-3 w-full" />
                                    <SkeletonBox className="h-2.5 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Generic card-grid skeleton for simpler pages */
export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
    return (
        <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 overflow-auto">
            <div className="mb-8 flex items-center justify-between">
                <div className="space-y-2">
                    <SkeletonBox className="h-9 w-60" />
                    <SkeletonBox className="h-4 w-40" />
                </div>
                <SkeletonBox className="h-9 w-28 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(cards)].map((_, i) => (
                    <div key={i} className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <SkeletonBox className="h-5 w-36" />
                                <SkeletonBox className="h-5 w-16 rounded-full" />
                            </div>
                            <SkeletonBox className="h-5 w-16 rounded-full" />
                        </div>
                        <SkeletonBox className="h-20 w-full rounded-lg" />
                        <div className="flex items-center justify-between">
                            <SkeletonBox className="h-3 w-14" />
                            <SkeletonBox className="h-3 w-24" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <SkeletonBox className="h-8 rounded-lg" />
                            <SkeletonBox className="h-8 rounded-lg" />
                            <SkeletonBox className="h-8 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

