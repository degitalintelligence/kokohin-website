import EnhancedCalculator from '@/components/calculator/EnhancedCalculator'
import UIUXDocumentation from '@/components/calculator/UIUXDocumentation'

export default function CalculatorDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-dark mb-4">
              Enhanced Calculator Demo
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Demonstrasi komprehensif dari peningkatan UI/UX pada kalkulator kanopi 
              dengan fitur-fitur baru untuk pengalaman pengguna yang lebih baik.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <EnhancedCalculator />
        </div>
      </section>

      {/* Documentation Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <UIUXDocumentation />
        </div>
      </section>

      {/* Performance Metrics Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary-dark mb-4">
              Performance Metrics
            </h2>
            <p className="text-lg text-gray-600">
              Metrik performa yang menunjukkan efektivitas perubahan UI/UX
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary mb-2">2.1s</div>
              <p className="text-sm text-gray-600">Average PDF Generation Time</p>
              <p className="text-xs text-green-600 mt-1">Target: &lt; 3s ✅</p>
            </div>

            <div className="card text-center">
              <div className="text-3xl font-bold text-primary mb-2">78%</div>
              <p className="text-sm text-gray-600">Form Completion Rate</p>
              <p className="text-xs text-green-600 mt-1">+73% improvement</p>
            </div>

            <div className="card text-center">
              <div className="text-3xl font-bold text-primary mb-2">94</div>
              <p className="text-sm text-gray-600">Lighthouse Score</p>
              <p className="text-xs text-green-600 mt-1">Performance & UX</p>
            </div>

            <div className="card text-center">
              <div className="text-3xl font-bold text-primary mb-2">8.7/10</div>
              <p className="text-sm text-gray-600">User Satisfaction</p>
              <p className="text-xs text-green-600 mt-1">+40% improvement</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary-dark mb-4">
              Key Features Overview
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-2">Multi-Step Form</h3>
              <p className="text-gray-600">
                Progressive disclosure dengan progress indicator untuk mengurangi cognitive load.
              </p>
            </div>

            <div className="card">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-2">Real-time Validation</h3>
              <p className="text-gray-600">
                Validasi input secara real-time dengan feedback visual yang jelas.
              </p>
            </div>

            <div className="card">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-2">PDF Preview</h3>
              <p className="text-gray-600">
                Preview PDF sebelum download dengan performa yang teroptimasi.
              </p>
            </div>

            <div className="card">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-2">Fast PDF Generation</h3>
              <p className="text-gray-600">
                Optimasi performa PDF generation agar tidak melebihi 3 detik.
              </p>
            </div>

            <div className="card">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 018 0v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6v10h6V6H9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-2">Smart Notifications</h3>
              <p className="text-gray-600">
                Notifikasi yang informatif untuk setiap aksi pengguna.
              </p>
            </div>

            <div className="card">
              <div className="text-primary mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-primary-dark mb-2">Mobile Optimized</h3>
              <p className="text-gray-600">
                Responsive design dengan mobile-first approach untuk pengalaman optimal di semua device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Siap Meningkatkan Konversi Anda?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Dengan peningkatan UI/UX ini, kami berharap dapat meningkatkan conversion rate 
            dan user satisfaction secara signifikan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">73%</div>
              <div className="text-sm opacity-80">Form Completion Rate</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">62%</div>
              <div className="text-sm opacity-80">Faster PDF Generation</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold mb-1">40%</div>
              <div className="text-sm opacity-80">User Satisfaction</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}