 'use client'
 
 import { useState } from 'react'
 import { updateSecuritySettings } from '@/app/actions/settings'
 import { Save, Loader2 } from 'lucide-react'
 
 export default function SecuritySettingsForm({ blockedIps, rateWindowMin, rateMax }: { blockedIps: string; rateWindowMin: number; rateMax: number }) {
   const [ips, setIps] = useState(blockedIps)
   const [win, setWin] = useState(String(rateWindowMin))
   const [max, setMax] = useState(String(rateMax))
   const [loading, setLoading] = useState(false)
   const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
 
   const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault()
     setLoading(true)
     setMsg(null)
     const res = await updateSecuritySettings({
       blockedIps: ips,
       rateWindowMin: Number(win) || 15,
       rateMax: Number(max) || 1,
     })
     if ('error' in res && res.error) {
       setMsg({ type: 'error', text: res.error })
     } else {
       setMsg({ type: 'success', text: 'Pengaturan keamanan berhasil disimpan' })
     }
     setLoading(false)
   }
 
   return (
     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
       <h3 className="text-lg font-bold mb-2">Keamanan Funnel</h3>
       <p className="text-sm text-gray-500 mb-4">Non-intrusive protection: IP blacklist dan rate limiting.</p>
       <form onSubmit={onSubmit} className="space-y-4">
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">IP Terblokir (pisahkan dengan koma)</label>
           <textarea
             value={ips}
             onChange={(e) => setIps(e.target.value)}
             rows={3}
             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
             placeholder="1.2.3.4, 5.6.7.8"
           />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Jendela Rate Limit (menit)</label>
             <input
               type="number"
               min={1}
               value={win}
               onChange={(e) => setWin(e.target.value)}
               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Maks Per Jendela</label>
             <input
               type="number"
               min={0}
               value={max}
               onChange={(e) => setMax(e.target.value)}
               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
             />
           </div>
         </div>
         {msg && (
           <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
             {msg.text}
           </div>
         )}
         <button
           type="submit"
           disabled={loading}
           className="btn btn-primary w-full flex items-center justify-center gap-2"
         >
           {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
           Simpan
         </button>
       </form>
     </div>
   )
 }
