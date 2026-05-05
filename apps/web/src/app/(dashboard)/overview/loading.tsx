export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      {/* Greeting */}
      <div className="space-y-2">
        <div className="h-6 w-52 bg-zinc-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-zinc-100 rounded animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-zinc-100 rounded animate-pulse" />
              <div className="h-4 w-4 bg-zinc-100 rounded animate-pulse" />
            </div>
            <div className="h-8 w-12 bg-zinc-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Comprobantes por verificar */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="h-4 w-48 bg-zinc-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-4 w-36 bg-zinc-200 rounded animate-pulse" />
              <div className="h-3 w-28 bg-zinc-100 rounded animate-pulse" />
            </div>
            <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
