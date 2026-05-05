export default function Loading() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse" />
          <div className="h-6 w-56 bg-zinc-200 rounded animate-pulse" />
          <div className="h-4 w-36 bg-zinc-100 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-zinc-100 rounded-full animate-pulse" />
      </div>

      {/* Datos económicos */}
      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
            <div className="h-4 w-40 bg-zinc-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Partes */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100">
          <div className="h-4 w-16 bg-zinc-200 rounded animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-zinc-200 animate-pulse flex-shrink-0" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-zinc-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Documentos */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
          <div className="h-4 w-4 bg-zinc-200 rounded animate-pulse" />
          <div className="h-4 w-28 bg-zinc-200 rounded animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="h-4 w-44 bg-zinc-200 rounded animate-pulse" />
            <div className="h-5 w-20 bg-zinc-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Pagos */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-16 bg-zinc-200 rounded animate-pulse" />
            <div className="h-3 w-28 bg-zinc-100 rounded animate-pulse" />
          </div>
          <div className="h-1.5 w-28 bg-zinc-100 rounded-full animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-zinc-100 rounded-md p-3 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-zinc-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
            </div>
            <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
