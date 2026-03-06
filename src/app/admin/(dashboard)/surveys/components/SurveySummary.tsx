import { Calendar, User, CheckCircle2 } from 'lucide-react'

interface SummaryProps {
  activeSlotsCount: number
  pendingCount: number
  confirmedCount: number
}

export default function SurveySummary({ activeSlotsCount, pendingCount, confirmedCount }: SummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md group">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
          <Calendar className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Slot Aktif</p>
          <h3 className="text-3xl font-black text-[#1D1D1B]">{activeSlotsCount}</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md group">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-[#E30613] group-hover:scale-110 transition-transform">
          <User className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Booking Pending</p>
          <h3 className="text-3xl font-black text-[#1D1D1B]">{pendingCount}</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md group">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Terkonfirmasi</p>
          <h3 className="text-3xl font-black text-[#1D1D1B]">{confirmedCount}</h3>
        </div>
      </div>
    </div>
  )
}
