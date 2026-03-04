'use client'

import { Clock, History, TrendingUp } from 'lucide-react'
import type { AuditLog } from './types'

interface AuditTrailColumnProps {
  auditLogs: AuditLog[]
  mounted: boolean
  getTimeAgo: (date: string) => string
}

export default function AuditTrailColumn({ auditLogs, mounted, getTimeAgo }: AuditTrailColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <h4 className="font-bold text-sm text-gray-700 uppercase tracking-widest">Audit Trail</h4>
        </div>
      </div>
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
          <TrendingUp size={14} className="text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aktivitas Terbaru</span>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-right-2 duration-500">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                log.entity_type === 'quotation' ? 'bg-blue-500' :
                log.entity_type === 'contract' ? 'bg-green-500' :
                log.entity_type === 'invoice' ? 'bg-orange-500' : 'bg-gray-400'
              }`} />
              <div>
                <p className="text-[11px] text-gray-800 leading-tight">
                  <span className="font-bold uppercase text-[9px] text-gray-400 block mb-0.5">{log.entity_type}</span>
                  <span className="font-bold">Admin</span> {log.action_type === 'create' ? 'membuat' : log.action_type === 'update_status' ? 'mengubah status' : log.action_type === 'update_items' ? 'merevisi item' : log.action_type}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={10} className="text-gray-300" />
                  <span className="text-[9px] text-gray-400">
                    {(() => {
                      const timeValue = log.timestamp || log.created_at || ''
                      return mounted ? getTimeAgo(timeValue) : new Date(timeValue).toLocaleDateString('id-ID')
                    })()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-8 opacity-20">
              <History size={32} className="text-gray-400" />
              <p className="text-[10px] font-bold mt-2">Belum ada aktivitas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
