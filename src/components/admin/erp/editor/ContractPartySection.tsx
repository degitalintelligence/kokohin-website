'use client'

interface ContractPartySectionProps {
  selectedSignatoryId: string
  clientKtp: string
  signatories?: { id: string; name: string; job_title: string }[]
  onSetSelectedSignatoryId: (value: string) => void
  onSetClientKtp: (value: string) => void
}

export default function ContractPartySection({
  selectedSignatoryId,
  clientKtp,
  signatories,
  onSetSelectedSignatoryId,
  onSetClientKtp,
}: ContractPartySectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Penanda Tangan (Pihak Kedua)</label>
        <select
          value={selectedSignatoryId}
          onChange={(e) => onSetSelectedSignatoryId(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
        >
          <option value="">Pilih Penanda Tangan...</option>
          {signatories?.map(s => (
            <option key={s.id} value={s.id}>{s.name} - {s.job_title}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-tight">No. KTP Client (Pihak Pertama)</label>
        <input
          type="text"
          value={clientKtp}
          onChange={(e) => onSetClientKtp(e.target.value)}
          placeholder="Masukkan nomor KTP customer..."
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E30613] transition-all"
        />
      </div>
    </div>
  )
}
