export default function Loading() {
  return (
    <div className="min-h-[60vh] bg-white">
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gray-50 text-primary-dark">
        <div className="container">
          <div className="h-8 w-48 bg-gray-200 rounded-full mb-6 animate-pulse" />
          <div className="h-12 md:h-16 bg-gray-200 rounded-lg max-w-3xl mb-4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-md max-w-xl mb-10 animate-pulse" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="h-12 bg-gray-200 rounded-md w-48 animate-pulse" />
            <div className="h-12 bg-gray-200 rounded-md w-48 animate-pulse" />
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="h-8 w-56 bg-gray-200 rounded-md mb-6 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              <div className="h-56 bg-gray-200 animate-pulse" />
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3 animate-pulse" />
                <div className="space-y-2 mb-6">
                  <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                </div>
                <div className="h-10 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
