export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-28 bg-zinc-200 rounded animate-pulse" />
        <div className="h-4 w-40 bg-zinc-100 rounded animate-pulse" />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-4 w-44 bg-zinc-200 rounded animate-pulse" />
              <div className="flex gap-3">
                <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
                <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="text-right space-y-1.5 flex-shrink-0">
              <div className="h-3 w-28 bg-zinc-100 rounded animate-pulse" />
              <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
