'use client'
import Link from 'next/link'
import styles from '../../page.module.css'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState, Fragment } from 'react'
import { formatZoneName } from '@/lib/zone'

type Zone = { name?: string | null } | null
type Estimation = { total_selling_price?: number | null; version_number?: number | null } | null
type Project = {
  id: string
  customer_name: string
  phone: string
  address: string
  status: string
  created_at: string
  zone?: Zone
  estimation?: Estimation
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

const getStatus = (status: string) => {
  switch (status) {
    case 'Deal':
      return { label: 'Deal', cls: 'bg-green-100 text-green-800' }
    case 'Lost':
      return { label: 'Lost', cls: 'bg-red-100 text-red-800' }
    case 'Quoted':
      return { label: 'Ditawarkan', cls: 'bg-yellow-100 text-yellow-800' }
    case 'Surveyed':
      return { label: 'Surveyed', cls: 'bg-blue-100 text-blue-800' }
    case 'Need Manual Quote':
      return { label: 'Manual Quote', cls: 'bg-[#E30613]/10 text-[#E30613]' }
    case 'New':
    default:
      return { label: status === 'New' ? 'Baru' : status, cls: 'bg-gray-100 text-gray-800' }
  }
}

export default function ProjectRow({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const statusConfig = getStatus(project.status)
  const rawZoneName = project.zone?.name || ''
  const zoneName = rawZoneName ? formatZoneName(rawZoneName) : '—'
  const totalPrice = project.estimation?.total_selling_price || 0
  return (
    <Fragment>
      <tr className="group hover:bg-gray-50 border-b border-gray-100">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]"
          >
            {open ? <ChevronUp className="h-3 w-3 text-[#E30613]" /> : <ChevronDown className="h-3 w-3 text-[#E30613]" />}
          </button>
        </td>
        <td className={styles.bold}>{project.customer_name}</td>
        <td className="hidden md:table-cell">
          <a
            href={`https://wa.me/${project.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {project.phone}
          </a>
        </td>
        <td className="hidden lg:table-cell" style={{ maxWidth: 180 }}>
          {project.address}
        </td>
        <td className="hidden md:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800`}>
            {zoneName}
          </span>
        </td>
        <td className={styles.bold}>
          {totalPrice > 0 ? formatCurrency(totalPrice) : '—'}
        </td>
        <td className="hidden sm:table-cell">
          {project.estimation?.version_number ? (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#E30613]/10 text-[#E30613]`}>
              V{project.estimation.version_number}
            </span>
          ) : '—'}
        </td>
        <td className="hidden sm:table-cell">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.cls}`}>{statusConfig.label}</span>
        </td>
        <td className={`hidden md:table-cell ${styles.muted}`}>{formatDate(project.created_at)}</td>
        <td>
          <div className="flex gap-2">
            <Link href={`/admin/projects/${project.id}`} className="btn btn-outline-dark btn-sm">
              Detail
            </Link>
            <Link href={`/admin/projects/${project.id}/edit`} className="btn btn-outline-dark btn-sm">
              Edit
            </Link>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 border-t border-gray-200">
          <td colSpan={10} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Ringkasan</div>
                <div className="mt-1"><span className="text-gray-500">Telepon: </span><span className="font-medium text-gray-900">{project.phone}</span></div>
                <div className="mt-1"><span className="text-gray-500">Alamat: </span><span className="font-medium text-gray-900">{project.address}</span></div>
                <div className="mt-1"><span className="text-gray-500">Zona: </span><span className="font-medium text-gray-900">{zoneName}</span></div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Estimasi</div>
                <div className="mt-1"><span className="text-gray-500">Versi: </span><span className="font-medium text-gray-900">{project.estimation?.version_number ? `V${project.estimation.version_number}` : '—'}</span></div>
                <div className="mt-1"><span className="text-gray-500">Total Harga: </span><span className="font-medium text-gray-900">{totalPrice > 0 ? formatCurrency(totalPrice) : '—'}</span></div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div className="mt-1"><span className="text-gray-500">Status: </span><span className="font-medium text-gray-900">{statusConfig.label}</span></div>
                <div className="mt-1"><span className="text-gray-500">Tanggal: </span><span className="font-medium text-gray-900">{formatDate(project.created_at)}</span></div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/admin/projects/${project.id}`} className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]">
                    Detail
                  </Link>
                  <Link href={`/admin/projects/${project.id}/edit`} className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-800 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E30613]">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}
