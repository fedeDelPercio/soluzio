export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-zinc-200 rounded animate-pulse" />
          <div className="h-4 w-44 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-40 bg-zinc-200 rounded-lg animate-pulse" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 pr-6">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-4 h-4 bg-zinc-200 rounded animate-pulse flex-shrink-0" />
                <div className="h-4 w-36 bg-zinc-200 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-zinc-100 rounded-full animate-pulse flex-shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 pl-6">
              <div className="w-3 h-3 bg-zinc-100 rounded animate-pulse" />
              <div className="h-3 w-28 bg-zinc-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
