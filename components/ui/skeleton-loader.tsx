/**
 * Skeleton Loader — reusable across all dashboard pages
 * Shown while page data is loading (page transitions in sidebar)
 */

export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse ${className}`}>
            <div className="h-4 bg-slate-700/60 rounded w-1/3 mb-4" />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className={`h-3 bg-slate-700/40 rounded mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden animate-pulse">
            {/* Header */}
            <div className="flex gap-4 px-6 py-4 border-b border-slate-800 bg-slate-800/30">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-3 bg-slate-700/60 rounded flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 px-6 py-4 border-b border-slate-800/50">
                    {Array.from({ length: cols }).map((_, c) => (
                        <div key={c} className={`h-3 bg-slate-700/30 rounded flex-1 ${c === 0 ? 'bg-slate-700/50' : ''}`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
    return (
        <div className={`grid grid-cols-2 md:grid-cols-${count} gap-6`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-4 bg-slate-700/60 rounded w-2/3" />
                        <div className="h-8 w-8 bg-slate-700/40 rounded-lg" />
                    </div>
                    <div className="h-8 bg-slate-700/60 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-slate-700/30 rounded w-3/4" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 bg-slate-700/50 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                            <div className="h-4 bg-slate-700/60 rounded w-1/3 mb-3" />
                            <div className="h-3 bg-slate-700/40 rounded w-full mb-2" />
                            <div className="h-3 bg-slate-700/30 rounded w-2/3" />
                        </div>
                        <div className="h-6 w-20 bg-slate-700/40 rounded-full flex-shrink-0" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Full page skeleton for initial dashboard load */
export function DashboardSkeleton() {
    return (
        <div className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            {/* Header */}
            <div className="mb-8 animate-pulse">
                <div className="h-10 bg-slate-700/50 rounded-lg w-48 mb-3" />
                <div className="h-4 bg-slate-700/30 rounded w-72" />
            </div>
            <SkeletonStats count={4} />
            <div className="mt-8">
                <SkeletonTable rows={5} cols={5} />
            </div>
        </div>
    );
}
