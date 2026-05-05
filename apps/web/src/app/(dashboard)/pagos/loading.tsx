export default function Loading() {
  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-20 bg-zinc-200 rounded animate-pulse" />
          <div className="h-4 w-44 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-zinc-200 rounded-lg animate-pulse" />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-4 w-56 bg-zinc-200 rounded animate-pulse" />
              <div className="h-3 w-36 bg-zinc-100 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse hidden sm:block" />
              <div className="h-5 w-20 bg-zinc-100 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
