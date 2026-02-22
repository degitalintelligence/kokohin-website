export default function Loading() {
  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-4 w-36 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-md animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3 animate-pulse" />
            <div className="h-6 w-40 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-4 w-56 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-12 bg-gray-100 border-b border-gray-200 animate-pulse" />
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 grid grid-cols-12 items-center">
              <div className="col-span-3 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="col-span-3 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="col-span-2 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="col-span-2 h-8 bg-gray-200 rounded-md animate-pulse" />
              <div className="col-span-2 h-8 bg-gray-200 rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
