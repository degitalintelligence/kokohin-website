export default function AdminSurveysLoading() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/50">
      <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 w-full bg-gray-50 border border-dashed border-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-9 w-full bg-gray-50 rounded-lg animate-pulse" />
            ))}
            <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mb-4" />
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-10 w-full bg-gray-50 rounded mb-2 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

