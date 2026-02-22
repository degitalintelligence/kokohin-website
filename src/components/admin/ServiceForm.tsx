'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

type Props = {
  defaultValues?: Partial<{
    name: string
    slug: string
    description_html: string | null
    image_url: string | null
    icon: string | null
    order: number | null
    is_active: boolean
    meta_title: string | null
    meta_description: string | null
    meta_keywords: string | null
  }>
  onSubmit: (formData: FormData) => void | Promise<void>
  submitLabel: string
}

function toSlug(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

async function compressImage(file: File, quality = 0.8, maxWidth = 1000): Promise<Blob> {
  const img = document.createElement('img')
  const reader = new FileReader()
  const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    reader.onload = () => {
      img.src = String(reader.result)
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Invalid image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
  reader.readAsDataURL(file)
  const loaded = await loadPromise
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, maxWidth / loaded.width)
  canvas.width = Math.round(loaded.width * scale)
  canvas.height = Math.round(loaded.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(loaded, 0, 0, canvas.width, canvas.height)
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Compression failed')
  return blob
}

export default function ServiceForm({ defaultValues, onSubmit, submitLabel }: Props) {
  const [preview, setPreview] = useState<string | null>(defaultValues?.image_url || null)
  const [desc, setDesc] = useState<string>(defaultValues?.description_html || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const name = String(fd.get('name') || '').trim()
    if (!fd.get('slug')) fd.set('slug', toSlug(name))

    const file = fileRef.current?.files?.[0]
    if (file && file.size > 0) {
      setUploading(true)
      try {
        const compressed = await compressImage(file, 0.82, 1200)
        const newFile = new File([compressed], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' })
        fd.set('image_file', newFile)
      } catch {
        // ignore compression errors, fallback to original
        fd.set('image_file', file)
      } finally {
        setUploading(false)
      }
    }

    fd.set('description_html', desc)
    await onSubmit(fd)
  }

  const exec = (cmd: string) => {
    document.execCommand(cmd)
    setDesc((document.getElementById('rte') as HTMLDivElement).innerHTML)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Layanan</label>
          <input name="name" defaultValue={defaultValues?.name || ''} required className="input" placeholder="Contoh: Kanopi Baja Ringan" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Slug</label>
          <input name="slug" defaultValue={defaultValues?.slug || ''} className="input" placeholder="kanopi-baja-ringan" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi (Rich Text)</label>
        <div className="flex items-center gap-2 mb-2">
          <button type="button" className="btn btn-outline px-3 py-1" onClick={() => exec('bold')}>B</button>
          <button type="button" className="btn btn-outline px-3 py-1" onClick={() => exec('italic')}>I</button>
          <button type="button" className="btn btn-outline px-3 py-1" onClick={() => exec('underline')}>U</button>
          <button type="button" className="btn btn-outline px-3 py-1" onClick={() => exec('insertUnorderedList')}>• List</button>
          <button type="button" className="btn btn-outline px-3 py-1" onClick={() => exec('formatBlock')}>P</button>
        </div>
        <div
          id="rte"
          className="min-h-[160px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E30613] bg-white"
          contentEditable
          onInput={(e) => setDesc((e.target as HTMLDivElement).innerHTML)}
          dangerouslySetInnerHTML={{ __html: desc }}
        />
        <input type="hidden" name="description_html" value={desc} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ikon (nama lucide)</label>
          <input name="icon" defaultValue={defaultValues?.icon || ''} className="input" placeholder="Hammer / Wrench / ShieldCheck" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Urutan Tampil</label>
          <input name="order" type="number" defaultValue={defaultValues?.order ?? 0} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Thumbnail</label>
          <input ref={fileRef} type="file" accept="image/*" className="input" onChange={handleFileChange} />
          {preview && (
            <div className="mt-3 relative w-full h-48 rounded-md overflow-hidden border">
              <Image src={preview} alt="Preview" fill className="object-cover" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Status</label>
          <select name="is_active" defaultValue={String(defaultValues?.is_active ?? true)} className="input">
            <option value="true">Aktif</option>
            <option value="false">Non-aktif</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Title</label>
          <input name="meta_title" defaultValue={defaultValues?.meta_title || ''} className="input" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Description</label>
          <input name="meta_description" defaultValue={defaultValues?.meta_description || ''} className="input" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Keywords</label>
          <input name="meta_keywords" defaultValue={defaultValues?.meta_keywords || ''} className="input" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Semua tombol aksi berwarna merah #E30613</div>
        <button type="submit" disabled={uploading} className="btn btn-primary">
          {uploading ? 'Mengunggah…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
