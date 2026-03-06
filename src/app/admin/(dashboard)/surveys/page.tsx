import { createClient, isDevBypass } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SurveySummary from './components/SurveySummary'
import SurveyTabs from './components/SurveyTabs'
import BookingTable from './components/BookingTable'
import SlotManagement from './components/SlotManagement'
import RecurringSurveyForm from '@/components/admin/RecurringSurveyForm'

type SlotRow = {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  is_active: boolean
  blackout: boolean
}

type BookingRow = {
  id: string
  lead_id: string | null
  name: string
  phone: string
  address: string | null
  status: string
  slot: { date: string; start_time: string; end_time: string } | null
}

export default async function AdminSurveysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bypass = await isDevBypass()
  if (!user && !bypass) redirect('/admin/login')

  const { data: slots } = await supabase
    .from('survey_slots')
    .select('id,date,start_time,end_time,capacity,is_active,blackout')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  const { data: bookings } = await supabase
    .from('survey_bookings')
    .select('id,lead_id,name,phone,address,status,slot:slot_id(date,start_time,end_time)')
    .order('created_at', { ascending: false })
    .limit(100)

  const slotRows: SlotRow[] = (slots as SlotRow[] | null) ?? []
  const bookingRows: BookingRow[] = (bookings as BookingRow[] | null) ?? []

  const pendingCount = bookingRows.filter(b => b.status === 'pending').length
  const confirmedCount = bookingRows.filter(b => b.status === 'confirmed').length
  const activeSlotsCount = slotRows.filter(s => s.is_active && !s.blackout).length

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f5f7] font-sans">
      {/* Custom Header */}
      <header className="h-24 bg-white border-b border-gray-100 flex items-center justify-between px-10 flex-shrink-0 z-20">
        <div>
          <h2 className="text-2xl font-black text-[#1D1D1B] uppercase tracking-tighter">Manajemen Survei</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Kokohin Web & Mini-ERP</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sistem Status</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-[#1D1D1B]">OPERATIONAL</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {/* Main Content Area */}
        <div className="max-w-[1600px] mx-auto space-y-8 p-10">
          {/* Summary Section */}
          <SurveySummary 
            activeSlotsCount={activeSlotsCount}
            pendingCount={pendingCount}
            confirmedCount={confirmedCount}
          />

          {/* Tabbed Content */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden min-h-[600px]">
            <SurveyTabs 
              bookings={<BookingTable bookings={bookingRows} availableSlots={slotRows} />}
              slots={<SlotManagement slots={slotRows} />}
              config={
                <div className="max-w-2xl mx-auto py-10">
                  <div className="bg-gray-50 rounded-3xl border border-gray-100 p-8">
                    <RecurringSurveyForm />
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
