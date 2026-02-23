 'use client'
 
 import { useState } from 'react'
 import { updateSealantMaterialId } from '@/app/actions/settings'
 import { Save, Loader2 } from 'lucide-react'
 
 type MaterialOpt = { id: string; name: string; unit?: string | null; category?: string | null }
 
 export default function SealantMaterialForm({ currentId, materials }: { currentId: string | null; materials: MaterialOpt[] }) {
   const [value, setValue] = useState<string>(currentId || '')
   const [isLoading, setIsLoading] = useState(false)
   const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
 
   const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault()
     setIsLoading(true)
     setMessage(null)
     const res = await updateSealantMaterialId(value || null)
     if ('error' in res && res.error) {
       setMessage({ type: 'error', text: res.error })
     } else {
       setMessage({ type: 'success', text: 'Material sealant berhasil disimpan' })
     }
     setIsLoading(false)
   }
 
   return (
     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-xl">
       <h3 className="text-lg font-bold mb-2">Material Sealant untuk Kaca Tempered</h3>
       <p className="text-sm text-gray-500 mb-4">Pilih material sealant yang digunakan saat katalog atap terdeteksi tempered.</p>
       <form onSubmit={onSubmit} className="space-y-4">
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Material</label>
           <select
             value={value}
             onChange={(e) => setValue(e.target.value)}
             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:border-transparent"
           >
             <option value="">— Tidak ditentukan —</option>
             {materials.map(m => (
               <option key={m.id} value={m.id}>{m.name}</option>
             ))}
           </select>
         </div>
         {message && (
           <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
             {message.text}
           </div>
         )}
         <button
           type="submit"
           disabled={isLoading}
           className="btn btn-primary w-full flex items-center justify-center gap-2"
         >
           {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
           Simpan
         </button>
       </form>
     </div>
   )
 }
